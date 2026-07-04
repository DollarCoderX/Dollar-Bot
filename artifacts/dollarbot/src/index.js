const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  Browsers,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const http = require('http');

const { handleMessage, handleGroupParticipants, handleEditedMessage } = require('./handler');
const config = require('./config');
const store = require('./lib/store');
const { extractBody } = require('./lib/messages');
const { installSafeSend } = require('./lib/safe-send');

const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, '../auth_info_baileys');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
[AUTH_DIR, DATA_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const logger = pino({ level: 'silent' });

// ── In-memory message store (makeInMemoryStore removed in Baileys 7.x) ──
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
const groupCache = new Map();

function cacheGroup(group) {
  if (!group?.id) return;
  if (!Array.isArray(group.participants) || group.participants.length === 0) return;
  groupCache.set(group.id, group);
}

async function getCachedGroupMetadata(sock, jid) {
  const cached = groupCache.get(jid);
  if (Array.isArray(cached?.participants) && cached.participants.length > 0) return cached;

  try {
    const fresh = await sock.groupMetadata(jid);
    cacheGroup(fresh);
    return fresh;
  } catch {
    return undefined;
  }
}

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

// ── Live bot status (updated by connection.update below) ────────────────
global.botLiveStatus = global.botLiveStatus || {
  state: 'starting',      // starting | qr | pairing | connecting | online | reconnecting | logged_out
  number: null,
  pushName: null,
  lastEvent: 'Booting up...',
  connectedAt: null,
};
const activity = [];
function logActivity(text) {
  activity.unshift({ text, at: Date.now() });
  if (activity.length > 8) activity.length = 8;
  global.botLiveStatus.lastEvent = text;
}
global.logBotActivity = logActivity;

// ── Keepalive / Preview page ─────────────────────────────────────────────
// Small live-status dashboard so pinging the app in a browser shows a real
// glimpse of the bot running (connection state + recent activity), not just
// a static "alive" message, while still returning fast for uptime pingers.
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }
  if (req.url === '/status.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ...global.botLiveStatus, activity, uptimeMs: Date.now() - (global.botStartTime || Date.now()) }));
  }

  const uptimeMs = Date.now() - (global.botStartTime || (global.botStartTime = Date.now()));
  const uptimeStr = (() => {
    const s = Math.floor(uptimeMs / 1000);
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
  })();

  const st = global.botLiveStatus;
  const stateMeta = {
    starting:      { label: 'Starting up',        color: '#f5c542' },
    qr:            { label: 'Waiting for QR scan', color: '#42a5f5' },
    pairing:       { label: 'Waiting for pairing', color: '#42a5f5' },
    connecting:    { label: 'Connecting…',         color: '#f5c542' },
    online:        { label: 'Online',              color: '#3ddc84' },
    reconnecting:  { label: 'Reconnecting…',       color: '#ffa726' },
    logged_out:    { label: 'Logged out',          color: '#ef5350' },
  };
  const meta = stateMeta[st.state] || stateMeta.starting;
  const activityHtml = activity.length
    ? activity.map(a => `<li><span class="t">${new Date(a.at).toLocaleTimeString('en-CA')}</span> ${a.text}</li>`).join('')
    : '<li><span class="t">—</span> No activity yet</li>';

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>DollarBot V-Ultra</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="10">
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at top,#1a1a2e,#0d0d17);color:#eee;
    font-family:-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:20px}
  .card{background:#161625;padding:36px 44px;border-radius:16px;box-shadow:0 0 40px rgba(0,255,150,0.08);
    max-width:420px;width:100%}
  h1{font-size:1.6rem;margin:0 0 4px}
  .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:${meta.color};
    box-shadow:0 0 8px ${meta.color};margin-right:8px;animation:pulse 1.5s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  p{color:#9a9ab0;margin:6px 0;font-size:.95rem}
  .badge{display:inline-block;margin-top:10px;padding:6px 16px;border-radius:20px;
    background:${meta.color}22;color:${meta.color};font-weight:600;font-size:.85rem}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0;text-align:left}
  .stat{background:#1d1d30;border-radius:10px;padding:10px 12px}
  .stat .k{color:#6f6f88;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em}
  .stat .v{color:#eee;font-size:.95rem;font-weight:600;margin-top:2px}
  .feed{text-align:left;margin-top:16px;border-top:1px solid #2a2a40;padding-top:12px}
  .feed h2{font-size:.75rem;color:#6f6f88;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px}
  .feed ul{list-style:none;margin:0;padding:0;max-height:150px;overflow:hidden}
  .feed li{font-size:.82rem;color:#c4c4d6;padding:4px 0;border-bottom:1px solid #22223a}
  .feed li .t{color:#6f6f88;margin-right:8px;font-size:.72rem}
</style></head>
<body>
  <div class="card">
    <h1><span class="dot"></span>DollarBot V-Ultra</h1>
    <div class="badge">${meta.label}</div>
    <div class="grid">
      <div class="stat"><div class="k">Uptime</div><div class="v">${uptimeStr}</div></div>
      <div class="stat"><div class="k">Number</div><div class="v">${st.number ? '+' + st.number : '—'}</div></div>
      <div class="stat"><div class="k">Name</div><div class="v">${st.pushName || '—'}</div></div>
      <div class="stat"><div class="k">Engine</div><div class="v">Dollar Ultra</div></div>
    </div>
    <div class="feed">
      <h2>Live Activity</h2>
      <ul>${activityHtml}</ul>
    </div>
    <p style="margin-top:16px">💵 Auto-refreshes every 10s</p>
  </div>
</body></html>`);
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
  console.log('\x1b[33m║  💵  DOLLARBOT  V-ULTRA  💵  ║\x1b[0m');
  console.log('\x1b[33m╠══════════════════════════════╣\x1b[0m');
  console.log('\x1b[33m║\x1b[0m  Owner  : Dollar              \x1b[33m║\x1b[0m');
  console.log('\x1b[33m║\x1b[0m  Country: Canada 🇨🇦           \x1b[33m║\x1b[0m');
  console.log('\x1b[33m║\x1b[0m  Engine : Dollar Engine Ultra \x1b[33m║\x1b[0m');
  console.log('\x1b[33m║\x1b[0m  Version: Ultra 1.0           \x1b[33m║\x1b[0m');
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
      global.botLiveStatus.state = 'pairing';
      global.botLiveStatus.number = phoneNumber;
      global.logBotActivity?.(`Requested pairing code login for +${phoneNumber}`);
    } else {
      usePairing = false;
      savedMethod = false;
      console.log('\n\x1b[33mQR code will appear below. Scan within 60 seconds.\x1b[0m');
      console.log('\x1b[33mWhatsApp → Settings → Linked Devices → Link a Device\x1b[0m\n');
      global.botLiveStatus.state = 'qr';
      global.logBotActivity?.('Waiting for QR code scan');
    }
  } else if (hasSession) {
    usePairing = savedMethod || false;
    phoneNumber = savedPhone;
    console.log('\x1b[32mSession found — reconnecting...\x1b[0m\n');
    global.botLiveStatus.state = 'connecting';
    global.logBotActivity?.('Reconnecting with saved session...');
  }

  let sock;
  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
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
    cachedGroupMetadata: async (jid) => getCachedGroupMetadata(sock, jid),
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
  installSafeSend(sock);

  // Anti-edit: must run BEFORE msgStore.bind's own messages.update listener,
  // since that listener merges the edit payload into the cached message —
  // running after it would mean we compare the "original" against itself.
  sock.ev.on('messages.update', updates => {
    for (const u of updates || []) {
      handleEditedMessage(sock, u).catch(err => {
        if (!/ECONNRESET|EPIPE/i.test(err.message)) console.log('[Anti-Edit Error]', err.message);
      });
    }
  });

  // Bind store so it caches messages for group key retries
  msgStore.bind(sock.ev);

  sock.ev.on('groups.upsert', groups => {
    for (const group of groups || []) {
      cacheGroup(group);
    }
  });

  sock.ev.on('groups.update', groups => {
    for (const group of groups || []) {
      if (!group?.id) continue;
      cacheGroup({ ...(groupCache.get(group.id) || {}), ...group });
    }
  });

  // ── Connection updates ───────────────────────────────────────────────────
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairing) {
      global.botLiveStatus.state = 'qr';
      global.logBotActivity?.('New QR code generated — scan within 60s');
    }

    if (connection === 'connecting') {
      global.botLiveStatus.state = usePairing ? 'pairing' : (global.botLiveStatus.state === 'qr' ? 'qr' : 'connecting');
    }

    if (connection === 'open') {
      reconnectDelay = 3000;
      console.log('\x1b[32m╔══════════════════════════════╗\x1b[0m');
      console.log('\x1b[32m║   DollarBot V-Ultra ONLINE!   ║\x1b[0m');
      console.log('\x1b[32m╚══════════════════════════════╝\x1b[0m\n');
      global.botLiveStatus.state = 'online';
      global.botLiveStatus.number = (sock.user?.id || '').split(':')[0].split('@')[0] || phoneNumber || null;
      global.botLiveStatus.pushName = sock.user?.name || sock.user?.notify || sock.user?.verifiedName || null;
      global.botLiveStatus.connectedAt = Date.now();
      global.logBotActivity?.('Connected to WhatsApp — DollarBot is online');
      try {
        const savedPrefix = await store.get('botPrefix');
        if (savedPrefix) config.prefix = savedPrefix;
      } catch (_) {}
      try {
        const groups = await sock.groupFetchAllParticipating();
        for (const group of Object.values(groups || {})) {
          cacheGroup(group);
        }
        console.log(`[Groups] Cached ${groupCache.size} group(s).`);
      } catch (e) {
        console.log(`[Groups] Could not preload groups: ${e.message}`);
      }

      // Notify all owner numbers
      for (const num of config.ownerNumbers) {
        try {
          await sock.sendMessage(`${num}@s.whatsapp.net`, {
            text:
              `*DollarBot V-Ultra is Online*\n\n` +
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

  // ── Incoming call handler ────────────────────────────────────────────────
  // NOTE: Baileys only exposes call *events* (offer/ringing/reject/terminate)
  // and a rejectCall() API — it does not implement WebRTC/VoIP, so there is
  // no way to actually answer a call or inject/stream live TTS audio into it
  // ("Luna answers with a voice" is not achievable through this library).
  // As the closest real substitute: auto-decline incoming calls and let the
  // caller know via a text message instead, so callers aren't left hanging.
  sock.ev.on('call', async (calls) => {
    for (const c of calls) {
      if (c.status !== 'offer') continue;
      try {
        await sock.rejectCall(c.id, c.from);
        await sock.sendMessage(c.chatId || c.from, {
          text:
            `📵 *DollarBot can't take voice/video calls.*\n\n` +
            `WhatsApp calls aren't yet supported by DollarBot v-ultra — please send a text message instead and I'll get right back to you! For more information simply Dm +14378898269`,
        });
      } catch (e) {
        console.log('[Call Handler] Failed to reject/notify:', e.message);
      }
    }
  });

  // ── Message handler ──────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (!m.message) continue;
      // Skip WhatsApp protocol/system stub messages
      const jid = m.key.remoteJid;
      if (m.messageStubType) {
        if (jid?.endsWith('@g.us')) {
          console.log('[Group Stub]', jid, m.messageStubType, m.messageStubParameters?.join(' | ') || '');
        }
        continue;
      }

      // Always process status@broadcast (for auto-like)
      if (jid === 'status@broadcast') {
        if (!msgStore.messages['status@broadcast']) {
          msgStore.messages['status@broadcast'] = { array: [] };
        }
        const exists = msgStore.messages['status@broadcast'].array.some(existing => existing.key.id === m.key.id);
        if (!exists) {
          msgStore.messages['status@broadcast'].array.push(m);
        }
        m.reply = async (text, options = {}) => {
          return sock.sendMessage(jid, { text, ...options }, { quoted: m });
        };
        handleMessage(sock, m).catch(err => {
          if (!/ECONNRESET|EPIPE/i.test(err.message)) console.log('[Status Error]', err.message);
        });
        continue;
      }

      const body = extractBody(m);

      if (jid?.endsWith('@g.us') && body.trim().startsWith(config.prefix)) {
        console.log('[Group Command]', {
          jid,
          fromMe: !!m.key.fromMe,
          participant: m.key.participant,
          body: body.trim().slice(0, 80),
        });
      }

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
    if (update?.id) {
      try { cacheGroup(await sock.groupMetadata(update.id)); } catch (_) {}
    }
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
