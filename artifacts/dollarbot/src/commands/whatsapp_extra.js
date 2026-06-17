'use strict';
const fetch = require('node-fetch');
const config = require('../config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

function isOwner(sender) {
  const num = (sender || '').split('@')[0].split(':')[0];
  return config.ownerNumbers.includes(num);
}

module.exports = {

  // .online — set bot presence to online/available
  async online(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      await sock.sendPresenceUpdate('available', jid);
      await sock.sendMessage(jid, { text: '✅ Presence set to *online*' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .read — mark all messages in this chat as read
  async read(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      await sock.readMessages([msg.key]);
      await sock.sendMessage(jid, { text: '✅ Messages marked as *read*' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .react <emoji> — react to quoted message
  async creact(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted?.stanzaId)
      return sock.sendMessage(jid, { text: '❌ Reply to a message with .creact <emoji>' }, { quoted: msg });
    const emoji = args[0] || '❤️';
    try {
      await sock.sendMessage(jid, {
        react: {
          text: emoji,
          key: {
            remoteJid: jid,
            id: quoted.stanzaId,
            fromMe: quoted.participant ? false : true,
            participant: quoted.participant,
          },
        },
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ React failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .caption — re-send quoted media with a new caption
  async caption(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted)
      return sock.sendMessage(jid, { text: '❌ Reply to a media message with .caption <new text>' }, { quoted: msg });
    const newCaption = args.join(' ') || '';
    const imgMsg = quoted.imageMessage;
    const vidMsg = quoted.videoMessage;
    if (!imgMsg && !vidMsg)
      return sock.sendMessage(jid, { text: '❌ Reply to an image or video.' }, { quoted: msg });
    try {
      const targetMsg = {
        key: { remoteJid: jid, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: false },
        message: quoted,
      };
      const buf = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
      if (imgMsg) {
        await sock.sendMessage(jid, { image: buf, caption: newCaption });
      } else {
        await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: newCaption });
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Caption failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .doc — re-send quoted media as a document
  async doc(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted)
      return sock.sendMessage(jid, { text: '❌ Reply to any media with .doc to send it as a document' }, { quoted: msg });
    const fileName = args.join(' ') || 'document';
    try {
      const targetMsg = {
        key: { remoteJid: jid, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: false },
        message: quoted,
      };
      const buf = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
      const imgMsg = quoted.imageMessage;
      const vidMsg = quoted.videoMessage;
      const audMsg = quoted.audioMessage;
      const mime = imgMsg ? 'image/jpeg' : vidMsg ? 'video/mp4' : audMsg ? 'audio/ogg' : 'application/octet-stream';
      const ext  = imgMsg ? 'jpg' : vidMsg ? 'mp4' : audMsg ? 'ogg' : 'bin';
      await sock.sendMessage(jid, {
        document: buf,
        fileName: `${fileName}.${ext}`,
        mimetype: mime,
        caption: fileName,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Doc conversion failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .cinfo — current chat/group info
  async cinfo(sock, msg) {
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    try {
      if (isGroup) {
        const meta = await sock.groupMetadata(jid);
        const admins = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join(', ');
        await sock.sendMessage(jid, {
          text:
            `╭━━━〔 💬 CHAT INFO 〕━━━⬣\n` +
            `┃ 📛 *Name:* ${meta.subject}\n` +
            `┃ 🆔 *ID:* ${jid}\n` +
            `┃ 👥 *Members:* ${meta.participants.length}\n` +
            `┃ 👑 *Admins:* ${admins || 'None'}\n` +
            `┃ 📝 *Desc:* ${(meta.desc || 'No description').slice(0, 100)}\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣`,
        }, { quoted: msg });
      } else {
        const sender = msg.key.participant || msg.key.remoteJid;
        await sock.sendMessage(jid, {
          text:
            `╭━━━〔 💬 CHAT INFO 〕━━━⬣\n` +
            `┃ 💬 *Type:* Private DM\n` +
            `┃ 🆔 *Chat JID:* ${jid}\n` +
            `┃ 👤 *Your JID:* ${sender}\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣`,
        }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ cinfo failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .setstatus <text> — set bot WhatsApp status/about
  async setstatus(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(sender))
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can change the status.' }, { quoted: msg });
    if (!args.length)
      return sock.sendMessage(jid, { text: '❌ Usage: .setstatus <text>' }, { quoted: msg });
    const text = args.join(' ');
    try {
      await sock.updateProfileStatus(text);
      await sock.sendMessage(jid, { text: `✅ Bot status updated:\n_${text}_` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .status — show current bot status info
  async status(sock, msg) {
    const jid = msg.key.remoteJid;
    const os = require('os');
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ⚡ BOT STATUS 〕━━━⬣\n` +
        `┃ 🤖 *Bot:* ${config.botName} V6\n` +
        `┃ 🏷 *Version:* ${config.version}\n` +
        `┃ ⏱ *Uptime:* ${h}h ${m}m ${s}s\n` +
        `┃ 💻 *Platform:* Linux\n` +
        `┃ 🟢 *Status:* Online\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .scstatus — send/save status screenshot (placeholder)
  async scstatus(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, {
      text:
        '📸 *Status Screenshot*\n\n' +
        'To save a status:\n' +
        '1. Open the status you want to save\n' +
        '2. Forward it to this bot\n' +
        '3. Reply with *.save* to download it\n\n' +
        '_Note: You can also use .story for more options._',
    }, { quoted: msg });
  },

  // .poll <question> | <opt1> | <opt2> ... — create a WhatsApp poll
  async poll(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const raw = args.join(' ');
    const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3)
      return sock.sendMessage(jid, {
        text: '❌ Usage: .poll <question> | <option1> | <option2> [| option3...]\n\nExample: .poll Favorite fruit? | Apple | Banana | Mango',
      }, { quoted: msg });
    const [question, ...options] = parts;
    try {
      await sock.sendMessage(jid, {
        poll: {
          name: question,
          values: options.slice(0, 12),
          selectableCount: 1,
        },
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Poll failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .call — info about bot calling feature
  async call(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, {
      text:
        '📞 *Call Feature*\n\n' +
        'The bot does not initiate calls.\n' +
        'However, the bot auto-rejects incoming calls by default.\n\n' +
        '_Contact the owner for call-related features._',
    }, { quoted: msg });
  },

  // .antiedit — toggle anti-edit (resend original on edit)
  async antiedit(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const store = require('../lib/store');
    const key = `antiedit_${jid}`;
    const current = await store.get(key) || false;
    const newState = args[0] === 'off' ? false : args[0] === 'on' ? true : !current;
    await store.set(key, newState);
    await sock.sendMessage(jid, {
      text: `${newState ? '✅' : '❌'} Anti-edit is now *${newState ? 'ON' : 'OFF'}*\n_Edited messages will ${newState ? 'be re-sent in original form.' : 'not be tracked.'}_`,
    }, { quoted: msg });
  },

  // .dlt / .delete — delete the bot's last message or quoted
  async dlt(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted?.stanzaId)
      return sock.sendMessage(jid, { text: '❌ Reply to a bot message with .dlt to delete it.' }, { quoted: msg });
    try {
      await sock.sendMessage(jid, {
        delete: {
          remoteJid: jid,
          fromMe: true,
          id: quoted.stanzaId,
          participant: quoted.participant,
        },
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Delete failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .clear — clear AI memory (handled in ai.js but alias here)
  async clear(sock, msg, args) {
    const ai = require('./ai');
    return ai.clear ? ai.clear(sock, msg, args) : sock.sendMessage(msg.key.remoteJid, { text: '❌ Clear command not available.' }, { quoted: msg });
  },
};
