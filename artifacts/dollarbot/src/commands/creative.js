'use strict';

const pollinations = require('../lib/pollinations');

async function aiGen(system, user) {
  return pollinations.textGenerate([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}

function send(sock, jid, msg, text) {
  return sock.sendMessage(jid, { text }, { quoted: msg });
}

function box(title, content, footer = '') {
  return `╭━━━〔 ${title} 〕━━━⬣\n\n${content}\n\n╰━━━━━━━━━━━━━━━━━━⬣${footer ? '\n\n' + footer : ''}`;
}

const creativeCommands = {

  async sonnet(sock, msg, args) {
    const topic = args.join(' ') || 'love and time';
    await send(sock, msg.key.remoteJid, msg, '🎭 _Writing your sonnet..._');
    const r = await aiGen('You are Shakespeare. Write a proper 14-line Shakespearean sonnet (ABAB CDCD EFEF GG rhyme scheme) about the topic. Make it beautiful and authentic. WhatsApp formatting only.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('📜 SONNET', r, '_Written by DollarBot V7_'));
  },

  async limerick(sock, msg, args) {
    const topic = args.join(' ') || 'a funny person';
    await send(sock, msg.key.remoteJid, msg, '😄 _Writing your limerick..._');
    const r = await aiGen('Write a funny, clean 5-line limerick (AABBA rhyme scheme). Make it humorous and creative. WhatsApp formatting only.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('😄 LIMERICK', r));
  },

  async haiku2(sock, msg, args) {
    const topic = args.join(' ') || 'nature and peace';
    await send(sock, msg.key.remoteJid, msg, '🌸 _Crafting your haiku..._');
    const r = await aiGen('Write a beautiful haiku (5-7-5 syllable structure). Include a seasonal reference (kigo). Make it evocative and minimalist. Show the syllable count. WhatsApp formatting only.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🌸 HAIKU', r));
  },

  async acrostic(sock, msg, args) {
    const word = args.join(' ').toUpperCase();
    if (!word) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .acrostic <word>');
    await send(sock, msg.key.remoteJid, msg, '✍️ _Writing your acrostic poem..._');
    const r = await aiGen(`Write an acrostic poem where each line starts with the letter given. Make it meaningful and poetic. WhatsApp formatting only.`, `Word: ${word}`);
    await send(sock, msg.key.remoteJid, msg, box('✍️ ACROSTIC', r));
  },

  async story2(sock, msg, args) {
    const prompt = args.join(' ') || 'a mysterious adventure';
    await send(sock, msg.key.remoteJid, msg, '📖 _Writing your story..._');
    const r = await aiGen('Write a compelling 3-paragraph short story with a clear beginning, middle, and end. Include vivid characters, setting, and a satisfying conclusion. WhatsApp formatting only, use *bold* for character names.', `Premise: ${prompt}`);
    await send(sock, msg.key.remoteJid, msg, box('📖 STORY', r));
  },

  async plothole(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .plothole <describe your story/plot>');
    await send(sock, msg.key.remoteJid, msg, '🔍 _Analyzing your plot..._');
    const r = await aiGen('You are a professional story editor. Identify plot holes, logical inconsistencies, and narrative weaknesses in the story described. Be specific and constructive. WhatsApp formatting, use 🕳️ for each plot hole found.', `Story: ${args.join(' ')}`);
    await send(sock, msg.key.remoteJid, msg, box('🕳️ PLOT HOLES', r));
  },

  async characterbio(sock, msg, args) {
    const name = args.join(' ') || 'a mysterious stranger';
    await send(sock, msg.key.remoteJid, msg, '👤 _Creating character bio..._');
    const r = await aiGen('Create a detailed character biography. Include: Full Name, Age, Backstory, Personality Traits, Strengths, Weaknesses, Secret, Goal, and a signature phrase. Make it compelling. WhatsApp formatting, *bold* section headers.', `Character: ${name}`);
    await send(sock, msg.key.remoteJid, msg, box('👤 CHARACTER BIO', r));
  },

  async worldbuild(sock, msg, args) {
    const setting = args.join(' ') || 'a futuristic dystopia';
    await send(sock, msg.key.remoteJid, msg, '🌍 _Building your world..._');
    const r = await aiGen('Create detailed world-building notes. Include: Geography, Government/Politics, Culture/Society, Technology/Magic, Economy, Unique Features, History summary, and current conflicts. Make it rich and immersive. WhatsApp formatting, *bold* headers.', `Setting: ${setting}`);
    await send(sock, msg.key.remoteJid, msg, box('🌍 WORLD BUILDING', r));
  },

  async dialogue(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .dialogue <Character1> vs <Character2>: <situation>');
    await send(sock, msg.key.remoteJid, msg, '💬 _Writing dialogue..._');
    const r = await aiGen('Write a realistic, engaging dialogue between two characters. Show their distinct voices and personalities through how they speak. 8-12 exchanges. WhatsApp formatting, *bold* character names.', args.join(' '));
    await send(sock, msg.key.remoteJid, msg, box('💬 DIALOGUE', r));
  },

  async tagline(sock, msg, args) {
    const brand = args.join(' ') || 'DollarBot';
    await send(sock, msg.key.remoteJid, msg, '💡 _Generating taglines..._');
    const r = await aiGen('Generate 5 powerful, memorable taglines for the brand/product. Make them punchy, unique, and memorable. Number them and explain each briefly. WhatsApp formatting.', `Brand/Product: ${brand}`);
    await send(sock, msg.key.remoteJid, msg, box('💡 TAGLINES', r));
  },

  async slogan(sock, msg, args) {
    const cause = args.join(' ') || 'peace and unity';
    await send(sock, msg.key.remoteJid, msg, '📢 _Creating slogans..._');
    const r = await aiGen('Create 3 powerful, rallying slogans for the cause or campaign. Make them memorable, inspiring, and easy to chant. WhatsApp formatting.', `Cause: ${cause}`);
    await send(sock, msg.key.remoteJid, msg, box('📢 SLOGANS', r));
  },

  async jingle(sock, msg, args) {
    const product = args.join(' ') || 'DollarBot';
    await send(sock, msg.key.remoteJid, msg, '🎵 _Writing your jingle..._');
    const r = await aiGen('Write a fun, catchy advertising jingle for the product. Should be 4-8 lines, rhyming, and memorable. Include suggested melody type. WhatsApp formatting.', `Product: ${product}`);
    await send(sock, msg.key.remoteJid, msg, box('🎵 JINGLE', r));
  },

  async breakup(sock, msg, args) {
    const situation = args.join(' ') || 'we grew apart';
    await send(sock, msg.key.remoteJid, msg, '💔 _Writing breakup message..._');
    const r = await aiGen('Write a mature, respectful, heartfelt breakup message. Be honest but kind. Show empathy and avoid blame. Keep it under 200 words. WhatsApp formatting.', `Reason: ${situation}`);
    await send(sock, msg.key.remoteJid, msg, box('💔 BREAKUP MESSAGE', r, '_Handle with care ❤️_'));
  },

  async apology(sock, msg, args) {
    const situation = args.join(' ') || 'I made a mistake';
    await send(sock, msg.key.remoteJid, msg, '🙏 _Writing apology..._');
    const r = await aiGen('Write a sincere, thoughtful apology message. Acknowledge the mistake, show understanding of its impact, commit to change. Keep it genuine, not over-dramatic. WhatsApp formatting.', `Situation: ${situation}`);
    await send(sock, msg.key.remoteJid, msg, box('🙏 APOLOGY', r));
  },

  async lovemsg(sock, msg, args) {
    const to = args.join(' ') || 'my special someone';
    await send(sock, msg.key.remoteJid, msg, '💕 _Writing love message..._');
    const r = await aiGen('Write a heartfelt, genuine, romantic love message. Make it personal, poetic, and emotionally moving without being cheesy. 3-4 paragraphs. WhatsApp formatting.', `To: ${to}`);
    await send(sock, msg.key.remoteJid, msg, box('💕 LOVE MESSAGE', r));
  },

  async email2(sock, msg, args) {
    const purpose = args.join(' ') || 'requesting a meeting';
    await send(sock, msg.key.remoteJid, msg, '📧 _Writing professional email..._');
    const r = await aiGen('Write a professional email template. Include: Subject line, Greeting, Body (clear and concise), Call to action, Professional closing. Use *bold* for Subject. WhatsApp formatting.', `Purpose: ${purpose}`);
    await send(sock, msg.key.remoteJid, msg, box('📧 EMAIL TEMPLATE', r));
  },

  async pitch(sock, msg, args) {
    const idea = args.join(' ') || 'a revolutionary app';
    await send(sock, msg.key.remoteJid, msg, '🎤 _Writing elevator pitch..._');
    const r = await aiGen('Write a compelling 30-second elevator pitch. Include: Hook, Problem, Solution, Unique Value Prop, Call to Action. Should be natural when spoken aloud. WhatsApp formatting, *bold* sections.', `Idea: ${idea}`);
    await send(sock, msg.key.remoteJid, msg, box('🎤 ELEVATOR PITCH', r));
  },

  async thread(sock, msg, args) {
    const topic = args.join(' ') || 'productivity tips';
    await send(sock, msg.key.remoteJid, msg, '🧵 _Creating Twitter thread..._');
    const r = await aiGen('Write a compelling Twitter/X thread on the topic. Number each tweet (1/N). Each tweet under 280 chars. Hook in tweet 1, valuable info in middle, strong CTA at end. 5-8 tweets total. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🧵 TWITTER THREAD', r));
  },

  async manifesto(sock, msg, args) {
    const theme = args.join(' ') || 'living with purpose';
    await send(sock, msg.key.remoteJid, msg, '📜 _Writing manifesto..._');
    const r = await aiGen('Write a powerful personal manifesto. Include: Core beliefs, Values, Commitments, and a rallying statement. Make it inspiring and personal. WhatsApp formatting, *bold* key principles.', `Theme: ${theme}`);
    await send(sock, msg.key.remoteJid, msg, box('📜 MANIFESTO', r));
  },

  async lyrics2(sock, msg, args) {
    const theme = args.join(' ') || 'hustle and success';
    await send(sock, msg.key.remoteJid, msg, '🎤 _Writing original lyrics..._');
    const r = await aiGen('Write original song lyrics with verse 1, chorus, verse 2, bridge, and final chorus. Include rhyming and rhythm. Specify genre vibe in brackets. WhatsApp formatting.', `Theme: ${theme}`);
    await send(sock, msg.key.remoteJid, msg, box('🎤 ORIGINAL LYRICS', r));
  },

  async speech(sock, msg, args) {
    const topic = args.join(' ') || 'never giving up';
    await send(sock, msg.key.remoteJid, msg, '🎙️ _Writing your speech..._');
    const r = await aiGen('Write a short but powerful motivational speech (300-400 words). Include: Strong opening hook, 3 key points with stories/examples, and a memorable closing. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🎙️ SPEECH', r));
  },

  async toast(sock, msg, args) {
    const occasion = args.join(' ') || 'a wedding';
    await send(sock, msg.key.remoteJid, msg, '🥂 _Writing your toast..._');
    const r = await aiGen('Write a heartfelt, memorable toast speech (100-150 words). Include a warm anecdote, a sincere compliment, and a touching closing raise. WhatsApp formatting.', `Occasion: ${occasion}`);
    await send(sock, msg.key.remoteJid, msg, box('🥂 TOAST', r));
  },

  async eulogy(sock, msg, args) {
    const person = args.join(' ') || 'a beloved person';
    await send(sock, msg.key.remoteJid, msg, '🕊️ _Writing eulogy..._');
    const r = await aiGen('Write a tender, respectful eulogy that celebrates a life. Include: Remembering their spirit, impact on others, a meaningful quote, and a message of comfort. WhatsApp formatting.', `For: ${person}`);
    await send(sock, msg.key.remoteJid, msg, box('🕊️ EULOGY', r, '_In loving memory_'));
  },

  async weddingvow(sock, msg, args) {
    const style = args.join(' ') || 'sincere and touching';
    await send(sock, msg.key.remoteJid, msg, '💍 _Writing wedding vow..._');
    const r = await aiGen(`Write ${style} wedding vows (from one person to their partner). Include promises, commitment, and a memorable closing line. Keep it personal and genuine. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg, box('💍 WEDDING VOW', r));
  },

  async headline(sock, msg, args) {
    const story = args.join(' ') || 'something interesting happened';
    await send(sock, msg.key.remoteJid, msg, '📰 _Writing headlines..._');
    const r = await aiGen('Generate 5 different news headline styles for this story: 1) Breaking news style, 2) Feature story style, 3) Clickbait style (labeled), 4) Academic style, 5) Tabloid style. WhatsApp formatting.', `Story: ${story}`);
    await send(sock, msg.key.remoteJid, msg, box('📰 HEADLINES', r));
  },

  async blurb(sock, msg, args) {
    const book = args.join(' ') || 'a mystery thriller';
    await send(sock, msg.key.remoteJid, msg, '📚 _Writing book blurb..._');
    const r = await aiGen('Write a compelling back-cover book blurb (100-150 words). Include: Setting the scene, introducing the protagonist, teasing the central conflict, and ending with a hook question. WhatsApp formatting.', `Book concept: ${book}`);
    await send(sock, msg.key.remoteJid, msg, box('📚 BOOK BLURB', r));
  },

  async bio2(sock, msg, args) {
    const person = args.join(' ') || 'a creative professional';
    await send(sock, msg.key.remoteJid, msg, '✍️ _Writing professional bio..._');
    const r = await aiGen('Write a professional bio in three versions: 1) Short (50 words), 2) Medium (100 words), 3) Full (200 words). Make it compelling and personal. WhatsApp formatting, *bold* version labels.', `For: ${person}`);
    await send(sock, msg.key.remoteJid, msg, box('✍️ PROFESSIONAL BIO', r));
  },

  async resume2(sock, msg, args) {
    const role = args.join(' ') || 'marketing professional';
    await send(sock, msg.key.remoteJid, msg, '📄 _Generating resume tips..._');
    const r = await aiGen('Provide a professional resume template with key sections and tips for this role. Include: Summary, Skills, Experience format, Education, and 3 pro tips for this specific field. WhatsApp formatting.', `Role: ${role}`);
    await send(sock, msg.key.remoteJid, msg, box('📄 RESUME GUIDE', r));
  },

  async coverlettertpl(sock, msg, args) {
    const role = args.join(' ') || 'software engineer';
    await send(sock, msg.key.remoteJid, msg, '📋 _Writing cover letter..._');
    const r = await aiGen('Write a professional cover letter template for this role. Include: Strong opening, 2-3 key value propositions, company enthusiasm, and a compelling close with CTA. WhatsApp formatting.', `Role: ${role}`);
    await send(sock, msg.key.remoteJid, msg, box('📋 COVER LETTER', r));
  },

  async interviewq(sock, msg, args) {
    const role = args.join(' ') || 'software engineer';
    await send(sock, msg.key.remoteJid, msg, '🎯 _Generating interview questions..._');
    const r = await aiGen('Generate 10 commonly asked interview questions for this role with brief tips on how to answer each. Include both technical and behavioral questions. WhatsApp formatting, number each question.', `Role: ${role}`);
    await send(sock, msg.key.remoteJid, msg, box('🎯 INTERVIEW QUESTIONS', r));
  },

  async pressrelease(sock, msg, args) {
    const news = args.join(' ') || 'a major product launch';
    await send(sock, msg.key.remoteJid, msg, '📢 _Writing press release..._');
    const r = await aiGen('Write a professional press release. Include: Headline, Dateline, Strong opening paragraph (who/what/when/where/why), 2 body paragraphs, a quote from a spokesperson, and boilerplate. WhatsApp formatting.', `News: ${news}`);
    await send(sock, msg.key.remoteJid, msg, box('📢 PRESS RELEASE', r));
  },

  async productdesc(sock, msg, args) {
    const product = args.join(' ') || 'DollarBot Premium';
    await send(sock, msg.key.remoteJid, msg, '🛍️ _Writing product description..._');
    const r = await aiGen('Write a compelling product description with: Headline, Key benefits (not features), Social proof hint, Urgency element, and CTA. Make it persuasive and clear. WhatsApp formatting.', `Product: ${product}`);
    await send(sock, msg.key.remoteJid, msg, box('🛍️ PRODUCT DESCRIPTION', r));
  },
};

module.exports = creativeCommands;
