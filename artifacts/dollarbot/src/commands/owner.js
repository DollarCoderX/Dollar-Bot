const config = require('../config');
const store = require('../lib/store');

const ownerCommands = {
  async say(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .say <text>' });
    }
    await sock.sendMessage(jid, { text: args.join(' ') });
  },

  async sendto(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (args.length < 2) {
      return sock.sendMessage(jid, { text: '❌ Usage: .sendto <number> <message>\nExample: .sendto 14378898269 Hello there!' });
    }
    const number = args[0].replace(/\D/g, '');
    const message = args.slice(1).join(' ');
    const targetJid = `${number}@s.whatsapp.net`;
    try {
      await sock.sendMessage(targetJid, { text: message });
      await sock.sendMessage(jid, { text: `✅ Message sent to +${number}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed to send: ${e.message}` });
    }
  },

  async react(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: '❌ Usage: .react <emoji>' });
    }
    const emoji = args[0];
    const key = msg.message?.extendedTextMessage?.contextInfo?.stanzaId
      ? {
          remoteJid: jid,
          id: msg.message.extendedTextMessage.contextInfo.stanzaId,
          fromMe: false,
          participant: msg.message.extendedTextMessage.contextInfo.participant,
        }
      : msg.key;

    await sock.sendMessage(jid, {
      react: { text: emoji, key },
    });
  },

  async delete(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted) {
      return sock.sendMessage(jid, { text: '❌ Reply to a message to delete it.' });
    }
    const deleteKey = {
      remoteJid: jid,
      id: quoted.stanzaId,
      fromMe: false,
      participant: quoted.participant,
    };
    await sock.sendMessage(jid, { delete: deleteKey });
  },

  async autoreply(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting)) {
      return sock.sendMessage(jid, { text: '❌ Usage: .autoreply on/off' });
    }
    store.set('autoreply', setting === 'on');
    await sock.sendMessage(jid, {
      text: `✅ AutoReply is now *${setting.toUpperCase()}* ${setting === 'on' ? '✅' : '❌'}`,
    });
  },

  async vv(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted || !quoted.quotedMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to a view-once message.' });
    }
    const qMsg = quoted.quotedMessage;
    const viewOnceKey = Object.keys(qMsg).find(k => k.includes('ViewOnce'));
    if (!viewOnceKey) {
      return sock.sendMessage(jid, { text: '❌ That message is not a view-once media.' });
    }
    await sock.sendMessage(jid, qMsg[viewOnceKey].message || qMsg[viewOnceKey]);
  },

  async broadcast(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .broadcast <message>' });
    }
    const message = args.join(' ');
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.keys(groups);
    let sent = 0;
    for (const gid of groupList) {
      try {
        await sock.sendMessage(gid, { text: `📢 *BROADCAST*\n\n${message}\n\n— ${config.botName}` });
        sent++;
        await new Promise(r => setTimeout(r, 500));
      } catch (_) {}
    }
    await sock.sendMessage(jid, { text: `✅ Broadcast sent to ${sent}/${groupList.length} groups.` });
  },

  async shutdown(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: '🔴 *DollarBot V5 shutting down...*\n\nGoodbye! 💵' });
    await new Promise(r => setTimeout(r, 1500));
    process.exit(0);
  },
};

module.exports = ownerCommands;
