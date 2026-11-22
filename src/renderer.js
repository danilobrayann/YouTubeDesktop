'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// TurboDown — renderer.js
// Full renderer: theme engine, tab navigation, downloads, settings
// ═══════════════════════════════════════════════════════════════════════════

const api = window.api;

// ── State ──────────────────────────────────────────────────────────────────
let currentTab = 'home';
let downloadPath = '';
let currentTheme = {};
const downloads = new Map(); // downloadId → { url, format, status, percent, ... }
const downloadQueue = [];
let queueProcessing = false;
let downloadPreferences = { videoFormat: '720p', audioFormat: 'mp3' };
const appShell = document.getElementById('app');
const btnMenuToggle = document.getElementById('btn-menu-toggle');

// ── DOM Refs ───────────────────────────────────────────────────────────────
const webview        = document.getElementById('youtube-player');
const urlInput       = document.getElementById('url-input');
const btnLoad        = document.getElementById('btn-load');
const btnDownloadQ   = document.getElementById('btn-download-quick');
const btnNavBack     = document.getElementById('btn-nav-back');
const btnNavForward  = document.getElementById('btn-nav-forward');
const btnNavReload   = document.getElementById('btn-nav-reload');
const btnNavHome     = document.getElementById('btn-nav-home');
const btnToggleTheater = document.getElementById('btn-toggle-theater');
const tabHome        = document.getElementById('tab-home');
const dlUrl          = document.getElementById('dl-url');
const dlFormat       = document.getElementById('dl-format');
const btnStartDl     = document.getElementById('btn-start-download');
const dlPathDisplay  = document.getElementById('dl-path-display');
const btnChangePath  = document.getElementById('btn-change-path');
const btnOpenFolder  = document.getElementById('btn-open-folder');
const btnOpenVideos     = document.getElementById('btn-open-videos');
const btnOpenMusicas    = document.getElementById('btn-open-musicas');
const btnOpenPlaylists  = document.getElementById('btn-open-playlists');
const downloadList   = document.getElementById('download-list');
const dlEmptyState   = document.getElementById('dl-empty-state');
const downloadHistory = document.getElementById('download-history');
const historyList    = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');
const dlBadge        = document.getElementById('dl-badge');
const webviewLoading = document.getElementById('webview-loading');
const modalBackdrop  = document.getElementById('modal-backdrop');
const modalDownload  = document.getElementById('modal-download');
const modalUrl       = document.getElementById('modal-url-text');
const modalFormat    = document.getElementById('modal-format');
const modalClosBtn   = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalDlBtn     = document.getElementById('modal-download-btn');
const modalSubs      = document.getElementById('modal-subs');
const modalThumbnail = document.getElementById('modal-thumbnail');
const modalMp3Quality = document.getElementById('modal-mp3-quality');
const modalSpeedLimit = document.getElementById('modal-speed-limit');
const mp3QualityRow  = document.getElementById('mp3-quality-row');

// Playlist modal refs
const modalPlaylist          = document.getElementById('modal-playlist');
const modalPlaylistCloseBtn  = document.getElementById('modal-playlist-close-btn');
const modalPlaylistCancelBtn = document.getElementById('modal-playlist-cancel-btn');
const modalPlaylistSingleBtn = document.getElementById('modal-playlist-single-btn');
const modalPlaylistAllBtn    = document.getElementById('modal-playlist-all-btn');
const playlistTitleText      = document.getElementById('playlist-title-text');
const playlistCountBadge     = document.getElementById('playlist-count-badge');
const modalPlaylistFormat    = document.getElementById('modal-playlist-format');

// Settings
const setAccent          = document.getElementById('set-accent');
const setBgColor         = document.getElementById('set-bgcolor');
const setGradEnabled     = document.getElementById('set-gradient-enabled');
const setGradAngle       = document.getElementById('set-gradient-angle');
const setGradC1          = document.getElementById('set-grad-c1');
const setGradC2          = document.getElementById('set-grad-c2');
const setBlur            = document.getElementById('set-blur');
const setOpacity         = document.getElementById('set-opacity');
const setTransparency    = document.getElementById('set-transparency');
const setDefaultVideoFormat = document.getElementById('set-default-video-format');
const setDefaultAudioFormat = document.getElementById('set-default-audio-format');
const setCustomUserAgent = document.getElementById('set-custom-user-agent');
const setSpeedLimit     = document.getElementById('set-speed-limit');
const setProxy          = document.getElementById('set-proxy');
const setCookiesBrowser = document.getElementById('set-cookies-browser');
const setDiscordEnabled  = document.getElementById('set-discord-enabled');
const setDiscordClientId = document.getElementById('set-discord-client-id');
const setAdblockEnabled  = document.getElementById('set-adblock-enabled');
const btnPickBg          = document.getElementById('btn-pick-bg');
const btnClearBg         = document.getElementById('btn-clear-bg');
const bgPreviewImg       = document.getElementById('bg-preview-img');
const bgPreviewText      = document.getElementById('bg-preview-text');
const btnSaveTheme       = document.getElementById('btn-save-theme');
const saveStatus         = document.getElementById('save-status');
const btnExportSettings  = document.getElementById('btn-export-settings');
const btnImportSettings  = document.getElementById('btn-import-settings');
const settingsDlPath     = document.getElementById('settings-dl-path');
const btnSettingsChPath  = document.getElementById('btn-settings-change-path');
const dlSpaceDisplay     = document.getElementById('dl-space-display');
const btnRefreshSpace    = document.getElementById('btn-refresh-space');
const toolYtDlpStatus    = document.getElementById('tool-ytdlp-status');
const toolFfmpegStatus   = document.getElementById('tool-ffmpeg-status');
const appVersionStatus   = document.getElementById('app-version-status');
const maintenanceMessage = document.getElementById('maintenance-message');
const appUpdateBadge     = document.getElementById('app-update-badge');
const btnCheckTools      = document.getElementById('btn-check-tools');
const btnUpdateYtDlp     = document.getElementById('btn-update-ytdlp');
const btnCheckAppUpdate  = document.getElementById('btn-check-app-update');
const btnInstallAppUpdate = document.getElementById('btn-install-app-update');
const accentLabel        = document.getElementById('accent-label');
const bgcolorLabel       = document.getElementById('bgcolor-label');
const gradc1Label        = document.getElementById('gradc1-label');
const gradc2Label        = document.getElementById('gradc2-label');
const angleVal           = document.getElementById('angle-val');
const blurVal            = document.getElementById('blur-val');
const opacityVal         = document.getElementById('opacity-val');
const musicPlayer        = document.getElementById('music-player');
const musicLoading       = document.getElementById('music-loading');
const musicLoadingText   = document.getElementById('music-loading-text');
const musicRetry         = document.getElementById('music-retry');

// Google Web DOM refs
const googleWebviews        = document.getElementById('google-webviews');
const googleTabsContainer   = document.getElementById('google-tabs');
const googleUrlInput        = document.getElementById('google-url-input');
const btnGoogleSearch       = document.getElementById('btn-google-search');
const btnGoogleBack         = document.getElementById('btn-google-back');
const btnGoogleForward      = document.getElementById('btn-google-forward');
const btnGoogleReload       = document.getElementById('btn-google-reload');
const btnGoogleHome         = document.getElementById('btn-google-home');
const btnGoogleNewTab       = document.getElementById('btn-google-new-tab');
const btnGoogleNewPrivateTab = document.getElementById('btn-google-new-private-tab');
const btnGoogleBookmark     = document.getElementById('btn-google-bookmark');
const btnGoogleBookmarks    = document.getElementById('btn-google-bookmarks');
const btnGoogleHistory      = document.getElementById('btn-google-history');
const btnGoogleShields      = document.getElementById('btn-google-shields');
const googleShieldsCount    = document.getElementById('google-shields-count');
const googleLibraryPanel    = document.getElementById('google-library-panel');
const googleLibraryTitle    = document.getElementById('google-library-title');
const googleLibraryList     = document.getElementById('google-library-list');
const btnGoogleClearHistory = document.getElementById('btn-google-clear-history');
const btnGoogleCloseLibrary = document.getElementById('btn-google-close-library');
const googleLoading         = document.getElementById('google-loading');
let activeGoogleWebview     = null;
let activeGoogleTabId       = null;
let googleShieldsEnabled    = true;
let googleHistory           = loadBrowserList('turbodown-google-history');
let googleBookmarks         = loadBrowserList('turbodown-google-bookmarks');
const googleTabs            = new Map();
let googleTabOrder          = [];
let googleLibraryMode       = '';

// Social sidebar browser
const socialWebview          = document.getElementById('social-player');
const socialLoading          = document.getElementById('social-loading');
const socialError            = document.getElementById('social-error');
const socialCurrentName      = document.getElementById('social-current-name');
const socialCurrentUrl       = document.getElementById('social-current-url');
const btnSocialBack          = document.getElementById('btn-social-back');
const btnSocialForward       = document.getElementById('btn-social-forward');
const btnSocialReload        = document.getElementById('btn-social-reload');
const btnSocialHome          = document.getElementById('btn-social-home');
let currentSocialUrl         = 'https://web.whatsapp.com/';

// Wallpapers browser
const wallpapersWebview      = document.getElementById('wallpapers-player');
const wallpapersLoading      = document.getElementById('wallpapers-loading');
const btnWallpapersBack      = document.getElementById('btn-wallpapers-back');
const btnWallpapersForward   = document.getElementById('btn-wallpapers-forward');
const btnWallpapersReload    = document.getElementById('btn-wallpapers-reload');
const btnWallpapersHome      = document.getElementById('btn-wallpapers-home');

// Gemini browser
const geminiWebview           = document.getElementById('gemini-player');
const geminiLoading           = document.getElementById('gemini-loading');
const btnGeminiBack           = document.getElementById('btn-gemini-back');
const btnGeminiForward        = document.getElementById('btn-gemini-forward');
const btnGeminiReload         = document.getElementById('btn-gemini-reload');
const btnGeminiHome           = document.getElementById('btn-gemini-home');

// ── THEME PRESETS ──────────────────────────────────────────────────────────
const PRESETS = {
  dark: {
    accentColor: '#ff4444',
    bgColor: '#0f0f1a',
    gradientEnabled: true,
    gradientAngle: 135,
    gradientColor1: '#0f0f1a',
    gradientColor2: '#1a1a2e',
    glassBlur: 12,
    glassOpacity: 15,
    transparencyEnabled: true,
    backgroundImage: null,
    preset: 'dark'
  },
  amoled: {
    accentColor: '#ff4444',
    bgColor: '#000000',
    gradientEnabled: false,
    gradientAngle: 135,
    gradientColor1: '#000000',
    gradientColor2: '#0a0a0a',
    glassBlur: 10,
    glassOpacity: 10,
    transparencyEnabled: true,
    backgroundImage: null,
    preset: 'amoled'
  },
  midnight: {
    accentColor: '#a855f7',
    bgColor: '#0d0d2b',
    gradientEnabled: true,
    gradientAngle: 135,
    gradientColor1: '#0d0d2b',
    gradientColor2: '#1a0533',
    glassBlur: 14,
    glassOpacity: 12,
    transparencyEnabled: true,
    backgroundImage: null,
    preset: 'midnight'
  },
  ocean: {
    accentColor: '#00b4d8',
    bgColor: '#0a192f',
    gradientEnabled: true,
    gradientAngle: 160,
    gradientColor1: '#0a192f',
    gradientColor2: '#112240',
    glassBlur: 12,
    glassOpacity: 15,
    transparencyEnabled: true,
    backgroundImage: null,
    preset: 'ocean'
  },
  forest: {
    accentColor: '#10b981',
    bgColor: '#0a1628',
    gradientEnabled: true,
    gradientAngle: 150,
    gradientColor1: '#0a1628',
    gradientColor2: '#0d2137',
    glassBlur: 12,
    glassOpacity: 15,
    transparencyEnabled: true,
    backgroundImage: null,
    preset: 'forest'
  },
  sunset: {
    accentColor: '#f97316',
    bgColor: '#1a0a0f',
    gradientEnabled: true,
    gradientAngle: 120,
    gradientColor1: '#1a0a0f',
    gradientColor2: '#2d1b1b',
    glassBlur: 12,
    glassOpacity: 15,
    transparencyEnabled: true,
    backgroundImage: null,
    preset: 'sunset'
  },
  light: {
    accentColor: '#e63946',
    bgColor: '#f0f0f5',
    gradientEnabled: true,
    gradientAngle: 135,
    gradientColor1: '#f0f0f5',
    gradientColor2: '#e8e8f0',
    glassBlur: 10,
    glassOpacity: 40,
    transparencyEnabled: false,
    backgroundImage: null,
    preset: 'light'
  }
};

// ── THEME ENGINE ───────────────────────────────────────────────────────────
function applyTheme(theme) {
  currentTheme = { ...theme };
  const root = document.documentElement;

  // Accent color and derived values
  const accent = theme.accentColor || '#ff4444';
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-hover', lightenColor(accent, 20));
  root.style.setProperty('--accent-dim', hexToRgba(accent, 0.2));

  // Glass
  const blur    = theme.glassBlur    !== undefined ? theme.glassBlur    : 12;
  const opacity = theme.glassOpacity !== undefined ? theme.glassOpacity : 15;
  root.style.setProperty('--glass-blur',    `${blur}px`);
  root.style.setProperty('--glass-opacity', (opacity / 100).toFixed(2));
  root.style.setProperty('--glass-bg',      hexToRgba(theme.bgColor || '#ffffff', opacity / 100 * 0.5));

  // Background
  const isLight = isLightColor(theme.bgColor || '#0f0f1a');
  if (isLight) {
    root.style.setProperty('--text-primary',   '#1a1a2e');
    root.style.setProperty('--text-secondary', 'rgba(26,26,46,0.75)');
    root.style.setProperty('--text-muted',     'rgba(26,26,46,0.45)');
    root.style.setProperty('--glass-border',   'rgba(26,26,46,0.12)');
    root.style.setProperty('--glass-bg',       hexToRgba('#000000', 0.06));
    root.style.setProperty('--scrollbar-thumb','rgba(26,26,46,0.2)');
  } else {
    root.style.setProperty('--text-primary',   '#ffffff');
    root.style.setProperty('--text-secondary', 'rgba(255,255,255,0.65)');
    root.style.setProperty('--text-muted',     'rgba(255,255,255,0.35)');
    root.style.setProperty('--glass-border',   'rgba(255,255,255,0.1)');
    root.style.setProperty('--glass-bg',       `rgba(255,255,255,${(opacity / 100 * 0.5).toFixed(2)})`);
    root.style.setProperty('--scrollbar-thumb','rgba(255,255,255,0.15)');
  }

  // Background gradient or solid
  if (theme.backgroundImage) {
    document.body.style.backgroundImage = `url('${theme.backgroundImage.replace(/\\/g, '/')}')`;
    document.body.classList.add('has-bg-image');
    root.style.setProperty('--bg-gradient', 'none');
  } else {
    document.body.classList.remove('has-bg-image');
    document.body.style.backgroundImage = '';
    if (theme.gradientEnabled) {
      const angle = theme.gradientAngle !== undefined ? theme.gradientAngle : 135;
      const c1    = theme.gradientColor1 || theme.bgColor || '#0f0f1a';
      const c2    = theme.gradientColor2 || '#1a1a2e';
      const grad  = `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;
      document.body.style.background  = grad;
      root.style.setProperty('--bg-gradient', grad);
    } else {
      document.body.style.background = theme.bgColor || '#0f0f1a';
      root.style.setProperty('--bg-gradient', theme.bgColor || '#0f0f1a');
    }
  }

  // Titlebar bg
  root.style.setProperty('--titlebar-bg', hexToRgba(theme.bgColor || '#0a0a14', 0.6));
}

async function saveTheme() {
  const theme = readThemeFromForm();
  await api.saveTheme(theme);
  applyTheme(theme);
}

async function loadTheme() {
  const theme = await api.getTheme();
  if (theme) {
    applyTheme(theme);
    populateSettingsForm(theme);
  }
}

function readThemeFromForm() {
  return {
    accentColor:       setAccent.value,
    bgColor:           setBgColor.value,
    gradientEnabled:   setGradEnabled.checked,
    gradientAngle:     parseInt(setGradAngle.value, 10),
    gradientColor1:    setGradC1.value,
    gradientColor2:    setGradC2.value,
    glassBlur:         parseInt(setBlur.value, 10),
    glassOpacity:      parseInt(setOpacity.value, 10),
    transparencyEnabled: setTransparency.checked,
    backgroundImage:   currentTheme.backgroundImage || null,
    preset:            currentTheme.preset || 'dark'
  };
}

function populateSettingsForm(theme) {
  setAccent.value         = theme.accentColor   || '#ff4444';
  setBgColor.value        = theme.bgColor        || '#0f0f1a';
  setGradEnabled.checked  = !!theme.gradientEnabled;
  setGradAngle.value      = theme.gradientAngle  !== undefined ? theme.gradientAngle : 135;
  setGradC1.value         = theme.gradientColor1 || '#0f0f1a';
  setGradC2.value         = theme.gradientColor2 || '#1a1a2e';
  setBlur.value           = theme.glassBlur      !== undefined ? theme.glassBlur    : 12;
  setOpacity.value        = theme.glassOpacity   !== undefined ? theme.glassOpacity : 15;
  setTransparency.checked = theme.transparencyEnabled !== false;

  // Update labels
  accentLabel.textContent  = theme.accentColor   || '#ff4444';
  bgcolorLabel.textContent = theme.bgColor        || '#0f0f1a';
  gradc1Label.textContent  = theme.gradientColor1 || '#0f0f1a';
  gradc2Label.textContent  = theme.gradientColor2 || '#1a1a2e';
  angleVal.textContent     = `${setGradAngle.value}°`;
  blurVal.textContent      = `${setBlur.value}px`;
  opacityVal.textContent   = `${setOpacity.value}%`;

  // Background image preview
  if (theme.backgroundImage) {
    showBgPreview(theme.backgroundImage);
  }

  // Active preset
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === theme.preset);
  });
}

// ── COLOR UTILS ────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  if (!hex || hex === 'none') return `rgba(255,255,255,${alpha})`;
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenColor(hex, amount) {
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = Math.min(255, parseInt(full.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(full.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(full.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function isLightColor(hex) {
  if (!hex) return false;
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 180;
}

// ── TAB NAVIGATION ─────────────────────────────────────────────────────────
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
    item.removeAttribute('aria-current');
  });

  const tab     = document.getElementById(`tab-${tabId}`);
  const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (tab)     tab.classList.add('active');
  if (navItem) {
    navItem.classList.add('active');
    navItem.setAttribute('aria-current', 'page');
  }

  if (tabId === 'music' && !musicPlayer.getAttribute('src')) {
    musicPlayer.setAttribute('src', 'https://music.youtube.com/');
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    switchTab(item.dataset.tab);
  });
});

musicPlayer.addEventListener('did-start-loading', () => {
  musicLoading.classList.remove('hidden');
  musicLoadingText.textContent = 'Carregando YouTube Music...';
  musicRetry.classList.add('hidden');
});

musicPlayer.addEventListener('dom-ready', () => {
  musicLoading.classList.add('hidden');
});

// ── Discord Rich Presence: poll media players (Music + navegador) ───────────
let discordPresenceEnabled = false;

const DISCORD_YOUTUBE_EXTRACT = `(() => {
  const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
  if (!v) return { playing: false };
  const isWatch = location.pathname === '/watch' || location.pathname.startsWith('/shorts/');
  const titleEl = document.querySelector('h1.ytd-watch-metadata h1 yt-formatted-string, #title h1 yt-formatted-string, h1 yt-formatted-string');
  const channelEl = document.querySelector('#channel-name a, ytd-channel-name a, .ytd-channel-name a');
  let title = titleEl ? titleEl.innerText.trim() : '';
  if (!title) title = (document.title || '').replace(/ - YouTube$/, '').trim();
  if (!title || !isWatch) return { playing: false };
  const videoId = new URLSearchParams(location.search).get('v')
    || location.pathname.match(/\\/(?:shorts|live)\\/([\\w-]{11})/)?.[1]
    || '';
  return {
    playing: !v.paused && !v.ended && v.readyState > 1,
    title,
    artist: channelEl ? channelEl.innerText.trim() : 'YouTube',
    label: 'Vendo',
    image: videoId ? 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg' : null,
    position: v.currentTime || 0,
    duration: isFinite(v.duration) ? v.duration : 0
  };
})()`;

const DISCORD_MUSIC_EXTRACT = `(() => {
  const v = document.querySelector('video');
  const bar = document.querySelector('ytmusic-player-bar');
  const titleEl = bar && bar.querySelector('.title');
  const subEl = bar && bar.querySelector('.subtitle');
  const title = titleEl ? titleEl.innerText.trim() : '';
  const artist = subEl ? subEl.innerText.trim() : '';
  if (!v || !title) return { playing: false };
  const videoId = new URLSearchParams(location.search).get('v') || '';
  return {
    playing: !v.paused && !v.ended && v.readyState > 1,
    title, artist, label: 'Ouvindo',
    image: videoId ? 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg' : null,
    position: v.currentTime || 0,
    duration: isFinite(v.duration) ? v.duration : 0
  };
})()`;

const DISCORD_GENERIC_EXTRACT = `(() => {
  const media = document.querySelector('video, audio');
  if (!media) return { playing: false };
  const playing = !media.paused && !media.ended && media.readyState > 1;
  if (!playing) return { playing: false };
  const title = (document.title || '').trim();
  return {
    playing: true,
    title: title || location.hostname,
    artist: location.hostname,
    label: 'Reproduzindo',
    position: media.currentTime || 0,
    duration: isFinite(media.duration) ? media.duration : 0
  };
})()`;

function sendDiscordState(state) {
  api.setDiscordMusicState(state || { playing: false }).catch(() => {});
}

async function pollDiscordMusicState() {
  if (!discordPresenceEnabled) {
    sendDiscordState({ playing: false });
    return;
  }

  // 1) YouTube Music tem prioridade
  try {
    if (musicPlayer && musicPlayer.getAttribute('src')) {
      const state = await musicPlayer.executeJavaScript(DISCORD_MUSIC_EXTRACT, true);
      if (state && state.playing) { sendDiscordState(state); return; }
    }
  } catch (e) { /* webview ainda não carregou */ }

  // 2) YouTube normal (aba navegador) — vídeos e lives
  try {
    if (webview && webview.getAttribute('src')) {
      const state = await webview.executeJavaScript(DISCORD_YOUTUBE_EXTRACT, true);
      if (state && state.playing) { sendDiscordState(state); return; }
      // 3) Qualquer outra mídia tocando no navegador (SoundCloud, etc.)
      const generic = await webview.executeJavaScript(DISCORD_GENERIC_EXTRACT, true);
      if (generic && generic.playing) { sendDiscordState(generic); return; }
    }
  } catch (e) { /* webview ainda não carregou */ }

  sendDiscordState({ playing: false });
}

setInterval(pollDiscordMusicState, 15000);
window.addEventListener('beforeunload', () => {
  api.setDiscordMusicState({ playing: false }).catch(() => {});
});

// ── Miniplayer flutuante ────────────────────────────────────────────────────
const btnMiniPlayer = document.getElementById('btn-miniplayer');
if (btnMiniPlayer) {
  btnMiniPlayer.addEventListener('click', async () => {
    try { await api.toggleMiniPlayer(); } catch (e) { console.warn(e); }
  });
}

// ── Downloads agendados ─────────────────────────────────────────────────────
const btnToggleSchedule = document.getElementById('btn-toggle-schedule');
const scheduleForm      = document.getElementById('schedule-form');
const schedUrl          = document.getElementById('sched-url');
const schedFormat       = document.getElementById('sched-format');
const schedTime         = document.getElementById('sched-time');
const btnAddSchedule    = document.getElementById('btn-add-schedule');
const scheduleList      = document.getElementById('schedule-list');

function fmtScheduleDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

async function renderSchedules() {
  if (!scheduleList) return;
  const schedules = await api.getSchedules();
  scheduleList.innerHTML = '';
  if (!schedules.length) {
    scheduleList.innerHTML = '<p class="schedule-empty">Nenhum download agendado</p>';
    return;
  }
  schedules.forEach(s => {
    const row = document.createElement('div');
    row.className = 'schedule-item';
    row.innerHTML = `
      <div class="schedule-item-info">
        <div class="schedule-item-title"></div>
        <div class="schedule-item-time"></div>
      </div>
      <button class="btn-ghost btn-sm schedule-remove" title="Remover">
        <svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>
      </button>`;
    row.querySelector('.schedule-item-title').textContent = s.label;
    row.querySelector('.schedule-item-time').textContent = `⏰ ${fmtScheduleDate(s.runAt)} · ${s.format}`;
    row.querySelector('.schedule-remove').addEventListener('click', async () => {
      await api.removeSchedule(s.id);
      renderSchedules();
    });
    scheduleList.appendChild(row);
  });
}

if (btnToggleSchedule && scheduleForm) {
  btnToggleSchedule.addEventListener('click', () => {
    scheduleForm.classList.toggle('hidden');
    if (!scheduleForm.classList.contains('hidden') && !schedTime.value) {
      const d = new Date(Date.now() + 3600000);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      schedTime.value = d.toISOString().slice(0, 16);
    }
  });
}

if (btnAddSchedule) {
  btnAddSchedule.addEventListener('click', async () => {
    const url = schedUrl.value.trim();
    const runAt = schedTime.value;
    if (!url || !runAt) { alert('Informe a URL e a data/hora.'); return; }
    try {
      await api.addSchedule({ url, format: schedFormat.value, runAt });
      schedUrl.value = '';
      renderSchedules();
    } catch (e) { alert(`Falha ao agendar: ${e.message}`); }
  });
}
renderSchedules();

// ── Onboarding ──────────────────────────────────────────────────────────────
(async () => {
  try {
    const done = await api.getOnboardingDone();
    if (!done) {
      document.getElementById('onboarding-overlay').classList.remove('hidden');
    }
  } catch { /* ignore */ }
})();

const btnOnboardingClose = document.getElementById('btn-onboarding-close');
if (btnOnboardingClose) {
  btnOnboardingClose.addEventListener('click', async () => {
    document.getElementById('onboarding-overlay').classList.add('hidden');
    await api.setOnboardingDone().catch(() => {});
  });
}

// ── Sleep timer (YouTube Music) ─────────────────────────────────────────────
const sleepTimerSelect = document.getElementById('sleep-timer-select');
const sleepTimerStatus = document.getElementById('sleep-timer-status');
let sleepTimerTimeout = null;
let sleepTimerEndAt = 0;

function updateSleepTimerStatus() {
  if (!sleepTimerEndAt) {
    sleepTimerStatus.classList.add('hidden');
    return;
  }
  const remaining = Math.max(0, Math.round((sleepTimerEndAt - Date.now()) / 60000));
  sleepTimerStatus.textContent = `Para em ~${remaining} min`;
  sleepTimerStatus.classList.remove('hidden');
}

if (sleepTimerSelect) {
  sleepTimerSelect.addEventListener('change', () => {
    clearTimeout(sleepTimerTimeout);
    sleepTimerEndAt = 0;
    const mins = parseInt(sleepTimerSelect.value, 10);
    if (!mins) { updateSleepTimerStatus(); return; }
    sleepTimerEndAt = Date.now() + mins * 60000;
    sleepTimerTimeout = setTimeout(() => {
      musicPlayer.executeJavaScript(
        `(() => { const v = document.querySelector('video'); if (v) v.pause(); })()`
      ).catch(() => {});
      sleepTimerEndAt = 0;
      sleepTimerSelect.value = '0';
      updateSleepTimerStatus();
    }, mins * 60000);
    updateSleepTimerStatus();
  });
}
setInterval(updateSleepTimerStatus, 30000);

musicPlayer.addEventListener('did-fail-load', (event) => {
  if (event.errorCode === -3 || !event.isMainFrame) return;
  musicLoading.classList.remove('hidden');
  musicLoadingText.textContent = 'Não foi possível carregar o YouTube Music. Verifique a conexão e tente novamente.';
  musicRetry.classList.remove('hidden');
});

musicRetry.addEventListener('click', () => musicPlayer.reload());

function setSidebarCollapsed(collapsed) {
  appShell.classList.toggle('sidebar-collapsed', collapsed);
  btnMenuToggle.setAttribute('aria-expanded', String(!collapsed));
  btnMenuToggle.setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Recolher menu');
  btnMenuToggle.title = collapsed ? 'Expandir menu' : 'Recolher menu';
  localStorage.setItem('sidebar-collapsed', String(collapsed));
}

const savedSidebarState = localStorage.getItem('sidebar-collapsed');
const sidebarStartsCollapsed = savedSidebarState === null
  ? window.matchMedia('(max-width: 950px)').matches
  : savedSidebarState === 'true';
setSidebarCollapsed(sidebarStartsCollapsed);

btnMenuToggle.addEventListener('click', () => {
  setSidebarCollapsed(!appShell.classList.contains('sidebar-collapsed'));
});

// ── WINDOW CONTROLS ────────────────────────────────────────────────────────
document.getElementById('btn-min').addEventListener('click',   () => api.minimizeWindow());
document.getElementById('btn-max').addEventListener('click',   () => api.maximizeWindow());
document.getElementById('btn-close').addEventListener('click', () => api.closeWindow());

if (api && api.on) {
  api.on('window-maximized', (isMax) => {
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.classList.toggle('maximized', isMax);
    }
    const btnMax = document.getElementById('btn-max');
    if (btnMax) {
      btnMax.innerHTML = isMax ? '&#10064;' : '&#9633;';
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  });
}

// ── URL BAR ────────────────────────────────────────────────────────────────
function normalizeYouTubeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.match(/^(youtube\.com|www\.youtube\.com|youtu\.be)/)) {
    return 'https://' + trimmed;
  }
  if (trimmed.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return `https://www.youtube.com/watch?v=${trimmed}`;
  }
  // Treat as a YouTube search
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
}

function loadUrl(url) {
  if (!url) return;
  const normalized = normalizeYouTubeUrl(url);
  if (normalized) {
    webview.src = normalized;
    urlInput.value = normalized;
    switchTab('home');
  }
}

btnLoad.addEventListener('click', () => {
  loadUrl(urlInput.value);
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.suggestion-item.active');
    if (active && !urlSuggestions.classList.contains('hidden')) {
      urlInput.value = active.dataset.value;
      hideSuggestions();
    }
    loadUrl(urlInput.value);
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const items = [...document.querySelectorAll('.suggestion-item')];
    if (!items.length) return;
    e.preventDefault();
    const idx = items.findIndex(i => i.classList.contains('active'));
    items.forEach(i => i.classList.remove('active'));
    const next = e.key === 'ArrowDown'
      ? (idx + 1) % items.length
      : (idx - 1 + items.length) % items.length;
    items[next].classList.add('active');
    items[next].scrollIntoView({ block: 'nearest' });
  }
  if (e.key === 'Escape') hideSuggestions();
});

// ── Sugestões de busca do YouTube ───────────────────────────────────────────
const urlSuggestions = document.getElementById('url-suggestions');
let suggestionTimer = null;
let suggestionItems = [];

function hideSuggestions() {
  urlSuggestions.classList.add('hidden');
  urlSuggestions.innerHTML = '';
  suggestionItems = [];
}

function showSuggestions(items) {
  suggestionItems = items;
  urlSuggestions.innerHTML = '';
  if (!items.length) { hideSuggestions(); return; }
  items.forEach(s => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.dataset.value = s;
    div.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span></span>`;
    div.querySelector('span').textContent = s;
    div.addEventListener('mousedown', (e) => {
      e.preventDefault();
      urlInput.value = s;
      hideSuggestions();
      loadUrl(s);
    });
    urlSuggestions.appendChild(div);
  });
  urlSuggestions.classList.remove('hidden');
}

urlInput.addEventListener('input', () => {
  clearTimeout(suggestionTimer);
  const q = urlInput.value.trim();
  // Não sugere se parecer URL completa
  if (!q || /^https?:\/\//i.test(q) || q.includes('youtube.com') || q.includes('youtu.be')) {
    hideSuggestions();
    return;
  }
  suggestionTimer = setTimeout(async () => {
    try {
      const items = await api.getSuggestions(q);
      if (urlInput.value.trim() === q) showSuggestions(items);
    } catch { /* ignore */ }
  }, 300);
});

document.addEventListener('click', (e) => {
  if (!urlSuggestions.contains(e.target) && e.target !== urlInput) hideSuggestions();
});

// ── Filtro cosmético de anúncios + botão Baixar flutuante ──────────────────
// Esconde containers de ad no DOM e injeta botão "Baixar" em páginas com vídeo.
const COSMETIC_AD_CSS = `
  ytd-display-ad-renderer, ytd-compact-promoted-video-renderer,
  ytd-promoted-sparkles-web-renderer, #player-ads, .ytp-ad-module,
  .video-ads, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer,
  .ytd-watch-flexy #below #related ytd-display-ad-renderer,
  [id^="ad-"], [class*="ad-slot"], [class*="adsbygoogle"],
  ins.adsbygoogle, div[id^="google_ads"], iframe[id^="aswift"],
  .adsbox, .ad-banner, .ad-container, .advertisement,
  [data-google-query-id]:not(video), ytd-merch-shelf-renderer
  { display: none !important; visibility: hidden !important; height: 0 !important; }
  .ytp-ad-overlay-container, .ytp-ad-text-overlay { display: none !important; }
`;

function injectWebviewEnhancements(wv) {
  if (!wv) return;
  const inject = () => {
    try { wv.insertCSS(COSMETIC_AD_CSS); } catch (e) {}
  };
  wv.addEventListener('dom-ready', inject);
  wv.addEventListener('did-navigate', inject);
}

injectWebviewEnhancements(webview);
injectWebviewEnhancements(musicPlayer);

// ── KEYBOARD SHORTCUTS ──────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Ctrl+D para abrir download rápido
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    openQuickDownloadModal();
  }

  // Ctrl+K para focar na barra de URL
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    urlInput.focus();
  }
});

// ── NAVIGATION CONTROLS ────────────────────────────────────────────────────
if (btnNavBack) {
  btnNavBack.addEventListener('click', () => {
    try {
      if (webview.canGoBack && webview.canGoBack()) webview.goBack();
    } catch (e) {}
  });
}

if (btnNavForward) {
  btnNavForward.addEventListener('click', () => {
    try {
      if (webview.canGoForward && webview.canGoForward()) webview.goForward();
    } catch (e) {}
  });
}

if (btnNavReload) {
  btnNavReload.addEventListener('click', () => {
    try {
      webview.reload();
    } catch (e) {}
  });
}

if (btnNavHome) {
  btnNavHome.addEventListener('click', () => {
    loadUrl('https://www.youtube.com');
  });
}

if (btnToggleTheater) {
  btnToggleTheater.addEventListener('click', () => {
    if (tabHome) {
      tabHome.classList.toggle('theater-mode');
      // Forçar atualização de layout do webview para preencher 100%
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 250);
    }
  });
}

// ── RESPONSIVE RESIZE SYNC ──────────────────────────────────────────────────
window.addEventListener('resize', () => {
  // Garante que o webview recalcule seu viewport com precisão imediata
  if (webview) {
    webview.style.width = '100%';
    webview.style.height = '100%';
  }
});

// ── WEBVIEW EVENTS ─────────────────────────────────────────────────────────
webview.addEventListener('did-start-loading', () => {
  webviewLoading.classList.remove('hidden');
});

webview.addEventListener('did-stop-loading', () => {
  webviewLoading.classList.add('hidden');
  try {
    const wvUrl = webview.getURL();
    if (wvUrl && wvUrl !== urlInput.value) {
      urlInput.value = wvUrl;
    }
    // Update "Now Playing" if it's a watch URL
    if (wvUrl && wvUrl.includes('watch?v=')) {
      webview.getTitle().then && webview.getTitle && updateNowPlaying(webview.getTitle());
    }
  } catch (err) {}
});

webview.addEventListener('did-navigate', (e) => {
  if (e.url && e.url !== urlInput.value) {
    urlInput.value = e.url;
  }
});

webview.addEventListener('did-navigate-in-page', (e) => {
  if (e.url && e.url !== urlInput.value) {
    urlInput.value = e.url;
  }
});

webview.addEventListener('page-title-updated', (e) => {
  if (e.title) updateNowPlaying(e.title);
});


function updateNowPlaying(title) {
  if (!title) return;
  const nowPlaying = document.getElementById('now-playing');
  const npTitle    = document.getElementById('np-title');
  if (title !== 'YouTube') {
    nowPlaying.classList.remove('hidden');
    npTitle.textContent = title;
    document.title = `TurboDown — ${title}`;
  } else {
    nowPlaying.classList.add('hidden');
    document.title = 'TurboDown';
  }
}

// ── QUICK DOWNLOAD MODAL ───────────────────────────────────────────────────
btnDownloadQ.addEventListener('click', openQuickDownloadModal);

function openQuickDownloadModal() {
  const url = urlInput.value.trim() || webview.src || '';
  modalFormat.value = dlFormat.value;
  modalUrl.textContent = url || 'Nenhuma URL carregada';
  modalDownload.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');
}

function closeModal() {
  modalDownload.classList.add('hidden');
  if (modalPlaylist) modalPlaylist.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
}

modalClosBtn.addEventListener('click',   closeModal);
modalCancelBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click',  closeModal);

if (modalPlaylistCloseBtn)  modalPlaylistCloseBtn.addEventListener('click', closeModal);
if (modalPlaylistCancelBtn) modalPlaylistCancelBtn.addEventListener('click', closeModal);

// ── PLAYLIST MODAL HANDLING ────────────────────────────────────────────────
let pendingPlaylistUrl = '';

function resolveDownloadFormat(format) {
  if (format === 'default-audio') return downloadPreferences.audioFormat;
  if (format === 'default-video') return downloadPreferences.videoFormat;
  return format;
}

function openPlaylistModal(url, format, title = 'Playlist do YouTube', count = null) {
  pendingPlaylistUrl = url;
  if (modalPlaylistFormat) modalPlaylistFormat.value = resolveDownloadFormat(format || 'default-video');
  if (playlistTitleText) playlistTitleText.textContent = title;
  if (playlistCountBadge) {
    if (count) {
      playlistCountBadge.textContent = `📋 Total: ${count} vídeos / músicas`;
      playlistCountBadge.style.color = '#00f0ff';
    } else {
      playlistCountBadge.textContent = '🔍 Analisando quantidade de itens...';
    }
  }

  modalDownload.classList.add('hidden');
  modalPlaylist.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');

  // Se a contagem ainda não veio, inspecionar de forma assíncrona
  if (!count && api && api.inspectPlaylist) {
    api.inspectPlaylist(url).then((res) => {
      if (res && res.isPlaylist) {
        if (playlistTitleText) playlistTitleText.textContent = res.title;
        if (playlistCountBadge) {
          playlistCountBadge.textContent = `📋 Total: ${res.count} vídeos / músicas`;
          playlistCountBadge.style.color = '#00f0ff';
        }
      } else {
        if (playlistCountBadge) {
          playlistCountBadge.textContent = '📋 Playlist pronta para download';
        }
      }
    }).catch(() => {});
  }
}

if (modalPlaylistAllBtn) {
  modalPlaylistAllBtn.addEventListener('click', async () => {
    const url = pendingPlaylistUrl;
    const format = modalPlaylistFormat.value;
    const title = playlistTitleText.textContent;
    closeModal();
    if (url) {
      switchTab('downloads');
      await startDownload(url, format, true, title);
    }
  });
}

if (modalPlaylistSingleBtn) {
  modalPlaylistSingleBtn.addEventListener('click', async () => {
    const url = pendingPlaylistUrl;
    const format = modalPlaylistFormat.value;
    closeModal();
    if (url) {
      switchTab('downloads');
      await startDownload(url, format, false);
    }
  });
}

// ── QUICK DOWNLOAD TRIGGER ─────────────────────────────────────────────────
modalDlBtn.addEventListener('click', async () => {
  const url    = urlInput.value.trim() || webview.src || '';
  const format = modalFormat.value;
  const subs = modalSubs ? modalSubs.checked : false;
  const thumbnail = modalThumbnail ? modalThumbnail.checked : false;
  const mp3Quality = modalMp3Quality ? modalMp3Quality.value : '320k';
  const speedLimit = modalSpeedLimit ? modalSpeedLimit.value : '';
  closeModal();
  if (url) {
    dlUrl.value    = url;
    dlFormat.value = format;
    await triggerDownloadCheck(url, format, subs, thumbnail, mp3Quality, speedLimit);
  }
});

// Mostrar/esconder opção de qualidade MP3
modalFormat.addEventListener('change', () => {
  if (mp3QualityRow) {
    mp3QualityRow.style.display = modalFormat.value === 'mp3' ? 'flex' : 'none';
  }
});

async function triggerDownloadCheck(url, format, subs = false, thumbnail = false, mp3Quality = '320k', speedLimit = '') {
  if (!url || !url.trim()) return;

  // Se contém parâmetro de playlist, avisar e perguntar antes!
  if (url.includes('list=') || url.includes('/playlist')) {
    openPlaylistModal(url, format);
  } else {
    switchTab('downloads');
    await startDownload(url, format, false, '', subs, thumbnail, mp3Quality, speedLimit);
  }
}

// ── DYNAMIC PERCENTAGE COLOR ENGINE ─────────────────────────────────────────
// A cada porcentagem, muda a cor, o gradiente e o brilho neon
function getProgressStyle(pct) {
  if (pct <= 0) {
    return {
      gradient: 'linear-gradient(90deg, #ff007f, #ff4081)',
      color: '#ff4081',
      glow: '0 0 10px rgba(255, 64, 129, 0.5)'
    };
  }

  if (pct <= 15) {
    // 0% a 15%: Rosa Choque / Pink Neon
    return {
      gradient: 'linear-gradient(90deg, #ff007f 0%, #ff2a85 100%)',
      color: '#ff2a85',
      glow: '0 0 12px rgba(255, 42, 133, 0.6)'
    };
  } else if (pct <= 30) {
    // 16% a 30%: Roxo Elétrico / Violeta Neon
    return {
      gradient: 'linear-gradient(90deg, #b829ea 0%, #7b2cbf 100%)',
      color: '#b829ea',
      glow: '0 0 12px rgba(184, 41, 234, 0.6)'
    };
  } else if (pct <= 45) {
    // 31% a 45%: Azul Royal / Índigo Neon
    return {
      gradient: 'linear-gradient(90deg, #3a86ff 0%, #4361ee 100%)',
      color: '#3a86ff',
      glow: '0 0 12px rgba(58, 134, 255, 0.6)'
    };
  } else if (pct <= 60) {
    // 46% a 60%: Ciano / Turquesa Brilhante
    return {
      gradient: 'linear-gradient(90deg, #00f0ff 0%, #00b4d8 100%)',
      color: '#00f0ff',
      glow: '0 0 14px rgba(0, 240, 255, 0.7)'
    };
  } else if (pct <= 75) {
    // 61% a 75%: Verde Esmeralda / Menta Neon
    return {
      gradient: 'linear-gradient(90deg, #06d6a0 0%, #10b981 100%)',
      color: '#06d6a0',
      glow: '0 0 12px rgba(6, 214, 160, 0.6)'
    };
  } else if (pct <= 90) {
    // 76% a 90%: Laranja Solar / Âmbar Dourado
    return {
      gradient: 'linear-gradient(90deg, #ffb703 0%, #fb8500 100%)',
      color: '#ffb703',
      glow: '0 0 12px rgba(255, 183, 3, 0.6)'
    };
  } else {
    // 91% a 100%: Dourado / Campeão Multicolor
    return {
      gradient: 'linear-gradient(90deg, #00f5a0 0%, #00d9f5 50%, #7928ca 100%)',
      color: '#00f5a0',
      glow: '0 0 16px rgba(0, 245, 160, 0.8)'
    };
  }
}

// ── AUDIO CHIME & WINDOWS NOTIFICATION ──────────────────────────────────────
function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // Acorde C5, E5, G5, C6 (Do-Mi-Sol-Do)
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
    });
  } catch (e) {}
}

function notifyDownloadComplete(title, isPlaylist = false) {
  playSuccessChime();
  try {
    if (window.Notification) {
      if (Notification.permission === 'granted') {
        new Notification('🎉 Download Concluído com Sucesso!', {
          body: isPlaylist
            ? `A playlist "${title}" foi salva em uma pasta exclusiva e está pronta!`
            : `O arquivo "${title}" terminou de baixar e está pronto na sua pasta!`,
          icon: '../assets/turbodown-logo.png'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') {
            new Notification('🎉 Download Concluído!', {
              body: `O download de "${title}" foi concluído!`,
              icon: '../assets/turbodown-logo.png'
            });
          }
        });
      }
    }
  } catch (e) {}
}

// Solicitar permissão de notificação silenciosamente
if (window.Notification && Notification.permission === 'default') {
  Notification.requestPermission().catch(() => {});
}

// ── DOWNLOAD SYSTEM ────────────────────────────────────────────────────────
function generateId() {
  return `dl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

async function startDownload(url, format, downloadPlaylist = true, playlistTitle = '', subs = false, thumbnail = false, mp3Quality = '320k', speedLimit = '') {
  if (!url || !url.trim()) {
    alert('Por favor, insira uma URL válida.');
    return;
  }

  format = resolveDownloadFormat(format || 'default-video');
  const id = generateId();
  const isPlaylist = downloadPlaylist && (url.includes('list=') || url.includes('/playlist'));

  const download = {
    id,
    url: url.trim(),
    format,
    isPlaylist,
    playlistTitle,
    subs,
    thumbnail,
    mp3Quality,
    speedLimit: speedLimit || null,
    status: 'pending',
    percent: 0,
    speed: '',
    eta: '',
    size: ''
  };

  downloads.set(id, download);
  renderDownloadCard(download);
  downloadQueue.push(id);
  updateDownloadCard(id, { status: 'pending', message: 'Aguardando na fila...' });
  updateBadge();
  processDownloadQueue();
}

async function processDownloadQueue() {
  if (queueProcessing) return;
  queueProcessing = true;
  try {
    while (downloadQueue.length) {
      const id = downloadQueue.shift();
      const download = downloads.get(id);
      if (!download || download.status !== 'pending') continue;

      updateDownloadCard(id, { status: 'downloading', message: 'Iniciando download...' });
      try {
        const result = await api.downloadMedia({
          url: download.url,
          format: download.format,
          outputPath: downloadPath,
          downloadId: id,
          downloadPlaylist: download.isPlaylist,
          subs: download.subs,
          thumbnail: download.thumbnail,
          mp3Quality: download.mp3Quality,
          speedLimit: download.speedLimit
        });
        if (result && result.paused) {
          updateDownloadCard(id, { status: 'paused', message: 'Download pausado. O progresso parcial foi mantido.' });
        } else if (result && result.cancelled) {
          updateDownloadCard(id, { status: 'cancelled' });
        } else if (result && result.success) {
          updateDownloadCard(id, { status: 'complete', targetFolder: result.folder, filePath: result.file });
          recordHistory({
            url: download.url,
            format: download.format,
            isPlaylist: download.isPlaylist,
            title: download.playlistTitle || download.url,
            filePath: result.file,
            targetFolder: result.folder
          });
        }
      } catch (error) {
        updateDownloadCard(id, { status: 'error', message: error.message });
      }
      updateBadge();
    }
  } finally {
    queueProcessing = false;
    updateBadge();
  }
}

btnStartDl.addEventListener('click', async () => {
  const url    = dlUrl.value.trim();
  const format = dlFormat.value;
  if (!url) {
    dlUrl.focus();
    return;
  }
  dlUrl.value = '';
  await triggerDownloadCheck(url, format);
});

dlUrl.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    btnStartDl.click();
  }
});

// ── DOWNLOAD PROGRESS EVENTS ───────────────────────────────────────────────
api.on('download-progress', (data) => {
  const { downloadId, percent, speed, eta, size, status, message, currentItem, totalItems, title } = data;
  updateDownloadCard(downloadId, {
    ...data,
    percent,
    speed,
    eta,
    size,
    status,
    message,
    currentItem,
    totalItems,
    title
  });

  if (status === 'complete') {
    const dl = downloads.get(downloadId);
    if (!dl || !dl.notifiedComplete) {
      const displayTitle = (dl && dl.playlistTitle) || title || 'Seu download';
      notifyDownloadComplete(displayTitle, dl ? dl.isPlaylist : false);
      if (dl) dl.notifiedComplete = true;
    }
  }
  updateBadge();
});

// ── RENDER DOWNLOAD CARD ───────────────────────────────────────────────────
function renderDownloadCard(dl) {
  dlEmptyState.classList.add('hidden');

  const card = document.createElement('div');
  card.className = 'dl-card';
  card.id = `card-${dl.id}`;

  const isAudio = ['mp3', 'm4a', 'opus'].includes(dl.format);
  const icon = dl.isPlaylist ? '📁' : getFormatIcon(dl.format);
  const typeBadge = dl.isPlaylist ? 'PLAYLIST' : dl.format.toUpperCase();

  // Pasta de destino prevista
  let folderCategory = 'Vídeos';
  if (dl.isPlaylist) {
    folderCategory = dl.playlistTitle ? `Playlists / ${dl.playlistTitle}` : 'Playlists';
  } else if (isAudio) {
    folderCategory = 'Músicas';
  }

  card.innerHTML = `
    <div class="dl-card-header">
      <span class="dl-card-icon">${icon}</span>
      <div class="dl-card-info">
        <div class="dl-card-url" id="title-text-${dl.id}" title="${escHtml(dl.url)}">
          ${dl.playlistTitle ? `📁 Playlist: ${escHtml(dl.playlistTitle)}` : escHtml(dl.url)}
        </div>
        <div style="display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap;">
          <span class="dl-card-format">${typeBadge}</span>
          <span class="dl-folder-badge" id="folder-badge-${dl.id}">📁 ${escHtml(folderCategory)}</span>
          <span id="item-counter-${dl.id}" class="dl-item-counter hidden"></span>
        </div>
      </div>
      <div class="dl-card-actions" id="actions-${dl.id}">
        <span class="dl-status-label pending" id="status-${dl.id}">Aguardando</span>
      </div>
    </div>
    <div class="dl-progress-wrap" id="progress-wrap-${dl.id}">
      <div class="dl-progress-bar">
        <div class="dl-progress-fill active" id="fill-${dl.id}" style="width:0%"></div>
      </div>
      <div class="dl-progress-stats">
        <span class="dl-percent" id="pct-${dl.id}">0%</span>
        <span id="speed-${dl.id}"></span>
        <span id="eta-${dl.id}"></span>
      </div>
    </div>
    <div class="dl-error-message hidden" id="error-${dl.id}" role="alert"></div>
  `;

  downloadList.prepend(card);
}

function updateDownloadCard(id, data) {
  const dl = downloads.get(id);
  if (!dl) return;

  Object.assign(dl, data);

  const statusEl      = document.getElementById(`status-${id}`);
  const fillEl        = document.getElementById(`fill-${id}`);
  const pctEl         = document.getElementById(`pct-${id}`);
  const speedEl       = document.getElementById(`speed-${id}`);
  const etaEl         = document.getElementById(`eta-${id}`);
  const cardEl        = document.getElementById(`card-${id}`);
  const actEl         = document.getElementById(`actions-${id}`);
  const counterEl     = document.getElementById(`item-counter-${id}`);
  const titleTxtEl    = document.getElementById(`title-text-${id}`);
  const folderBadgeEl = document.getElementById(`folder-badge-${id}`);
  const errorEl       = document.getElementById(`error-${id}`);

  if (!cardEl) return;

  if (data.targetFolder) dl.targetFolder = data.targetFolder;
  if (data.filePath) dl.filePath = data.filePath;
  if (data.message) dl.message = data.message;
  if (data.details) dl.errorDetails = data.details;

  // Atualizar título se detectado
  if (data.title && titleTxtEl && !dl.playlistTitle) {
    titleTxtEl.textContent = data.title;
  }

  // Atualizar badge de pasta se a pasta real foi detectada
  if (data.targetFolder && folderBadgeEl) {
    const parts = data.targetFolder.replace(/\\/g, '/').split('/');
    const lastSeg = parts.slice(-2).join('/');
    folderBadgeEl.textContent = `📁 ${lastSeg}`;
    folderBadgeEl.title = `Salvo em: ${data.targetFolder}`;
  }

  // Atualizar contador de playlist (ex: [Item 3 de 15])
  if (data.currentItem && data.totalItems && counterEl) {
    counterEl.textContent = `Item ${data.currentItem}/${data.totalItems}`;
    counterEl.classList.remove('hidden');
  }

  // ATUALIZAÇÃO DE CORES DINÂMICAS A CADA PORCENTAGEM
  if (data.percent !== undefined) {
    const pct = Math.min(100, Math.round(data.percent));
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (pctEl)  pctEl.textContent  = `${pct}%`;

    // Aplica o gradiente e a cor dinâmica correspondente a este porcento
    const style = getProgressStyle(pct);
    if (fillEl && (data.status === 'downloading' || !data.status)) {
      fillEl.style.background = style.gradient;
      fillEl.style.boxShadow = style.glow;
    }
    if (pctEl) {
      pctEl.style.color = style.color;
    }
  }

  if (data.speed !== undefined && speedEl) {
    speedEl.textContent = data.speed ? `⚡ ${data.speed}` : '';
  }

  if (data.eta !== undefined && etaEl) {
    etaEl.textContent = data.eta ? `⏱ ETA ${data.eta}` : '';
  }

  const status = data.status;
  if (status && statusEl) {
    const labels = {
      pending:     'Aguardando',
      downloading: 'Baixando',
      processing:  'Processando',
      pausing:     'Pausando...',
      paused:      'Pausado',
      complete:    '✅ Concluído',
      error:       '❌ Erro',
      cancelled:   '⚠️ Cancelado'
    };
    statusEl.textContent = labels[status] || status;
    statusEl.className = `dl-status-label ${status}`;
  }

  if (fillEl) {
    fillEl.classList.remove('active', 'complete', 'error', 'cancelled', 'paused');
    if (status === 'downloading' || status === 'processing') {
      fillEl.classList.add('active');
    } else if (status === 'complete') {
      fillEl.classList.add('complete');
      fillEl.style.width = '100%';
      fillEl.style.background = 'linear-gradient(90deg, #00f5a0, #00d9f5)';
      fillEl.style.boxShadow = '0 0 14px rgba(0, 245, 160, 0.7)';
      if (pctEl) {
        pctEl.textContent = '100%';
        pctEl.style.color = '#00f5a0';
      }
    } else if (status === 'error') {
      fillEl.classList.add('error');
    } else if (status === 'cancelled') {
      fillEl.classList.add('cancelled');
    } else if (status === 'paused') {
      fillEl.classList.add('paused');
    }
  }

  cardEl.className = `dl-card${status ? ` status-${status}` : ''}`;
  if (errorEl) {
    const showError = status === 'error' && !!dl.message;
    errorEl.classList.toggle('hidden', !showError);
    errorEl.textContent = showError ? dl.message : '';
    errorEl.title = dl.errorDetails || '';
  }

  if (actEl && statusEl) {
    actEl.replaceChildren(statusEl);
    const addAction = (label, className, handler, disabled = false) => {
      const button = document.createElement('button');
      button.className = `dl-action-btn${className ? ` ${className}` : ''}`;
      button.innerHTML = label;
      button.disabled = disabled;
      button.addEventListener('click', handler);
      actEl.appendChild(button);
    };

    if (status === 'pending') {
      addAction('<svg class="icon"><use href="#i-x"/></svg> Remover da fila', 'danger', () => cancelDownload(id));
    } else if (status === 'downloading' || status === 'processing') {
      addAction('<svg class="icon"><use href="#i-pause"/></svg> Pausar', '', () => pauseDownload(id));
      addAction('<svg class="icon"><use href="#i-x"/></svg> Cancelar', 'danger', () => cancelDownload(id));
    } else if (status === 'pausing') {
      addAction('<svg class="icon"><use href="#i-clock"/></svg> Pausando...', '', () => {}, true);
      addAction('<svg class="icon"><use href="#i-x"/></svg> Cancelar', 'danger', () => cancelDownload(id));
    } else if (status === 'paused') {
      addAction('<svg class="icon"><use href="#i-play"/></svg> Retomar', 'primary', () => resumeDownload(id));
      addAction('<svg class="icon"><use href="#i-x"/></svg> Cancelar', 'danger', () => cancelDownload(id));
    } else if (status === 'error') {
      addAction('<svg class="icon"><use href="#i-refresh"/></svg> Tentar novamente', 'primary', () => retryDownload(id));
      addAction('<svg class="icon"><use href="#i-trash"/></svg> Remover', '', () => removeDownloadCard(id));
    } else if (status === 'complete') {
      addAction('<svg class="icon"><use href="#i-folder-open"/></svg> Abrir Pasta', 'primary', () => {
        if (dl.filePath) {
          api.revealPath(dl.filePath).catch(() => api.openFolder(dl.targetFolder || downloadPath));
        } else {
          api.openFolder(dl.targetFolder || downloadPath).catch(err => alert(err.message));
        }
      });
      if (dl.filePath && !dl.isPlaylist) {
        addAction('<svg class="icon"><use href="#i-play"/></svg> Reproduzir', '', () => api.openFile(dl.filePath).catch(err => alert(err.message)));
      }
      addAction('<svg class="icon"><use href="#i-trash"/></svg> Remover', '', () => removeDownloadCard(id));
    } else if (status === 'cancelled') {
      addAction('<svg class="icon"><use href="#i-trash"/></svg> Remover', '', () => removeDownloadCard(id));
    }
  }

  if (speedEl && etaEl && ['complete', 'error', 'cancelled', 'paused'].includes(status)) {
    speedEl.textContent = '';
    etaEl.textContent   = '';
  }
}

function removeDownloadCard(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.style.opacity  = '0';
    card.style.transform = 'translateY(-10px)';
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => {
      card.remove();
      downloads.delete(id);
      if (downloads.size === 0) dlEmptyState.classList.remove('hidden');
    }, 300);
  }
}

// ── DOWNLOAD HISTORY ────────────────────────────────────────────────────────
const HISTORY_KEY = 'turbodown-download-history';
const HISTORY_MAX = 50;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
}

function recordHistory(entry) {
  const history = loadHistory().filter(h => h.url !== entry.url);
  history.unshift({ ...entry, date: Date.now() });
  saveHistory(history);
  renderHistory();
}

function formatHistoryDate(ts) {
  try {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function renderHistory() {
  if (!historyList || !downloadHistory) return;
  const history = loadHistory();
  if (!history.length) {
    downloadHistory.classList.add('hidden');
    return;
  }
  downloadHistory.classList.remove('hidden');
  historyList.replaceChildren();

  history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';

    const info = document.createElement('div');
    info.className = 'history-item-info';
    const title = document.createElement('div');
    title.className = 'history-item-title';
    title.textContent = item.title || item.url;
    title.title = item.url;
    const meta = document.createElement('div');
    meta.className = 'history-item-meta';
    meta.textContent = `${(item.format || '720p').toUpperCase()} · ${formatHistoryDate(item.date)}`;
    info.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'history-item-actions';

    const btnDl = document.createElement('button');
    btnDl.className = 'dl-action-btn primary';
    btnDl.innerHTML = '<svg class="icon"><use href="#i-download"/></svg> Baixar';
    btnDl.addEventListener('click', () => {
      switchTab('downloads');
      startDownload(item.url, item.format || '720p', item.isPlaylist !== false);
    });

    if (item.filePath) {
      const btnOpen = document.createElement('button');
      btnOpen.className = 'dl-action-btn';
      btnOpen.innerHTML = '<svg class="icon"><use href="#i-folder-open"/></svg>';
      btnOpen.title = 'Abrir pasta';
      btnOpen.addEventListener('click', () => api.revealPath(item.filePath).catch(() => api.openFolder(item.targetFolder || downloadPath)));
      actions.append(btnOpen);
    }
    actions.append(btnDl);

    row.append(info, actions);
    historyList.appendChild(row);
  });
}

if (btnClearHistory) {
  btnClearHistory.addEventListener('click', () => {
    saveHistory([]);
    renderHistory();
  });
}

function updateBadge() {
  const outstanding = Array.from(downloads.values())
    .filter(download => ['pending', 'downloading', 'processing', 'pausing', 'paused'].includes(download.status))
    .length;
  if (outstanding > 0) {
    dlBadge.classList.remove('hidden');
    dlBadge.textContent = outstanding;
  } else {
    dlBadge.classList.add('hidden');
  }
}

function pauseDownload(id) {
  const download = downloads.get(id);
  if (!download) return;
  if (download.status === 'pending') {
    const index = downloadQueue.indexOf(id);
    if (index >= 0) downloadQueue.splice(index, 1);
    updateDownloadCard(id, { status: 'paused', message: 'Aguardando retomada.' });
    updateBadge();
    return;
  }
  if (download.status !== 'downloading' && download.status !== 'processing') return;
  updateDownloadCard(id, { status: 'pausing', message: 'Salvando progresso para retomar...' });
  api.pauseDownload(id).then((accepted) => {
    if (!accepted && download.status === 'pausing') {
      updateDownloadCard(id, { status: 'downloading', message: 'Não foi possível pausar este download.' });
    }
  }).catch(error => {
    updateDownloadCard(id, { status: 'downloading', message: error.message });
  });
}

function resumeDownload(id) {
  const download = downloads.get(id);
  if (!download || download.status !== 'paused') return;
  download.message = '';
  downloadQueue.unshift(id);
  updateDownloadCard(id, { status: 'pending', message: 'Aguardando retomada...' });
  updateBadge();
  processDownloadQueue();
}

function retryDownload(id) {
  const download = downloads.get(id);
  if (!download || download.status !== 'error') return;
  download.message = '';
  download.errorDetails = '';
  download.percent = 0;
  downloadQueue.unshift(id);
  updateDownloadCard(id, { status: 'pending', percent: 0, message: 'Aguardando nova tentativa...' });
  updateBadge();
  processDownloadQueue();
}

function cancelDownload(id) {
  const download = downloads.get(id);
  if (!download) return;
  const index = downloadQueue.indexOf(id);
  if (index >= 0) downloadQueue.splice(index, 1);
  api.cancelDownload(id).catch(error => console.error('Falha ao cancelar download:', error));
  updateDownloadCard(id, { status: 'cancelled' });
  updateBadge();
}

function getFormatIcon(format) {
  const audioFormats = ['mp3', 'm4a', 'opus'];
  if (audioFormats.includes(format)) return '🎵';
  return '🎬';
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── DOWNLOAD PATH ──────────────────────────────────────────────────────────
async function loadDownloadPath() {
  downloadPath = await api.getDownloadPath();
  updatePathDisplay(downloadPath);
  await updateDownloadSpace();
}

function updatePathDisplay(p) {
  downloadPath = p;
  if (dlPathDisplay)      dlPathDisplay.textContent      = p;
  if (settingsDlPath)     settingsDlPath.textContent     = p;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Indisponível';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex > 1 ? 1 : 0)} ${units[unitIndex]}`;
}

async function updateDownloadSpace() {
  if (!dlSpaceDisplay) return;
  dlSpaceDisplay.textContent = 'Consultando espaço livre...';
  try {
    const space = await api.getDownloadSpace();
    dlSpaceDisplay.textContent = `Espaço livre: ${formatBytes(space.freeBytes)}`;
    dlSpaceDisplay.title = `Disponível em ${space.path} (${formatBytes(space.totalBytes)} no volume)`;
  } catch (error) {
    dlSpaceDisplay.textContent = 'Espaço livre indisponível';
    dlSpaceDisplay.title = error.message;
  }
}

btnChangePath.addEventListener('click', async () => {
  const newPath = await api.setDownloadPath();
  if (newPath) {
    updatePathDisplay(newPath);
    await updateDownloadSpace();
  }
});

btnRefreshSpace.addEventListener('click', updateDownloadSpace);

btnOpenFolder.addEventListener('click', () => {
  if (downloadPath) api.openFolder(downloadPath).catch(err => alert(err.message));
});

if (btnOpenVideos) {
  btnOpenVideos.addEventListener('click', () => {
    api.openCategoryFolder('videos', downloadPath).catch(err => alert(err.message));
  });
}

if (btnOpenMusicas) {
  btnOpenMusicas.addEventListener('click', () => {
    api.openCategoryFolder('musicas', downloadPath).catch(err => alert(err.message));
  });
}

if (btnOpenPlaylists) {
  btnOpenPlaylists.addEventListener('click', () => {
    api.openCategoryFolder('playlists', downloadPath).catch(err => alert(err.message));
  });
}

btnSettingsChPath.addEventListener('click', async () => {
  const newPath = await api.setDownloadPath();
  if (newPath) {
    updatePathDisplay(newPath);
    await updateDownloadSpace();
  }
});

async function checkDownloadTools() {
  toolYtDlpStatus.textContent = 'Verificando...';
  toolFfmpegStatus.textContent = 'Verificando...';
  try {
    const tools = await api.checkDownloadTools();
    const ffmpegPath = await api.getFfmpegPath();
    const ytDlpPath = await api.getYtDlpPath();

    toolYtDlpStatus.textContent = tools.ytDlp.installed
      ? `Instalado — ${tools.ytDlp.version}${ytDlpPath.includes('resources') ? ' (embutido)' : ''}`
      : `Não encontrado — ${tools.ytDlp.error || 'verifique a instalação'}`;
    toolFfmpegStatus.textContent = tools.ffmpeg.installed
      ? `Instalado — ${tools.ffmpeg.version}${ffmpegPath.includes('resources') ? ' (embutido)' : ''}`
      : `Não encontrado — ${tools.ffmpeg.error || 'instale FFmpeg'}`;

    // Desabilitar botão de atualizar yt-dlp se o binário está embutido no instalador
    if (ytDlpPath.includes('resources')) {
      btnUpdateYtDlp.disabled = true;
      btnUpdateYtDlp.title = 'O yt-dlp é fornecido pelo instalador. Atualize o app para obter versões mais recentes.';
    }
  } catch (error) {
    toolYtDlpStatus.textContent = `Falha ao verificar: ${error.message}`;
    toolFfmpegStatus.textContent = 'Verificação não concluída';
  }
}

btnCheckTools.addEventListener('click', checkDownloadTools);

const btnOpenLogs = document.getElementById('btn-open-logs');
if (btnOpenLogs) {
  btnOpenLogs.addEventListener('click', () => {
    api.openLogsFolder().catch(err => alert(err.message));
  });
}

// Logs recentes na UI
const recentLogsEl = document.getElementById('recent-logs');
if (recentLogsEl) {
  api.getRecentLogs().then(logs => {
    if (!logs.length) {
      recentLogsEl.innerHTML = '<p class="schedule-empty">Nenhum log ainda</p>';
      return;
    }
    recentLogsEl.innerHTML = logs.map(l => `
      <details class="log-item">
        <summary>${l.name} <small>(${l.date})</small></summary>
        <pre>${l.preview.replace(/</g, '&lt;')}</pre>
      </details>`).join('');
  }).catch(() => {});
}

btnUpdateYtDlp.addEventListener('click', async () => {
  btnUpdateYtDlp.disabled = true;
  toolYtDlpStatus.textContent = 'Atualizando yt-dlp...';
  try {
    const result = await api.updateYtDlp();
    if (!result.installed) throw new Error(result.error || 'yt-dlp não encontrado.');
    toolYtDlpStatus.textContent = `Atualizado — ${result.version}`;
  } catch (error) {
    toolYtDlpStatus.textContent = `Falha ao atualizar: ${error.message}`;
  } finally {
    btnUpdateYtDlp.disabled = false;
  }
});

function applyAppUpdateStatus(update) {
  if (!update) return;
  const versionPrefix = update.version ? `v${update.version} — ` : '';
  appVersionStatus.textContent = `${versionPrefix}${update.message || update.status}`;
  appVersionStatus.title = update.error || '';
  const hasUpdate = ['available', 'downloading', 'downloaded'].includes(update.status);
  appUpdateBadge.classList.toggle('hidden', !hasUpdate);
  btnInstallAppUpdate.classList.toggle('hidden', update.status !== 'downloaded');
  if (update.status === 'error') {
    maintenanceMessage.textContent = update.error
      ? `${update.message} Detalhes: ${update.error}`
      : update.message;
  } else if (update.status === 'downloaded') {
    maintenanceMessage.textContent = 'A atualização foi baixada. Salve seu trabalho e reinicie para instalar.';
  }
}

api.on('app-update-status', applyAppUpdateStatus);

btnCheckAppUpdate.addEventListener('click', async () => {
  btnCheckAppUpdate.disabled = true;
  applyAppUpdateStatus({ status: 'checking', message: 'Verificando atualizações...' });
  try {
    applyAppUpdateStatus(await api.checkAppUpdate());
  } catch (error) {
    applyAppUpdateStatus({
      status: 'error',
      message: 'Não foi possível verificar atualizações.',
      error: error.message
    });
  } finally {
    btnCheckAppUpdate.disabled = false;
  }
});

btnInstallAppUpdate.addEventListener('click', async () => {
  btnInstallAppUpdate.disabled = true;
  try {
    await api.installAppUpdate();
  } catch (error) {
    maintenanceMessage.textContent = `Falha ao instalar atualização: ${error.message}`;
    btnInstallAppUpdate.disabled = false;
  }
});

// ── SETTINGS ───────────────────────────────────────────────────────────────
// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;

    // Keep background image if any
    const bgImg = currentTheme.backgroundImage;
    const merged = { ...preset };
    if (bgImg) merged.backgroundImage = bgImg;

    currentTheme = merged;
    applyTheme(currentTheme);
    populateSettingsForm(currentTheme);

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Color inputs
setAccent.addEventListener('input', () => {
  accentLabel.textContent = setAccent.value;
  document.documentElement.style.setProperty('--accent', setAccent.value);
  document.documentElement.style.setProperty('--accent-hover', lightenColor(setAccent.value, 20));
  document.documentElement.style.setProperty('--accent-dim', hexToRgba(setAccent.value, 0.2));
});

setBgColor.addEventListener('input', () => {
  bgcolorLabel.textContent = setBgColor.value;
  if (!setGradEnabled.checked) {
    document.body.style.background = setBgColor.value;
  }
});

setGradEnabled.addEventListener('change', () => {
  if (setGradEnabled.checked) {
    const c1 = setGradC1.value;
    const c2 = setGradC2.value;
    const a  = setGradAngle.value;
    document.body.style.background = `linear-gradient(${a}deg, ${c1} 0%, ${c2} 100%)`;
  } else {
    document.body.style.background = setBgColor.value;
  }
});

setGradAngle.addEventListener('input', () => {
  angleVal.textContent = `${setGradAngle.value}°`;
  if (setGradEnabled.checked) {
    document.body.style.background = `linear-gradient(${setGradAngle.value}deg, ${setGradC1.value} 0%, ${setGradC2.value} 100%)`;
  }
});

setGradC1.addEventListener('input', () => {
  gradc1Label.textContent = setGradC1.value;
  if (setGradEnabled.checked) {
    document.body.style.background = `linear-gradient(${setGradAngle.value}deg, ${setGradC1.value} 0%, ${setGradC2.value} 100%)`;
  }
});

setGradC2.addEventListener('input', () => {
  gradc2Label.textContent = setGradC2.value;
  if (setGradEnabled.checked) {
    document.body.style.background = `linear-gradient(${setGradAngle.value}deg, ${setGradC1.value} 0%, ${setGradC2.value} 100%)`;
  }
});

setBlur.addEventListener('input', () => {
  blurVal.textContent = `${setBlur.value}px`;
  document.documentElement.style.setProperty('--glass-blur', `${setBlur.value}px`);
});

setOpacity.addEventListener('input', () => {
  opacityVal.textContent = `${setOpacity.value}%`;
  document.documentElement.style.setProperty('--glass-opacity', (parseInt(setOpacity.value) / 100).toFixed(2));
});

// Background image
btnPickBg.addEventListener('click', async () => {
  const imgPath = await api.selectBackgroundImage();
  if (imgPath) {
    currentTheme.backgroundImage = imgPath;
    showBgPreview(imgPath);
    document.body.style.backgroundImage = `url('${imgPath.replace(/\\/g, '/')}')`;
    document.body.style.backgroundSize  = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.classList.add('has-bg-image');
  }
});

btnClearBg.addEventListener('click', () => {
  currentTheme.backgroundImage = null;
  bgPreviewImg.classList.add('hidden');
  bgPreviewImg.src = '';
  bgPreviewText.classList.remove('hidden');
  document.body.style.backgroundImage = '';
  document.body.classList.remove('has-bg-image');
  // Re-apply gradient
  if (setGradEnabled.checked) {
    document.body.style.background = `linear-gradient(${setGradAngle.value}deg, ${setGradC1.value} 0%, ${setGradC2.value} 100%)`;
  } else {
    document.body.style.background = setBgColor.value;
  }
});

function showBgPreview(imgPath) {
  bgPreviewImg.src = imgPath.replace(/\\/g, '/');
  bgPreviewImg.classList.remove('hidden');
  bgPreviewText.classList.add('hidden');
}

// Save theme
btnSaveTheme.addEventListener('click', async () => {
  await saveTheme();
  downloadPreferences = await api.saveDownloadPreferences({
    videoFormat: setDefaultVideoFormat.value,
    audioFormat: setDefaultAudioFormat.value
  });
  dlFormat.value = 'default-video';
  modalFormat.value = 'default-video';

  saveStatus.classList.remove('hidden');
  setTimeout(() => saveStatus.classList.add('hidden'), 2500);
});

// Custom User-Agent
setCustomUserAgent.addEventListener('change', async () => {
  await api.setCustomUserAgent(setCustomUserAgent.value.trim());
});

// Opções avançadas de download
const saveAdvancedOptions = () => api.saveDownloadAdvanced({
  speedLimit: setSpeedLimit.value,
  proxyUrl: setProxy.value.trim(),
  cookiesFromBrowser: setCookiesBrowser.value
});
setSpeedLimit.addEventListener('change', saveAdvancedOptions);
setCookiesBrowser.addEventListener('change', saveAdvancedOptions);
setProxy.addEventListener('change', saveAdvancedOptions);

// Discord Rich Presence
const saveDiscordSettings = async () => {
  discordPresenceEnabled = setDiscordEnabled.checked;
  await api.saveDiscordSettings({
    enabled: discordPresenceEnabled,
    clientId: setDiscordClientId.value.trim()
  });
};
setDiscordEnabled.addEventListener('change', saveDiscordSettings);
setDiscordClientId.addEventListener('change', saveDiscordSettings);

// Ad blocker
setAdblockEnabled.addEventListener('change', async () => {
  await api.setAdblock(setAdblockEnabled.checked);
});

// Backup de configurações
if (btnExportSettings) {
  btnExportSettings.addEventListener('click', async () => {
    try {
      const file = await api.exportSettings();
      if (file) alert(`Configurações exportadas para:\n${file}`);
    } catch (error) {
      alert(`Falha ao exportar: ${error.message}`);
    }
  });
}

if (btnImportSettings) {
  btnImportSettings.addEventListener('click', async () => {
    try {
      const result = await api.importSettings();
      if (result) {
        alert(`Configurações importadas (${result.applied.length} itens). Reinicie o app para aplicar tudo.`);
        await loadTheme();
        await loadDownloadPath();
      }
    } catch (error) {
      alert(`Falha ao importar: ${error.message}`);
    }
  });
}

const GOOGLE_HOME_URL = 'https://www.google.com/';
const GOOGLE_HISTORY_KEY = 'turbodown-google-history';
const GOOGLE_BOOKMARKS_KEY = 'turbodown-google-bookmarks';

function loadBrowserList(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(stored)
      ? stored.filter(entry => entry && typeof entry.url === 'string')
      : [];
  } catch (error) {
    console.warn(`Não foi possível ler ${key}:`, error);
    return [];
  }
}

function saveBrowserList(key, entries) {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch (error) {
    console.error(`Não foi possível salvar ${key}:`, error);
  }
}

function getGoogleTabUrl(tab) {
  try {
    return tab.webview.getURL() || tab.url || GOOGLE_HOME_URL;
  } catch {
    return tab.url || GOOGLE_HOME_URL;
  }
}

function recordGoogleHistory(tab, url, title) {
  if (tab.isPrivate) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return;

  const entry = {
    url: parsed.href,
    title: title || parsed.hostname,
    visitedAt: Date.now()
  };
  if (googleHistory[0] && googleHistory[0].url === entry.url) {
    googleHistory[0] = entry;
  } else {
    googleHistory = [entry, ...googleHistory.filter(item => item.url !== entry.url)].slice(0, 300);
  }
  saveBrowserList(GOOGLE_HISTORY_KEY, googleHistory);
  if (googleLibraryMode === 'history') renderGoogleLibrary();
}

function renderGoogleTabs() {
  googleTabsContainer.replaceChildren();
  googleTabOrder.forEach((id) => {
    const tab = googleTabs.get(id);
    if (!tab) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `google-tab${id === activeGoogleTabId ? ' active' : ''}${tab.isPrivate ? ' private' : ''}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(id === activeGoogleTabId));
    button.title = tab.title;

    const label = document.createElement('span');
    label.className = 'google-tab-title';
    label.textContent = `${tab.isPrivate ? '🕶 ' : ''}${tab.title || 'Nova guia'}`;
    button.appendChild(label);

    const close = document.createElement('span');
    close.className = 'google-tab-close';
    close.setAttribute('role', 'button');
    close.setAttribute('aria-label', `Fechar ${tab.title || 'aba'}`);
    close.textContent = '×';
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      closeGoogleTab(id);
    });
    button.appendChild(close);
    button.addEventListener('click', () => selectGoogleTab(id));
    googleTabsContainer.appendChild(button);
  });
}

function setGoogleTabUrl(tab, url, title) {
  if (!tab) return;
  tab.url = url;
  if (title) tab.title = title;
  if (activeGoogleTabId === tab.id) {
    googleUrlInput.value = url;
    googleLoading.querySelector('span').textContent = `Carregando ${tab.title || 'página'}...`;
    updateGoogleBookmarkButton();
  }
  renderGoogleTabs();
}

function selectGoogleTab(id) {
  const tab = googleTabs.get(id);
  if (!tab) return;
  activeGoogleTabId = id;
  activeGoogleWebview = tab.webview;
  googleTabs.forEach((item, tabId) => {
    item.webview.classList.toggle('active', tabId === id);
  });
  document.getElementById('tab-google').classList.toggle('private-mode', tab.isPrivate);
  googleUrlInput.value = getGoogleTabUrl(tab);
  googleLoading.classList.add('hidden');
  renderGoogleTabs();
  updateGoogleBookmarkButton();
}

function attachGoogleTabEvents(tab) {
  const webview = tab.webview;
  webview.addEventListener('did-start-loading', () => {
    if (activeGoogleTabId === tab.id) {
      googleLoading.querySelector('span').textContent = `Carregando ${tab.title || 'página'}...`;
      googleLoading.classList.remove('hidden');
    }
  });
  webview.addEventListener('did-stop-loading', () => {
    const url = getGoogleTabUrl(tab);
    if (activeGoogleTabId === tab.id) {
      googleLoading.classList.add('hidden');
      googleUrlInput.value = url;
    }
  });
  webview.addEventListener('did-navigate', (event) => {
    if (!event.isMainFrame && event.isMainFrame !== undefined) return;
    setGoogleTabUrl(tab, event.url, tab.title);
    recordGoogleHistory(tab, event.url, tab.title);
  });
  webview.addEventListener('did-navigate-in-page', (event) => {
    if (!event.isMainFrame) return;
    setGoogleTabUrl(tab, event.url, tab.title);
    recordGoogleHistory(tab, event.url, tab.title);
  });
  webview.addEventListener('page-title-updated', (event) => {
    let fallbackTitle = 'Página';
    try {
      fallbackTitle = new URL(tab.url || GOOGLE_HOME_URL).hostname;
    } catch (error) {
      console.warn('URL da aba Google inválida:', error);
    }
    tab.title = event.title || fallbackTitle;
    renderGoogleTabs();
    recordGoogleHistory(tab, getGoogleTabUrl(tab), tab.title);
  });
  webview.addEventListener('did-fail-load', (event) => {
    if (event.isMainFrame && event.errorCode !== -3 && activeGoogleTabId === tab.id) {
      googleLoading.classList.add('hidden');
    }
  });
}

function createGoogleTab(isPrivate = false, initialUrl = GOOGLE_HOME_URL) {
  const id = `google-tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const webview = document.createElement('webview');
  webview.className = 'google-webview';
  webview.setAttribute('partition', isPrivate ? 'google-private' : 'persist:google');
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'contextIsolation=false');

  const tab = {
    id,
    title: isPrivate ? 'Aba privada' : 'Nova guia',
    url: initialUrl,
    isPrivate,
    webview
  };
  googleTabs.set(id, tab);
  googleTabOrder.push(id);
  attachGoogleTabEvents(tab);
  googleWebviews.appendChild(webview);
  renderGoogleTabs();
  selectGoogleTab(id);
  webview.src = initialUrl;
  return tab;
}

function closeGoogleTab(id) {
  const tab = googleTabs.get(id);
  if (!tab) return;
  const wasActive = activeGoogleTabId === id;
  const hadPrivateTab = tab.isPrivate;
  const closedIndex = googleTabOrder.indexOf(id);
  tab.webview.remove();
  googleTabs.delete(id);
  googleTabOrder = googleTabOrder.filter(tabId => tabId !== id);

  const hasPrivateTabs = [...googleTabs.values()].some(item => item.isPrivate);
  if (hadPrivateTab && !hasPrivateTabs) {
    api.clearGooglePrivateData().catch(error => {
      console.error('Não foi possível limpar os dados da sessão privada:', error);
    });
  }

  if (googleTabs.size === 0) {
    createGoogleTab(false);
  } else if (wasActive) {
    selectGoogleTab(googleTabOrder[Math.min(closedIndex, googleTabOrder.length - 1)]);
  } else {
    renderGoogleTabs();
  }
}

function loadGoogleUrl(input) {
  let targetUrl;
  try {
    targetUrl = api.resolveNavigationTarget(input);
  } catch (error) {
    googleUrlInput.setCustomValidity(error.message);
    googleUrlInput.reportValidity();
    googleUrlInput.addEventListener('input', () => googleUrlInput.setCustomValidity(''), { once: true });
    return;
  }
  let tab = googleTabs.get(activeGoogleTabId);
  if (!tab) tab = createGoogleTab(false, targetUrl);
  tab.url = targetUrl;
  tab.webview.src = targetUrl;
  googleUrlInput.value = targetUrl;
}

function renderGoogleLibrary() {
  const entries = googleLibraryMode === 'history' ? googleHistory : googleBookmarks;
  googleLibraryTitle.textContent = googleLibraryMode === 'history' ? 'Histórico' : 'Favoritos';
  btnGoogleClearHistory.classList.toggle('hidden', googleLibraryMode !== 'history');
  googleLibraryList.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'google-library-empty';
    empty.textContent = googleLibraryMode === 'history' ? 'O histórico está vazio.' : 'Nenhum favorito salvo ainda.';
    googleLibraryList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'google-library-item';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'google-library-open';
    const title = document.createElement('strong');
    title.textContent = entry.title || entry.url;
    const url = document.createElement('span');
    url.textContent = entry.url;
    open.append(title, url);
    open.addEventListener('click', () => {
      googleLibraryPanel.classList.add('hidden');
      loadGoogleUrl(entry.url);
    });
    row.appendChild(open);

    if (googleLibraryMode === 'bookmarks') {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'google-library-remove';
      remove.title = 'Remover favorito';
      remove.setAttribute('aria-label', `Remover ${entry.title || entry.url} dos favoritos`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        googleBookmarks = googleBookmarks.filter(item => item.url !== entry.url);
        saveBrowserList(GOOGLE_BOOKMARKS_KEY, googleBookmarks);
        renderGoogleLibrary();
        updateGoogleBookmarkButton();
      });
      row.appendChild(remove);
    }
    googleLibraryList.appendChild(row);
  });
}

function toggleGoogleLibrary(mode) {
  if (googleLibraryMode === mode && !googleLibraryPanel.classList.contains('hidden')) {
    googleLibraryPanel.classList.add('hidden');
    return;
  }
  googleLibraryMode = mode;
  renderGoogleLibrary();
  googleLibraryPanel.classList.remove('hidden');
}

function updateGoogleBookmarkButton() {
  const tab = googleTabs.get(activeGoogleTabId);
  const url = tab ? getGoogleTabUrl(tab) : '';
  const saved = googleBookmarks.some(entry => entry.url === url);
  btnGoogleBookmark.textContent = saved ? '★' : '☆';
  btnGoogleBookmark.title = saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  btnGoogleBookmark.setAttribute('aria-label', btnGoogleBookmark.title);
}

function toggleGoogleBookmark() {
  const tab = googleTabs.get(activeGoogleTabId);
  if (!tab) return;
  const url = getGoogleTabUrl(tab);
  if (!/^https?:/i.test(url)) return;
  const existing = googleBookmarks.find(entry => entry.url === url);
  if (existing) {
    googleBookmarks = googleBookmarks.filter(entry => entry.url !== url);
  } else {
    googleBookmarks.unshift({ url, title: tab.title || new URL(url).hostname, savedAt: Date.now() });
  }
  saveBrowserList(GOOGLE_BOOKMARKS_KEY, googleBookmarks);
  updateGoogleBookmarkButton();
  if (googleLibraryMode === 'bookmarks' && !googleLibraryPanel.classList.contains('hidden')) {
    renderGoogleLibrary();
  }
}

function applyGoogleShieldStatus(status) {
  if (!status) return;
  googleShieldsEnabled = status.enabled;
  googleShieldsCount.textContent = String(status.blockedCount || 0);
  btnGoogleShields.classList.toggle('shields-enabled', googleShieldsEnabled);
  btnGoogleShields.classList.toggle('shields-disabled', !googleShieldsEnabled);
  btnGoogleShields.setAttribute('aria-pressed', String(googleShieldsEnabled));
  btnGoogleShields.querySelector('span').textContent = googleShieldsEnabled ? 'Ativo' : 'Desativado';
}

btnGoogleSearch.addEventListener('click', () => loadGoogleUrl(googleUrlInput.value));
googleUrlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loadGoogleUrl(googleUrlInput.value);
});
btnGoogleBack.addEventListener('click', () => {
  if (activeGoogleWebview && activeGoogleWebview.canGoBack()) activeGoogleWebview.goBack();
});
btnGoogleForward.addEventListener('click', () => {
  if (activeGoogleWebview && activeGoogleWebview.canGoForward()) activeGoogleWebview.goForward();
});
btnGoogleReload.addEventListener('click', () => {
  if (activeGoogleWebview) activeGoogleWebview.reload();
});
btnGoogleHome.addEventListener('click', () => loadGoogleUrl(GOOGLE_HOME_URL));
btnGoogleNewTab.addEventListener('click', () => {
  createGoogleTab(false);
  googleUrlInput.focus();
  googleUrlInput.select();
});
btnGoogleNewPrivateTab.addEventListener('click', () => {
  createGoogleTab(true);
  googleUrlInput.focus();
  googleUrlInput.select();
});
btnGoogleBookmark.addEventListener('click', toggleGoogleBookmark);
btnGoogleBookmarks.addEventListener('click', () => toggleGoogleLibrary('bookmarks'));
btnGoogleHistory.addEventListener('click', () => toggleGoogleLibrary('history'));
btnGoogleCloseLibrary.addEventListener('click', () => googleLibraryPanel.classList.add('hidden'));
btnGoogleClearHistory.addEventListener('click', () => {
  googleHistory = [];
  saveBrowserList(GOOGLE_HISTORY_KEY, googleHistory);
  renderGoogleLibrary();
});
btnGoogleShields.addEventListener('click', async () => {
  btnGoogleShields.disabled = true;
  try {
    applyGoogleShieldStatus(await api.setGoogleShields(!googleShieldsEnabled));
  } catch (error) {
    console.error('Não foi possível alterar a proteção de navegação:', error);
  } finally {
    btnGoogleShields.disabled = false;
  }
});
api.on('google-shield-status', applyGoogleShieldStatus);

document.querySelectorAll('.pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.url) loadGoogleUrl(btn.dataset.url);
    else if (btn.dataset.query) loadGoogleUrl(btn.dataset.query);
  });
});

function loadSocialPage(button) {
  const url = button.dataset.socialUrl;
  if (!url || !socialWebview) return;

  currentSocialUrl = url;
  document.querySelectorAll('.social-link').forEach((item) => {
    item.classList.toggle('active', item === button);
    if (item === button) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  const name = button.dataset.socialName || button.title || 'Página';
  if (socialCurrentName) socialCurrentName.textContent = name;
  if (socialCurrentUrl) socialCurrentUrl.textContent = new URL(url).hostname;
  if (socialLoading) {
    const loadingLabel = socialLoading.querySelector('span');
    if (loadingLabel) loadingLabel.textContent = `Carregando ${name}...`;
  }
  if (socialError) socialError.classList.add('hidden');
  socialWebview.src = url;
}

document.querySelectorAll('.social-link').forEach((button) => {
  button.addEventListener('click', () => loadSocialPage(button));
});

if (btnSocialBack) {
  btnSocialBack.addEventListener('click', () => {
    if (socialWebview && socialWebview.canGoBack && socialWebview.canGoBack()) socialWebview.goBack();
  });
}

if (btnSocialForward) {
  btnSocialForward.addEventListener('click', () => {
    if (socialWebview && socialWebview.canGoForward && socialWebview.canGoForward()) socialWebview.goForward();
  });
}

if (btnSocialReload) {
  btnSocialReload.addEventListener('click', () => {
    if (socialWebview && socialWebview.reload) socialWebview.reload();
  });
}

if (btnSocialHome) {
  btnSocialHome.addEventListener('click', () => {
    if (socialWebview && currentSocialUrl) socialWebview.src = currentSocialUrl;
  });
}

if (socialWebview) {
  socialWebview.addEventListener('did-start-loading', () => {
    if (socialLoading) socialLoading.classList.remove('hidden');
    if (socialError) socialError.classList.add('hidden');
  });

  socialWebview.addEventListener('did-stop-loading', () => {
    if (socialLoading) socialLoading.classList.add('hidden');
  });

  socialWebview.addEventListener('did-navigate', (event) => {
    try {
      if (socialCurrentUrl) socialCurrentUrl.textContent = new URL(event.url).hostname;
    } catch (error) {
      console.warn('URL de navegação social inválida:', error);
    }
  });

  socialWebview.addEventListener('did-fail-load', (event) => {
    if (!event.isMainFrame || event.errorCode === -3) return;
    if (socialLoading) socialLoading.classList.add('hidden');
    if (socialError) {
      socialError.textContent = `Não foi possível carregar ${socialCurrentName ? socialCurrentName.textContent : 'a página'}. Verifique a conexão e tente novamente.`;
      socialError.classList.remove('hidden');
    }
  });
}

async function initializeGoogleBrowser() {
  applyGoogleShieldStatus(await api.getGoogleShieldStatus());
  createGoogleTab(false);
}

if (wallpapersWebview) {
  if (btnWallpapersBack) {
    btnWallpapersBack.addEventListener('click', () => {
      if (wallpapersWebview.canGoBack()) wallpapersWebview.goBack();
    });
  }

  if (btnWallpapersForward) {
    btnWallpapersForward.addEventListener('click', () => {
      if (wallpapersWebview.canGoForward()) wallpapersWebview.goForward();
    });
  }

  if (btnWallpapersReload) {
    btnWallpapersReload.addEventListener('click', () => wallpapersWebview.reload());
  }

  if (btnWallpapersHome) {
    btnWallpapersHome.addEventListener('click', () => {
      wallpapersWebview.loadURL('https://hdqwalls.com/');
    });
  }

  wallpapersWebview.addEventListener('did-start-loading', () => {
    if (wallpapersLoading) wallpapersLoading.classList.remove('hidden');
  });

  wallpapersWebview.addEventListener('did-stop-loading', () => {
    if (wallpapersLoading) wallpapersLoading.classList.add('hidden');
  });
}

if (geminiWebview) {
  if (btnGeminiBack) {
    btnGeminiBack.addEventListener('click', () => {
      if (geminiWebview.canGoBack()) geminiWebview.goBack();
    });
  }

  if (btnGeminiForward) {
    btnGeminiForward.addEventListener('click', () => {
      if (geminiWebview.canGoForward()) geminiWebview.goForward();
    });
  }

  if (btnGeminiReload) {
    btnGeminiReload.addEventListener('click', () => geminiWebview.reload());
  }

  if (btnGeminiHome) {
    btnGeminiHome.addEventListener('click', () => {
      geminiWebview.loadURL('https://gemini.google.com/app');
    });
  }

  geminiWebview.addEventListener('did-start-loading', () => {
    if (geminiLoading) geminiLoading.classList.remove('hidden');
  });

  geminiWebview.addEventListener('did-stop-loading', () => {
    if (geminiLoading) geminiLoading.classList.add('hidden');
  });
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey) {
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      if (currentTab === 'google') {
        googleUrlInput.focus();
        googleUrlInput.select();
      } else {
        switchTab('home');
        urlInput.focus();
        urlInput.select();
      }
    } else if ((e.key === 'n' || e.key === 'N') && e.shiftKey) {
      e.preventDefault();
      switchTab('google');
      createGoogleTab(true);
      googleUrlInput.focus();
      googleUrlInput.select();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      switchTab('google');
      createGoogleTab(false);
      googleUrlInput.focus();
      googleUrlInput.select();
    } else if ((e.key === 'w' || e.key === 'W') && currentTab === 'google') {
      e.preventDefault();
      closeGoogleTab(activeGoogleTabId);
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      switchTab('downloads');
      dlUrl.focus();
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      switchTab('google');
      if (googleUrlInput) {
        googleUrlInput.focus();
        googleUrlInput.select();
      }
    } else if (e.key === ',' ) {
      e.preventDefault();
      switchTab('settings');
    }
  }
  if (e.key === 'Escape') {
    if (!modalDownload.classList.contains('hidden')) closeModal();
    if (googleLibraryPanel && !googleLibraryPanel.classList.contains('hidden')) {
      googleLibraryPanel.classList.add('hidden');
    }
  }
});

// ── INIT ───────────────────────────────────────────────────────────────────
async function init() {
  await loadTheme();
  await loadDownloadPath();

  downloadPreferences = await api.getDownloadPreferences();
  setDefaultVideoFormat.value = downloadPreferences.videoFormat;
  setDefaultAudioFormat.value = downloadPreferences.audioFormat;
  dlFormat.value = 'default-video';
  modalFormat.value = 'default-video';
  modalPlaylistFormat.value = downloadPreferences.videoFormat;

  const customUA = await api.getCustomUserAgent();
  if (customUA) setCustomUserAgent.value = customUA;

  const advanced = await api.getDownloadAdvanced();
  if (advanced) {
    setSpeedLimit.value = advanced.speedLimit || '';
    setProxy.value = advanced.proxyUrl || '';
    setCookiesBrowser.value = advanced.cookiesFromBrowser || '';
  }
  renderHistory();

  const discordSettings = await api.getDiscordSettings();
  if (discordSettings) {
    discordPresenceEnabled = Boolean(discordSettings.enabled);
    setDiscordEnabled.checked = discordPresenceEnabled;
    setDiscordClientId.value = discordSettings.clientId || '';
  }

  const adblockStatus = await api.getAdblockStatus();
  if (adblockStatus) setAdblockEnabled.checked = Boolean(adblockStatus.enabled);

  const [version, updateStatus] = await Promise.all([
    api.getAppVersion(),
    api.getAppUpdateStatus()
  ]);
  appVersionStatus.textContent = `Versão instalada: ${version}. ${updateStatus.message}`;
  applyAppUpdateStatus(updateStatus);
  checkDownloadTools();
  await initializeGoogleBrowser();

  // Initial tab
  switchTab('home');
}

init().catch(console.error);
