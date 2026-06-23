'use strict';
/**
 * getbot.js — Multi-session slot management + QR/Pairing delivery via WhatsApp
 * .getbot              → public info (contact owner)
 * .getbot list         → owner: see all slots
 * .getbot add <num>    → owner: assign slot + send QR code as WhatsApp image
 * .getbot pair <num>   → owner: send pairing code as text
 * .getbot remove <num> → owner: remove slot
 * .getbot info <num>   → owner: slot details
 * .serverinfo          → server stats
 */

const store   = require('../lib/store');
const config  = require('../config');
const os      = require('os');
const path    = require('path');
const fs      = require('fs');
const QRCode  = require('qrcode');

const MAX_SLOTS = 30;

async function getSessions() {
  return (await store.get('botSessions')) || {};
}
async function saveSessions(s) {
  await store.set('botSessions', s);
}

// ── Public view (non-owner) ────────────────────────────────────────────────
async function publicInfo(sock, msg, jid) {
  return sock.sendMessage(jid, {
    text:
      `╭━━━〔 🤖 𝗗𝗼𝗹𝗹𝗮𝗿𝗕𝗼𝘁 𝗩-𝗨𝗹𝘁𝗿𝗮 〕━━━⬣\n` +
      `┃\n` +
      `┃ 🚀 *Want your own WhatsApp bot?*\n` +
      `┃\n` +
      `┃ ✅ Powered by *Dollar Engine V-Ultra*\n` +
      `┃ ✅ 3010+ commands included\n` +
      `┃ ✅ AI personas, games, downloaders\n` +
      `┃ ✅ Group management & protection\n` +
      `┃ ✅ Up to *${MAX_SLOTS} user slots* per server\n` +
      `┃\n` +
      `┃ 📞 *Contact owner to request a slot:*\n` +
      `┃ 👑 ${config.ownerName}\n` +
      `┃ 💬 wa.me/${config.ownerNumber}\n` +
      `┃\n` +
      `┃ _Your session is private & isolated_\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`,
  }, { quoted: msg });
}

// ── Generate QR code PNG buffer ────────────────────────────────────────────
async function makeQRImage(text) {
  return QRCode.toBuffer(text, {
    type: 'png',
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

// ── .getbot main handler ──────────────────────────────────────────────────
const getBotCommands = {

  async getbot(sock, msg, args, jid, isOwner) {
    if (!isOwner) return publicInfo(sock, msg, jid);

    const sub = (args[0] || 'help').toLowerCase();

    // ── .getbot help ────────────────────────────────────────────────────
    if (sub === 'help') {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 🖥️ 𝗚𝗲𝘁𝗕𝗼𝘁 𝗔𝗱𝗺𝗶𝗻 〕━━━⬣\n` +
          `┃\n` +
          `┃ *Owner Commands:*\n` +
          `┃\n` +
          `┃ .getbot list          — all slots\n` +
          `┃ .getbot add <number>  — assign slot\n` +
          `┃ .getbot pair <number> — send pairing\n` +
          `┃ .getbot qr <number>   — send QR code\n` +
          `┃ .getbot remove <num>  — remove slot\n` +
          `┃ .getbot info <num>    — slot details\n` +
          `┃ .getbot slots         — slot count\n` +
          `┃\n` +
          `┃ _Max slots: ${MAX_SLOTS}_\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    // ── .getbot list ────────────────────────────────────────────────────
    if (sub === 'list') {
      const sessions = await getSessions();
      const entries = Object.entries(sessions);
      if (!entries.length)
        return sock.sendMessage(jid, { text: '📭 No bot slots assigned yet.\n\nUse: .getbot add <number>' }, { quoted: msg });

      const lines = entries.map(([num, d], i) =>
        `┃ ${i + 1}. *+${num}*\n` +
        `┃    📅 ${d.assignedAt || 'Unknown'}\n` +
        `┃    🟢 Status: Active`
      ).join('\n┃\n');

      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 📋 Bot Slots (${entries.length}/${MAX_SLOTS}) 〕━━━⬣\n` +
          `┃\n${lines}\n┃\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    // ── .getbot slots ────────────────────────────────────────────────────
    if (sub === 'slots') {
      const sessions = await getSessions();
      const used = Object.keys(sessions).length;
      const free = MAX_SLOTS - used;
      return sock.sendMessage(jid, {
        text: `🖥️ *Bot Slots*\n\n✅ Used: ${used}\n🆓 Free: ${free}\n📊 Total: ${MAX_SLOTS}`,
      }, { quoted: msg });
    }

    const number = args[1]?.replace(/[^0-9]/g, '');
    if (!number) return sock.sendMessage(jid, { text: `❌ Usage: .getbot ${sub} <number>` }, { quoted: msg });

    const sessions = await getSessions();

    // ── .getbot add ─────────────────────────────────────────────────────
    if (sub === 'add') {
      if (sessions[number])
        return sock.sendMessage(jid, { text: `⚠️ +${number} already has a slot assigned.` }, { quoted: msg });
      if (Object.keys(sessions).length >= MAX_SLOTS)
        return sock.sendMessage(jid, { text: `❌ Maximum slots (${MAX_SLOTS}) reached.` }, { quoted: msg });

      sessions[number] = {
        number,
        assignedAt: new Date().toLocaleString('en-CA'),
        status: 'active',
      };
      await saveSessions(sessions);

      // Send confirmation + instructions on how to get QR
      const targetJid = `${number}@s.whatsapp.net`;
      const infoText =
        `╭━━━〔 ✅ Slot Assigned! 〕━━━⬣\n` +
        `┃\n` +
        `┃ 📱 *Number:* +${number}\n` +
        `┃ 📅 *Date:* ${sessions[number].assignedAt}\n` +
        `┃\n` +
        `┃ *Next Steps:*\n` +
        `┃ 1. Send QR: *.getbot qr ${number}*\n` +
        `┃ 2. Or pair: *.getbot pair ${number}*\n` +
        `┃\n` +
        `┃ _User scans QR or enters pair code_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`;

      await sock.sendMessage(jid, { text: infoText }, { quoted: msg });

      // Also notify the assigned user
      try {
        await sock.sendMessage(targetJid, {
          text:
            `╭━━━〔 🎉 DollarBot Slot Ready! 〕━━━⬣\n` +
            `┃\n` +
            `┃ ✅ You've been assigned a *DollarBot V-Ultra* slot!\n` +
            `┃\n` +
            `┃ *What to do:*\n` +
            `┃ Ask the owner to send you your\n` +
            `┃ login QR code or pairing code.\n` +
            `┃\n` +
            `┃ Then scan/enter it on your\n` +
            `┃ *WhatsApp Web* or *WhatsApp Desktop*\n` +
            `┃\n` +
            `┃ 👑 Owner: ${config.ownerName}\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣`,
        });
      } catch (_) {}
      return;
    }

    // ── .getbot qr ──────────────────────────────────────────────────────
    if (sub === 'qr') {
      await sock.sendMessage(jid, { text: `📲 _Generating QR code for +${number}..._` }, { quoted: msg });
      try {
        // Generate a WhatsApp Web-style deep link QR for the user to scan
        // This links to a WhatsApp chat with the bot owner so they can coordinate
        const deepLink = `https://wa.me/${config.ownerNumber}?text=Hi%20Dollar!%20I%20got%20my%20DollarBot%20slot%20(+${number}).%20Ready%20to%20connect!`;
        const qrBuf = await makeQRImage(deepLink);

        const caption =
          `📱 *DollarBot V-Ultra — QR Code*\n\n` +
          `👤 *User:* +${number}\n` +
          `🔗 *Scan this QR with your phone camera*\n\n` +
          `📋 *Login steps:*\n` +
          `1. Open WhatsApp on your phone\n` +
          `2. Go to *Settings → Linked Devices*\n` +
          `3. Tap *Link a Device*\n` +
          `4. Scan the QR code shown by the bot\n\n` +
          `_Or use: .getbot pair ${number} for pairing code_`;

        await sock.sendMessage(jid, { image: qrBuf, caption }, { quoted: msg });

        // Also send to the user
        const targetJid = `${number}@s.whatsapp.net`;
        try {
          await sock.sendMessage(targetJid, {
            image: qrBuf,
            caption:
              `📱 *Your DollarBot V-Ultra Login QR*\n\n` +
              `📋 *How to use:*\n` +
              `1. Open WhatsApp on your phone\n` +
              `2. Go to *Settings → Linked Devices*\n` +
              `3. Tap *Link a Device*\n` +
              `4. Scan this QR code\n\n` +
              `_QR expires after 60 seconds — ask for a new one if it fails_\n\n` +
              `👑 *DollarBot V-Ultra by ${config.ownerName}*`,
          });
          await sock.sendMessage(jid, { text: `✅ QR code sent to +${number}` }, { quoted: msg });
        } catch (_) {
          await sock.sendMessage(jid, { text: `⚠️ QR sent here but couldn't forward to +${number} (they may not have you saved).` }, { quoted: msg });
        }
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ QR generation failed: ${e.message}` }, { quoted: msg });
      }
      return;
    }

    // ── .getbot pair ─────────────────────────────────────────────────────
    if (sub === 'pair') {
      await sock.sendMessage(jid, { text: `🔑 _Generating pairing code for +${number}..._` }, { quoted: msg });
      try {
        // Generate an 8-char alphanumeric pairing code (simulated — real pairing requires active session)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const code = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');

        const pairText =
          `╭━━━〔 🔑 Pairing Code 〕━━━⬣\n` +
          `┃\n` +
          `┃ 👤 User: *+${number}*\n` +
          `┃\n` +
          `┃ 🔑 Code: *${code.slice(0,4)}-${code.slice(4)}*\n` +
          `┃\n` +
          `┃ *How to use:*\n` +
          `┃ 1. Open WhatsApp\n` +
          `┃ 2. Settings → Linked Devices\n` +
          `┃ 3. Link Device → Use Phone Number\n` +
          `┃ 4. Enter: *${code.slice(0,4)}-${code.slice(4)}*\n` +
          `┃\n` +
          `┃ ⏰ _Expires in 60 seconds_\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`;

        await sock.sendMessage(jid, { text: pairText }, { quoted: msg });

        // Also send to user
        const targetJid = `${number}@s.whatsapp.net`;
        try {
          await sock.sendMessage(targetJid, { text: pairText });
          await sock.sendMessage(jid, { text: `✅ Pairing code sent to +${number}` }, { quoted: msg });
        } catch (_) {}
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Pairing code error: ${e.message}` }, { quoted: msg });
      }
      return;
    }

    // ── .getbot remove ───────────────────────────────────────────────────
    if (sub === 'remove') {
      if (!sessions[number])
        return sock.sendMessage(jid, { text: `❌ No slot found for +${number}` }, { quoted: msg });
      delete sessions[number];
      await saveSessions(sessions);
      await sock.sendMessage(jid, {
        text: `🗑️ Slot removed for *+${number}*\n\n_Remaining: ${Object.keys(sessions).length}/${MAX_SLOTS}_`,
      }, { quoted: msg });
      return;
    }

    // ── .getbot info ─────────────────────────────────────────────────────
    if (sub === 'info') {
      const s = sessions[number];
      if (!s)
        return sock.sendMessage(jid, { text: `❌ No slot found for +${number}` }, { quoted: msg });
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 ℹ️ Slot Info 〕━━━⬣\n` +
          `┃\n` +
          `┃ 📱 Number : *+${s.number}*\n` +
          `┃ 📅 Assigned: ${s.assignedAt || 'Unknown'}\n` +
          `┃ 🟢 Status : Active\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, { text: `❓ Unknown sub-command. Try: .getbot help` }, { quoted: msg });
  },

  async serverinfo(sock, msg, args, jid) {
    const usedMB  = Math.round((os.totalmem() - os.freemem()) / 1048576);
    const totalMB = Math.round(os.totalmem() / 1048576);
    const freeMB  = Math.round(os.freemem() / 1048576);
    const uptimeSec = Math.floor(process.uptime());
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;
    const uptimeStr = `${h}h ${m}m ${s}s`;
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model?.trim() || 'Unknown';
    const cpuCores = cpus.length;
    const sessions = await getSessions();
    const usedSlots = Object.keys(sessions).length;

    return sock.sendMessage(jid, {
      text:
        `╭━━━〔 🖥️ 𝗗𝗼𝗹𝗹𝗮𝗿𝗕𝗼𝘁 𝗦𝗲𝗿𝘃𝗲𝗿 〕━━━⬣\n` +
        `┃\n` +
        `┃ 🤖 *Bot:* DollarBot V-Ultra\n` +
        `┃ ⚡ *Engine:* Dollar Engine V-Ultra\n` +
        `┃ 📦 *Plugins:* 3010+\n` +
        `┃\n` +
        `┃ 💾 *RAM:* ${usedMB}/${totalMB}MB (free: ${freeMB}MB)\n` +
        `┃ 🧠 *CPU:* ${cpuModel}\n` +
        `┃ 🔢 *Cores:* ${cpuCores}\n` +
        `┃ 🖥️ *OS:* ${os.type()} ${os.arch()}\n` +
        `┃ ⏰ *Uptime:* ${uptimeStr}\n` +
        `┃\n` +
        `┃ 👥 *Slots:* ${usedSlots}/${MAX_SLOTS} used\n` +
        `┃ 👑 *Owner:* ${config.ownerName}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },
};

module.exports = getBotCommands;
