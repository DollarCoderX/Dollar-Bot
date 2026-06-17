'use strict';
const store = require('../lib/store');

// Personal greeting system — per-user greeting messages
// When someone messages the bot, if they have a greeting set, it shows

function senderNum(msg) {
  return (msg.key.participant || msg.key.remoteJid || '').split('@')[0].split(':')[0];
}

module.exports = {

  // .setgreet <message> — set your personal greeting
  async setgreet(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return sock.sendMessage(jid, {
        text: '❌ Usage: .setgreet <message>\nExample: .setgreet Hey! I\'m busy, will reply later.',
      }, { quoted: msg });
    const num = senderNum(msg);
    const greetMsg = args.join(' ');
    const greets = (await store.get('personalGreets')) || {};
    greets[num] = { message: greetMsg, ts: Date.now() };
    await store.set('personalGreets', greets);
    await sock.sendMessage(jid, {
      text:
        `✅ *Personal greeting set!*\n\n` +
        `📝 Your greeting:\n_${greetMsg}_\n\n` +
        `_People who message you will see this greeting automatically._`,
    }, { quoted: msg });
  },

  // .getgreet — view your current greeting
  async getgreet(sock, msg) {
    const jid = msg.key.remoteJid;
    const num = senderNum(msg);
    const greets = (await store.get('personalGreets')) || {};
    const entry = greets[num];
    if (!entry)
      return sock.sendMessage(jid, {
        text: '❌ You have no greeting set.\n\nSet one with *.setgreet <message>*',
      }, { quoted: msg });
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 👋 YOUR GREETING 〕━━━⬣\n` +
        `┃\n` +
        `┃ ${entry.message}\n` +
        `┃\n` +
        `┃ _Set on: ${new Date(entry.ts).toLocaleDateString('en-CA')}_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .delgreet — delete your greeting
  async delgreet(sock, msg) {
    const jid = msg.key.remoteJid;
    const num = senderNum(msg);
    const greets = (await store.get('personalGreets')) || {};
    if (!greets[num])
      return sock.sendMessage(jid, { text: '❌ You have no greeting to delete.' }, { quoted: msg });
    delete greets[num];
    await store.set('personalGreets', greets);
    await sock.sendMessage(jid, { text: '🗑️ Personal greeting deleted.' }, { quoted: msg });
  },
};
