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
const toolsCommands   = require('./commands/tools');
const apiCommands     = require('./commands/api');
const mediaCommands   = require('./commands/media');
const devCommands     = require('./commands/dev');
const moreFun         = require('./commands/morefun');
const { bypassCommands, checkBypassIntercept } = require('./commands/bypass');
const { extractBody, getMentionedJids } = require('./lib/messages');

const LINK_RE = /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/)[^\s]+/gi;

let menuImageIndex = 0;

// ── Helpers ────────────────────────────────────────────────────────────────

function extractSender(msg, isGroup) {
  if (isGroup) return msg.key.participant || msg.key.remoteJid;
  if (msg.key.fromMe) return config.ownerNumbers[0] + '@s.whatsapp.net';
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
  } catch { return false; }
}

async function checkSenderAdmin(sock, jid, sender) {
  try {
    const meta = await sock.groupMetadata(jid);
    const senderBare = sender.split(':')[0].split('@')[0];
    return meta.participants.some(p => {
      const pBare = p.id.split(':')[0].split('@')[0];
      return pBare === senderBare && (p.admin === 'admin' || p.admin === 'superadmin');
    });
  } catch { return false; }
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

async function safeSendMessage(sock, jid, payload, msgObj = null) {
  try {
    if (msgObj && jid.endsWith('@g.us')) {
      return await sock.sendMessage(jid, payload, { quoted: msgObj });
    }
    return await sock.sendMessage(jid, payload);
  } catch (err) {
    const msg = err?.message || String(err);
    if (!/not-acceptable/i.test(msg)) throw err;
    try {
      const sanitized = { ...payload };
      if (sanitized.mentions) delete sanitized.mentions;
      if (sanitized.image || sanitized.video || sanitized.document || sanitized.sticker) {
        const text = sanitized.caption ?? sanitized.text ?? '';
        if (msgObj && jid.endsWith('@g.us')) return await sock.sendMessage(jid, { text }, { quoted: msgObj });
        return await sock.sendMessage(jid, { text });
      }
      const text = sanitized.text ?? '';
      if (payload.text || payload.caption || text) {
        if (msgObj && jid.endsWith('@g.us')) return await sock.sendMessage(jid, { text: payload.text ?? payload.caption ?? '' }, { quoted: msgObj });
        return await sock.sendMessage(jid, { text: payload.text ?? payload.caption ?? '' });
      }
      if (msgObj && jid.endsWith('@g.us')) return await sock.sendMessage(jid, { text: ' ' }, { quoted: msgObj });
      return await sock.sendMessage(jid, { text: ' ' });
    } catch (err2) { throw err2; }
  }
}

// ── Menu ───────────────────────────────────────────────────────────────────
async function sendMenu(sock, jid, speedMs) {
  const ram = getRamInfo();
  const uptime = getUptime();
  const autoReply = (await store.get('autoreply')) ? 'ON' : 'OFF';
  const speed = speedMs !== undefined ? `${speedMs}ms` : '-';

  const caption =
    `╭━━━〔 💵 𝐃𝐎𝐋𝐋𝐀𝐑𝐁𝐎𝐓 𝐕5 〕━━━⬣\n` +
    `┃ ✦ Owner   : ${config.ownerName}\n` +
    `┃ ✦ Country : ${config.ownerCountry}\n` +
    `┃ ✦ Prefix  : [ ${config.prefix} ]\n` +
    `┃ ✦ Mode    : Public\n` +
    `┃ ✦ Engine  : ${config.engine}\n` +
    `┃ ✦ Speed   : ${speed}\n` +
    `┃ ✦ Uptime  : ${uptime}\n` +
    `┃ ✦ Version : ${config.version}\n` +
    `┃ ✦ RAM     : ${ram.bar} ${ram.pct}%\n` +
    `┃ ✦ AutoReply: ${autoReply}\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `«⚡ Developed By Dollar\n⚡ Powered By Cortex & Mera AI»\n\n` +

    `╭━━━〔 👤 USER 〕━━━⬣\n` +
    `┃ .ping .alive .owner .stats .info\n` +
    `┃ .time .jid .runtime .uptime\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🔐 OWNER 〕━━━⬣\n` +
    `┃ .say .sendto .react .delete .vv\n` +
    `┃ .autoreply .broadcast .shutdown\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🧠 AI 〕━━━⬣\n` +
    `┃ .cortex .mera .ask .codeai\n` +
    `┃ .roast .complimentai .weather\n` +
    `┃ .imagine .translate .story .poem\n` +
    `┃ .motivate .summarize .clear\n` +
    `┃ .summary .vision .manhwa\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🔍 SEARCH 〕━━━⬣\n` +
    `┃ .search .wiki .define\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🎭 FUN 〕━━━⬣\n` +
    `┃ .joke .dadjoke .fact .advice\n` +
    `┃ .compliment .8ball .truth .dare\n` +
    `┃ .reverse .hotcheck .smartcheck\n` +
    `┃ .brainlevel .coolcheck .lovecheck\n` +
    `┃ .wouldyourather .neverhavei\n` +
    `┃ .paranoia .sus .iq .cringe .simp\n` +
    `┃ .rizzmeter .slay .bully .thisorthat\n` +
    `┃ .bodycount .conspiracy .superpower\n` +
    `┃ .fortune .rap .genz .villain .hero\n` +
    `┃ .emojify .lovecalc .twotruth\n` +
    `┃ .darkhumor .advice2 .roastbattle\n` +
    `┃ .friendlevel .personality .challenge\n` +
    `┃ .rate .namemeaning .tonguetwister\n` +
    `┃ .roastself .mission .yesorno .factcat\n` +
    `┃ .wotd .typingtest .pickup .prank\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🎮 GAMES 〕━━━⬣\n` +
    `┃ .coin .dice .rps .math .guess\n` +
    `┃ .slot .tictactoe .trivia .hangman\n` +
    `┃ .guess (hangman letter)\n` +
    `┃ .scramble .highlow .hl <num>\n` +
    `┃ .spinwheel .lottery .roulette\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🛠️ UTILITY 〕━━━⬣\n` +
    `┃ .calculate .genpass .encode .decode\n` +
    `┃ .qr .tinyurl .pingweb .tts\n` +
    `┃ .roman .palindrome .bmi .tip\n` +
    `┃ .worldclock .daysuntil .wordcount\n` +
    `┃ .lorem .mocktext .shuffle .age\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 👥 GROUP 〕━━━⬣\n` +
    `┃ .kick .promote .demote .mute\n` +
    `┃ .unmute .tagall .everyone .hidetag\n` +
    `┃ .grouplink .groupinfo .antilink\n` +
    `┃ .welcome\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🔓 BYPASS (Owner) 〕━━━⬣\n` +
    `┃ .bypass admin @user\n` +
    `┃ .bypass silence @user\n` +
    `┃ .bypass unsilence @user\n` +
    `┃ .bypass nosticker on/off\n` +
    `┃ .bypass nosave on/off\n` +
    `┃ .bypass status\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🧩 AI EXTRAS 〕━━━⬣\n` +
    `┃ .debate .quiz .pickup .bedtime\n` +
    `┃ .eli5 .acronym .haiku .caption\n` +
    `┃ .prank .mythology .element\n` +
    `┃ .zodiac2 .numerology .dreaminterp\n` +
    `┃ .flag .timezone .bio\n` +
    `┃ .typingtest\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 💎 PREMIUM 〕━━━⬣\n` +
    `┃ .song .video .searchgoogle\n` +
    `┃ .searchimage .gnews .enhance\n` +
    `┃ .ship .waifu .neko .crypto\n` +
    `┃ .tagadmin .getpp .vcard .poll\n` +
    `┃ .binary .morse .temp .currency\n` +
    `┃ .dareme .truthme .factoid .gquote\n` +
    `┃ .detect .summarizeweb .fancy\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 ✨ EXTRA 〕━━━⬣\n` +
    `┃ .lyrics .recipe .horoscope .rizz\n` +
    `┃ .roastme .news .riddle .ipinfo\n` +
    `┃ .remind .styletext .meme .emoji\n` +
    `┃ .insult .quote\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `╭━━━〔 🚀 STATUS 〕━━━⬣\n` +
    `┃ DollarBot Online & Stable ✅\n` +
    `┃ AI Systems Operational ⚡\n` +
    `┃ Security Level : High 🔒\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +

    `«💵 DollarBot V5 — Smart • Fast • Limitless»`;

  const images = config.menuImages;
  const imgPath = images[menuImageIndex % images.length];
  menuImageIndex++;

  try {
    if (fs.existsSync(imgPath)) {
      const img = fs.readFileSync(imgPath);
      const sendPromise = safeSendMessage(sock, jid, { image: img, caption });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Media timeout')), 8000));
      await Promise.race([sendPromise, timeoutPromise]);
      return;
    }
  } catch (err) {
    console.log('[Menu] Image send failed, falling back to text:', err.message);
  }
  await safeSendMessage(sock, jid, { text: caption });
}

function ownerOnly(sock, jid) {
  return safeSendMessage(sock, jid, { text: '🔐 This command is restricted to the bot owner.' });
}

// ── Main message handler ────────────────────────────────────────────────────
async function handleMessage(sock, msg) {
  try {
    const jid = msg.key.remoteJid;
    if (!jid) return;

    // ── Auto-Like Status ─────────────────────────────────────────────────
    if (jid === 'status@broadcast') {
      if ((await store.get('autolike')) && global.isAutoLikeActive) {
        const emojis = ['🔥', '❤️', '👍', '😍', '👏', '💯', '✨'];
        try {
          await sock.sendMessage(msg.key.participant || msg.key.remoteJid, {
            react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key },
          });
        } catch (_) {}
      }
      return;
    }

    const isGroup = jid.endsWith('@g.us');
    const sender  = extractSender(msg, isGroup);
    const isOwner = isOwnerJid(sender);

    // ── Bypass intercept (group-level message policing) ──────────────────
    if (isGroup && !isOwner) {
      const intercepted = await checkBypassIntercept(sock, msg, jid);
      if (intercepted) return;
    }

    const bodyRaw = extractBody(msg);
    const body = bodyRaw?.trim();

    // ── Non-command messages ─────────────────────────────────────────────
    if (!body || !body.startsWith(config.prefix)) {
      await handleNonCommand(sock, msg, body || '', jid, sender, isGroup, isOwner);
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

      // ── Bypass (Owner-only, groups) ──────────────────────────────────────
      case 'bypass':
        await bypassCommands.bypass(sock, msg, args, isOwner);
        break;

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
      case 'summary':      await aiCommands.summary(sock, msg, args, jid); break;
      case 'vision':       await aiCommands.vision(sock, msg, args, jid); break;
      case 'manhwa':
      case 'manga2':       await aiCommands.manhwa(sock, msg, args, jid); break;

      // ── Search ───────────────────────────────────────────────────────────
      case 'search': await searchCommands.search(sock, msg, args); break;
      case 'wiki':   await searchCommands.wiki(sock, msg, args); break;
      case 'define': await searchCommands.define(sock, msg, args); break;

      // ── Fun ──────────────────────────────────────────────────────────────
      case 'joke':         await funCommands.joke(sock, msg); break;
      case 'dadjoke':      await funCommands.dadjoke(sock, msg); break;
      case 'fact':         await funCommands.fact(sock, msg); break;
      case 'advice':       await funCommands.advice(sock, msg); break;
      case 'compliment':   await funCommands.compliment(sock, msg); break;
      case '8ball':        await funCommands.eightball(sock, msg, args); break;
      case 'truth':        await funCommands.truth(sock, msg); break;
      case 'dare':         await funCommands.dare(sock, msg); break;
      case 'reverse':      await funCommands.reverse(sock, msg, args); break;
      case 'hotcheck':     await funCommands.hotcheck(sock, msg, args); break;
      case 'smartcheck':   await funCommands.smartcheck(sock, msg, args); break;
      case 'brainlevel':   await funCommands.brainlevel(sock, msg, args); break;
      case 'coolcheck':    await funCommands.coolcheck(sock, msg, args); break;
      case 'lovecheck':    await funCommands.lovecheck(sock, msg, args); break;

      // ── More Fun ─────────────────────────────────────────────────────────
      case 'wouldyourather':
      case 'wyr':          await moreFun.wouldyourather(sock, msg); break;
      case 'neverhavei':
      case 'nhi':          await moreFun.neverhavei(sock, msg); break;
      case 'paranoia':     await moreFun.paranoia(sock, msg); break;
      case 'sus':          await moreFun.sus(sock, msg, args); break;
      case 'iq':           await moreFun.iq(sock, msg, args); break;
      case 'cringe':       await moreFun.cringe(sock, msg); break;
      case 'simp':         await moreFun.simp(sock, msg, args); break;
      case 'rizzmeter':
      case 'rizzcheck':    await moreFun.rizzmeter(sock, msg, args); break;
      case 'slay':         await moreFun.slay(sock, msg, args); break;
      case 'bully':        await moreFun.bully(sock, msg, args); break;
      case 'thisorthat':
      case 'tot':          await moreFun.thisorthat(sock, msg); break;
      case 'bodycount':    await moreFun.bodycount(sock, msg, args); break;
      case 'conspiracy':   await moreFun.conspiracy(sock, msg); break;
      case 'superpower':   await moreFun.superpower(sock, msg, args); break;
      case 'typingtest':   await moreFun.typingtest(sock, msg); break;
      case 'pickup':       await moreFun.pickup(sock, msg, args); break;
      case 'prank':        await moreFun.prank(sock, msg, args); break;
      case 'fortune':      await moreFun.fortune(sock, msg); break;
      case 'rap':          await moreFun.rap(sock, msg, args); break;
      case 'genz':         await moreFun.genz(sock, msg, args); break;
      case 'villain':      await moreFun.villain(sock, msg, args); break;
      case 'hero':         await moreFun.hero(sock, msg, args); break;
      case 'emojify':      await moreFun.emojify(sock, msg, args); break;
      case 'lovecalc':     await moreFun.lovecalc(sock, msg, args); break;
      case 'twotruth':     await moreFun.twotruth(sock, msg, args); break;
      case 'darkhumor':    await moreFun.darkhumor(sock, msg); break;
      case 'advice2':      await moreFun.advice2(sock, msg, args); break;
      case 'roastbattle':  await moreFun.roastbattle(sock, msg, args); break;
      case 'friendlevel':  await moreFun.friendlevel(sock, msg, args); break;
      case 'wotd':         await moreFun.wotd(sock, msg); break;
      case 'personality':  await moreFun.personality(sock, msg, args); break;
      case 'challenge':    await moreFun.challenge(sock, msg); break;
      case 'rate':         await moreFun.rate(sock, msg, args); break;
      case 'namemeaning':  await moreFun.namemeaning(sock, msg, args); break;
      case 'tonguetwister':await moreFun.tonguetwister(sock, msg); break;
      case 'roastself':    await moreFun.roastself(sock, msg, args); break;
      case 'mission':      await moreFun.mission(sock, msg); break;
      case 'yesorno':      await moreFun.yesorno(sock, msg, args); break;
      case 'factcat':      await moreFun.factcat(sock, msg, args); break;

      // ── AI Extras ─────────────────────────────────────────────────────────
      case 'debate':       await moreFun.debate(sock, msg, args); break;
      case 'quiz':         await moreFun.quiz(sock, msg, args); break;
      case 'bedtime':      await moreFun.bedtime(sock, msg, args); break;
      case 'eli5':         await moreFun.eli5(sock, msg, args); break;
      case 'acronym':      await moreFun.acronym(sock, msg, args); break;
      case 'haiku':        await moreFun.haiku(sock, msg, args); break;
      case 'caption':      await moreFun.caption(sock, msg, args); break;
      case 'mythology':    await moreFun.mythology(sock, msg, args); break;
      case 'element':      await moreFun.element(sock, msg, args); break;
      case 'zodiac2':      await moreFun.zodiacread(sock, msg, args); break;
      case 'numerology':   await moreFun.numerology(sock, msg, args); break;
      case 'dreaminterp':  await moreFun.dreaminterp(sock, msg, args); break;
      case 'flag':         await moreFun.flag(sock, msg, args); break;
      case 'timezone':     await moreFun.timezone(sock, msg, args); break;
      case 'bio':          await moreFun.bio(sock, msg, args); break;

      // ── Games ────────────────────────────────────────────────────────────
      case 'coin':      await gameCommands.coin(sock, msg); break;
      case 'dice':      await gameCommands.dice(sock, msg, args); break;
      case 'rps':       await gameCommands.rps(sock, msg, args); break;
      case 'math':      await gameCommands.math(sock, msg); break;
      case 'guess':     await gameCommands.guess(sock, msg, args); break;
      case 'slot':      await gameCommands.slot(sock, msg); break;
      case 'tictactoe': await gameCommands.tictactoe(sock, msg, args); break;

      // ── More Games ───────────────────────────────────────────────────────
      case 'trivia':    await moreFun.trivia(sock, msg); break;
      case 'hangman':   await moreFun.hangman(sock, msg); break;
      case 'hguess':    await moreFun.hangmanguess(sock, msg, args); break;
      case 'scramble':  await moreFun.scramble(sock, msg); break;
      case 'highlow':   await moreFun.highlow(sock, msg); break;
      case 'hl':        await moreFun.hlguess(sock, msg, args); break;
      case 'spinwheel': await moreFun.spinwheel(sock, msg, args); break;
      case 'lottery':   await moreFun.lottery(sock, msg); break;
      case 'roulette':  await moreFun.roulette(sock, msg); break;

      // ── Utility ──────────────────────────────────────────────────────────
      case 'calculate': await utilityCommands.calculate(sock, msg, args); break;
      case 'genpass':   await utilityCommands.genpass(sock, msg, args); break;
      case 'encode':    await utilityCommands.encode(sock, msg, args); break;
      case 'decode':    await utilityCommands.decode(sock, msg, args); break;
      case 'qr':        await utilityCommands.qr(sock, msg, args); break;
      case 'tinyurl':   await utilityCommands.tinyurl(sock, msg, args); break;
      case 'pingweb':   await utilityCommands.pingweb(sock, msg, args); break;
      case 'tts':       await utilityCommands.tts(sock, msg, args); break;

      // ── More Utility ─────────────────────────────────────────────────────
      case 'roman':     await moreFun.roman(sock, msg, args); break;
      case 'palindrome': await moreFun.palindrome(sock, msg, args); break;
      case 'bmi':       await moreFun.bmi(sock, msg, args); break;
      case 'tip':       await moreFun.tip(sock, msg, args); break;
      case 'worldclock': await moreFun.worldclock(sock, msg); break;
      case 'daysuntil': await moreFun.daysuntil(sock, msg, args); break;
      case 'wordcount': await moreFun.wordcount(sock, msg, args); break;
      case 'lorem':     await moreFun.lorem(sock, msg, args); break;
      case 'mocktext':  await moreFun.mocktext(sock, msg, args); break;
      case 'shuffle':   await moreFun.shuffle(sock, msg, args); break;
      case 'age':       await moreFun.age(sock, msg, args); break;

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
      case 'song':         await premiumCommands.song(sock, msg, args); break;
      case 'video':        await premiumCommands.video(sock, msg, args); break;
      case 'searchgoogle': await premiumCommands.searchgoogle(sock, msg, args); break;
      case 'searchimage':  await premiumCommands.searchimage(sock, msg, args); break;
      case 'gnews':        await premiumCommands.gnews(sock, msg, args); break;

      // ── Group ────────────────────────────────────────────────────────────
      case 'kick': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.kick(sock, msg, args, await getIsAdmin());
        break;
      }
      case 'promote': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.promote(sock, msg, args, await getIsAdmin());
        break;
      }
      case 'demote': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.demote(sock, msg, args, await getIsAdmin());
        break;
      }
      case 'mute': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.mute(sock, msg, await getIsAdmin());
        break;
      }
      case 'unmute': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.unmute(sock, msg, await getIsAdmin());
        break;
      }
      case 'tagall': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.tagall(sock, msg);
        break;
      }
      case 'everyone': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.everyone(sock, msg, args);
        break;
      }
      case 'hidetag': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.hidetag(sock, msg, args);
        break;
      }
      case 'grouplink': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.grouplink(sock, msg, await getIsAdmin());
        break;
      }
      case 'groupinfo': {
        await groupCommands.groupinfo(sock, msg);
        break;
      }
      case 'antilink': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.antilink(sock, msg, args);
        break;
      }
      case 'welcome': {
        if (!jid.endsWith('@g.us')) return msg.reply('❌ Groups only.');
        if (!await getIsSenderAdmin()) return msg.reply('❌ This command is restricted to group admins and the bot owner.');
        await groupCommands.welcome(sock, msg, args);
        break;
      }

      // ── Tools ────────────────────────────────────────────────────────────
      case 'hash':          await toolsCommands.hash(sock, msg, args); break;
      case 'uuid':          await toolsCommands.uuid(sock, msg); break;
      case 'jsonformat':    await toolsCommands.jsonformat(sock, msg, args); break;
      case 'textstats':     await toolsCommands.textstats(sock, msg, args); break;
      case 'dns':           await toolsCommands.dns(sock, msg, args); break;
      case 'color':         await toolsCommands.color(sock, msg); break;
      case 'country':       await toolsCommands.country(sock, msg, args); break;
      case 'ageguess':      await toolsCommands.ageguess(sock, msg, args); break;
      case 'genderpredict': await toolsCommands.genderpredict(sock, msg, args); break;
      case 'nickname':      await toolsCommands.nickname(sock, msg, args); break;
      case 'animalfact':    await toolsCommands.animalfact(sock, msg); break;
      case 'passcheck':     await toolsCommands.passcheck(sock, msg, args); break;

      // ── API ──────────────────────────────────────────────────────────────
      case 'pokemon':     await apiCommands.pokemon(sock, msg, args); break;
      case 'anime':       await apiCommands.anime(sock, msg, args); break;
      case 'manga':       await apiCommands.manga(sock, msg, args); break;
      case 'book':        await apiCommands.book(sock, msg, args); break;
      case 'jokepro':     await apiCommands.jokepro(sock, msg); break;
      case 'uselessfact': await apiCommands.uselessfact(sock, msg); break;
      case 'bbquote':     await apiCommands.bbquote(sock, msg); break;
      case 'kanye':       await apiCommands.kanye(sock, msg); break;
      case 'adviceslip':  await apiCommands.adviceslip(sock, msg); break;
      case 'catfact':     await apiCommands.catfact(sock, msg); break;
      case 'spacepic':    await apiCommands.spacepic(sock, msg); break;
      case 'zenquote':    await apiCommands.zenquote(sock, msg); break;
      case 'weather2':    await apiCommands.weather2(sock, msg, args); break;
      case 'iplocation':  await apiCommands.iplocation(sock, msg, args); break;
      case 'crypto':      await apiCommands.crypto(sock, msg, args); break;
      case 'urlinfo':     await apiCommands.urlinfo(sock, msg, args); break;

      // ── Media ────────────────────────────────────────────────────────────
      case 'randomcat':      await mediaCommands.randomcat(sock, msg); break;
      case 'randomdog':      await mediaCommands.randomdog(sock, msg); break;
      case 'asciiart':       await mediaCommands.asciiart(sock, msg, args); break;
      case 'randommeme':     await mediaCommands.randommeme(sock, msg); break;
      case 'abstractart':    await mediaCommands.abstractart(sock, msg); break;
      case 'qrgen':          await mediaCommands.qrgen(sock, msg, args); break;
      case 'unsplashrandom': await mediaCommands.unsplashrandom(sock, msg, args); break;
      case 'flagimg':        await mediaCommands.flagimg(sock, msg, args); break;
      case 'avatar':         await mediaCommands.avatar(sock, msg, args); break;
      case 'placeholder':    await mediaCommands.placeholder(sock, msg, args); break;
      case 'barcode':        await mediaCommands.barcode(sock, msg, args); break;
      case 'randombird':     await mediaCommands.randombird(sock, msg); break;
      case 'map':            await mediaCommands.map(sock, msg, args); break;
      case 'gradient':       await mediaCommands.gradient(sock, msg, args); break;

      // ── Dev ──────────────────────────────────────────────────────────────
      case 'jsonminify': await devCommands.jsonminify(sock, msg, args); break;
      case 'timestamp':  await devCommands.timestamp(sock, msg, args); break;
      case 'base32':     await devCommands.base32(sock, msg, args); break;
      case 'jwtdecode':  await devCommands.jwtdecode(sock, msg, args); break;
      case 'regextest':  await devCommands.regextest(sock, msg, args); break;
      case 'urlencode':  await devCommands.urlencode(sock, msg, args); break;
      case 'uuidgen':    await devCommands.uuidgen(sock, msg); break;
      case 'httpstatus': await devCommands.httpstatus(sock, msg, args); break;
      case 'mime':       await devCommands.mime(sock, msg, args); break;
      case 'langinfo':   await devCommands.langinfo(sock, msg, args); break;
      case 'randomport': await devCommands.randomport(sock, msg); break;
      case 'npmpkg':     await devCommands.npmpkg(sock, msg, args); break;
      case 'mdpreview':  await devCommands.mdpreview(sock, msg, args); break;
      case 'gitcommit':  await devCommands.gitcommit(sock, msg, args); break;

      default:
        // Only send "unknown command" reply — don't throw errors for things like
        // stickers, reactions, or media that slipped through with a body
        if (cmd && cmd.length > 0) {
          await sock.sendMessage(jid, {
            text: `❓ Unknown command: *.${cmd}*\n\nType *.menu* to see all commands.`,
          });
        }
    }
  } catch (err) {
    // Silently ignore common network errors to avoid console spam
    const msg2 = err?.message || String(err);
    if (!/ECONNRESET|EPIPE|not-acceptable|timed out/i.test(msg2)) {
      console.error('[Handler Error]', msg2);
    }
  }
}

// ── Non-command handler (fixed: anti-link works in groups, no auto-reply in groups) ──
async function handleNonCommand(sock, msg, body, jid, sender, isGroup, isOwner) {
  try {
    // ── Active math game check (works everywhere) ──────────────────────
    if (body) {
      const mathDone = await gameCommands.checkMathAnswer(sock, msg, body);
      if (mathDone) return;
    }

    // ── Active riddle check ────────────────────────────────────────────
    if (body) {
      const riddleResult = extraCommands.checkRiddle(jid, body);
      if (riddleResult && riddleResult.correct !== undefined) {
        if (riddleResult.correct) {
          await sock.sendMessage(jid, { text: `✅ Correct! The answer was *${riddleResult.answer}*. Well done! 🎉` });
        }
        if (riddleResult.correct) return;
      }
    }

    // ── Trivia answer check ───────────────────────────────────────────
    if (body) {
      const triviaResult = require('./commands/morefun').checkTrivia(jid, body);
      if (triviaResult) {
        if (triviaResult.expired) {
          await sock.sendMessage(jid, { text: `⏰ Trivia time is up! The game has expired. Start a new one with *.trivia*` });
        } else if (triviaResult.correct) {
          await sock.sendMessage(jid, { text: `🎉 *Correct!* Well done! The answer was *${triviaResult.answer}*!` });
        }
        if (triviaResult.correct) return;
      }
    }

    // ── Scramble answer check ─────────────────────────────────────────
    if (body) {
      const scrambleResult = require('./commands/morefun').checkScramble(jid, body);
      if (scrambleResult) {
        if (scrambleResult.correct) {
          await sock.sendMessage(jid, { text: `🎉 *Correct!* The word was *${scrambleResult.answer.toUpperCase()}*! You unscrambled it!` });
        }
        if (scrambleResult.correct) return;
      }
    }

    // ── Anti-link in groups ──────────────────────────────────────────────
    if (isGroup && !isOwner && body) {
      const antilinkGroups = (await store.get('antilinkGroups')) || {};
      if (antilinkGroups[jid] && LINK_RE.test(body)) {
        try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
        await safeSendMessage(sock, jid, {
          text: `⛔ @${sender?.split('@')[0]} links are not allowed in this group.`,
          mentions: [sender],
        }, msg);
        return;
      }
    }

    // ── Auto-reply: ONLY in DMs, never in groups ─────────────────────────
    if (isGroup) return;

    if (await store.get('autoreply')) {
      try {
        await sock.sendPresenceUpdate('composing', jid);
        const { autoReplyAI } = require('./lib/pollinations');
        const cleanBody = body.trim() || 'Hello';
        const aiResponse = await autoReplyAI(jid, cleanBody);
        await safeSendMessage(sock, jid, { text: aiResponse });
      } catch (err) {
        console.log('[AutoReply Error]', err.message);
      }
    }
  } catch (_) {}
}

// ── Group participant events ───────────────────────────────────────────────
async function handleGroupParticipants(sock, update) {
  try {
    const { id, participants, action } = update;
    const welcomeGroups = (await store.get('welcomeGroups')) || {};
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
