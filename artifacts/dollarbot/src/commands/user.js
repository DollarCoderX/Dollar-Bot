const config = require('../config');
const os = require('os');

function getUptime() {
  const ms = Date.now() - config.startTime;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function getRamUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const pct = Math.round((used / total) * 100);
  const bar = '▰'.repeat(Math.floor(pct / 20)) + '▱'.repeat(5 - Math.floor(pct / 20));
  return { pct, bar, used: (used / 1e9).toFixed(1), total: (total / 1e9).toFixed(1) };
};

const userCommands = {
  async ping(sock, msg) {
    const start = Date.now();
    await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pinging...' });
    const ping = Date.now() - start;
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🏓 *Pong!*\n⚡ Speed: ${ping}ms`,
    });
  },

  async alive(sock, msg) {
    const ram = getRamUsage();
    const uptime = getUptime();
    const text =
      `╭━━━〔 💵 𝐃𝐎𝐋𝐋𝐀𝐑𝐁𝐎𝐓 𝐕5 〕━━━⬣\n` +
      `┃ ✦ Owner : ${config.ownerName}\n` +
      `┃ ✦ Country : ${config.ownerCountry}\n` +
      `┃ ✦ Prefix : [ ${config.prefix} ]\n` +
      `┃ ✦ Mode : Public\n` +
      `┃ ✦ Platform : WhatsApp\n` +
      `┃ ✦ Engine : ${config.engine}\n` +
      `┃ ✦ Uptime : ${uptime}\n` +
      `┃ ✦ Version : ${config.version}\n` +
      `┃ ✦ RAM : ${ram.bar} ${ram.pct}%\n` +
      `┃ ✦ Usage : ${ram.used}GB / ${ram.total}GB\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
      `«⚡ DollarBot is Online & Stable ✅»`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  async owner(sock, msg) {
    const text =
      `╭━━━〔 👑 BOT OWNER 〕━━━⬣\n` +
      `┃ ✦ Name : ${config.ownerName}\n` +
      `┃ ✦ Country : ${config.ownerCountry}\n` +
      `┃ ✦ Number : +${config.ownerNumber}\n` +
      `┃ ✦ WhatsApp : wa.me/${config.ownerNumber}\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  async stats(sock, msg) {
    const ram = getRamUsage();
    const uptime = getUptime();
    const text =
      `╭━━━〔 📊 BOT STATS 〕━━━⬣\n` +
      `┃ ✦ Bot : ${config.botName} V${config.version}\n` +
      `┃ ✦ Uptime : ${uptime}\n` +
      `┃ ✦ RAM : ${ram.bar} ${ram.pct}%\n` +
      `┃ ✦ Usage : ${ram.used}GB / ${ram.total}GB\n` +
      `┃ ✦ Platform : ${os.platform()} (${os.arch()})\n` +
      `┃ ✦ Node : ${process.version}\n` +
      `┃ ✦ Engine : ${config.engine}\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  async info(sock, msg) {
    const text =
      `╭━━━〔 ℹ️ BOT INFO 〕━━━⬣\n` +
      `┃ ✦ Name : ${config.botName} V${config.version}\n` +
      `┃ ✦ Developer : ${config.ownerName}\n` +
      `┃ ✦ Prefix : [ ${config.prefix} ]\n` +
      `┃ ✦ Engine : ${config.engine}\n` +
      `┃ ✦ Mode : Public\n` +
      `┃ ✦ Library : Baileys\n` +
      `┃ ✦ AI : Pollinations\n` +
      `┃ ✦ Platform : WhatsApp\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
      `📖 *How to use:*\n` +
      `Type *.menu* to see all commands\n` +
      `Prefix all commands with [ ${config.prefix} ]\n\n` +
      `💵 DollarBot V5 — Smart • Fast • Limitless`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  async details(sock, msg, sender) {
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const pushName = msg.pushName || 'Unknown';
    const senderJid = sender;
    const text =
      `╭━━━〔 👤 YOUR DETAILS 〕━━━⬣\n` +
      `┃ ✦ Name : ${pushName}\n` +
      `┃ ✦ JID : ${senderJid}\n` +
      `┃ ✦ Chat : ${isGroup ? 'Group' : 'Private'}\n` +
      `┃ ✦ Chat ID : ${jid}\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`;
    await sock.sendMessage(jid, { text });
  },

  async time(sock, msg) {
    const now = new Date();
    const text =
      `╭━━━〔 🕐 TIME 〕━━━⬣\n` +
      `┃ ✦ Date : ${now.toDateString()}\n` +
      `┃ ✦ Time : ${now.toTimeString().split(' ')[0]}\n` +
      `┃ ✦ Timezone : ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n` +
      `┃ ✦ Timestamp : ${now.getTime()}\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  async jid(sock, msg, sender) {
    const text =
      `╭━━━〔 🆔 JID INFO 〕━━━⬣\n` +
      `┃ ✦ Your JID : ${sender}\n` +
      `┃ ✦ Chat JID : ${msg.key.remoteJid}\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },

  async runtime(sock, msg) {
    const uptime = getUptime();
    await sock.sendMessage(msg.key.remoteJid, { text: `⏱️ *Runtime:* ${uptime}` });
  },

  async uptime(sock, msg) {
    const uptime = getUptime();
    await sock.sendMessage(msg.key.remoteJid, { text: `🕐 *Uptime:* ${uptime}` });
  },
};

module.exports = userCommands;
