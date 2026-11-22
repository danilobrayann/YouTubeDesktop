// Minimal Discord Rich Presence client over the local IPC socket.
// Protocol: https://discord.com/developers/docs/topics/rpc#rpc-examples
// No external dependencies — uses Node's net module with Windows named pipes.

const net = require('net');

const OPS = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 };
const CMD = { DISPATCH: 1, SET_ACTIVITY: 2 };

function pipePaths() {
  // Discord tries discord-ipc-0 first, then -1..-9
  const paths = ['\\\\.\\pipe\\discord-ipc-0'];
  for (let i = 1; i <= 9; i++) paths.push(`\\\\.\\pipe\\discord-ipc-${i}`);
  return paths;
}

function encode(opcode, payload) {
  const data = Buffer.from(JSON.stringify(payload), 'utf8');
  const header = Buffer.alloc(8);
  header.writeUInt32LE(opcode, 0);
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data]);
}

function decode(buffer) {
  if (buffer.length < 8) return null;
  const opcode = buffer.readUInt32LE(0);
  const length = buffer.readUInt32LE(4);
  if (buffer.length < 8 + length) return null;
  const payload = JSON.parse(buffer.slice(8, 8 + length).toString('utf8'));
  return { opcode, payload, rest: buffer.slice(8 + length) };
}

class DiscordRPC {
  constructor(clientId) {
    this.clientId = clientId;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.connected = false;
    this.lastActivity = null;
    this._reconnectTimer = null;
    this._intentionalClose = false;
  }

  connect() {
    if (this.socket || !this.clientId) return;
    this._tryPipe(pipePaths(), 0);
  }

  _tryPipe(paths, index) {
    if (index >= paths.length) {
      this._scheduleReconnect();
      return;
    }
    const path = paths[index];
    const socket = net.connect(path);
    let settled = false;

    const fail = () => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch (e) {}
      this._tryPipe(paths, index + 1);
    };

    socket.once('connect', () => {
      settled = true;
      this.socket = socket;
      this.buffer = Buffer.alloc(0);
      socket.write(encode(OPS.HANDSHAKE, { v: 1, client_id: this.clientId }));
    });

    socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      let msg;
      while ((msg = decode(this.buffer)) !== null) {
        this.buffer = msg.rest;
        this._handleMessage(msg);
      }
    });

    socket.once('error', fail);
    socket.once('close', () => {
      if (this.socket === socket) {
        this.socket = null;
        this.connected = false;
        if (!this._intentionalClose) this._scheduleReconnect();
      }
    });
  }

  _handleMessage({ opcode, payload }) {
    if (opcode === OPS.CLOSE) {
      try { this.socket.destroy(); } catch (e) {}
      return;
    }
    if (opcode === OPS.PING) {
      this.socket.write(encode(OPS.PONG, payload));
      return;
    }
    if (opcode === OPS.FRAME && payload.evt === 'READY') {
      this.connected = true;
      // Re-send last activity if any
      if (this.lastActivity !== null) {
        this.setActivity(this.lastActivity);
      }
    }
  }

  _scheduleReconnect() {
    if (this._intentionalClose || !this.clientId) return;
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this.connect(), 30000);
  }

  setActivity(activity) {
    this.lastActivity = activity;
    if (!this.socket || !this.connected) return;
    this.socket.write(encode(OPS.FRAME, {
      cmd: CMD.SET_ACTIVITY,
      args: { pid: process.pid, activity },
      nonce: `${Date.now()}`
    }));
  }

  clearActivity() {
    this.lastActivity = null;
    if (!this.socket || !this.connected) return;
    this.socket.write(encode(OPS.FRAME, {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid },
      nonce: `${Date.now()}`
    }));
  }

  destroy() {
    this._intentionalClose = true;
    clearTimeout(this._reconnectTimer);
    try { this.socket && this.socket.destroy(); } catch (e) {}
    this.socket = null;
    this.connected = false;
  }
}

module.exports = { DiscordRPC };
