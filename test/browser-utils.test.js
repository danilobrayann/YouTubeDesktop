'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { isAdRequest, isTrackerRequest, isYouTubeAdStream, resolveNavigationTarget } = require('../src/browser-utils');

test('resolves addresses and search terms safely', () => {
  assert.equal(resolveNavigationTarget('example.com'), 'https://example.com/');
  assert.equal(resolveNavigationTarget('localhost:3000'), 'https://localhost:3000/');
  assert.equal(
    resolveNavigationTarget('vídeos de música'),
    `https://www.google.com/search?q=${encodeURIComponent('vídeos de música')}`
  );
  assert.throws(() => resolveNavigationTarget('file:///C:/private.txt'), /HTTP ou HTTPS/);
});

test('blocks known ad and tracking hosts without matching lookalikes', () => {
  assert.equal(isTrackerRequest('https://www.google-analytics.com/collect'), true);
  assert.equal(isTrackerRequest('https://sub.doubleclick.net/ad.js'), true);
  assert.equal(isTrackerRequest('https://visitor-px.omnitagjs.com/visitor/bsync'), true);
  assert.equal(isTrackerRequest('https://sync.programmaticx.ai/api/cookie'), true);
  assert.equal(isTrackerRequest('https://sync.go.sonobi.com/uc.html'), true);
  assert.equal(isTrackerRequest('https://tracker.ssp.balance-x.com/'), true);
  assert.equal(isTrackerRequest('https://notdoubleclick.net/ad.js'), false);
  assert.equal(isTrackerRequest('https://notomnitagjs.com/ad.js'), false);
  assert.equal(isTrackerRequest('not a url'), false);
});

test('blocks ad domains and ad paths without matching lookalikes', () => {
  assert.equal(isAdRequest('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), true);
  assert.equal(isAdRequest('https://ad.doubleclick.net/ddm/trackimp.js'), true);
  assert.equal(isAdRequest('https://servedby.adnxs.com/seg?add=1'), true);
  assert.equal(isAdRequest('https://ads.pubmatic.com/AdServer/js/user_sync.html'), true);
  assert.equal(isAdRequest('https://example.com/pagead/advertisement.js'), true);
  assert.equal(isAdRequest('https://example.com/?adunit=123&adslot=top'), true);
  assert.equal(isAdRequest('https://normal-site.com/article/123'), false);
  assert.equal(isAdRequest('https://myblog.com/reading-list'), false);
  assert.equal(isAdRequest('https://youtube.com/watch?v=abc123'), false);
  assert.equal(isAdRequest('not a url'), false);
});

test('detects YouTube ad streams by oad/adformat params', () => {
  assert.equal(isYouTubeAdStream('https://rr1---sn.googlevideo.com/videoplayback?oad=1&expire=123'), true);
  assert.equal(isYouTubeAdStream('https://rr1---sn.googlevideo.com/videoplayback?foo=bar&adformat=2'), true);
  assert.equal(isYouTubeAdStream('https://rr1---sn.googlevideo.com/videoplayback?expire=123&ip=1.2.3.4'), false);
  assert.equal(isYouTubeAdStream('https://example.com/videoplayback?oad=1'), false);
  assert.equal(isYouTubeAdStream('not a url'), false);
});
