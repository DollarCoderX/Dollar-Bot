const fetch = require('node-fetch');
const QRCode = require('qrcode');

const utilityCommands = {
  async calculate(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .calculate <expression>\nExample: .calculate 25 * 4 + 10' });
    }
    try {
      const expr = args.join(' ').replace(/[^0-9+\-*/.()%\s]/g, '');
      if (!expr.trim()) throw new Error('Invalid expression');
      const result = Function(`"use strict"; return (${expr})`)();
      if (!isFinite(result)) throw new Error('Result is not a finite number');
      await sock.sendMessage(jid, {
        text: `🧮 *Calculator*\n\n📝 Expression: ${args.join(' ')}\n✅ Result: *${result}*`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Calculation Error: ${e.message}` });
    }
  },

  async genpass(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const length = parseInt(args[0]) || 16;
    if (length < 4 || length > 64) {
      return sock.sendMessage(jid, { text: '❌ Password length must be between 4 and 64.' });
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    await sock.sendMessage(jid, {
      text: `🔐 *Generated Password*\n\n\`\`\`${password}\`\`\`\n\n📏 Length: ${length} characters\n⚠️ Save it somewhere safe!`,
    });
  },

  async encode(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .encode <text>\nExample: .encode Hello World' });
    }
    const text = args.join(' ');
    const encoded = Buffer.from(text).toString('base64');
    await sock.sendMessage(jid, {
      text: `🔒 *Base64 Encode*\n\n📝 Original:\n${text}\n\n🔑 Encoded:\n${encoded}`,
    });
  },

  async decode(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .decode <base64>\nExample: .decode SGVsbG8gV29ybGQ=' });
    }
    try {
      const base64 = args.join(' ');
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');
      await sock.sendMessage(jid, {
        text: `🔓 *Base64 Decode*\n\n🔑 Encoded:\n${base64}\n\n📝 Decoded:\n${decoded}`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Decode Error: Invalid base64 string.` });
    }
  },

  async qr(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .qr <text or URL>\nExample: .qr https://google.com' });
    }
    const text = args.join(' ');
    await sock.sendMessage(jid, { text: '📱 *Generating QR Code...*' });
    try {
      const qrBuffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      await sock.sendMessage(jid, {
        image: qrBuffer,
        caption: `📱 *QR Code Generated*\n📝 Content: ${text}\n\n⚡ Powered by DollarBot`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ QR Error: ${e.message}` });
    }
  },

  async tinyurl(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: '❌ Usage: .tinyurl <URL>\nExample: .tinyurl https://google.com' });
    }
    await sock.sendMessage(jid, { text: '🔗 *Shortening URL...*' });
    try {
      const url = args[0];
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 10000 });
      if (!response.ok) throw new Error('Failed to shorten URL');
      const short = await response.text();
      await sock.sendMessage(jid, {
        text: `🔗 *URL Shortened!*\n\n📝 Original:\n${url}\n\n✅ Short URL:\n${short}`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ TinyURL Error: ${e.message}` });
    }
  },

  async pingweb(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args[0]) {
      return sock.sendMessage(jid, { text: '❌ Usage: .pingweb <URL>\nExample: .pingweb https://google.com' });
    }
    let url = args[0];
    if (!url.startsWith('http')) url = 'https://' + url;
    await sock.sendMessage(jid, { text: `🌐 *Pinging ${url}...*` });
    const start = Date.now();
    try {
      const response = await fetch(url, { method: 'HEAD', timeout: 10000 });
      const ms = Date.now() - start;
      const status = response.status;
      const statusText = response.statusText || 'OK';
      await sock.sendMessage(jid, {
        text:
          `🌐 *Ping Result*\n\n` +
          `🔗 URL: ${url}\n` +
          `✅ Status: ${status} ${statusText}\n` +
          `⚡ Response: ${ms}ms\n` +
          `📶 Online: ${status < 400 ? 'Yes ✅' : 'Issue ⚠️'}`,
      });
    } catch (e) {
      const ms = Date.now() - start;
      await sock.sendMessage(jid, {
        text: `🌐 *Ping Result*\n\n🔗 URL: ${url}\n❌ Status: Unreachable\n⏱️ Time: ${ms}ms\n📶 Online: No ❌`,
      });
    }
  },
};

module.exports = utilityCommands;
