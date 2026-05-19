const fetch = require('node-fetch');
const pollinations = require('../lib/pollinations');
const config = require('../config');

const premiumCommands = {
  // ── 1. .enhance <prompt> ──────────────────────────────────────────────
  async enhance(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: 'Usage: .enhance <raw prompt>\nExample: .enhance a cyberpunk city' });
    await sock.sendMessage(jid, { text: '🧠 *AI is enhancing your prompt to an artistic masterpiece...*' });
    try {
      const enhancedPrompt = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'You are an expert art director. Rewrite the user prompt into a highly descriptive, detailed prompt for stable diffusion. Include details about lighting, camera style, atmosphere, color palette, and premium resolution keywords. Keep it under 3-4 sentences. Just output the prompt, nothing else.'
        },
        { role: 'user', content: args.join(' ') }
      ]);
      await sock.sendMessage(jid, { text: `🎨 *Enhanced Prompt:* \n_"${enhancedPrompt}"_\n\n*Generating image...*` });
      const imgUrl = pollinations.getImageUrl(enhancedPrompt);
      await sock.sendMessage(jid, { image: { url: imgUrl }, caption: `*Art Concept:* ${args.join(' ')}\n\n_Powered by DollarBot Premium_` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Enhance Error: ${e.message}` });
    }
  },

  // ── 2. .ship <name1> | <name2> ─────────────────────────────────────────
  async ship(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const body = args.join(' ');
    if (!body.includes('|')) return sock.sendMessage(jid, { text: 'Usage: .ship <Name 1> | <Name 2>\nExample: .ship John | Jane' });
    const parts = body.split('|').map(p => p.trim());
    if (parts.length < 2) return sock.sendMessage(jid, { text: 'Please provide both names separated by |' });
    await sock.sendMessage(jid, { text: '🔮 *Consulting love stars...*' });

    // Seed compatibility rating based on names so same names yield same compatibility
    let sum = 0;
    const combined = `${parts[0].toLowerCase()}-${parts[1].toLowerCase()}`;
    for (let i = 0; i < combined.length; i++) sum += combined.charCodeAt(i);
    const score = (sum % 40) + 60; // range 60% to 100%

    const bars = Math.floor(score / 10);
    const progressBar = '❤️'.repeat(bars) + '🖤'.repeat(10 - bars);

    try {
      const pred = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'You are a humorous romantic matchmaker. Write a funny, positive 2-sentence love compatibility forecast for these two people based on the percentage score given. Keep it charming and lively. WhatsApp formatting only.'
        },
        { role: 'user', content: `Names: ${parts[0]} and ${parts[1]} with love score of ${score}%` }
      ]);

      await sock.sendMessage(jid, {
        text:
          `💞 *DOLLAR CUPID MATCHMAKER* 💞\n\n` +
          `👤 *Partner A:* ${parts[0]}\n` +
          `👤 *Partner B:* ${parts[1]}\n\n` +
          `📊 *Love Compatibility:* *${score}%*\n` +
          `✨ *Progress:* [ ${progressBar} ]\n\n` +
          `💌 *Cupid's Reading:* ${pred}`
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Matchmaker Error: ${e.message}` });
    }
  },

  // ── 3. .waifu ─────────────────────────────────────────────────────────
  async waifu(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch('https://api.waifu.pics/sfw/waifu', { timeout: 12000 });
      if (!res.ok) throw new Error('API down');
      const d = await res.json();
      await sock.sendMessage(jid, { image: { url: d.url }, caption: 'Here is your Waifu! 🌸' });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Waifu Error: ${e.message}` });
    }
  },

  // ── 4. .neko ──────────────────────────────────────────────────────────
  async neko(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch('https://api.waifu.pics/sfw/neko', { timeout: 12000 });
      if (!res.ok) throw new Error('API down');
      const d = await res.json();
      await sock.sendMessage(jid, { image: { url: d.url }, caption: 'Here is your cute Neko! 🐱🐾' });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Neko Error: ${e.message}` });
    }
  },

  // ── 5. .crypto <coin> ──────────────────────────────────────────────────
  async crypto(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const coin = args[0]?.toLowerCase() || 'btc';
    const symbols = {
      btc: 'BTC', eth: 'ETH', sol: 'SOL', bnb: 'BNB',
      doge: 'DOGE', xrp: 'XRP', ada: 'ADA', dot: 'DOT',
      trx: 'TRX', ltc: 'LTC', matic: 'MATIC', avax: 'AVAX'
    };
    const sym = symbols[coin] || coin.toUpperCase();
    await sock.sendMessage(jid, { text: `📈 *Fetching ${sym} market ticker...*` });
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}USDT`, { timeout: 12000 });
      if (!res.ok) throw new Error(`Pair ${sym}/USDT not found on market ticker.`);
      const d = await res.json();
      const price = parseFloat(d.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2 });
      const pct = parseFloat(d.priceChangePercent);
      const changeStr = pct >= 0 ? `+${pct.toFixed(2)}% 📈` : `${pct.toFixed(2)}% 📉`;
      const high = parseFloat(d.highPrice).toLocaleString('en-US');
      const low = parseFloat(d.lowPrice).toLocaleString('en-US');
      const volume = parseFloat(d.volume).toLocaleString('en-US', { maximumFractionDigits: 0 });

      await sock.sendMessage(jid, {
        text:
          `🪙 *Crypto Market Ticker: ${sym}/USDT*\n\n` +
          `💵 *Current Price:* *$${price}*\n` +
          `⚡ *24h Change:* *${changeStr}*\n` +
          `🔺 *24h High:* $${high}\n` +
          `🔻 *24h Low:* $${low}\n` +
          `📊 *24h Volume:* ${volume} ${sym}\n\n` +
          `_Real-time rates powered by Binance_`
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Market Ticker Error: ${e.message}` });
    }
  },

  // ── 6. .tagadmin ──────────────────────────────────────────────────────
  async tagadmin(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ This command works only in groups.' });
    try {
      const meta = await sock.groupMetadata(jid);
      const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
      if (!admins.length) return sock.sendMessage(jid, { text: '❌ No administrators found.' });

      let text = `📢 *ATTENTION ADMINISTRATORS:* \n\n`;
      const mentions = [];
      admins.forEach((admin, i) => {
        text += `${i + 1}. @${admin.id.split('@')[0]}\n`;
        mentions.push(admin.id);
      });

      await sock.sendMessage(jid, { text, mentions });
    } catch (e) {
      await sock.sendMessage(jid, { text: `TagAdmin Error: ${e.message}` });
    }
  },

  // ── 7. .getpp @user ────────────────────────────────────────────────────
  async getpp(sock, msg) {
    const jid = msg.key.remoteJid;
    let target = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (!target && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    if (!target) return sock.sendMessage(jid, { text: '❌ Reply to a user or @tag them to fetch their high-definition profile picture.' });

    await sock.sendMessage(jid, { text: '_Retrieving profile picture from servers..._' });
    try {
      const ppUrl = await sock.profilePictureUrl(target, 'image').catch(() => null);
      if (!ppUrl) return sock.sendMessage(jid, { text: '❌ Could not retrieve high-definition profile picture for this user (they may have hidden it or blocked privacy).' });

      const res = await fetch(ppUrl);
      const buf = await res.buffer();
      await sock.sendMessage(jid, { image: buf, caption: `*High-Definition Profile Picture* of @${target.split('@')[0]}`, mentions: [target] });
    } catch (e) {
      await sock.sendMessage(jid, { text: `GetPP Error: ${e.message}` });
    }
  },

  // ── 8. .vcard ─────────────────────────────────────────────────────────
  async vcard(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${config.ownerName}\n` +
        `ORG:Dollar Corporation;\n` +
        `TITLE:Bot Creator & Developer\n` +
        `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:+${config.ownerNumber}\n` +
        `NOTE:Developer of ${config.botName} and premium engines.\n` +
        'END:VCARD';

      await sock.sendMessage(jid, {
        contacts: {
          displayName: config.ownerName,
          contacts: [{ vcard }]
        }
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `VCard Error: ${e.message}` });
    }
  },

  // ── 9. .poll <question> | <opt1> | <opt2> | ... ────────────────────────
  async poll(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const body = args.join(' ');
    if (!body.includes('|')) {
      return sock.sendMessage(jid, {
        text: 'Usage: .poll <question> | <Option 1> | <Option 2> | ...\nExample: .poll Who is the best? | Dollar | Ace | Bot'
      });
    }
    const parts = body.split('|').map(p => p.trim());
    const question = parts[0];
    const options = parts.slice(1).filter(o => o.length > 0);

    if (options.length < 2) return sock.sendMessage(jid, { text: '❌ Please provide a question and at least 2 options!' });
    if (options.length > 12) return sock.sendMessage(jid, { text: '❌ Maximum 12 options allowed.' });

    try {
      await sock.sendMessage(jid, {
        poll: {
          name: `📊 *POLL:* ${question}`,
          values: options,
          selectableCount: 1
        }
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Poll Error: ${e.message}` });
    }
  },

  // ── 10. .binary <text> ─────────────────────────────────────────────────
  async binary(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: 'Usage: .binary <text>' });
    const text = args.join(' ');
    const bin = text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    await sock.sendMessage(jid, { text: `*Binary representation:*\n\n\`\`\`${bin}\`\`\`` });
  },

  // ── 11. .morse <text> ──────────────────────────────────────────────────
  async morse(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: 'Usage: .morse <text>' });
    const alphabet = {
      a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....',
      i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.',
      q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-',
      y: '-.--', z: '--..', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....',
      6: '-....', 7: '--...', 8: '---..', 9: '----.', 0: '-----', ' ': '/'
    };
    const text = args.join(' ').toLowerCase();
    const morse = text.split('').map(c => alphabet[c] || '').join(' ');
    await sock.sendMessage(jid, { text: `*Morse Code representation:*\n\n\`\`\`${morse}\`\`\`` });
  },

  // ── 12. .temp <val> <C/F> ──────────────────────────────────────────────
  async temp(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (args.length < 2) return sock.sendMessage(jid, { text: 'Usage: .temp <value> <C or F>\nExample: .temp 37 C' });
    const val = parseFloat(args[0]);
    const unit = args[1].toUpperCase();
    if (isNaN(val)) return sock.sendMessage(jid, { text: '❌ Invalid numeric value.' });

    if (unit === 'C') {
      const f = (val * 9/5) + 32;
      await sock.sendMessage(jid, { text: `🌡️ *Temperature:* ${val}°C = *${f.toFixed(2)}°F*` });
    } else if (unit === 'F') {
      const c = (val - 32) * 5/9;
      await sock.sendMessage(jid, { text: `🌡️ *Temperature:* ${val}°F = *${c.toFixed(2)}°C*` });
    } else {
      await sock.sendMessage(jid, { text: '❌ Use either C for Celsius or F for Fahrenheit.' });
    }
  },

  // ── 13. .currency <amount> <from> <to> ──────────────────────────────────
  async currency(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (args.length < 3) return sock.sendMessage(jid, { text: 'Usage: .currency <amount> <From Currency> <To Currency>\nExample: .currency 100 USD NGN' });
    const amount = parseFloat(args[0]);
    const from = args[1].toUpperCase();
    const to = args[2].toUpperCase();
    if (isNaN(amount)) return sock.sendMessage(jid, { text: '❌ Invalid numeric amount.' });

    await sock.sendMessage(jid, { text: `💱 *Fetching conversion rates for ${from}...*` });
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { timeout: 12000 });
      if (!res.ok) throw new Error('Invalid base currency JID or api issue.');
      const data = await res.json();
      const rate = data.rates[to];
      if (!rate) throw new Error(`Currency code ${to} not found.`);
      const converted = (amount * rate).toLocaleString('en-US', { minimumFractionDigits: 2 });

      await sock.sendMessage(jid, {
        text:
          `💱 *Currency Exchange Rates*\n\n` +
          `💵 *Base Amount:* ${amount} *${from}*\n` +
          `🔄 *Exchange Rate:* 1 ${from} = ${rate.toFixed(4)} ${to}\n\n` +
          `✅ *Converted Amount:* *${converted} ${to}*\n\n` +
          `_Exchange rates are updated daily_`
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Currency Error: ${e.message}` });
    }
  },

  // ── 14. .dareme ───────────────────────────────────────────────────────
  async dareme(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: '_Retrieving an interactive group dare..._' });
    try {
      const response = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'You generate highly engaging, funny, completely safe, and non-offensive dares suitable for group chats. Keep it lively and creative. 1-2 sentences. WhatsApp formatting.'
        },
        { role: 'user', content: 'Generate a fun group dare.' }
      ]);
      await sock.sendMessage(jid, { text: `🎲 *DOLLAR DARE SYSTEM* 🎲\n\n${response}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Dare Error: ${e.message}` });
    }
  },

  // ── 15. .truthme ──────────────────────────────────────────────────────
  async truthme(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: '_Retrieving an interactive truth question..._' });
    try {
      const response = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'You generate interesting, thought-provoking, completely safe, and non-offensive truth questions suitable for group chats. Keep it engaging. 1-2 sentences. WhatsApp formatting.'
        },
        { role: 'user', content: 'Generate a fun group truth question.' }
      ]);
      await sock.sendMessage(jid, { text: `💡 *DOLLAR TRUTH SYSTEM* 💡\n\n${response}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Truth Error: ${e.message}` });
    }
  },

  // ── 16. .factoid ──────────────────────────────────────────────────────
  async factoid(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: '_Sourcing a mind-blowing fact..._' });
    try {
      const response = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'You share absolutely amazing, verified, mind-blowing scientific, historical, or cultural facts. Keep it short (2-3 sentences max). Use *bold* for emphasis. WhatsApp formatting only.'
        },
        { role: 'user', content: 'Give me a mind-blowing fact.' }
      ]);
      await sock.sendMessage(jid, { text: `🧠 *DID YOU KNOW?* 🧠\n\n${response}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Factoid Error: ${e.message}` });
    }
  },

  // ── 17. .gquote ───────────────────────────────────────────────────────
  async gquote(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: '_Sourcing a historical daily quote..._' });
    try {
      const response = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'Share a profound, globally recognized historical quote of wisdom (e.g. from Einstein, Aristotle, Gandhi). Output format: \n_[quote]_\n\n— *[Author]*'
        },
        { role: 'user', content: 'Give me a quote of historical wisdom.' }
      ]);
      await sock.sendMessage(jid, { text: `📜 *QUOTE OF WISDOM* 📜\n\n${response}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Quote Error: ${e.message}` });
    }
  },

  // ── 18. .detect <text> ────────────────────────────────────────────────
  async detect(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: 'Usage: .detect <text>' });
    const text = args.join(' ');
    await sock.sendMessage(jid, { text: '_Analyzing language parameters..._' });
    try {
      const response = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'Analyze the given text, detect its primary language, and output the result along with confidence level (percentage). Output format must be strictly:\n*Detected Language:* [Language Name]\n*Confidence Level:* [Percentage]%\nKeep it brief, no extra explanation.'
        },
        { role: 'user', content: text }
      ]);
      await sock.sendMessage(jid, { text: `🔍 *LANGUAGE DETECTOR* 🔍\n\n${response}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Detector Error: ${e.message}` });
    }
  },

  // ── 19. .summarizeweb <url> ───────────────────────────────────────────
  async summarizeweb(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args[0]) return sock.sendMessage(jid, { text: 'Usage: .summarizeweb <URL>' });
    let url = args[0];
    if (!url.startsWith('http')) url = 'https://' + url;

    await sock.sendMessage(jid, { text: `🌐 *Reading web article:* ${url}...` });
    try {
      // Fetch text contents
      const res = await fetch(url, { timeout: 15000 });
      if (!res.ok) throw new Error('Webpage unreachable or returned error status.');
      const html = await res.text();
      // Simple tag stripper for basic summaries
      const plainText = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
                            .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .slice(0, 1500); // Send first 1500 characters to AI

      await sock.sendMessage(jid, { text: '🧠 *Groq AI is digesting webpage content and summarizing...*' });

      const summary = await pollinations.textGenerate([
        {
          role: 'system',
          content: 'Summarize the provided webpage body text in exactly 4 bullet points. First line must be *Webpage Summary:* in bold. Keep it clear, concise, and clean. WhatsApp formatting only — no headers (#), no tables, no HTML.'
        },
        { role: 'user', content: `Webpage text: ${plainText}` }
      ]);

      await sock.sendMessage(jid, { text: `${summary}\n\n_Source: ${url}_` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `Summary Error: ${e.message}` });
    }
  },

  // ── 20. .fancy <text> ─────────────────────────────────────────────────
  async fancy(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: 'Usage: .fancy <text>\nExample: .fancy dollarbot premium' });
    const text = args.join(' ');

    const bubble = text.split('').map(c => {
      const code = c.toLowerCase().charCodeAt(0);
      if (code >= 97 && code <= 122) return String.fromCodePoint(code + 9327);
      return c;
    }).join('');

    const script = text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(code + 120147);
      if (code >= 97 && code <= 122) return String.fromCodePoint(code + 120141);
      return c;
    }).join('');

    const gothic = text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(code + 120095);
      if (code >= 97 && code <= 122) return String.fromCodePoint(code + 120089);
      return c;
    }).join('');

    await sock.sendMessage(jid, {
      text:
        `✨ *FANCY TEXT ENGINE* ✨\n\n` +
        `📝 *Original:* ${text}\n\n` +
        `⒜ *Bubble Font:* ${bubble}\n` +
        `⒝ *Script Font:* ${script}\n` +
        `⒞ *Gothic Font:* ${gothic}`
    });
  }
};

module.exports = premiumCommands;
