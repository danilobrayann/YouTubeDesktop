'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

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

// ─── Main window ─────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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
    // Build yt-dlp arguments
    const args = [];

    // Format selection
    const audioFormats = ['mp3', 'm4a', 'opus'];
    const heightMap = { '1080p': 1080, '720p': 720, '480p': 480, '360p': 360 };

    if (audioFormats.includes(format)) {
      args.push('--extract-audio');
      args.push('--audio-format', format);
      args.push('--audio-quality', '0');
    } else {
      const height = heightMap[format] || 720;
      args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`);
      args.push('--merge-output-format', 'mp4');
    }

    // Gerenciamento Inteligente de Pastas:
    // Se for playlist, cria pasta exclusiva com o nome da playlist e arquivos numerados!
    const isPlaylistTarget = downloadPlaylist && (url.includes('list=') || url.includes('/playlist'));
    let targetFolder = outputPath;

    if (isPlaylistTarget) {
      args.push('-o', path.join(outputPath, '%(playlist_title,playlist)s', '%(playlist_index)02d - %(title)s.%(ext)s'));
    } else {
      args.push('--no-playlist');
      args.push('-o', path.join(outputPath, '%(title)s.%(ext)s'));
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
          mainWindow.webContents.send('download-progress', {
            downloadId,
            percent: 100,
            speed: '',
            eta: '',
            currentItem,
            totalItems,
            title: detectedTitle,
            status: 'complete'
          });
          resolve({ success: true, folder: targetFolder });
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
