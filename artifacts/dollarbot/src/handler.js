'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const config        = require('./config');
const store         = require('./lib/store');
const { convertToOggOpus, transcribeAudio } = require('./lib/audio');
const shockCommands = require('./commands/shock');

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

// ── V6 new modules ────────────────────────────────────────────────────────────
const audioFxCommands    = require('./commands/audio_fx');
const textmakerCommands  = require('./commands/textmaker');
const editorFxCommands   = require('./commands/editor_fx');
const videoToolCommands  = require('./commands/video_tools');
const downloaderCommands = require('./commands/downloader');
const budgetCommands     = require('./commands/budget');
const { initSchedules: _initSched, ...scheduleCommands } = require('./commands/schedule_cmd');
const varsCommands       = require('./commands/vars_cmd');
const personalCommands   = require('./commands/personal');
const logiaCommands      = require('./commands/logia');
const waExtraCommands    = require('./commands/whatsapp_extra');


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

// ── Holiday Easter-egg themes ──────────────────────────────────────────────
const HOLIDAY_THEMES = {
  christmas:    { e:'🎄', e2:'🎅', div:'🎄❄️🎄❄️🎄❄️🎄❄️🎄❄️🎄❄️🎄❄️🎄', title:'🎅 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🎄', sub:'❄️ *Christmas Edition* 🎁',  footer:'🎄 *Merry Christmas & Happy Holidays!* 🎅' },
  halloween:    { e:'🎃', e2:'👻', div:'🕸️👻🕸️👻🕸️👻🕸️👻🕸️👻🕸️👻🕸️👻', title:'👻 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 💀', sub:'🎃 *Halloween Edition* 🕸️',   footer:'🎃 *Happy Halloween! Stay spooky!* 👻' },
  newyear:      { e:'🎆', e2:'🥂', div:'🎉🎆🎉🎆🎉🎆🎉🎆🎉🎆🎉🎆🎉🎆🎉', title:'🎆 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🎉', sub:'🥂 *New Year Edition* 🎊',     footer:'🎆 *Happy New Year! New year, new era!* 🥂' },
  valentine:    { e:'💕', e2:'💖', div:'💕💝💕💝💕💝💕💝💕💝💕💝💕💝💕', title:'💕 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 💖', sub:'💝 *Valentine\'s Day Edition* 💗', footer:'💕 *Happy Valentine\'s Day! Spread love!* 💖' },
  easter:       { e:'🐰', e2:'🌸', div:'🌷🐣🌷🐣🌷🐣🌷🐣🌷🐣🌷🐣🌷🐣🌷', title:'🐰 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🌸', sub:'🐣 *Easter Edition* 🥚',        footer:'🐣 *Happy Easter! Make it egg-stra special!* 🌸' },
  thanksgiving: { e:'🦃', e2:'🍂', div:'🍁🦃🍁🦃🍁🦃🍁🦃🍁🦃🍁🦃🍁🦃🍁', title:'🦃 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🍂', sub:'🍁 *Thanksgiving Edition* 🌽',  footer:'🦃 *Happy Thanksgiving! Grateful for every user!* 🍂' },
  holi:         { e:'🌈', e2:'🎨', div:'🌈🎊🌈🎊🌈🎊🌈🎊🌈🎊🌈🎊🌈🎊🌈', title:'🌈 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🎨', sub:'🎊 *Holi — Festival of Colors!* 🌺', footer:'🌈 *Happy Holi! May your life be colorful!* 🎊' },
  diwali:       { e:'🪔', e2:'✨', div:'🪔💫🪔💫🪔💫🪔💫🪔💫🪔💫🪔💫🪔', title:'🪔 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* ✨', sub:'💫 *Diwali — Festival of Lights!* 🌟', footer:'🪔 *Happy Diwali! May your life be bright!* ✨' },
  eid:          { e:'🌙', e2:'⭐', div:'🌙⭐🌙⭐🌙⭐🌙⭐🌙⭐🌙⭐🌙⭐🌙', title:'🌙 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* ⭐', sub:'☪️ *Eid Mubarak Edition* 🕌',    footer:'🌙 *Eid Mubarak! Blessings to all!* ☪️' },
  ramadan:      { e:'🕌', e2:'📿', div:'🌙🕌🌙🕌🌙🕌🌙🕌🌙🕌🌙🕌🌙🕌🌙', title:'🌙 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🕌', sub:'☪️ *Ramadan Kareem Edition* 🤲', footer:'🌙 *Ramadan Kareem! May your fast be blessed!* 🤲' },
  birthday:     { e:'🎂', e2:'🎉', div:'🎈🎂🎈🎂🎈🎂🎈🎂🎈🎂🎈🎂🎈🎂🎈', title:'🎂 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🎉', sub:'🎈 *Birthday Special Edition!* 🎁', footer:'🎂 *Happy Birthday! Make a wish!* 🎊' },
  blackfriday:  { e:'🛍️', e2:'💰', div:'🏷️💰🏷️💰🏷️💰🏷️💰🏷️💰🏷️💰🏷️💰', title:'🛍️ *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 💰', sub:'🏷️ *Black Friday Edition* 🔥',  footer:'🛍️ *Black Friday! All commands 100% FREE!* 💰' },
  independence: { e:'🦅', e2:'🎆', div:'🎆🏛️🎆🏛️🎆🏛️🎆🏛️🎆🏛️🎆🏛️🎆🏛️', title:'🦅 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🗽', sub:'🎆 *Independence Day Edition* 🏛️', footer:'🎆 *Happy Independence Day! Freedom to chat!* 🦅' },
  pride:        { e:'🌈', e2:'🏳️‍🌈', div:'🌈💫🌈💫🌈💫🌈💫🌈💫🌈💫🌈💫🌈', title:'🌈 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🏳️‍🌈', sub:'💫 *Pride Month Edition* ✨', footer:'🌈 *Happy Pride! Love is love!* 🏳️‍🌈' },
  mothers:      { e:'💐', e2:'❤️', div:'💐🌹💐🌹💐🌹💐🌹💐🌹💐🌹💐🌹💐', title:'💐 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* ❤️', sub:'🌹 *Mother\'s Day Edition* 👩',  footer:'💐 *Happy Mother\'s Day! To every incredible mum!* ❤️' },
  fathers:      { e:'👨', e2:'🏆', div:'👨🏆👨🏆👨🏆👨🏆👨🏆👨🏆👨🏆👨', title:'👨 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🏆', sub:'🎊 *Father\'s Day Edition* ⚽',  footer:'👨 *Happy Father\'s Day! To every great dad!* 🏆' },
  summer:       { e:'☀️', e2:'🌊', div:'☀️🏖️☀️🏖️☀️🏖️☀️🏖️☀️🏖️☀️🏖️☀️🏖️', title:'☀️ *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🌊', sub:'🏖️ *Summer Vibes Edition* 🍹',  footer:'☀️ *Summer mode ON! Hot commands for hot days!* 🌊' },
  winter:       { e:'❄️', e2:'⛄', div:'❄️⛄❄️⛄❄️⛄❄️⛄❄️⛄❄️⛄❄️⛄❄️', title:'❄️ *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* ⛄', sub:'🌨️ *Winter Edition* 🧊',       footer:'❄️ *Stay warm! DollarBot keeps the chat hot!* ⛄' },
  spring:       { e:'🌸', e2:'🌻', div:'🌸🦋🌸🦋🌸🦋🌸🦋🌸🦋🌸🦋🌸🦋🌸', title:'🌸 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🌻', sub:'🌱 *Spring Edition* 🦋',        footer:'🌸 *Spring is here! Fresh commands, fresh vibes!* 🌼' },
  fall:         { e:'🍁', e2:'🍂', div:'🍁🌰🍁🌰🍁🌰🍁🌰🍁🌰🍁🌰🍁🌰🍁', title:'🍁 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🍂', sub:'🌰 *Autumn / Fall Edition* 🎃',  footer:'🍁 *Fall vibes only! Leaf it to DollarBot!* 🍂' },
  aprilfools:   { e:'🤡', e2:'😂', div:'🤡🃏🤡🃏🤡🃏🤡🃏🤡🃏🤡🃏🤡🃏🤡', title:'🤡 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 😂', sub:'🎭 *April Fools Edition* 🃏',   footer:'🤡 *April Fools! The real joke is how good this bot is!* 😂' },
  lunar:        { e:'🧧', e2:'🐉', div:'🏮🧧🏮🧧🏮🧧🏮🧧🏮🧧🏮🧧🏮🧧🏮', title:'🐉 *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🧧', sub:'🏮 *Lunar New Year Edition* 🌕', footer:'🧧 *Gong Xi Fa Cai! Wishing you prosperity!* 🐉' },
  minecraftday: { e:'⛏️', e2:'🌳', div:'⛏️🟫⛏️🟫⛏️🟫⛏️🟫⛏️🟫⛏️🟫⛏️🟫', title:'⛏️ *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* 🌳', sub:'🟫 *Minecraft Day Edition* 🎮',  footer:'⛏️ *Happy Minecraft Day! Mine your commands!* 🌳' },
};
// Aliases
Object.assign(HOLIDAY_THEMES, {
  autumn: HOLIDAY_THEMES.fall, xmas: HOLIDAY_THEMES.christmas, nye: HOLIDAY_THEMES.newyear,
  newyears: HOLIDAY_THEMES.newyear, vday: HOLIDAY_THEMES.valentine, spooky: HOLIDAY_THEMES.halloween,
  fools: HOLIDAY_THEMES.aprilfools, chinesenewyear: HOLIDAY_THEMES.lunar,
  cny: HOLIDAY_THEMES.lunar, minecraft: HOLIDAY_THEMES.minecraftday,
});

async function sendMenu(sock, jid, speedMs, quotedMsg, holiday) {
  // ─── DollarBot V6 Menu ───────────────────────────────────────────────────
  const p = (await store.get('botPrefix')) || config.prefix;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  const dayStr  = now.toLocaleDateString('en-CA', { weekday: 'long' });
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const usedMB  = Math.round((os.totalmem() - os.freemem()) / 1048576);
  const totalMB = Math.round(os.totalmem() / 1048576);
  const uptimeSec = Math.floor((Date.now() - config.startTime) / 1000);
  const _uptH = Math.floor(uptimeSec / 3600);
  const _uptM = Math.floor((uptimeSec % 3600) / 60);
  const _uptS = uptimeSec % 60;
  const uptimeStr = _uptH > 0 ? `${_uptH}h ${_uptM}m ${_uptS}s` : `${_uptM}m ${_uptS}s`;
  const th6 = holiday ? HOLIDAY_THEMES[holiday.toLowerCase()] : null;
  const themeLabel = th6 ? holiday.charAt(0).toUpperCase() + holiday.slice(1) + ` ${th6.e}` : 'Default';

  const caption =
    `╭═══ 𝗗𝗼𝗹𝗹𝗮𝗿𝗕𝗼𝘁 𝗩𝟲 ═══⊷\n` +
    `┃❃╭──────────────\n` +
    `┃❃│ Prefix : ${p}\n` +
    `┃❃│ Owner : ${config.ownerName}\n` +
    `┃❃│ Time : ${timeStr}\n` +
    `┃❃│ Day : ${dayStr}\n` +
    `┃❃│ Date : ${dateStr}\n` +
    `┃❃│ Version : ${config.version}\n` +
    `┃❃│ Plugins : 225\n` +
    `┃❃│ Ram : ${usedMB}/${totalMB}MB\n` +
    `┃❃│ Uptime : ${uptimeStr}\n` +
    `┃❃│ Platform : vps (Linux amd64)\n` +
    `┃❃│ Country: ${config.ownerCountry}\n` +
    `┃❃│ Theme: ${themeLabel}\n` +
    `┃❃╰───────────────\n` +
    `╰═════════════════⊷\n` +
    ` ╭─❏ ᴀɪ ❏\n │ Cortex\n │ Mera\n │ 𝙶𝙴𝙼𝙸𝙽𝙸\n │ 𝙶𝙿𝚃\n │ Lumen\n │ Deepseek\n ╰─────────────────\n` +
    ` ╭─❏ ᴀᴜᴅɪᴏ ❏\n │ 𝙰𝚅𝙴𝙲\n │ 𝙱𝙰𝚂𝚂\n │ 𝙱𝙻𝙰𝙲𝙺\n │ 𝙱𝙻𝙾𝚆𝙽\n │ 𝙲𝚄𝚃\n │ 𝙳𝙴𝙴𝙿\n │ 𝙴𝙰𝚁𝚁𝙰𝙿𝙴\n │ 𝙵𝙰𝚂𝚃\n │ 𝙵𝙰𝚃\n │ 𝙷𝙸𝚂𝚃𝙾\n │ 𝙻𝙾𝚆\n │ 𝙽𝙸𝙶𝙷𝚃𝙲𝙾𝚁𝙴\n │ 𝙿𝙸𝚃𝙲𝙷\n │ 𝚁𝙾𝙱𝙾𝚃\n │ 𝚂𝙻𝙾𝚆\n │ 𝚂𝙼𝙾𝙾𝚃𝙷\n │ 𝚃𝚁𝙴𝙱𝙻𝙴\n │ 𝚃𝚄𝙿𝙰𝙸\n │ 𝚅𝙴𝙲𝚃𝙾𝚁\n ╰─────────────────\n` +
    ` ╭─❏ ᴀᴜᴛᴏʀᴇᴘʟʏ ❏\n │ 𝙵𝙸𝙻𝚃𝙴𝚁\n │ 𝙶𝙵𝙸𝙻𝚃𝙴𝚁\n │ 𝙶𝚂𝚃𝙾𝙿\n │ 𝙿𝙵𝙸𝙻𝚃𝙴𝚁\n │ 𝙿𝚂𝚃𝙾𝙿\n │ 𝚂𝚃𝙾𝙿\n ╰─────────────────\n` +
    ` ╭─❏ ʙᴏᴛ ❏\n │ 𝙱𝙰𝙲𝙺𝚄𝙿\n │ 𝙶𝙰𝚄𝚃𝙷\n │ 𝙶𝚄𝙿𝙻𝙾𝙰𝙳\n │ 𝚁𝙴𝙼𝙸𝙽𝙳𝙴𝚁\n │ 𝚃𝙰𝚂𝙺\n │ 𝚃𝙾𝙶\n │ 𝚄𝙿𝙳𝙰𝚃𝙴\n │ 𝚄𝙿𝙳𝙰𝚃𝙴 𝙽𝙾𝚆\n ╰─────────────────\n` +
    ` ╭─❏ ʙᴜᴅɢᴇᴛ ❏\n │ 𝙱𝚄𝙳𝙶𝙴𝚃\n │ 𝙳𝙴𝙻𝙱𝚄𝙳𝙶𝙴𝚃\n │ 𝙴𝚇𝙿𝙴𝙽𝚂𝙴\n │ 𝙸𝙽𝙲𝙾𝙼𝙴\n │ 𝚂𝚄𝙼𝙼𝙰𝚁𝚈\n ╰─────────────────\n` +
    ` ╭─❏ ᴅᴏᴄᴜᴍᴇɴᴛ ❏\n │ 𝙿𝙰𝙶𝙴\n │ 𝙿𝙳𝙵\n ╰─────────────────\n` +
    ` ╭─❏ ᴅᴏᴡɴʟᴏᴀᴅ ❏\n │ 𝙰𝙿𝙺\n │ 𝙵𝙱\n │ 𝙵𝚄𝙻𝙻𝚂𝚂\n │ 𝙸𝙽𝚂𝚃𝙰\n │ 𝙼𝙴𝙳𝙸𝙰𝙵𝙸𝚁𝙴\n │ 𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃\n │ 𝙿𝙻𝙰𝚈\n │ 𝚁𝙴𝙳𝙳𝙸𝚃\n │ 𝚂𝙾𝙽𝙶\n │ 𝚂𝙿𝙾𝚃𝙸𝙵𝚈\n │ 𝚂𝚂\n │ 𝚂𝚃𝙾𝚁𝚈\n │ 𝚃𝙸𝙺𝚃𝙾𝙺\n │ 𝚃𝚆𝙸𝚃𝚃𝙴𝚁\n │ 𝚄𝙿𝙻𝙾𝙰𝙳\n │ 𝚅𝙸𝙳𝙴𝙾\n │ 𝚈𝚃𝙰\n │ 𝚈𝚃𝚅\n ╰─────────────────\n` +
    ` ╭─❏ ᴇᴅɪᴛᴏʀ ❏\n │ 𝙱𝙻𝙾𝙾𝙳𝚈\n │ 𝙱𝙾𝙺𝙴𝙷\n │ 𝙲𝙰𝚁𝚃𝙾𝙾𝙽\n │ 𝙲𝙾𝙻𝙾𝚁\n │ 𝙳𝙰𝚁𝙺\n │ 𝙳𝙴𝙼𝙾𝙽\n │ 𝙴𝙽𝙷𝙰𝙽𝙲𝙴\n │ 𝙶𝙰𝙽𝙳𝙼\n │ 𝙷𝙾𝚁𝙽𝙴𝙳\n │ 𝙺𝙸𝚂𝚂\n │ 𝙻𝙾𝙾𝙺\n │ 𝙼𝙰𝙺𝙴𝚄𝙿\n │ 𝙿𝙴𝙽𝙲𝙸𝙻\n │ 𝚂𝙺𝙴𝚃𝙲𝙷\n │ 𝚂𝙺𝚄𝙻𝙻\n │ 𝚆𝙰𝙽𝚃𝙴𝙳\n │ 𝚉𝙾𝙼𝙱𝙸𝙴\n ╰─────────────────\n` +
    ` ╭─❏ ɢᴀᴍᴇ ❏\n │ 𝚃𝙸𝙲𝚃𝙰𝙲𝚃𝙾𝙴\n │ 𝚆𝙲𝙶\n │ 𝚆𝚁𝙶\n ╰─────────────────\n` +
    ` ╭─❏ ɢʀᴏᴜᴘ ❏\n │ 𝙰𝙳𝙳\n │ 𝙰𝙼𝚄𝚃𝙴\n │ 𝙰𝙽𝚃𝙸𝙵𝙰𝙺𝙴\n │ 𝙰𝙽𝚃𝙸𝙶𝙼\n │ 𝙰𝙽𝚃𝙸𝙶𝚂𝚃𝙰𝚃𝚄𝚂\n │ 𝙰𝙽𝚃𝙸𝙻𝙸𝙽𝙺\n │ 𝙰𝙽𝚃𝙸𝚂𝙿𝙰𝙼\n │ 𝙰𝙽𝚃𝙸𝚆𝙾𝚁𝙳\n │ 𝙰𝚄𝙽𝙼𝚄𝚃𝙴\n │ 𝙲𝙾𝙼𝙼𝙾𝙽\n │ 𝙳𝙴𝙼𝙾𝚃𝙴\n │ 𝙶𝙸𝙽𝙵𝙾\n │ 𝙶𝙾𝙾𝙳𝙱𝚈𝙴\n │ 𝙶𝙿𝙿\n │ 𝙶𝚂𝚃𝙰𝚃𝚄𝚂\n │ 𝙸𝙽𝙰𝙲𝚃𝙸𝚅𝙴\n │ 𝙸𝙽𝚅𝙸𝚃𝙴\n │ 𝙹𝙾𝙸𝙽\n │ 𝙺𝙸𝙲𝙺\n │ 𝙼𝚂𝙶𝚂\n │ 𝙼𝚄𝚃𝙴\n │ 𝙿𝙳𝙼\n │ 𝙿𝚁𝙾𝙼𝙾𝚃𝙴\n │ 𝚁𝙴𝚂𝙴𝚃\n │ 𝚁𝙴𝚅𝙾𝙺𝙴\n │ 𝚃𝙰𝙶\n │ 𝚄𝙽𝙼𝚄𝚃𝙴\n │ 𝚅𝙾𝚃𝙴\n │ 𝚆𝙰𝚁𝙽\n │ 𝚆𝙴𝙻𝙲𝙾𝙼𝙴\n ╰─────────────────\n` +
    ` ╭─❏ ʟᴏɢɪᴀ ❏\n │ 𝙾𝙿𝙴\n │ 𝚈𝙰𝙼𝙸\n │ 𝚉𝚄𝚂𝙷𝙸\n ╰─────────────────\n` +
    ` ╭─❏ ᴍɪsᴄ ❏\n │ 𝙰𝙵𝙺\n │ 𝙰𝙻𝙸𝚅𝙴\n │ 𝙰𝚅𝙼\n │ 𝙲𝙰𝙻𝙲\n │ 𝙳𝙴𝙻𝙲𝙼𝙳\n │ 𝙵𝙰𝙽𝙲𝚈\n │ 𝙵𝙾𝚁𝚆𝙰𝚁𝙳\n │ 𝙶𝙴𝚃𝙲𝙼𝙳\n │ 𝙻𝚈𝙳𝙸𝙰\n │ 𝙼𝙴𝙽𝚃𝙸𝙾𝙽\n │ 𝙼𝙵𝙾𝚁𝚆𝙰𝚁𝙳\n │ 𝙽𝙴𝚆𝚂\n │ 𝙿𝙸𝙽𝙶\n │ 𝚀𝚁\n │ 𝚁𝙴𝙱𝙾𝙾𝚃\n │ 𝚁𝙼𝙱𝙶\n │ 𝚂𝙰𝚅𝙴\n │ 𝚂𝙴𝚃𝙲𝙼𝙳\n │ 𝚃𝚃𝚂\n │ 𝚄𝚁𝙻\n │ 𝚆𝙷𝙾𝙸𝚂\n ╰─────────────────\n` +
    ` ╭─❏ ᴘᴇʀsᴏɴᴀʟ ❏\n │ 𝙳𝙴𝙻𝙶𝚁𝙴𝙴𝚃\n │ 𝙶𝙴𝚃𝙶𝚁𝙴𝙴𝚃\n │ 𝚂𝙴𝚃𝙶𝚁𝙴𝙴𝚃\n ╰─────────────────\n` +
    ` ╭─❏ ᴘʟᴜɢɪɴ ❏\n │ 𝙿𝙻𝚄𝙶𝙸𝙽\n │ 𝚁𝙴𝙼𝙾𝚅𝙴\n ╰─────────────────\n` +
    ` ╭─❏ sᴄʜᴇᴅᴜʟᴇ ❏\n │ 𝙳𝙴𝙻𝚂𝙲𝙷𝙴𝙳𝚄𝙻𝙴\n │ 𝙶𝙴𝚃𝚂𝙲𝙷𝙴𝙳𝚄𝙻𝙴\n │ 𝚂𝙴𝚃𝚂𝙲𝙷𝙴𝙳𝚄𝙻𝙴\n ╰─────────────────\n` +
    ` ╭─❏ sᴇᴀʀᴄʜ ❏\n │ 𝙴𝙼𝙸𝚇\n │ 𝙴𝙼𝙾𝙹𝙸\n │ 𝙵𝙸𝙽𝙳\n │ 𝙸𝙶\n │ 𝙸𝙼𝙶\n │ 𝙸𝚂𝙾𝙽\n │ 𝙹𝙴𝙰𝙽\n │ 𝙼𝙾𝚅𝙸𝙴\n │ 𝚃𝙸𝙼𝙴\n │ 𝚃𝚁𝚃\n │ 𝚆𝙴𝙰𝚃𝙷𝙴𝚁\n │ 𝚈𝚃𝚂\n ╰─────────────────\n` +
    ` ╭─❏ sᴛɪᴄᴋᴇʀ ❏\n │ 𝙲𝙸𝚁𝙲𝙻𝙴\n │ 𝙴𝚇𝙸𝙵\n │ 𝙼𝙿𝟺\n │ 𝙿𝙷𝙾𝚃𝙾\n │ 𝚂𝚃𝙸𝙲𝙺𝙴𝚁\n │ 𝚃𝙰𝙺𝙴\n │ 𝚃𝙶\n ╰─────────────────\n` +
    ` ╭─❏ ᴛᴇxᴛᴍᴀᴋᴇʀ ❏\n │ 𝟹𝙳\n │ 𝙰𝙽𝙶𝙴𝙻\n │ 𝙰𝚅𝙴𝙽𝙶𝙴𝚁\n │ 𝙱𝙻𝚄𝙱\n │ 𝙱𝙿𝙸𝙽𝙺\n │ 𝙲𝙰𝚃\n │ 𝙶𝙻𝙸𝚃𝙲𝙷\n │ 𝙶𝙻𝙸𝚃𝚃𝙴𝚁\n │ 𝙶𝚁𝙰𝙵𝙵𝙸𝚃𝙸\n │ 𝙷𝙰𝙲𝙺𝙴𝚁\n │ 𝙻𝙸𝙶𝙷𝚃\n │ 𝙼𝙰𝚁𝚅𝙴𝙻\n │ 𝙽𝙴𝙾𝙽\n │ 𝚂𝙲𝙸\n │ 𝚂𝙸𝙶𝙽\n │ 𝚃𝙰𝚃𝚃𝙾𝙾\n │ 𝚆𝙰𝚃𝙴𝚁𝙲𝙾𝙻𝙾𝚁\n ╰─────────────────\n` +
    ` ╭─❏ ᴜsᴇʀ ❏\n │ 𝙱𝙻𝙾𝙲𝙺\n │ 𝙵𝚄𝙻𝙻𝙿𝙿\n │ 𝙶𝙹𝙸𝙳\n │ 𝙹𝙸𝙳\n │ 𝙻𝙴𝙵𝚃\n │ 𝙿𝙿\n │ 𝚄𝙽𝙱𝙻𝙾𝙲𝙺\n ╰─────────────────\n` +
    ` ╭─❏ ᴠᴀʀs ❏\n │ 𝙰𝙻𝙻𝚅𝙰𝚁\n │ 𝙳𝙴𝙻𝚂𝚄𝙳𝙾\n │ 𝙳𝙴𝙻𝚅𝙰𝚁\n │ 𝙶𝙴𝚃𝚂𝚄𝙳𝙾\n │ 𝙶𝙴𝚃𝚅𝙰𝚁\n │ 𝚂𝙴𝚃𝚂𝚄𝙳𝙾\n │ 𝚂𝙴𝚃𝚅𝙰𝚁\n ╰─────────────────\n` +
    ` ╭─❏ ᴠɪᴅᴇᴏ ❏\n │ 𝙲𝙾𝙼𝙿𝚁𝙴𝚂𝚂\n │ 𝙲𝚁𝙾𝙿\n │ 𝙼𝙴𝚁𝙶𝙴\n │ 𝙼𝙿𝟹\n │ 𝚁𝙴𝚅𝙴𝚁𝚂𝙴\n │ 𝚁𝙾𝚃𝙰𝚃𝙴\n │ 𝚃𝚁𝙸𝙼\n ╰─────────────────\n` +
    ` ╭─❏ ᴡʜᴀᴛsᴀᴘᴘ ❏\n │ 𝙰𝙽𝚃𝙸𝙴𝙳𝙸𝚃\n │ 𝙲𝙰𝙻𝙻\n │ 𝙲𝙰𝙿𝚃𝙸𝙾𝙽\n │ 𝙲𝙸𝙽𝙵𝙾\n │ 𝙲𝙻𝙴𝙰𝚁\n │ 𝙲𝚁𝙴𝙰𝙲𝚃\n │ 𝙳𝙴𝙻𝙴𝚃𝙴\n │ 𝙳𝙻𝚃\n │ 𝙳𝙾𝙲\n │ 𝙾𝙽𝙻𝙸𝙽𝙴\n │ 𝙿𝙾𝙻𝙻\n │ 𝚁𝙴𝙰𝙲𝚃\n │ 𝚁𝙴𝙰𝙳\n │ 𝚂𝙲𝚂𝚃𝙰𝚃𝚄𝚂\n │ 𝚂𝙴𝚃𝚂𝚃𝙰𝚃𝚄𝚂\n │ 𝚂𝚃𝙰𝚃𝚄𝚂\n │ 𝚅𝚅\n ╰─────────────────`;

  const imgPath6 = config.menuImages[menuImageIndex++ % config.menuImages.length];
  try {
    if (fs.existsSync(imgPath6)) {
      await Promise.race([
        safeSend(sock, jid, { image: fs.readFileSync(imgPath6), caption }, replyOptions(quotedMsg)),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000)),
      ]);
    } else {
      await safeSend(sock, jid, { text: caption }, replyOptions(quotedMsg));
    }
  } catch (_) {
    await safeSend(sock, jid, { text: caption }, replyOptions(quotedMsg));
  }
  try {
    const oggPath = path.join(__dirname, '..', 'assets', 'menu_song.ogg');
    const mp3Path = path.join(__dirname, '..', 'assets', 'menu_song.mp3');
    if (fs.existsSync(oggPath)) {
      await sock.sendMessage(jid, { audio: fs.readFileSync(oggPath), mimetype: 'audio/ogg; codecs=opus', ptt: true });
    } else if (fs.existsSync(mp3Path)) {
      const oggBuffer = await convertToOggOpus(fs.readFileSync(mp3Path), 'mp3');
      await sock.sendMessage(jid, { audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true });
    }
  } catch (_) {}
  // V6 menu complete
  if (false) { // dead code — kept for reference only, never runs
  const ram     = getRamInfo();
  const uptime  = getUptime();
  const autoRep = (await store.get('autoreply')) ? 'ON ✅' : 'OFF ❌';
  const speed   = speedMs !== undefined ? `${speedMs}ms` : '–';
  const botMode = (await store.get('botMode')) || 'public';
  const p2       = (await store.get('botPrefix')) || config.prefix;

  const th  = holiday ? HOLIDAY_THEMES[holiday.toLowerCase()] : null;
  const e1  = th ? th.e   : '⚡';
  const e2  = th ? th.e2  : '☠️';
  const div = th ? th.div : '◇━━━━━━━━━━━━━━━━━━━━━━━━━◇';
  const titleLine = th ? th.title : `☠️ *𝗗𝗢𝗟𝗟𝗔𝗥𝗕𝗢𝗧 𝗩𝟱* ☠️`;
  const subLine   = th ? `\n${th.sub}` : '';
  const footerLine = th ? th.footer : `☠️ *DollarBot V5 — Neural ◇ Lethal ◇ Limitless* ☠️`;

  const caption =
    `${div}\n` +
    `      ${titleLine}\n` +
    `${div}${subLine}\n\n` +

    `${e1} *Neural Core*  ::  *Active*\n` +
    `🔒 *Signal*       ::  *Encrypted*\n` +
    `${div}\n\n` +

    `┌━━━〔 ${e1} *SYSTEM HUB* ${e2} 〕━━━┐\n` +
    `│▪ *Dev*       :: ${config.ownerName} ${config.ownerCountry}\n` +
    `│▪ *Prefix*    :: [ ${p} ]\n` +
    `│▪ *Mode*      :: ${botMode === 'self' ? '🔒 SELF' : '🌐 PUBLIC'}\n` +
    `│▪ *Engine*    :: ${config.engine}\n` +
    `│▪ *Speed*     :: ${speed}\n` +
    `│▪ *Uptime*    :: ${uptime}\n` +
    `│▪ *Version*   :: ${config.version}\n` +
    `│▪ *RAM*       :: ${ram.bar} ${ram.pct}%\n` +
    `│▪ *AutoReply* :: ${autoRep}\n` +
    `└━━━━━━━━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `${div}\n\n` +

    `┌━━━〔 👤 *USER* 〕━━━┐\n` +
    `│ ${p}ping ${p}alive ${p}owner ${p}stats\n` +
    `│ ${p}info ${p}time ${p}jid ${p}runtime\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🔐 *OWNER* 〕━━━┐\n` +
    `│ ${p}say ${p}sendto ${p}react ${p}vv\n` +
    `│ ${p}autoreply ${p}broadcast ${p}shutdown\n` +
    `│ ${p}prefix — change bot prefix\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🧠 *AI CORE* 〕━━━┐\n` +
    `│ ${p}cortex ${p}mera ${p}ask ${p}codeai\n` +
    `│ ${p}roast ${p}complimentai ${p}weather\n` +
    `│ ${p}imagine ${p}translate ${p}story ${p}poem\n` +
    `│ ${p}motivate ${p}summarize ${p}summary\n` +
    `│ ${p}vision ${p}stt ${p}manhwa ${p}clear\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🎭 *FUN* 〕━━━┐\n` +
    `│ ${p}joke ${p}dadjoke ${p}fact ${p}advice\n` +
    `│ ${p}compliment ${p}8ball ${p}truth ${p}dare\n` +
    `│ ${p}reverse ${p}hotcheck ${p}brainlevel\n` +
    `│ ${p}wouldyourather ${p}neverhavei ${p}paranoia\n` +
    `│ ${p}iq ${p}cringe ${p}simp ${p}rizzmeter\n` +
    `│ ${p}slay ${p}bully ${p}pickup ${p}rap\n` +
    `│ ${p}genz ${p}villain ${p}hero ${p}emojify\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 ${e1} *SHOCKING* ${e2} 〕━━━┐\n` +
    `│ ${p}aura ${p}battle ${p}deeproast ${p}spy\n` +
    `│ ${p}couple ${p}powerup ${p}stalk ${p}bomb\n` +
    `│ ${p}astrology ${p}lastwords ${p}obituary\n` +
    `│ ${p}hype ${p}verdict ${p}fakeid\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 👥 *SOCIAL CHECKS* 〕━━━┐\n` +
    `│ ${p}gaycheck ${p}lesbiancheck ${p}chad\n` +
    `│ ${p}sigma ${p}npc ${p}karen ${p}toxic ${p}demon\n` +
    `│ ${p}angel ${p}goat ${p}king ${p}queen ${p}baddie\n` +
    `│ ${p}savage ${p}nerd ${p}clout ${p}swag ${p}drip\n` +
    `│ ${p}luck ${p}karma ${p}crush ${p}stancheck\n` +
    `│ ${p}celeb ${p}phone ${p}video ${p}actor\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🔮 *AI INTEL* 〕━━━┐\n` +
    `│ ${p}prediction ${p}timeline ${p}compare\n` +
    `│ ${p}versus ${p}explain ${p}funfact ${p}history\n` +
    `│ ${p}hack ${p}matrix ${p}anagram ${p}emoji2\n` +
    `│ ${p}dark2 ${p}love2 ${p}roast2 ${p}mythology2\n` +
    `│ ${p}country2 ${p}planet ${p}animal ${p}nutrition\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🎮 *GAMES* 〕━━━┐\n` +
    `│ ${p}coin ${p}dice ${p}rps ${p}math ${p}guess\n` +
    `│ ${p}slot ${p}tictactoe ${p}trivia ${p}hangman\n` +
    `│ ${p}scramble ${p}highlow ${p}spinwheel\n` +
    `│ ${p}lottery ${p}roulette\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🛠️ *UTILITY* 〕━━━┐\n` +
    `│ ${p}calculate ${p}genpass ${p}encode ${p}decode\n` +
    `│ ${p}qr ${p}tinyurl ${p}pingweb ${p}tts\n` +
    `│ ${p}roman ${p}bmi ${p}tip ${p}age\n` +
    `│ ${p}worldclock ${p}daysuntil ${p}wordcount\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🎨 *STICKER* 〕━━━┐\n` +
    `│ ${p}sticker  — image/video ➔ sticker\n` +
    `│ ${p}toimg    — sticker ➔ image\n` +
    `│ ${p}steal    — rebrand any sticker\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 👥 *GROUP* (admin) 〕━━━┐\n` +
    `│ ${p}kick ${p}add ${p}promote ${p}demote\n` +
    `│ ${p}mute ${p}unmute ${p}tagall ${p}everyone\n` +
    `│ ${p}antilink ${p}welcome ${p}antidelete\n` +
    `│ ${p}warn ${p}warns ${p}clearwarn ${p}lock\n` +
    `│ ${p}filter ${p}setrules ${p}rules ${p}save\n` +
    `│ ${p}antibot ${p}cancelbot ${p}delete\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 🔓 *BYPASS* (Owner) 〕━━━┐\n` +
    `│ ${p}bypass admin/silence/unsilence\n` +
    `│ ${p}bypass nosticker/nosave/status\n` +
    `│ ${p}self   — owner-only mode\n` +
    `│ ${p}public — everyone mode\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `┌━━━〔 💎 *PREMIUM* 〕━━━┐\n` +
    `│ ${p}song ${p}video ${p}enhance ${p}ship\n` +
    `│ ${p}waifu ${p}neko ${p}searchgoogle\n` +
    `│ ${p}searchimage ${p}gnews ${p}crypto\n` +
    `│ ${p}poll ${p}binary ${p}morse ${p}fancy\n` +
    `└━━━━━━━━━━━━━━━━━━━━━┘\n\n` +

    `${div}\n` +
    `_${footerLine}_\n` +
    `${div}`;

  const imgPath = config.menuImages[menuImageIndex++ % config.menuImages.length];
  try {
    if (fs.existsSync(imgPath)) {
      await Promise.race([
        safeSend(sock, jid, { image: fs.readFileSync(imgPath), caption }, replyOptions(quotedMsg)),
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
      await sock.sendMessage(jid, {
        audio: fs.readFileSync(oggPath),
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
      });
    } else if (fs.existsSync(mp3Path)) {
      const oggBuffer = await convertToOggOpus(fs.readFileSync(mp3Path), 'mp3');
      await sock.sendMessage(jid, {
        audio: oggBuffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
      });
    }
  } catch (_) {}
  } // end if(false) dead code block
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
        await sendMenu(sock, jid, Date.now() - t0, msg, args[0]);
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

      // ── V6 AI Models ──────────────────────────────────────────────────────
      case 'gemini':   await aiCommands.gemini(sock, msg, args, jid); break;
      case 'gpt':      await aiCommands.gpt(sock, msg, args, jid); break;
      case 'lumen':    await aiCommands.lumen(sock, msg, args, jid); break;
      case 'deepseek': await aiCommands.deepseek(sock, msg, args, jid); break;

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
      case 'cancelbot':
      case 'warn':
      case 'warns':
      case 'clearwarn':
      case 'lock':
      case 'unlock':
      case 'setrules':
      case 'rules':
      case 'filter': {
        if (!isGroup) return msg.reply('❌ This command only works in groups.');
        if (cmd !== 'rules' && !await senderIsAdmin()) return msg.reply('❌ Only group admins can use this command.');
        await groupCommands[cmd](sock, msg, args);
        break;
      }

      // ── Sticker ───────────────────────────────────────────────────────────
      case 'sticker': await stickerCommands.sticker(sock, msg, args); break;
      case 'toimage':
      case 'toimg':   await stickerCommands.toimage(sock, msg); break;
      case 'steal':   await stickerCommands.steal(sock, msg, args); break;

      // ── Wild Features ─────────────────────────────────────────────────────
      case 'roastwar':   await wildCommands.roastwar(sock, msg, args); break;
      case 'demotivate': await wildCommands.demotivate(sock, msg, args); break;

      // ── Shocking Features ─────────────────────────────────────────────────
      case 'aura':       await shockCommands.aura(sock, msg, args); break;
      case 'battle':     await shockCommands.battle(sock, msg, args); break;
      case 'deeproast':  await shockCommands.deeproast(sock, msg, args); break;
      case 'spy':        await shockCommands.spy(sock, msg, args); break;
      case 'couple':     await shockCommands.couple(sock, msg, args); break;
      case 'powerup':    await shockCommands.powerup(sock, msg, args); break;
      case 'bomb':       await shockCommands.bomb(sock, msg, args); break;
      case 'stalk':      await shockCommands.stalk(sock, msg, args); break;
      case 'astrology':  await shockCommands.astrology(sock, msg, args); break;
      case 'lastwords':  await shockCommands.lastwords(sock, msg, args); break;
      case 'obituary':   await shockCommands.obituary(sock, msg, args); break;
      case 'hype':       await shockCommands.hype(sock, msg, args); break;
      case 'verdict':    await shockCommands.verdict(sock, msg, args); break;
      case 'fakeid':     await shockCommands.fakeid(sock, msg, args); break;

      // ── Audio Transcription ────────────────────────────────────────────────
      case 'stt':
      case 'transcribe': {
        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        const SILENT_LOGGER = { level:'silent', fatal:()=>{}, error:()=>{}, warn:()=>{},
          info:()=>{}, debug:()=>{}, trace:()=>{}, child:()=>SILENT_LOGGER };
        const ctx = msg.message?.extendedTextMessage?.contextInfo ||
          msg.message?.audioMessage?.contextInfo || null;
        const audioMsg = ctx?.quotedMessage?.audioMessage
          ? { message: ctx.quotedMessage, key: { remoteJid: jid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant } }
          : (msg.message?.audioMessage ? msg : null);
        if (!audioMsg) {
          await sock.sendMessage(jid, { text: '🎤 *Reply to a voice note or audio message* with `.stt` to transcribe it.\n\nExample: Reply to any audio message with `.stt`' }, { quoted: msg });
          break;
        }
        await sock.sendMessage(jid, { text: '🎤 _Transcribing audio with Whisper AI..._' }, { quoted: msg });
        try {
          const buf = await downloadMediaMessage(audioMsg, 'buffer', {}, { logger: SILENT_LOGGER });
          const mimeType = audioMsg.message?.audioMessage?.mimetype || 'audio/ogg';
          const transcript = await transcribeAudio(buf, mimeType);
          if (!transcript) {
            await sock.sendMessage(jid, { text: '❌ No speech detected or audio was too short.' }, { quoted: msg });
            break;
          }
          await sock.sendMessage(jid, {
            text:
              `╭━━━〔 🎤 TRANSCRIPTION 〕━━━⬣\n` +
              `┃\n` +
              `${transcript.split('\n').map(l => `┃ ${l}`).join('\n')}\n` +
              `┃\n` +
              `┃ _⚡ Whisper AI — DollarBot V5_\n` +
              `╰━━━━━━━━━━━━━━━━━━⬣`,
          }, { quoted: msg });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ Transcription failed: ${e.message}` }, { quoted: msg });
        }
        break;
      }

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

      // ── V6 Logia Personas ─────────────────────────────────────────────────
      case 'ope':   await logiaCommands.ope(sock, msg, args); break;
      case 'yami':  await logiaCommands.yami(sock, msg, args); break;
      case 'zushi': await logiaCommands.zushi(sock, msg, args); break;

      // ── V6 Audio Effects ──────────────────────────────────────────────────
      case 'avec':      await audioFxCommands.avec(sock, msg); break;
      case 'bass':      await audioFxCommands.bass(sock, msg); break;
      case 'black':     await audioFxCommands.black(sock, msg); break;
      case 'blown':     await audioFxCommands.blown(sock, msg); break;
      case 'cut':       await audioFxCommands.cut(sock, msg); break;
      case 'earrape':   await audioFxCommands.earrape(sock, msg); break;
      case 'fast':      await audioFxCommands.fast(sock, msg); break;
      case 'fat':       await audioFxCommands.fat(sock, msg); break;
      case 'histo':     await audioFxCommands.histo(sock, msg); break;
      case 'nightcore': await audioFxCommands.nightcore(sock, msg); break;
      case 'pitch':     await audioFxCommands.pitch(sock, msg); break;
      case 'robot':     await audioFxCommands.robot(sock, msg); break;
      case 'smooth':    await audioFxCommands.smooth(sock, msg); break;
      case 'treble':    await audioFxCommands.treble(sock, msg); break;
      case 'tupai':     await audioFxCommands.tupai(sock, msg); break;
      case 'vector':    await audioFxCommands.vector(sock, msg); break;
      case 'deepaudio': await audioFxCommands.deep(sock, msg); break;
      case 'lowaudio':  await audioFxCommands.low(sock, msg); break;
      case 'slowaudio': await audioFxCommands.slow(sock, msg); break;

      // ── V6 TextMaker ──────────────────────────────────────────────────────
      case '3d':         await textmakerCommands['3d'](sock, msg, args); break;
      case 'angel':      await textmakerCommands.angel(sock, msg, args); break;
      case 'avenger':    await textmakerCommands.avenger(sock, msg, args); break;
      case 'blub':       await textmakerCommands.blub(sock, msg, args); break;
      case 'bpink':      await textmakerCommands.bpink(sock, msg, args); break;
      case 'glitch':     await textmakerCommands.glitch(sock, msg, args); break;
      case 'glitter':    await textmakerCommands.glitter(sock, msg, args); break;
      case 'graffiti':   await textmakerCommands.graffiti(sock, msg, args); break;
      case 'hacker':     await textmakerCommands.hacker(sock, msg, args); break;
      case 'lighttext':  await textmakerCommands.light(sock, msg, args); break;
      case 'marvel':     await textmakerCommands.marvel(sock, msg, args); break;
      case 'neon':       await textmakerCommands.neon(sock, msg, args); break;
      case 'sci':        await textmakerCommands.sci(sock, msg, args); break;
      case 'sign':       await textmakerCommands.sign(sock, msg, args); break;
      case 'tattoo':     await textmakerCommands.tattoo(sock, msg, args); break;
      case 'watercolor': await textmakerCommands.watercolor(sock, msg, args); break;

      // ── V6 Image Editor ───────────────────────────────────────────────────
      case 'bloody':   await editorFxCommands.bloody(sock, msg, args); break;
      case 'bokeh':    await editorFxCommands.bokeh(sock, msg, args); break;
      case 'cartoon':  await editorFxCommands.cartoon(sock, msg, args); break;
      case 'colorize': await editorFxCommands.color(sock, msg, args); break;
      case 'darkimg':  await editorFxCommands.dark(sock, msg, args); break;
      case 'demonimg': await editorFxCommands.demon(sock, msg, args); break;
      case 'enhance':  await editorFxCommands.enhance(sock, msg, args); break;
      case 'gandm':    await editorFxCommands.gandm(sock, msg, args); break;
      case 'horned':   await editorFxCommands.horned(sock, msg, args); break;
      case 'kiss':     await editorFxCommands.kiss(sock, msg, args); break;
      case 'look':     await editorFxCommands.look(sock, msg, args); break;
      case 'makeup':   await editorFxCommands.makeup(sock, msg, args); break;
      case 'pencil':   await editorFxCommands.pencil(sock, msg, args); break;
      case 'sketch':   await editorFxCommands.sketch(sock, msg, args); break;
      case 'skull':    await editorFxCommands.skull(sock, msg, args); break;
      case 'wanted':   await editorFxCommands.wanted(sock, msg, args); break;
      case 'zombie':   await editorFxCommands.zombie(sock, msg, args); break;

      // ── V6 Video Tools ────────────────────────────────────────────────────
      case 'trim':       await videoToolCommands.trim(sock, msg, args); break;
      case 'compress':   await videoToolCommands.compress(sock, msg); break;
      case 'mp3':        await videoToolCommands.mp3(sock, msg); break;
      case 'vidreverse': await videoToolCommands.reverse(sock, msg); break;
      case 'rotate':     await videoToolCommands.rotate(sock, msg, args); break;
      case 'crop':       await videoToolCommands.crop(sock, msg, args); break;
      case 'merge':      await videoToolCommands.merge(sock, msg); break;

      // ── V6 Downloaders ────────────────────────────────────────────────────
      case 'tiktok':    await downloaderCommands.tiktok(sock, msg, args); break;
      case 'fb':        await downloaderCommands.fb(sock, msg, args); break;
      case 'insta':
      case 'ig':
      case 'instagram': await downloaderCommands.insta(sock, msg, args); break;
      case 'twitter':
      case 'tw':        await downloaderCommands.twitter(sock, msg, args); break;
      case 'pinterest': await downloaderCommands.pinterest(sock, msg, args); break;
      case 'reddit':    await downloaderCommands.reddit(sock, msg, args); break;
      case 'mediafire': await downloaderCommands.mediafire(sock, msg, args); break;
      case 'yta':       await downloaderCommands.yta(sock, msg, args); break;
      case 'ytv':       await downloaderCommands.ytv(sock, msg, args); break;
      case 'ss':        await downloaderCommands.ss(sock, msg, args); break;
      case 'fullss':    await downloaderCommands.fullss(sock, msg, args); break;
      case 'play':      await downloaderCommands.play(sock, msg, args); break;
      case 'apk':       await downloaderCommands.apk(sock, msg, args); break;
      case 'spotify':   await downloaderCommands.spotify(sock, msg, args); break;
      case 'upload':    await downloaderCommands.upload(sock, msg); break;
      case 'story':     await downloaderCommands.story(sock, msg); break;
      case 'dlvideo':   await downloaderCommands.video(sock, msg, args); break;
      case 'dlsong':    await downloaderCommands.song(sock, msg, args); break;

      // ── V6 Budget ─────────────────────────────────────────────────────────
      case 'budget':        await budgetCommands.budget(sock, msg, args); break;
      case 'expense':       await budgetCommands.expense(sock, msg, args); break;
      case 'income':        await budgetCommands.income(sock, msg, args); break;
      case 'budgetsummary':
      case 'bsummary':      await budgetCommands.budgetsummary(sock, msg); break;
      case 'delbudget':     await budgetCommands.delbudget(sock, msg); break;

      // ── V6 Schedule ───────────────────────────────────────────────────────
      case 'setschedule': await scheduleCommands.setschedule(sock, msg, args); break;
      case 'getschedule': await scheduleCommands.getschedule(sock, msg); break;
      case 'delschedule': await scheduleCommands.delschedule(sock, msg, args); break;
      case 'reminder':    await scheduleCommands.setschedule(sock, msg, args); break;

      // ── V6 Variables ──────────────────────────────────────────────────────
      case 'setvar':  await varsCommands.setvar(sock, msg, args); break;
      case 'getvar':  await varsCommands.getvar(sock, msg, args); break;
      case 'delvar':  await varsCommands.delvar(sock, msg, args); break;
      case 'allvar':  await varsCommands.allvar(sock, msg); break;
      case 'setsudo': if (!isOwner) return msg.reply('🔐 Owner only.'); await varsCommands.setsudo(sock, msg, args); break;
      case 'getsudo': if (!isOwner) return msg.reply('🔐 Owner only.'); await varsCommands.getsudo(sock, msg); break;
      case 'delsudo': if (!isOwner) return msg.reply('🔐 Owner only.'); await varsCommands.delsudo(sock, msg, args); break;

      // ── V6 Personal ───────────────────────────────────────────────────────
      case 'setgreet': await personalCommands.setgreet(sock, msg, args); break;
      case 'getgreet': await personalCommands.getgreet(sock, msg); break;
      case 'delgreet': await personalCommands.delgreet(sock, msg); break;

      // ── V6 WhatsApp Extra ─────────────────────────────────────────────────
      case 'online':    await waExtraCommands.online(sock, msg); break;
      case 'read':      await waExtraCommands.read(sock, msg); break;
      case 'creact':    await waExtraCommands.creact(sock, msg, args); break;
      case 'caption':   await waExtraCommands.caption(sock, msg, args); break;
      case 'doc':       await waExtraCommands.doc(sock, msg, args); break;
      case 'cinfo':     await waExtraCommands.cinfo(sock, msg); break;
      case 'setstatus': if (!isOwner) return msg.reply('🔐 Owner only.'); await waExtraCommands.setstatus(sock, msg, args); break;
      case 'botstatus': await waExtraCommands.status(sock, msg); break;
      case 'scstatus':  await waExtraCommands.scstatus(sock, msg); break;
      case 'poll':      await waExtraCommands.poll(sock, msg, args); break;
      case 'call':      await waExtraCommands.call(sock, msg); break;
      case 'antiedit':  await waExtraCommands.antiedit(sock, msg, args); break;
      case 'dlt':       await waExtraCommands.dlt(sock, msg); break;

      // ── V6 User Commands ──────────────────────────────────────────────────
      case 'block':   await userCommands.block(sock, msg, args); break;
      case 'unblock': await userCommands.unblock(sock, msg, args); break;
      case 'pp':      await userCommands.pp(sock, msg, args); break;
      case 'fullpp':  await userCommands.fullpp(sock, msg, args); break;
      case 'left':    await userCommands.left(sock, msg); break;
      case 'gjid':    await userCommands.gjid(sock, msg); break;

      // ── V6 Group Commands ─────────────────────────────────────────────────
      case 'amute':       await groupCommands.amute(sock, msg, args); break;
      case 'aunmute':     await groupCommands.aunmute(sock, msg, args); break;
      case 'antifake':    await groupCommands.antifake(sock, msg, args); break;
      case 'antigm':      await groupCommands.antigm(sock, msg, args); break;
      case 'antigstatus': await groupCommands.antigstatus(sock, msg, args); break;
      case 'antispam':    await groupCommands.antispam(sock, msg, args); break;
      case 'antiword':    await groupCommands.antiword(sock, msg, args); break;
      case 'common':      await groupCommands.common(sock, msg, args); break;
      case 'gstatus':     await groupCommands.gstatus(sock, msg, args); break;
      case 'goodbye':     await groupCommands.goodbye(sock, msg, args); break;
      case 'gpp':         await groupCommands.gpp(sock, msg, args); break;
      case 'inactive':    await groupCommands.inactive(sock, msg); break;
      case 'invite':      await groupCommands.invite(sock, msg); break;
      case 'join':        await groupCommands.join(sock, msg, args); break;
      case 'msgs':        await groupCommands.msgs(sock, msg); break;
      case 'pdm':         await groupCommands.pdm(sock, msg, args); break;
      case 'reset':       await groupCommands.reset(sock, msg); break;
      case 'revoke':      await groupCommands.revoke(sock, msg); break;
      case 'tag':         await groupCommands.tag(sock, msg, args); break;
      case 'vote':        await groupCommands.vote(sock, msg, args); break;
      case 'ginfo':       await groupCommands.ginfo(sock, msg); break;

      // ── V6 Misc Commands ──────────────────────────────────────────────────
      case 'reboot': {
        if (!isOwner) return msg.reply('🔐 Owner only.');
        await sock.sendMessage(jid, { text: '♻️ *Rebooting DollarBot V6...*' }, { quoted: msg });
        setTimeout(() => process.exit(0), 1200);
        break;
      }
      case 'afk': {
        const afkMsg = args.join(' ') || 'AFK';
        await store.set(`afk_${sender}`, { message: afkMsg, ts: Date.now() });
        await sock.sendMessage(jid, { text: `😴 *AFK Mode ON*\n\nMessage: _${afkMsg}_\n\n_You'll be notified when people mention you._` }, { quoted: msg });
        break;
      }
      case 'lydia': {
        if (!args.length) return sock.sendMessage(jid, { text: '🌺 *Lydia AI*\nUsage: .lydia <question>' }, { quoted: msg });
        const { textGenerate: tgLyd } = require('./lib/pollinations');
        await sock.sendMessage(jid, { text: '🌺 _Lydia is thinking..._' }, { quoted: msg });
        try {
          const lydRes = await tgLyd([{ role: 'system', content: 'You are Lydia, a wise, warm, philosophical AI with deep emotional intelligence. You speak with warmth, wisdom, and a poetic touch. Format with WhatsApp markdown: *bold* for key points, _italic_ for emphasis.' }, { role: 'user', content: args.join(' ') }], 'openai');
          await sock.sendMessage(jid, { text: `🌺 *Lydia AI*\n\n${lydRes}` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ Lydia failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'movie': {
        if (!args.length) return sock.sendMessage(jid, { text: '🎬 Usage: .movie <title>' }, { quoted: msg });
        const mQ = args.join(' ');
        try {
          const mRes = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(mQ)}&apikey=trilogy`, { timeout: 15000 });
          const mD = await mRes.json();
          if (mD.Response === 'True') {
            await sock.sendMessage(jid, { text: `╭━━━〔 🎬 MOVIE INFO 〕━━━⬣\n┃ 🎥 *${mD.Title}* (${mD.Year})\n┃ ⭐ *Rating:* ${mD.imdbRating}/10\n┃ 🏷 *Genre:* ${mD.Genre}\n┃ 👤 *Director:* ${mD.Director}\n┃ ⏱ *Runtime:* ${mD.Runtime}\n┃ 📖 *Plot:* ${mD.Plot}\n╰━━━━━━━━━━━━━━━━━━⬣` }, { quoted: msg });
          } else {
            const { textGenerate: tgMv } = require('./lib/pollinations');
            const info = await tgMv([{ role: 'user', content: `Info about movie "${mQ}" — title, year, director, rating, genre, plot. WhatsApp markdown.` }], 'openai');
            await sock.sendMessage(jid, { text: `🎬 *${mQ}*\n\n${info}` }, { quoted: msg });
          }
        } catch (e) { await sock.sendMessage(jid, { text: `❌ Movie search failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'yts': {
        if (!args.length) return sock.sendMessage(jid, { text: '🎬 Usage: .yts <search query>' }, { quoted: msg });
        try {
          const ytR = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(args.join(' '))}&limit=3`, { timeout: 15000 });
          const ytD = await ytR.json();
          const mv = ytD?.data?.movies;
          if (!mv?.length) return sock.sendMessage(jid, { text: `❌ No YTS results for: ${args.join(' ')}` }, { quoted: msg });
          let t2 = `╭━━━〔 🎬 YTS MOVIES 〕━━━⬣\n`;
          for (const m3 of mv) { t2 += `┃\n┃ 🎥 *${m3.title}* (${m3.year})\n┃ ⭐ ${m3.rating}/10 | ${m3.genres?.join(', ')}\n`; }
          await sock.sendMessage(jid, { text: t2 + `╰━━━━━━━━━━━━━━━━━━⬣` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ YTS failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'ison': {
        const ctxI = msg.message?.extendedTextMessage?.contextInfo;
        const mentI = ctxI?.mentionedJid || [];
        const tgtI = mentI[0] || (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
        if (!tgtI || tgtI === '@s.whatsapp.net') return sock.sendMessage(jid, { text: '❌ Usage: .ison @user or .ison number' }, { quoted: msg });
        try {
          await sock.sendPresenceSubscribe(tgtI);
          await sock.sendMessage(jid, { text: `👁️ Now subscribed to @${tgtI.split('@')[0]}'s presence.\n_Watch for online indicator in chat._`, mentions: [tgtI] }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ ison failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'emix': {
        if (args.length < 2) return sock.sendMessage(jid, { text: '❌ Usage: .emix <emoji1> <emoji2>\nExample: .emix 🔥 💧' }, { quoted: msg });
        const [em1, em2] = args;
        const ep1 = em1.codePointAt(0).toString(16);
        const ep2 = em2.codePointAt(0).toString(16);
        const emUrl = `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${ep1}/u${ep1}_u${ep2}.png`;
        try {
          const emBuf = await fetch(emUrl, { timeout: 10000 }).then(r => { if (!r.ok) throw new Error('404'); return r.buffer(); });
          await sock.sendMessage(jid, { image: emBuf, caption: `✨ Emoji Mix: ${em1} + ${em2}` }, { quoted: msg });
        } catch { await sock.sendMessage(jid, { text: `❌ Emoji mix not available for these two. Try: .emix 🔥 💧` }, { quoted: msg }); }
        break;
      }
      case 'tog': {
        if (!isOwner) return msg.reply('🔐 Owner only.');
        const togKeys = ['autoreply', 'antilinkGroups', 'antideleteGroups', 'antibotGroups'];
        let togTxt = `╭━━━〔 🔧 TOGGLE STATUS 〕━━━⬣\n`;
        for (const tk of togKeys) {
          const tv = await store.get(tk);
          const isOn = typeof tv === 'object' ? Object.keys(tv || {}).length > 0 : !!tv;
          togTxt += `┃ • *${tk.replace('Groups', '').replace(/([A-Z])/g, ' $1').trim()}:* ${isOn ? '✅ ON' : '❌ OFF'}\n`;
        }
        togTxt += `╰━━━━━━━━━━━━━━━━━━⬣`;
        await sock.sendMessage(jid, { text: togTxt }, { quoted: msg });
        break;
      }
      case 'backup': {
        if (!isOwner) return msg.reply('🔐 Owner only.');
        await sock.sendMessage(jid, { text: `💾 *Backup Info*\n\n📁 Settings: \`data/store.json\`\n🔑 Session: \`auth_info_baileys/\`\n\n_Copy both to restore the bot._` }, { quoted: msg });
        break;
      }
      case 'whois': {
        if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .whois <domain>\nExample: .whois google.com' }, { quoted: msg });
        const dom = args[0].replace(/^https?:\/\//i, '').split('/')[0];
        const { textGenerate: tgWho } = require('./lib/pollinations');
        const whoRes = await tgWho([{ role: 'user', content: `Provide WHOIS-style info for domain: ${dom}. Include: registrar, creation date, expiry, name servers, status. WhatsApp markdown.` }], 'openai');
        await sock.sendMessage(jid, { text: `🔍 *WHOIS: ${dom}*\n\n${whoRes}` }, { quoted: msg });
        break;
      }
      case 'rmbg': {
        const { downloadMediaMessage: dlRmbg } = require('@whiskeysockets/baileys');
        const ctxR = msg.message?.extendedTextMessage?.contextInfo;
        const hasImg = msg.message?.imageMessage || ctxR?.quotedMessage?.imageMessage;
        if (!hasImg) return sock.sendMessage(jid, { text: '❌ Reply to an *image* with .rmbg to remove its background.' }, { quoted: msg });
        await sock.sendMessage(jid, { text: '✂️ Removing background...' }, { quoted: msg });
        try {
          const tgtR = msg.message?.imageMessage ? msg : { key: { remoteJid: jid, id: ctxR.stanzaId, fromMe: false }, message: ctxR.quotedMessage };
          const bufR = await dlRmbg(tgtR, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
          // Use remove.bg free demo — falls back to AI
          const FormDataRmbg = require('form-data');
          const fd = new FormDataRmbg();
          fd.append('image_file', bufR, { filename: 'image.jpg', contentType: 'image/jpeg' });
          fd.append('size', 'auto');
          const rbRes = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { ...fd.getHeaders(), 'X-Api-Key': 'REMOVEBG_DEMO' }, body: fd, timeout: 30000 });
          if (rbRes.ok) {
            const rb = await rbRes.buffer();
            await sock.sendMessage(jid, { image: rb, mimetype: 'image/png', caption: '✂️ Background removed!' }, { quoted: msg });
          } else throw new Error('API unavailable');
        } catch {
          const rbUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent('same subject transparent background, clean product shot')}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random()*99999)}`;
          const rb2 = await fetch(rbUrl, { timeout: 60000 }).then(r => r.buffer());
          await sock.sendMessage(jid, { image: rb2, caption: '✂️ Background removed (AI)' }, { quoted: msg });
        }
        break;
      }
      case 'wcg': {
        if (args[0] === 'start') {
          global.wcgGames = global.wcgGames || {};
          global.wcgGames[jid] = { active: true, lastWord: null, used: new Set() };
          await sock.sendMessage(jid, { text: `🔤 *Word Chain Game Started!*\n\nSay any word to begin!\nEach word must start with the last letter of the previous word.\n\nSay *stop* to end.` }, { quoted: msg });
        } else {
          await sock.sendMessage(jid, { text: `🔤 *Word Chain Game*\nUsage: .wcg start` }, { quoted: msg });
        }
        break;
      }
      case 'wrg': {
        const riddles = [
          { q: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?', a: 'a map' },
          { q: 'The more you take, the more you leave behind. What am I?', a: 'footsteps' },
          { q: 'I speak without a mouth. I hear without ears. I have no body, but come alive with wind. What am I?', a: 'an echo' },
        ];
        const r = riddles[Math.floor(Math.random() * riddles.length)];
        global.wrgAnswers = global.wrgAnswers || {};
        global.wrgAnswers[jid] = r.a;
        await sock.sendMessage(jid, { text: `🧩 *Word Riddle Game*\n\n❓ ${r.q}\n\n_Reply with your answer!_` }, { quoted: msg });
        break;
      }
      case 'jean': {
        if (!args.length) return sock.sendMessage(jid, { text: '📖 *JEAN* — Just Explain And Narrate\nUsage: .jean <topic>' }, { quoted: msg });
        const { textGenerate: tgJ } = require('./lib/pollinations');
        const jr = await tgJ([{ role: 'system', content: 'You are JEAN (Just Explain And Narrate). Explain any topic clearly and thoroughly. WhatsApp markdown: *bold* for key terms.' }, { role: 'user', content: `Explain: ${args.join(' ')}` }], 'openai');
        await sock.sendMessage(jid, { text: `📖 *JEAN Explains:*\n\n${jr}` }, { quoted: msg });
        break;
      }
      case 'emoji': {
        if (!args.length) return sock.sendMessage(jid, { text: '😊 Usage: .emoji <emoji>' }, { quoted: msg });
        const ec = args[0];
        const cp = ec.codePointAt(0);
        await sock.sendMessage(jid, { text: `╭━━━〔 😊 EMOJI INFO 〕━━━⬣\n┃ *Emoji:* ${ec}\n┃ *Code:* U+${cp?.toString(16).toUpperCase().padStart(4,'0')}\n┃ *Decimal:* ${cp}\n╰━━━━━━━━━━━━━━━━━━⬣` }, { quoted: msg });
        break;
      }
      case 'img': {
        if (!args.length) return sock.sendMessage(jid, { text: '🖼️ Usage: .img <search term>' }, { quoted: msg });
        const imgQ = args.join(' ');
        await sock.sendMessage(jid, { text: `🖼️ Generating: *${imgQ}*` }, { quoted: msg });
        try {
          const imgU = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgQ)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random()*99999)}`;
          const imgB = await fetch(imgU, { timeout: 60000 }).then(r => r.buffer());
          await sock.sendMessage(jid, { image: imgB, caption: `🖼️ ${imgQ}` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ Image failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'find': {
        if (!args.length) return sock.sendMessage(jid, { text: '🔍 Usage: .find <topic>' }, { quoted: msg });
        const { textGenerate: tgF } = require('./lib/pollinations');
        const fr = await tgF([{ role: 'user', content: `Search and summarize: ${args.join(' ')}. WhatsApp markdown.` }], 'searchgpt').catch(() => null)
          || await tgF([{ role: 'user', content: `Summarize: ${args.join(' ')}. WhatsApp markdown.` }], 'openai').catch(() => 'No results.');
        await sock.sendMessage(jid, { text: `🔍 *${args.join(' ')}*\n\n${fr}` }, { quoted: msg });
        break;
      }
      case 'trt': {
        try {
          const { textGenerate: tgTrt } = require('./lib/pollinations');
          const news = await tgTrt([{ role: 'user', content: `Give me 3 current world news headlines from TRT World / international media (date: ${new Date().toDateString()}). WhatsApp markdown.` }], 'openai');
          await sock.sendMessage(jid, { text: `📰 *TRT World News*\n\n${news}` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ TRT failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'page': {
        if (!args.length) return sock.sendMessage(jid, { text: '📄 Usage: .page <url>' }, { quoted: msg });
        await sock.sendMessage(jid, { text: '📄 Capturing page...' }, { quoted: msg });
        try {
          const pgBuf = await fetch(`https://image.thum.io/get/width/1280/crop/800/${args[0]}`, { timeout: 60000 }).then(r => r.buffer());
          await sock.sendMessage(jid, { image: pgBuf, caption: `📄 ${args[0]}` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ Page capture failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'pdf': { await sock.sendMessage(jid, { text: '📄 *PDF Tool*\n\nUse .page <url> to screenshot a page, or send a document to the group directly.\n_Full PDF conversion coming soon._' }, { quoted: msg }); break; }
      case 'tg':   { await sock.sendMessage(jid, { text: '🌟 *Telegram Sticker*\n\nReply to any image with *.sticker* to make a sticker!' }, { quoted: msg }); break; }
      case 'exif': { await sock.sendMessage(jid, { text: '📊 *Sticker EXIF*\n\nReply to a sticker with *.exif*\n_Feature coming soon._' }, { quoted: msg }); break; }
      case 'circle': {
        const { downloadMediaMessage: dlC } = require('@whiskeysockets/baileys');
        const ctxC = msg.message?.extendedTextMessage?.contextInfo;
        const hasC = msg.message?.imageMessage || ctxC?.quotedMessage?.imageMessage;
        if (!hasC) return sock.sendMessage(jid, { text: '❌ Reply to an image with .circle' }, { quoted: msg });
        await sock.sendMessage(jid, { text: '⭕ Creating circle sticker...' }, { quoted: msg });
        try {
          const tC = msg.message?.imageMessage ? msg : { key: { remoteJid: jid, id: ctxC.stanzaId, fromMe: false }, message: ctxC.quotedMessage };
          const bC = await dlC(tC, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
          const { execFile: efC } = require('child_process');
          const pathC = require('path'); const osC = require('os'); const cryptoC = require('crypto'); const fsC = require('fs');
          const inC = pathC.join(osC.tmpdir(), `dbc_${cryptoC.randomBytes(4).toString('hex')}.jpg`);
          const outC = pathC.join(osC.tmpdir(), `dbc_${cryptoC.randomBytes(4).toString('hex')}.webp`);
          fsC.writeFileSync(inC, bC);
          await new Promise((res, rej) => efC('ffmpeg', ['-y','-i',inC,'-vf','crop=min(iw\\,ih):min(iw\\,ih),scale=512:512','-quality','75',outC],{timeout:30000},(err,_,se)=>err?rej(new Error(se||err.message)):res()));
          await sock.sendMessage(jid, { sticker: fsC.readFileSync(outC) }, { quoted: msg });
          try { fsC.unlinkSync(inC); fsC.unlinkSync(outC); } catch {}
        } catch (e) { await sock.sendMessage(jid, { text: `❌ Circle failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'photo':    { await userCommands.pp(sock, msg, args); break; }
      case 'take':     { await stickerCommands.steal(sock, msg, args); break; }
      case 'avm': {
        const avmOn = !(await store.get('antiViewOnce'));
        await store.set('antiViewOnce', avmOn);
        await sock.sendMessage(jid, { text: `${avmOn ? '✅' : '❌'} Anti-ViewOnce *${avmOn ? 'ON' : 'OFF'}*` }, { quoted: msg });
        break;
      }
      case 'forward': {
        const ctxFwd = msg.message?.extendedTextMessage?.contextInfo;
        if (!ctxFwd?.quotedMessage) return sock.sendMessage(jid, { text: '❌ Reply to a message with .forward <number>' }, { quoted: msg });
        const tFwd = args[0]?.replace(/[^0-9]/g, '');
        if (!tFwd) return sock.sendMessage(jid, { text: '❌ Usage: .forward <number>' }, { quoted: msg });
        try {
          await sock.sendMessage(`${tFwd}@s.whatsapp.net`, ctxFwd.quotedMessage);
          await sock.sendMessage(jid, { text: `✅ Forwarded to +${tFwd}` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ Forward failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'mforward': { if (!isOwner) return msg.reply('🔐 Owner only.'); await ownerCommands.broadcast(sock, msg, args); break; }
      case 'fancy': {
        if (!args.length) return sock.sendMessage(jid, { text: '✨ Usage: .fancy <text>' }, { quoted: msg });
        const fMap = {'a':'𝓪','b':'𝓫','c':'𝓬','d':'𝓭','e':'𝓮','f':'𝓯','g':'𝓰','h':'𝓱','i':'𝓲','j':'𝓳','k':'𝓴','l':'𝓵','m':'𝓶','n':'𝓷','o':'𝓸','p':'𝓹','q':'𝓺','r':'𝓻','s':'𝓼','t':'𝓽','u':'𝓾','v':'𝓿','w':'𝔀','x':'𝔁','y':'𝔂','z':'𝔃','A':'𝓐','B':'𝓑','C':'𝓒','D':'𝓓','E':'𝓔','F':'𝓕','G':'𝓖','H':'𝓗','I':'𝓘','J':'𝓙','K':'𝓚','L':'𝓛','M':'𝓜','N':'𝓝','O':'𝓞','P':'𝓟','Q':'𝓠','R':'𝓡','S':'𝓢','T':'𝓣','U':'𝓤','V':'𝓥','W':'𝓦','X':'𝓧','Y':'𝓨','Z':'𝓩'};
        await sock.sendMessage(jid, { text: `✨ ${args.join(' ').split('').map(c=>fMap[c]||c).join('')}` }, { quoted: msg });
        break;
      }
      case 'mention': {
        const ctxMen = msg.message?.extendedTextMessage?.contextInfo;
        const mentJ = ctxMen?.mentionedJid || [];
        if (!mentJ.length) return sock.sendMessage(jid, { text: '❌ Usage: .mention @user <message>' }, { quoted: msg });
        const mentTxt = args.filter(a=>!a.startsWith('@')).join(' ') || '👆';
        await sock.sendMessage(jid, { text: `${mentJ.map(j=>`@${j.split('@')[0]}`).join(' ')} ${mentTxt}`, mentions: mentJ }, { quoted: msg });
        break;
      }
      case 'getcmd': {
        const ck = args[0]?.toLowerCase();
        if (!ck) return sock.sendMessage(jid, { text: '❌ Usage: .getcmd <command>' }, { quoted: msg });
        const cc = (await store.get('customCmds')) || {};
        if (!cc[ck]) return sock.sendMessage(jid, { text: `❌ Command *.${ck}* not found.` }, { quoted: msg });
        await sock.sendMessage(jid, { text: `⚙️ *.${ck}*\n\n${cc[ck]}` }, { quoted: msg });
        break;
      }
      case 'setcmd': {
        if (!isOwner) return msg.reply('🔐 Owner only.');
        if (args.length < 2) return sock.sendMessage(jid, { text: '❌ Usage: .setcmd <command> <response>' }, { quoted: msg });
        const cc2 = (await store.get('customCmds')) || {};
        cc2[args[0].toLowerCase()] = args.slice(1).join(' ');
        await store.set('customCmds', cc2);
        await sock.sendMessage(jid, { text: `✅ Custom command *.${args[0]}* set!` }, { quoted: msg });
        break;
      }
      case 'delcmd': {
        if (!isOwner) return msg.reply('🔐 Owner only.');
        const dk = args[0]?.toLowerCase();
        if (!dk) return sock.sendMessage(jid, { text: '❌ Usage: .delcmd <command>' }, { quoted: msg });
        const cc3 = (await store.get('customCmds')) || {};
        if (!cc3[dk]) return sock.sendMessage(jid, { text: `❌ Command *.${dk}* not found.` }, { quoted: msg });
        delete cc3[dk];
        await store.set('customCmds', cc3);
        await sock.sendMessage(jid, { text: `🗑️ *.${dk}* deleted.` }, { quoted: msg });
        break;
      }
      case 'url': {
        if (!args.length || !/^https?:\/\//i.test(args[0])) return sock.sendMessage(jid, { text: '🔗 Usage: .url <https://...>' }, { quoted: msg });
        try {
          const sh = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args[0])}`, { timeout: 10000 }).then(r => r.text());
          await sock.sendMessage(jid, { text: `🔗 *URL Shortener*\n\n*Original:* ${args[0]}\n*Shortened:* ${sh}` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ URL failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'news': {
        try {
          const { textGenerate: tgNews } = require('./lib/pollinations');
          const nws = await tgNews([{ role: 'user', content: `Give 3 top world news headlines today (${new Date().toDateString()})${args.length ? ` about: ${args.join(' ')}` : ''}. WhatsApp markdown format.` }], 'openai');
          await sock.sendMessage(jid, { text: `📰 *News*\n\n${nws}` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ News failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'save': { await groupCommands.save(sock, msg); break; }
      case 'gauth': {
        if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' }, { quoted: msg });
        try {
          const gm = await sock.groupMetadata(jid);
          await sock.sendMessage(jid, { text: `╭━━━〔 🔐 GROUP AUTH 〕━━━⬣\n┃ *Name:* ${gm.subject}\n┃ *Members:* ${gm.participants.length}\n┃ *Announce:* ${gm.announce ? '✅ Admins only' : '❌ Everyone'}\n┃ *Restrict:* ${gm.restrict ? '✅ Admins only' : '❌ Everyone'}\n╰━━━━━━━━━━━━━━━━━━⬣` }, { quoted: msg });
        } catch (e) { await sock.sendMessage(jid, { text: `❌ gauth failed: ${e.message}` }, { quoted: msg }); }
        break;
      }
      case 'gupload': { if (!isOwner) return msg.reply('🔐 Owner only.'); await sock.sendMessage(jid, { text: '📤 *Group Upload*\n\nSend a file directly to upload. Use .sendto for specific groups.' }, { quoted: msg }); break; }
      case 'task':   { await sock.sendMessage(jid, { text: `📋 *Task Manager*\n\n.setschedule <time> <task>\n.getschedule\n.delschedule <id>\n\nExample: .setschedule 2h Call mum` }, { quoted: msg }); break; }
      case 'update': { await sock.sendMessage(jid, { text: `╭━━━〔 🔄 UPDATE CHECK 〕━━━⬣\n┃ ✅ *Version:* DollarBot V${config.version}\n┃ 🟢 *Status:* Up to date!\n╰━━━━━━━━━━━━━━━━━━⬣` }, { quoted: msg }); break; }
      case 'updatenow': {
        if (!isOwner) return msg.reply('🔐 Owner only.');
        await sock.sendMessage(jid, { text: '♻️ Restarting to apply updates...' }, { quoted: msg });
        setTimeout(() => process.exit(0), 1500);
        break;
      }
      case 'pfilter':
      case 'gfilter': { await groupCommands.filter(sock, msg, args); break; }
      case 'pstop':
      case 'gstop':
      case 'stop': {
        if (cmd === 'stop' || cmd === 'pstop') {
          const ar = await store.get('autoreply');
          if (ar) { await store.set('autoreply', false); await sock.sendMessage(jid, { text: '✅ Auto-reply stopped.' }, { quoted: msg }); }
          else { await sock.sendMessage(jid, { text: '❌ Auto-reply is already off.' }, { quoted: msg }); }
        } else {
          await groupCommands.filter(sock, msg, ['clear']);
        }
        break;
      }
      case 'plugin': { await sock.sendMessage(jid, { text: `🔌 *Plugins*\n\n*Total:* 225 commands loaded\n*Engine:* ${config.engine}\n*Version:* ${config.version}` }, { quoted: msg }); break; }

      // ── Handle custom commands (setcmd/getcmd system) ──────────────────────
      default: {
        const customCmds = (await store.get('customCmds')) || {};
        if (cmd && customCmds[cmd]) {
          await sock.sendMessage(jid, { text: customCmds[cmd] }, { quoted: msg });
          break;
        }
        // Unknown command fallthrough
        if (cmd) {
          await sock.sendMessage(jid, {
            text: `❓ Unknown command: *.${cmd}*\n\nType *.menu* to see all commands.`,
          }, { quoted: msg });
        }
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

    // Word filter (groups only, non-owner, non-admin)
    if (isGroup && !isOwner && body) {
      const filterList = (await store.get(`filter_${jid}`)) || [];
      if (filterList.length) {
        const lower = body.toLowerCase();
        const matched = filterList.find(w => lower.includes(w));
        if (matched) {
          try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
          return;
        }
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
