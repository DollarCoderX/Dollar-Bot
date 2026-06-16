'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const config        = require('./config');
const store         = require('./lib/store');
const { convertToOggOpus } = require('./lib/audio');

const userCommands    = require('./commands/user');
const ownerCommands   = require('./commands/owner');
const aiCommands      = require('./commands/ai');
const funCommands     = require('./commands/fun');
const utilityCommands = require('./commands/utility');
const gameCommands    = require('./commands/games');
const { groupCommands, handleAntilinkViolation: _halb } = require('./commands/group');
const searchCommands  = require('./commands/search');
const extraCommands   = require('./commands/extra');
const premiumCommands = require('./commands/premium');
const toolsCommands   = require('./commands/tools');
const apiCommands     = require('./commands/api');
const mediaCommands   = require('./commands/media');
const devCommands     = require('./commands/dev');
const moreFun         = require('./commands/morefun');
const { bypassCommands, checkBypassIntercept } = require('./commands/bypass');
const stickerCommands = require('./commands/sticker');
const wildCommands    = require('./commands/wild');
const geminiCommands  = require('./commands/gemini');
const { safeSend } = require('./lib/safe-send');
const socialCommands  = require('./commands/social');
const { handleAntilinkViolation } = require('./commands/group');


// ─────────────────────────────────────────────────────────────────────────────
//  Message parsing — proper Baileys proto.IWebMessageInfo patterns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unwrap wrapper message types (ephemeral, viewOnce, documentWithCaption, etc.)
 * so we always work with the innermost real message content.
 */
function unwrapContent(raw) {
  let c = raw || {};
  for (let i = 0; i < 8; i++) {
    const next =
      c.ephemeralMessage?.message ||
      c.viewOnceMessage?.message ||
      c.viewOnceMessageV2?.message ||
      c.viewOnceMessageV2Extension?.message ||
      c.documentWithCaptionMessage?.message ||
      c.protocolMessage?.editedMessage ||
      c.editedMessage?.message;
    if (!next || next === c) break;
    c = next;
  }
  return c;
}

/**
 * Extract the text body from any message type.
 * Handles: text, extendedText, image/video/document captions,
 *          button/list/template replies, interactive flows.
 */
function extractBody(msg) {
  if (msg?._body !== undefined) return msg._body;           // cache hit
  const c = unwrapContent(msg?.message);
  const body =
    c.conversation ||
    c.extendedTextMessage?.text ||
    c.imageMessage?.caption ||
    c.videoMessage?.caption ||
    c.documentMessage?.caption ||
    c.buttonsResponseMessage?.selectedButtonId ||
    c.listResponseMessage?.singleSelectReply?.selectedRowId ||
    c.templateButtonReplyMessage?.selectedId ||
    (() => {
      const raw = c.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
      if (!raw) return '';
      try { const p = JSON.parse(raw); return p.id || p.title || p.name || raw; } catch { return raw; }
    })() ||
    '';
  if (msg && typeof msg === 'object') msg._body = body;    // cache result
  return body;
}

/**
 * Get the contextInfo block from any message type.
 * This contains: quoted message, mentionedJid, participant, etc.
 */
function getContextInfo(msg) {
  const c = unwrapContent(msg?.message);
  return (
    c.extendedTextMessage?.contextInfo ||
    c.imageMessage?.contextInfo ||
    c.videoMessage?.contextInfo ||
    c.documentMessage?.contextInfo ||
    c.audioMessage?.contextInfo ||
    c.stickerMessage?.contextInfo ||
    c.buttonsResponseMessage?.contextInfo ||
    c.listResponseMessage?.contextInfo ||
    c.templateButtonReplyMessage?.contextInfo ||
    c.interactiveResponseMessage?.contextInfo ||
    null
  );
}

/** Returns the JID of the person whose message was quoted/replied to */
function getQuotedParticipant(msg) {
  return getContextInfo(msg)?.participant ?? null;
}

/** Returns array of @mentioned JIDs */
function getMentionedJids(msg) {
  const m = getContextInfo(msg)?.mentionedJid;
  return Array.isArray(m) ? m : [];
}

/**
 * Resolve the sender of a message.
 * In groups the real sender is msg.key.participant, not remoteJid.
 * fromMe DMs resolve to owner's own JID.
 */
function resolveSender(msg, sock) {
  const { remoteJid, participant, fromMe } = msg.key;
  if (fromMe) return sock?.user?.id || (config.ownerNumbers[0] + '@s.whatsapp.net');
  if (remoteJid?.endsWith('@g.us')) return participant || remoteJid;
  return remoteJid;
}

/** Strip :device suffix from Baileys JIDs for bare-number comparison */
function bareJid(jid) {
  return (jid || '').replace(/:.*@/, '@');
}

function isOwnerJid(jid) {
  const num = bareJid(jid).split('@')[0];
  return config.ownerNumbers.some(o => o === num || jid?.includes(o));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Group admin helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getBotAdmin(sock, jid) {
  try {
    const meta = await sock.groupMetadata(jid);
    const botNum = bareJid(sock.user?.id || '').split('@')[0];
    return meta.participants.find(p => {
      const pNum = bareJid(p.id).split('@')[0];
      return pNum === botNum && (p.admin === 'admin' || p.admin === 'superadmin');
    }) || null;
  } catch { return null; }
}

async function isBotAdmin(sock, jid) {
  return !!(await getBotAdmin(sock, jid));
}

async function isSenderAdmin(sock, jid, senderJid) {
  try {
    const meta = await sock.groupMetadata(jid);
    const sNum = bareJid(senderJid).split('@')[0];
    return meta.participants.some(p => {
      const pNum = bareJid(p.id).split('@')[0];
      return pNum === sNum && (p.admin === 'admin' || p.admin === 'superadmin');
    });
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Misc helpers
// ─────────────────────────────────────────────────────────────────────────────

const LINK_RE = /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/)[^\s]+/gi;

let menuImageIndex = 0;

function getUptime() {
  const ms = Date.now() - config.startTime;
  const s  = Math.floor(ms / 1000);
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
}

function getRamInfo() {
  const used  = os.totalmem() - os.freemem();
  const total = os.totalmem();
  const pct   = Math.round((used / total) * 100);
  const bars  = Math.floor(pct / 20);
  return {
    pct, usedGB: (used / 1e9).toFixed(1), totalGB: (total / 1e9).toFixed(1),
    bar: '▰'.repeat(bars) + '▱'.repeat(5 - bars),
  };
}

function replyOptions(quotedMsg) {
  return quotedMsg ? { quoted: quotedMsg } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
//  Emoji reaction map (fires before every command reply)
// ─────────────────────────────────────────────────────────────────────────────

const CMD_EMOJIS = {
  // Menu
  menu:'💵', help:'💵', start:'💵',
  // User
  ping:'🏓', alive:'✅', owner:'👑', stats:'📊', info:'ℹ️', details:'📋',
  time:'🕐', jid:'🆔', runtime:'⏱️', uptime:'⏰',
  // Owner
  say:'📢', sendto:'📨', react:'👍', autoreply:'🤖',
  autolike:'❤️', rapidlike:'💨', vv:'👁️', broadcast:'📡', shutdown:'🔴',
  bypass:'🔓',
  // AI
  cortex:'🧠', mera:'💖', ask:'💬', codeai:'💻', roast:'🔥',
  complimentai:'🌸', weather:'🌤️', imagine:'🎨', translate:'🌍',
  story:'📖', poem:'🎭', motivate:'💪', summarize:'📊', summary:'📊',
  clear:'🧹', vision:'👁️', manhwa:'📚',
  // Search
  search:'🔍', wiki:'📚', define:'📖',
  // Fun
  joke:'😂', dadjoke:'😄', fact:'💡', advice:'🤝', compliment:'🌺',
  '8ball':'🎱', truth:'😬', dare:'😈', reverse:'🔄', hotcheck:'🌡️',
  smartcheck:'🧠', brainlevel:'🧪', coolcheck:'😎', lovecheck:'💕',
  wouldyourather:'🤔', wyr:'🤔', neverhavei:'🙈', nhi:'🙈',
  paranoia:'👀', sus:'🕵️', iq:'🧠', cringe:'😬', simp:'💘',
  rizzmeter:'💅', rizzcheck:'💅', slay:'💃', bully:'😤',
  thisorthat:'⚖️', tot:'⚖️', bodycount:'💀', conspiracy:'🕵️',
  superpower:'🦸', typingtest:'⌨️', pickup:'😏', prank:'😂',
  fortune:'🥠', rap:'🎤', genz:'💅', villain:'🦹', hero:'🦸',
  emojify:'✨', lovecalc:'💘', twotruth:'🎭', darkhumor:'💀',
  advice2:'💬', roastbattle:'🔥', friendlevel:'👥', wotd:'📚',
  personality:'🧠', challenge:'🎯', rate:'📊', namemeaning:'📖',
  tonguetwister:'👅', roastself:'🔥', mission:'🎯', yesorno:'🔮', factcat:'💡',
  // AI Extras
  debate:'⚔️', quiz:'❓', bedtime:'🌙', eli5:'👶', acronym:'🔤',
  haiku:'🌸', caption:'📸', mythology:'⚡', element:'🔬',
  zodiac2:'♈', numerology:'🔢', dreaminterp:'💭', flag:'🏳️', timezone:'🕐', bio:'✨',
  // Games
  coin:'🪙', dice:'🎲', rps:'✂️', math:'➕', guess:'🎯',
  slot:'🎰', tictactoe:'❌', trivia:'❓', hangman:'🪓',
  hguess:'🔤', scramble:'🔀', highlow:'📈', hl:'📈',
  spinwheel:'🎡', lottery:'🎟️', roulette:'🎡',
  // Utility
  calculate:'🔢', genpass:'🔑', encode:'🔒', decode:'🔓',
  qr:'📱', tinyurl:'🔗', pingweb:'📡', tts:'🔊',
  roman:'🏛️', palindrome:'🔄', bmi:'⚖️', tip:'💰',
  worldclock:'🌍', daysuntil:'📅', wordcount:'📝', lorem:'📄',
  mocktext:'😜', shuffle:'🔀', age:'🎂',
  // Group
  kick:'👢', add:'➕', promote:'⬆️', demote:'⬇️', mute:'🔇', unmute:'🔊',
  open:'🔓', close:'🔒', tagall:'📢', everyone:'📢', hidetag:'👻',
  grouplink:'🔗', revoke:'🔄', groupinfo:'📋', admins:'👑',
  setname:'✏️', setdesc:'📝', antilink:'🚫', welcome:'👋', delete:'🗑️',
  // Premium / Extra
  song:'🎵', video:'🎥', enhance:'✨', ship:'💞', waifu:'🌸', neko:'🐱', crypto:'💰',
};

function getCmdEmoji(cmd) {
  const emojiFromMap = CMD_EMOJIS[cmd];
  if (emojiFromMap) return emojiFromMap;

  // Fallback: stable “different emoji per command” using a hash
  const fallback = ['💵','🤖','✨','⚡','🔥','💎','🧠','🧩','🎯','🎲','🧹','🔒','🔓','📌','📡','🧬','🎭','📸','🗑️','🕵️','🦾','🧪','🌍','🪙'];
  let h = 0;
  const s = String(cmd);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return fallback[h % fallback.length];
}

function reactToCmd(sock, msg, cmd) {
  const emoji = getCmdEmoji(cmd);
  sock.sendMessage(msg.key.remoteJid, {
    react: { text: emoji, key: msg.key },
  }).catch(() => {});
}


// ─────────────────────────────────────────────────────────────────────────────
//  Menu
// ─────────────────────────────────────────────────────────────────────────────

async function sendMenu(sock, jid, speedMs, quotedMsg) {
  const ram     = getRamInfo();
  const uptime  = getUptime();
  const autoRep = (await store.get('autoreply')) ? 'ON ✅' : 'OFF ❌';
  const speed   = speedMs !== undefined ? `${speedMs}ms` : '–';
  const botMode = (await store.get('botMode')) || 'public';
  const prefix  = (await store.get('botPrefix')) || config.prefix;

  const caption =
    `▸▸▸━━━━━━━━━━━━━━━━━━━━━━◁\n` +
    `      ☠️ *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* ☠️\n` +
    `▸▸▸━━━━━━━━━━━━━━━━━━━━━━◁\n\n` +

    `⚡ *Neural Core*  ::  *Active*\n` +
    `🔒 *Signal*  ::  *Encrypted*\n` +
    `◇━━━━━━━━━━━━━━━━━━━━━━━━━◇\n\n` +

    `┌━━━〔 ☠️ *SYSTEM HUB* ☠️ 〕━━━┐\n` +
    `│▪ *Dev*      :: ${config.ownerName} ${config.ownerCountry}\n` +
    `│▪ *Prefix*   :: [ ${prefix} ]\n` +
    `│▪ *Mode*     :: ${botMode === 'self' ? '🔒 SELF' : '🌐 PUBLIC'}\n` +
    `│▪ *Engine*   :: ${config.engine}\n` +
    `│▪ *Speed*    :: ${speed}\n` +
    `│▪ *Uptime*   :: ${uptime}\n` +
    `│▪ *Version*  :: ${config.version}\n` +
    `│▪ *RAM*      :: ${ram.bar} ${ram.pct}%\n` +
    `│▪ *AutoReply*:: ${autoRep}\n` +
    `└━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `◇━━━━━━━━━━━━━━━━━━━━━━━━━◇\n\n` +

    `┌━━━〔 👤 *USER* 〕━━━┐\n` +
    `│ .ping .alive .owner .stats\n` +
    `│ .info .time .jid .runtime\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🔐 *OWNER* 〕━━━┐\n` +
    `│ .say .sendto .react .vv\n` +
    `│ .autoreply .broadcast .shutdown\n` +
    `│ .prefix — change bot prefix\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🧠 *AI CORE* 〕━━━┐\n` +
    `│ .cortex .mera .ask .codeai\n` +
    `│ .roast .complimentai .weather\n` +
    `│ .imagine .translate .story .poem\n` +
    `│ .motivate .summarize .summary\n` +
    `│ .vision .manhwa .clear\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🔍 *SEARCH* 〕━━━┐\n` +
    `│ .search .wiki .define\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🎭 *FUN* 〕━━━┐\n` +
    `│ .joke .dadjoke .fact .advice\n` +
    `│ .compliment .8ball .truth .dare\n` +
    `│ .reverse .hotcheck .smartcheck\n` +
    `│ .brainlevel .coolcheck .lovecheck\n` +
    `│ .wouldyourather .neverhavei\n` +
    `│ .paranoia .iq .cringe .simp\n` +
    `│ .rizzmeter .slay .bully .thisorthat\n` +
    `│ .bodycount .prank .fortune .sus\n` +
    `│ .superpower .rap .genz .villain .hero\n` +
    `│ .emojify .lovecalc .twotruth\n` +
    `│ .darkhumor .roastbattle .personality\n` +
    `│ .pickup .typingtest .wotd\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 👥 *SOCIAL* ☠️ 〕━━━┐\n` +
    `│ .gaycheck .lesbiancheck .bisexualcheck\n` +
    `│ .chad .sigma .npc .karen .toxic\n` +
    `│ .demon .angel .goat .king .queen\n` +
    `│ .baddie .savage .nerd .hater .single\n` +
    `│ .clout .swag .drip .luck .karma\n` +
    `│ .cuteness .crush .stancheck .salary\n` +
    `│ .lifespan .phone .celeb .actor\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🔮 *AI INTEL* 〕━━━┐\n` +
    `│ .prediction .timeline .compare\n` +
    `│ .versus .explain .funfact .history\n` +
    `│ .hack .matrix .anagram .emoji2\n` +
    `│ .reverse2 .dark2 .love2 .roast2\n` +
    `│ .mythology2 .conspiracy2 .zodiac3\n` +
    `│ .encode2 .decrypt .wordgame\n` +
    `│ .country2 .planet .animal .nutrition\n` +
    `│ .exercise .language2 .decode2\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🎮 *GAMES* 〕━━━┐\n` +
    `│ .coin .dice .rps .math .guess\n` +
    `│ .slot .tictactoe .trivia .hangman\n` +
    `│ .hguess .scramble .highlow .hl\n` +
    `│ .spinwheel .lottery .roulette\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🛠️ *UTILITY* 〕━━━┐\n` +
    `│ .calculate .genpass .encode .decode\n` +
    `│ .qr .tinyurl .pingweb .tts\n` +
    `│ .roman .palindrome .bmi .tip\n` +
    `│ .worldclock .daysuntil .wordcount\n` +
    `│ .lorem .mocktext .shuffle .age\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🎨 *STICKER* 〕━━━┐\n` +
    `│ .sticker  — image/video ➔ sticker\n` +
    `│ .toimg    — sticker ➔ image\n` +
    `│ .steal    — rebrand any sticker\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 👥 *GROUP* (admin) 〕━━━┐\n` +
    `│ .kick .add .promote .demote\n` +
    `│ .mute .unmute .tagall .everyone\n` +
    `│ .grouplink .groupinfo .admins\n` +
    `│ .antilink .welcome .antidelete\n` +
    `│ .antibot .cancelbot .save .delete\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🔓 *BYPASS* (Owner) 〕━━━┐\n` +
    `│ .bypass admin/silence/unsilence\n` +
    `│ .bypass nosticker/nosave/status\n` +
    `│ .self   — owner-only mode\n` +
    `│ .public — everyone mode\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🧩 *AI EXTRAS* 〕━━━┐\n` +
    `│ .debate .quiz .bedtime .eli5\n` +
    `│ .acronym .haiku .caption\n` +
    `│ .mythology .element .zodiac2\n` +
    `│ .numerology .dreaminterp .flag\n` +
    `│ .timezone .bio\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 💎 *PREMIUM* 〕━━━┐\n` +
    `│ .song .video .enhance .ship\n` +
    `│ .waifu .neko .searchgoogle\n` +
    `│ .searchimage .gnews .crypto\n` +
    `│ .tagadmin .getpp .vcard .poll\n` +
    `│ .binary .morse .detect .fancy\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 ✨ *EXTRA* 〕━━━┐\n` +
    `│ .lyrics .recipe .horoscope .rizz\n` +
    `│ .roastme .news .riddle .remind\n` +
    `│ .styletext .meme .emoji .quote\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `◇━━━━━━━━━━━━━━━━━━━━━━━━━◇\n` +
    `┃ 🔗 *Channel:* wa.me/channel/0029VbCoG7s3AzNU5TtmiM3f\n` +
    `◇━━━━━━━━━━━━━━━━━━━━━━━━━◇\n\n` +
    `☠️ *DollarBot V5 — Neural ◇ Lethal ◇ Limitless* ☠️`;

  const imgPath = config.menuImages[menuImageIndex++ % config.menuImages.length];
  try {
    if (fs.existsSync(imgPath)) {
      await Promise.race([
        safeSend(sock, jid, {
          image: fs.readFileSync(imgPath),
          caption,
          contextInfo: {
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.newsletterJid || '0029VbCoG7s3AzNU5TtmiM3f@newsletter',
              newsletterName: 'DollarBot V5',
              serverMessageId: 1,
            },
          },
        }, replyOptions(quotedMsg)),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000)),
      ]);
    } else {
      await safeSend(sock, jid, { text: caption }, replyOptions(quotedMsg));
    }
  } catch (_) {
    await safeSend(sock, jid, { text: caption }, replyOptions(quotedMsg));
  }

  // ── Send menu song as PTT voice note after menu ──────────────────────────
  try {
    const oggPath = path.join(__dirname, '..', 'assets', 'menu_song.ogg');
    const mp3Path = path.join(__dirname, '..', 'assets', 'menu_song.mp3');
    if (fs.existsSync(oggPath)) {
      // Use pre-converted OGG/Opus — no delay
      await sock.sendMessage(jid, {
        audio: fs.readFileSync(oggPath),
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
      });
    } else if (fs.existsSync(mp3Path)) {
      // Fallback: convert on the fly
      const oggBuffer = await convertToOggOpus(fs.readFileSync(mp3Path), 'mp3');
      await sock.sendMessage(jid, {
        audio: oggBuffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
      });
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main message handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleMessage(sock, msg) {
  try {
    // ── Basic guards ────────────────────────────────────────────────────────
    const jid = msg.key?.remoteJid;
    if (!jid) return;

    // ── Anti-delete check ───────────────────────────────────────────────────
    const protocolMsg = msg.message?.protocolMessage || msg.message?.ephemeralMessage?.message?.protocolMessage;
    if (protocolMsg?.type === 3) {
      const isGroup = jid.endsWith('@g.us');
      if (isGroup) {
        const antideleteGroups = (await store.get('antideleteGroups')) || {};
        if (antideleteGroups[jid]) {
          const deletedId = protocolMsg.key?.id;
          if (deletedId) {
            const cached = global.msgStore?.messages?.[jid]?.array?.find(m => m.key.id === deletedId);
            if (cached && cached.message) {
              const sender = resolveSender(cached, sock);
              const senderNum = bareJid(sender).split('@')[0];
              const botJid = (sock.user?.id || '').replace(/:.*@/, '@').split('@')[0];
              if (senderNum !== botJid) {
                resendDeletedMessage(sock, jid, cached, sender);
              }
            }
          }
        }
      }
      return;
    }

    // ── Status broadcast: only auto-like ────────────────────────────────────
    if (jid === 'status@broadcast') {
      if ((await store.get('autolike')) && global.isAutoLikeActive) {
        const emojis = ['🔥', '❤️', '👍', '😍', '👏', '💯', '✨'];
        sock.sendMessage(msg.key.participant || jid, {
          react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key },
        }).catch(() => {});
      }
      return;
    }

    const isGroup = jid.endsWith('@g.us');
    const sender  = resolveSender(msg, sock);
    const isOwner = isOwnerJid(sender) || !!msg.key.fromMe;

    // ── Self/Public mode guard — ignore non-owners when in self mode ────────
    if (!isOwner) {
      const botMode = (await store.get('botMode')) || 'public';
      if (botMode === 'self') return; // silently ignore non-owner in self mode
    }

    // ── Anti-Bot: detect and kick rival bots from group ─────────────────────
    if (isGroup && !isOwner) {
      await checkAntiBotKick(sock, msg, jid, sender);
    }

    // ── Bypass intercept (silenced users, anti-sticker, no-save) ───────────
    if (isGroup && !isOwner) {
      const blocked = await checkBypassIntercept(sock, msg, jid);
      if (blocked) return;
    }

    // ── Attach helpers onto msg ─────────────────────────────────────────────
    //    msg.reply(text, options) — always quotes the triggering message
    msg.reply = (text, opts = {}) =>
      safeSend(sock, jid, { text, ...opts }, replyOptions(msg));

    // ── Extract body ────────────────────────────────────────────────────────
    const body = (extractBody(msg) || '').trim();

    // ── Non-command path ────────────────────────────────────────────────────
    if (!body || !body.startsWith(config.prefix)) {
      return handleNonCommand(sock, msg, body, jid, sender, isGroup, isOwner);
    }

    // ── Parse command ───────────────────────────────────────────────────────
    const [rawCmd, ...args] = body.slice(config.prefix.length).trim().split(/\s+/);
    if (!rawCmd) return;
    const cmd = rawCmd.toLowerCase();

    // ── Side-effects before dispatch ────────────────────────────────────────
    sock.readMessages([msg.key]).catch(() => {});
    sock.sendPresenceUpdate('composing', jid).catch(() => {});
    reactToCmd(sock, msg, cmd);       // non-blocking emoji reaction

    // ── Sender-admin check (lazy, cached per call) ──────────────────────────
    let _senderAdmin = null;
    const senderIsAdmin = async () => {
      if (isOwner) return true;
      if (!isGroup) return false;
      if (_senderAdmin === null) _senderAdmin = await isSenderAdmin(sock, jid, sender);
      return _senderAdmin;
    };

    const t0 = Date.now();
    // Helper to clear typing indicator when done (always call after command)
    const stopTyping = () => sock.sendPresenceUpdate('paused', jid).catch(() => {});

    // ────────────────────────────────────────────────────────────────────────
    switch (cmd) {

      // ── Menu ──────────────────────────────────────────────────────────────
      case 'menu': case 'help': case 'start':
        await sendMenu(sock, jid, Date.now() - t0, msg);
        break;

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
      case 'say':       if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.say(sock, msg, args); break;
      case 'sendto':    if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.sendto(sock, msg, args); break;
      case 'react':     if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.react(sock, msg, args); break;
      case 'autoreply': if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.autoreply(sock, msg, args); break;
      case 'autolike':  if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.autolike(sock, msg, args); break;
      case 'rapidlike': if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.rapidlike(sock, msg); break;
      case 'vv':        if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.vv(sock, msg); break;
      case 'broadcast': if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.broadcast(sock, msg, args); break;
      case 'shutdown':  if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.shutdown(sock, msg); break;
      case 'self':      if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.self(sock, msg); break;
      case 'public':    if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.public(sock, msg); break;

      // ── Delete — owner can delete from DM context, admins in groups ───────
      case 'delete': {
        if (isOwner) { await ownerCommands.delete(sock, msg); break; }
        if (isGroup && await senderIsAdmin()) { await groupCommands.delete(sock, msg); break; }
        return msg.reply('🔐 Only the owner or group admins can delete messages.');
      }

      // ── Bypass ────────────────────────────────────────────────────────────
      case 'bypass':
        await bypassCommands.bypass(sock, msg, args, isOwner);
        break;

      // ── Prefix (owner only) ───────────────────────────────────────────────
      case 'prefix': {
        if (!isOwner) return msg.reply('🔐 Owner only.');
        if (!args[0]) {
          const cur = (await store.get('botPrefix')) || config.prefix;
          return msg.reply(`⚙️ *Current prefix:* \`${cur}\`\nUsage: .prefix <new_prefix>`);
        }
        const newPfx = args[0].trim().slice(0, 3);
        await store.set('botPrefix', newPfx);
        config.prefix = newPfx;
        await msg.reply(`✅ *Prefix changed to:* \`${newPfx}\`\n_All commands now use \`${newPfx}\` as prefix._`);
        break;
      }

      // ── AI ────────────────────────────────────────────────────────────────
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

      // ── Gemini (image edit) ────────────────────────────────────────────────
      case 'gemini':
        await geminiCommands.gemini(sock, msg, args);
        break;

      // ── Search ────────────────────────────────────────────────────────────

      case 'search': await searchCommands.search(sock, msg, args); break;
      case 'wiki':   await searchCommands.wiki(sock, msg, args); break;
      case 'define': await searchCommands.define(sock, msg, args); break;

      // ── Fun ───────────────────────────────────────────────────────────────
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

      // ── More Fun ──────────────────────────────────────────────────────────
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
      case 'debate':      await moreFun.debate(sock, msg, args); break;
      case 'quiz':        await moreFun.quiz(sock, msg, args); break;
      case 'bedtime':     await moreFun.bedtime(sock, msg, args); break;
      case 'eli5':        await moreFun.eli5(sock, msg, args); break;
      case 'acronym':     await moreFun.acronym(sock, msg, args); break;
      case 'haiku':       await moreFun.haiku(sock, msg, args); break;
      case 'caption':     await moreFun.caption(sock, msg, args); break;
      case 'mythology':   await moreFun.mythology(sock, msg, args); break;
      case 'element':     await moreFun.element(sock, msg, args); break;
      case 'zodiac2':     await moreFun.zodiacread(sock, msg, args); break;
      case 'numerology':  await moreFun.numerology(sock, msg, args); break;
      case 'dreaminterp': await moreFun.dreaminterp(sock, msg, args); break;
      case 'flag':        await moreFun.flag(sock, msg, args); break;
      case 'timezone':    await moreFun.timezone(sock, msg, args); break;
      case 'bio':         await moreFun.bio(sock, msg, args); break;

      // ── Games ─────────────────────────────────────────────────────────────
      case 'coin':      await gameCommands.coin(sock, msg); break;
      case 'dice':      await gameCommands.dice(sock, msg, args); break;
      case 'rps':       await gameCommands.rps(sock, msg, args); break;
      case 'math':      await gameCommands.math(sock, msg); break;
      case 'guess':     await gameCommands.guess(sock, msg, args); break;
      case 'slot':      await gameCommands.slot(sock, msg); break;
      case 'tictactoe': await gameCommands.tictactoe(sock, msg, args); break;

      // ── More Games ────────────────────────────────────────────────────────
      case 'trivia':    await moreFun.trivia(sock, msg); break;
      case 'hangman':   await moreFun.hangman(sock, msg); break;
      case 'hguess':    await moreFun.hangmanguess(sock, msg, args); break;
      case 'scramble':  await moreFun.scramble(sock, msg); break;
      case 'highlow':   await moreFun.highlow(sock, msg); break;
      case 'hl':        await moreFun.hlguess(sock, msg, args); break;
      case 'spinwheel': await moreFun.spinwheel(sock, msg, args); break;
      case 'lottery':   await moreFun.lottery(sock, msg); break;
      case 'roulette':  await moreFun.roulette(sock, msg); break;

      // ── Utility ───────────────────────────────────────────────────────────
      case 'calculate': await utilityCommands.calculate(sock, msg, args); break;
      case 'genpass':   await utilityCommands.genpass(sock, msg, args); break;
      case 'encode':    await utilityCommands.encode(sock, msg, args); break;
      case 'decode':    await utilityCommands.decode(sock, msg, args); break;
      case 'qr':        await utilityCommands.qr(sock, msg, args); break;
      case 'tinyurl':   await utilityCommands.tinyurl(sock, msg, args); break;
      case 'pingweb':   await utilityCommands.pingweb(sock, msg, args); break;
      case 'tts':       await utilityCommands.tts(sock, msg, args); break;

      // ── More Utility ──────────────────────────────────────────────────────
      case 'roman':      await moreFun.roman(sock, msg, args); break;
      case 'palindrome': await moreFun.palindrome(sock, msg, args); break;
      case 'bmi':        await moreFun.bmi(sock, msg, args); break;
      case 'tip':        await moreFun.tip(sock, msg, args); break;
      case 'worldclock': await moreFun.worldclock(sock, msg); break;
      case 'daysuntil':  await moreFun.daysuntil(sock, msg, args); break;
      case 'wordcount':  await moreFun.wordcount(sock, msg, args); break;
      case 'lorem':      await moreFun.lorem(sock, msg, args); break;
      case 'mocktext':   await moreFun.mocktext(sock, msg, args); break;
      case 'shuffle':    await moreFun.shuffle(sock, msg, args); break;
      case 'age':        await moreFun.age(sock, msg, args); break;

      // ── Extra ─────────────────────────────────────────────────────────────
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

      // ── Premium ───────────────────────────────────────────────────────────
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
      case 'movie':
        await require('./commands/movie').movie(sock, msg, args);
        break;




      // ── Group — admin-restricted ───────────────────────────────────────────
      case 'kick':
      case 'add':
      case 'promote':
      case 'demote':
      case 'mute':
      case 'unmute':
      case 'open':
      case 'close':
      case 'tagall':
      case 'everyone':
      case 'hidetag':
      case 'grouplink':
      case 'revoke':
      case 'setname':
      case 'setdesc':
      case 'antilink':
      case 'welcome':
      case 'antidelete':
      case 'antibot':
      case 'cancelbot': {
        if (!isGroup) return msg.reply('❌ This command only works in groups.');
        if (!await senderIsAdmin()) return msg.reply('❌ Only group admins can use this command.');
        await groupCommands[cmd](sock, msg, args);
        break;
      }

      // ── Sticker ───────────────────────────────────────────────────────────
      case 'sticker': await stickerCommands.sticker(sock, msg, args); break;
      case 'toimage':
      case 'toimg':   await stickerCommands.toimage(sock, msg); break;
      case 'steal':   await stickerCommands.steal(sock, msg, args); break;

      // ── Wild Features ─────────────────────────────────────────────────────
      case 'aura':       await wildCommands.aura(sock, msg, args); break;
      case 'roastwar':   await wildCommands.roastwar(sock, msg, args); break;
      case 'demotivate': await wildCommands.demotivate(sock, msg, args); break;

      // ── .save — save status/media to DM ──────────────────────────────────
      case 'save':
        await groupCommands.save(sock, msg);
        break;

      // ── Social / Personality Checks ───────────────────────────────────────
      case 'gaycheck':       await socialCommands.gaycheck(sock, msg, args); break;
      case 'lesbiancheck':   await socialCommands.lesbiancheck(sock, msg, args); break;
      case 'bisexualcheck':  await socialCommands.bisexualcheck(sock, msg, args); break;
      case 'toxic':          await socialCommands.toxic(sock, msg, args); break;
      case 'chad':           await socialCommands.chad(sock, msg, args); break;
      case 'sigma':          await socialCommands.sigma(sock, msg, args); break;
      case 'npc':            await socialCommands.npc(sock, msg, args); break;
      case 'karen':          await socialCommands.karen(sock, msg, args); break;
      case 'demon':          await socialCommands.demon(sock, msg, args); break;
      case 'angel':          await socialCommands.angel(sock, msg, args); break;
      case 'clout':          await socialCommands.clout(sock, msg, args); break;
      case 'swag':           await socialCommands.swag(sock, msg, args); break;
      case 'drip':           await socialCommands.drip(sock, msg, args); break;
      case 'luck':           await socialCommands.luck(sock, msg, args); break;
      case 'karma':          await socialCommands.karma(sock, msg, args); break;
      case 'king':           await socialCommands.king(sock, msg, args); break;
      case 'queen':          await socialCommands.queen(sock, msg, args); break;
      case 'goat':           await socialCommands.goat(sock, msg, args); break;
      case 'cuteness':       await socialCommands.cuteness(sock, msg, args); break;
      case 'baddie':         await socialCommands.baddie(sock, msg, args); break;
      case 'savage':         await socialCommands.savage(sock, msg, args); break;
      case 'nerd':           await socialCommands.nerd(sock, msg, args); break;
      case 'hater':          await socialCommands.hater(sock, msg, args); break;
      case 'single':         await socialCommands.single(sock, msg, args); break;
      case 'lifespan':       await socialCommands.lifespan(sock, msg, args); break;
      case 'salary':         await socialCommands.salary(sock, msg, args); break;
      case 'crush':          await socialCommands.crush(sock, msg, args); break;
      case 'stancheck':      await socialCommands.stancheck(sock, msg, args); break;
      case 'celeb':          await socialCommands.celeb(sock, msg, args); break;
      case 'actor':          await socialCommands.actor(sock, msg, args); break;
      case 'phone':          await socialCommands.phone(sock, msg, args); break;

      // ── AI Intel / Research ───────────────────────────────────────────────
      case 'prediction':     await socialCommands.prediction(sock, msg, args); break;
      case 'timeline':       await socialCommands.timeline(sock, msg, args); break;
      case 'compare':        await socialCommands.compare(sock, msg, args); break;
      case 'versus':         await socialCommands.versus(sock, msg, args); break;
      case 'explain':        await socialCommands.explain(sock, msg, args); break;
      case 'funfact':        await socialCommands.funfact(sock, msg, args); break;
      case 'history':        await socialCommands.history(sock, msg, args); break;
      case 'hack':           await socialCommands.hack(sock, msg, args); break;
      case 'matrix':         await socialCommands.matrix(sock, msg, args); break;
      case 'anagram':        await socialCommands.anagram(sock, msg, args); break;
      case 'emoji2':         await socialCommands.emoji2(sock, msg, args); break;
      case 'reverse2':       await socialCommands.reverse2(sock, msg, args); break;
      case 'dark2':          await socialCommands.dark2(sock, msg, args); break;
      case 'love2':          await socialCommands.love2(sock, msg, args); break;
      case 'roast2':         await socialCommands.roast2(sock, msg, args); break;
      case 'mythology2':     await socialCommands.mythology2(sock, msg, args); break;
      case 'conspiracy2':    await socialCommands.conspiracy2(sock, msg, args); break;
      case 'zodiac3':        await socialCommands.zodiac3(sock, msg, args); break;
      case 'encrypt':        await socialCommands.encrypt(sock, msg, args); break;
      case 'decrypt':        await socialCommands.decrypt(sock, msg, args); break;
      case 'wordgame':       await socialCommands.wordgame(sock, msg, args); break;
      case 'country2':       await socialCommands.country2(sock, msg, args); break;
      case 'planet':         await socialCommands.planet(sock, msg, args); break;
      case 'animal':         await socialCommands.animal(sock, msg, args); break;
      case 'nutrition':      await socialCommands.nutrition(sock, msg, args); break;
      case 'exercise':       await socialCommands.exercise(sock, msg, args); break;
      case 'language2':      await socialCommands.language2(sock, msg, args); break;
      case 'decode2':        await socialCommands.decode2(sock, msg, args); break;

      // ── Group — open to all members ────────────────────────────────────────
      case 'groupinfo': {
        if (!isGroup) return msg.reply('❌ This command only works in groups.');
        await groupCommands.groupinfo(sock, msg);
        break;
      }
      case 'admins': {
        if (!isGroup) return msg.reply('❌ This command only works in groups.');
        await groupCommands.admins(sock, msg);
        break;
      }

      // ── Tools ─────────────────────────────────────────────────────────────
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

      // ── API ───────────────────────────────────────────────────────────────
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

      // ── Media ─────────────────────────────────────────────────────────────
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

      // ── Dev ───────────────────────────────────────────────────────────────
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

      // ── Unknown ───────────────────────────────────────────────────────────
      default:
        if (cmd) {
          await sock.sendMessage(jid, {
            text: `❓ Unknown command: *.${cmd}*\n\nType *.menu* to see all commands.`,
          }, { quoted: msg });
        }
    }

    // Always clear the typing indicator once command finishes
    stopTyping();

  } catch (err) {
    const m = err?.message || String(err);
    const jid = msg?.key?.remoteJid;
    // Always clear typing indicator even on error
    if (jid) sock.sendPresenceUpdate('paused', jid).catch(() => {});
    if (!/ECONNRESET|EPIPE|not-acceptable|timed out|rate-overlimit/i.test(m)) {
      if (msg?.key?.remoteJid?.endsWith('@g.us')) {
        console.error('[Group Handler]', msg.key.remoteJid, m);
      } else {
        console.error('[Handler]', m);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Non-command path (games, anti-link, auto-reply)
// ─────────────────────────────────────────────────────────────────────────────

async function handleNonCommand(sock, msg, body, jid, sender, isGroup, isOwner) {
  try {
    if (!body) return;

    // Active game checks (math, riddle, trivia, scramble)
    if (await gameCommands.checkMathAnswer(sock, msg, body)) return;

    const riddle = extraCommands.checkRiddle?.(jid, body);
    if (riddle?.correct) {
      await sock.sendMessage(jid, { text: `✅ Correct! The answer was *${riddle.answer}* 🎉` });
      return;
    }

    const trivia = moreFun.checkTrivia?.(jid, body);
    if (trivia) {
      if (trivia.expired) {
        await sock.sendMessage(jid, { text: `⏰ Time's up! Start a new one with *.trivia*` });
      } else if (trivia.correct) {
        await sock.sendMessage(jid, { text: `🎉 *Correct!* The answer was *${trivia.answer}*!` });
        return;
      }
    }

    const scramble = moreFun.checkScramble?.(jid, body);
    if (scramble?.correct) {
      await sock.sendMessage(jid, { text: `🎉 *Correct!* The word was *${scramble.answer.toUpperCase()}*!` });
      return;
    }

    // ── Cancel-Bot intercept: delete rival bot commands before they trigger ──
    if (isGroup && !isOwner) {
      const cancelbotData = (await store.get('cancelbotGroups')) || {};
      const cbData = cancelbotData[jid];
      if (cbData?.active && cbData.prefixes?.length && body) {
        const isRivalCmd = cbData.prefixes.some(p => body.startsWith(p));
        if (isRivalCmd) {
          // Delete the message silently so the rival bot never sees it
          try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
          return; // Don't process this message further
        }
      }
    }

    // Anti-link with 3-warning system (groups only, non-owner)
    if (isGroup && !isOwner) {
      const antilinkGroups = (await store.get('antilinkGroups')) || {};
      if (antilinkGroups[jid] && LINK_RE.test(body)) {
        await handleAntilinkViolation(sock, jid, sender, msg);
        return;
      }
    }

    // Auto-reply: DMs only, never groups
    if (isGroup) return;
    if (await store.get('autoreply')) {
      sock.sendPresenceUpdate('composing', jid).catch(() => {});
      const { autoReplyAI } = require('./lib/pollinations');
      const reply = await autoReplyAI(jid, body || 'Hello');
      await safeSend(sock, jid, { text: reply });
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
//  Anti-Bot detection & kick
// ─────────────────────────────────────────────────────────────────────────────

// Known patterns that identify a WhatsApp bot account:
// 1. Numbers with known bot-hosting ranges (not reliable alone, used with other signals)
// 2. Sends messages with a bot-signature body (typical command-echo patterns)
// 3. Sends at superhuman speeds repeatedly
// The safest heuristic: if a non-owner, non-admin participant's name or message
// matches common bot keywords AND antibot is ON for that group → kick them.

const BOT_NAME_KEYWORDS = [
  'bot', 'Bot', 'BOT', 'robot', 'assistant', 'ai ', 'AI ',
  'whatsapp bot', 'wa bot', 'helper', 'auto',
];

async function checkAntiBotKick(sock, msg, jid, sender) {
  try {
    const antibotGroups = (await store.get('antibotGroups')) || {};
    if (!antibotGroups[jid]) return;

    const botJid = bareJid(sock.user?.id || '');
    const senderBare = bareJid(sender);

    // Never kick ourselves
    if (senderBare === botJid) return;

    // Check if bot is admin (needed to kick)
    const meta = await sock.groupMetadata(jid);
    const botNum = botJid.split('@')[0];
    const botEntry = meta.participants.find(p => bareJid(p.id).split('@')[0] === botNum);
    const botIsAdmin = botEntry?.admin === 'admin' || botEntry?.admin === 'superadmin';
    if (!botIsAdmin) return;

    // Find the sender in participants
    const senderNum = senderBare.split('@')[0];
    const senderEntry = meta.participants.find(p => bareJid(p.id).split('@')[0] === senderNum);
    if (!senderEntry) return;

    // Don't kick admins
    if (senderEntry.admin === 'admin' || senderEntry.admin === 'superadmin') return;

    // Detection signal: verifiedName indicates a business/bot API account
    const isVerifiedBusiness = !!(senderEntry.verifiedName);

    // Detection signal: pushName contains bot keywords
    const pushName = (msg.pushName || '').toLowerCase();
    const nameHasBot = BOT_NAME_KEYWORDS.some(k => pushName.includes(k.toLowerCase()));

    // Detection signal: message body looks like a bot command response (starts with common bot prefixes)
    const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
    const RIVAL_BOT_PREFIXES = ['/', '!', '#', '$', '*prefix*', '⚙️', '🤖'];
    const bodyLooksLikeBot = RIVAL_BOT_PREFIXES.some(p => body.startsWith(p)) && body.length < 10;

    // Must have at least 2 signals before kicking (avoid false positives)
    const signals = [isVerifiedBusiness, nameHasBot, bodyLooksLikeBot].filter(Boolean).length;
    if (signals < 2) return;

    // Kick the bot!
    await sock.groupParticipantsUpdate(jid, [senderBare], 'remove');
    await sock.sendMessage(jid, {
      text:
        `🤖 *Anti-Bot Activated!*\n\n` +
        `🚫 @${senderNum} was detected as a bot and removed from the group.\n` +
        `_DollarBot V5 — Protecting your group_`,
      mentions: [senderBare],
    });
  } catch (_) {} // Silent — no permission = no kick, no crash
}

async function resendDeletedMessage(sock, jid, cached, sender) {
  try {
    const senderNum = bareJid(sender).split('@')[0];
    const innerMsg = unwrapContent(cached.message);

    // 1. Text content
    const textBody = extractBody(cached);

    // 2. Media types
    const mediaType = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].find(t => innerMsg?.[t]);

    if (mediaType && innerMsg[mediaType]) {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(cached, 'buffer', {}).catch(() => null);
      if (buffer) {
        const caption = innerMsg[mediaType]?.caption || '';
        if (mediaType === 'imageMessage') {
          await sock.sendMessage(jid, {
            image: buffer,
            caption: `🗑️ *Anti-Delete Intercepted*\n\n@${senderNum} deleted an image:\n${caption}`,
            mentions: [sender],
          });
        } else if (mediaType === 'videoMessage') {
          await sock.sendMessage(jid, {
            video: buffer,
            caption: `🗑️ *Anti-Delete Intercepted*\n\n@${senderNum} deleted a video:\n${caption}`,
            mentions: [sender],
          });
        } else if (mediaType === 'stickerMessage') {
          await sock.sendMessage(jid, { text: `🗑️ *Anti-Delete Intercepted*\n\n@${senderNum} deleted a sticker:`, mentions: [sender] });
          await sock.sendMessage(jid, { sticker: buffer });
        } else if (mediaType === 'audioMessage') {
          await sock.sendMessage(jid, { text: `🗑️ *Anti-Delete Intercepted*\n\n@${senderNum} deleted a voice/audio message:`, mentions: [sender] });
          await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: innerMsg[mediaType].mimetype || 'audio/mp4',
            ptt: innerMsg[mediaType].ptt || false,
          });
        } else if (mediaType === 'documentMessage') {
          await sock.sendMessage(jid, {
            document: buffer,
            mimetype: innerMsg[mediaType].mimetype,
            fileName: innerMsg[mediaType].fileName || 'document',
            caption: `🗑️ *Anti-Delete Intercepted*\n\n@${senderNum} deleted a document:\n${caption}`,
            mentions: [sender],
          });
        }
        return;
      }
    }

    // Fallback to text
    if (textBody) {
      await sock.sendMessage(jid, {
        text: `🗑️ *Anti-Delete Intercepted*\n\n@${senderNum} deleted a message:\n\n${textBody}`,
        mentions: [sender],
      });
    }
  } catch (e) {
    console.error('[Anti-Delete Error]', e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Group participant events (welcome / leave messages)
// ─────────────────────────────────────────────────────────────────────────────

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
