'use strict';

const TRACKER_DOMAINS = Object.freeze([
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'adservice.google.com',
  'facebook.net',
  'connect.facebook.net',
  'scorecardresearch.com',
  'hotjar.com',
  'segment.io',
  'segment.com',
  'mixpanel.com',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'adnxs.com',
  'adsrvr.org',
  'amazon-adsystem.com',
  'quantserve.com',
  'omnitagjs.com',
  'programmaticx.ai',
  'sonobi.com',
  'balance-x.com'
]);

const AD_DOMAINS = Object.freeze([
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'adnxs.com',
  'adsrvr.org',
  'amazon-adsystem.com',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'revcontent.com',
  'mgid.com',
  'zedo.com',
  'adform.net',
  'adroll.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'smartadserver.com',
  '33across.com',
  'sharethrough.com',
  'teads.tv',
  'advertising.com',
  'admanmedia.com',
  'moatads.com',
  'doubleverify.com',
  'adsafeprotected.com',
  'serving-sys.com',
  'adcolony.com',
  'applovin.com',
  'inmobi.com',
  'vungle.com',
  'pokkt.com',
  'startapp.com',
  'adfurikun.com',
  'mopub.com',
  'chartboost.com',
  'fyber.com',
  'ironsrc.com',
  'supersonicads.com',
  'tapjoy.com',
  'yahoo.com/ads',
  'ads.yahoo.com',
  'advertising.com',
  'adtech',
  'adserver',
  'adserver2',
  'adxpansion',
  'admotion',
  'adskeeper',
  'adtechus',
  'adswizz',
  'adup-tech',
  'aerserv',
  'adman',
  'admanmedia',
  'admarket',
  'admatrix',
  'admixer',
  'adnxs-simple',
  'adotmob',
  'adroll',
  'adswizz'
]);

const AD_PATH_PATTERNS = Object.freeze([
  /\/pagead\//i,
  /\/ads\//i,
  /\/adserver\//i,
  /\/advertisement\//i,
  /\/banner\//i,
  /\/popunder\//i,
  /\/sponsor\//i,
  /\/tracking\/ad/i,
  /[?&](ad|ads|adunit|adunitid|adslot|adtest)=/i
]);

function resolveNavigationTarget(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!value) return 'https://www.google.com/';

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    return validateWebUrl(value);
  }

  const looksLikeHost = !/\s/.test(value) && (
    value.includes('.') ||
    /^localhost(?::\d+)?(?:\/|$)/i.test(value) ||
    /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/|$)/.test(value)
  );
  if (looksLikeHost) {
    try {
      return validateWebUrl(`https://${value}`);
    } catch (error) {
      if (value.includes('://')) throw error;
    }
  }

  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

function validateWebUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Digite um endereço web válido ou um termo para pesquisar.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('A navegação aceita somente endereços HTTP ou HTTPS sem credenciais.');
  }
  return parsed.href;
}

function isTrackerRequest(requestUrl) {
  let hostname;
  try {
    hostname = new URL(requestUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return TRACKER_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

function isAdRequest(requestUrl) {
  let parsed;
  try {
    parsed = new URL(requestUrl);
  } catch {
    return false;
  }
  const hostname = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  // Bloqueia domínios de ads conhecidos
  if (AD_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`) || hostname.includes(domain))) {
    return true;
  }

  // Bloqueia padrões de caminho comuns de ads
  return AD_PATH_PATTERNS.some(pattern => pattern.test(path) || pattern.test(requestUrl));
}

// YouTube serve anúncios de vídeo pelo mesmo domínio do conteúdo (googlevideo.com).
// A diferença é que requests de ad carregam os parâmetros 'oad' ou 'adformat'.
function isYouTubeAdStream(requestUrl) {
  let parsed;
  try {
    parsed = new URL(requestUrl);
  } catch {
    return false;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith('googlevideo.com')) return false;
  if (!parsed.pathname.includes('videoplayback')) return false;
  return /[?&](oad|adformat|oadb)=/.test(requestUrl);
}

module.exports = {
  isAdRequest,
  isTrackerRequest,
  isYouTubeAdStream,
  resolveNavigationTarget
};
