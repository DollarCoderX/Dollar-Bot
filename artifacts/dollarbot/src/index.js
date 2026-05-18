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

function printBanner() {
  console.log('\n\x1b[33m╭━━━〔 💵 DOLLARBOT V5 〕━━━⬣\x1b[0m');
  console.log('\x1b[33m┃\x1b[0m ✦ Owner  : Dollar');
  console.log('\x1b[33m┃\x1b[0m ✦ Country: Canada 🇨🇦');
  console.log('\x1b[33m┃\x1b[0m ✦ Engine : Cortex AI');
  console.log('\x1b[33m┃\x1b[0m ✦ Version: 5.0.0');
  console.log('\x1b[33m╰━━━━━━━━━━━━━━━━━━⬣\x1b[0m');
  console.log('\x1b[36m«⚡ Powered By Cortex & Mera AI»\x1b[0m\n');
}

let reconnectDelay = 3000;
let isConnecting = false;

async function startBot() {
  if (isConnecting) return;
  isConnecting = true;

  printBanner();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const hasSession = fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  let usePairingCode = false;
  let phoneNumber = '';

  if (!hasSession) {
    console.log('\x1b[36m╭━━━〔 🔐 LOGIN METHOD 〕━━━⬣\x1b[0m');
    console.log('\x1b[36m┃\x1b[0m 1. QR Code  — scan with WhatsApp');
    console.log('\x1b[36m┃\x1b[0m 2. Pairing Code — enter phone number');
    console.log('\x1b[36m╰━━━━━━━━━━━━━━━━━━⬣\x1b[0m\n');

    const choice = await ask('Choose method (1 = QR / 2 = Pairing Code): ');
    if (choice === '2') {
      usePairingCode = true;
      phoneNumber = (await ask('Enter phone number (digits only, e.g. 14378898269): ')).replace(/\D/g, '');
      console.log(`\n📱 Requesting pairing code for +${phoneNumber}...\n`);
    } else {
      console.log('\n📷 QR Code will appear below. Scan it with WhatsApp:\n');
    }
  } else {
    console.log('\x1b[32m✅ Session found — reconnecting automatically...\x1b[0m\n');
  }

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: !usePairingCode,
    browser: ['DollarBot V5', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    retryRequestDelayMs: 500,
    maxMsgRetryCount: 5,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    shouldIgnoreJid: jid => isJidBroadcast(jid),
    getMessage: async () => ({ conversation: '' }),
  });

  if (usePairingCode && phoneNumber && !hasSession) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      const fmt = code.match(/.{1,4}/g)?.join('-') || code;
      console.log('\x1b[32m╭━━━〔 🔑 PAIRING CODE 〕━━━⬣\x1b[0m');
      console.log(`\x1b[32m┃\x1b[0m Code   : \x1b[33m${fmt}\x1b[0m`);
      console.log(`\x1b[32m┃\x1b[0m Number : +${phoneNumber}`);
      console.log('\x1b[32m┃\x1b[0m');
      console.log('\x1b[32m┃\x1b[0m Steps:');
      console.log('\x1b[32m┃\x1b[0m 1. Open WhatsApp on your phone');
      console.log('\x1b[32m┃\x1b[0m 2. Go to Settings → Linked Devices');
      console.log('\x1b[32m┃\x1b[0m 3. Tap "Link with phone number"');
      console.log(`\x1b[32m┃\x1b[0m 4. Enter code: \x1b[33m${fmt}\x1b[0m`);
      console.log('\x1b[32m╰━━━━━━━━━━━━━━━━━━⬣\x1b[0m\n');
    } catch (e) {
      console.error('\x1b[31m❌ Failed to get pairing code:', e.message, '\x1b[0m');
    }
  }

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;
    isConnecting = false;

    if (connection === 'open') {
      reconnectDelay = 3000;
      console.log('\x1b[32m╭━━━〔 ✅ CONNECTED 〕━━━⬣\x1b[0m');
      console.log('\x1b[32m┃\x1b[0m DollarBot V5 is Online!');
      console.log(`\x1b[32m┃\x1b[0m Engine: ${config.engine}`);
      console.log('\x1b[32m╰━━━━━━━━━━━━━━━━━━⬣\x1b[0m\n');
      console.log('\x1b[33m💵 DollarBot V5 — Smart • Fast • Limitless\x1b[0m\n');

      try {
        await sock.sendMessage(config.ownerJid, {
          text:
            `╭━━━〔 💵 DOLLARBOT V5 ONLINE 〕━━━⬣\n` +
            `┃ ✦ Status  : Online ✅\n` +
            `┃ ✦ Engine  : ${config.engine}\n` +
            `┃ ✦ Version : ${config.version}\n` +
            `┃ ✦ AI Mem  : Active 🧠\n` +
            `┃ ✦ Search  : Ready 🔍\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
            `Type *.menu* to see all commands!\n` +
            `«💵 DollarBot V5 — Smart • Fast • Limitless»`,
        });
      } catch (_) {}
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`\n\x1b[31m⚠️  Disconnected. Code: ${statusCode}\x1b[0m`);

      if (loggedOut) {
        console.log('\x1b[31m🚪 Logged out. Clearing session...\x1b[0m');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        console.log('🔄 Restarting bot in 3 seconds...');
        setTimeout(startBot, 3000);
      } else {
        console.log(`\x1b[33m🔄 Reconnecting in ${reconnectDelay / 1000}s...\x1b[0m`);
        setTimeout(startBot, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;
      await handleMessage(sock, msg);
    }
  });

  sock.ev.on('group-participants.update', async update => {
    await handleGroupParticipants(sock, update);
  });

  process.on('uncaughtException', err => {
    if (!err.message?.includes('ECONNRESET') && !err.message?.includes('write EPIPE')) {
      console.error('[Uncaught Exception]', err.message);
    }
  });

  process.on('unhandledRejection', err => {
    const msg = err?.message || String(err);
    if (!msg.includes('ECONNRESET') && !msg.includes('timed out')) {
      console.error('[Unhandled Rejection]', msg);
    }
  });
}

startBot().catch(console.error);
