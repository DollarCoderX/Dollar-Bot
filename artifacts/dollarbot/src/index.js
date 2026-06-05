const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  Browsers,
  makeInMemoryStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const http = require('http');

const { handleMessage, handleGroupParticipants } = require('./handler');
const config = require('./config');
const { extractBody } = require('./lib/messages');

const AUTH_DIR = path.join(__dirname, '../auth_info_baileys');
const DATA_DIR = path.join(__dirname, '../data');
[AUTH_DIR, DATA_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const logger = pino({ level: 'silent' });

// ── In-memory message store with auto-cleanup ────────────────────────────
const msgStore = makeInMemoryStore({ logger });
global.msgStore = msgStore;

// Clean up old messages every 5 minutes (prevents memory bloat)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // Keep messages for 30 minutes
  
  for (const jid in msgStore.messages) {
    const msgs = msgStore.messages[jid];
    if (msgs?.array) {
      msgs.array = msgs.array.filter(m => {
        const msgTime = m.messageTimestamp ? m.messageTimestamp * 1000 : now;
        return (now - msgTime) < maxAge;
      });
      if (msgs.array.length === 0) {
        delete msgStore.messages[jid];
      }
    }
  }
}, 5 * 60 * 1000);

// ── Auto-Like Status Timer ───────────────────────────────────────────────
global.isAutoLikeActive = true;
setInterval(() => {
  global.isAutoLikeActive = !global.isAutoLikeActive;
}, 60000);

// ── Dummy HTTP Server for Render / Railway ───────────────────────────────
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('DollarBot V5 is Alive & Running!');
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // Port busy — try the next one silently
    server.listen(0); // OS picks a free port
  }
});
server.listen(PORT, () => {
  const addr = server.address();
  const port = addr?.port || PORT;
  console.log(`\x1b[32m[HTTP] Keep-alive server on port ${port}\x1b[0m`);
});

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
}

function banner() {
  console.log('\n\x1b[33m╔══════════════════════════════╗\x1b[0m');
  console.log('\x1b[33m║    💵  DOLLARBOT  V5  💵     ║\x1b[0m');
  console.log('\x1b[33m╠══════════════════════════════╣\x1b[0m');
  console.log('\x1b[33m║\x1b[0m  Owner  : Dollar              \x1b[33m║\x1b[0m');
  console.log('\x1b[33m║\x1b[0m  Country: Canada 🇨🇦           \x1b[33m║\x1b[0m');
  console.log('\x1b[33m║\x1b[0m  Engine : Cortex AI           \x1b[33m║\x1b[0m');
  console.log('\x1b[33m║\x1b[0m  Version: 5.0.0               \x1b[33m║\x1b[0m');
  console.log('\x1b[33m╚══════════════════════════════╝\x1b[0m\n');
}

let reconnectDelay = 3000;
let savedMethod;
let savedPhone;

async function startBot(method, phone) {
  banner();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const hasSession = fs.existsSync(path.join(AUTH_DIR, 'creds.json'));

  let usePairing = method;
  let phoneNumber = phone;

  if (!hasSession && usePairing === undefined) {
    console.log('\x1b[36m┌─────────────────────────────┐\x1b[0m');
    console.log('\x1b[36m│        LOGIN METHOD         │\x1b[0m');
    console.log('\x1b[36m├─────────────────────────────┤\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  1. QR Code  (recommended)  \x1b[36m│\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  2. Pairing Code            \x1b[36m│\x1b[0m');
    console.log('\x1b[36m└─────────────────────────────┘\x1b[0m\n');

    const choice = await ask('Enter 1 or 2: ');

    if (choice === '2') {
      console.log('\n\x1b[33mEnter your number in full international format (digits only):\x1b[0m');
      console.log('  Nigeria  → 2349037855461');
      console.log('  Canada   → 14378898269');
      console.log('  US/UK    → 12025550100 / 447911123456\n');
      const raw = await ask('Your number (NO + sign, digits only): ');
      phoneNumber = raw.replace(/\D/g, '');
      if (phoneNumber.length < 7) {
        console.log('\x1b[31mNumber too short. Restart and try again.\x1b[0m');
        process.exit(1);
      }
      usePairing = true;
      savedMethod = true;
      savedPhone = phoneNumber;
      console.log(`\n\x1b[32mNumber accepted: +${phoneNumber}\x1b[0m`);
      console.log('\x1b[33mConnecting to WhatsApp — pairing code will appear shortly...\x1b[0m\n');
    } else {
      usePairing = false;
      savedMethod = false;
      console.log('\n\x1b[33mQR code will appear below. Scan within 60 seconds.\x1b[0m');
      console.log('\x1b[33mWhatsApp → Settings → Linked Devices → Link a Device\x1b[0m\n');
    }
  } else if (hasSession) {
    usePairing = savedMethod || false;
    phoneNumber = savedPhone;
    console.log('\x1b[32mSession found — reconnecting...\x1b[0m\n');
  }

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: !usePairing,
    browser: ['Windows', 'Chrome', '125.0.6422.112'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 10000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 3,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    fireInitQueries: true,
    getMessage: async (key) => {
      try {
        const stored = msgStore.messages[key.remoteJid];
        if (stored) {
          // Try .get() (OrderedDictionary) first, then fallback to array scan
          const found = stored.get?.(key.id) ||
                        stored.array?.find(m => m.key.id === key.id);
          if (found?.message) return found.message;
        }
      } catch (_) {}
      // Return empty message instead of undefined — prevents WhatsApp from
      // showing "Waiting for this message. This may take a while." to users.
      return { conversation: '' };
    },
  });

  // Bind store so it caches messages for group key retries
  msgStore.bind(sock.ev);

  // ── Connection updates ───────────────────────────────────────────────────
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      reconnectDelay = 3000;
      console.log('\x1b[32m╔══════════════════════════════╗\x1b[0m');
      console.log('\x1b[32m║   DOLLARBOT V5 ONLINE!       ║\x1b[0m');
      console.log('\x1b[32m╚══════════════════════════════╝\x1b[0m\n');
      // Notify all owner numbers
      for (const num of config.ownerNumbers) {
        try {
          await sock.sendMessage(`${num}@s.whatsapp.net`, {
            text:
              `*DollarBot V5 is Online*\n\n` +
              `- Engine: ${config.engine}\n` +
              `- Version: ${config.version}\n` +
              `- Status: Ready\n\n` +
              `Type *.menu* to see all commands.`,
          });
        } catch (_) {}
      }
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`\x1b[31mConnection closed. Code: ${code}\x1b[0m`);

      if (loggedOut) {
        console.log('\x1b[31mLogged out — clearing session and restarting...\x1b[0m');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        savedMethod = undefined;
        savedPhone = undefined;
        setTimeout(() => startBot(undefined, undefined), 2000);
      } else if (code === DisconnectReason.connectionReplaced) {
        console.log('\x1b[31mConnection replaced by another instance. Exiting.\x1b[0m');
        console.log('\x1b[33mFix: Stop other bot instances, then restart.\x1b[0m');
        process.exit(1);
      } else {
        console.log(`\x1b[33mReconnecting in ${(reconnectDelay / 1000).toFixed(0)}s...\x1b[0m`);
        const delay = reconnectDelay;
        reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
        setTimeout(() => startBot(usePairing, phoneNumber), delay);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Message handler ──────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (!m.message) continue;
      // Skip WhatsApp protocol/system stub messages (these cause "Waiting for
      // this message. This may take a while." if processed incorrectly)
      if (m.messageStubType) continue;
      const jid = m.key.remoteJid;

      // Always process status@broadcast (for auto-like)
      if (jid === 'status@broadcast') {
        if (!msgStore.messages['status@broadcast']) {
          msgStore.messages['status@broadcast'] = { array: [] };
        }
        const exists = msgStore.messages['status@broadcast'].array.some(existing => existing.key.id === m.key.id);
        if (!exists) {
          msgStore.messages['status@broadcast'].array.push(m);
        }
        // Add reply method for status messages
        m.reply = async (text, options = {}) => {
          return sock.sendMessage(jid, { text, ...options }, { quoted: m });
        };
        // Non-blocking auto-like
        handleMessage(sock, m).catch(err => {
          if (!/ECONNRESET|EPIPE/i.test(err.message)) console.log('[Status Error]', err.message);
        });
        continue;
      }

      const body = extractBody(m);

      // For fromMe messages: only allow if they start with prefix (owner commands)
      // OR if it's a DM to self (owner chatting with themselves — bot responds)
      if (m.key.fromMe) {
        const isSelfChat = jid === sock.user?.id?.split(':')[0] + '@s.whatsapp.net' ||
                           jid === sock.user?.id?.split('@')[0] + '@s.whatsapp.net';
        if (!body.startsWith(config.prefix) && !isSelfChat) continue;
      }

      // ── Add reply method to message (for proper group message handling) ──────
      m.reply = async (text, options = {}) => {
        return sock.sendMessage(jid, { text, ...options }, { quoted: m });
      };
      m.replyWithImage = async (image, caption = '', options = {}) => {
        return sock.sendMessage(jid, { image, caption, ...options }, { quoted: m });
      };
      m.replyWithDocument = async (document, fileName = '', caption = '', options = {}) => {
        return sock.sendMessage(jid, { document, fileName, caption, ...options }, { quoted: m });
      };

      // Handle message with timeout to prevent event loop blocking
      setImmediate(() => {
        handleMessage(sock, m).catch(err => {
          if (!/ECONNRESET|EPIPE/i.test(err.message)) console.log('[Handler Error]', err.message);
        });
      });
    }
  });

  sock.ev.on('group-participants.update', async update => {
    await handleGroupParticipants(sock, update);
  });

  // ── Pairing code request ─────────────────────────────────────────────────
  if (usePairing && !hasSession && phoneNumber) {
    setTimeout(async () => {
      console.log('\x1b[33mRequesting pairing code from WhatsApp...\x1b[0m\n');
      let attempts = 0;
      const tryCode = async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          const fmt = code?.match(/.{1,4}/g)?.join('-') || code;
          console.log('\x1b[32m╔══════════════════════════════════════╗\x1b[0m');
          console.log('\x1b[32m║         YOUR PAIRING CODE            ║\x1b[0m');
          console.log('\x1b[32m╠══════════════════════════════════════╣\x1b[0m');
          console.log(`\x1b[32m║\x1b[0m   Code  :  \x1b[33;1m${fmt}\x1b[0m             \x1b[32m║\x1b[0m`);
          console.log(`\x1b[32m║\x1b[0m   Number:  +${phoneNumber}          \x1b[32m║\x1b[0m`);
          console.log('\x1b[32m╠══════════════════════════════════════╣\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  1. Open WhatsApp on your phone      \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  2. Tap menu → Settings              \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  3. Linked Devices → Link a Device   \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  4. Link with phone number           \x1b[32m║\x1b[0m');
          console.log(`\x1b[32m║\x1b[0m  5. Enter code: \x1b[33;1m${fmt}\x1b[0m         \x1b[32m║\x1b[0m`);
          console.log('\x1b[32m║\x1b[0m  Code expires in ~3 minutes!         \x1b[32m║\x1b[0m');
          console.log('\x1b[32m╚══════════════════════════════════════╝\x1b[0m\n');
        } catch (e) {
          attempts++;
          if (attempts < 5) {
            console.log(`\x1b[33mCode request failed (${e.message}). Retrying in 5s... (${attempts}/5)\x1b[0m`);
            setTimeout(tryCode, 5000);
          } else {
            console.log('\x1b[31mPairing code failed after 5 attempts.\x1b[0m');
            console.log('\x1b[33mTip: Restart and use option 1 (QR Code) instead — it is more reliable.\x1b[0m\n');
          }
        }
      };
      tryCode();
    }, 8000); // Wait 8s for WebSocket handshake to complete
  }

  // ── Global error handlers ────────────────────────────────────────────────
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  process.on('uncaughtException', err => {
    if (!/ECONNRESET|EPIPE|timed out/i.test(err.message)) console.error('[Exception]', err.message);
  });
  process.on('unhandledRejection', reason => {
    const m = reason?.message || String(reason);
    if (!/ECONNRESET|EPIPE|timed out/i.test(m)) console.error('[Rejection]', m);
  });
}

startBot(undefined, undefined).catch(console.error);
