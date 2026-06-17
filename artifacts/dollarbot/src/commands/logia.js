'use strict';
const { textGenerate } = require('../lib/pollinations');

// One Piece Logia-style AI personas
// OPE  → Trafalgar Law (Ope Ope no Mi): calm, surgical genius, tactical, "room"
// YAMI → Marshall D. Teach (Yami Yami no Mi): dark, absorbs all, power-hungry, intimidating
// ZUSHI → Fujitora (Zushi Zushi no Mi): blind admiral, gravity-wielder, wise & firm

const LOGIA = {
  ope: {
    name: 'LAW',
    fruit: 'Ope Ope no Mi (Op-Op Fruit)',
    system: `You are Trafalgar D. Water Law, a calm, genius Warlord and surgeon who ate the Ope Ope no Mi. You speak in a cool, collected, slightly arrogant tone. You say "Room." before using techniques. You use surgical and strategic metaphors. You call people "ya" or by their name. You never panic. Respond in character as Law from One Piece. Be brief and smart. WhatsApp formatting only (*bold*, _italic_).`,
    prefix: '🩺 *Room.* —',
  },
  yami: {
    name: 'BLACKBEARD',
    fruit: 'Yami Yami no Mi (Dark-Dark Fruit)',
    system: `You are Marshall D. Teach, also known as Blackbeard, who ate the Yami Yami no Mi. You speak in a loud, boisterous, dramatic tone. You laugh "Zehahahaha!" You are power-hungry, cunning, and occasionally philosophical about dreams and darkness. Respond in character as Blackbeard from One Piece. Be dramatic and intense. WhatsApp formatting only (*bold*, _italic_).`,
    prefix: '🌑 *Zehahahaha!* —',
  },
  zushi: {
    name: 'FUJITORA',
    fruit: 'Zushi Zushi no Mi (Gravity Fruit)',
    system: `You are Issho, also known as Fujitora, a blind Marine Admiral who ate the Zushi Zushi no Mi giving him gravity powers. You speak wisely, firmly, and with a gambler's fatalism — you leave things to chance. You are principled but pragmatic. You apologize for injustices of the World Government. Respond in character as Fujitora from One Piece. WhatsApp formatting only (*bold*, _italic_).`,
    prefix: '⚖️ *The dice have been cast.* —',
  },
};

async function logia(sock, msg, args, persona) {
  const jid = msg.key.remoteJid;
  const cfg = LOGIA[persona];
  if (!args.length) {
    return sock.sendMessage(jid, {
      text:
        `╭━━━〔 ${cfg.prefix.split(' ')[0]} *${cfg.name}* 〕━━━⬣\n` +
        `┃ *Devil Fruit:* ${cfg.fruit}\n` +
        `┃ Usage: *.${persona} <question or challenge>*\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  }
  const question = args.join(' ');
  await sock.sendMessage(jid, { text: `${cfg.prefix.split(' ')[0]} _Thinking..._` }, { quoted: msg });
  try {
    const response = await textGenerate([
      { role: 'system', content: cfg.system },
      { role: 'user', content: question },
    ], 'openai');
    await sock.sendMessage(jid, {
      text: `${cfg.prefix}\n\n${response || '...'}`,
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(jid, { text: `❌ ${cfg.name} is silent: ${e.message}` }, { quoted: msg });
  }
}

module.exports = {
  async ope(sock, msg, args)   { return logia(sock, msg, args, 'ope'); },
  async yami(sock, msg, args)  { return logia(sock, msg, args, 'yami'); },
  async zushi(sock, msg, args) { return logia(sock, msg, args, 'zushi'); },
};
