const pollinations = require('../lib/pollinations');
const memory = require('../lib/memory');
const fetch = require('node-fetch');

// ── Groq API call helper (Render env, no hardcoded keys) ────────────────
const env = require('../env');
const GROQ_KEYS = env.GROQ_KEYS || [];
let groqKeyIdx = 0;
function nextGroqKey() {
  const k = GROQ_KEYS[groqKeyIdx % GROQ_KEYS.length];
  groqKeyIdx++;
  return k;
}


async function groqRequest(body, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    const key = nextGroqKey();
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(body),
        timeout: 45000,
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content.trim();
      }
    } catch (_) {}
  }
  // Fallback to pollinations
  return await pollinations.textGenerate(body.messages);
}

// ── Download image from quoted message ───────────────────────────────────
async function downloadQuotedImage(sock, msg) {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const { getContextInfo, getMessageContent } = require('../lib/messages');

  // Check quoted message
  const ctx = getContextInfo(msg);
  if (ctx?.quotedMessage) {
    const quotedMsg = { message: ctx.quotedMessage, key: { remoteJid: msg.key.remoteJid, id: ctx.stanzaId, participant: ctx.participant } };
    const content = getMessageContent(quotedMsg);
    if (content.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: ctx.quotedMessage, key: quotedMsg.key },
        'buffer', {},
        { logger: { level: 'silent', fatal: ()=>{}, error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}, trace: ()=>{}, child: ()=>({ level:'silent', fatal:()=>{}, error:()=>{}, warn:()=>{}, info:()=>{}, debug:()=>{}, trace:()=>{} }) } }
      );
      return buffer;
    }
  }

  // Check current message for image
  const content = getMessageContent(msg);
  if (content.imageMessage) {
    const buffer = await downloadMediaMessage(
      msg, 'buffer', {},
      { logger: { level: 'silent', fatal: ()=>{}, error: ()=>{}, warn: ()=>{}, info: ()=>{}, debug: ()=>{}, trace: ()=>{}, child: ()=>({ level:'silent', fatal:()=>{}, error:()=>{}, warn:()=>{}, info:()=>{}, debug:()=>{}, trace:()=>{} }) } }
    );
    return buffer;
  }

  return null;
}

const aiCommands = {

  async cortex(sock, msg, args, jid) {
    if (!args.length) {
      return msg.reply(
        `╭━━━〔 🧠 CORTEX AI 〕━━━⬣\n` +
        `┃ Usage: .cortex <your question>\n` +
        `┃\n` +
        `┃ Expert-level AI with memory.\n` +
        `┃ Ask anything — coding, science,\n` +
        `┃ philosophy, creative writing & more.\n` +
        `┃\n` +
        `┃ 💡 It remembers your conversation!\n` +
        `┃ Type .clear to reset memory.\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `Example: .cortex explain quantum entanglement`
      );
    }
    await msg.reply('*Thinking...*');
    try {
      const response = await pollinations.cortex(jid, args.join(' '));
      await msg.reply(`╭━━━〔 CORTEX AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n⚡ Powered by Cortex AI`);
    } catch (e) { await msg.reply(`Cortex Error: ${e.message}`); }
  },

  async mera(sock, msg, args, jid) {
    if (!args.length) {
      return msg.reply(
        `╭━━━〔 💖 MERA AI 〕━━━⬣\n` +
        `┃ Usage: .mera <your message>\n` +
        `┃\n` +
        `┃ Friendly, warm female AI.\n` +
        `┃ She remembers your chats!\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `Example: .mera how are you today?`
      );
    }
    await msg.reply('_Mera is typing..._');
    try {
      const response = await pollinations.mera(jid, args.join(' '));
      await msg.reply(`╭━━━〔 MERA AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n💖 Powered by Mera AI`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async ask(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .ask <question>');
    await msg.reply('_Thinking..._');
    try {
      const response = await pollinations.textGenerate([
        { role: 'system', content: 'You are a helpful, knowledgeable AI assistant. Answer clearly and concisely using WhatsApp markdown: *bold* for key terms. No tables, no HTML.' },
        { role: 'user', content: args.join(' ') },
      ]);
      await msg.reply(`🤖 *Answer*\n\n${response}`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async codeai(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .codeai <question>\nExample: .codeai write a REST API in Node.js');
    await msg.reply('_CodeAI is generating..._');
    try {
      const response = await pollinations.codeAI(args.join(' '));
      await msg.reply(`╭━━━〔 CODE AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n⚡ Powered by CodeAI`);
    } catch (e) { await msg.reply(`CodeAI Error: ${e.message}`); }
  },

  async roast(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .roast <name>');
    await msg.reply('_Roasting..._');
    try {
      const response = await pollinations.roast(args.join(' '));
      await msg.reply(`🔥 *ROAST TIME!*\n\n${response}`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async complimentai(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .complimentai <name>');
    await msg.reply('_Creating compliment..._');
    try {
      const response = await pollinations.complimentAI(args.join(' '));
      await msg.reply(`*Compliment*\n\n${response}`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async weather(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .weather <city>\nExample: .weather Toronto');
    await msg.reply('_Fetching weather..._');
    try {
      const result = await pollinations.getWeather(args.join(' '));
      await msg.reply(`*Weather*\n\n${result}\n\n_ DollarBot_`);
    } catch (e) { await msg.reply(`Weather Error: ${e.message}`); }
  },

  async imagine(sock, msg, args, jid) {
    if (!args.length) {
      return sock.sendMessage(jid, { text: `╭━━━〔 🎨 IMAGINE AI 〕━━━⬣\n┃ Usage: .imagine <prompt>\n┃\n┃ AI image generation from text.\n╰━━━━━━━━━━━━━━━━━━⬣\n\nExample: .imagine a cyberpunk city at night` });
    }
    const prompt = args.join(' ');
    await sock.sendMessage(jid, { text: `_Generating image for:_ "${prompt}"\n_Almost done..._` });
    try {
      const imageUrl = pollinations.getImageUrl(prompt);
      await sock.sendMessage(jid, { image: { url: imageUrl }, caption: `*Generated Image*\nPrompt: ${prompt}\n\n_Powered by Dollar Engine_` });
    } catch (e) { await sock.sendMessage(jid, { text: `Image Error: ${e.message}` }); }
  },

  async translate(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .translate <text>');
    await msg.reply('_Translating..._');
    try {
      const result = await pollinations.translate(args.join(' '));
      await msg.reply(`*Translation*\n\n${result}\n\n_Powered by DollarBot_`);
    } catch (e) { await msg.reply(`Translation Error: ${e.message}`); }
  },

  async story(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .story <topic>');
    await msg.reply('_Writing your story..._');
    try {
      const response = await pollinations.textGenerate([
        { role: 'system', content: 'You are a creative storyteller. Write a short engaging story (150-200 words). Use *bold* for character names and key moments. WhatsApp formatting only.' },
        { role: 'user', content: `Write a short story about: ${args.join(' ')}` },
      ]);
      await msg.reply(`*Story*\n\n${response}\n\n_Powered by Dollar AI_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async poem(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .poem <topic>');
    await msg.reply('_Writing your poem..._');
    try {
      const response = await pollinations.textGenerate([
        { role: 'system', content: 'You are a poet. Write a short beautiful poem (4-8 lines). Use _italic_ for the title. WhatsApp formatting only.' },
        { role: 'user', content: `Write a poem about: ${args.join(' ')}` },
      ]);
      await msg.reply(`*Poem*\n\n${response}\n\n_Powered by Dollar AI_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async motivate(sock, msg, args, jid) {
    await msg.reply('_Finding motivation..._');
    try {
      const response = await pollinations.textGenerate([
        { role: 'system', content: 'You are a motivational coach. Give one powerful genuine motivational message (2-4 sentences). Use *bold* for the key message. WhatsApp formatting only.' },
        { role: 'user', content: 'Give me a powerful motivational message.' },
      ]);
      await msg.reply(`*Daily Motivation*\n\n${response}`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async summarize(sock, msg, args, jid) {
    const isGroup = jid.endsWith('@g.us');

    // ── No args in a group → summarize last 20 group messages ──────────────
    if (!args.length) {
      if (!isGroup) {
        return msg.reply(
          '📝 *Usage:*\n\n' +
          '• In a *group*: just send *.summarize* — I\'ll summarize the last 20 messages\n' +
          '• Anywhere: *.summarize <text>* — I\'ll summarize what you paste\n\n' +
          '_Tip: Use *.summarize* in a group chat for instant group recap!_'
        );
      }

      await msg.reply('_📊 Reading the last 20 messages and summarizing..._');

      try {
        const stored = global.msgStore?.messages?.[jid];
        const rawMsgs = stored?.array || [];

        if (!rawMsgs.length) {
          return msg.reply(
            '❌ No messages cached yet.\n\n' +
            '_Messages are cached after the bot connects. Wait for some activity, then try again._'
          );
        }

        const sorted = [...rawMsgs]
          .filter(m => m.message && !m.messageStubType)
          .sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0))
          .slice(-20);

        if (!sorted.length) return msg.reply('❌ No readable messages found in cache.');

        const lines = sorted.map((m, i) => {
          const sender = (m.key.participant || m.key.remoteJid || 'Unknown')
            .split('@')[0].split(':')[0];
          const c = m.message || {};
          let text = '';
          if (c.conversation)                       text = c.conversation;
          else if (c.extendedTextMessage?.text)     text = c.extendedTextMessage.text;
          else if (c.imageMessage)                  text = c.imageMessage.caption ? `[image: ${c.imageMessage.caption}]` : '[sent an image]';
          else if (c.videoMessage)                  text = c.videoMessage.caption ? `[video: ${c.videoMessage.caption}]` : '[sent a video]';
          else if (c.audioMessage)                  text = '[sent a voice note]';
          else if (c.stickerMessage)                text = '[sent a sticker]';
          else if (c.documentMessage)               text = `[file: ${c.documentMessage.fileName || 'document'}]`;
          else if (c.reactionMessage)               text = `[reacted ${c.reactionMessage.text || '👍'}]`;
          else                                      text = '[other media]';
          return `${i + 1}. @${sender}: ${text}`;
        });

        const conversation = lines.join('\n');

        const summaryText = await groqRequest({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert group chat summarizer. Create a detailed summary of the conversation. ' +
                'Mention: who talked about what (use @username), main topics, notable moments, media shared, and the overall vibe. ' +
                'Format with WhatsApp markdown: *bold* for names/topics, numbered list for main points. No HTML.',
            },
            {
              role: 'user',
              content: `Summarize these ${lines.length} group messages:\n\n${conversation}`,
            },
          ],
        });

        await msg.reply(
          `╭━━━〔 📊 GROUP SUMMARY 〕━━━⬣\n` +
          `┃ Last *${lines.length} messages* analyzed\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
          `${summaryText}\n\n` +
          `_⚡ Powered by Dollar AI_`
        );
      } catch (e) {
        await msg.reply(`❌ Summary failed: ${e.message}`);
      }
      return;
    }

    // ── Has args → summarize the provided text ───────────────────────────────
    await msg.reply('_Summarizing..._');
    try {
      const response = await pollinations.textGenerate([
        { role: 'system', content: 'You are an expert summarizer. Give a clear concise summary using bullet points (- item). Use *bold* for key points. WhatsApp formatting only.' },
        { role: 'user', content: `Summarize this:\n${args.join(' ')}` },
      ]);
      await msg.reply(`*Summary*\n\n${response}\n\n_Powered by Dollar AI_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async clear(sock, msg, args, jid) {
    const persona = args[0]?.toLowerCase();
    if (persona && !['cortex', 'mera', 'autoreply'].includes(persona)) {
      return msg.reply('Usage: .clear [cortex/mera/autoreply]\nOmit to clear all AI memory.');
    }
    memory.clearHistory(jid, persona || null);
    const what = persona ? `*${persona}*` : '*all AI*';
    await msg.reply(`Memory cleared for ${what}. Fresh start!`);
  },

  // ── .summary — Summarize last 20 group messages using Groq ───────────────
  async summary(sock, msg, args, jid) {
    if (!jid.endsWith('@g.us')) return msg.reply('❌ .summary only works in group chats.');

    await msg.reply('_📊 Collecting the last 20 messages and summarizing..._');

    try {
      // Pull messages from the in-memory store
      const stored = global.msgStore?.messages?.[jid];
      const rawMsgs = stored?.array || [];

      if (rawMsgs.length === 0) {
        return msg.reply('❌ No messages found in cache. Messages are only cached after the bot connects. Try again after some messages have been sent.');
      }

      // Sort by timestamp and take last 20
      const sorted = [...rawMsgs]
        .filter(m => m.message)
        .sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0))
        .slice(-20);

      // Format messages for AI
      const lines = sorted.map((m, i) => {
        const sender = (m.key.participant || m.key.remoteJid || 'Unknown').split('@')[0].split(':')[0];
        const content = m.message || {};

        let msgType = 'text';
        let text = '';

        if (content.conversation) { text = content.conversation; }
        else if (content.extendedTextMessage?.text) { text = content.extendedTextMessage.text; }
        else if (content.imageMessage) { msgType = 'image'; text = content.imageMessage.caption || '[sent an image]'; }
        else if (content.videoMessage) { msgType = 'video'; text = content.videoMessage.caption || '[sent a video]'; }
        else if (content.audioMessage) { msgType = 'audio'; text = '[sent a voice note]'; }
        else if (content.stickerMessage) { msgType = 'sticker'; text = '[sent a sticker]'; }
        else if (content.documentMessage) { msgType = 'document'; text = `[sent a document: ${content.documentMessage.fileName || 'file'}]`; }
        else if (content.reactionMessage) {
          const reacted = content.reactionMessage.text || '👍';
          text = `[reacted with ${reacted}]`;
        }
        else { text = '[message type not supported]'; }

        return `${i + 1}. @${sender}: ${text}`;
      });

      if (!lines.length) return msg.reply('❌ No readable messages found in the cache.');

      const conversation = lines.join('\n');
      const count = lines.length;

      const summaryText = await groqRequest({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert group chat summarizer. Analyze the provided messages and create a highly detailed summary. ' +
              'Include: who said what (use @username format), what topics were discussed, any notable reactions or stickers sent, ' +
              'any media shared, and the overall mood or vibe of the chat. ' +
              'Format with WhatsApp markdown: *bold* for usernames and key topics, use numbered list for main points. ' +
              'Be specific and mention usernames where relevant. No tables, no HTML.',
          },
          {
            role: 'user',
            content: `Summarize these ${count} group chat messages in high detail:\n\n${conversation}`,
          },
        ],
      });

      await msg.reply(
        `╭━━━〔 📊 CHAT SUMMARY 〕━━━⬣\n` +
        `┃ Last *${count} messages* analyzed\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `${summaryText}\n\n` +
        `_⚡ Powered by Dollar AI_`
      );
    } catch (e) {
      await msg.reply(`❌ Summary failed: ${e.message}`);
    }
  },

  // ── .vision — Describe an image using Groq vision model ──────────────────
  async vision(sock, msg, args, jid) {
    await msg.reply('_👁️ Analyzing image..._');

    try {
      const imgBuffer = await downloadQuotedImage(sock, msg);

      if (!imgBuffer) {
        return msg.reply(
          '❌ No image found.\n\n' +
          'Usage:\n' +
          '• Reply to an image with *.vision*\n' +
          '• Or send an image with *.vision* as caption\n\n' +
          '_Optional: add a prompt after — e.g._ .vision what text is in this image?'
        );
      }

      const base64 = imgBuffer.toString('base64');
      const prompt = args.length ? args.join(' ') : 'Describe this image in great detail. Mention: what is shown, colors, text (if any), mood, and anything interesting or unusual.';

      // Try Groq vision
      let description = null;
      for (let i = 0; i < GROQ_KEYS.length; i++) {
        const key = nextGroqKey();
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
              model: 'meta-llama/llama-4-scout-17b-16e-instruct',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt + '\n\nFormat using WhatsApp markdown: *bold* for key observations. Be thorough and descriptive.' },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
                  ],
                },
              ],
              max_tokens: 1024,
            }),
            timeout: 45000,
          });

          if (res.ok) {
            const data = await res.json();
            description = data.choices?.[0]?.message?.content?.trim();
            if (description) break;
          }
        } catch (_) {}
      }

      if (!description) {
        return msg.reply('❌ Vision analysis failed. The image may be too large or unsupported. Please try a different image.');
      }

      await msg.reply(
        `╭━━━〔 👁️ VISION AI 〕━━━⬣\n\n` +
        `${description}\n\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n` +
        `_⚡ Powered by Dollar Vision_`
      );
    } catch (e) {
      await msg.reply(`❌ Vision error: ${e.message}`);
    }
  },

  // ── .manhwa — Search manhwa/manga info with image ─────────────────────────
  async manhwa(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .manhwa <title>\nExample: .manhwa Solo Leveling');

    const query = args.join(' ');
    await msg.reply(`_🔍 Searching for "${query}"..._`);

    try {
      // Primary: Jikan API (MyAnimeList) — best free manga data
      const encoded = encodeURIComponent(query);
      const searchRes = await fetch(`https://api.jikan.moe/v4/manga?q=${encoded}&limit=1`, { timeout: 15000 });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const manga = searchData.data?.[0];

        if (manga) {
          const title       = manga.title || 'Unknown';
          const titleEng    = manga.title_english ? `(${manga.title_english})` : '';
          const type        = manga.type || 'Manga';
          const status      = manga.status || 'Unknown';
          const chapters    = manga.chapters ? `${manga.chapters} chapters` : 'Ongoing';
          const volumes     = manga.volumes ? `${manga.volumes} volumes` : 'N/A';
          const score       = manga.score ? `⭐ ${manga.score}/10` : 'N/A';
          const scored_by   = manga.scored_by ? `(${manga.scored_by.toLocaleString()} ratings)` : '';
          const rank        = manga.rank ? `#${manga.rank}` : 'N/A';
          const popularity  = manga.popularity ? `#${manga.popularity}` : 'N/A';
          const genres      = manga.genres?.map(g => g.name).join(', ') || 'N/A';
          const authors     = manga.authors?.map(a => a.name).join(', ') || 'N/A';
          const synopsis    = manga.synopsis
            ? manga.synopsis.replace(/\[Written by MAL Rewrite\]/gi, '').trim().slice(0, 350) + (manga.synopsis.length > 350 ? '...' : '')
            : 'No synopsis available.';
          const coverUrl    = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url;

          const text =
            `╭━━━〔 📖 MANHWA/MANGA 〕━━━⬣\n` +
            `┃ *${title}* ${titleEng}\n` +
            `┃\n` +
            `┃ 📌 *Type    :* ${type}\n` +
            `┃ 📊 *Status  :* ${status}\n` +
            `┃ 📚 *Chapters:* ${chapters}\n` +
            `┃ 📦 *Volumes :* ${volumes}\n` +
            `┃ ⭐ *Score   :* ${score} ${scored_by}\n` +
            `┃ 🏆 *Rank    :* ${rank}\n` +
            `┃ 🔥 *Popular :* ${popularity}\n` +
            `┃ 🎭 *Genres  :* ${genres}\n` +
            `┃ ✍️ *Authors  :* ${authors}\n` +
            `┃\n` +
            `┃ 📝 *Synopsis:*\n` +
            `┃ ${synopsis.replace(/\n/g, '\n┃ ')}\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
            `_🔗 MyAnimeList · Powered by DollarBot_`;

          if (coverUrl) {
            try {
              const imgRes = await fetch(coverUrl, { timeout: 15000 });
              if (imgRes.ok) {
                const imgBuf = await imgRes.buffer();
                await sock.sendMessage(jid, { image: imgBuf, caption: text }, { quoted: msg });
                return;
              }
            } catch (_) {}
          }

          await msg.reply(text);
          return;
        }
      }

      // Fallback: AI-generated info
      const aiResult = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'You are a manga/manhwa expert. Provide detailed info about the title including: type (manga/manhwa/manhua), status, approx chapters, genres, authors, score/popularity, and a short synopsis. Format with WhatsApp markdown: *bold* for labels. No tables, no HTML.',
        },
        { role: 'user', content: `Tell me about the manhwa/manga: ${query}` },
      ]);

      await msg.reply(
        `╭━━━〔 📖 MANHWA/MANGA 〕━━━⬣\n\n` +
        `*${query}*\n\n` +
        `${aiResult}\n\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n_Powered by Dollar AI_`
      );
    } catch (e) {
      await msg.reply(`❌ Manhwa search failed: ${e.message}`);
    }
  },
};

// ── V6 AI Models via Pollinations (Gemini, GPT-4o, Lumen, DeepSeek) ──────────

const V6_MODELS = {
  gemini:   { model: 'gemini',        name: '🌐 Gemini',  system: `You are Gemini, Google's most capable AI model. You are intelligent, accurate, and helpful. Format ALL responses using WhatsApp markdown ONLY: *bold* for key terms, _italic_ for emphasis, bullets for lists. Be comprehensive and clear.` },
  gpt:      { model: 'openai-large',  name: ' Cortex-4.2',  system: `You are Cortex, Dollar's most advanced model. You are extremely capable, creative, and precise. Format ALL responses using WhatsApp markdown ONLY: *bold* for key terms, _italic_ for emphasis. Be accurate and thorough.` },
  lumen:    { model: 'openai',        name: ' Lumen-flash',    system: `You are Lumen — a creative, illuminating AI by DollarBot. "Lumen" means light. You are thoughtful, poetic, insightful, and artistic. You illuminate complex ideas with clarity and beauty. Format with WhatsApp markdown ONLY: *bold* for key points, _italic_ for poetic emphasis. Bring light to every question.` },
  deepseek: { model: 'deepseek-r1',   name: ' DeepSeek', system: `You are DeepSeek, a powerful reasoning AI. You excel at deep analysis, reasoning, coding, mathematics, and complex problem solving. Format ALL responses using WhatsApp markdown ONLY: *bold* for key terms, _italic_ for emphasis. Think step-by-step and reason carefully.` },
};

const v6Mem = {};
function getV6Hist(k, jid) { return v6Mem[`${k}_${jid}`] || []; }
function addV6Hist(k, jid, role, content) {
  const key = `${k}_${jid}`;
  if (!v6Mem[key]) v6Mem[key] = [];
  v6Mem[key].push({ role, content });
  if (v6Mem[key].length > 20) v6Mem[key] = v6Mem[key].slice(-20);
}

async function v6Chat(sock, msg, args, jid, model) {
  const cfg = V6_MODELS[model];
  if (!args.length)
    return sock.sendMessage(jid, { text: `${cfg.name} _AI — powered by DollarBot V6_\n\nUsage: *.${model} <question>*\n_Reply .${model} .clear to reset memory_` }, { quoted: msg });
  if (args.join(' ') === '.clear') {
    delete v6Mem[`${model}_${jid}`];
    return sock.sendMessage(jid, { text: `🧹 *${cfg.name}* memory cleared.` }, { quoted: msg });
  }
  const input = args.join(' ');
  const history = getV6Hist(model, jid);
  const messages = [{ role: 'system', content: cfg.system }, ...history, { role: 'user', content: input }];
  sock.sendPresenceUpdate('composing', jid).catch(() => {});
  try {
    const res = await pollinations.textGenerate(messages, cfg.model);
    if (!res) throw new Error('Empty response');
    addV6Hist(model, jid, 'user', input);
    addV6Hist(model, jid, 'assistant', res);
    await sock.sendMessage(jid, { text: `${cfg.name}\n\n${res}` }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(jid, { text: `❌ ${cfg.name} failed: ${e.message}` }, { quoted: msg });
  }
}

aiCommands.gemini   = (sock, msg, args, jid) => v6Chat(sock, msg, args, jid, 'gemini');
aiCommands.gpt      = (sock, msg, args, jid) => v6Chat(sock, msg, args, jid, 'gpt');
aiCommands.lumen    = (sock, msg, args, jid) => v6Chat(sock, msg, args, jid, 'lumen');
aiCommands.deepseek = (sock, msg, args, jid) => v6Chat(sock, msg, args, jid, 'deepseek');

module.exports = aiCommands;
