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

const LINK_RE = /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/)[^\s]+/gi;
const MENU_IMG = path.join(__dirname, '../assets/menu.jpg');

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
  return isGroup
    ? (msg.key.participant || msg.key.remoteJid)
    : msg.key.remoteJid;
}

function isOwnerJid(sender) {
  if (!sender) return false;
  return sender.includes(config.ownerNumber);
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

async function sendMenu(sock, jid, speedMs) {
  const ram = getRamInfo();
  const uptime = getUptime();
  const autoReply = store.get('autoreply') ? 'ON ✅' : 'OFF ❌';
  const speed = speedMs !== undefined ? `${speedMs} ms` : '—';

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

    `╭━━━〔 🚀 STATUS 〕━━━⬣\n` +
    `┃ DollarBot Online & Stable ✅\n` +
    `┃ AI Systems Operational ⚡\n` +
    `┃ Security Level : High 🔒\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `«💵 DollarBot V5 — Smart • Fast • Limitless»`;

  try {
    if (fs.existsSync(MENU_IMG)) {
      const img = fs.readFileSync(MENU_IMG);
      await sock.sendMessage(jid, { image: img, caption });
      return;
    }
  } catch (_) {}
  await sock.sendMessage(jid, { text: caption });
}

function ownerOnly(sock, jid) {
  return sock.sendMessage(jid, { text: '🔐 This command is restricted to the bot owner.' });
}

// ── Main message handler ────────────────────────────────────────────────────

async function handleMessage(sock, msg) {
  try {
    const jid = msg.key.remoteJid;
    if (!jid || jid === 'status@broadcast') return;

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

    try { await sock.readMessages([msg.key]); } catch (_) {}
    try { await sock.sendPresenceUpdate('composing', jid); } catch (_) {}

    // Measure speed for menu
    const cmdStart = Date.now();

    switch (cmd) {
      case 'menu': case 'help': case 'start': {
        const pingMsg = await sock.sendMessage(jid, { text: '⏳ Loading menu...' });
        const speed = Date.now() - cmdStart;
        await sendMenu(sock, jid, speed);
       
      }

      // ── User ──────────────────────────────────────────────────────────────
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

      // ── Owner ─────────────────────────────────────────────────────────────
      case 'say':       if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.say(sock, msg, args); break;
      case 'sendto':    if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.sendto(sock, msg, args); break;
      case 'react':     if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.react(sock, msg, args); break;
      case 'delete':    if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.delete(sock, msg); break;
      case 'autoreply': if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.autoreply(sock, msg, args); break;
      case 'vv':        if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.vv(sock, msg); break;
      case 'broadcast': if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.broadcast(sock, msg, args); break;
      case 'shutdown':  if (!isOwner) return ownerOnly(sock, jid); await ownerCommands.shutdown(sock, msg); break;

      // ── AI ────────────────────────────────────────────────────────────────
      case 'cortex':       await aiCommands.cortex(sock, msg, args, jid); break;
      case 'mera':         await aiCommands.mera(sock, msg, args, jid); break;
      case 'codeai':       await aiCommands.codeai(sock, msg, args, jid); break;
      case 'roast':        await aiCommands.roast(sock, msg, args, jid); break;
      case 'complimentai': await aiCommands.complimentai(sock, msg, args, jid); break;
      case 'weather':      await aiCommands.weather(sock, msg, args, jid); break;
      case 'imagine':      await aiCommands.imagine(sock, msg, args, jid); break;
      case 'translate':    await aiCommands.translate(sock, msg, args, jid); break;
      case 'clear':        await aiCommands.clear(sock, msg, args, jid); break;

      // ── Search ────────────────────────────────────────────────────────────
      case 'search': await searchCommands.search(sock, msg, args); break;
      case 'wiki':   await searchCommands.wiki(sock, msg, args); break;
      case 'define': await searchCommands.define(sock, msg, args); break;

      // ── Fun ───────────────────────────────────────────────────────────────
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

      // ── Utility ───────────────────────────────────────────────────────────
      case 'calculate': await utilityCommands.calculate(sock, msg, args); break;
      case 'genpass':   await utilityCommands.genpass(sock, msg, args); break;
      case 'encode':    await utilityCommands.encode(sock, msg, args); break;
      case 'decode':    await utilityCommands.decode(sock, msg, args); break;
      case 'qr':        await utilityCommands.qr(sock, msg, args); break;
      case 'tinyurl':   await utilityCommands.tinyurl(sock, msg, args); break;
      case 'pingweb':   await utilityCommands.pingweb(sock, msg, args); break;
      case 'tts':       await utilityCommands.tts(sock, msg, args); break;

      // ── Games ─────────────────────────────────────────────────────────────
      case 'coin':      await gameCommands.coin(sock, msg); break;
      case 'dice':      await gameCommands.dice(sock, msg, args); break;
      case 'rps':       await gameCommands.rps(sock, msg, args); break;
      case 'math':      await gameCommands.math(sock, msg); break;
      case 'guess':     await gameCommands.guess(sock, msg, args); break;
      case 'slot':      await gameCommands.slot(sock, msg); break;
      case 'tictactoe': await gameCommands.tictactoe(sock, msg, args); break;

      // ── Group ─────────────────────────────────────────────────────────────
      case 'kick':      await groupCommands.kick(sock, msg, args, await getIsAdmin()); break;
      case 'promote':   await groupCommands.promote(sock, msg, args, await getIsAdmin()); break;
      case 'demote':    await groupCommands.demote(sock, msg, args, await getIsAdmin()); break;
      case 'mute':      await groupCommands.mute(sock, msg, await getIsAdmin()); break;
      case 'unmute':    await groupCommands.unmute(sock, msg, await getIsAdmin()); break;
      case 'tagall':    await groupCommands.tagall(sock, msg); break;
      case 'everyone':  await groupCommands.everyone(sock, msg, args); break;
      case 'hidetag':   await groupCommands.hidetag(sock, msg, args); break;
      case 'grouplink': await groupCommands.grouplink(sock, msg, await getIsAdmin()); break;
      case 'groupinfo': await groupCommands.groupinfo(sock, msg); break;
      case 'antilink':  await groupCommands.antilink(sock, msg, args); break;
      case 'welcome':   await groupCommands.welcome(sock, msg, args); break;

      default:
        await sock.sendMessage(jid, {
          text: `❓ Unknown command: *.${cmd}*\n\nType *.menu* to see all available commands.`,
        });
    }
  } catch (err) {
    console.error('[Handler Error]', err.message);
  }
}

async function handleNonCommand(sock, msg, body, jid, sender, isGroup, isOwner) {
  try {
    // Active math game answer
    const done = await gameCommands.checkMathAnswer(sock, msg, body);
    if (done) return;

    // Anti-link
    if (isGroup && !isOwner) {
      const antilinkGroups = store.get('antilinkGroups') || {};
      if (antilinkGroups[jid] && LINK_RE.test(body)) {
        try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
        await sock.sendMessage(jid, {
          text: `🚫 @${sender?.split('@')[0]}, links are not allowed here!`,
          mentions: [sender],
        });
        return;
      }
    }

    // Auto-reply DMs
    if (store.get('autoreply') && !isGroup) {
      const replies = [
        `👋 Hey! I'm *DollarBot V5* 🤖\nType *.menu* to see all my features!`,
        `💵 DollarBot V5 is active. Type *.menu* for commands!`,
        `⚡ Online and ready! Type *.menu* to get started.`,
      ];
      await sock.sendMessage(jid, { text: replies[Math.floor(Math.random() * replies.length)] });
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
