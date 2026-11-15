'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { isTrackerRequest, resolveNavigationTarget } = require('../src/browser-utils');

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
  assert.equal(isTrackerRequest('https://notdoubleclick.net/ad.js'), false);
  assert.equal(isTrackerRequest('not a url'), false);
});
