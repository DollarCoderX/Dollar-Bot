const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const { handleMessage, handleGroupParticipants } = require('./handler');
const config = require('./config');

const AUTH_DIR = path.join(__dirname, '../auth_info_baileys');
const DATA_DIR = path.join(__dirname, '../data');
[AUTH_DIR, DATA_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const logger = pino({ level: 'silent' });

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
        console.log('\x1b[31m❌ Number too short. Restart and try again.\x1b[0m');
        process.exit(1);
      }
      usePairing = true;
      savedMethod = true;
      savedPhone = phoneNumber;
      console.log(`\n\x1b[32m✅ Number accepted: +${phoneNumber}\x1b[0m`);
      console.log('\x1b[33m⏳ Connecting to WhatsApp... your pairing code will appear in a few seconds.\x1b[0m\n');
    } else {
      usePairing = false;
      savedMethod = false;
      console.log('\n\x1b[33m📷 QR code will appear below. Scan it within 60 seconds.\x1b[0m');
      console.log('\x1b[33m   WhatsApp → Settings → Linked Devices → Link a Device\x1b[0m\n');
    }
  } else if (hasSession) {
    usePairing = savedMethod || false;
    phoneNumber = savedPhone;
    console.log('\x1b[32m✅ Session found — reconnecting...\x1b[0m\n');
  }

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: !usePairing,
    browser: ['DollarBot V5', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    fireInitQueries: true,
    shouldIgnoreJid: jid => isJidBroadcast(jid),
    getMessage: async () => ({ conversation: '' }),
  });

  // ── Register all event listeners first ──────────────────────────────────

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      reconnectDelay = 3000;
      console.log('\x1b[32m╔══════════════════════════════╗\x1b[0m');
      console.log('\x1b[32m║  ✅  DOLLARBOT V5 ONLINE!    ║\x1b[0m');
      console.log('\x1b[32m╠══════════════════════════════╣\x1b[0m');
      console.log(`\x1b[32m║\x1b[0m  Engine : ${config.engine}         \x1b[32m║\x1b[0m`);
      console.log(`\x1b[32m║\x1b[0m  Version: ${config.version}             \x1b[32m║\x1b[0m`);
      console.log('\x1b[32m╚══════════════════════════════╝\x1b[0m\n');
      try {
        await sock.sendMessage(config.ownerJid, {
          text:
            `╭━━━〔 💵 DOLLARBOT V5 ONLINE 〕━━━⬣\n` +
            `┃ ✦ Status  : Online ✅\n` +
            `┃ ✦ Engine  : ${config.engine}\n` +
            `┃ ✦ Version : ${config.version}\n` +
            `┃ ✦ AI Mem  : Active 🧠\n` +
            `┃ ✦ Search  : Ready 🔍\n` +
            `┃ ✦ TTS     : Ready 🔊\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
            `Type *.menu* to see all commands!\n` +
            `«💵 DollarBot V5 — Smart • Fast • Limitless»`,
        });
      } catch (_) {}
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`\x1b[31m⚠️  Connection closed. Code: ${code}\x1b[0m`);

      if (loggedOut) {
        console.log('\x1b[31m🚪 Logged out — clearing session and restarting...\x1b[0m');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        savedMethod = undefined;
        savedPhone = undefined;
        setTimeout(() => startBot(undefined, undefined), 2000);
      } else if (code === DisconnectReason.connectionReplaced) {
        console.log('\x1b[31m╔════════════════════════════════════════════════════════════╗\x1b[0m');
        console.log('\x1b[31m║ ❌ CONNECTION REPLACED (CODE: 440)                         ║\x1b[0m');
        console.log('\x1b[31m╠════════════════════════════════════════════════════════════╣\x1b[0m');
        console.log('\x1b[31m║ Another bot instance, server (e.g. Replit), or background  ║\x1b[0m');
        console.log('\x1b[31m║ process is actively running with this exact same session!  ║\x1b[0m');
        console.log('\x1b[31m║                                                            ║\x1b[0m');
        console.log('\x1b[31m║ To prevent an infinite reconnect loop, this instance will  ║\x1b[0m');
        console.log('\x1b[31m║ not auto-reconnect.                                        ║\x1b[0m');
        console.log('\x1b[31m║                                                            ║\x1b[0m');
        console.log('\x1b[31m║ 👉 HOW TO FIX:                                             ║\x1b[0m');
        console.log('\x1b[31m║ 1. Stop the bot on Replit or other cloud servers.          ║\x1b[0m');
        console.log('\x1b[31m║ 2. Kill background Node processes (taskkill /F /IM node.exe)║\x1b[0m');
        console.log('\x1b[31m║ 3. Or delete auth_info_baileys/ folder to start fresh.     ║\x1b[0m');
        console.log('\x1b[31m╚════════════════════════════════════════════════════════════╝\x1b[0m\n');
        process.exit(1);
      } else {
        console.log(`\x1b[33m🔄 Reconnecting in ${(reconnectDelay / 1000).toFixed(0)}s...\x1b[0m`);
        const delay = reconnectDelay;
        reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
        setTimeout(() => startBot(usePairing, phoneNumber), delay);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (m.key.fromMe) continue;
      if (!m.message) continue;
      await handleMessage(sock, m);
    }
  });

  sock.ev.on('group-participants.update', async update => {
    await handleGroupParticipants(sock, update);
  });

  // ── Pairing code: request after socket has time to connect ──────────────
  // We wait 5 seconds (not relying on QR event, which can be unreliable).
  // This gives Baileys enough time to complete the WebSocket handshake.
  if (usePairing && !hasSession && phoneNumber) {
    setTimeout(async () => {
      console.log('\x1b[33m⏳ Requesting pairing code from WhatsApp...\x1b[0m\n');
      let attempts = 0;
      const tryCode = async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          const fmt = code?.match(/.{1,4}/g)?.join('-') || code;

          console.log('\x1b[32m╔══════════════════════════════════════╗\x1b[0m');
          console.log('\x1b[32m║         🔑  YOUR PAIRING CODE        ║\x1b[0m');
          console.log('\x1b[32m╠══════════════════════════════════════╣\x1b[0m');
          console.log('\x1b[32m║\x1b[0m                                      \x1b[32m║\x1b[0m');
          console.log(`\x1b[32m║\x1b[0m   Code  :  \x1b[33;1m${fmt}\x1b[0m             \x1b[32m║\x1b[0m`);
          console.log(`\x1b[32m║\x1b[0m   Number:  +${phoneNumber}          \x1b[32m║\x1b[0m`);
          console.log('\x1b[32m║\x1b[0m                                      \x1b[32m║\x1b[0m');
          console.log('\x1b[32m╠══════════════════════════════════════╣\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  📱  HOW TO ENTER THE CODE:          \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m                                      \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  1. Open WhatsApp on your phone      \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  2. Tap ⋮  → Settings               \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  3. Tap "Linked Devices"             \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  4. Tap "Link a Device"              \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  5. Tap "Link with phone number"     \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  6. Select your country, enter       \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m     number WITHOUT leading zero      \x1b[32m║\x1b[0m');
          console.log(`\x1b[32m║\x1b[0m  7. Enter code: \x1b[33;1m${fmt}\x1b[0m         \x1b[32m║\x1b[0m`);
          console.log('\x1b[32m║\x1b[0m                                      \x1b[32m║\x1b[0m');
          console.log('\x1b[32m║\x1b[0m  ⚠️  Code expires in ~3 minutes!     \x1b[32m║\x1b[0m');
          console.log('\x1b[32m╚══════════════════════════════════════╝\x1b[0m\n');
        } catch (e) {
          attempts++;
          if (attempts < 3) {
            console.log(`\x1b[33m⚠️  Code request failed (${e.message}). Retrying in 5s... (${attempts}/3)\x1b[0m`);
            setTimeout(tryCode, 5000);
          } else {
            console.log('\x1b[31m╔══════════════════════════════════════╗\x1b[0m');
            console.log('\x1b[31m║  ❌  PAIRING CODE FAILED             ║\x1b[0m');
            console.log('\x1b[31m╠══════════════════════════════════════╣\x1b[0m');
            console.log('\x1b[31m║\x1b[0m  Reason: ' + (e.message || 'Unknown').slice(0, 28).padEnd(30) + '\x1b[31m║\x1b[0m');
            console.log('\x1b[31m╠══════════════════════════════════════╣\x1b[0m');
            console.log('\x1b[31m║\x1b[0m  💡 TIP: Restart the bot and use   \x1b[31m║\x1b[0m');
            console.log('\x1b[31m║\x1b[0m     option 1 (QR Code) instead.    \x1b[31m║\x1b[0m');
            console.log('\x1b[31m║\x1b[0m  QR code works with ALL WhatsApp   \x1b[31m║\x1b[0m');
            console.log('\x1b[31m║\x1b[0m  versions and is more reliable.    \x1b[31m║\x1b[0m');
            console.log('\x1b[31m╚══════════════════════════════════════╝\x1b[0m\n');
          }
        }
      };
      tryCode();
    }, 5000);
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
