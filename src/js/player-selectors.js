// Centraliza TODOS os seletores do YouTube / YouTube Music usados pelo player.
// Se o YouTube mudar o DOM, conserte AQUI — não precisa caçar no app inteiro.
// Cada valor é um fragmento de JS executado DENTRO do webview (string).
window.FP_SELS = {
  // Vídeo principal — varre TODOS os <video> da página (YouTube tem vários:
  // player principal, ambient mode, previews). Prefere o que está tocando;
  // em empate, o de maior duração. Funciona no YTM e no YouTube.
  video: `(() => {
    const vids = Array.from(document.querySelectorAll('video'));
    let pick = null;
    for (const v of vids) {
      if (!v.duration) continue;
      if (!pick || (pick.paused && !v.paused) || (pick.paused === v.paused && v.duration > pick.duration)) pick = v;
    }
    return pick || document.querySelector('video.html5-main-video') || document.querySelector('video');
  })()`,

  // Player bar do YouTube Music
  ytmBar: `document.querySelector('ytmusic-player-bar')`,

  // Controles — YTM primeiro, YouTube (.ytp-*) como fallback
  prev: `document.querySelector('ytmusic-player-bar .previous-button, ytmusic-player-bar [class*="previous"], .ytp-prev-button')`,
  next: `document.querySelector('ytmusic-player-bar .next-button, ytmusic-player-bar [class*="next"], .ytp-next-button')`,
  shuffle: `document.querySelector('ytmusic-player-bar .shuffle-button, ytmusic-player-bar [class*="shuffle"], [aria-label*="huffle" i]')`,
  repeat: `document.querySelector('ytmusic-player-bar .repeat-button, ytmusic-player-bar [class*="repeat"], [aria-label*="epeat" i]')`,

  // Meta do YTM (capa/título/artista na player bar)
  ytmMeta: `(() => {
    const bar = document.querySelector('ytmusic-player-bar');
    const img = bar ? bar.querySelector('img') : null;
    const titleEl = bar ? bar.querySelector('.title') : null;
    const subEl = bar ? bar.querySelector('.subtitle') : null;
    const cover = img ? (img.src || img.getAttribute('src')) : '';
    const sub = subEl ? subEl.textContent.trim() : '';
    return {
      cover: cover || '',
      title: titleEl ? titleEl.textContent.trim() : '',
      artist: sub.split('\\u2022')[0].trim() || sub.split(' - ')[0].trim() || ''
    };
  })()`,

  // Meta do YouTube — /watch usa seletores da página; outras rotas
  // (/shorts, links do YTM abertos aqui) caem no título da aba.
  ytMeta: `(() => {
    const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (!v || v.paused) return null;
    const videoId = new URLSearchParams(location.search).get('v') || '';
    let title = '', artist = '';
    if (location.pathname.startsWith('/watch')) {
      const titleEl = document.querySelector('h1 yt-formatted-string, #title h1 yt-formatted-string, h1');
      const chEl = document.querySelector('#channel-name a, ytd-channel-name a, .ytd-channel-name a, #owner ytd-channel-name a');
      title = titleEl ? titleEl.textContent.trim() : '';
      artist = chEl ? chEl.textContent.trim() : '';
    }
    if (!title) title = (document.title || '').replace(/ - YouTube$/, '').replace(/ \\| YouTube$/, '').trim();
    const poster = v.poster || '';
    return {
      cover: videoId ? 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg' : poster,
      coverHQ: videoId ? 'https://i.ytimg.com/vi/' + videoId + '/maxresdefault.jpg' : poster,
      title, artist
    };
  })()`,
};
