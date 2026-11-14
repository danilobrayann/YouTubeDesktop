'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// YouTube Desktop — renderer.js
// Full renderer: theme engine, tab navigation, downloads, settings
// ═══════════════════════════════════════════════════════════════════════════

const api = window.api;

// ── State ──────────────────────────────────────────────────────────────────
let currentTab = 'home';
let downloadPath = '';
let currentTheme = {};
let activeDownloadCount = 0;
const downloads = new Map(); // downloadId → { url, format, status, percent, ... }

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
const dlBadge        = document.getElementById('dl-badge');
const webviewLoading = document.getElementById('webview-loading');
const modalBackdrop  = document.getElementById('modal-backdrop');
const modalDownload  = document.getElementById('modal-download');
const modalUrl       = document.getElementById('modal-url-text');
const modalFormat    = document.getElementById('modal-format');
const modalClosBtn   = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalDlBtn     = document.getElementById('modal-download-btn');

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
const setDefaultFormat   = document.getElementById('set-default-format');
const btnPickBg          = document.getElementById('btn-pick-bg');
const btnClearBg         = document.getElementById('btn-clear-bg');
const bgPreviewImg       = document.getElementById('bg-preview-img');
const bgPreviewText      = document.getElementById('bg-preview-text');
const btnSaveTheme       = document.getElementById('btn-save-theme');
const saveStatus         = document.getElementById('save-status');
const settingsDlPath     = document.getElementById('settings-dl-path');
const btnSettingsChPath  = document.getElementById('btn-settings-change-path');
const accentLabel        = document.getElementById('accent-label');
const bgcolorLabel       = document.getElementById('bgcolor-label');
const gradc1Label        = document.getElementById('gradc1-label');
const gradc2Label        = document.getElementById('gradc2-label');
const angleVal           = document.getElementById('angle-val');
const blurVal            = document.getElementById('blur-val');
const opacityVal         = document.getElementById('opacity-val');

// Torrents DOM refs
const torrentUrl            = document.getElementById('torrent-url');
const btnSelectTorrentFile  = document.getElementById('btn-select-torrent-file');
const btnStartTorrent       = document.getElementById('btn-start-torrent');
const torrentPathDisplay    = document.getElementById('torrent-path-display');
const btnOpenTorrentFolder  = document.getElementById('btn-open-torrent-folder');
const btnOpenTorrentsQuick  = document.getElementById('btn-open-torrents-quick');
const torrentList           = document.getElementById('torrent-list');
const torrentEmptyState     = document.getElementById('torrent-empty-state');
const torrentBadge          = document.getElementById('torrent-badge');

// Google Web DOM refs
const googleWebview         = document.getElementById('google-player');
const googleUrlInput        = document.getElementById('google-url-input');
const btnGoogleSearch       = document.getElementById('btn-google-search');
const btnGoogleTorrents     = document.getElementById('btn-google-torrents');
const btnGoogleBack         = document.getElementById('btn-google-back');
const btnGoogleForward      = document.getElementById('btn-google-forward');
const btnGoogleReload       = document.getElementById('btn-google-reload');
const btnGoogleHome         = document.getElementById('btn-google-home');
const googleLoading         = document.getElementById('google-loading');

// Explore DOM refs
const exploreSearchInput      = document.getElementById('explore-search-input');
const exploreGoogleInput      = document.getElementById('explore-google-input');
const btnExploreSearchGoogle  = document.getElementById('btn-explore-search-google');
const exploreGrid             = document.getElementById('explore-grid');

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
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const tab     = document.getElementById(`tab-${tabId}`);
  const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (tab)     tab.classList.add('active');
  if (navItem) navItem.classList.add('active');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    switchTab(item.dataset.tab);
  });
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
  if (e.key === 'Enter') loadUrl(urlInput.value);
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
    document.title = `YouTube Desktop — ${title}`;
  } else {
    nowPlaying.classList.add('hidden');
    document.title = 'YouTube Desktop';
  }
}

// ── QUICK DOWNLOAD MODAL ───────────────────────────────────────────────────
btnDownloadQ.addEventListener('click', openQuickDownloadModal);

function openQuickDownloadModal() {
  const url = urlInput.value.trim() || webview.src || '';
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

function openPlaylistModal(url, format, title = 'Playlist do YouTube', count = null) {
  pendingPlaylistUrl = url;
  if (modalPlaylistFormat) modalPlaylistFormat.value = format || '720p';
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
  closeModal();
  if (url) {
    dlUrl.value    = url;
    dlFormat.value = format;
    await triggerDownloadCheck(url, format);
  }
});

async function triggerDownloadCheck(url, format) {
  if (!url || !url.trim()) return;

  // Se contém parâmetro de playlist, avisar e perguntar antes!
  if (url.includes('list=') || url.includes('/playlist')) {
    openPlaylistModal(url, format);
  } else {
    switchTab('downloads');
    await startDownload(url, format, false);
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
          icon: '../assets/icon.svg'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') {
            new Notification('🎉 Download Concluído!', {
              body: `O download de "${title}" foi concluído!`,
              icon: '../assets/icon.svg'
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

async function startDownload(url, format, downloadPlaylist = true, playlistTitle = '') {
  if (!url || !url.trim()) {
    alert('Por favor, insira uma URL válida.');
    return;
  }

  const id = generateId();
  const isPlaylist = downloadPlaylist && (url.includes('list=') || url.includes('/playlist'));

  const download = {
    id,
    url: url.trim(),
    format,
    isPlaylist,
    playlistTitle,
    status: 'pending',
    percent: 0,
    speed: '',
    eta: '',
    size: ''
  };

  downloads.set(id, download);
  renderDownloadCard(download);
  updateBadge();

  try {
    activeDownloadCount++;
    updateBadge();
    updateDownloadCard(id, { status: 'downloading' });

    await api.downloadMedia({
      url:              download.url,
      format:           download.format,
      outputPath:       downloadPath,
      downloadId:       id,
      downloadPlaylist: downloadPlaylist,
      playlistFolder:   playlistTitle
    });
  } catch (err) {
    updateDownloadCard(id, { status: 'error', message: err.message });
    activeDownloadCount = Math.max(0, activeDownloadCount - 1);
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
  updateDownloadCard(downloadId, { percent, speed, eta, size, status, message, currentItem, totalItems, title });

  if (status === 'complete' || status === 'error' || status === 'cancelled') {
    activeDownloadCount = Math.max(0, activeDownloadCount - 1);
    updateBadge();

    if (status === 'complete') {
      const dl = downloads.get(downloadId);
      const displayTitle = (dl && dl.playlistTitle) || title || 'Seu download';
      notifyDownloadComplete(displayTitle, dl ? dl.isPlaylist : false);
    }
  }
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
        <button class="dl-action-btn danger" id="cancel-${dl.id}" onclick="cancelDownload('${dl.id}')">✕ Cancelar</button>
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
  const cancelEl      = document.getElementById(`cancel-${id}`);
  const counterEl     = document.getElementById(`item-counter-${id}`);
  const titleTxtEl    = document.getElementById(`title-text-${id}`);
  const folderBadgeEl = document.getElementById(`folder-badge-${id}`);

  if (!cardEl) return;

  if (data.targetFolder) dl.targetFolder = data.targetFolder;
  if (data.filePath) dl.filePath = data.filePath;

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
      complete:    '✅ Concluído',
      error:       '❌ Erro',
      cancelled:   '⚠️ Cancelado'
    };
    statusEl.textContent = labels[status] || status;
    statusEl.className = `dl-status-label ${status}`;
  }

  if (fillEl) {
    fillEl.classList.remove('active', 'complete', 'error', 'cancelled');
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
    }
  }

  if (cardEl) {
    cardEl.className = `dl-card${status ? ` status-${status}` : ''}`;
  }

  // Substituir botão Cancelar por Abrir Pasta / Abrir Arquivo / Remover na conclusão
  if ((status === 'complete' || status === 'error' || status === 'cancelled') && actEl) {
    if (cancelEl) cancelEl.remove();
    if (status === 'complete') {
      // Botão para abrir a pasta específica onde o arquivo/playlist foi salvo!
      const openFolderBtn = document.createElement('button');
      openFolderBtn.className = 'dl-action-btn primary';
      openFolderBtn.textContent = '📂 Abrir Pasta';
      openFolderBtn.title = `Abrir: ${dl.targetFolder || downloadPath}`;
      openFolderBtn.addEventListener('click', () => {
        api.openFolder(dl.targetFolder || downloadPath);
      });
      actEl.appendChild(openFolderBtn);

      // Botão para abrir o arquivo direto (se for vídeo/música individual)
      if (dl.filePath && !dl.isPlaylist) {
        const openFileBtn = document.createElement('button');
        openFileBtn.className = 'dl-action-btn';
        openFileBtn.textContent = '▶ Reproduzir';
        openFileBtn.title = `Abrir arquivo: ${dl.filePath}`;
        openFileBtn.addEventListener('click', () => {
          api.openFile(dl.filePath);
        });
        actEl.appendChild(openFileBtn);
      }
    }
    const rmBtn = document.createElement('button');
    rmBtn.className = 'dl-action-btn';
    rmBtn.textContent = '🗑 Remover';
    rmBtn.addEventListener('click', () => removeDownloadCard(id));
    actEl.appendChild(rmBtn);
  }

  if (speedEl && etaEl && (status === 'complete' || status === 'error' || status === 'cancelled')) {
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

function cancelDownload(id) {
  api.cancelDownload(id).then(() => {
    updateDownloadCard(id, { status: 'cancelled' });
  });
}
window.cancelDownload = cancelDownload;

function updateBadge() {
  if (activeDownloadCount > 0) {
    dlBadge.classList.remove('hidden');
    dlBadge.textContent = activeDownloadCount;
  } else {
    dlBadge.classList.add('hidden');
  }
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
}

function updatePathDisplay(p) {
  downloadPath = p;
  if (dlPathDisplay)      dlPathDisplay.textContent      = p;
  if (settingsDlPath)     settingsDlPath.textContent     = p;
  if (torrentPathDisplay) torrentPathDisplay.textContent = `${p}\\Torrents`;
}

btnChangePath.addEventListener('click', async () => {
  const newPath = await api.setDownloadPath();
  if (newPath) updatePathDisplay(newPath);
});

btnOpenFolder.addEventListener('click', () => {
  if (downloadPath) api.openFolder(downloadPath);
});

if (btnOpenVideos) {
  btnOpenVideos.addEventListener('click', () => {
    api.openCategoryFolder('videos', downloadPath);
  });
}

if (btnOpenMusicas) {
  btnOpenMusicas.addEventListener('click', () => {
    api.openCategoryFolder('musicas', downloadPath);
  });
}

if (btnOpenPlaylists) {
  btnOpenPlaylists.addEventListener('click', () => {
    api.openCategoryFolder('playlists', downloadPath);
  });
}

if (btnOpenTorrentsQuick) {
  btnOpenTorrentsQuick.addEventListener('click', () => {
    api.openCategoryFolder('torrents', downloadPath);
  });
}

btnSettingsChPath.addEventListener('click', async () => {
  const newPath = await api.setDownloadPath();
  if (newPath) updatePathDisplay(newPath);
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

// Default format
setDefaultFormat.addEventListener('change', async () => {
  await api.saveDefaultFormat(setDefaultFormat.value);
  dlFormat.value = setDefaultFormat.value;
});

// Save theme
btnSaveTheme.addEventListener('click', async () => {
  await saveTheme();
  const fmt = setDefaultFormat.value;
  await api.saveDefaultFormat(fmt);
  dlFormat.value = fmt;

  saveStatus.classList.remove('hidden');
  setTimeout(() => saveStatus.classList.add('hidden'), 2500);
});

// ── TORRENT DOWNLOAD SYSTEM ────────────────────────────────────────────────
const torrents = new Map(); // id -> torrentData
let activeTorrentCount = 0;

function formatBytes(bytes) {
  if (!bytes || bytes <= 0 || !isFinite(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0 || !isFinite(bytesPerSec)) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatEta(ms) {
  if (!ms || ms <= 0 || !isFinite(ms)) return '';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function updateTorrentBadge() {
  let active = 0;
  for (const t of torrents.values()) {
    if (t.status === 'downloading') active++;
  }
  activeTorrentCount = active;
  if (torrentBadge) {
    if (active > 0) {
      torrentBadge.classList.remove('hidden');
      torrentBadge.textContent = active;
    } else {
      torrentBadge.classList.add('hidden');
    }
  }
}

function renderTorrentCard(t) {
  if (!torrentList) return;
  if (torrentEmptyState) torrentEmptyState.classList.add('hidden');

  let card = document.getElementById(`torrent-card-${t.id}`);
  if (card) {
    updateTorrentCard(t);
    return;
  }

  card = document.createElement('div');
  card.className = 'dl-card';
  card.id = `torrent-card-${t.id}`;

  const pct = Math.min(100, Math.max(0, Math.round(t.progress || 0)));
  const style = getProgressStyle(pct);

  const isPaused = t.status === 'paused';
  const isDone = t.status === 'complete' || pct === 100;
  const isError = t.status === 'error';

  let statusText = 'Baixando';
  let statusClass = 'downloading';
  if (isPaused) {
    statusText = 'Pausado';
    statusClass = 'pending';
  } else if (isDone) {
    statusText = '✅ Concluído';
    statusClass = 'complete';
  } else if (isError) {
    statusText = 'Erro';
    statusClass = 'error';
  }

  card.innerHTML = `
    <div class="dl-card-header">
      <span class="dl-card-icon">🧲</span>
      <div class="dl-card-info">
        <div class="dl-card-url" id="tor-title-${t.id}" title="${escHtml(t.name || t.source)}">
          ${escHtml(t.name || 'Arquivo Torrent')}
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-top:4px; flex-wrap:wrap;">
          <span class="dl-card-format">TORRENT</span>
          <span class="dl-folder-badge" id="tor-folder-${t.id}" title="${escHtml(t.savePath || '')}">📁 Torrents</span>
          <span class="torrent-peers-badge" id="tor-peers-${t.id}">👥 ${t.numPeers || 0} peers</span>
          <span class="torrent-speed-badge" id="tor-speed-badge-${t.id}">⚡ ${formatSpeed(t.downloadSpeed || 0)}</span>
          <span class="dl-item-counter" id="tor-size-${t.id}">${formatBytes(t.downloaded || 0)} / ${formatBytes(t.total || 0)}</span>
        </div>
      </div>
      <div class="dl-card-actions" id="tor-actions-${t.id}">
        <span class="dl-status-label ${statusClass}" id="tor-status-${t.id}">${statusText}</span>
        ${!isDone ? `
          <button class="dl-action-btn" id="tor-btn-toggle-${t.id}" onclick="toggleTorrentPause('${t.id}')">
            ${isPaused ? '▶ Retomar' : '⏸ Pausar'}
          </button>
        ` : ''}
        <button class="dl-action-btn" id="tor-btn-folder-${t.id}" onclick="openTorrentFolder('${escHtml(t.savePath || '')}')">
          📁 Pasta
        </button>
        <button class="dl-action-btn danger" id="tor-btn-remove-${t.id}" onclick="removeTorrent('${t.id}')">
          🗑 Remover
        </button>
      </div>
    </div>
    <div class="dl-progress-wrap" id="tor-progress-wrap-${t.id}">
      <div class="dl-progress-bar">
        <div class="dl-progress-fill ${isDone ? 'done' : 'active'}" id="tor-fill-${t.id}" style="width:${pct}%; background:${style.gradient}; box-shadow:${style.glow};"></div>
      </div>
      <div class="dl-progress-stats">
        <span class="dl-percent" id="tor-pct-${t.id}" style="color:${style.color};">${pct}%</span>
        <span id="tor-stats-${t.id}">${formatBytes(t.downloaded || 0)} de ${formatBytes(t.total || 0)}</span>
        <span id="tor-eta-${t.id}">${t.timeRemaining && t.timeRemaining > 0 && !isDone && !isPaused ? '⏱ ETA ' + formatEta(t.timeRemaining) : ''}</span>
      </div>
    </div>
  `;

  torrentList.prepend(card);
}

function updateTorrentCard(t) {
  const existing = torrents.get(t.id);
  if (existing) {
    Object.assign(existing, t);
  } else {
    torrents.set(t.id, t);
  }

  const card = document.getElementById(`torrent-card-${t.id}`);
  if (!card) {
    renderTorrentCard(t);
    return;
  }

  const titleEl   = document.getElementById(`tor-title-${t.id}`);
  const peersEl   = document.getElementById(`tor-peers-${t.id}`);
  const speedEl   = document.getElementById(`tor-speed-badge-${t.id}`);
  const sizeEl    = document.getElementById(`tor-size-${t.id}`);
  const statusEl  = document.getElementById(`tor-status-${t.id}`);
  const fillEl    = document.getElementById(`tor-fill-${t.id}`);
  const pctEl     = document.getElementById(`tor-pct-${t.id}`);
  const statsEl   = document.getElementById(`tor-stats-${t.id}`);
  const etaEl     = document.getElementById(`tor-eta-${t.id}`);
  const toggleBtn = document.getElementById(`tor-btn-toggle-${t.id}`);

  if (t.name && titleEl) titleEl.textContent = t.name;
  if (peersEl && t.numPeers !== undefined) peersEl.textContent = `👥 ${t.numPeers} peers`;
  if (speedEl && t.downloadSpeed !== undefined) speedEl.textContent = `⚡ ${formatSpeed(t.downloadSpeed)}`;
  if (sizeEl && (t.downloaded !== undefined || t.total !== undefined)) {
    sizeEl.textContent = `${formatBytes(t.downloaded || 0)} / ${formatBytes(t.total || 0)}`;
  }
  if (statsEl) {
    statsEl.textContent = `${formatBytes(t.downloaded || 0)} de ${formatBytes(t.total || 0)}`;
  }

  const pct = Math.min(100, Math.max(0, Math.round(t.progress || 0)));
  const style = getProgressStyle(pct);

  if (fillEl) {
    fillEl.style.width = `${pct}%`;
    if (t.status !== 'complete' && pct < 100) {
      fillEl.style.background = style.gradient;
      fillEl.style.boxShadow = style.glow;
    }
  }
  if (pctEl) {
    pctEl.textContent = `${pct}%`;
    pctEl.style.color = style.color;
  }

  if (etaEl) {
    if (t.status === 'downloading' && t.timeRemaining && t.timeRemaining > 0) {
      etaEl.textContent = `⏱ ETA ${formatEta(t.timeRemaining)}`;
    } else {
      etaEl.textContent = '';
    }
  }

  if (statusEl && t.status) {
    const isPaused = t.status === 'paused';
    const isDone = t.status === 'complete' || pct === 100;
    const isError = t.status === 'error';

    statusEl.className = 'dl-status-label ' + (isDone ? 'complete' : isPaused ? 'pending' : isError ? 'error' : 'downloading');
    statusEl.textContent = isDone ? '✅ Concluído' : isPaused ? 'Pausado' : isError ? 'Erro' : 'Baixando';

    if (toggleBtn) {
      if (isDone) {
        toggleBtn.remove();
      } else {
        toggleBtn.textContent = isPaused ? '▶ Retomar' : '⏸ Pausar';
      }
    }
  }

  updateTorrentBadge();
}

window.toggleTorrentPause = async function(id) {
  const item = torrents.get(id);
  if (!item) return;
  if (item.status === 'paused') {
    await api.resumeTorrent(id);
  } else {
    await api.pauseTorrent(id);
  }
};

window.openTorrentFolder = function(folder) {
  if (folder) {
    api.openFolder(folder);
  } else {
    api.openCategoryFolder('torrents', downloadPath);
  }
};

window.removeTorrent = async function(id) {
  const ok = confirm('Deseja remover este torrent da lista?');
  if (!ok) return;
  await api.removeTorrent({ id, deleteFiles: false });
  const card = document.getElementById(`torrent-card-${id}`);
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => {
      card.remove();
      torrents.delete(id);
      updateTorrentBadge();
      if (torrents.size === 0 && torrentEmptyState) {
        torrentEmptyState.classList.remove('hidden');
      }
    }, 300);
  }
};

async function startTorrent(source) {
  if (!source || !source.trim()) {
    alert('Por favor, cole um link Magnet válido ou escolha um arquivo .torrent.');
    return;
  }
  const clean = source.trim();
  try {
    const torrentData = await api.addTorrent({ source: clean });
    if (torrentData) {
      torrents.set(torrentData.id, torrentData);
      renderTorrentCard(torrentData);
      updateTorrentBadge();
    }
    if (torrentUrl) torrentUrl.value = '';
  } catch (err) {
    alert(`Erro ao iniciar download torrent: ${err.message}`);
  }
}

if (btnStartTorrent) {
  btnStartTorrent.addEventListener('click', () => {
    startTorrent(torrentUrl.value);
  });
}

if (torrentUrl) {
  torrentUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      startTorrent(torrentUrl.value);
    }
  });
}

if (btnSelectTorrentFile) {
  btnSelectTorrentFile.addEventListener('click', async () => {
    const filePath = await api.selectTorrentFile();
    if (filePath) {
      if (torrentUrl) torrentUrl.value = filePath;
      await startTorrent(filePath);
    }
  });
}

if (btnOpenTorrentFolder) {
  btnOpenTorrentFolder.addEventListener('click', () => {
    api.openCategoryFolder('torrents', downloadPath);
  });
}

// IPC Torrent listeners
if (api && api.on) {
  api.on('torrent-added', (data) => {
    if (data) {
      torrents.set(data.id, data);
      renderTorrentCard(data);
      updateTorrentBadge();
    }
  });

  api.on('torrent-progress', (data) => {
    if (data && data.id) {
      updateTorrentCard(data);
    }
  });

  api.on('torrent-ready', (data) => {
    if (data && data.id) {
      updateTorrentCard(data);
    }
  });

  api.on('torrent-done', (data) => {
    if (data && data.id) {
      updateTorrentCard(data);
      notifyDownloadComplete(data.name || 'Download Torrent');
      updateTorrentBadge();
    }
  });

  api.on('torrent-updated', (data) => {
    if (data && data.id) {
      updateTorrentCard(data);
    }
  });

  api.on('torrent-error', (data) => {
    if (data && data.id) {
      updateTorrentCard({ id: data.id, status: 'error', errorMessage: data.message });
    }
  });

  api.on('torrent-removed', (data) => {
    if (data && data.id) {
      const card = document.getElementById(`torrent-card-${data.id}`);
      if (card) card.remove();
      torrents.delete(data.id);
      updateTorrentBadge();
      if (torrents.size === 0 && torrentEmptyState) {
        torrentEmptyState.classList.remove('hidden');
      }
    }
  });
}

// ── GOOGLE WEB BROWSER SYSTEM ──────────────────────────────────────────────
function loadGoogleUrl(input, isTorrentSearch = false) {
  if (!googleWebview) return;
  const trimmed = (input || '').trim();
  if (!trimmed) {
    googleWebview.src = 'https://www.google.com';
    if (googleUrlInput) googleUrlInput.value = 'https://www.google.com';
    return;
  }

  let targetUrl = '';
  if (isTorrentSearch) {
    const q = encodeURIComponent(`${trimmed} torrent`);
    targetUrl = `https://www.google.com/search?q=${q}`;
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    targetUrl = trimmed;
  } else if (trimmed.includes('.') && !trimmed.includes(' ') && trimmed.length > 3) {
    targetUrl = `https://${trimmed}`;
  } else {
    targetUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  googleWebview.src = targetUrl;
  if (googleUrlInput) googleUrlInput.value = targetUrl;
}

if (btnGoogleSearch) {
  btnGoogleSearch.addEventListener('click', () => {
    loadGoogleUrl(googleUrlInput ? googleUrlInput.value : '');
  });
}

if (btnGoogleTorrents) {
  btnGoogleTorrents.addEventListener('click', () => {
    loadGoogleUrl(googleUrlInput ? googleUrlInput.value : '', true);
  });
}

if (googleUrlInput) {
  googleUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      loadGoogleUrl(googleUrlInput.value);
    }
  });
}

if (btnGoogleBack) {
  btnGoogleBack.addEventListener('click', () => {
    try {
      if (googleWebview && googleWebview.canGoBack && googleWebview.canGoBack()) {
        googleWebview.goBack();
      }
    } catch (e) {}
  });
}

if (btnGoogleForward) {
  btnGoogleForward.addEventListener('click', () => {
    try {
      if (googleWebview && googleWebview.canGoForward && googleWebview.canGoForward()) {
        googleWebview.goForward();
      }
    } catch (e) {}
  });
}

if (btnGoogleReload) {
  btnGoogleReload.addEventListener('click', () => {
    try {
      if (googleWebview) googleWebview.reload();
    } catch (e) {}
  });
}

if (btnGoogleHome) {
  btnGoogleHome.addEventListener('click', () => {
    loadGoogleUrl('https://www.google.com');
  });
}

// Quick pills in Google browser
document.querySelectorAll('.pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.url) {
      loadGoogleUrl(btn.dataset.url);
    } else if (btn.dataset.query) {
      loadGoogleUrl(btn.dataset.query);
    }
  });
});

// Google Webview events (loading, navigation, and magnet interception)
if (googleWebview) {
  googleWebview.addEventListener('did-start-loading', () => {
    if (googleLoading) googleLoading.classList.remove('hidden');
  });

  googleWebview.addEventListener('did-stop-loading', () => {
    if (googleLoading) googleLoading.classList.add('hidden');
    try {
      const wvUrl = googleWebview.getURL();
      if (wvUrl && googleUrlInput && wvUrl !== googleUrlInput.value) {
        googleUrlInput.value = wvUrl;
      }
    } catch (e) {}
  });

  googleWebview.addEventListener('did-navigate', (e) => {
    if (e.url && googleUrlInput && e.url !== googleUrlInput.value) {
      googleUrlInput.value = e.url;
    }
  });

  // Interceptar cliques em links magnet para baixar direto no app!
  googleWebview.addEventListener('will-navigate', (e) => {
    if (e.url && e.url.startsWith('magnet:')) {
      e.preventDefault();
      switchTab('torrents');
      startTorrent(e.url);
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('🧲 Link Magnet Detectado!', {
          body: 'O link foi capturado da web e adicionado aos seus Torrents!',
          icon: '../assets/icon.svg'
        });
      }
    }
  });

  googleWebview.addEventListener('new-window', (e) => {
    if (e.url && e.url.startsWith('magnet:')) {
      e.preventDefault();
      switchTab('torrents');
      startTorrent(e.url);
    }
  });
}

// ── RECOMENDAÇÕES / EXPLORAR TORRENTS ──────────────────────────────────────
const RECOMMENDATIONS = [
  // ── MÚSICAS ──
  {
    id: 'rec-nin-slip',
    title: 'Nine Inch Nails — The Slip',
    category: 'musica',
    categoryLabel: '🎵 MÚSICA / ROCK INDUSTRIAL',
    badge: 'Álbum Completo FLAC / MP3',
    description: 'Álbum oficial lançado pela banda sob licença Creative Commons. Inclui arquivos de estúdio de alta fidelidade sem perdas.',
    size: '420 MB',
    peers: 'Alta (120+ peers)',
    icon: '🎸',
    magnet: 'magnet:?xt=urn:btih:31ba7633e6fa16b14d24ee4e3bfa99b40f2f3575&dn=Nine+Inch+Nails+-+The+Slip+%5B2008%5D&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },
  {
    id: 'rec-nin-ghosts',
    title: 'Nine Inch Nails — Ghosts I–IV',
    category: 'musica',
    categoryLabel: '🎵 MÚSICA / INSTRUMENTAL',
    badge: '36 Faixas Master',
    description: 'Coletânea instrumental épica de 36 faixas que rendeu indicações ao Grammy, disponibilizada em Creative Commons.',
    size: '1.2 GB',
    peers: 'Alta (110+ peers)',
    icon: '🎹',
    magnet: 'magnet:?xt=urn:btih:b66807f45c9ca62507f154bf154fe268291f41be&dn=Nine+Inch+Nails+-+Ghosts+I-IV&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },
  {
    id: 'rec-jc-greatest',
    title: 'Jonathan Coulton — Greatest Hit (1.0)',
    category: 'musica',
    categoryLabel: '🎵 MÚSICA / FOLK ROCK',
    badge: 'Creative Commons',
    description: 'Os maiores sucessos da lenda do geek-rock ("Code Monkey", "Still Alive" e "Re: Your Brains") com áudio master.',
    size: '310 MB',
    peers: 'Média (55+ peers)',
    icon: '🎼',
    magnet: 'magnet:?xt=urn:btih:f1a0e3863a34a87c1d763878b30e42d7da6a9089&dn=Jonathan+Coulton+-+Greatest+Hit+1.0&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },
  {
    id: 'rec-jamendo-best',
    title: 'Jamendo Top Hits Collection (Creative Commons)',
    category: 'musica',
    categoryLabel: '🎵 MÚSICA / INDIE & POP',
    badge: 'Coletânea 50 Músicas',
    description: 'Compilação das 50 músicas mais tocadas de artistas independentes mundiais com licença livre para ouvir e remixar.',
    size: '480 MB',
    peers: 'Alta (90+ peers)',
    icon: '🎧',
    magnet: 'magnet:?xt=urn:btih:8c9038d1d8ef311cfca3582496a798835e5d1659&dn=Jamendo+Best+Collection&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },

  // ── VÍDEOS & FILMES ──
  {
    id: 'rec-big-buck-bunny',
    title: 'Big Buck Bunny (4K Ultra HD - 60fps)',
    category: 'video',
    categoryLabel: '🎬 VÍDEO / ANIMAÇÃO 4K',
    badge: 'Blender Open Movie',
    description: 'A famosa animação do coelho gigante em resolução 4K a 60 quadros por segundo com áudio surround multicanal.',
    size: '680 MB',
    peers: 'Muito Alta (200+ peers)',
    icon: '🐰',
    magnet: 'magnet:?xt=urn:btih:08a80290482279d447a5153fc868b31b43e4b2f0&dn=Big+Buck+Bunny+4K&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },
  {
    id: 'rec-tears-of-steel',
    title: 'Tears of Steel (Sci-Fi VFX 4K)',
    category: 'video',
    categoryLabel: '🎬 VÍDEO / FICÇÃO CIENTÍFICA',
    badge: 'Visual Effects 4K',
    description: 'Curta-metragem futurista ambientado em uma Amsterdã pós-apocalíptica com efeitos especiais cinematográficos avançados.',
    size: '570 MB',
    peers: 'Alta (140+ peers)',
    icon: '🤖',
    magnet: 'magnet:?xt=urn:btih:2b87e23398634e939297a3b0481b499e8d33c460&dn=Tears+of+Steel+4K&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },
  {
    id: 'rec-sintel',
    title: 'Sintel — The Durian Open Movie',
    category: 'video',
    categoryLabel: '🎬 VÍDEO / ANIMAÇÃO FANTASIA',
    badge: 'HD 1080p',
    description: 'Emocionante jornada de fantasia sobre a busca de uma jovem guerreira por seu dragão de estimação.',
    size: '650 MB',
    peers: 'Alta (110+ peers)',
    icon: '🐉',
    magnet: 'magnet:?xt=urn:btih:0c82dd35b9cfdaec274642c4dcb817d80112e016&dn=Sintel+1080p&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },
  {
    id: 'rec-swartz-doc',
    title: "The Internet's Own Boy (Aaron Swartz)",
    category: 'video',
    categoryLabel: '🎬 VÍDEO / DOCUMENTÁRIO',
    badge: 'Premiado Sundance',
    description: 'Aclamado documentário sobre o prodígio da programação e ativista da internet livre Aaron Swartz.',
    size: '1.4 GB',
    peers: 'Alta (95+ peers)',
    icon: '🎥',
    magnet: 'magnet:?xt=urn:btih:8f000b0d3bf49aa2bfdd09919b5c2a17f7bfa639&dn=The+Internets+Own+Boy&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },
  {
    id: 'rec-night-living-dead',
    title: 'A Noite dos Mortos-Vivos (1968)',
    category: 'video',
    categoryLabel: '🎬 VÍDEO / CLÁSSICO TERROR',
    badge: 'Domínio Público HD',
    description: 'O divisor de águas de George A. Romero que redefiniu o gênero do terror. Remasterizado em alta definição.',
    size: '1.8 GB',
    peers: 'Média (70+ peers)',
    icon: '🧟',
    magnet: 'magnet:?xt=urn:btih:5a57a0bf9b75294e77ddc9931b79f82d02c813be&dn=Night+of+the+Living+Dead+1968&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev'
  },

  // ── SOFTWARES & ISOS ──
  {
    id: 'rec-ubuntu',
    title: 'Ubuntu 24.04 LTS Desktop (64-bit)',
    category: 'software',
    categoryLabel: '💻 SOFTWARE / SISTEMA LINUX',
    badge: 'Suporte Estendido LTS',
    description: 'A versão de suporte a longo prazo do Ubuntu Desktop. Seguro, moderno e pronto para produtividade.',
    size: '5.7 GB',
    peers: 'Altíssima (400+ peers)',
    icon: '🐧',
    magnet: 'magnet:?xt=urn:btih:08b688d6c8e31a8ca9489279313fa171c7e997f7&dn=ubuntu-24.04-desktop-amd64.iso&tr=https%3A%2F%2Ftorrent.ubuntu.com%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce'
  },
  {
    id: 'rec-linux-mint',
    title: 'Linux Mint 22 (Cinnamon Edition)',
    category: 'software',
    categoryLabel: '💻 SOFTWARE / SISTEMA LINUX',
    badge: 'Interface Elegante',
    description: 'Distribuição famosa pela facilidade de uso, visual familiar e excelente desempenho em qualquer computador.',
    size: '2.9 GB',
    peers: 'Alta (250+ peers)',
    icon: '🍃',
    magnet: 'magnet:?xt=urn:btih:3fa81308a09f87251dc3d7e77a28e3a0937a074c&dn=linuxmint-22-cinnamon-64bit.iso&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce'
  },
  {
    id: 'rec-fedora',
    title: 'Fedora Workstation 40 (64-bit)',
    category: 'software',
    categoryLabel: '💻 SOFTWARE / SISTEMA LINUX',
    badge: 'GNOME 46 Puro',
    description: 'Sistema inovador e de ponta da comunidade Fedora com as tecnologias mais recentes do mundo de código aberto.',
    size: '2.4 GB',
    peers: 'Alta (180+ peers)',
    icon: '🎩',
    magnet: 'magnet:?xt=urn:btih:8e16548d88e894564c7cf08a155c0a3e87748834&dn=Fedora-Workstation-Live-x86_64-40&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce'
  },

  // ── LIVROS & AUDIOBOOKS ──
  {
    id: 'rec-sherlock',
    title: 'Coleção Sherlock Holmes (Audiobook Completo)',
    category: 'livro',
    categoryLabel: '📚 LIVRO & ÁUDIO / MISTÉRIO',
    badge: 'LibriVox Domínio Público',
    description: 'Histórias clássicas de Arthur Conan Doyle com narração em áudio MP3 de alta clareza para ouvir onde quiser.',
    size: '480 MB',
    peers: 'Média (45+ peers)',
    icon: '🕵️',
    magnet: 'magnet:?xt=urn:btih:75b084e5b3827ec3cf283d5a42211985160fa4be&dn=Sherlock+Holmes+Audiobook+Collection&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce'
  },
  {
    id: 'rec-dracula',
    title: 'Drácula — Bram Stoker (Audiobook)',
    category: 'livro',
    categoryLabel: '📚 LIVRO & ÁUDIO / CLÁSSICO GÓTICO',
    badge: 'Obra Completa',
    description: 'O romance epistolar que definiu o mito do vampiro, narrado em formato dramático com múltiplos personagens.',
    size: '520 MB',
    peers: 'Média (50+ peers)',
    icon: '🧛',
    magnet: 'magnet:?xt=urn:btih:4d93963286bf54f5905d5c192bb3b0c48e89c661&dn=Dracula+Bram+Stoker+Audiobook&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce'
  }
];

let currentExploreCategory = 'all';

function renderExploreCards(itemsToRender) {
  if (!exploreGrid) return;
  exploreGrid.innerHTML = '';

  if (itemsToRender.length === 0) {
    exploreGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);">
        <div style="font-size: 32px; margin-bottom: 10px;">🔍</div>
        <p style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Nenhuma recomendação encontrada</p>
        <span>Tente buscar por outro termo ou pesquise no Google pelo banner acima.</span>
      </div>
    `;
    return;
  }

  itemsToRender.forEach(item => {
    const card = document.createElement('div');
    card.className = 'explore-card';
    card.innerHTML = `
      <div class="explore-card-top">
        <div class="explore-card-icon">${item.icon}</div>
        <div class="explore-card-meta">
          <div class="explore-card-category">${escHtml(item.categoryLabel)}</div>
          <div class="explore-card-title">${escHtml(item.title)}</div>
          <span class="explore-card-badge">${escHtml(item.badge)}</span>
        </div>
      </div>
      <p class="explore-card-desc">${escHtml(item.description)}</p>
      <div class="explore-card-footer">
        <div class="explore-card-stats">
          <span class="explore-card-size">📦 ${item.size}</span>
          <span class="explore-card-peers">👥 ${item.peers}</span>
        </div>
        <button class="btn-explore-download" onclick="downloadRecommendedTorrent('${item.id}')">
          ⚡ Baixar Torrent
        </button>
      </div>
    `;
    exploreGrid.appendChild(card);
  });
}

function updateExploreCategoryCounts() {
  const countAll = document.getElementById('count-all');
  const countMusica = document.getElementById('count-musica');
  const countVideo = document.getElementById('count-video');
  const countSoftware = document.getElementById('count-software');
  const countLivro = document.getElementById('count-livro');

  if (countAll) countAll.textContent = RECOMMENDATIONS.length;
  if (countMusica) countMusica.textContent = RECOMMENDATIONS.filter(r => r.category === 'musica').length;
  if (countVideo) countVideo.textContent = RECOMMENDATIONS.filter(r => r.category === 'video').length;
  if (countSoftware) countSoftware.textContent = RECOMMENDATIONS.filter(r => r.category === 'software').length;
  if (countLivro) countLivro.textContent = RECOMMENDATIONS.filter(r => r.category === 'livro').length;
}

function filterExploreItems() {
  const query = (exploreSearchInput ? exploreSearchInput.value : '').toLowerCase().trim();

  let filtered = RECOMMENDATIONS;
  if (currentExploreCategory !== 'all') {
    filtered = filtered.filter(r => r.category === currentExploreCategory);
  }

  if (query) {
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.categoryLabel.toLowerCase().includes(query) ||
      r.badge.toLowerCase().includes(query)
    );
  }

  renderExploreCards(filtered);
}

// Category filter pills click
document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentExploreCategory = pill.dataset.category || 'all';
    filterExploreItems();
  });
});

if (exploreSearchInput) {
  exploreSearchInput.addEventListener('input', () => {
    filterExploreItems();
  });
}

// Banner Google Search
if (btnExploreSearchGoogle) {
  btnExploreSearchGoogle.addEventListener('click', () => {
    const q = exploreGoogleInput ? exploreGoogleInput.value.trim() : '';
    switchTab('google');
    loadGoogleUrl(q, true);
  });
}

if (exploreGoogleInput) {
  exploreGoogleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (btnExploreSearchGoogle) btnExploreSearchGoogle.click();
    }
  });
}

window.downloadRecommendedTorrent = async function(id) {
  const item = RECOMMENDATIONS.find(r => r.id === id);
  if (!item) return;

  try {
    switchTab('torrents');
    await startTorrent(item.magnet);
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('🧲 Download Recomendado Iniciado!', {
        body: `Iniciando download de "${item.title}" na sua pasta de Torrents!`,
        icon: '../assets/icon.svg'
      });
    }
  } catch (err) {
    alert(`Erro ao iniciar download: ${err.message}`);
  }
};

// ── KEYBOARD SHORTCUTS ─────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey) {
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      switchTab('home');
      urlInput.focus();
      urlInput.select();
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      switchTab('downloads');
      dlUrl.focus();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      switchTab('torrents');
      if (torrentUrl) torrentUrl.focus();
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      switchTab('google');
      if (googleUrlInput) {
        googleUrlInput.focus();
        googleUrlInput.select();
      }
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      switchTab('explore');
      if (exploreSearchInput) {
        exploreSearchInput.focus();
        exploreSearchInput.select();
      }
    } else if (e.key === ',' ) {
      e.preventDefault();
      switchTab('settings');
    }
  }
  if (e.key === 'Escape') {
    if (!modalDownload.classList.contains('hidden')) closeModal();
  }
});

// ── INIT ───────────────────────────────────────────────────────────────────
async function init() {
  await loadTheme();
  await loadDownloadPath();

  const defaultFmt = await api.getDefaultFormat();
  if (defaultFmt) {
    dlFormat.value          = defaultFmt;
    setDefaultFormat.value  = defaultFmt;
    modalFormat.value       = defaultFmt;
  }

  // Carregar torrents salvos e restaurar estado anterior
  try {
    if (api && api.getTorrents) {
      const savedTorrents = await api.getTorrents();
      if (Array.isArray(savedTorrents) && savedTorrents.length > 0) {
        for (const t of savedTorrents) {
          torrents.set(t.id, t);
          renderTorrentCard(t);
        }
        updateTorrentBadge();
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar torrents existentes:', err);
  }

  // Inicializar catalogo de recomendacoes
  updateExploreCategoryCounts();
  renderExploreCards(RECOMMENDATIONS);

  // Initial tab
  switchTab('home');
}

init().catch(console.error);
