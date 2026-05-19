const fs = require('fs');
const path = require('path');
const os = require('os');

const config = require('./config');
const store = require('./lib/store');

const userCommands    = require('./commands/user');
const ownerCommands   = require('./commands/owner');
const aiCommands      = require('./commands/ai');
const funCommands     = require('./commands/fun');
const utilityCommands = require('./commands/utility');
const gameCommands    = require('./commands/games');
const groupCommands   = require('./commands/group');
const searchCommands  = require('./commands/search');
const extraCommands   = require('./commands/extra');
const premiumCommands = require('./commands/premium');

const LINK_RE = /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/)[^\s]+/gi;

// ── Rotating menu image counter ───────────────────────────────────────────
let menuImageIndex = 0;

// ── Helpers ────────────────────────────────────────────────────────────────

function extractBody(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

function extractSender(msg, isGroup) {
  if (isGroup) {
    return msg.key.participant || msg.key.remoteJid;
  }
  if (msg.key.fromMe) {
    return config.ownerNumbers[0] + '@s.whatsapp.net';
  }
  return msg.key.remoteJid;
}

function isOwnerJid(sender) {
  if (!sender) return false;
  return config.ownerNumbers.some(num => sender.includes(num));
}

async function isBotAdmin(sock, jid) {
  try {
    const meta = await sock.groupMetadata(jid);
    const botBare = (sock.user?.id || '').split(':')[0].split('@')[0];
    return meta.participants.some(p => {
      const pBare = p.id.split(':')[0].split('@')[0];
      return pBare === botBare && !!p.admin;
    });
  } catch {
    return false;
  }
}

async function checkSenderAdmin(sock, jid, sender) {
  try {
    const meta = await sock.groupMetadata(jid);
    const senderBare = sender.split(':')[0].split('@')[0];
    return meta.participants.some(p => {
      const pBare = p.id.split(':')[0].split('@')[0];
      return pBare === senderBare && (p.admin === 'admin' || p.admin === 'superadmin');
    });
  } catch {
    return false;
  }
}

function getUptime() {
  const ms = Date.now() - config.startTime;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function getRamInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const pct = Math.round((used / total) * 100);
  const bars = Math.floor(pct / 20);
  const bar = '▰'.repeat(bars) + '▱'.repeat(5 - bars);
  const usedGB = (used / 1e9).toFixed(1);
  const totalGB = (total / 1e9).toFixed(1);
  return { pct, bar, usedGB, totalGB };
}

// ── Rotating menu sender ───────────────────────────────────────────────────
async function sendMenu(sock, jid, speedMs) {
  const ram = getRamInfo();
  const uptime = getUptime();
  const autoReply = store.get('autoreply') ? 'ON' : 'OFF';
  const speed = speedMs !== undefined ? `${speedMs}ms` : '-';

  const caption =
    `╭━━━〔 💵 𝐃𝐎𝐋𝐋𝐀𝐑𝐁𝐎𝐓 𝐕5 〕━━━⬣\n` +
    `┃ ✦ Owner   : ${config.ownerName}\n` +
    `┃ ✦ Country : ${config.ownerCountry}\n` +
    `┃ ✦ Prefix  : [ ${config.prefix} ]\n` +
    `┃ ✦ User    : Premium Member\n` +
    `┃ ✦ Mode    : Public\n` +
    `┃ ✦ Platform: WhatsApp\n` +
    `┃ ✦ Engine  : ${config.engine}\n` +
    `┃ ✦ Speed   : ${speed}\n` +
    `┃ ✦ Uptime  : ${uptime}\n` +
    `┃ ✦ Version : ${config.version}\n` +
    `┃ ✦ RAM     : ${ram.bar} ${ram.pct}%\n` +
    `┃ ✦ Usage   : ${ram.usedGB}GB / ${ram.totalGB}GB\n` +
    `┃ ✦ AutoReply: ${autoReply}\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `«⚡ Developed By Dollar\n⚡ Powered By Cortex & Mera AI»\n\n` +

    `╭━━━〔 👤 USER COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .ping\n` +
    `┃ ◇ .alive\n` +
    `┃ ◇ .owner\n` +
    `┃ ◇ .stats\n` +
    `┃ ◇ .info\n` +
    `┃ ◇ .time\n` +
    `┃ ◇ .jid\n` +
    `┃ ◇ .runtime\n` +
    `┃ ◇ .uptime\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🔐 OWNER COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .say <text>\n` +
    `┃ ◇ .sendto <number> <msg>\n` +
    `┃ ◇ .react <emoji>\n` +
    `┃ ◇ .delete\n` +
    `┃ ◇ .autoreply on/off\n` +
    `┃ ◇ .vv\n` +
    `┃ ◇ .broadcast <msg>\n` +
    `┃ ◇ .shutdown\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🧠 AI COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .cortex <question>\n` +
    `┃ ◇ .mera <question>\n` +
    `┃ ◇ .codeai <question>\n` +
    `┃ ◇ .roast <name>\n` +
    `┃ ◇ .complimentai <name>\n` +
    `┃ ◇ .weather <city>\n` +
    `┃ ◇ .imagine <prompt>\n` +
    `┃ ◇ .translate <text>\n` +
    `┃ ◇ .clear cortex/mera\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🔍 SEARCH COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .search <query>\n` +
    `┃ ◇ .wiki <topic>\n` +
    `┃ ◇ .define <word>\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🎭 FUN COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .joke\n` +
    `┃ ◇ .dadjoke\n` +
    `┃ ◇ .fact\n` +
    `┃ ◇ .advice\n` +
    `┃ ◇ .compliment\n` +
    `┃ ◇ .8ball <question>\n` +
    `┃ ◇ .truth\n` +
    `┃ ◇ .dare\n` +
    `┃ ◇ .reverse <text>\n` +
    `┃ ◇ .hotcheck <name>\n` +
    `┃ ◇ .smartcheck <name>\n` +
    `┃ ◇ .brainlevel <name>\n` +
    `┃ ◇ .coolcheck <name>\n` +
    `┃ ◇ .lovecheck <name>\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🛠️ UTILITY COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .calculate <expr>\n` +
    `┃ ◇ .genpass <length>\n` +
    `┃ ◇ .encode <text>\n` +
    `┃ ◇ .decode <base64>\n` +
    `┃ ◇ .qr <text/url>\n` +
    `┃ ◇ .tinyurl <url>\n` +
    `┃ ◇ .pingweb <url>\n` +
    `┃ ◇ .tts <text>\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🎮 GAME COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .coin\n` +
    `┃ ◇ .dice <sides>\n` +
    `┃ ◇ .rps <rock/paper/scissors>\n` +
    `┃ ◇ .math\n` +
    `┃ ◇ .guess <number>\n` +
    `┃ ◇ .slot\n` +
    `┃ ◇ .tictactoe <1-9>\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 👥 GROUP COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .kick @user\n` +
    `┃ ◇ .promote @user\n` +
    `┃ ◇ .demote @user\n` +
    `┃ ◇ .mute\n` +
    `┃ ◇ .unmute\n` +
    `┃ ◇ .tagall\n` +
    `┃ ◇ .everyone <msg>\n` +
    `┃ ◇ .hidetag <msg>\n` +
    `┃ ◇ .grouplink\n` +
    `┃ ◇ .groupinfo\n` +
    `┃ ◇ .antilink on/off\n` +
    `┃ ◇ .welcome on/off\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 💎 PREMIUM COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .enhance <prompt>\n` +
    `┃ ◇ .ship <name1> | <name2>\n` +
    `┃ ◇ .waifu\n` +
    `┃ ◇ .neko\n` +
    `┃ ◇ .crypto <coin>\n` +
    `┃ ◇ .tagadmin\n` +
    `┃ ◇ .getpp @user\n` +
    `┃ ◇ .vcard\n` +
    `┃ ◇ .poll <q> | <opts>\n` +
    `┃ ◇ .currency <amt> <f> <t>\n` +
    `┃ ◇ .summarizeweb <url>\n` +
    `┃ ◇ .fancy <text>\n` +
    `┃ ◇ .detect <text>\n` +
    `┃ ◇ .dareme / .truthme\n` +
    `┃ ◇ .factoid / .gquote\n` +
    `┃ ◇ .binary / .morse\n` +
    `┃ ◇ .temp <val> <C/F>\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 ✨ EXTRA COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .lyrics <song>\n` +
    `┃ ◇ .recipe <dish>\n` +
    `┃ ◇ .horoscope <sign>\n` +
    `┃ ◇ .rizz <target>\n` +
    `┃ ◇ .roastme\n` +
    `┃ ◇ .ipinfo <ip>\n` +
    `┃ ◇ .remind <secs> <msg>\n` +
    `┃ ◇ .styletext <text>\n` +
    `┃ ◇ .emoji <text>\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🚀 STATUS 〕━━━⬣\n` +
    `┃ DollarBot Online & Stable ✅\n` +
    `┃ AI Systems Operational ⚡\n` +
    `┃ Security Level : High 🔒\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `«💵 DollarBot V5 — Smart • Fast • Limitless»`;

  // Pick the next image in rotation
  const images = config.menuImages;
  const imgPath = images[menuImageIndex % images.length];
  menuImageIndex++;

  try {
    if (fs.existsSync(imgPath)) {
      const img = fs.readFileSync(imgPath);
      const sendPromise = sock.sendMessage(jid, { image: img, caption });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Media timeout')), 8000)
      );
      await Promise.race([sendPromise, timeoutPromise]);
      return;
    }
  } catch (err) {
    console.log('[Menu] Image send failed, falling back to text:', err.message);
  }
  await sock.sendMessage(jid, { text: caption });
}

function ownerOnly(sock, jid) {
  return sock.sendMessage(jid, { text: 'This command is restricted to the bot owner.' });
}

// ── Main message handler ────────────────────────────────────────────────────

async function handleMessage(sock, msg) {
  try {
    const jid = msg.key.remoteJid;
    if (!jid) return;

    // ── Auto-Like Status ─────────────────────────────────────────────────
    if (jid === 'status@broadcast') {
      if (store.get('autolike') && global.isAutoLikeActive) {
        const emojis = ['🔥', '❤️', '👍', '😍', '👏', '💯', '✨'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        try {
          await sock.sendMessage(msg.key.participant || msg.key.remoteJid, {
            react: { text: randomEmoji, key: msg.key },
          });
        } catch (_) {}
      }
      return;
    }

    const isGroup = jid.endsWith('@g.us');
    const sender  = extractSender(msg, isGroup);
    const isOwner = isOwnerJid(sender);
    const body    = extractBody(msg);
    if (!body) return;

    const isCmd = body.startsWith(config.prefix);

    if (!isCmd) {
      await handleNonCommand(sock, msg, body, jid, sender, isGroup, isOwner);
      return;
    }

    const [rawCmd, ...args] = body.slice(config.prefix.length).trim().split(/\s+/);
    const cmd = rawCmd.toLowerCase();
    const getIsAdmin = async () => isGroup ? await isBotAdmin(sock, jid) : false;
    const getIsSenderAdmin = async () => {
      if (isOwner) return true;
      if (!isGroup) return false;
      return await checkSenderAdmin(sock, jid, sender);
    };

    try { await sock.readMessages([msg.key]); } catch (_) {}
    try { await sock.sendPresenceUpdate('composing', jid); } catch (_) {}

    const cmdStart = Date.now();

    switch (cmd) {
      // ── Menu ────────────────────────────────────────────────────────────
      case 'menu': case 'help': case 'start': {
        const speed = Date.now() - cmdStart;
        await sendMenu(sock, jid, speed);
        break;
      }

      // ── User ────────────────────────────────────────────────────────────
      case 'ping':    await userCommands.ping(sock, msg); break;
      case 'alive':   await userCommands.alive(sock, msg); break;
      case 'owner':   await userCommands.owner(sock, msg); break;
      case 'stats':   await userCommands.stats(sock, msg); break;
      case 'info':    await userCommands.info(sock, msg); break;
      case 'details': await userCommands.details(sock, msg, sender); break;
      case 'time':    await userCommands.time(sock, msg); break;
      case 'jid':     await userCommands.jid(sock, msg, sender); break;
      case 'runtime': await userCommands.runtime(sock, msg); break;
      case 'uptime':  await userCommands.uptime(sock, msg); break;

      // ── Owner ────────────────────────────────────────────────────────────
      case 'say':       if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.say(sock, msg, args); break;
      case 'sendto':    if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.sendto(sock, msg, args); break;
      case 'react':     if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.react(sock, msg, args); break;
      case 'delete':    if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.delete(sock, msg); break;
      case 'autoreply': if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.autoreply(sock, msg, args); break;
      case 'autolike':  if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.autolike(sock, msg, args); break;
      case 'rapidlike': if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.rapidlike(sock, msg); break;
      case 'vv':        if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.vv(sock, msg); break;
      case 'broadcast': if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.broadcast(sock, msg, args); break;
      case 'shutdown':  if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.shutdown(sock, msg); break;

      // ── AI ───────────────────────────────────────────────────────────────
      case 'cortex':       await aiCommands.cortex(sock, msg, args, jid); break;
      case 'mera':         await aiCommands.mera(sock, msg, args, jid); break;
      case 'ask':          await aiCommands.ask(sock, msg, args, jid); break;
      case 'codeai':       await aiCommands.codeai(sock, msg, args, jid); break;
      case 'roast':        await aiCommands.roast(sock, msg, args, jid); break;
      case 'complimentai': await aiCommands.complimentai(sock, msg, args, jid); break;
      case 'weather':      await aiCommands.weather(sock, msg, args, jid); break;
      case 'imagine':      await aiCommands.imagine(sock, msg, args, jid); break;
      case 'translate':    await aiCommands.translate(sock, msg, args, jid); break;
      case 'story':        await aiCommands.story(sock, msg, args, jid); break;
      case 'poem':         await aiCommands.poem(sock, msg, args, jid); break;
      case 'motivate':     await aiCommands.motivate(sock, msg, args, jid); break;
      case 'summarize':    await aiCommands.summarize(sock, msg, args, jid); break;
      case 'clear':        await aiCommands.clear(sock, msg, args, jid); break;

      // ── Search ───────────────────────────────────────────────────────────
      case 'search': await searchCommands.search(sock, msg, args); break;
      case 'wiki':   await searchCommands.wiki(sock, msg, args); break;
      case 'define': await searchCommands.define(sock, msg, args); break;

      // ── Fun ──────────────────────────────────────────────────────────────
      case 'joke':       await funCommands.joke(sock, msg); break;
      case 'dadjoke':    await funCommands.dadjoke(sock, msg); break;
      case 'fact':       await funCommands.fact(sock, msg); break;
      case 'advice':     await funCommands.advice(sock, msg); break;
      case 'compliment': await funCommands.compliment(sock, msg); break;
      case '8ball':      await funCommands.eightball(sock, msg, args); break;
      case 'truth':      await funCommands.truth(sock, msg); break;
      case 'dare':       await funCommands.dare(sock, msg); break;
      case 'reverse':    await funCommands.reverse(sock, msg, args); break;
      case 'hotcheck':   await funCommands.hotcheck(sock, msg, args); break;
      case 'smartcheck': await funCommands.smartcheck(sock, msg, args); break;
      case 'brainlevel': await funCommands.brainlevel(sock, msg, args); break;
      case 'coolcheck':  await funCommands.coolcheck(sock, msg, args); break;
      case 'lovecheck':  await funCommands.lovecheck(sock, msg, args); break;

      // ── Utility ──────────────────────────────────────────────────────────
      case 'calculate': await utilityCommands.calculate(sock, msg, args); break;
      case 'genpass':   await utilityCommands.genpass(sock, msg, args); break;
      case 'encode':    await utilityCommands.encode(sock, msg, args); break;
      case 'decode':    await utilityCommands.decode(sock, msg, args); break;
      case 'qr':        await utilityCommands.qr(sock, msg, args); break;
      case 'tinyurl':   await utilityCommands.tinyurl(sock, msg, args); break;
      case 'pingweb':   await utilityCommands.pingweb(sock, msg, args); break;
      case 'tts':       await utilityCommands.tts(sock, msg, args); break;

      // ── Games ────────────────────────────────────────────────────────────
      case 'coin':      await gameCommands.coin(sock, msg); break;
      case 'dice':      await gameCommands.dice(sock, msg, args); break;
      case 'rps':       await gameCommands.rps(sock, msg, args); break;
      case 'math':      await gameCommands.math(sock, msg); break;
      case 'guess':     await gameCommands.guess(sock, msg, args); break;
      case 'slot':      await gameCommands.slot(sock, msg); break;
      case 'tictactoe': await gameCommands.tictactoe(sock, msg, args); break;

      // ── Extra ────────────────────────────────────────────────────────────
      case 'lyrics':    await extraCommands.lyrics(sock, msg, args); break;
      case 'recipe':    await extraCommands.recipe(sock, msg, args); break;
      case 'horoscope': await extraCommands.horoscope(sock, msg, args); break;
      case 'rizz':      await extraCommands.rizz(sock, msg, args); break;
      case 'roastme':   await extraCommands.roastme(sock, msg, args); break;
      case 'news':      await extraCommands.news(sock, msg, args); break;
      case 'riddle':    await extraCommands.riddle(sock, msg, args); break;
      case 'ipinfo':    await extraCommands.ipinfo(sock, msg, args); break;
      case 'remind':    await extraCommands.remind(sock, msg, args); break;
      case 'styletext': await extraCommands.styletext(sock, msg, args); break;
      case 'meme':      await extraCommands.meme(sock, msg, args); break;
      case 'emoji':     await extraCommands.emoji(sock, msg, args); break;
      case 'insult':    await extraCommands.insult(sock, msg, args); break;
      case 'quote':     await extraCommands.quote(sock, msg, args); break;

      // ── Premium ──────────────────────────────────────────────────────────
      case 'enhance':      await premiumCommands.enhance(sock, msg, args); break;
      case 'ship':         await premiumCommands.ship(sock, msg, args); break;
      case 'waifu':        await premiumCommands.waifu(sock, msg); break;
      case 'neko':         await premiumCommands.neko(sock, msg); break;
      case 'crypto':       await premiumCommands.crypto(sock, msg, args); break;
      case 'tagadmin':     await premiumCommands.tagadmin(sock, msg); break;
      case 'getpp':        await premiumCommands.getpp(sock, msg); break;
      case 'vcard':        await premiumCommands.vcard(sock, msg); break;
      case 'poll':         await premiumCommands.poll(sock, msg, args); break;
      case 'binary':       await premiumCommands.binary(sock, msg, args); break;
      case 'morse':        await premiumCommands.morse(sock, msg, args); break;
      case 'temp':         await premiumCommands.temp(sock, msg, args); break;
      case 'currency':     await premiumCommands.currency(sock, msg, args); break;
      case 'dareme':       await premiumCommands.dareme(sock, msg); break;
      case 'truthme':      await premiumCommands.truthme(sock, msg); break;
      case 'factoid':      await premiumCommands.factoid(sock, msg); break;
      case 'gquote':       await premiumCommands.gquote(sock, msg); break;
      case 'detect':       await premiumCommands.detect(sock, msg, args); break;
      case 'summarizeweb': await premiumCommands.summarizeweb(sock, msg, args); break;
      case 'fancy':        await premiumCommands.fancy(sock, msg, args); break;

      // ── Group ────────────────────────────────────────────────────────────
      case 'kick': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.kick(sock, msg, args, await getIsAdmin());
        break;
      }
      case 'promote': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.promote(sock, msg, args, await getIsAdmin());
        break;
      }
      case 'demote': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.demote(sock, msg, args, await getIsAdmin());
        break;
      }
      case 'mute': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.mute(sock, msg, await getIsAdmin());
        break;
      }
      case 'unmute': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.unmute(sock, msg, await getIsAdmin());
        break;
      }
      case 'tagall': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.tagall(sock, msg);
        break;
      }
      case 'everyone': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.everyone(sock, msg, args);
        break;
      }
      case 'hidetag': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.hidetag(sock, msg, args);
        break;
      }
      case 'grouplink': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.grouplink(sock, msg, await getIsAdmin());
        break;
      }
      case 'groupinfo': {
        await groupCommands.groupinfo(sock, msg);
        break;
      }
      case 'antilink': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.antilink(sock, msg, args);
        break;
      }
      case 'welcome': {
        if (!await getIsSenderAdmin()) return sock.sendMessage(jid, { text: '❌ This command is restricted to group admins and the bot owner.' });
        await groupCommands.welcome(sock, msg, args);
        break;
      }

      default:
        await sock.sendMessage(jid, {
          text: `Unknown command: *.${cmd}*\n\nType *.menu* to see all available commands.`,
        });
    }
  } catch (err) {
    console.error('[Handler Error]', err.message);
  }
}

async function handleNonCommand(sock, msg, body, jid, sender, isGroup, isOwner) {
  try {
    // ── Active math game check ─────────────────────────────────────────
    const mathDone = await gameCommands.checkMathAnswer(sock, msg, body);
    if (mathDone) return;

    // ── Active riddle check ────────────────────────────────────────────
    const riddleResult = extraCommands.checkRiddle(jid, body);
    if (riddleResult && riddleResult.correct !== undefined) {
      if (riddleResult.correct) {
        await sock.sendMessage(jid, {
          text: `Correct! The answer was *${riddleResult.answer}*. Well done!`,
        });
      }
      if (riddleResult.correct) return; // only return if correct (keep checking wrong answers)
    }

    // ── Anti-link in groups ───────────────────────────────────────────
    if (isGroup && !isOwner) {
      const antilinkGroups = store.get('antilinkGroups') || {};
      if (antilinkGroups[jid] && LINK_RE.test(body)) {
        try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
        await sock.sendMessage(jid, {
          text: `@${sender?.split('@')[0]} links are not allowed in this group.`,
          mentions: [sender],
        });
        return;
      }
    }

    // ── Auto-reply (DMs + group bot mentions) ─────────────────────────
    if (store.get('autoreply')) {
      // Get bot's bare number (strip :device and @domain)
      const rawId = sock.user?.id || '';
      const botBare = rawId.split(':')[0].split('@')[0];

      // Check if bot is mentioned — WhatsApp mentions in two ways:
      // 1. @number in message body text
      // 2. JID in contextInfo.mentionedJid array
      const mentionedJids =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
        msg.message?.imageMessage?.contextInfo?.mentionedJid || [];

      const isMentionedInJids = mentionedJids.some(j => {
        const bare = j.split(':')[0].split('@')[0];
        return bare === botBare;
      });
      const isMentionedInBody = body.includes('@' + botBare);
      const isMentioned = isMentionedInBody || isMentionedInJids;

      // In groups: only respond if bot is mentioned
      // In DMs: always respond
      if (!isGroup || isMentioned) {
        try {
          await sock.sendPresenceUpdate('composing', jid);
          const { autoReplyAI } = require('./lib/pollinations');
          // Strip @mention from the message before sending to AI
          const cleanBody = body
            .replace(new RegExp(`@${botBare}`, 'g'), '')
            .replace(/@\d+/g, '')
            .trim() || 'Hello';
          const aiResponse = await autoReplyAI(jid, cleanBody);
          await sock.sendMessage(jid, { text: aiResponse }, { quoted: msg });
        } catch (err) {
          console.log('[AutoReply Error]', err.message);
        }
        return;
      }
    }
  } catch (_) {}
}

async function handleGroupParticipants(sock, update) {
  try {
    const { id, participants, action } = update;
    const welcomeGroups = store.get('welcomeGroups') || {};
    if (!welcomeGroups[id]) return;

    for (const participant of participants) {
      const tag = `@${participant.split('@')[0]}`;
      if (action === 'add') {
        await sock.sendMessage(id, {
          text:
            `╭━━━〔 👋 WELCOME 〕━━━⬣\n` +
            `┃\n` +
            `┃ Welcome ${tag}! 🎉\n` +
            `┃ Glad you joined us!\n` +
            `┃\n` +
            `┃ Type *.menu* for bot commands.\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣`,
          mentions: [participant],
        });
      } else if (action === 'remove') {
        await sock.sendMessage(id, {
          text: `👋 ${tag} has left the group. Take care!`,
          mentions: [participant],
        });
      }
    }
  } catch (_) {}
}

module.exports = { handleMessage, handleGroupParticipants };
