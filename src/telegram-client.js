'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Cliente Telegram nativo sem dependências externas.
 * Utiliza a API oficial de bots do Telegram (HTTPS/fetch) para evitar bugs de empacotamento
 * com módulos legados (node-telegram-bot-api, request, call-bind-apply-helpers).
 */
class TelegramClient {
  constructor(token) {
    this.token = String(token || '').trim();
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
    this.polling = false;
    this.pollingTimer = null;
    this.textHandlers = [];
    this.lastUpdateId = 0;
  }

  async getMe() {
    const res = await fetch(`${this.baseUrl}/getMe`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Falha ao conectar com o Telegram');
    return data.result;
  }

  async sendMessage(chatId, text) {
    const res = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(chatId), text: String(text) })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Falha ao enviar mensagem');
    return data.result;
  }

  async sendVideo(chatId, filePath, options = {}) {
    return this._sendFile('sendVideo', 'video', chatId, filePath, options);
  }

  async sendAudio(chatId, filePath, options = {}) {
    return this._sendFile('sendAudio', 'audio', chatId, filePath, options);
  }

  async sendDocument(chatId, filePath, options = {}) {
    return this._sendFile('sendDocument', 'document', chatId, filePath, options);
  }

  async getFile(fileId) {
    const res = await fetch(`${this.baseUrl}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Falha ao obter arquivo');
    return data.result;
  }

  fileDownloadUrl(filePath) {
    return `https://api.telegram.org/file/bot${this.token}/${filePath}`;
  }

  async deleteMessage(chatId, messageId) {
    const res = await fetch(`${this.baseUrl}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(chatId), message_id: Number(messageId) })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Falha ao deletar mensagem');
    return data.result;
  }

  async _sendFile(endpoint, fieldName, chatId, filePath, options = {}) {
    const fileName = options.filename || path.basename(filePath);
    let blob;
    if (typeof fs.openAsBlob === 'function') {
      blob = await fs.openAsBlob(filePath);
    } else {
      blob = new Blob([fs.readFileSync(filePath)]);
    }
    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append(fieldName, blob, fileName);
    if (options.caption) {
      formData.append('caption', String(options.caption).slice(0, 1024));
    }
    const res = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || `Falha ao enviar ${fieldName}`);
    return data.result;
  }

  onText(regex, callback) {
    this.textHandlers.push({ regex, callback });
  }

  startPolling() {
    if (this.polling) return;
    this.polling = true;
    this._poll();
  }

  stopPolling() {
    this.polling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  async _poll() {
    if (!this.polling) return;
    try {
      const res = await fetch(`${this.baseUrl}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=5`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          if (update.update_id) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
          }
          const msg = update.message;
          if (msg && msg.text) {
            for (const { regex, callback } of this.textHandlers) {
              const match = msg.text.match(regex);
              if (match) {
                callback(msg, match);
              }
            }
          }
        }
      }
    } catch (_) {}

    if (this.polling) {
      this.pollingTimer = setTimeout(() => this._poll(), 1500);
    }
  }
}

module.exports = { TelegramClient };
