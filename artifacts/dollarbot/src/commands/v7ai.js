'use strict';

const pollinations = require('../lib/pollinations');
const memory = require('../lib/memory');

// ── V7 AI Persona Commands ─────────────────────────────────────────────────

const v7aiCommands = {

  // ── Brie: Warm, creative storytelling AI ────────────────────────────────
  async brie(sock, msg, args, jid) {
    if (!args.length) {
      return msg.reply(
        `╭━━━〔 ✨ BRIE AI 〕━━━⬣\n` +
        `┃ Usage: .brie <your message>\n` +
        `┃\n` +
        `┃ Your warm, creative storytelling AI.\n` +
        `┃ ✨ Creative writing & storytelling\n` +
        `┃ 🌸 Hype & encouragement\n` +
        `┃ 🎨 Brainstorming & ideas\n` +
        `┃ 💫 She remembers your chats!\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `Example: .brie write me a story about a lost star`
      );
    }
    await msg.reply('_✨ Brie is crafting something magical..._');
    try {
      const response = await pollinations.brie(jid, args.join(' '));
      await msg.reply(`╭━━━〔 ✨ BRIE AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n✨ _Powered by Brie AI_`);
    } catch (e) { await msg.reply(`Brie Error: ${e.message}`); }
  },

  // ── Jarvis: Technical, precise, efficient AI ─────────────────────────────
  async jarvis(sock, msg, args, jid) {
    if (!args.length) {
      return msg.reply(
        `╭━━━〔 🤖 JARVIS AI 〕━━━⬣\n` +
        `┃ Usage: .jarvis <your query>\n` +
        `┃\n` +
        `┃ Highly intelligent technical AI.\n` +
        `┃ 🔧 Technical analysis & solutions\n` +
        `┃ 📊 Precise, efficient answers\n` +
        `┃ 🧠 Strategic thinking & planning\n` +
        `┃ ⚡ Memory enabled.\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `Example: .jarvis analyze this situation for me`
      );
    }
    await msg.reply('_🤖 Jarvis is processing your request..._');
    try {
      const response = await pollinations.jarvis(jid, args.join(' '));
      await msg.reply(`╭━━━〔 🤖 JARVIS AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n🤖 _Powered by Jarvis AI_`);
    } catch (e) { await msg.reply(`Jarvis Error: ${e.message}`); }
  },

  // ── Alan: Philosophical, deep analytical thinker ─────────────────────────
  async alan(sock, msg, args, jid) {
    if (!args.length) {
      return msg.reply(
        `╭━━━〔 🧿 ALAN AI 〕━━━⬣\n` +
        `┃ Usage: .alan <your question>\n` +
        `┃\n` +
        `┃ Deep philosophical thinker AI.\n` +
        `┃ 🔍 Root cause analysis\n` +
        `┃ ⚖️ Multiple perspectives\n` +
        `┃ 💭 Thought experiments\n` +
        `┃ 📚 Memory enabled.\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `Example: .alan what is the nature of consciousness?`
      );
    }
    await msg.reply('_🧿 Alan is contemplating the depths..._');
    try {
      const response = await pollinations.alan(jid, args.join(' '));
      await msg.reply(`╭━━━〔 🧿 ALAN AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n🧿 _Powered by Alan AI_`);
    } catch (e) { await msg.reply(`Alan Error: ${e.message}`); }
  },

  // ── Kerrick: Street-smart motivational coach ─────────────────────────────
  async kerrick(sock, msg, args, jid) {
    if (!args.length) {
      return msg.reply(
        `╭━━━〔 🔥 KERRICK AI 〕━━━⬣\n` +
        `┃ Usage: .kerrick <your situation>\n` +
        `┃\n` +
        `┃ Street-smart motivational coach.\n` +
        `┃ 💪 Raw, real, no sugarcoating\n` +
        `┃ 🏆 Hustle & grind mentality\n` +
        `┃ 🎯 Straight talk, real solutions\n` +
        `┃ 🔥 Memory enabled.\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `Example: .kerrick I keep procrastinating on my goals`
      );
    }
    await msg.reply('_🔥 Kerrick is keeping it real..._');
    try {
      const response = await pollinations.kerrick(jid, args.join(' '));
      await msg.reply(`╭━━━〔 🔥 KERRICK AI 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n🔥 _Powered by Kerrick AI_`);
    } catch (e) { await msg.reply(`Kerrick Error: ${e.message}`); }
  },

  // ── Beejay Aura: Mystical spiritual energy reader ────────────────────────
  async beejay(sock, msg, args, jid) {
    if (!args.length) {
      return msg.reply(
        `╭━━━〔 🔮 BEEJAY AURA 〕━━━⬣\n` +
        `┃ Usage: .beejay <your message>\n` +
        `┃\n` +
        `┃ Mystical spiritual energy reader.\n` +
        `┃ 🌙 Aura & energy readings\n` +
        `┃ ⭐ Cosmic insights & guidance\n` +
        `┃ 🪐 Spiritual wisdom & truth\n` +
        `┃ 🔮 Memory enabled.\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `Example: .beejay read my energy today`
      );
    }
    await msg.reply('_🔮 Beejay Aura is reading the cosmos..._');
    try {
      const response = await pollinations.beejay(jid, args.join(' '));
      await msg.reply(`╭━━━〔 🔮 BEEJAY AURA 〕━━━⬣\n\n${response}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n🔮 _Powered by Beejay Aura_`);
    } catch (e) { await msg.reply(`Beejay Error: ${e.message}`); }
  },

  // ── V7 Extra AI commands ──────────────────────────────────────────────────

  async vibe(sock, msg, args, jid) {
    await msg.reply('_🎯 Checking your vibe..._');
    const name = args.join(' ') || 'you';
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a vibe analyst. Give a fun, insightful, creative vibe check for whoever is mentioned. Use WhatsApp markdown: *bold* for vibe label, emojis throughout. Be specific and entertaining. 3-5 sentences max.' },
        { role: 'user', content: `Vibe check for: ${name}` },
      ]);
      await msg.reply(`╭━━━〔 🎯 VIBE CHECK 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async catchphrase(sock, msg, args, jid) {
    const name = args.join(' ') || 'you';
    await msg.reply('_🎤 Generating your catchphrase..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Generate one epic, memorable, unique catchphrase for the person mentioned. Make it punchy, quotable, and fitting their name or vibe. Just the catchphrase in *bold*, then a short explanation. WhatsApp markdown only.' },
        { role: 'user', content: `Create a catchphrase for: ${name}` },
      ]);
      await msg.reply(`╭━━━〔 🎤 CATCHPHRASE 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async plottwist(sock, msg, args, jid) {
    const scenario = args.join(' ') || 'life';
    await msg.reply('_🎭 Plot twist incoming..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a master storyteller. Generate one shocking, unexpected, creative plot twist for the scenario given. Make it dramatic, surprising, and entertaining. Use *bold* for the twist reveal. WhatsApp markdown only.' },
        { role: 'user', content: `Plot twist for: ${scenario}` },
      ]);
      await msg.reply(`╭━━━〔 🎭 PLOT TWIST 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async excuses(sock, msg, args, jid) {
    const situation = args.join(' ') || 'being late';
    await msg.reply('_😅 Generating excuses..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are an excuse generator. Create 3 creative, funny, and somewhat believable excuses for the situation. Number them. Use *bold* for each excuse header. WhatsApp markdown only, keep it entertaining.' },
        { role: 'user', content: `Generate excuses for: ${situation}` },
      ]);
      await msg.reply(`╭━━━〔 😅 EXCUSE MACHINE 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async redflags(sock, msg, args, jid) {
    const person = args.join(' ') || 'someone';
    await msg.reply('_🚩 Scanning for red flags..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a relationship analyst. Based on the description, identify 3-5 red flags. Use 🚩 for each flag. *Bold* the flag name. Give a short explanation. Be honest but not mean. WhatsApp markdown only.' },
        { role: 'user', content: `Analyze red flags for: ${person}` },
      ]);
      await msg.reply(`╭━━━〔 🚩 RED FLAGS 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async greenflags(sock, msg, args, jid) {
    const person = args.join(' ') || 'someone';
    await msg.reply('_✅ Scanning for green flags..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a relationship analyst. Based on the description, identify 3-5 green flags (positive traits). Use ✅ for each flag. *Bold* the flag name. Be genuine and uplifting. WhatsApp markdown only.' },
        { role: 'user', content: `Green flags for: ${person}` },
      ]);
      await msg.reply(`╭━━━〔 ✅ GREEN FLAGS 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async predict(sock, msg, args, jid) {
    const subject = args.join(' ') || 'my future';
    await msg.reply('_🔮 Consulting the oracle..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a mystical AI oracle. Make a fun, creative, specific prediction about the subject. Mix humor with unexpected insight. 3-4 sentences. Use *bold* for the key prediction. WhatsApp markdown only.' },
        { role: 'user', content: `Predict: ${subject}` },
      ]);
      await msg.reply(`╭━━━〔 🔮 ORACLE 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async gm(sock, msg, args, jid) {
    const name = args.join(' ') || '';
    await msg.reply('_🌅 Writing your morning message..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Write a warm, genuine, uplifting good morning message. Include a motivational thought for the day. 3-4 sentences. Use *bold* for the main message. End with a sunrise emoji. WhatsApp markdown only.' },
        { role: 'user', content: `Good morning message${name ? ` for ${name}` : ''}` },
      ]);
      await msg.reply(`╭━━━〔 🌅 GOOD MORNING 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_Made with ☀️ by DollarBot V-Ultra_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async gn(sock, msg, args, jid) {
    const name = args.join(' ') || '';
    await msg.reply('_🌙 Writing your night message..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Write a warm, peaceful, comforting good night message. Include a reflection on the day. 3-4 sentences. Use *bold* for the main message. End with a moon emoji. WhatsApp markdown only.' },
        { role: 'user', content: `Good night message${name ? ` for ${name}` : ''}` },
      ]);
      await msg.reply(`╭━━━〔 🌙 GOOD NIGHT 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_Made with 💤 by DollarBot V-Ultra_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async worstcase(sock, msg, args, jid) {
    const scenario = args.join(' ') || 'this situation';
    await msg.reply('_😱 Calculating worst case..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a hilarious catastrophizer. Give the most dramatically over-the-top worst case scenario for the situation. Be funny and absurd. 3-4 sentences. Use *bold* for the worst outcome. WhatsApp markdown only.' },
        { role: 'user', content: `Worst case scenario for: ${scenario}` },
      ]);
      await msg.reply(`╭━━━〔 😱 WORST CASE 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async bestcase(sock, msg, args, jid) {
    const scenario = args.join(' ') || 'this situation';
    await msg.reply('_🌟 Calculating best case..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Give the most wonderfully optimistic best case scenario for the situation. Be uplifting and creative. 3-4 sentences. Use *bold* for the best outcome. WhatsApp markdown only.' },
        { role: 'user', content: `Best case scenario for: ${scenario}` },
      ]);
      await msg.reply(`╭━━━〔 🌟 BEST CASE 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async expose(sock, msg, args, jid) {
    const name = args.join(' ') || 'someone';
    await msg.reply('_👀 Preparing the exposure..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a comedic exposé writer. Write a funny, harmless, over-the-top "expose" about the person (all fictional and clearly for laughs). Include 2-3 ridiculous "revelations". *Bold* each revelation. WhatsApp markdown only. Keep it clearly comedy.' },
        { role: 'user', content: `Expose: ${name}` },
      ]);
      await msg.reply(`╭━━━〔 👀 EXPOSED 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_⚠️ Comedy only — not real facts_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async hater(sock, msg, args, jid) {
    const target = args.join(' ') || 'you';
    await msg.reply('_😤 Summoning the haters..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Write a hilariously over-dramatic "hater comment" about the subject. Make it clearly comedic and absurd — like what a jealous person would say. Keep it funny and harmless, not actually mean. Use *bold* for the punchline. WhatsApp markdown only.' },
        { role: 'user', content: `Write a hater comment about: ${target}` },
      ]);
      await msg.reply(`╭━━━〔 😤 HATER COMMENT 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_😂 Comedy only_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async fanboy(sock, msg, args, jid) {
    const target = args.join(' ') || 'you';
    await msg.reply('_😍 Summoning the fanboys..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Write a hilariously over-the-top "fanboy/fangirl" message about the subject. Make it obsessively positive and dramatic. 3-4 sentences with excessive praise. Use *bold* for the most dramatic compliment. WhatsApp markdown only.' },
        { role: 'user', content: `Write a fanboy comment about: ${target}` },
      ]);
      await msg.reply(`╭━━━〔 😍 FANBOY MODE 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async cancelreason(sock, msg, args, jid) {
    const name = args.join(' ') || 'you';
    await msg.reply('_📵 Calculating your cancel reason..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Generate a funny, absurd reason why this person would get "cancelled" on social media. Make it clearly ridiculous and comedic. Include the fake "hot take" and "Twitter reaction". Use *bold* for the main accusation. WhatsApp markdown only.' },
        { role: 'user', content: `Why would ${name} get cancelled?` },
      ]);
      await msg.reply(`╭━━━〔 📵 CANCEL REASON 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_😂 Satire only_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async debate2(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .debate2 <topic>\nExample: .debate2 pineapple on pizza');
    await msg.reply('_⚔️ Staging the ultimate debate..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a debate moderator. Present BOTH sides of the argument for the topic. *PRO:* side first with 2-3 strong points, then *CON:* side with 2-3 strong counter-points. Then give a verdict. WhatsApp markdown only, no tables.' },
        { role: 'user', content: `Debate: ${args.join(' ')}` },
      ]);
      await msg.reply(`╭━━━〔 ⚔️ DEBATE 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async review(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .review <product/thing>\nExample: .review iPhone 16');
    await msg.reply('_⭐ Writing the review..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Write a detailed, entertaining, honest fake review for the product/thing. Include: Rating (X/10), Pros, Cons, Verdict. Use *bold* for headers. Be funny but informative. WhatsApp markdown only, no tables.' },
        { role: 'user', content: `Review: ${args.join(' ')}` },
      ]);
      await msg.reply(`╭━━━〔 ⭐ REVIEW 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_By DollarBot V-Ultra Critics_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async contract(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .contract <what the contract is for>\nExample: .contract not texting my ex');
    await msg.reply('_📜 Drafting the contract..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Write a funny, dramatic "official contract" for the request. Include: Party A, Party B (fill with names/roles), Terms & Conditions (3-5 funny ones), Penalties for breaking it, Signature line. Use *bold* for headers. WhatsApp markdown only.' },
        { role: 'user', content: `Contract for: ${args.join(' ')}` },
      ]);
      await msg.reply(`╭━━━〔 📜 CONTRACT 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_⚖️ DollarBot Legal Dept V-Ultra_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async roastai(sock, msg, args, jid) {
    if (!args.length) return msg.reply('Usage: .roastai <name or topic>\nExample: .roastai my sleep schedule');
    await msg.reply('_🔥 Firing up the roaster..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are an elite AI roaster. Deliver a devastating but hilarious roast. Be creative, use wordplay, build up to a killer punchline. 4-5 sentences. Use *bold* for the punchline. WhatsApp markdown only. Keep it clearly comedy — no slurs or genuinely harmful content.' },
        { role: 'user', content: `Roast: ${args.join(' ')}` },
      ]);
      await msg.reply(`╭━━━〔 🔥 AI ROAST 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_🎭 Comedy only_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async complimentwar(sock, msg, args, jid) {
    const names = args.join(' ').split(' vs ') || ['person1', 'person2'];
    const p1 = names[0] || 'Person 1';
    const p2 = names[1] || 'Person 2';
    await msg.reply(`_💕 ${p1} vs ${p2} compliment war starting..._`);
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Create a fun "compliment war" between two people. Give each person 2 amazing compliments, then declare a winner based on who had the better compliments. Use *bold* for names and winner. WhatsApp markdown only.' },
        { role: 'user', content: `Compliment war: ${p1} vs ${p2}` },
      ]);
      await msg.reply(`╭━━━〔 💕 COMPLIMENT WAR 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async dailychallenge(sock, msg, args, jid) {
    await msg.reply('_🎯 Generating today\'s challenge..._');
    try {
      const categories = ['fitness', 'social', 'mental', 'creative', 'productivity', 'kindness', 'mindfulness'];
      const cat = args[0] || categories[Math.floor(Math.random() * categories.length)];
      const r = await pollinations.textGenerate([
        { role: 'system', content: `Generate one specific, achievable daily challenge for the ${cat} category. Make it motivating and clear. Include: the challenge itself, why it matters, and a tip to succeed. Use *bold* for the challenge. WhatsApp markdown only.` },
        { role: 'user', content: `Daily ${cat} challenge` },
      ]);
      await msg.reply(`╭━━━〔 🎯 DAILY CHALLENGE 〕━━━⬣\n\n*Category:* ${cat.toUpperCase()}\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣\n\n_You got this! 💪_`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async rizzwar(sock, msg, args, jid) {
    const names = args.join(' ').split(' vs ') || ['person1', 'person2'];
    const p1 = names[0] || 'Person 1';
    const p2 = names[1] || 'Person 2';
    await msg.reply(`_💅 ${p1} vs ${p2} rizz battle starting..._`);
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'Judge a rizz battle between two people. Give each person their best pickup line based on their name/vibe, score their rizz out of 10, then declare the winner. Be funny and entertaining. Use *bold* for names. WhatsApp markdown only.' },
        { role: 'user', content: `Rizz battle: ${p1} vs ${p2}` },
      ]);
      await msg.reply(`╭━━━〔 💅 RIZZ BATTLE 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async situation(sock, msg, args, jid) {
    const scenario = args.join(' ') || 'general situation';
    await msg.reply('_💬 Analyzing the situationship..._');
    try {
      const r = await pollinations.textGenerate([
        { role: 'system', content: 'You are a relationship therapist. Analyze the situationship described. Give: what it is, what it means, red flags (if any), and what to do next. Be honest but supportive. Use *bold* for each section header. WhatsApp markdown only.' },
        { role: 'user', content: `Situationship analysis: ${scenario}` },
      ]);
      await msg.reply(`╭━━━〔 💬 SITUATIONSHIP 〕━━━⬣\n\n${r}\n\n╰━━━━━━━━━━━━━━━━━━⬣`);
    } catch (e) { await msg.reply(`Error: ${e.message}`); }
  },

  async clearv7(sock, msg, args, jid) {
    const persona = args[0]?.toLowerCase();
    const v7personas = ['brie', 'jarvis', 'alan', 'kerrick', 'beejay'];
    if (persona && !v7personas.includes(persona)) {
      return msg.reply(`Usage: .clearv7 [${v7personas.join('/')}]\nOmit to clear all V-Ultra AI memory.`);
    }
    if (persona) {
      memory.clearHistory(jid, persona);
      await msg.reply(`🧹 Memory cleared for *${persona}*. Fresh start!`);
    } else {
      for (const p of v7personas) memory.clearHistory(jid, p);
      await msg.reply(`🧹 Memory cleared for all V-Ultra AIs (Brie, Jarvis, Alan, Kerrick, Beejay). Fresh start!`);
    }
  },
};

module.exports = v7aiCommands;
