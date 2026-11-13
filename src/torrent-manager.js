'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Gerenciador de Torrents Integrado com Suporte a Segundo Plano e Retomada Automática
 */
class TorrentManager {
  constructor(store, getMainWindow, getDownloadPath) {
    this.store = store;
    this.getMainWindow = getMainWindow;
    this.getDownloadPath = getDownloadPath;
    this.client = null;
    this.torrents = new Map(); // id -> { clientTorrent, meta }
    this.updateInterval = null;

    this.initClient();
    this.loadSavedTorrents();
  }

  initClient() {
    try {
      const WebTorrent = require('webtorrent');
      this.client = new WebTorrent({
        maxConns: 55,
        dht: true
      });

      this.client.on('error', (err) => {
        console.error('[WebTorrent Error]', err.message);
      });

      // Intervalo de sincronização de progresso a cada 800ms
      this.updateInterval = setInterval(() => {
        this.broadcastProgress();
      }, 800);
    } catch (err) {
      console.warn('[TorrentManager] Módulo webtorrent não instalado ou indisponível:', err.message);
      this.client = null;
    }
  }

  isAvailable() {
    return this.client !== null;
  }

  getTorrentsFolder() {
    const base = this.getDownloadPath();
    const torrentsDir = path.join(base, 'Torrents');
    try {
      if (!fs.existsSync(torrentsDir)) {
        fs.mkdirSync(torrentsDir, { recursive: true });
      }
    } catch (e) {}
    return torrentsDir;
  }

  loadSavedTorrents() {
    const saved = this.store.get('torrents') || [];
    for (const item of saved) {
      // Se estava baixando ou pausado, recarrega
      if (item.source) {
        this.addTorrent(item.source, {
          id: item.id,
          customSavePath: item.savePath,
          autoResume: true,
          savedStatus: item.status
        }).catch(() => {});
      }
    }
  }

  saveToStore() {
    const list = [];
    for (const [id, item] of this.torrents.entries()) {
      list.push({
        id: item.id,
        source: item.source,
        name: item.name,
        savePath: item.savePath,
        progress: item.progress || 0,
        downloaded: item.downloaded || 0,
        total: item.total || 0,
        status: item.status || 'downloading',
        addedAt: item.addedAt || Date.now()
      });
    }
    this.store.set('torrents', list);
  }

  async addTorrent(torrentSource, options = {}) {
    if (!this.client) {
      throw new Error('Módulo WebTorrent ainda não instalado. Execute o instalador ou npm install.');
    }

    const id = options.id || `tor-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const savePath = options.customSavePath || this.getTorrentsFolder();

    return new Promise((resolve, reject) => {
      try {
        const torrent = this.client.add(torrentSource, { path: savePath }, (t) => {
          const item = this.torrents.get(id);
          if (item) {
            item.name = t.name;
            item.total = t.length;
            this.saveToStore();
            this.sendToRenderer('torrent-added', this.serializeTorrent(id));
          }
        });

        const meta = {
          id,
          source: torrentSource,
          name: typeof torrentSource === 'string' && !torrentSource.startsWith('magnet:') ? path.basename(torrentSource) : 'Carregando metadados...',
          savePath,
          status: options.savedStatus || 'downloading',
          progress: 0,
          downloaded: 0,
          total: 0,
          downloadSpeed: 0,
          uploadSpeed: 0,
          numPeers: 0,
          timeRemaining: 0,
          addedAt: Date.now(),
          torrentInstance: torrent
        };

        this.torrents.set(id, meta);

        torrent.on('ready', () => {
          meta.name = torrent.name;
          meta.total = torrent.length;
          this.saveToStore();
          this.sendToRenderer('torrent-ready', this.serializeTorrent(id));
        });

        torrent.on('done', () => {
          meta.status = 'complete';
          meta.progress = 100;
          this.saveToStore();
          this.sendToRenderer('torrent-done', this.serializeTorrent(id));
        });

        torrent.on('error', (err) => {
          meta.status = 'error';
          meta.errorMessage = err.message;
          this.sendToRenderer('torrent-error', { id, message: err.message });
        });

        this.saveToStore();
        resolve(this.serializeTorrent(id));
      } catch (err) {
        reject(err);
      }
    });
  }

  pauseTorrent(id) {
    const item = this.torrents.get(id);
    if (!item || !item.torrentInstance) return false;
    try {
      item.torrentInstance.pause();
      item.status = 'paused';
      this.saveToStore();
      this.sendToRenderer('torrent-updated', this.serializeTorrent(id));
      return true;
    } catch (e) {
      return false;
    }
  }

  resumeTorrent(id) {
    const item = this.torrents.get(id);
    if (!item || !item.torrentInstance) return false;
    try {
      item.torrentInstance.resume();
      item.status = 'downloading';
      this.saveToStore();
      this.sendToRenderer('torrent-updated', this.serializeTorrent(id));
      return true;
    } catch (e) {
      return false;
    }
  }

  removeTorrent(id, deleteFiles = false) {
    const item = this.torrents.get(id);
    if (!item) return false;

    if (item.torrentInstance) {
      try {
        this.client.remove(item.torrentInstance, { destroyStore: deleteFiles });
      } catch (e) {}
    }

    this.torrents.delete(id);
    this.saveToStore();
    this.sendToRenderer('torrent-removed', { id });
    return true;
  }

  serializeTorrent(id) {
    const item = this.torrents.get(id);
    if (!item) return null;
    const t = item.torrentInstance;

    const progress = t ? Math.round(t.progress * 100) : item.progress || 0;
    const downloaded = t ? t.downloaded : item.downloaded || 0;
    const total = t ? t.length : item.total || 0;
    const downloadSpeed = t && !t.paused ? t.downloadSpeed : 0;
    const uploadSpeed = t && !t.paused ? t.uploadSpeed : 0;
    const numPeers = t ? t.numPeers : 0;
    const timeRemaining = t ? t.timeRemaining : 0;

    return {
      id: item.id,
      name: item.name || (t && t.name) || 'Arquivo Torrent',
      source: item.source,
      savePath: item.savePath,
      folderPath: item.savePath,
      status: item.status,
      progress,
      downloaded,
      total,
      downloadSpeed,
      uploadSpeed,
      numPeers,
      timeRemaining
    };
  }

  getAllTorrents() {
    const list = [];
    for (const id of this.torrents.keys()) {
      list.push(this.serializeTorrent(id));
    }
    return list;
  }

  getActiveCount() {
    let count = 0;
    for (const item of this.torrents.values()) {
      if (item.status === 'downloading') count++;
    }
    return count;
  }

  broadcastProgress() {
    const mainWindow = this.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    for (const id of this.torrents.keys()) {
      const data = this.serializeTorrent(id);
      if (data && (data.status === 'downloading' || data.status === 'paused')) {
        mainWindow.webContents.send('torrent-progress', data);
      }
    }
  }

  sendToRenderer(channel, data) {
    const mainWindow = this.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.client) {
      try {
        this.client.destroy();
      } catch (e) {}
    }
  }
}

module.exports = TorrentManager;
