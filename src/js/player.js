// ===== Módulo: Player de música (rodapé fp-bar) =====
// Controla YouTube Music e YouTube via executeJavaScript.
// Depende de: FP_SELS (js/player-selectors.js), switchTab e fpDismissed (renderer.js)

// ===== Meta da música: capa + cor dominante pro dashboard =====
let lastDashColor = '';
function applyDominantColor(imgUrl) {
  if (!imgUrl || imgUrl === lastDashColor) return;
  lastDashColor = imgUrl;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 24;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 24, 24);
      const d = ctx.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        // ignora pixels muito escuros/quase brancos
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum > 30 && lum < 235) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      }
      if (!n) return;
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
      // satura um pouco pra ficar vibrante
      const f = 1.35;
      const sr = Math.min(255, Math.round(r * f)), sg = Math.min(255, Math.round(g * f)), sb = Math.min(255, Math.round(b * f));
      const hero = document.querySelector('.dash-hero');
      if (hero) hero.style.background = `linear-gradient(135deg, rgba(${sr},${sg},${sb},.28), rgba(${sb},${sr},${sg},.18), rgba(${sg},${sb},${sr},.14))`;
      document.documentElement.style.setProperty('--dash-glow', `rgba(${sr},${sg},${sb},.35)`);
    } catch (e) { /* imagem sem CORS — mantém cor padrão */ }
  };
  img.src = imgUrl;
}

const FP_META_MUSIC_JS = FP_SELS.ytmMeta;
const FP_META_YT_JS = FP_SELS.ytMeta;

async function pollMusicMeta() {
  const wv = document.getElementById('music-player');
  const ytWv = document.getElementById('youtube-player');
  if (!wv) return;
  try {
    let meta = await wv.executeJavaScript(FP_META_MUSIC_JS, true).catch(() => null);
    // sem música no YTM → tenta metadados do YouTube (aba de vídeo)
    if (!meta || (!meta.title && !meta.artist && !meta.cover)) {
      const ytMeta = ytWv ? await ytWv.executeJavaScript(FP_META_YT_JS, true).catch(() => null) : null;
      if (ytMeta && (ytMeta.title || ytMeta.artist)) meta = ytMeta;
    }
    if (meta && (meta.title || meta.artist)) {
      const fpTitle = document.getElementById('fp-title');
      const fpArtist = document.getElementById('fp-artist');
      if (fpTitle && meta.title) fpTitle.textContent = meta.title;
      if (fpArtist) fpArtist.textContent = meta.artist || '';
      if (meta.title) document.title = `TurboDown — ${meta.title}`;
    }
    if (meta && meta.cover) {
      lastFpCover = meta.coverHQ || meta.cover;
      const fpCover = document.getElementById('fp-cover');
      if (fpCover && fpCover.dataset.src !== meta.cover) {
        fpCover.dataset.src = meta.cover;
        fpCover.src = meta.cover;
        applyPlayerColor(meta.cover);
      }
      const reopenCover = document.getElementById('fp-reopen-cover');
      if (reopenCover && reopenCover.dataset.src !== lastFpCover) {
        reopenCover.dataset.src = lastFpCover;
        reopenCover.src = lastFpCover;
        reopenCover.classList.remove('hidden');
        document.getElementById('fp-reopen')?.classList.add('has-cover');
      }
      // Card "Agora tocando" no dashboard — capa em alta qualidade
      const dnp = document.getElementById('dash-nowplaying');
      if (dnp) {
        dnp.classList.remove('hidden');
        const dnpCover = document.getElementById('dnp-cover');
        const hq = meta.coverHQ || meta.cover;
        if (dnpCover && dnpCover.dataset.src !== hq) {
          dnpCover.dataset.src = hq;
          dnpCover.onerror = () => { if (meta.cover && dnpCover.src !== meta.cover) dnpCover.src = meta.cover; };
          dnpCover.src = hq;
        }
        const dnpT = document.getElementById('dnp-title');
        const dnpA = document.getElementById('dnp-artist');
        if (dnpT && meta.title) dnpT.textContent = meta.title;
        if (dnpA) dnpA.textContent = meta.artist || '';
      }
      applyDominantColor(meta.cover);
      syncDashHero();
    }
  } catch (e) { /* webview ocupado */ }
}
setInterval(pollMusicMeta, 5000);
pollMusicMeta();

// ── Player funcional: controla o <video> do YouTube Music ou do YouTube ──
let fpSrc = null; // 'music' | 'yt' | null — qual webview tem o vídeo ativo
function fpWv() {
  if (fpSrc === 'yt') return document.getElementById('youtube-player');
  return document.getElementById('music-player');
}
function fpExec(js, wvOverride) {
  const wv = wvOverride || fpWv();
  if (!wv) return Promise.resolve(null);
  return wv.executeJavaScript(js, true).catch(() => null);
}
function fpFmt(s) {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
async function fpToggle() {
  await fpExec(`(() => { const v = ${FP_SELS.video}; if (v) v.paused ? v.play() : v.pause(); })()`);
}
async function fpSeek(frac) {
  await fpExec(`(() => { const v = ${FP_SELS.video}; if (v && v.duration) v.currentTime = v.duration * ${frac}; })()`);
}
document.querySelector('.fp-disc-wrap')?.addEventListener('click', () => switchTab(fpSrc === 'yt' ? 'home' : 'music'));
document.getElementById('dash-nowplaying')?.addEventListener('click', () => switchTab(fpSrc === 'yt' ? 'home' : 'music'));

// ── Letra da música (LRCLIB) ──
const fpLyricsBtn = document.getElementById('fp-lyrics');
const fpLyricsModal = document.getElementById('fp-lyrics-modal');
const fpLyricsBody = document.getElementById('fp-lyrics-body');
const fpLyricsTitle = document.getElementById('fp-lyrics-title');
function stripLrc(s) {
  return s.split('\n').map(l => l.replace(/^\[\d+:[\d.]+\]\s?/, '')).join('\n').trim();
}
fpLyricsBtn?.addEventListener('click', async () => {
  if (!fpLyricsModal) return;
  fpLyricsModal.classList.remove('hidden');
  const title = (document.getElementById('fp-title')?.textContent || '').trim();
  const artistRaw = (document.getElementById('fp-artist')?.textContent || '').trim();
  const artist = artistRaw.split('•')[0].split('-')[0].trim();
  fpLyricsTitle.textContent = title || 'Letra';
  fpLyricsBody.textContent = 'Buscando letra...';
  if (!title) { fpLyricsBody.textContent = 'Nenhuma música tocando.'; return; }
  try {
    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const lyrics = data.plainLyrics || (data.syncedLyrics ? stripLrc(data.syncedLyrics) : '');
    fpLyricsBody.textContent = lyrics || 'Letra não encontrada.';
  } catch (e) {
    fpLyricsBody.textContent = 'Letra não encontrada para esta música.';
  }
});
document.getElementById('fp-lyrics-close')?.addEventListener('click', () => fpLyricsModal?.classList.add('hidden'));
fpLyricsModal?.addEventListener('click', (e) => { if (e.target === fpLyricsModal) fpLyricsModal.classList.add('hidden'); });
document.getElementById('fp-play')?.addEventListener('click', fpToggle);
document.getElementById('fp-prev')?.addEventListener('click', () => {
  fpExec(`${FP_SELS.prev}?.click()`);
});
document.getElementById('fp-next')?.addEventListener('click', () => {
  fpExec(`${FP_SELS.next}?.click()`);
});
document.getElementById('fp-shuffle')?.addEventListener('click', function () {
  fpExec(`${FP_SELS.shuffle}?.click()`);
  this.classList.toggle('active');
});
document.getElementById('fp-repeat')?.addEventListener('click', function () {
  fpExec(`${FP_SELS.repeat}?.click()`);
  this.classList.toggle('active');
});
// Temas do player — cicla e persiste (0-5 = cores, t = transparente)
const FP_THEMES = ['fp-theme-0','fp-theme-1','fp-theme-2','fp-theme-3','fp-theme-4','fp-theme-5','fp-theme-t'];
function syncFpReopenColor() {
  const reopen = document.getElementById('fp-reopen');
  const bar = document.getElementById('fp-bar');
  if (!reopen || !bar) return;
  const cs = getComputedStyle(bar);
  const a = cs.getPropertyValue('--fp-accent').trim() || '#7ab8ff';
  const a2 = cs.getPropertyValue('--fp-accent2').trim() || '#a78bfa';
  reopen.style.background = `linear-gradient(135deg, ${a}, ${a2})`;
  reopen.style.boxShadow = `0 6px 20px ${a}66, 0 2px 8px rgba(0,0,0,.4)`;
}
function fpSetTheme(name) {
  const bar = document.getElementById('fp-bar');
  if (!bar) return;
  FP_THEMES.forEach(c => bar.classList.remove(c));
  bar.classList.add(name);
  syncFpReopenColor();
  try { localStorage.setItem('td-fp-theme', name); } catch (e) {}
}
document.getElementById('fp-theme')?.addEventListener('click', function () {
  const bar = document.getElementById('fp-bar');
  const cur = FP_THEMES.findIndex(c => bar.classList.contains(c));
  fpSetTheme(FP_THEMES[(cur + 1) % FP_THEMES.length]);
});
(function () {
  try {
    const t = localStorage.getItem('td-fp-theme');
    if (t && FP_THEMES.includes(t)) fpSetTheme(t);
  } catch (e) {}
})();
document.querySelector('.fp-progress')?.addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  fpSeek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
});

// Volume + mudo
const fpVol = document.getElementById('fp-vol');
const fpMute = document.getElementById('fp-mute');
fpVol?.addEventListener('input', () => {
  fpExec(`(() => { const v = ${FP_SELS.video}; if (v) { v.volume = ${fpVol.value / 100}; v.muted = false; } })()`);
});
fpMute?.addEventListener('click', function () {
  fpExec(`(() => { const v = ${FP_SELS.video}; if (v) v.muted = !v.muted; return v ? v.muted : null; })()`)
    .then(m => { if (m !== null) syncMuteIcon(!!m); });
});
function syncMuteIcon(muted) {
  document.querySelectorAll('.fp-vol-waves').forEach(el => el.style.display = muted ? 'none' : '');
  document.querySelectorAll('.fp-vol-x').forEach(el => el.style.display = muted ? '' : 'none');
}

// Cor customizada do player
const fpColorBtn = document.getElementById('fp-color');
const fpColorInput = document.getElementById('fp-color-input');
fpColorBtn?.addEventListener('click', () => fpColorInput?.click());
fpColorInput?.addEventListener('input', () => {
  const hex = fpColorInput.value;
  const bar = document.getElementById('fp-bar');
  if (!bar) return;
  // accent2 = versão mais clara do accent
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 60), g = Math.min(255, ((n >> 8) & 255) + 60), b = Math.min(255, (n & 255) + 60);
  const c2 = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  bar.style.setProperty('--fp-accent', hex);
  bar.style.setProperty('--fp-accent2', c2);
  syncFpReopenColor();
  try { localStorage.setItem('td-fp-custom', hex); } catch (e) {}
});
(function () {
  try {
    const c = localStorage.getItem('td-fp-custom');
    if (c) {
      const bar = document.getElementById('fp-bar');
      const n = parseInt(c.slice(1), 16);
      const r = Math.min(255, ((n >> 16) & 255) + 60), g = Math.min(255, ((n >> 8) & 255) + 60), b = Math.min(255, (n & 255) + 60);
      if (bar) {
        bar.style.setProperty('--fp-accent', c);
        bar.style.setProperty('--fp-accent2', `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`);
        syncFpReopenColor();
      }
    }
  } catch (e) {}
})();
// Trocar de tema limpa a cor customizada
const _fpThemeBtn = document.getElementById('fp-theme');
_fpThemeBtn?.addEventListener('click', () => {
  const bar = document.getElementById('fp-bar');
  bar?.style.removeProperty('--fp-accent');
  bar?.style.removeProperty('--fp-accent2');
  syncFpReopenColor();
  try { localStorage.removeItem('td-fp-custom'); } catch (e) {}
}, true);

// Cor dominante da capa → accent do player (se não houver cor custom)
let lastFpColorSrc = '';
function applyPlayerColor(imgUrl) {
  if (!imgUrl || imgUrl === lastFpColorSrc) return;
  lastFpColorSrc = imgUrl;
  try { if (localStorage.getItem('td-fp-custom')) return; } catch (e) {}
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 24;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 24, 24);
      const d = ctx.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum > 30 && lum < 235) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      }
      if (!n) return;
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
      const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
      const bar = document.getElementById('fp-bar');
      if (!bar) return;
      const r2 = Math.min(255, r + 60), g2 = Math.min(255, g + 60), b2 = Math.min(255, b + 60);
      bar.style.setProperty('--fp-accent', hex);
      bar.style.setProperty('--fp-accent2', `#${((r2 << 16) | (g2 << 8) | b2).toString(16).padStart(6, '0')}`);
      syncFpReopenColor();
    } catch (e) {}
  };
  img.src = imgUrl;
}

// Atalhos de teclado do player (quando o app está com foco)
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag) || e.ctrlKey || e.altKey || e.metaKey) return;
  const bar = document.getElementById('fp-bar');
  if (!bar || bar.classList.contains('hidden')) return;
  if (e.code === 'Space') { e.preventDefault(); fpToggle(); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); fpSeekBy(5); }
  else if (e.code === 'ArrowLeft') { e.preventDefault(); fpSeekBy(-5); }
  else if (e.code === 'ArrowUp') { e.preventDefault(); fpVolBump(0.05); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); fpVolBump(-0.05); }
  else if (e.key === 'm' || e.key === 'M') fpMute?.click();
});
function fpSeekBy(sec) {
  fpExec(`(() => { const v = ${FP_SELS.video}; if (v && v.duration) v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + ${sec})); })()`);
}
function fpVolBump(d) {
  if (!fpVol) return;
  fpVol.value = Math.min(100, Math.max(0, parseInt(fpVol.value, 10) + Math.round(d * 100)));
  fpVol.dispatchEvent(new Event('input'));
}

// Poll 1s: estado do vídeo → barra + progresso + play/pause
// Verifica YouTube Music e YouTube — prefere o que está tocando
const FP_STATE_JS = `(() => { const v = ${FP_SELS.video}; if (!v || !v.duration) return null; return { paused: v.paused, t: v.currentTime, d: v.duration }; })()`;
let fpPlayingNow = false;
let lastFpCover = '';
function syncDashHero() {
  const hc = document.getElementById('dash-hero-cover');
  if (!hc) return;
  const on = fpPlayingNow && !!lastFpCover;
  if (on && hc.dataset.src !== lastFpCover) {
    hc.dataset.src = lastFpCover;
    hc.style.backgroundImage = `url(${lastFpCover})`;
  }
  hc.classList.toggle('on', on);
  document.body.classList.toggle('dash-cover-on', on);
  document.getElementById('dash-nowplaying')?.classList.toggle('playing', on);
  const hero = document.querySelector('.dash-hero');
  if (hero) hero.style.background = on ? 'transparent' : '';
}
setInterval(async () => {
  const bar = document.getElementById('fp-bar');
  if (!bar) return;
  const musicWv = document.getElementById('music-player');
  const ytWv = document.getElementById('youtube-player');
  const stM = await fpExec(FP_STATE_JS, musicWv);
  const stY = await fpExec(FP_STATE_JS, ytWv);
  // prefere o webview com vídeo tocando; empate → YouTube Music
  const useYt = !!(stY && (!stM || (stM.paused && !stY.paused)));
  const st = useYt ? stY : stM;
  fpSrc = st ? (useYt ? 'yt' : 'music') : null;
  fpPlayingNow = !!(st && !st.paused);
  document.getElementById('fp-reopen')?.classList.toggle('playing', fpPlayingNow);
  syncDashHero();
  if (!st) {
    fpDismissed = false;
    document.getElementById('dash-nowplaying')?.classList.add('hidden');
    return;
  }
  // vídeo do YouTube Music tocando → garante a barra visível (se não minimizada)
  if (bar.classList.contains('hidden') && !fpDismissed) {
    bar.classList.remove('hidden');
    document.body.classList.add('fp-visible');
    document.getElementById('fp-reopen')?.classList.add('hidden');
  }
  const fill = document.getElementById('fp-progress-fill');
  if (fill) fill.style.width = `${Math.min(100, (st.t / st.d) * 100)}%`;
  const cur = document.getElementById('fp-cur'), dur = document.getElementById('fp-dur');
  if (cur) cur.textContent = fpFmt(st.t);
  if (dur) dur.textContent = fpFmt(st.d);
  const icoPlay = document.getElementById('fp-ico-play');
  const icoPause = document.getElementById('fp-ico-pause');
  if (icoPlay && icoPause) {
    icoPlay.style.display = st.paused ? '' : 'none';
    icoPause.style.display = st.paused ? 'none' : '';
  }
  document.querySelector('.fp-disc-wrap')?.classList.toggle('playing', !st.paused);
  bar.classList.toggle('playing', !st.paused);
  // Sincroniza volume/mudo do YouTube Music ↔ player em tempo real
  fpExec(`(() => { const v = ${FP_SELS.video}; if (!v) return null; return { muted: v.muted, vol: Math.round(v.volume * 100) }; })()`)
    .then(s => {
      if (s === null) return;
      syncMuteIcon(!!s.muted);
      if (fpVol && document.activeElement !== fpVol && String(fpVol.value) !== String(s.vol)) fpVol.value = s.vol;
    });
}, 1000);
