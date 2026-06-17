'use strict';
const store = require('../lib/store');
const config = require('../config');

function isOwner(sender) {
  const num = (sender || '').split('@')[0].split(':')[0];
  return config.ownerNumbers.includes(num);
}
function isMention(arg) { return /^@\d+$/.test(arg) || /\d{7,}/.test(arg); }
function numFromMention(arg) { return arg.replace(/[^0-9]/g, ''); }

module.exports = {

  // .setvar key value — set a bot variable (owner only)
  async setvar(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(sender))
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can set variables.' }, { quoted: msg });
    if (args.length < 2)
      return sock.sendMessage(jid, { text: '❌ Usage: .setvar <key> <value>\nExample: .setvar greetmsg Welcome to the bot!' }, { quoted: msg });
    const key = args[0].toLowerCase();
    const value = args.slice(1).join(' ');
    const vars = (await store.get('botvars')) || {};
    vars[key] = value;
    await store.set('botvars', vars);
    await sock.sendMessage(jid, { text: `✅ Variable *${key}* set.\n\nValue: _${value}_` }, { quoted: msg });
  },

  // .getvar key — get a bot variable value
  async getvar(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args[0])
      return sock.sendMessage(jid, { text: '❌ Usage: .getvar <key>' }, { quoted: msg });
    const key = args[0].toLowerCase();
    const vars = (await store.get('botvars')) || {};
    if (!(key in vars))
      return sock.sendMessage(jid, { text: `❌ Variable *${key}* not found.` }, { quoted: msg });
    await sock.sendMessage(jid, {
      text: `📦 *${key}*\n\n${vars[key]}`,
    }, { quoted: msg });
  },

  // .delvar key — delete a variable
  async delvar(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(sender))
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can delete variables.' }, { quoted: msg });
    if (!args[0])
      return sock.sendMessage(jid, { text: '❌ Usage: .delvar <key>' }, { quoted: msg });
    const key = args[0].toLowerCase();
    const vars = (await store.get('botvars')) || {};
    if (!(key in vars))
      return sock.sendMessage(jid, { text: `❌ Variable *${key}* not found.` }, { quoted: msg });
    delete vars[key];
    await store.set('botvars', vars);
    await sock.sendMessage(jid, { text: `🗑️ Variable *${key}* deleted.` }, { quoted: msg });
  },

  // .allvar — list all variables
  async allvar(sock, msg) {
    const jid = msg.key.remoteJid;
    const vars = (await store.get('botvars')) || {};
    const entries = Object.entries(vars);
    if (!entries.length)
      return sock.sendMessage(jid, { text: '📦 No variables set yet.\n\nSet with *.setvar <key> <value>*' }, { quoted: msg });
    let text = `╭━━━〔 📦 BOT VARIABLES 〕━━━⬣\n`;
    for (const [k, v] of entries) {
      text += `┃ • *${k}*: ${String(v).slice(0, 60)}${String(v).length > 60 ? '...' : ''}\n`;
    }
    text += `╰━━━━━━━━━━━━━━━━━━⬣\n_Total: ${entries.length} variable(s)_`;
    await sock.sendMessage(jid, { text }, { quoted: msg });
  },

  // .setsudo @user — add sudo user (owner only)
  async setsudo(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(sender))
      return sock.sendMessage(jid, { text: '❌ Only the owner can set sudo users.' }, { quoted: msg });
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || (args[0] && isMention(args[0]) ? numFromMention(args[0]) + '@s.whatsapp.net' : null);
    if (!target)
      return sock.sendMessage(jid, { text: '❌ Usage: .setsudo @user' }, { quoted: msg });
    const sudos = (await store.get('sudoUsers')) || [];
    const num = target.split('@')[0].split(':')[0];
    if (sudos.includes(num))
      return sock.sendMessage(jid, { text: `⚠️ @${num} is already a sudo user.`, mentions: [target] }, { quoted: msg });
    sudos.push(num);
    await store.set('sudoUsers', sudos);
    await sock.sendMessage(jid, { text: `✅ @${num} added as *sudo user*.`, mentions: [target] }, { quoted: msg });
  },

  // .getsudo — list all sudo users
  async getsudo(sock, msg) {
    const jid = msg.key.remoteJid;
    const sudos = (await store.get('sudoUsers')) || [];
    if (!sudos.length)
      return sock.sendMessage(jid, { text: '📋 No sudo users set. Add with *.setsudo @user*' }, { quoted: msg });
    let text = `╭━━━〔 👤 SUDO USERS 〕━━━⬣\n`;
    sudos.forEach((n, i) => { text += `┃ ${i + 1}. @${n}\n`; });
    text += `╰━━━━━━━━━━━━━━━━━━⬣`;
    await sock.sendMessage(jid, { text, mentions: sudos.map(n => `${n}@s.whatsapp.net`) }, { quoted: msg });
  },

  // .delsudo @user — remove sudo user
  async delsudo(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!isOwner(sender))
      return sock.sendMessage(jid, { text: '❌ Only the owner can remove sudo users.' }, { quoted: msg });
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || (args[0] && isMention(args[0]) ? numFromMention(args[0]) + '@s.whatsapp.net' : null);
    if (!target)
      return sock.sendMessage(jid, { text: '❌ Usage: .delsudo @user' }, { quoted: msg });
    const num = target.split('@')[0].split(':')[0];
    let sudos = (await store.get('sudoUsers')) || [];
    if (!sudos.includes(num))
      return sock.sendMessage(jid, { text: `❌ @${num} is not a sudo user.`, mentions: [target] }, { quoted: msg });
    sudos = sudos.filter(s => s !== num);
    await store.set('sudoUsers', sudos);
    await sock.sendMessage(jid, { text: `🗑️ @${num} removed from sudo users.`, mentions: [target] }, { quoted: msg });
  },
};
