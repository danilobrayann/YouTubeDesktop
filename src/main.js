'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, session, Tray, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const { isTrackerRequest } = require('./browser-utils');
const {
  AUDIO_FORMATS,
  VIDEO_FORMATS,
  formatDownloadError,
  getFormatArgs,
  validateDownloadRequest
} = require('./download-utils');

// Keep existing preferences and downloads settings after the product rename.
const userDataPath = path.join(app.getPath('appData'), 'YouTube Desktop');
fs.mkdirSync(userDataPath, { recursive: true });
app.setPath('userData', userDataPath);

const cacheRoot = process.platform === 'win32' && process.env.LOCALAPPDATA
  ? process.env.LOCALAPPDATA
  : app.getPath('appData');
const cachePath = path.join(cacheRoot, 'TurboDown', 'Cache');
fs.mkdirSync(cachePath, { recursive: true });
app.setPath('cache', cachePath);

// ─── Electron Store ──────────────────────────────────────────────────────────
const store = new Store({
  defaults: {
    theme: {
      accentColor: '#ff4444',
      bgColor: '#0f0f1a',
      gradientEnabled: true,
      gradientAngle: 135,
      gradientColor1: '#0f0f1a',
      gradientColor2: '#1a1a2e',
      glassBlur: 12,
      glassOpacity: 0.15,
      transparencyEnabled: true,
      backgroundImage: null,
      preset: 'dark'
    },
    downloadPath: null,
    defaultFormat: '720p',
    googleShieldsEnabled: true
  }
});

let googleShieldsEnabled = store.get('googleShieldsEnabled', true);
let googleBlockedRequestCount = 0;
const configuredBrowserSessions = new WeakSet();

// ─── Active downloads registry ───────────────────────────────────────────────
const activeDownloads = new Map(); // downloadId → child process
const downloadJobs = new Map();

// ─── Main window & Tray ─────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let isQuitting = false;
let googleShieldUpdateTimer = null;

function sendGoogleShieldStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('google-shield-status', {
    enabled: googleShieldsEnabled,
    blockedCount: googleBlockedRequestCount
  });
}

function queueGoogleShieldStatus() {
  if (googleShieldUpdateTimer) return;
  googleShieldUpdateTimer = setTimeout(() => {
    googleShieldUpdateTimer = null;
    sendGoogleShieldStatus();
  }, 300);
}

function configureBrowserSession(partition) {
  const browserSession = session.fromPartition(partition);
  if (configuredBrowserSessions.has(browserSession)) return;
  configuredBrowserSessions.add(browserSession);

  browserSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      if (googleShieldsEnabled && isTrackerRequest(details.url)) {
        googleBlockedRequestCount++;
        queueGoogleShieldStatus();
        callback({ cancel: true });
        return;
      }
      callback({ cancel: false });
    }
  );
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  const nativeImage = require('electron').nativeImage;
  let trayIcon = nativeImage.createFromPath(iconPath);

  try {
    tray = new Tray(trayIcon);
    tray.setToolTip('TurboDown');

    updateTrayMenu();

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {
    console.warn('Falha ao criar Tray:', e.message);
  }
}

function updateTrayMenu() {
  if (!tray) return;
  const activeYt = activeDownloads.size;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '⬇ Abrir TurboDown',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: activeYt > 0 ? `⚡ Baixando em 2º plano: ${activeYt} item(s)` : '💤 Nenhum download ativo',
      enabled: false
    },
    {
      label: '📁 Pasta de Downloads',
      click: () => {
        const root = store.get('downloadPath') || app.getPath('downloads');
        shell.openPath(root);
      }
    },
    { type: 'separator' },
    {
      label: '❌ Fechar Aplicativo',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'TurboDown',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized', true);
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized', false);
    }
  });

  // Fechar janela: roda em segundo plano na bandeja para não cancelar downloads!
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      updateTrayMenu();

      const activeYt = activeDownloads.size;
      if (activeYt > 0) {
        try {
          if (tray && tray.displayBalloon) {
            tray.displayBalloon({
              title: 'TurboDown',
              content: `Continuando ${activeYt} download(s) em segundo plano.`
            });
          }
        } catch (e) {}
      }
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initializeAutoUpdater();
  [
    'persist:google',
    'google-private',
    'persist:music',
    'persist:youtube',
    'persist:social',
    'persist:wallpapers',
    'persist:gemini'
  ].forEach(configureBrowserSession);

  // Allow webview to load YouTube
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
      });
    }
  });

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (isQuitting) {
    if (process.platform !== 'darwin') app.quit();
  }
});

// ─── Window Controls ─────────────────────────────────────────────────────────
ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

// ─── Google Web privacy controls ────────────────────────────────────────────
ipcMain.handle('get-google-shield-status', () => ({
  enabled: googleShieldsEnabled,
  blockedCount: googleBlockedRequestCount
}));

ipcMain.handle('set-google-shields', (_event, enabled) => {
  if (typeof enabled !== 'boolean') {
    throw new Error('Estado da proteção de navegação inválido.');
  }
  googleShieldsEnabled = enabled;
  store.set('googleShieldsEnabled', enabled);
  sendGoogleShieldStatus();
  return { enabled: googleShieldsEnabled, blockedCount: googleBlockedRequestCount };
});

ipcMain.handle('clear-google-private-data', async () => {
  const privateSession = session.fromPartition('google-private');
  await Promise.all([privateSession.clearStorageData(), privateSession.clearCache()]);
  return true;
});

// ─── Theme ───────────────────────────────────────────────────────────────────
ipcMain.handle('get-theme', () => {
  return store.get('theme');
});

ipcMain.handle('save-theme', (event, theme) => {
  store.set('theme', theme);
  return true;
});

// ─── Download Path ───────────────────────────────────────────────────────────
ipcMain.handle('get-download-path', () => {
  const saved = store.get('downloadPath');
  if (saved) return saved;
  return app.getPath('downloads');
});

ipcMain.handle('set-download-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Selecionar pasta de downloads'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    store.set('downloadPath', selectedPath);
    return selectedPath;
  }
  return null;
});

ipcMain.handle('get-download-space', async () => {
  const targetPath = store.get('downloadPath') || app.getPath('downloads');
  const stats = await fs.promises.statfs(targetPath);
  return {
    path: targetPath,
    freeBytes: stats.bavail * stats.bsize,
    totalBytes: stats.blocks * stats.bsize
  };
});

// ─── Background Image ─────────────────────────────────────────────────────────
ipcMain.handle('select-background-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Selecionar imagem de fundo',
    filters: [
      { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// ─── Helper: Get yt-dlp binary path ─────────────────────────────────────────
function getYtDlpPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'bin', 'yt-dlp.exe'),
    path.join(__dirname, '..', 'bin', 'yt-dlp.exe'),
    path.join(app.getPath('userData'), 'bin', 'yt-dlp.exe')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'yt-dlp';
}

// ─── Helper: Get ffmpeg binary path ─────────────────────────────────────────
function getFfmpegPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'bin', 'ffmpeg.exe'),
    path.join(__dirname, '..', 'bin', 'ffmpeg.exe'),
    path.join(app.getPath('userData'), 'bin', 'ffmpeg.exe')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'ffmpeg';
}

function getDownloadPreferences() {
  const storedVideo = store.get('videoFormat');
  const storedAudio = store.get('audioFormat');
  const legacyFormat = store.get('defaultFormat', '720p');
  return {
    videoFormat: VIDEO_FORMATS.includes(storedVideo)
      ? storedVideo
      : (VIDEO_FORMATS.includes(legacyFormat) ? legacyFormat : '720p'),
    audioFormat: AUDIO_FORMATS.includes(storedAudio)
      ? storedAudio
      : (AUDIO_FORMATS.includes(legacyFormat) ? legacyFormat : 'mp3')
  };
}

// ─── Inspect Playlist ────────────────────────────────────────────────────────
ipcMain.handle('inspect-playlist', async (event, url) => {
  return new Promise((resolve) => {
    if (!url || (!url.includes('list=') && !url.includes('/playlist'))) {
      return resolve({ isPlaylist: false });
    }

    const ytDlpCmd = getYtDlpPath();
    const args = ['--flat-playlist', '--dump-single-json', '--no-warnings', url];
    const child = spawn(ytDlpCmd, args, { shell: false });
    let stdoutData = '';

    child.stdout.on('data', (d) => { stdoutData += d.toString(); });

    child.on('close', (code) => {
      if (code === 0 && stdoutData) {
        try {
          const info = JSON.parse(stdoutData);
          if (info._type === 'playlist' || (info.entries && info.entries.length > 1)) {
            const count = info.entries ? info.entries.length : (info.playlist_count || 1);
            const title = info.title || 'Playlist';
            return resolve({
              isPlaylist: true,
              title: title,
              count: count
            });
          }
        } catch (e) {}
      }
      resolve({ isPlaylist: false });
    });

    child.on('error', () => {
      resolve({ isPlaylist: false });
    });

    // Timeout de 7 segundos
    setTimeout(() => {
      try { child.kill(); } catch (e) {}
      resolve({ isPlaylist: false });
    }, 7000);
  });
});

// ─── Download queue and process control ──────────────────────────────────────
function sendDownloadProgress(job, data) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('download-progress', {
    downloadId: job.request.downloadId,
    ...data
  });
}

function stopDownloadProcess(child) {
  if (!child || !child.pid) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
      windowsHide: true,
      stdio: 'ignore'
    });
    killer.on('error', () => child.kill());
    child.kill();
    return;
  }
  child.kill('SIGTERM');
}

function createDownloadPlan(request) {
  const isAudio = AUDIO_FORMATS.includes(request.format);
  const isPlaylist = request.downloadPlaylist &&
    (request.url.includes('list=') || request.url.includes('/playlist'));
  const baseDir = request.outputPath || store.get('downloadPath') || app.getPath('downloads');
  const categoryDir = path.join(baseDir, isPlaylist ? 'Playlists' : (isAudio ? 'Músicas' : 'Vídeos'));
  fs.mkdirSync(categoryDir, { recursive: true });

  const args = getFormatArgs(request.format);
  const ffmpegPath = getFfmpegPath();
  if (fs.existsSync(ffmpegPath)) {
    args.push('--ffmpeg-location', path.dirname(ffmpegPath));
  }
  if (isPlaylist) {
    args.push('-o', path.join(categoryDir, '%(playlist_title,playlist)s', '%(playlist_index)02d - %(title)s.%(ext)s'));
  } else {
    args.push('--no-playlist', '-o', path.join(categoryDir, '%(title)s.%(ext)s'));
  }
  args.push('--continue', '--newline', request.url);

  return { args, targetFolder: categoryDir };
}

function runDownloadJob(job) {
  const { request } = job;
  let plan;
  try {
    plan = createDownloadPlan(request);
  } catch (error) {
    job.status = 'error';
    job.errorMessage = `Não foi possível preparar a pasta de destino: ${error.message}`;
    sendDownloadProgress(job, { status: 'error', message: job.errorMessage });
    return Promise.reject(new Error(job.errorMessage));
  }

  return new Promise((resolve, reject) => {
    const id = request.downloadId;
    const child = spawn(getYtDlpPath(), plan.args, { shell: false, windowsHide: true });
    job.child = child;
    job.status = 'downloading';
    job.pauseRequested = false;
    job.cancelRequested = false;
    job.stderr = '';
    job.lastProgress = 0;
    job.currentItem = 0;
    job.totalItems = 0;
    job.detectedTitle = '';
    job.lastSavedFilePath = '';
    activeDownloads.set(id, child);
    let stdoutBuffer = '';
    let settled = false;

    const finishError = (error, code) => {
      if (settled) return;
      settled = true;
      activeDownloads.delete(id);
      job.child = null;
      job.status = 'error';
      job.errorMessage = error
        ? `Não foi possível iniciar o yt-dlp: ${error.message}`
        : formatDownloadError(job.stderr, code);
      sendDownloadProgress(job, {
        status: 'error',
        percent: job.lastProgress,
        message: job.errorMessage,
        details: job.stderr.trim()
      });
      reject(new Error(job.errorMessage));
    };

    const processLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const itemMatch = trimmed.match(/\[download\]\s+Downloading\s+(?:item|video)\s+(\d+)\s+of\s+(\d+)/i);
      if (itemMatch) {
        job.currentItem = Number.parseInt(itemMatch[1], 10);
        job.totalItems = Number.parseInt(itemMatch[2], 10);
      }

      const progressMatch = trimmed.match(
        /\[download\]\s+([\d.]+)%\s+of\s+([\d.]+\w+)(?:\s+at\s+([\d.]+\w+\/s))?(?:\s+ETA\s+([\d:]+))?/
      );
      if (progressMatch) {
        job.lastProgress = Number.parseFloat(progressMatch[1]);
        sendDownloadProgress(job, {
          percent: job.lastProgress,
          size: progressMatch[2],
          speed: progressMatch[3] || '',
          eta: progressMatch[4] || '',
          currentItem: job.currentItem,
          totalItems: job.totalItems,
          title: job.detectedTitle,
          status: 'downloading'
        });
      }

      if (trimmed.startsWith('[download] Destination:')) {
        job.lastSavedFilePath = trimmed.replace('[download] Destination:', '').trim();
        job.detectedTitle = path.basename(job.lastSavedFilePath);
        sendDownloadProgress(job, {
          percent: job.lastProgress,
          currentItem: job.currentItem,
          totalItems: job.totalItems,
          title: job.detectedTitle,
          filePath: job.lastSavedFilePath,
          status: 'downloading',
          message: `Baixando: ${job.detectedTitle}`
        });
      } else if (trimmed.startsWith('[Merger]')) {
        sendDownloadProgress(job, {
          percent: job.lastProgress,
          currentItem: job.currentItem,
          totalItems: job.totalItems,
          title: job.detectedTitle,
          filePath: job.lastSavedFilePath,
          status: 'processing',
          message: 'Finalizando o arquivo...'
        });
      }
    };

    child.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || '';
      lines.forEach(processLine);
    });

    child.stderr.on('data', (data) => {
      job.stderr = `${job.stderr}${data.toString()}`.slice(-12000);
    });

    child.once('error', (error) => finishError(error));
    child.once('close', (code) => {
      if (stdoutBuffer) processLine(stdoutBuffer);
      if (settled) return;
      activeDownloads.delete(id);
      job.child = null;

      if (job.pauseRequested) {
        job.pauseRequested = false;
        job.status = 'paused';
        sendDownloadProgress(job, { status: 'paused', percent: job.lastProgress });
        settled = true;
        resolve({ paused: true });
        return;
      }

      if (job.cancelRequested) {
        downloadJobs.delete(id);
        job.status = 'cancelled';
        sendDownloadProgress(job, { status: 'cancelled', percent: job.lastProgress });
        settled = true;
        resolve({ cancelled: true });
        return;
      }

      if (code === 0) {
        let targetFolder = plan.targetFolder;
        if (job.lastSavedFilePath) targetFolder = path.dirname(job.lastSavedFilePath);
        downloadJobs.delete(id);
        job.status = 'complete';
        sendDownloadProgress(job, {
          percent: 100,
          currentItem: job.currentItem,
          totalItems: job.totalItems,
          title: job.detectedTitle,
          targetFolder,
          filePath: job.lastSavedFilePath,
          status: 'complete'
        });
        settled = true;
        resolve({ success: true, folder: targetFolder, file: job.lastSavedFilePath });
        return;
      }

      finishError(null, code);
    });
  });
}

ipcMain.handle('download-media', async (_event, input) => {
  const request = validateDownloadRequest(input);
  const normalizedRequest = {
    ...request,
    outputPath: request.outputPath || store.get('downloadPath') || app.getPath('downloads')
  };
  let job = downloadJobs.get(request.downloadId);

  if (job) {
    if (!['paused', 'error'].includes(job.status)) {
      throw new Error('Este download já está em andamento.');
    }
    if (job.request.url !== normalizedRequest.url || job.request.format !== normalizedRequest.format) {
      throw new Error('Não é possível reutilizar o identificador para outro download.');
    }
    job.request = normalizedRequest;
  } else {
    job = {
      request: normalizedRequest,
      status: 'pending',
      child: null,
      pauseRequested: false,
      cancelRequested: false
    };
    downloadJobs.set(request.downloadId, job);
  }

  return runDownloadJob(job);
});

ipcMain.handle('pause-download', (_event, downloadId) => {
  const job = downloadJobs.get(downloadId);
  if (!job || !job.child || job.status !== 'downloading') return false;
  job.pauseRequested = true;
  job.status = 'pausing';
  sendDownloadProgress(job, { status: 'pausing', percent: job.lastProgress });
  stopDownloadProcess(job.child);
  return true;
});

// ─── Open Category Folder ─────────────────────────────────────────────────────
ipcMain.handle('open-category-folder', (event, { category, basePath }) => {
  const root = basePath || store.get('downloadPath') || app.getPath('downloads');
  let target = root;
  if (category === 'videos')         target = path.join(root, 'Vídeos');
  else if (category === 'musicas')   target = path.join(root, 'Músicas');
  else if (category === 'playlists') target = path.join(root, 'Playlists');

  const fs = require('fs');
  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
  } catch (e) {}

  return shell.openPath(target);
});

// ─── Cancel Download ──────────────────────────────────────────────────────────
ipcMain.handle('cancel-download', (event, downloadId) => {
  const job = downloadJobs.get(downloadId);
  if (!job) return false;
  job.cancelRequested = true;
  job.pauseRequested = false;
  if (job.child) {
    stopDownloadProcess(job.child);
  } else {
    downloadJobs.delete(downloadId);
    job.status = 'cancelled';
    sendDownloadProgress(job, { status: 'cancelled', percent: job.lastProgress || 0 });
  }
  return true;
});

// ─── Open File / Folder ───────────────────────────────────────────────────────
ipcMain.handle('open-file', (event, filePath) => {
  return shell.openPath(filePath);
});

ipcMain.handle('open-folder', (event, folderPath) => {
  return shell.openPath(folderPath);
});

// ─── Download preferences and tool diagnostics ───────────────────────────────
ipcMain.handle('get-download-preferences', () => getDownloadPreferences());

ipcMain.handle('save-download-preferences', (_event, preferences) => {
  if (!preferences || !VIDEO_FORMATS.includes(preferences.videoFormat) ||
      !AUDIO_FORMATS.includes(preferences.audioFormat)) {
    throw new Error('Qualidade padrão de vídeo ou áudio inválida.');
  }
  store.set('videoFormat', preferences.videoFormat);
  store.set('audioFormat', preferences.audioFormat);
  store.set('defaultFormat', preferences.videoFormat);
  return getDownloadPreferences();
});

function runVersionCommand(command, args, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(command, args, { shell: false, windowsHide: true });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ exitCode: null, stdout, stderr, error: 'Tempo limite excedido.' });
    }, timeoutMs);

    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    child.once('error', error => finish({ exitCode: null, stdout, stderr, error: error.message }));
    child.once('close', exitCode => finish({ exitCode, stdout, stderr }));
  });
}

async function checkInstalledTool(command, args) {
  const result = await runVersionCommand(command, args);
  if (result.exitCode !== 0) {
    return {
      installed: false,
      version: null,
      error: result.error || result.stderr.trim() || 'Comando não encontrado.'
    };
  }
  const output = `${result.stdout}\n${result.stderr}`.trim();
  return { installed: true, version: output.split(/\r?\n/)[0] || 'Versão desconhecida' };
}

ipcMain.handle('check-download-tools', async () => {
  const [ytDlp, ffmpeg] = await Promise.all([
    checkInstalledTool(getYtDlpPath(), ['--version']),
    checkInstalledTool(getFfmpegPath(), ['-version'])
  ]);
  return { ytDlp, ffmpeg };
});

ipcMain.handle('get-ffmpeg-path', () => getFfmpegPath());
ipcMain.handle('get-ytdlp-path', () => getYtDlpPath());

ipcMain.handle('update-ytdlp', async () => {
  if (activeDownloads.size > 0) {
    throw new Error('Aguarde os downloads ativos terminarem antes de atualizar o yt-dlp.');
  }
  const command = getYtDlpPath();
  const result = await runVersionCommand(command, ['-U'], 120000);
  if (result.exitCode !== 0) {
    throw new Error(result.error || result.stderr.trim() || 'O yt-dlp não conseguiu se atualizar.');
  }
  return checkInstalledTool(command, ['--version']);
});

// ─── Application updates ─────────────────────────────────────────────────────
let appUpdateStatus = {
  status: 'idle',
  version: app.getVersion(),
  message: 'A verificação de atualizações ainda não foi executada.'
};

function sendAppUpdateStatus(status, details = {}) {
  appUpdateStatus = { ...appUpdateStatus, ...details, status };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-update-status', appUpdateStatus);
  }
}

function initializeAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    sendAppUpdateStatus('checking', { message: 'Verificando atualizações...', error: null });
  });
  autoUpdater.on('update-available', (info) => {
    sendAppUpdateStatus('available', {
      version: info.version,
      message: `Nova versão ${info.version} encontrada. O download começará automaticamente.`,
      error: null
    });
    if (Notification.isSupported()) {
      new Notification({
        title: 'Atualização do TurboDown disponível',
        body: `A versão ${info.version} está sendo baixada.`
      }).show();
    }
  });
  autoUpdater.on('update-not-available', (info) => {
    sendAppUpdateStatus('up-to-date', {
      version: info.version || app.getVersion(),
      message: 'O TurboDown está atualizado.',
      error: null
    });
  });
  autoUpdater.on('download-progress', (progress) => {
    sendAppUpdateStatus('downloading', {
      percent: Math.round(progress.percent),
      message: `Baixando atualização: ${Math.round(progress.percent)}%`
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendAppUpdateStatus('downloaded', {
      version: info.version,
      message: `Versão ${info.version} pronta para instalar.`
    });
  });
  autoUpdater.on('error', (error) => {
    const noRelease = /404|latest\.yml/i.test(error.message);
    sendAppUpdateStatus('error', {
      message: noRelease
        ? 'Ainda não há uma versão publicada para atualização.'
        : 'Não foi possível verificar ou baixar atualizações.',
      error: error.message
    });
  });

  const isPortableBuild = process.platform === 'win32' && !!process.env.PORTABLE_EXECUTABLE_DIR;
  if (app.isPackaged && !isPortableBuild) {
    autoUpdater.checkForUpdates().catch(error => {
      const noRelease = /404|latest\.yml/i.test(error.message);
      sendAppUpdateStatus('error', {
        message: noRelease
          ? 'Ainda não há uma versão publicada para atualização.'
          : 'Não foi possível verificar atualizações. Confira se há uma versão publicada.',
        error: error.message
      });
    });
  } else if (isPortableBuild) {
    sendAppUpdateStatus('portable', {
      message: 'A atualização automática está disponível apenas na versão instalada pelo Setup.'
    });
  } else {
    sendAppUpdateStatus('development', {
      message: 'A verificação de atualizações funciona na versão instalada do TurboDown.'
    });
  }
}

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-update-status', () => appUpdateStatus);
ipcMain.handle('check-app-update', async () => {
  if (!app.isPackaged || (process.platform === 'win32' && !!process.env.PORTABLE_EXECUTABLE_DIR)) {
    const portable = process.platform === 'win32' && !!process.env.PORTABLE_EXECUTABLE_DIR;
    return {
      status: portable ? 'portable' : 'development',
      message: portable
        ? 'A atualização automática está disponível apenas na versão instalada pelo Setup.'
        : 'A verificação funciona na versão instalada do TurboDown.'
    };
  }
  await autoUpdater.checkForUpdates();
  return appUpdateStatus;
});
ipcMain.handle('install-app-update', () => {
  if (appUpdateStatus.status !== 'downloaded') {
    throw new Error('Nenhuma atualização está pronta para instalar.');
  }
  autoUpdater.quitAndInstall(false, true);
});
