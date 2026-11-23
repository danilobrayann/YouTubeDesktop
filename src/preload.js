'use strict';

const { ipcRenderer, webUtils } = require('electron');
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
  getGoogleAccountStatus: () => ipcRenderer.invoke('get-google-account-status'),
  googleLogout: () => ipcRenderer.invoke('google-logout'),
  getTelegramConfig: () => ipcRenderer.invoke('get-telegram-config'),
  saveTelegramConfig: (config) => ipcRenderer.invoke('save-telegram-config', config),
  startTelegramWait: () => ipcRenderer.invoke('start-telegram-wait'),
  cancelTelegramWait: () => ipcRenderer.invoke('cancel-telegram-wait'),
  uploadFileTelegram: (opts) => ipcRenderer.invoke('upload-file-telegram', opts),
  telegramGetFiles: () => ipcRenderer.invoke('telegram-get-files'),
  telegramClearIndex: () => ipcRenderer.invoke('telegram-clear-index'),
  telegramDownloadFile: (id) => ipcRenderer.invoke('telegram-download-file', id),
  telegramGetFolders: () => ipcRenderer.invoke('telegram-get-folders'),
  telegramCreateFolder: (name) => ipcRenderer.invoke('telegram-create-folder', name),
  telegramMoveFile: (id, folder) => ipcRenderer.invoke('telegram-move-file', { id, folder }),
  telegramDownloadFolder: (folder) => ipcRenderer.invoke('telegram-download-folder', folder),
  telegramRenameFolder: (oldName, newName) => ipcRenderer.invoke('telegram-rename-folder', { oldName, newName }),
  telegramDeleteFolder: (folder) => ipcRenderer.invoke('telegram-delete-folder', folder),
  telegramRestoreFile: (id) => ipcRenderer.invoke('telegram-restore-file', id),
  telegramDeleteForever: (id) => ipcRenderer.invoke('telegram-delete-forever', id),
  telegramMoveFiles: (ids, folder) => ipcRenderer.invoke('telegram-move-files', { ids, folder }),
  telegramSetFolderIcon: (path, icon) => ipcRenderer.invoke('telegram-set-folder-icon', { path, icon }),
  telegramGetFolderIcons: () => ipcRenderer.invoke('telegram-get-folder-icons'),
  telegramSetFolderColor: (path, color) => ipcRenderer.invoke('telegram-set-folder-color', { path, color }),
  telegramGetFolderColors: () => ipcRenderer.invoke('telegram-get-folder-colors'),
  telegramPreviewFile: (id) => ipcRenderer.invoke('telegram-preview-file', id),
  telegramGetFavorites: () => ipcRenderer.invoke('telegram-get-favorites'),
  telegramToggleFavorite: (type, value) => ipcRenderer.invoke('telegram-toggle-favorite', { type, value }),
  tdGetPathForFile: (f) => { try { return webUtils.getPathForFile(f); } catch (e) { return null; } },
  telegramUploadDropped: (paths) => ipcRenderer.invoke('telegram-upload-dropped', paths),
  telegramDeleteFile: (id) => ipcRenderer.invoke('telegram-delete-file', id),
  telegramUploadPath: (filePath) => ipcRenderer.invoke('telegram-upload-path', filePath),
  telegramPickUploadFile: () => ipcRenderer.invoke('telegram-pick-upload-file'),
  telegramPickUploadFolder: () => ipcRenderer.invoke('telegram-pick-upload-folder'),
  telegramGetWatchFolder: () => ipcRenderer.invoke('telegram-get-watch-folder'),
  telegramPickWatchFolder: () => ipcRenderer.invoke('telegram-pick-watch-folder'),
  telegramGetWatchFolders: () => ipcRenderer.invoke('telegram-get-watch-folders'),
  telegramAddWatchFolder: (folderPath) => ipcRenderer.invoke('telegram-add-watch-folder', folderPath),
  telegramRemoveWatchFolder: (folderPath) => ipcRenderer.invoke('telegram-remove-watch-folder', folderPath),
  resolveNavigationTarget,

  // IPC event listeners
  on: (channel, callback) => {
    const allowedChannels = [
      'download-progress',
      'app-update-status',
      'google-shield-status',
      'window-maximized',
      'telegram-upload-status',
      'telegram-login-success',
      'telegram-login-timeout',
      'telegram-upload-event'
    ];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
};
