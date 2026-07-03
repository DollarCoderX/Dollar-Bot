'use strict';
/**
 * subbot.js — Real per-slot WhatsApp connections for the getbot multi-tenant system.
 *
 * Each registered number gets its own genuine Baileys socket + auth folder,
 * so pairing codes / QR codes come straight from WhatsApp for that exact
 * number, and the real WhatsApp display name is captured once connected.
 *
 * Messages received on a sub-bot socket are routed through the same shared
 * `handleMessage` used by the main bot, so sub-bot users get the full
 * command set.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const { extractBody } = require('./messages');
const { installSafeSend } = require('./safe-send');

const SUBBOT_AUTH_ROOT = process.env.SUBBOT_AUTH_DIR || path.join(__dirname, '../../subbot_auth');
if (!fs.existsSync(SUBBOT_AUTH_ROOT)) fs.mkdirSync(SUBBOT_AUTH_ROOT, { recursive: true });

const logger = pino({ level: 'silent' });

// number -> { sock, status, qr, pairCode, displayName, stop() }
const instances = new Map();

function authDirFor(number) {
  return path.join(SUBBOT_AUTH_ROOT, number);
}

function getInstance(number) {
  return instances.get(number);
}

/**
 * Start (or restart) a real WhatsApp connection for `number`.
 * mode: 'qr' | 'pair'
 * callbacks: { onQR(buffer/text), onPairCode(code), onConnected({ number, displayName }), onDisconnected(reason) }
 */
async function startSubBot(number, mode, callbacks = {}) {
  // Reuse an already-running instance if present
  const existing = instances.get(number);
  if (existing && existing.status === 'connected') {
    return existing;
  }
  if (existing) {
    try { existing.sock?.end?.(); } catch (_) {}
    instances.delete(number);
  }

  const authDir = authDirFor(number);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const hasSession = fs.existsSync(path.join(authDir, 'creds.json'));

  const instance = {
    sock: null,
    status: 'connecting',
    qr: null,
    pairCode: null,
    displayName: null,
    number,
    reconnectDelay: 3000,
  };
  instances.set(number, instance);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    browser: ['DollarBot', 'Chrome', '125.0.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 10000,
    keepAliveIntervalMs: 25000,
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });
  installSafeSend(sock);
  instance.sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && mode === 'qr') {
      instance.qr = qr;
      try { await callbacks.onQR?.(qr); } catch (_) {}
    }

    if (connection === 'open') {
      instance.status = 'connected';
      instance.reconnectDelay = 3000;
      const realName = sock.user?.name || sock.user?.notify || sock.user?.verifiedName || null;
      const realNumber = (sock.user?.id || '').split(':')[0].split('@')[0] || number;
      instance.displayName = realName;
      instance.number = realNumber;
      try { await callbacks.onConnected?.({ number: realNumber, displayName: realName || realNumber }); } catch (_) {}
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      instance.status = 'disconnected';

      if (loggedOut) {
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch (_) {}
        instances.delete(number);
        try { await callbacks.onDisconnected?.('logged_out'); } catch (_) {}
        return;
      }

      if (code === DisconnectReason.connectionReplaced) {
        instances.delete(number);
        try { await callbacks.onDisconnected?.('replaced'); } catch (_) {}
        return;
      }

      // Auto-reconnect with backoff, same pattern as the main bot
      const delay = instance.reconnectDelay;
      instance.reconnectDelay = Math.min(instance.reconnectDelay * 1.5, 30000);
      setTimeout(() => {
        if (instances.get(number)) startSubBot(number, mode, callbacks).catch(() => {});
      }, delay);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const { handleMessage } = require('../handler');
    for (const m of messages) {
      if (!m.message || m.messageStubType) continue;
      const jid = m.key.remoteJid;
      const body = extractBody(m);

      if (m.key.fromMe) {
        const selfJid = (sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0]) + '@s.whatsapp.net';
        if (jid !== selfJid) continue;
      }

      m.reply = async (text, options = {}) => sock.sendMessage(jid, { text, ...options }, { quoted: m });
      m.replyWithImage = async (image, caption = '', options = {}) => sock.sendMessage(jid, { image, caption, ...options }, { quoted: m });
      m.replyWithDocument = async (document, fileName = '', caption = '', options = {}) => sock.sendMessage(jid, { document, fileName, caption, ...options }, { quoted: m });

      setImmediate(() => {
        handleMessage(sock, m).catch(() => {});
      });
    }
  });

  // ── Pairing code: requested once the socket is created, before scanning ──
  if (mode === 'pair' && !hasSession) {
    setTimeout(async () => {
      let attempts = 0;
      const tryCode = async () => {
        try {
          const code = await sock.requestPairingCode(number);
          instance.pairCode = code;
          try { await callbacks.onPairCode?.(code); } catch (_) {}
        } catch (e) {
          attempts++;
          if (attempts < 5) setTimeout(tryCode, 4000);
          else {
            try { await callbacks.onError?.(e); } catch (_) {}
          }
        }
      };
      tryCode();
    }, 3000);
  }

  return instance;
}

async function stopSubBot(number) {
  const instance = instances.get(number);
  if (!instance) return;
  try { await instance.sock?.logout?.(); } catch (_) {}
  try { instance.sock?.end?.(); } catch (_) {}
  instances.delete(number);
  try { fs.rmSync(authDirFor(number), { recursive: true, force: true }); } catch (_) {}
}

module.exports = { startSubBot, stopSubBot, getInstance };
