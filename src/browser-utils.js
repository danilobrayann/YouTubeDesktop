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

module.exports = {
  isTrackerRequest,
  resolveNavigationTarget
};
