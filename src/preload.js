'use strict';

const { ipcRenderer } = require('electron');
const { resolveNavigationTarget } = require('./browser-utils');

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
  getDownloadSpace: () => ipcRenderer.invoke('get-download-space'),

  // Background image
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),

  // Download media
  downloadMedia: (opts) => ipcRenderer.invoke('download-media', opts),
  pauseDownload: (id) => ipcRenderer.invoke('pause-download', id),
  cancelDownload: (id) => ipcRenderer.invoke('cancel-download', id),
  inspectPlaylist: (url) => ipcRenderer.invoke('inspect-playlist', url),

  // Open file/folder
  openFile:   (p) => ipcRenderer.invoke('open-file', p),
  openFolder: (p) => ipcRenderer.invoke('open-folder', p),
  revealPath: (p) => ipcRenderer.invoke('reveal-path', p),
  openCategoryFolder: (category, basePath) => ipcRenderer.invoke('open-category-folder', { category, basePath }),

  // Download preferences and maintenance
  getDownloadPreferences: () => ipcRenderer.invoke('get-download-preferences'),
  saveDownloadPreferences: (preferences) => ipcRenderer.invoke('save-download-preferences', preferences),
  checkDownloadTools: () => ipcRenderer.invoke('check-download-tools'),
  updateYtDlp: () => ipcRenderer.invoke('update-ytdlp'),
  getFfmpegPath: () => ipcRenderer.invoke('get-ffmpeg-path'),
  getYtDlpPath: () => ipcRenderer.invoke('get-ytdlp-path'),
  getCustomUserAgent: () => ipcRenderer.invoke('get-custom-user-agent'),
  setCustomUserAgent: (userAgent) => ipcRenderer.invoke('set-custom-user-agent', userAgent),
  getDownloadAdvanced: () => ipcRenderer.invoke('get-download-advanced'),
  saveDownloadAdvanced: (options) => ipcRenderer.invoke('save-download-advanced', options),
  exportSettings: () => ipcRenderer.invoke('export-settings'),
  importSettings: () => ipcRenderer.invoke('import-settings'),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  getRecentLogs: () => ipcRenderer.invoke('get-recent-logs'),
  getDiscordSettings: () => ipcRenderer.invoke('get-discord-settings'),
  saveDiscordSettings: (options) => ipcRenderer.invoke('save-discord-settings', options),
  setDiscordMusicState: (state) => ipcRenderer.invoke('set-discord-music-state', state),
  toggleMiniPlayer: () => ipcRenderer.invoke('toggle-miniplayer'),
  getSuggestions: (query) => ipcRenderer.invoke('youtube-suggestions', query),
  getSchedules: () => ipcRenderer.invoke('get-schedules'),
  addSchedule: (data) => ipcRenderer.invoke('add-schedule', data),
  updateSchedule: (id, data) => ipcRenderer.invoke('update-schedule', id, data),
  removeSchedule: (id) => ipcRenderer.invoke('remove-schedule', id),
  getOnboardingDone: () => ipcRenderer.invoke('get-onboarding-done'),
  setOnboardingDone: () => ipcRenderer.invoke('set-onboarding-done'),
  getYoutubeAnonymous: () => ipcRenderer.invoke('get-youtube-anonymous'),
  setYoutubeAnonymous: (enabled) => ipcRenderer.invoke('set-youtube-anonymous', enabled),

  // Application updates
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppUpdateStatus: () => ipcRenderer.invoke('get-app-update-status'),
  checkAppUpdate: () => ipcRenderer.invoke('check-app-update'),
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),

  // Google Web privacy controls
  getGoogleShieldStatus: () => ipcRenderer.invoke('get-google-shield-status'),
  setGoogleShields: (enabled) => ipcRenderer.invoke('set-google-shields', enabled),
  getAdblockStatus: () => ipcRenderer.invoke('get-adblock-status'),
  setAdblock: (enabled) => ipcRenderer.invoke('set-adblock', enabled),
  clearGooglePrivateData: () => ipcRenderer.invoke('clear-google-private-data'),
  resolveNavigationTarget,

  // IPC event listeners
  on: (channel, callback) => {
    const allowedChannels = [
      'download-progress',
      'app-update-status',
      'google-shield-status',
      'window-maximized'
    ];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
};
