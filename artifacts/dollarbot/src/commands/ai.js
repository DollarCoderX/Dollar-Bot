const pollinations = require('../lib/pollinations');
const memory = require('../lib/memory');
const fetch = require('node-fetch');

const aiCommands = {
  async cortex(sock, msg, args, jid) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 🧠 CORTEX AI 〕━━━⬣\n` +
          `┃ Usage: .cortex <your question>\n` +
          `┃\n` +
          `┃ Expert-level AI with memory.\n` +
          `┃ Adapts personality to any topic.\n` +
          `┃ Ask anything — coding, science,\n` +
          `┃ philosophy, creative writing & more.\n` +
          `┃\n` +
          `┃ 💡 It remembers your conversation!\n` +
          `┃ Type .clear to reset memory.\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `Example: .cortex explain quantum entanglement`,
      });
    }
    await sock.sendMessage(jid, { text: '🧠 *Cortex is processing...*' });
    try {
      const response = await pollinations.cortex(jid, args.join(' '));
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🧠 CORTEX AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n⚡ Powered by Cortex AI`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Cortex Error: ${e.message}` });
    }
  },

  async mera(sock, msg, args, jid) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 💖 MERA AI 〕━━━⬣\n` +
          `┃ Usage: .mera <your message>\n` +
          `┃\n` +
          `┃ Friendly, warm female AI.\n` +
          `┃ She remembers your chats!\n` +
          `┃ Talk to her about anything.\n` +
          `┃\n` +
          `┃ 💡 Type .clear to reset memory.\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `Example: .mera how are you today?`,
      });
    }
    await sock.sendMessage(jid, { text: '💖 *Mera is typing...*' });
    try {
      const response = await pollinations.mera(jid, args.join(' '));
      await sock.sendMessage(jid, {
        text: `╭━━━〔 💖 MERA AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n💖 Powered by Mera AI`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Mera Error: ${e.message}` });
    }
  },

  async codeai(sock, msg, args, jid) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 💻 CODE AI 〕━━━⬣\n` +
          `┃ Usage: .codeai <question>\n` +
          `┃\n` +
          `┃ Expert coding AI. Supports all\n` +
          `┃ languages — Python, JS, Rust,\n` +
          `┃ Go, C++, SQL and more.\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `Example: .codeai write a REST API in Node.js`,
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

  async roast(sock, msg, args, jid) {
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

  async complimentai(sock, msg, args, jid) {
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

  async weather(sock, msg, args, jid) {
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

  async imagine(sock, msg, args, jid) {
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 🎨 IMAGINE AI 〕━━━⬣\n` +
          `┃ Usage: .imagine <prompt>\n` +
          `┃\n` +
          `┃ AI image generation from text.\n` +
          `┃ Be descriptive for best results!\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `Example: .imagine a cyberpunk city at night with neon lights`,
      });
    }
    const prompt = args.join(' ');
    await sock.sendMessage(jid, { text: `🎨 *Generating:* "${prompt}"\n⏳ This may take 15-30 seconds...` });
    try {
      const imageUrl = pollinations.getImageUrl(prompt);
      const response = await fetch(imageUrl, { timeout: 60000 });
      if (!response.ok) throw new Error('Image generation failed');
      const buffer = await response.buffer();
      await sock.sendMessage(jid, {
        image: buffer,
        caption: `🎨 *AI Generated Image*\n📝 Prompt: ${prompt}\n\n⚡ Powered by Pollinations AI`,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Image Error: ${e.message}` });
    }
  },

  async translate(sock, msg, args, jid) {
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

  async clear(sock, msg, args, jid) {
    const persona = args[0]?.toLowerCase();
    if (persona && !['cortex', 'mera'].includes(persona)) {
      return sock.sendMessage(jid, { text: '❌ Usage: .clear [cortex/mera]\nOmit to clear all AI memory.' });
    }
    memory.clearHistory(jid, persona || null);
    const what = persona ? `*${persona.charAt(0).toUpperCase() + persona.slice(1)} AI*` : '*all AI*';
    await sock.sendMessage(jid, {
      text: `🗑️ Memory cleared for ${what} in this chat.\n\nFresh conversation started! ✨`,
    });
  },
};

module.exports = aiCommands;
