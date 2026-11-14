'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, session, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');

// Keep existing preferences and downloads settings after the product rename.
const userDataPath = path.join(app.getPath('appData'), 'YouTube Desktop');
fs.mkdirSync(userDataPath, { recursive: true });
app.setPath('userData', userDataPath);

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
    defaultFormat: '720p'
  }
});

// ─── Active downloads registry ───────────────────────────────────────────────
const activeDownloads = new Map(); // downloadId → child process

// ─── Main window & Tray ─────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let isQuitting = false;

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
  const fs = require('fs');
  const localBin = path.join(app.getAppPath(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  return 'yt-dlp';
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

// ─── Download Media ───────────────────────────────────────────────────────────
ipcMain.handle('download-media', async (event, { url, format, outputPath, downloadId, downloadPlaylist = true, playlistFolder = '' }) => {
  return new Promise((resolve, reject) => {
    const fs = require('fs');

    // Build yt-dlp arguments
    const args = [];

    // Format selection
    const audioFormats = ['mp3', 'm4a', 'opus'];
    const heightMap = { '1080p': 1080, '720p': 720, '480p': 480, '360p': 360 };
    const isAudio = audioFormats.includes(format);

    if (isAudio) {
      args.push('--extract-audio');
      args.push('--audio-format', format);
      args.push('--audio-quality', '0');
    } else {
      const height = heightMap[format] || 720;
      args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`);
      args.push('--merge-output-format', 'mp4');
    }

    // ── Gerenciamento Avançado de Pastas por Categoria ─────────────────────────
    // 1. Playlists -> Pasta Playlists/[Nome da Playlist]/
    // 2. Músicas avulsas -> Pasta Músicas/
    // 3. Vídeos avulsos -> Pasta Vídeos/
    const baseDir = outputPath || app.getPath('downloads');
    const playlistsDir = path.join(baseDir, 'Playlists');
    const musicasDir   = path.join(baseDir, 'Músicas');
    const videosDir    = path.join(baseDir, 'Vídeos');

    try {
      if (!fs.existsSync(playlistsDir)) fs.mkdirSync(playlistsDir, { recursive: true });
      if (!fs.existsSync(musicasDir))   fs.mkdirSync(musicasDir,   { recursive: true });
      if (!fs.existsSync(videosDir))    fs.mkdirSync(videosDir,    { recursive: true });
    } catch (e) {}

    const isPlaylistTarget = downloadPlaylist && (url.includes('list=') || url.includes('/playlist'));
    let defaultTargetFolder = baseDir;

    if (isPlaylistTarget) {
      // Ex: Downloads/Playlists/As Melhores Tocadas/01 - Titulo.mp3
      defaultTargetFolder = playlistsDir;
      args.push('-o', path.join(playlistsDir, '%(playlist_title,playlist)s', '%(playlist_index)02d - %(title)s.%(ext)s'));
    } else if (isAudio) {
      // Ex: Downloads/Músicas/Titulo.mp3
      defaultTargetFolder = musicasDir;
      args.push('--no-playlist');
      args.push('-o', path.join(musicasDir, '%(title)s.%(ext)s'));
    } else {
      // Ex: Downloads/Vídeos/Titulo.mp4
      defaultTargetFolder = videosDir;
      args.push('--no-playlist');
      args.push('-o', path.join(videosDir, '%(title)s.%(ext)s'));
    }

    // Output template
    args.push('--newline');
    args.push('--no-part');
    args.push(url);

    const ytDlpCmd = getYtDlpPath();
    const child = spawn(ytDlpCmd, args, { shell: false });
    activeDownloads.set(downloadId, child);

    let lastProgress = 0;
    let currentItem = 0;
    let totalItems = 0;
    let detectedTitle = '';
    let lastSavedFilePath = '';

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Detectar item da playlist: [download] Downloading item 1 of 15
        const itemMatch = trimmed.match(/\[download\]\s+Downloading\s+(?:item|video)\s+(\d+)\s+of\s+(\d+)/i);
        if (itemMatch) {
          currentItem = parseInt(itemMatch[1]);
          totalItems = parseInt(itemMatch[2]);
        }

        // Parse progress line: [download]  XX.X% of YY.YYMiB at ZZ.ZZKiB/s ETA HH:MM
        const progressMatch = trimmed.match(
          /\[download\]\s+([\d.]+)%\s+of\s+([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+([\d:]+)/
        );

        if (progressMatch) {
          const percent = parseFloat(progressMatch[1]);
          const size = progressMatch[2];
          const speed = progressMatch[3];
          const eta = progressMatch[4];
          lastProgress = percent;

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
              downloadId,
              percent,
              size,
              speed,
              eta,
              currentItem,
              totalItems,
              title: detectedTitle,
              status: 'downloading'
            });
          }
        }

        // Destination line / Title detection
        if (trimmed.startsWith('[download] Destination:')) {
          const filePath = trimmed.replace('[download] Destination:', '').trim();
          lastSavedFilePath = filePath;
          detectedTitle = path.basename(filePath);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
              downloadId,
              percent: lastProgress,
              speed: '',
              eta: '',
              currentItem,
              totalItems,
              title: detectedTitle,
              filePath: lastSavedFilePath,
              status: 'downloading',
              message: `Baixando: ${detectedTitle}`
            });
          }
        }

        if (trimmed.startsWith('[Merger]') || trimmed.includes('has already been downloaded')) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
              downloadId,
              percent: lastProgress,
              speed: '',
              eta: '',
              currentItem,
              totalItems,
              title: detectedTitle,
              filePath: lastSavedFilePath,
              status: 'processing',
              message: trimmed
            });
          }
        }
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          percent: lastProgress,
          speed: '',
          eta: '',
          currentItem,
          totalItems,
          title: detectedTitle,
          status: 'processing',
          message: text
        });
      }
    });

    child.on('close', (code) => {
      activeDownloads.delete(downloadId);
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (code === 0) {
          // Determina a pasta exata onde o arquivo (ou subpasta de playlist) foi parar
          let exactFolder = defaultTargetFolder;
          if (lastSavedFilePath) {
            try {
              exactFolder = path.dirname(lastSavedFilePath);
            } catch (e) {}
          }

          mainWindow.webContents.send('download-progress', {
            downloadId,
            percent: 100,
            speed: '',
            eta: '',
            currentItem,
            totalItems,
            title: detectedTitle,
            targetFolder: exactFolder,
            filePath: lastSavedFilePath,
            status: 'complete'
          });
          resolve({ success: true, folder: exactFolder, file: lastSavedFilePath });
        } else if (code === null) {
          // Cancelled
          mainWindow.webContents.send('download-progress', {
            downloadId,
            percent: lastProgress,
            speed: '',
            eta: '',
            currentItem,
            totalItems,
            status: 'cancelled'
          });
          resolve({ success: false, cancelled: true });
        } else {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            percent: lastProgress,
            speed: '',
            eta: '',
            currentItem,
            totalItems,
            status: 'error',
            message: `yt-dlp finalizou com codigo ${code}`
          });
          reject(new Error(`yt-dlp finalizou com codigo ${code}`));
        }
      }
    });

    child.on('error', (err) => {
      activeDownloads.delete(downloadId);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          percent: 0,
          speed: '',
          eta: '',
          status: 'error',
          message: err.message
        });
      }
      reject(err);
    });
  });
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
  const child = activeDownloads.get(downloadId);
  if (child) {
    child.kill('SIGTERM');
    // Windows fallback
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
    }
    activeDownloads.delete(downloadId);
    return true;
  }
  return false;
});

// ─── Open File / Folder ───────────────────────────────────────────────────────
ipcMain.handle('open-file', (event, filePath) => {
  return shell.openPath(filePath);
});

ipcMain.handle('open-folder', (event, folderPath) => {
  return shell.openPath(folderPath);
});

// ─── Default format persistence ───────────────────────────────────────────────
ipcMain.handle('get-default-format', () => {
  return store.get('defaultFormat');
});

ipcMain.handle('save-default-format', (event, fmt) => {
  store.set('defaultFormat', fmt);
  return true;
});
