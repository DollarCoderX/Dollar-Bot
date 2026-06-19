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

const knowledgeCommands = {

  async science(sock, msg, args) {
    const topic = args.join(' ') || 'something mind-blowing';
    await send(sock, msg.key.remoteJid, msg, '🔬 _Fetching science fact..._');
    const r = await aiGen('You are a science communicator. Share a fascinating, accurate science fact about this topic. Include: the fact, the science behind it, a real-world application, and a related surprising detail. WhatsApp formatting, use 🔬 emoji.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🔬 SCIENCE FACT', r));
  },

  async biology(sock, msg, args) {
    const topic = args.join(' ') || 'the human body';
    await send(sock, msg.key.remoteJid, msg, '🧬 _Fetching biology fact..._');
    const r = await aiGen('You are a biology professor. Explain a fascinating biology fact about this topic. Include: what it is, how it works, why it matters, and a surprising implication. Use accurate scientific info. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🧬 BIOLOGY FACT', r));
  },

  async chemistry(sock, msg, args) {
    const topic = args.join(' ') || 'everyday chemical reactions';
    await send(sock, msg.key.remoteJid, msg, '⚗️ _Fetching chemistry fact..._');
    const r = await aiGen('You are a chemistry professor. Share a fascinating chemistry fact about this topic. Include: the concept, real-world example, the chemistry behind it, and a safety note if relevant. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('⚗️ CHEMISTRY FACT', r));
  },

  async physics2(sock, msg, args) {
    const concept = args.join(' ') || 'something from quantum physics';
    await send(sock, msg.key.remoteJid, msg, '⚛️ _Explaining physics concept..._');
    const r = await aiGen('You are a physics professor. Explain this physics concept in a clear, engaging way. Include: Simple definition, analogy to understand it, mathematical insight (simplified), and a real-world application. WhatsApp formatting.', `Concept: ${concept}`);
    await send(sock, msg.key.remoteJid, msg, box('⚛️ PHYSICS', r));
  },

  async math3(sock, msg, args) {
    const concept = args.join(' ') || 'something beautiful in mathematics';
    await send(sock, msg.key.remoteJid, msg, '📐 _Explaining math concept..._');
    const r = await aiGen('You are a mathematician. Explain this mathematical concept clearly. Include: What it is, why it is interesting/beautiful, a simple example, and a surprising real-world use. WhatsApp formatting.', `Concept: ${concept}`);
    await send(sock, msg.key.remoteJid, msg, box('📐 MATHEMATICS', r));
  },

  async history3(sock, msg, args) {
    const topic = args.join(' ') || 'an interesting historical event';
    await send(sock, msg.key.remoteJid, msg, '📜 _Digging through history..._');
    const r = await aiGen('You are a history professor. Share a fascinating historical fact or story about this topic. Include: Context, key players, what happened, why it matters today, and a little-known detail. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('📜 HISTORY', r));
  },

  async geography(sock, msg, args) {
    const topic = args.join(' ') || 'a fascinating place on Earth';
    await send(sock, msg.key.remoteJid, msg, '🗺️ _Exploring geography..._');
    const r = await aiGen('You are a geographer. Share fascinating geographic facts about this topic. Include: Location/description, unique physical features, climate, human geography, and a surprising fact. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🗺️ GEOGRAPHY', r));
  },

  async economics(sock, msg, args) {
    const concept = args.join(' ') || 'supply and demand';
    await send(sock, msg.key.remoteJid, msg, '📊 _Explaining economics..._');
    const r = await aiGen('You are an economics professor. Explain this economic concept clearly. Include: Simple definition, real-world example, who it affects and how, and a historical example. No jargon unless explained. WhatsApp formatting.', `Concept: ${concept}`);
    await send(sock, msg.key.remoteJid, msg, box('📊 ECONOMICS', r));
  },

  async philosophy2(sock, msg, args) {
    const concept = args.join(' ') || 'the meaning of life';
    await send(sock, msg.key.remoteJid, msg, '🤔 _Pondering philosophy..._');
    const r = await aiGen('You are a philosophy professor. Explore this philosophical concept or question. Include: Different schools of thought, key thinkers, modern relevance, and a thought experiment to consider. WhatsApp formatting.', `Concept: ${concept}`);
    await send(sock, msg.key.remoteJid, msg, box('🤔 PHILOSOPHY', r));
  },

  async lawfact(sock, msg, args) {
    const topic = args.join(' ') || 'an interesting law or legal concept';
    await send(sock, msg.key.remoteJid, msg, '⚖️ _Looking up legal facts..._');
    const r = await aiGen('You are a legal educator (not giving legal advice). Share a fascinating legal fact or concept. Include: What it is, its origin, how it is applied today, and a surprising case or implication. WhatsApp formatting. Add disclaimer.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('⚖️ LEGAL FACT', r, '_Educational only — not legal advice_'));
  },

  async techfact(sock, msg, args) {
    const topic = args.join(' ') || 'something revolutionary in technology';
    await send(sock, msg.key.remoteJid, msg, '💻 _Fetching tech fact..._');
    const r = await aiGen('You are a technology journalist. Share a fascinating tech fact or trend about this topic. Include: What it is, how it works (simply), current state, impact on society, and future implications. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('💻 TECH FACT', r));
  },

  async medicine(sock, msg, args) {
    const topic = args.join(' ') || 'an interesting medical fact';
    await send(sock, msg.key.remoteJid, msg, '🏥 _Fetching medical fact..._');
    const r = await aiGen('You are a medical educator (not giving medical advice). Share a fascinating medical fact about this topic. Include: The discovery or fact, the science behind it, impact on medicine, and a surprising implication. Always add disclaimer. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🏥 MEDICAL FACT', r, '_Educational only — always consult a doctor_'));
  },

  async nutritionfact(sock, msg, args) {
    const food = args.join(' ') || 'a common food';
    await send(sock, msg.key.remoteJid, msg, '🥗 _Analyzing nutrition..._');
    const r = await aiGen('You are a nutritionist (educational only). Share nutrition facts about this food. Include: Key nutrients, health benefits, potential downsides, how to optimize intake, and a surprising fact. WhatsApp formatting.', `Food: ${food}`);
    await send(sock, msg.key.remoteJid, msg, box('🥗 NUTRITION', r));
  },

  async sportsfact(sock, msg, args) {
    const sport = args.join(' ') || 'football';
    await send(sock, msg.key.remoteJid, msg, '⚽ _Fetching sports fact..._');
    const r = await aiGen('You are a sports journalist. Share fascinating facts about this sport. Include: Origin/history, record achievement, science of the sport, strategic insight, and a legendary moment. WhatsApp formatting.', `Sport: ${sport}`);
    await send(sock, msg.key.remoteJid, msg, box('⚽ SPORTS FACT', r));
  },

  async musicfact(sock, msg, args) {
    const topic = args.join(' ') || 'music and the brain';
    await send(sock, msg.key.remoteJid, msg, '🎵 _Fetching music fact..._');
    const r = await aiGen('You are a music historian and neuroscientist. Share a fascinating fact about music related to this topic. Include: The science or history, a surprising finding, cultural context, and modern relevance. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🎵 MUSIC FACT', r));
  },

  async artfact(sock, msg, args) {
    const topic = args.join(' ') || 'a famous artwork';
    await send(sock, msg.key.remoteJid, msg, '🎨 _Exploring art history..._');
    const r = await aiGen('You are an art historian. Share fascinating facts about this artwork or art topic. Include: Background/context, technique and meaning, artist\'s story, hidden details, and cultural impact. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🎨 ART FACT', r));
  },

  async literature(sock, msg, args) {
    const topic = args.join(' ') || 'a famous book or author';
    await send(sock, msg.key.remoteJid, msg, '📚 _Exploring literature..._');
    const r = await aiGen('You are a literary scholar. Share fascinating facts about this literary work or author. Include: Background, themes and symbolism, historical context, literary techniques, and lasting influence. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('📚 LITERATURE', r));
  },

  async spacefact(sock, msg, args) {
    const topic = args.join(' ') || 'something mind-blowing about space';
    await send(sock, msg.key.remoteJid, msg, '🚀 _Exploring the cosmos..._');
    const r = await aiGen('You are an astrophysicist. Share a mind-blowing space fact about this topic. Include: The phenomenon/object, the incredible scale or physics, how we know this, and what it means for our understanding. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🚀 SPACE FACT', r));
  },

  async oceanfact(sock, msg, args) {
    const topic = args.join(' ') || 'the deep ocean';
    await send(sock, msg.key.remoteJid, msg, '🌊 _Diving into ocean facts..._');
    const r = await aiGen('You are a marine biologist. Share a fascinating ocean fact about this topic. Include: What it is, the science behind it, creatures involved, depth/scale, and why it matters for our planet. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🌊 OCEAN FACT', r));
  },

  async climatefact(sock, msg, args) {
    const topic = args.join(' ') || 'climate change impacts';
    await send(sock, msg.key.remoteJid, msg, '🌍 _Fetching climate facts..._');
    const r = await aiGen('You are a climate scientist. Share accurate, evidence-based facts about this climate topic. Include: Current data, mechanisms, consequences, what is being done, and what individuals can do. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🌍 CLIMATE FACT', r));
  },

  async animalfact2(sock, msg, args) {
    const animal = args.join(' ') || 'a surprising animal';
    await send(sock, msg.key.remoteJid, msg, '🦁 _Fetching animal fact..._');
    const r = await aiGen('You are a zoologist. Share fascinating facts about this animal. Include: Unique adaptations, surprising behavior, diet and habitat, conservation status, and the most jaw-dropping thing about it. WhatsApp formatting.', `Animal: ${animal}`);
    await send(sock, msg.key.remoteJid, msg, box('🦁 ANIMAL FACT', r));
  },

  async plantfact(sock, msg, args) {
    const plant = args.join(' ') || 'an unusual plant';
    await send(sock, msg.key.remoteJid, msg, '🌿 _Exploring plant world..._');
    const r = await aiGen('You are a botanist. Share fascinating facts about this plant. Include: Description, unique adaptations, ecological role, uses by humans, and a surprising defense mechanism or behavior. WhatsApp formatting.', `Plant: ${plant}`);
    await send(sock, msg.key.remoteJid, msg, box('🌿 PLANT FACT', r));
  },

  async inventionfact(sock, msg, args) {
    const invention = args.join(' ') || 'a world-changing invention';
    await send(sock, msg.key.remoteJid, msg, '💡 _Exploring inventions..._');
    const r = await aiGen('You are a technology historian. Share the fascinating story of this invention. Include: Who invented it and when, the problem it solved, how it changed the world, unintended consequences, and modern evolution. WhatsApp formatting.', `Invention: ${invention}`);
    await send(sock, msg.key.remoteJid, msg, box('💡 INVENTION STORY', r));
  },

  async languagefact(sock, msg, args) {
    const topic = args.join(' ') || 'a fascinating language fact';
    await send(sock, msg.key.remoteJid, msg, '🗣️ _Exploring linguistics..._');
    const r = await aiGen('You are a linguist. Share a fascinating fact about language related to this topic. Include: The linguistic phenomenon, examples, how it differs across languages, and what it reveals about human cognition. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🗣️ LANGUAGE FACT', r));
  },

  async culturefact(sock, msg, args) {
    const topic = args.join(' ') || 'a fascinating cultural tradition';
    await send(sock, msg.key.remoteJid, msg, '🌐 _Exploring world cultures..._');
    const r = await aiGen('You are an anthropologist. Share fascinating facts about this cultural practice or tradition. Include: Origin, meaning, how it is practiced, variations around the world, and modern evolution. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🌐 CULTURE FACT', r));
  },

  async psych(sock, msg, args) {
    const topic = args.join(' ') || 'a fascinating psychology fact';
    await send(sock, msg.key.remoteJid, msg, '🧠 _Exploring psychology..._');
    const r = await aiGen('You are a psychologist (educational purposes). Share a fascinating psychological phenomenon about this topic. Include: What it is, the research behind it, real-world examples, how to recognize it in daily life, and implications. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🧠 PSYCHOLOGY', r));
  },

  async mythologyfact(sock, msg, args) {
    const topic = args.join(' ') || 'Greek mythology';
    await send(sock, msg.key.remoteJid, msg, '⚡ _Exploring mythology..._');
    const r = await aiGen('You are a mythology scholar. Share a fascinating story or fact from this mythology tradition. Include: The story/myth, its cultural meaning, symbols and archetypes, and how it influences modern culture. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('⚡ MYTHOLOGY', r));
  },

  async architecturefact(sock, msg, args) {
    const topic = args.join(' ') || 'a famous building or architectural wonder';
    await send(sock, msg.key.remoteJid, msg, '🏛️ _Exploring architecture..._');
    const r = await aiGen('You are an architecture historian. Share fascinating facts about this architectural subject. Include: Design philosophy, engineering challenges, historical context, hidden features, and lasting influence. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🏛️ ARCHITECTURE', r));
  },

  async cryptofact(sock, msg, args) {
    const topic = args.join(' ') || 'blockchain technology';
    await send(sock, msg.key.remoteJid, msg, '₿ _Exploring crypto/blockchain..._');
    const r = await aiGen('You are a blockchain educator. Explain this crypto/blockchain concept accurately. Include: What it is, how it works (simply), real use case, risks to know, and current state. Educational only. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('₿ CRYPTO EXPLAINED', r, '_Educational only — not financial advice_'));
  },

  async aifact(sock, msg, args) {
    const topic = args.join(' ') || 'artificial intelligence';
    await send(sock, msg.key.remoteJid, msg, '🤖 _Exploring AI..._');
    const r = await aiGen('You are an AI researcher and educator. Share a fascinating fact or concept about this AI topic. Include: What it is, how it works, current state of the art, benefits and risks, and future direction. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🤖 AI FACT', r));
  },

  async politicsfact(sock, msg, args) {
    const topic = args.join(' ') || 'how democracy works';
    await send(sock, msg.key.remoteJid, msg, '🏛️ _Exploring political science..._');
    const r = await aiGen('You are a political scientist (neutral and educational). Explain this political concept or system objectively. Include: Definition, how it works, historical examples, pros and cons, and modern relevance. Remain balanced. WhatsApp formatting.', `Topic: ${topic}`);
    await send(sock, msg.key.remoteJid, msg, box('🏛️ POLITICAL SCIENCE', r, '_Presented objectively for educational purposes_'));
  },
};

module.exports = knowledgeCommands;
