'use strict';

const { ipcRenderer } = require('electron');

// ─── Expose API to renderer ───────────────────────────────────────────────────
// Since contextIsolation is false, we attach to window directly for simplicity
// but also expose via a clean api object

window.api = {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow:    () => ipcRenderer.send('close-window'),

  // Theme
  getTheme:  () => ipcRenderer.invoke('get-theme'),
  saveTheme: (theme) => ipcRenderer.invoke('save-theme', theme),

  // Download path
  getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
  setDownloadPath: () => ipcRenderer.invoke('set-download-path'),

  // Background image
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),

  // Download media
  downloadMedia: (opts) => ipcRenderer.invoke('download-media', opts),
  cancelDownload: (id) => ipcRenderer.invoke('cancel-download', id),
  inspectPlaylist: (url) => ipcRenderer.invoke('inspect-playlist', url),

  // Open file/folder
  openFile:   (p) => ipcRenderer.invoke('open-file', p),
  openFolder: (p) => ipcRenderer.invoke('open-folder', p),
  openCategoryFolder: (category, basePath) => ipcRenderer.invoke('open-category-folder', { category, basePath }),

  // Torrent
  isTorrentAvailable: () => ipcRenderer.invoke('is-torrent-available'),
  getTorrents:        () => ipcRenderer.invoke('get-torrents'),
  addTorrent:         (opts) => ipcRenderer.invoke('add-torrent', opts),
  pauseTorrent:       (id) => ipcRenderer.invoke('pause-torrent', id),
  resumeTorrent:      (id) => ipcRenderer.invoke('resume-torrent', id),
  removeTorrent:      (opts) => ipcRenderer.invoke('remove-torrent', opts),
  selectTorrentFile:  () => ipcRenderer.invoke('select-torrent-file'),

  // Default format
  getDefaultFormat:  () => ipcRenderer.invoke('get-default-format'),
  saveDefaultFormat: (f) => ipcRenderer.invoke('save-default-format', f),

  // IPC event listeners
  on: (channel, callback) => {
    const allowedChannels = [
      'download-progress',
      'window-maximized',
      'torrent-added',
      'torrent-progress',
      'torrent-ready',
      'torrent-done',
      'torrent-error',
      'torrent-updated',
      'torrent-removed'
    ];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
};
