const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidNormalizedUser,
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

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const logger = pino({ level: 'silent' });

function question(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, answer => { rl.close(); resolve(answer.trim()); }));
}

function printBanner() {
  console.log('\n');
  console.log('╭━━━〔 💵 DOLLARBOT V5 〕━━━⬣');
  console.log('┃ ✦ Owner  : Dollar');
  console.log('┃ ✦ Country: Canada 🇨🇦');
  console.log('┃ ✦ Engine : Cortex AI');
  console.log('┃ ✦ Version: 5.0.0');
  console.log('╰━━━━━━━━━━━━━━━━━━⬣');
  console.log('«⚡ Powered By Cortex & Mera AI»\n');
}

async function startBot() {
  printBanner();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const hasSession = fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  let pairingCode = false;
  let phoneNumber = '';

  if (!hasSession) {
    console.log('╭━━━〔 🔐 LOGIN METHOD 〕━━━⬣');
    console.log('┃ 1. QR Code (scan with WhatsApp)');
    console.log('┃ 2. Pairing Code (enter phone number)');
    console.log('╰━━━━━━━━━━━━━━━━━━⬣\n');
    const choice = await question('Choose login method (1 for QR / 2 for Pairing Code): ');
    if (choice === '2') {
      pairingCode = true;
      phoneNumber = await question('Enter your WhatsApp number (e.g. 14378898269): ');
      phoneNumber = phoneNumber.replace(/\D/g, '');
      console.log(`\n📱 Requesting pairing code for +${phoneNumber}...\n`);
    } else {
      console.log('\n📷 Scan the QR code below with WhatsApp:\n');
    }
  } else {
    console.log('✅ Session found — reconnecting...\n');
  }

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: !pairingCode,
    browser: ['DollarBot V5', 'Chrome', '5.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 10000,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    getMessage: async () => ({ conversation: '' }),
  });

  if (pairingCode && phoneNumber && !hasSession) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log('╭━━━〔 🔑 PAIRING CODE 〕━━━⬣');
      console.log(`┃ Code: ${code}`);
      console.log(`┃ Number: +${phoneNumber}`);
      console.log('┃');
      console.log('┃ Steps:');
      console.log('┃ 1. Open WhatsApp on your phone');
      console.log('┃ 2. Go to Settings > Linked Devices');
      console.log('┃ 3. Tap "Link with phone number"');
      console.log(`┃ 4. Enter code: ${code}`);
      console.log('╰━━━━━━━━━━━━━━━━━━⬣\n');
    } catch (e) {
      console.error('❌ Failed to get pairing code:', e.message);
    }
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'open') {
      console.log('\n╭━━━〔 ✅ CONNECTED 〕━━━⬣');
      console.log(`┃ DollarBot V5 is Online!`);
      console.log(`┃ Number: +${config.ownerNumber}`);
      console.log(`┃ Engine: ${config.engine}`);
      console.log('╰━━━━━━━━━━━━━━━━━━⬣\n');
      console.log('💵 DollarBot V5 — Smart • Fast • Limitless\n');

      try {
        await sock.sendMessage(config.ownerJid, {
          text:
            `╭━━━〔 💵 DOLLARBOT V5 STARTED 〕━━━⬣\n` +
            `┃ ✦ Status : Online ✅\n` +
            `┃ ✦ Engine : ${config.engine}\n` +
            `┃ ✦ Version: ${config.version}\n` +
            `┃ ✦ Prefix : [ ${config.prefix} ]\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
            `Type *.menu* to see all commands!\n` +
            `«💵 DollarBot V5 — Smart • Fast • Limitless»`,
        });
      } catch (_) {}
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      console.log(`\n⚠️  Connection closed. Reason: ${reason}`);
      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 5 seconds...');
        setTimeout(startBot, 5000);
      } else {
        console.log('🚪 Logged out. Clearing session...');
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        } catch (_) {}
        console.log('🔄 Restarting bot...');
        setTimeout(startBot, 2000);
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

  sock.ev.on('group-participants.update', async (update) => {
    await handleGroupParticipants(sock, update);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err.message);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[Unhandled Rejection]', err?.message || err);
  });

  return sock;
}

startBot().catch(console.error);
