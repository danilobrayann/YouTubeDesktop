'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, session, Tray, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const { isAdRequest, isTrackerRequest, isYouTubeAdStream } = require('./browser-utils');
const { DiscordRPC } = require('./discord-rpc');
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
    googleShieldsEnabled: true,
    customUserAgent: null,
    speedLimit: '5M',
    proxyUrl: null,
    cookiesFromBrowser: null,
    discordPresence: true,
    discordClientId: '1574051479168487525',
    scheduledDownloads: [],
    onboardingDone: false
  }
});

let googleShieldsEnabled = store.get('googleShieldsEnabled', true);
let adBlockEnabled = store.get('adBlockEnabled', true);
let googleBlockedRequestCount = 0;
const configuredBrowserSessions = new WeakSet();

// ─── Active downloads registry ───────────────────────────────────────────────
const activeDownloads = new Map(); // downloadId → child process
const downloadJobs = new Map();

// ─── Discord Rich Presence ───────────────────────────────────────────────────
let discordRpc = null;
let discordEnabled = store.get('discordPresence', false);
let discordClientId = store.get('discordClientId', null);
let discordDownloadActivity = null; // { details, state }
let discordMusicActivity = null;    // { details, state, timestamps }

function ensureDiscordRpc() {
  if (!discordRpc && discordEnabled && discordClientId) {
    discordRpc = new DiscordRPC(discordClientId);
    discordRpc.connect();
  }
  return discordRpc;
}

function pushDiscordActivity() {
  const rpc = ensureDiscordRpc();
  if (!rpc) return;
  const activity = discordDownloadActivity || discordMusicActivity;
  if (!activity) {
    rpc.clearActivity();
    return;
  }
  rpc.setActivity({
    details: activity.details,
    state: activity.state,
    type: activity.type || 0,
    timestamps: activity.timestamps,
    assets: {
      large_image: activity.image || 'turbodown',
      large_text: activity.details || 'TurboDown'
    },
    instance: false
  });
}

function updateDiscordForJob(job, data = {}) {
  if (!discordEnabled) return;
  const status = data.status || job.status;
  if (status === 'downloading' || status === 'processing' || status === 'pausing') {
    const title = job.detectedTitle || 'mídia';
    const pct = Math.round(job.lastProgress || data.percent || 0);
    discordDownloadActivity = {
      details: `Baixando: ${title}`,
      state: pct > 0 ? `${pct}%${job.totalItems > 1 ? ` · ${job.currentItem}/${job.totalItems}` : ''}` : 'Iniciando...'
    };
    pushDiscordActivity();
  } else if (['complete', 'error', 'cancelled', 'paused'].includes(status)) {
    discordDownloadActivity = null;
    pushDiscordActivity();
    if (activeDownloads.size === 0 && tray) tray.setToolTip('TurboDown');
  }
}

ipcMain.handle('set-discord-music-state', (_event, state = {}) => {
  if (!discordEnabled) return false;
  if (state.playing && state.title) {
    const duration = Number(state.duration) || 0;
    const position = Number(state.position) || 0;
    const label = state.label || 'Ouvindo';
    // Discord activity types: 0=Playing, 2=Listening, 3=Watching
    const type = label === 'Ouvindo' ? 2 : label === 'Vendo' ? 3 : 0;
    discordMusicActivity = {
      details: `${label} ${state.title}`,
      state: state.artist || 'YouTube',
      type,
      image: state.image || null,
      timestamps: duration > 0
        ? { start: Math.floor(Date.now() / 1000) - Math.floor(position), end: Math.floor(Date.now() / 1000) + Math.floor(duration - position) }
        : undefined
    };
  } else {
    discordMusicActivity = null;
  }
  pushDiscordActivity();
  return true;
});

ipcMain.handle('get-discord-settings', () => ({
  enabled: discordEnabled,
  clientId: discordClientId || ''
}));

ipcMain.handle('save-discord-settings', (_event, options = {}) => {
  discordEnabled = Boolean(options.enabled);
  discordClientId = (options.clientId || '').trim() || null;
  store.set('discordPresence', discordEnabled);
  store.set('discordClientId', discordClientId);
  if (discordRpc) {
    discordRpc.destroy();
    discordRpc = null;
  }
  if (discordEnabled) {
    discordDownloadActivity = null;
    discordMusicActivity = null;
    pushDiscordActivity();
  } else if (discordRpc) {
    discordRpc.clearActivity();
  }
  return true;
});

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

  // Use custom User-Agent if set, otherwise default Chrome 130
  const customUA = store.get('customUserAgent');
  const userAgent = customUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  browserSession.setUserAgent(userAgent);

  browserSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      if ((googleShieldsEnabled && isTrackerRequest(details.url)) ||
          (adBlockEnabled && (isAdRequest(details.url) || isYouTubeAdStream(details.url)))) {
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

  // Allow webview to load YouTube and set proper userAgent for WhatsApp Web
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
      });
      // Set modern userAgent for sites like WhatsApp Web that check Chrome version
      contents.session.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
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

ipcMain.handle('get-adblock-status', () => ({
  enabled: adBlockEnabled,
  blockedCount: googleBlockedRequestCount
}));

ipcMain.handle('set-adblock', (_event, enabled) => {
  if (typeof enabled !== 'boolean') {
    throw new Error('Estado do bloqueador de anúncios inválido.');
  }
  adBlockEnabled = enabled;
  store.set('adBlockEnabled', enabled);
  sendGoogleShieldStatus();
  return { enabled: adBlockEnabled, blockedCount: googleBlockedRequestCount };
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
  updateDiscordForJob(job, data);
  // Atualiza tooltip da tray com progresso do download ativo
  if (tray) {
    const pct = Math.round(job.lastProgress || data.percent || 0);
    const title = job.detectedTitle ? ` — ${job.detectedTitle}` : '';
    tray.setToolTip(`TurboDown${pct > 0 ? ` — ${pct}%${title}` : title}`);
  }
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('download-progress', {
    downloadId: job.request.downloadId,
    ...data
  });
}

function stopDownloadProcess(child, { graceful = false } = {}) {
  if (!child || !child.pid) return;
  if (process.platform === 'win32') {
    if (graceful) {
      // taskkill sem /f envia pedido de fechamento — yt-dlp trata como SIGINT
      // e grava o progresso parcial antes de sair (permite retomar depois).
      const polite = spawn('taskkill', ['/pid', String(child.pid)], {
        windowsHide: true,
        stdio: 'ignore'
      });
      polite.on('error', () => child.kill());
      // Se não sair em 4s, força o encerramento
      setTimeout(() => {
        if (child.exitCode === null && !child.killed) {
          const killer = spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
            windowsHide: true,
            stdio: 'ignore'
          });
          killer.on('error', () => child.kill());
          child.kill();
        }
      }, 4000);
      return;
    }
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
      windowsHide: true,
      stdio: 'ignore'
    });
    killer.on('error', () => child.kill());
    child.kill();
    return;
  }
  child.kill(graceful ? 'SIGINT' : 'SIGTERM');
}

function createDownloadPlan(request, { noCookies = false } = {}) {
  const isAudio = AUDIO_FORMATS.includes(request.format);
  const isPlaylist = request.downloadPlaylist &&
    (request.url.includes('list=') || request.url.includes('/playlist'));
  const baseDir = request.outputPath || store.get('downloadPath') || app.getPath('downloads');
  const categoryDir = path.join(baseDir, isPlaylist ? 'Playlists' : (isAudio ? 'Músicas' : 'Vídeos'));
  fs.mkdirSync(categoryDir, { recursive: true });

  const args = getFormatArgs(request.format, {
    subs: request.subs,
    thumbnail: request.thumbnail,
    mp3Quality: request.mp3Quality
  });

  // Opções avançadas de download (velocidade, proxy, cookies)
  // Limite de velocidade: 'unlimited' desativa; valor explícito tem prioridade sobre o global
  let speedLimit = store.get('speedLimit');
  if (request.speedLimit === 'unlimited') {
    speedLimit = null;
  } else if (request.speedLimit) {
    speedLimit = request.speedLimit;
  }
  if (speedLimit) args.push('--limit-rate', speedLimit);

  const proxyUrl = store.get('proxyUrl');
  if (proxyUrl) args.push('--proxy', proxyUrl);

  const cookiesBrowser = noCookies ? null : store.get('cookiesFromBrowser');
  if (cookiesBrowser) args.push('--cookies-from-browser', cookiesBrowser);

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

// ─── Download logs ───────────────────────────────────────────────────────────
function getLogsDir() {
  const dir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeDownloadLog(job, plan, exitCode) {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(getLogsDir(), `download-${job.request.downloadId}-${stamp}.log`);
    const header = [
      `TurboDown download log`,
      `Date: ${new Date().toISOString()}`,
      `URL: ${job.request.url}`,
      `Format: ${job.request.format}`,
      `Status: ${job.status}`,
      `Exit code: ${exitCode}`,
      `Error: ${job.errorMessage || 'none'}`,
      ``,
      `Command: yt-dlp ${plan.args.map(a => JSON.stringify(a)).join(' ')}`,
      ``,
      `─── yt-dlp output ───`,
      job.stderr || '(empty)'
    ].join('\n');
    fs.writeFileSync(file, header, 'utf8');
    job.logFile = file;
  } catch (e) {
    console.warn('Failed to write download log:', e);
  }
}

ipcMain.handle('open-logs-folder', async () => {
  const dir = getLogsDir();
  const error = await shell.openPath(dir);
  if (error) throw new Error(`Não foi possível abrir a pasta de logs: ${error}`);
  return true;
});

ipcMain.handle('get-recent-logs', () => {
  try {
    const dir = getLogsDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.log'))
      .map(f => ({ name: f, path: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 10);
    return files.map(f => {
      const content = fs.readFileSync(f.path, 'utf8');
      const lines = content.split(/\r?\n/);
      return {
        name: f.name,
        date: new Date(f.mtime).toLocaleString('pt-BR'),
        preview: lines.slice(0, 12).join('\n'),
        error: lines.find(l => /ERROR|error|falha/i.test(l)) || ''
      };
    });
  } catch { return []; }
});

function runDownloadJob(job) {
  const { request } = job;
  let plan;
  try {
    plan = createDownloadPlan(request, { noCookies: Boolean(job.cookiesRetried) });
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
      writeDownloadLog(job, plan, code);
      sendDownloadProgress(job, {
        status: 'error',
        percent: job.lastProgress,
        message: job.errorMessage,
        details: job.stderr.trim()
      });

      // Enviar notificação de erro
      if (Notification.isSupported()) {
        new Notification({
          title: 'Download Falhou',
          body: job.detectedTitle ? `${job.detectedTitle}: ${job.errorMessage}` : job.errorMessage
        }).show();
      }

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

      // Retry automático: se falhou descriptografando cookies do navegador,
      // tenta de novo sem cookies (maioria dos vídeos não precisa).
      if (code !== 0 && !job.cookiesRetried && store.get('cookiesFromBrowser') &&
          /decrypt|dpapi|cookies/i.test(job.stderr)) {
        job.cookiesRetried = true;
        job.stderr = '';
        job.lastProgress = 0;
        runDownloadJob(job).then(resolve, reject);
        return;
      }

      if (code === 0) {
        let targetFolder = plan.targetFolder;
        if (job.lastSavedFilePath) targetFolder = path.dirname(job.lastSavedFilePath);
        downloadJobs.delete(id);
        job.status = 'complete';
        writeDownloadLog(job, plan, code);
        sendDownloadProgress(job, {
          percent: 100,
          currentItem: job.currentItem,
          totalItems: job.totalItems,
          title: job.detectedTitle,
          targetFolder,
          filePath: job.lastSavedFilePath,
          status: 'complete'
        });

        // Enviar notificação de sucesso (clicável abre a pasta do arquivo)
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: 'Download Concluído',
            body: job.detectedTitle || 'Download finalizado com sucesso!'
          });
          notification.on('click', () => {
            if (job.lastSavedFilePath && fs.existsSync(job.lastSavedFilePath)) {
              if (process.platform === 'win32') {
                spawn('explorer.exe', ['/select,', job.lastSavedFilePath], { windowsHide: true, detached: true });
              } else {
                shell.showItemInFolder(job.lastSavedFilePath);
              }
            } else if (targetFolder) {
              shell.openPath(targetFolder);
            }
          });
          notification.show();
        }

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
  stopDownloadProcess(job.child, { graceful: true });
  return true;
});

// ─── Open Category Folder ─────────────────────────────────────────────────────
ipcMain.handle('open-category-folder', async (event, { category, basePath } = {}) => {
  const root = basePath || store.get('downloadPath') || app.getPath('downloads');
  const categories = {
    videos: 'Vídeos',
    musicas: 'Músicas',
    playlists: 'Playlists'
  };
  const target = categories[category] ? path.join(root, categories[category]) : root;

  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
  } catch (e) {}

  const error = await shell.openPath(target);
  if (error) {
    throw new Error(`Não foi possível abrir a pasta: ${error}`);
  }
  return true;
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
ipcMain.handle('open-file', async (event, filePath) => {
  const error = await shell.openPath(filePath);
  if (error) {
    throw new Error(`Não foi possível abrir o arquivo: ${error}`);
  }
  return true;
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  const target = folderPath || store.get('downloadPath') || app.getPath('downloads');
  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
  } catch (e) {}
  const error = await shell.openPath(target);
  if (error) {
    throw new Error(`Não foi possível abrir a pasta: ${error}`);
  }
  return true;
});

// Reabre a pasta do arquivo já com ele selecionado no Explorer
ipcMain.handle('reveal-path', async (event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return false;
  if (process.platform === 'win32') {
    spawn('explorer.exe', ['/select,', filePath], { windowsHide: true, detached: true });
    return true;
  }
  const error = await shell.openPath(path.dirname(filePath));
  if (error) throw new Error(`Não foi possível abrir a pasta: ${error}`);
  return true;
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

// ─── Settings backup / restore ───────────────────────────────────────────────
const BACKUP_KEYS = [
  'theme', 'downloadPath', 'defaultFormat', 'videoFormat', 'audioFormat',
  'googleShieldsEnabled', 'customUserAgent', 'adBlockEnabled',
  'speedLimit', 'proxyUrl', 'cookiesFromBrowser',
  'discordPresence', 'discordClientId'
];

ipcMain.handle('export-settings', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar configurações',
    defaultPath: path.join(app.getPath('documents'), 'turbodown-config.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return null;

  const data = {};
  for (const key of BACKUP_KEYS) {
    const value = store.get(key);
    if (value !== undefined) data[key] = value;
  }
  data._exportedAt = new Date().toISOString();
  data._app = 'TurboDown';
  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
  return result.filePath;
});

ipcMain.handle('import-settings', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar configurações',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;

  const raw = fs.readFileSync(result.filePaths[0], 'utf8');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object') {
    throw new Error('Arquivo de configuração inválido.');
  }

  const applied = [];
  for (const key of BACKUP_KEYS) {
    if (data[key] !== undefined) {
      store.set(key, data[key]);
      applied.push(key);
    }
  }
  return { applied, file: result.filePaths[0] };
});

ipcMain.handle('get-custom-user-agent', () => store.get('customUserAgent'));
ipcMain.handle('set-custom-user-agent', (_event, userAgent) => {
  store.set('customUserAgent', userAgent || null);
  // Reconfigurar sessões existentes com o novo User-Agent
  session.defaultSession.setUserAgent(userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
  return true;
});

ipcMain.handle('get-download-advanced', () => ({
  speedLimit: store.get('speedLimit') || '',
  proxyUrl: store.get('proxyUrl') || '',
  cookiesFromBrowser: store.get('cookiesFromBrowser') || ''
}));

ipcMain.handle('save-download-advanced', (_event, options = {}) => {
  store.set('speedLimit', options.speedLimit || null);
  store.set('proxyUrl', options.proxyUrl || null);
  store.set('cookiesFromBrowser', options.cookiesFromBrowser || null);
  return true;
});

ipcMain.handle('get-onboarding-done', () => Boolean(store.get('onboardingDone')));
ipcMain.handle('set-onboarding-done', () => {
  store.set('onboardingDone', true);
  return true;
});

// ─── Miniplayer flutuante (YouTube Music) ────────────────────────────────────
let miniPlayerWindow = null;

ipcMain.handle('toggle-miniplayer', () => {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.close();
    return { open: false };
  }
  miniPlayerWindow = new BrowserWindow({
    width: 420,
    height: 110,
    minWidth: 380,
    minHeight: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      partition: 'persist:music',
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  miniPlayerWindow.setAlwaysOnTop(true, 'floating');
  miniPlayerWindow.loadURL('https://music.youtube.com/');
  miniPlayerWindow.on('closed', () => { miniPlayerWindow = null; });
  return { open: true };
});

// ─── Sugestões de busca do YouTube ───────────────────────────────────────────
ipcMain.handle('youtube-suggestions', (_event, query) => {
  return new Promise((resolve) => {
    const q = String(query || '').trim();
    if (q.length < 2) return resolve([]);
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=pt&gl=BR&q=${encodeURIComponent(q)}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(Array.isArray(data[1]) ? data[1].slice(0, 8) : []);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(5000, () => { req.destroy(); resolve([]); });
  });
});

// ─── Downloads agendados ─────────────────────────────────────────────────────
function getSchedules() {
  return store.get('scheduledDownloads') || [];
}

function saveSchedules(list) {
  store.set('scheduledDownloads', list);
}

ipcMain.handle('get-schedules', () => getSchedules());

ipcMain.handle('add-schedule', (_event, { url, format, runAt, label }) => {
  const schedules = getSchedules();
  const item = {
    id: `sched-${Date.now()}`,
    url: String(url).trim(),
    format: format || 'default-video',
    runAt: new Date(runAt).toISOString(),
    label: label || String(url).trim(),
    createdAt: new Date().toISOString()
  };
  schedules.push(item);
  saveSchedules(schedules);
  return item;
});

ipcMain.handle('remove-schedule', (_event, id) => {
  saveSchedules(getSchedules().filter(s => s.id !== id));
  return true;
});

// Verifica agendamentos a cada 30s
setInterval(() => {
  const schedules = getSchedules();
  const now = Date.now();
  const due = schedules.filter(s => new Date(s.runAt).getTime() <= now);
  if (!due.length) return;
  saveSchedules(schedules.filter(s => new Date(s.runAt).getTime() > now));
  for (const s of due) {
    const fmt = s.format === 'default-video'
      ? (store.get('videoFormat') || '720p')
      : s.format === 'default-audio'
        ? (store.get('audioFormat') || 'mp3')
        : s.format;
    const request = {
      url: s.url,
      format: fmt,
      downloadId: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      downloadPlaylist: true,
      subs: false,
      thumbnail: false,
      mp3Quality: '320k'
    };
    try {
      const validated = validateDownloadRequest(request);
      validated.outputPath = store.get('downloadPath') || app.getPath('downloads');
      runDownloadJob({
        request: validated,
        status: 'pending',
        child: null,
        pauseRequested: false,
        cancelRequested: false
      }).catch(() => {});
      if (Notification.isSupported()) {
        new Notification({
          title: 'Download agendado iniciado',
          body: s.label
        }).show();
      }
    } catch (e) {
      console.warn('Scheduled download failed:', e.message);
    }
  }
}, 30000);

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
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

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
    const checkUpdates = () => {
      autoUpdater.checkForUpdates().catch(error => {
        const noRelease = /404|latest\.yml/i.test(error.message);
        sendAppUpdateStatus('error', {
          message: noRelease
            ? 'Ainda não há uma versão publicada para atualização.'
            : 'Não foi possível verificar atualizações. Confira se há uma versão publicada.',
          error: error.message
        });
      });
    };
    checkUpdates();
    // Verificar novamente a cada 4 horas enquanto o app estiver aberto
    const updateInterval = setInterval(checkUpdates, 4 * 60 * 60 * 1000);
    app.on('will-quit', () => clearInterval(updateInterval));
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
