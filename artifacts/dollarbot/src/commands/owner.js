const config = require('../config');
const store = require('../lib/store');

// Helper: extract quoted message context
function getQuoted(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    null
  );
}

const ownerCommands = {
  async say(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .say <text>' });
    await sock.sendMessage(jid, { text: args.join(' ') });
  },

  async sendto(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (args.length < 2) {
      return sock.sendMessage(jid, { text: '❌ Usage: .sendto <number> <message>\nE.g. .sendto 14378898269 Hello!' });
    }
    const number = args[0].replace(/\D/g, '');
    const text = args.slice(1).join(' ');
    try {
      await sock.sendMessage(`${number}@s.whatsapp.net`, { text });
      await sock.sendMessage(jid, { text: `✅ Sent to +${number}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` });
    }
  },

  async react(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const emoji = args[0];
    if (!emoji) return sock.sendMessage(jid, { text: '❌ Usage: .react <emoji>\nReply to a message with this command.' });

    const ctx = getQuoted(msg);
    // React to the quoted message if replying, otherwise react to own command
    const targetKey = ctx?.stanzaId
      ? { remoteJid: jid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant || undefined }
      : msg.key;

    try {
      await sock.sendMessage(jid, { react: { text: emoji, key: targetKey } });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ React failed: ${e.message}` });
    }
  },

  async delete(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = getQuoted(msg);
    if (!ctx?.stanzaId) {
      return sock.sendMessage(jid, { text: '❌ Reply to the message you want to delete.' });
    }
    const isGroup = jid.endsWith('@g.us');
    try {
      await sock.sendMessage(jid, {
        delete: {
          remoteJid: jid,
          id: ctx.stanzaId,
          fromMe: false,
          participant: isGroup ? (ctx.participant || undefined) : undefined,
        },
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Delete failed: ${e.message}` });
    }
  },

  async autoreply(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const val = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(val)) {
      return sock.sendMessage(jid, { text: '❌ Usage: .autoreply on/off' });
    }
    store.set('autoreply', val === 'on');
    await sock.sendMessage(jid, {
      text: `✅ AI AutoReply is now *${val.toUpperCase()}* ${val === 'on' ? '🤖 (Conversational Mode)' : '❌'}`,
    });
  },

  async autolike(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const val = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(val)) {
      return sock.sendMessage(jid, { text: '❌ Usage: .autolike on/off' });
    }
    store.set('autolike', val === 'on');
    await sock.sendMessage(jid, {
      text: `✅ AutoLike Status is now *${val.toUpperCase()}* ${val === 'on' ? '🔥 (1min ON / 1min OFF to prevent ban)' : '❌'}`,
    });
  },

  async vv(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = getQuoted(msg);

    if (!ctx?.quotedMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to a view-once photo or video with .vv' });
    }

    const qMsg = ctx.quotedMessage;
    const viewOnceMsg = qMsg?.viewOnceMessage || qMsg?.viewOnceMessageV2 || qMsg?.viewOnceMessageV2Extension;
    const viewOnceInner = viewOnceMsg?.message;

    if (!viewOnceInner) {
      return sock.sendMessage(jid, { text: '❌ That message is not a view-once photo/video.' });
    }

    const mediaType = Object.keys(viewOnceInner).find(k =>
      ['imageMessage', 'videoMessage', 'audioMessage'].includes(k)
    );

    if (!mediaType) {
      return sock.sendMessage(jid, { text: '❌ Could not extract view-once media.' });
    }

    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      // Create a fake message object for downloadMediaMessage to process
      const fakeMsg = {
        key: {
          remoteJid: jid,
          id: ctx.stanzaId,
          fromMe: false,
          participant: ctx.participant
        },
        message: viewOnceInner
      };
      
      const buffer = await downloadMediaMessage(
        fakeMsg,
        'buffer',
        {},
        { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
      );

      if (mediaType === 'imageMessage') {
        await sock.sendMessage(jid, { image: buffer, caption: viewOnceInner[mediaType].caption || '✅ View-once media revealed!' });
      } else if (mediaType === 'videoMessage') {
        await sock.sendMessage(jid, { video: buffer, caption: viewOnceInner[mediaType].caption || '✅ View-once media revealed!' });
      } else if (mediaType === 'audioMessage') {
        await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4', ptt: viewOnceInner[mediaType].ptt });
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ VV Error: ${e.message}` });
    }
  },

  async broadcast(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .broadcast <message>' });
    const text = args.join(' ');
    let groups;
    try {
      groups = await sock.groupFetchAllParticipating();
    } catch (e) {
      return sock.sendMessage(jid, { text: `❌ Failed to fetch groups: ${e.message}` });
    }
    const ids = Object.keys(groups);
    let sent = 0;
    await sock.sendMessage(jid, { text: `📡 Broadcasting to ${ids.length} groups...` });
    for (const gid of ids) {
      try {
        await sock.sendMessage(gid, { text: `📢 *BROADCAST*\n\n${text}\n\n— ${config.botName} V${config.version}` });
        sent++;
        await new Promise(r => setTimeout(r, 600));
      } catch (_) {}
    }
    await sock.sendMessage(jid, { text: `✅ Broadcast complete: ${sent}/${ids.length} groups reached.` });
  },

  async shutdown(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: '🔴 *DollarBot V5 shutting down...*\nGoodbye! 💵' });
    await new Promise(r => setTimeout(r, 2000));
    process.exit(0);
  },
};

module.exports = ownerCommands;
