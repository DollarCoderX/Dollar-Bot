const config = require('../config');
const store = require('../lib/store');
const os = require('os');

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

const userCommands = {
  async ping(sock, msg) {
    const start = Date.now();
    const ping = Date.now() - start;
    await msg.reply(`*Pong!*\nSpeed: *${ping}ms*`);
  },

  async alive(sock, msg) {
    const jid = msg.key.remoteJid;
    const ram = getRamInfo();
    const uptime = getUptime();
    const autoReply = (await store.get('autoreply')) ? 'ON' : 'OFF';

    const start = Date.now();
    const sent = await msg.reply('...');
    const speed = Date.now() - start;
    try {
      if (sent?.key) await sock.sendMessage(jid, { delete: sent.key });
    } catch (_) {}

    await msg.reply(
      `╭━━━〔 💵 𝐃𝐎𝐋𝐋𝐀𝐑𝐁𝐎𝐓 𝐕5 〕━━━⬣\n` +
        `┃ ✦ Owner    : ${config.ownerName}\n` +
        `┃ ✦ Country  : ${config.ownerCountry}\n` +
        `┃ ✦ Prefix   : [ ${config.prefix} ]\n` +
        `┃ ✦ User     : Premium Member\n` +
        `┃ ✦ Mode     : Public\n` +
        `┃ ✦ Platform : WhatsApp\n` +
        `┃ ✦ Engine   : ${config.engine}\n` +
        `┃ ✦ Speed    : ${speed} ms\n` +
        `┃ ✦ Uptime   : ${uptime}\n` +
        `┃ ✦ Version  : ${config.version}\n` +
        `┃ ✦ RAM      : ${ram.bar} ${ram.pct}%\n` +
        `┃ ✦ Usage    : ${ram.usedGB}GB / ${ram.totalGB}GB\n` +
        `┃ ✦ AutoReply: ${autoReply}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `«⚡ Developed By Dollar\n⚡ Powered By Dollar Engine»`
    );
  },

  async owner(sock, msg) {
    // Only shows the Canada (primary) number — never reveals secondary number
    await msg.reply(
      `╭━━━〔 👑 BOT OWNER 〕━━━⬣\n` +
        `┃ ✦ Name    : ${config.ownerName}\n` +
        `┃ ✦ Country : ${config.ownerCountry}\n` +
        `┃ ✦ Number  : +${config.ownerNumber}\n` +
        `┃ ✦ Link    : wa.me/${config.ownerNumber}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`
    );
  },

  async stats(sock, msg) {
    const jid = msg.key.remoteJid;
    const ram = getRamInfo();
    const uptime = getUptime();
    const autoReply = (await store.get('autoreply')) ? 'ON' : 'OFF';

    const start = Date.now();
    const sent = await msg.reply('Fetching stats...');
    const speed = Date.now() - start;
    try {
      if (sent?.key) await sock.sendMessage(jid, { delete: sent.key });
    } catch (_) {}

    await msg.reply(
      `╭━━━〔 📊 BOT STATS 〕━━━⬣\n` +
        `┃ ✦ Bot      : ${config.botName} V${config.version}\n` +
        `┃ ✦ Engine   : ${config.engine}\n` +
        `┃ ✦ Speed    : ${speed} ms\n` +
        `┃ ✦ Uptime   : ${uptime}\n` +
        `┃ ✦ RAM      : ${ram.bar} ${ram.pct}%\n` +
        `┃ ✦ Usage    : ${ram.usedGB}GB / ${ram.totalGB}GB\n` +
        `┃ ✦ Platform : ${os.platform()} (${os.arch()})\n` +
        `┃ ✦ Node     : ${process.version}\n` +
        `┃ ✦ AutoReply: ${autoReply}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`
    );
  },

  async info(sock, msg) {
    await msg.reply(
      `╭━━━〔 ℹ️ BOT INFO 〕━━━⬣\n` +
        `┃ ✦ Name      : ${config.botName} V${config.version}\n` +
        `┃ ✦ Developer : ${config.ownerName}\n` +
        `┃ ✦ Prefix    : [ ${config.prefix} ]\n` +
        `┃ ✦ Engine    : ${config.engine}\n` +
        `┃ ✦ Mode      : Public\n` +
        `┃ ✦ Library   : Baileys\n` +
        `┃ ✦ AI        : Dollar AI\n` +
        `┃ ✦ Platform  : WhatsApp\n` +
        `┃ ✦ Voice     : Dollar Voice\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `📖 Type *.menu* to see all commands.\n` +
        `💵 DollarBot V5 — Smart • Fast • Limitless`
    );
  },

  async details(sock, msg, sender) {
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const pushName = msg.pushName || 'Unknown';
    await msg.reply(
      `╭━━━〔 👤 YOUR DETAILS 〕━━━⬣\n` +
        `┃ ✦ Name   : ${pushName}\n` +
        `┃ ✦ JID    : ${sender}\n` +
        `┃ ✦ Chat   : ${isGroup ? 'Group' : 'Private'}\n` +
        `┃ ✦ ChatID : ${jid}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`
    );
  },

  async time(sock, msg) {
    const now = new Date();
    await msg.reply(
      `╭━━━〔 🕐 TIME 〕━━━⬣\n` +
        `┃ ✦ Date     : ${now.toDateString()}\n` +
        `┃ ✦ Time     : ${now.toTimeString().split(' ')[0]}\n` +
        `┃ ✦ Timezone : ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n` +
        `┃ ✦ UTC      : ${now.toUTCString()}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`
    );
  },

  async jid(sock, msg, sender) {
    await msg.reply(
      `╭━━━〔 🆔 JID INFO 〕━━━⬣\n` +
        `┃ ✦ Your JID : ${sender}\n` +
        `┃ ✦ Chat JID : ${msg.key.remoteJid}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`
    );
  },

  async runtime(sock, msg) {
    const uptime = getUptime();
    await msg.reply(
      `╭━━━〔 ⏱️ RUNTIME 〕━━━⬣\n` +
        `┃ ✦ Bot Runtime : ${uptime}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`
    );
  },

  async uptime(sock, msg) {
    const uptime = getUptime();
    await msg.reply(
      `╭━━━〔 🕐 UPTIME 〕━━━⬣\n` +
        `┃ ✦ Uptime : ${uptime}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`
    );
  },
};

// ── V6 User Commands ───────────────────────────────────────────────────────

Object.assign(userCommands, {

  async block(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    const target = mentioned[0] || (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    if (!target || target === '@s.whatsapp.net')
      return sock.sendMessage(jid, { text: '❌ Usage: .block @user or .block number\nExample: .block 14378898269' }, { quoted: msg });
    try {
      await sock.updateBlockStatus(target, 'block');
      await sock.sendMessage(jid, { text: `🚫 *Blocked* @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Block failed: ${e.message}` }, { quoted: msg });
    }
  },

  async unblock(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    const target = mentioned[0] || (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
    if (!target || target === '@s.whatsapp.net')
      return sock.sendMessage(jid, { text: '❌ Usage: .unblock @user or .unblock number' }, { quoted: msg });
    try {
      await sock.updateBlockStatus(target, 'unblock');
      await sock.sendMessage(jid, { text: `✅ *Unblocked* @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Unblock failed: ${e.message}` }, { quoted: msg });
    }
  },

  async pp(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    const target = mentioned[0] || ctx?.participant
      || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
      || msg.key.participant || jid;
    try {
      const ppUrl = await sock.profilePictureUrl(target, 'preview');
      const fetch2 = require('node-fetch');
      const buf = await (await fetch2(ppUrl, { timeout: 15000 })).buffer();
      await sock.sendMessage(jid, {
        image: buf, caption: `📸 *Profile Picture*\n👤 @${target.split('@')[0]}`, mentions: [target],
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ No profile picture available. Privacy may be set to Nobody.` }, { quoted: msg });
    }
  },

  async fullpp(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    const target = mentioned[0] || ctx?.participant
      || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
      || msg.key.participant || jid;
    try {
      const ppUrl = await sock.profilePictureUrl(target, 'image');
      const fetch2 = require('node-fetch');
      const buf = await (await fetch2(ppUrl, { timeout: 15000 })).buffer();
      await sock.sendMessage(jid, {
        image: buf, caption: `🖼️ *Full Profile Picture*\n👤 @${target.split('@')[0]}`, mentions: [target],
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Could not get full profile picture.` }, { quoted: msg });
    }
  },

  async left(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us'))
      return sock.sendMessage(jid, { text: '❌ This command works in groups only.' }, { quoted: msg });
    try {
      const meta = await sock.groupMetadata(jid);
      await sock.sendMessage(jid, {
        text:
          `╭━━━〔 👤 MEMBER INFO 〕━━━⬣\n` +
          `┃ 📛 *Group:* ${meta.subject}\n` +
          `┃ 👥 *Current Members:* ${meta.participants.length}\n` +
          `┃ 📅 *Created:* ${new Date((meta.creation || 0) * 1000).toLocaleDateString('en-CA')}\n` +
          `┃\n┃ _WhatsApp does not expose left-member history._\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
    }
  },

  async gjid(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us'))
      return sock.sendMessage(jid, { text: `ℹ️ *Chat JID:* ${jid}` }, { quoted: msg });
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🆔 GROUP JID 〕━━━⬣\n` +
        `┃ 🆔 *JID:*\n┃ ${jid}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },
});

module.exports = userCommands;
