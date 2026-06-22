'use strict';
/**
 * getbot.js — Multi-session WhatsApp server management
 * Commands: .getbot, .serverinfo, .server
 */

const store = require('../lib/store');
const config = require('../config');
const path = require('path');
const fs = require('fs');

const MAX_SLOTS = 30;
const SESSIONS_DIR = path.join(__dirname, '../../', 'sessions');

async function getSessions() {
  return (await store.get('botSessions')) || {};
}

async function saveSessions(sessions) {
  await store.set('botSessions', sessions);
}

const getBotCommands = {
  async getbot(sock, msg, args, isOwner) {
    const jid = msg.key.remoteJid;

    if (!isOwner) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 🤖 𝗗𝗼𝗹𝗹𝗮𝗿𝗕𝗼𝘁 𝗦𝗲𝗿𝘃𝗲𝗿 〕━━━⬣\n` +
          `┃\n` +
          `┃ ✨ *DollarBot V-Ultra*\n` +
          `┃ _Powered by Dollar Engine V-Ultra_\n` +
          `┃\n` +
          `┃ 📌 *How to get your own bot:*\n` +
          `┃\n` +
          `┃ 1️⃣ Contact the owner to request a slot\n` +
          `┃ 2️⃣ Slots: up to *30 users per server*\n` +
          `┃ 3️⃣ Your session is isolated & private\n` +
          `┃ 4️⃣ Supports QR code & pairing code\n` +
          `┃\n` +
          `┃ 👑 *Owner:* ${config.ownerName}\n` +
          `┃ 📞 *Contact:* wa.me/${config.ownerNumber}\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'help') {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 🖥️ 𝗚𝗲𝘁𝗕𝗼𝘁 𝗔𝗱𝗺𝗶𝗻 〕━━━⬣\n` +
          `┃ *Owner Commands:*\n` +
          `┃\n` +
          `┃ .getbot list — view all sessions\n` +
          `┃ .getbot add <number> — assign slot\n` +
          `┃ .getbot remove <number> — remove slot\n` +
          `┃ .getbot info <number> — slot details\n` +
          `┃ .getbot slots — available slot count\n` +
          `┃\n` +
          `┃ 📊 Max slots: *${MAX_SLOTS}*\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    if (sub === 'list') {
      const sessions = await getSessions();
      const entries = Object.entries(sessions);
      if (!entries.length) {
        return sock.sendMessage(jid, { text: '📋 No active sessions assigned.' }, { quoted: msg });
      }
      let list = `╭━━━〔 📋 𝗔𝗰𝘁𝗶𝘃𝗲 𝗦𝗲𝘀𝘀𝗶𝗼𝗻𝘀 〕━━━⬣\n`;
      entries.forEach(([num, info], i) => {
        list += `┃ ${i + 1}. *+${num}* — Slot #${info.slot} | ${info.status || 'pending'}\n`;
      });
      list += `┃\n┃ Total: *${entries.length}/${MAX_SLOTS}*\n╰━━━━━━━━━━━━━━━━━━⬣`;
      return sock.sendMessage(jid, { text: list }, { quoted: msg });
    }

    if (sub === 'slots') {
      const sessions = await getSessions();
      const used = Object.keys(sessions).length;
      const available = MAX_SLOTS - used;
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 🎰 𝗦𝗹𝗼𝘁 𝗦𝘁𝗮𝘁𝘂𝘀 〕━━━⬣\n` +
          `┃ 🟢 Available: *${available}/${MAX_SLOTS}*\n` +
          `┃ 🔴 Used: *${used}/${MAX_SLOTS}*\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    if (sub === 'add') {
      const number = args[1]?.replace(/[^0-9]/g, '');
      if (!number) return sock.sendMessage(jid, { text: '❌ Usage: .getbot add <number>' }, { quoted: msg });

      const sessions = await getSessions();
      if (sessions[number]) return sock.sendMessage(jid, { text: `❌ *+${number}* already has a session slot.` }, { quoted: msg });

      const used = Object.keys(sessions).length;
      if (used >= MAX_SLOTS) return sock.sendMessage(jid, { text: `❌ Server full! All ${MAX_SLOTS} slots are taken.` }, { quoted: msg });

      const slot = used + 1;
      sessions[number] = {
        slot,
        number,
        assignedAt: Date.now(),
        status: 'pending',
        sessionPath: `sessions/slot_${slot}_${number}`,
      };
      await saveSessions(sessions);

      await sock.sendMessage(jid, {
        text:
          `╭━━━〔 ✅ 𝗦𝗲𝘀𝘀𝗶𝗼𝗻 𝗔𝘀𝘀𝗶𝗴𝗻𝗲𝗱 〕━━━⬣\n` +
          `┃ 📱 Number: *+${number}*\n` +
          `┃ 🔢 Slot: *#${slot}*\n` +
          `┃ 📁 Path: \`sessions/slot_${slot}_${number}\`\n` +
          `┃ 📅 Assigned: ${new Date().toLocaleString()}\n` +
          `┃\n` +
          `┃ _User can now connect their WhatsApp_\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });

      // Notify the user if possible
      try {
        await sock.sendMessage(`${number}@s.whatsapp.net`, {
          text:
            `╭━━━〔 🎉 𝗗𝗼𝗹𝗹𝗮𝗿𝗕𝗼𝘁 𝗦𝗲𝗿𝘃𝗲𝗿 〕━━━⬣\n` +
            `┃\n` +
            `┃ ✅ *Your bot slot has been assigned!*\n` +
            `┃\n` +
            `┃ 🔢 Slot: *#${slot}*\n` +
            `┃ 🤖 Bot: *DollarBot V-Ultra*\n` +
            `┃ 👑 Server owner: *${config.ownerName}*\n` +
            `┃\n` +
            `┃ _Contact ${config.ownerName} to complete setup_\n` +
            `┃ _and get your login QR / pairing code._\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣\n` +
            `_⚡ DollarBot V-Ultra — Smart • Fast • Limitless_`,
        });
      } catch (_) {}
      return;
    }

    if (sub === 'remove') {
      const number = args[1]?.replace(/[^0-9]/g, '');
      if (!number) return sock.sendMessage(jid, { text: '❌ Usage: .getbot remove <number>' }, { quoted: msg });
      const sessions = await getSessions();
      if (!sessions[number]) return sock.sendMessage(jid, { text: `❌ No session found for *+${number}*` }, { quoted: msg });
      delete sessions[number];
      await saveSessions(sessions);
      return sock.sendMessage(jid, { text: `✅ Session for *+${number}* removed.` }, { quoted: msg });
    }

    if (sub === 'info') {
      const number = args[1]?.replace(/[^0-9]/g, '');
      if (!number) return sock.sendMessage(jid, { text: '❌ Usage: .getbot info <number>' }, { quoted: msg });
      const sessions = await getSessions();
      const info = sessions[number];
      if (!info) return sock.sendMessage(jid, { text: `❌ No session found for *+${number}*` }, { quoted: msg });
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 📋 𝗦𝗲𝘀𝘀𝗶𝗼𝗻 𝗜𝗻𝗳𝗼 〕━━━⬣\n` +
          `┃ 📱 Number: *+${number}*\n` +
          `┃ 🔢 Slot: *#${info.slot}*\n` +
          `┃ 📊 Status: *${info.status || 'pending'}*\n` +
          `┃ 📅 Assigned: ${new Date(info.assignedAt || 0).toLocaleString()}\n` +
          `┃ 📁 Path: \`${info.sessionPath || 'N/A'}\`\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, { text: '❓ Unknown subcommand. Try .getbot help' }, { quoted: msg });
  },

  async serverinfo(sock, msg) {
    const jid = msg.key.remoteJid;
    const sessions = await getSessions();
    const used = Object.keys(sessions).length;
    const available = MAX_SLOTS - used;
    const upMs = Date.now() - config.startTime;
    const upH = Math.floor(upMs / 3600000);
    const upM = Math.floor((upMs % 3600000) / 60000);
    const uptimeStr = `${upH}h ${upM}m`;

    const os = require('os');
    const total = os.totalmem();
    const free = os.freemem();
    const usedMem = ((total - free) / 1e9).toFixed(1);
    const totalMem = (total / 1e9).toFixed(1);

    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🖥️ 𝗗𝗼𝗹𝗹𝗮𝗿𝗕𝗼𝘁 𝗦𝗲𝗿𝘃𝗲𝗿 𝗜𝗻𝗳𝗼 〕━━━⬣\n` +
        `┃\n` +
        `┃ 🤖 *Bot:* DollarBot V-Ultra\n` +
        `┃ 👑 *Owner:* ${config.ownerName} ${config.ownerCountry}\n` +
        `┃ ⚡ *Engine:* ${config.engine}\n` +
        `┃ 🔢 *Version:* ${config.version}\n` +
        `┃\n` +
        `┃ 🟢 *Sessions Used:* ${used}/${MAX_SLOTS}\n` +
        `┃ 🎰 *Slots Available:* ${available}\n` +
        `┃ ⏱️ *Uptime:* ${uptimeStr}\n` +
        `┃ 💾 *RAM:* ${usedMem}GB / ${totalMem}GB\n` +
        `┃ 💻 *Platform:* ${os.platform()} (${os.arch()})\n` +
        `┃ 🟢 *Node:* ${process.version}\n` +
        `┃\n` +
        `┃ 🔌 *Features:* QR + Pairing Code login\n` +
        `┃ 🛡️ *Security:* Isolated sessions\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n` +
        `_⚡ DollarBot V-Ultra — ${MAX_SLOTS}-User Server_`,
    }, { quoted: msg });
  },
};

module.exports = getBotCommands;
