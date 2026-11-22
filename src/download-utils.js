'use strict';

const AUDIO_FORMATS = Object.freeze(['mp3', 'm4a', 'opus']);
const HEIGHTS = Object.freeze({
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360
});
const VIDEO_FORMATS = Object.freeze(Object.keys(HEIGHTS));
const DOWNLOAD_ID_PATTERN = /^dl-\d+-[a-z0-9]+$/i;

function isSupportedFormat(format) {
  return Object.prototype.hasOwnProperty.call(HEIGHTS, format) || AUDIO_FORMATS.includes(format);
}

function isAudioFormat(format) {
  return AUDIO_FORMATS.includes(format);
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
  if (input.outputPath !== undefined && (typeof input.outputPath !== 'string' || !input.outputPath.trim())) {
    throw new Error('Pasta de destino inválida.');
  }

  return {
    url,
    format,
    downloadId,
    downloadPlaylist: input.downloadPlaylist !== false,
    outputPath: input.outputPath,
    subs: input.subs === true,
    thumbnail: input.thumbnail === true,
    mp3Quality: input.mp3Quality || '320k',
    speedLimit: typeof input.speedLimit === 'string' && input.speedLimit.trim()
      ? input.speedLimit.trim()
      : null,
    playlistItems: typeof input.playlistItems === 'string' && /^[\d,\-–]+$/.test(input.playlistItems.trim())
      ? input.playlistItems.trim()
      : null
  };
}

function getFormatArgs(format, options = {}) {
  const { subs = false, thumbnail = false, mp3Quality = '320k' } = options;
  const args = [];

  if (subs) {
    args.push('--write-subs', '--write-auto-subs');
  }

  if (thumbnail) {
    args.push('--write-thumbnail');
  }

  if (AUDIO_FORMATS.includes(format)) {
    if (format === 'mp3') {
      args.push('--extract-audio', '--audio-format', format, '--audio-quality', mp3Quality);
    } else {
      args.push('--extract-audio', '--audio-format', format, '--audio-quality', '0');
    }
  } else {
    if (!Object.prototype.hasOwnProperty.call(HEIGHTS, format)) {
      throw new Error('Formato de download não suportado.');
    }

    const height = HEIGHTS[format];
    args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`, '--merge-output-format', 'mp4');
  }

  return args;
}

function formatDownloadError(stderr, code) {
  const lines = String(stderr || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const detail = [...lines].reverse().find(line => /\bERROR:/i.test(line)) || lines[lines.length - 1] || '';
  const message = detail.replace(/^.*?\bERROR:\s*/i, '').trim();
  const normalized = message.toLowerCase();

  if (/ffmpeg.*(not found|not installed|missing)|ffmpeg não encontrado/.test(normalized)) {
    return 'O FFmpeg não foi encontrado. Instale-o e tente novamente.';
  }
  if (/failed to decrypt with dpapi|cookies.*decrypt|could not decrypt/.test(normalized)) {
    return 'Não foi possível ler os cookies do navegador. Use Firefox nas configurações ou um arquivo cookies.txt.';
  }
  if (/private|unavailable|has been removed|video unavailable/.test(normalized)) {
    return 'Este vídeo está privado, indisponível ou foi removido.';
  }
  if (/requested format is not available|requested format not available/.test(normalized)) {
    return 'A qualidade solicitada não está disponível para este vídeo. Tente outra qualidade.';
  }
  if (/http error 403|http error 429|too many requests|forbidden/.test(normalized)) {
    return 'O site recusou o acesso ao vídeo. Atualize o yt-dlp e tente novamente mais tarde.';
  }
  if (/timed out|temporary failure|name or service not known|network is unreachable|connection refused/.test(normalized)) {
    return 'Falha de conexão. Verifique a internet e tente novamente.';
  }
  if (/permission denied|access is denied|winerror 5/.test(normalized)) {
    return 'Sem permissão para gravar na pasta escolhida. Selecione outra pasta.';
  }
  if (message) {
    return `Não foi possível concluir o download: ${message}`;
  }
  return `O yt-dlp encerrou com erro${Number.isInteger(code) ? ` (código ${code})` : ''}. Verifique a conexão e tente novamente.`;
}

module.exports = {
  AUDIO_FORMATS,
  VIDEO_FORMATS,
  formatDownloadError,
  getFormatArgs,
  isAudioFormat,
  isSupportedFormat,
  validateDownloadRequest,
  validateHttpUrl
};
