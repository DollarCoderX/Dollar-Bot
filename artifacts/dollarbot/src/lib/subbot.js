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

// Import shared handlers so sub-bots behave exactly like the main bot
const {
  handleMessage,
  handleGroupParticipants,
  handleEditedMessage,
} = require('../handler');

/**
 * Sub-bot auth persistence
 * -----------------------
 * Main bot uses:
 *   AUTH_DIR = ../auth_info_baileys
 *
 * To ensure sub-bots survive shutdown/restart, we store each slot's
 * Baileys multi-file auth inside the SAME persistent folder tree:
 *   auth_info_baileys/subbots/<number>/
 *
 * If you still want custom storage, set SUBBOT_AUTH_DIR in env.
 */
const SUBBOT_AUTH_ROOT = process.env.SUBBOT_AUTH_DIR
  ? process.env.SUBBOT_AUTH_DIR
  : path.join(__dirname, '../../auth_info_baileys', 'subbots');

if (!fs.existsSync(SUBBOT_AUTH_ROOT)) fs.mkdirSync(SUBBOT_AUTH_ROOT, { recursive: true });

const logger = pino({ level: 'silent' });

// number -> { sock, status, qr, pairCode, displayName, stop() }
const instances = new Map();

function authDirFor(number) {
  return path.join(SUBBOT_AUTH_ROOT, String(number));
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
    // Fire onConnected immediately so the caller's message flow doesn't
    // hang waiting for a connection event that will never come again.
    try {
      await callbacks.onConnected?.({
        number: existing.number || number,
        displayName: existing.displayName || existing.number || number,
      });
    } catch (_) {}
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
    // Same fingerprint as the main bot's pairing flow (proven reliable) —
    // avoids the "printQRInTerminal + pairing code" mismatch that made
    // sub-bot pairing codes fail more often than the main terminal flow.
    printQRInTerminal: mode !== 'pair',
    browser: ['Windows', 'Chrome', '125.0.6422.112'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 10000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 3,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    fireInitQueries: true,
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

  // Bind msg store / anti-delete needs the same global cache as main bot
  const msgStore = {
    messages: {},
    bind(ev) {
      ev.on('messages.upsert', ({ messages: msgs }) => {
        for (const m of msgs) {
          if (!m.message || !m.key?.remoteJid) continue;
          const jid = m.key.remoteJid;
          if (!this.messages[jid]) this.messages[jid] = { array: [] };
          if (!this.messages[jid].array.some(e => e.key.id === m.key.id))
            this.messages[jid].array.push(m);
        }
      });
      ev.on('messages.update', updates => {
        for (const u of updates) {
          const jid = u.key?.remoteJid;
          if (!jid || !this.messages[jid]) continue;
          const idx = this.messages[jid].array.findIndex(m => m.key.id === u.key.id);
          if (idx >= 0 && u.update)
            this.messages[jid].array[idx] = { ...this.messages[jid].array[idx], ...u.update };
        }
      });
    },
  };
  global.msgStore = msgStore;

  // Anti-edit (needs messages cache to find original)
  sock.ev.on('messages.update', updates => {
    for (const u of updates || []) {
      handleEditedMessage(sock, u).catch(() => {});
    }
  });

  // Cache messages for anti-delete
  msgStore.bind(sock.ev);

  sock.ev.on('groups-participants.update', async (update) => {
    // Welcome / goodbye for sub-bots
    await handleGroupParticipants(sock, update);
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Sub-bot must accept both user-to-bot and group commands.
    // Some Baileys setups emit command chats as "notify" while others
    // emit them as "append"; the main handler already filters by body/prefix.
    if (!Array.isArray(messages)) return;

    // Allow both notify + append
    if (type !== 'notify' && type !== 'append') return;
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
  // Timing matches the main bot's terminal flow exactly (8s initial wait for
  // the WebSocket handshake to fully settle, 5s between retries, 5 attempts)
  // since that flow is the one confirmed to work reliably.
  if (mode === 'pair' && !hasSession) {
    setTimeout(async () => {
      let attempts = 0;
      const tryCode = async () => {
        try {
          const code = await sock.requestPairingCode(number);
          instance.pairCode = code;
          console.log(`[SubBot ${number}] Pairing code issued: ${code}`);
          try { await callbacks.onPairCode?.(code); } catch (_) {}
        } catch (e) {
          attempts++;
          console.log(`[SubBot ${number}] Pairing code attempt ${attempts}/5 failed: ${e.message}`);
          if (attempts < 5) {
            setTimeout(tryCode, 5000);
          } else {
            try { await callbacks.onError?.(e); } catch (_) {}
          }
        }
      };
      tryCode();
    }, 8000);
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

// (Optional) convenience: stop ALL running sub-bots.
async function stopAllSubBots() {
  const nums = Array.from(instances.keys());
  for (const n of nums) {
    try { await stopSubBot(n); } catch (_) {}
  }
}

module.exports = { startSubBot, stopSubBot, stopAllSubBots, getInstance };
