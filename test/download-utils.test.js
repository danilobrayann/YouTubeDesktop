'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  formatDownloadError,
  getFormatArgs,
  isAudioFormat,
  validateDownloadRequest,
  validateHttpUrl
} = require('../src/download-utils');

test('accepts HTTP and HTTPS download URLs', () => {
  assert.equal(validateHttpUrl(' https://example.com/video?id=1 '), 'https://example.com/video?id=1');
  assert.equal(validateHttpUrl('http://example.com/video'), 'http://example.com/video');
});

test('rejects non-web URLs and credentials', () => {
  for (const url of ['', 'file:///video.mp4', 'javascript:alert(1)', 'https://user:pass@example.com/video', 'not a URL']) {
    assert.throws(() => validateHttpUrl(url), /HTTP ou HTTPS/);
  }
});

test('validates download format and identifier', () => {
  const request = validateDownloadRequest({
    url: 'https://example.com/video',
    format: '720p',
    downloadId: 'dl-123456-abc123'
  });
  assert.equal(request.format, '720p');
  assert.equal(request.downloadPlaylist, true);

  assert.throws(() => validateDownloadRequest({
    url: 'https://example.com/video',
    format: 'invalid',
    downloadId: 'dl-123456-abc123'
  }), /Formato/);
  assert.throws(() => validateDownloadRequest({
    url: 'https://example.com/video',
    format: '720p',
    downloadId: 'bad-id'
  }), /Identificador/);
});

test('builds format arguments only for supported formats', () => {
  assert.deepEqual(getFormatArgs('mp3'), ['--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0']);
  assert.deepEqual(getFormatArgs('1080p'), ['-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]', '--merge-output-format', 'mp4']);
  assert.throws(() => getFormatArgs('invalid'), /Formato/);
  assert.throws(() => getFormatArgs('__proto__'), /Formato/);
});

test('identifies audio formats and provides actionable download errors', () => {
  assert.equal(isAudioFormat('mp3'), true);
  assert.equal(isAudioFormat('720p'), false);
  assert.match(formatDownloadError('ERROR: Requested format is not available', 1), /Tente outra qualidade/);
  assert.match(formatDownloadError('ERROR: ffmpeg not found', 1), /FFmpeg não foi encontrado/);
  assert.match(formatDownloadError('', 1), /código 1/);
});

test('rejects invalid destination paths in download requests', () => {
  assert.throws(() => validateDownloadRequest({
    url: 'https://example.com/video',
    format: '720p',
    downloadId: 'dl-123456-abc123',
    outputPath: ''
  }), /Pasta de destino/);
});
