const fetch = require('node-fetch');
const QRCode = require('qrcode');
const pollinations = require('../lib/pollinations');

const utilityCommands = {
  async calculate(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .calculate <expression>\nExample: .calculate 25 * 4 + 10');
    try {
      const expr = args.join(' ').replace(/[^0-9+\-*/.()%\s]/g, '');
      if (!expr.trim()) throw new Error('Invalid expression — only numbers and operators allowed');
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')();
      if (!isFinite(result)) throw new Error('Result is infinite or not a number');
      await msg.reply(`*Calculator*\n\n${args.join(' ')} = *${result}*`);
    } catch (e) {
      await msg.reply(`Calculation Error: ${e.message}`);
    }
  },

  async genpass(sock, msg, args) {
    const len = Math.min(Math.max(parseInt(args[0]) || 16, 4), 64);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.?';
    let pw = '';
    for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    await msg.reply(`*Generated Password*\n\n\`\`\`${pw}\`\`\`\n\nLength: ${len} characters\n_Store it somewhere safe!_`);
  },

  async encode(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .encode <text>');
    const text = args.join(' ');
    const encoded = Buffer.from(text, 'utf8').toString('base64');
    await msg.reply(`*Base64 Encode*\n\nOriginal: ${text}\n\nEncoded:\n\`\`\`${encoded}\`\`\``);
  },

  async decode(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .decode <base64>');
    try {
      const raw = args.join(' ').replace(/\s/g, '');
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      await msg.reply(`*Base64 Decode*\n\nInput: \`\`\`${raw.slice(0, 60)}...\`\`\`\n\nDecoded: ${decoded}`);
    } catch {
      await msg.reply('Invalid base64 string.');
    }
  },

  async qr(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .qr <text or URL>');
    const text = args.join(' ');
    await msg.reply('Generating QR code...');
    try {
      const buf = await QRCode.toBuffer(text, { type: 'png', width: 512, margin: 2 });
      await msg.replyWithImage(buf, `*QR Code*\nContent: ${text}`);
    } catch (e) {
      await msg.reply(`QR Error: ${e.message}`);
    }
  },

  async tinyurl(sock, msg, args) {
    if (!args[0]) return msg.reply('Usage: .tinyurl <URL>');
    await msg.reply('Shortening URL...');
    try {
      const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args[0])}`, { timeout: 12000 });
      if (!res.ok) throw new Error('TinyURL service error');
      const short = await res.text();
      if (!short.startsWith('http')) throw new Error('Invalid response from TinyURL');
      await msg.reply(`*URL Shortened!*\n\nOriginal: ${args[0]}\nShort: ${short}`);
    } catch (e) {
      await msg.reply(`TinyURL Error: ${e.message}`);
    }
  },

  async pingweb(sock, msg, args) {
    if (!args[0]) return msg.reply('Usage: .pingweb <URL>\nExample: .pingweb google.com');
    let url = args[0];
    if (!url.startsWith('http')) url = 'https://' + url;
    await msg.reply(`Pinging ${url}...`);
    const start = Date.now();
    try {
      const res = await fetch(url, { method: 'HEAD', timeout: 12000 });
      const ms = Date.now() - start;
      await msg.reply(
        `🌐 *Ping Result*\n\n` +
        `🔗 URL: ${url}\n` +
        `✅ Status: ${res.status} ${res.statusText || 'OK'}\n` +
        `⚡ Speed: ${ms}ms\n` +
        `📶 Online: ${res.status < 400 ? 'Yes ✅' : 'Issue ⚠️'}`
      );
    } catch (e) {
      const ms = Date.now() - start;
      await msg.reply(`🌐 *Ping Result*\n\n🔗 ${url}\n❌ Unreachable (${ms}ms)\n📶 Offline ❌`);
    }
  },

  async tts(sock, msg, args) {
    if (!args.length) {
      return msg.reply(
        `╭━━━〔 🔊 TEXT TO SPEECH 〕━━━⬣\n` +
        `┃ Usage: .tts <text>\n` +
        `┃\n` +
        `┃ Converts your text to a voice\n` +
        `┃ message using Pollinations AI.\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `Example: .tts Hello, I am DollarBot V6!`
      );
    }
    const text = args.join(' ');
    if (text.length > 500) {
      return msg.reply('❌ Text too long. Maximum 500 characters for TTS.');
    }
    await msg.reply('🔊 *Generating audio...*');
    try {
      const { buffer, mime } = await pollinations.tts(text);
      await sock.sendMessage(msg.key.remoteJid, {
        audio: buffer,
        mimetype: mime || 'audio/mpeg',
      }, { quoted: msg });
    } catch (e) {
      await msg.reply(`TTS Error: ${e.message}`);
    }
  },
};

module.exports = utilityCommands;
