'use strict';

const AUDIO_FORMATS = Object.freeze(['mp3', 'm4a', 'opus']);
const HEIGHTS = Object.freeze({
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360
});
const DOWNLOAD_ID_PATTERN = /^dl-\d+-[a-z0-9]+$/i;

function isSupportedFormat(format) {
  return Object.prototype.hasOwnProperty.call(HEIGHTS, format) || AUDIO_FORMATS.includes(format);
}

function validateHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 8192) {
    throw new Error('Informe uma URL HTTP ou HTTPS válida.');
  }

  const trimmed = value.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Informe uma URL HTTP ou HTTPS válida.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('A URL precisa usar HTTP ou HTTPS e não pode conter credenciais.');
  }

  return trimmed;
}

function validateDownloadRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Solicitação de download inválida.');
  }

  const url = validateHttpUrl(input.url);
  const format = input.format;
  const downloadId = input.downloadId;

  if (!isSupportedFormat(format)) {
    throw new Error('Formato de download não suportado.');
  }
  if (typeof downloadId !== 'string' || !DOWNLOAD_ID_PATTERN.test(downloadId)) {
    throw new Error('Identificador de download inválido.');
  }
  if (input.downloadPlaylist !== undefined && typeof input.downloadPlaylist !== 'boolean') {
    throw new Error('Opção de playlist inválida.');
  }

  return {
    url,
    format,
    downloadId,
    downloadPlaylist: input.downloadPlaylist !== false
  };
}

function getFormatArgs(format) {
  if (AUDIO_FORMATS.includes(format)) {
    return ['--extract-audio', '--audio-format', format, '--audio-quality', '0'];
  }

  if (!Object.prototype.hasOwnProperty.call(HEIGHTS, format)) {
    throw new Error('Formato de download não suportado.');
  }

  const height = HEIGHTS[format];
  return ['-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`, '--merge-output-format', 'mp4'];
}

module.exports = {
  AUDIO_FORMATS,
  getFormatArgs,
  isSupportedFormat,
  validateDownloadRequest,
  validateHttpUrl
};
