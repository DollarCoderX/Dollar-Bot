const pollinations = require('../lib/pollinations');
const fetch = require('node-fetch');

const aiCommands = {
  async cortex(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 🧠 CORTEX AI 〕━━━⬣\n` +
          `┃ Usage: .cortex <your question>\n` +
          `┃\n` +
          `┃ Cortex is an expert-level AI that\n` +
          `┃ adapts its personality to any topic.\n` +
          `┃ Ask anything — coding, science,\n` +
          `┃ philosophy, creative writing & more.\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `Example: .cortex explain quantum physics`,
      });
    }
    await sock.sendMessage(jid, { text: '🧠 *Cortex is thinking...*' });
    try {
      const response = await pollinations.cortex(args.join(' '));
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🧠 CORTEX AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n⚡ Powered by Cortex AI`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Cortex Error: ${e.message}` });
    }
  },

  async mera(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 💖 MERA AI 〕━━━⬣\n` +
          `┃ Usage: .mera <your message>\n` +
          `┃\n` +
          `┃ Mera is a friendly, human-like\n` +
          `┃ female AI. She's warm, funny,\n` +
          `┃ and loves chatting with you!\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `Example: .mera how are you today?`,
      });
    }
    await sock.sendMessage(jid, { text: '💖 *Mera is typing...*' });
    try {
      const response = await pollinations.mera(args.join(' '));
      await sock.sendMessage(jid, {
        text: `╭━━━〔 💖 MERA AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n💖 Powered by Mera AI`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Mera Error: ${e.message}` });
    }
  },

  async codeai(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 💻 CODE AI 〕━━━⬣\n` +
          `┃ Usage: .codeai <your question>\n` +
          `┃\n` +
          `┃ CodeAI is a programming expert.\n` +
          `┃ Ask for code in any language,\n` +
          `┃ debug help, or explanations.\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `Example: .codeai write a Python web scraper`,
      });
    }
    await sock.sendMessage(jid, { text: '💻 *CodeAI is generating...*' });
    try {
      const response = await pollinations.codeAI(args.join(' '));
      await sock.sendMessage(jid, {
        text: `╭━━━〔 💻 CODE AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n⚡ Powered by CodeAI`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ CodeAI Error: ${e.message}` });
    }
  },

  async roast(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .roast <name>\nExample: .roast John' });
    }
    await sock.sendMessage(jid, { text: '🔥 *Roasting in progress...*' });
    try {
      const response = await pollinations.roast(args.join(' '));
      await sock.sendMessage(jid, { text: `🔥 *ROAST TIME!* 🔥\n\n${response}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async complimentai(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .complimentai <name>\nExample: .complimentai Sarah' });
    }
    await sock.sendMessage(jid, { text: '💐 *Creating compliment...*' });
    try {
      const response = await pollinations.complimentAI(args.join(' '));
      await sock.sendMessage(jid, { text: `💐 *COMPLIMENT TIME!* 💐\n\n${response}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async weather(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .weather <city>\nExample: .weather Toronto' });
    }
    await sock.sendMessage(jid, { text: '🌍 *Fetching weather...*' });
    try {
      const result = await pollinations.getWeather(args.join(' '));
      await sock.sendMessage(jid, { text: `🌤️ *Weather Report*\n\n${result}\n\n⚡ Powered by DollarBot` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Weather Error: ${e.message}` });
    }
  },

  async imagine(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 🎨 IMAGINE AI 〕━━━⬣\n` +
          `┃ Usage: .imagine <prompt>\n` +
          `┃\n` +
          `┃ Generate AI images from text!\n` +
          `┃ Be descriptive for best results.\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `Example: .imagine a futuristic city at sunset`,
      });
    }
    const prompt = args.join(' ');
    await sock.sendMessage(jid, { text: `🎨 *Generating image for:* "${prompt}"\n⏳ Please wait...` });
    try {
      const imageUrl = pollinations.getImageUrl(prompt);
      const response = await fetch(imageUrl, { timeout: 60000 });
      if (!response.ok) throw new Error('Image generation failed');
      const buffer = await response.buffer();
      await sock.sendMessage(jid, {
        image: buffer,
        caption: `🎨 *Generated Image*\n📝 Prompt: ${prompt}\n\n⚡ Powered by Pollinations AI`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Image Error: ${e.message}` });
    }
  },

  async translate(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .translate <text>\nExample: .translate Hola como estas' });
    }
    await sock.sendMessage(jid, { text: '🌐 *Translating...*' });
    try {
      const result = await pollinations.translate(args.join(' '));
      await sock.sendMessage(jid, { text: `🌐 *Translation Result*\n\n${result}\n\n⚡ Powered by DollarBot` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Translation Error: ${e.message}` });
    }
  },
};

module.exports = aiCommands;
