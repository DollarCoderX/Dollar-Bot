'use strict';
const pollinations = require('../lib/pollinations');

async function ai(prompt) {
  return await pollinations.textGenerate([{ role: 'user', content: prompt }]);
}
async function reply(sock, msg, text) {
  await sock.sendMessage(msg.key.remoteJid, { text: text || '❌ Try again.' }, { quoted: msg });
}

const morefun2Commands = {
  async rizzup(sock, msg, args) {
    const name = args.join(' ') || 'someone';
    const r = await ai(`Generate the most charming, confident rizz line someone could say to ${name}. Make it witty, smooth, and memorable. Not cringe.`);
    await reply(sock, msg, `*😏 Rizz Line*\n\n${r}`);
  },
  async pickupline2(sock, msg, args) {
    const theme = args.join(' ') || 'nerdy';
    const r = await ai(`Create a ${theme}-themed pickup line that's clever and makes someone laugh. Rate its rizz potential out of 10.`);
    await reply(sock, msg, `*💘 Pickup Line*\n\n${r}`);
  },
  async cheesypun(sock, msg, args) {
    const topic = args.join(' ') || 'anything';
    const r = await ai(`Make the cheesiest pun possible about: "${topic}". Follow it with "I'll see myself out 🧀". Rate the cheese level.`);
    await reply(sock, msg, `*🧀 Cheesy Pun*\n\n${r}`);
  },
  async darkjoke(sock, msg, args) {
    const r = await ai(`Tell a dark humor joke that's edgy but not offensive toward any group. Keep it clever and ironic, not mean-spirited.`);
    await reply(sock, msg, `*🌑 Dark Humor*\n\n${r}`);
  },
  async antihumor(sock, msg, args) {
    const r = await ai(`Tell an anti-joke — set up a classic joke format but deliver a completely literal, unfunny punchline that makes it funny again.`);
    await reply(sock, msg, `*😐 Anti-Humor*\n\n${r}`);
  },
  async complimentchain(sock, msg, args) {
    const name = args.join(' ') || 'you';
    const r = await ai(`Give ${name} a chain of 5 escalating compliments that get increasingly dramatic and over-the-top. End with the most ridiculous one.`);
    await reply(sock, msg, `*✨ Compliment Chain*\n\n${r}`);
  },
  async roastchain(sock, msg, args) {
    const name = args.join(' ') || 'a generic person';
    const r = await ai(`Deliver 3 escalating roasts for ${name} — start mild, get medium, end savage. Keep it funny not genuinely mean.`);
    await reply(sock, msg, `*🔥 Roast Chain*\n\n${r}`);
  },
  async bragmode(sock, msg, args) {
    const topic = args.join(' ') || 'everything';
    const r = await ai(`Write an absolutely over-the-top brag about ${topic} — be ridiculous and absurd. Make it clear it's satire.`);
    await reply(sock, msg, `*💅 Brag Mode*\n\n${r}`);
  },
  async flexcheck(sock, msg, args) {
    const flex = args.join(' ') || 'I woke up today';
    const r = await ai(`Rate this flex: "${flex}" — score from 1-10 with a funny explanation. Tell them if it's a W or L flex.`);
    await reply(sock, msg, `*💪 Flex Check*\n\n${r}`);
  },
  async simp2(sock, msg, args) {
    const name = args.join(' ') || 'their crush';
    const r = await ai(`Write a hilariously over-the-top simp confession for someone in love with ${name}. Make it funny and relatable.`);
    await reply(sock, msg, `*😍 Simp Mode*\n\n${r}`);
  },
  async fangirl(sock, msg, args) {
    const celeb = args.join(' ') || 'their favorite celebrity';
    const r = await ai(`Write an extreme fangirl reaction to meeting ${celeb}. Include the internal monologue, the actual reaction, and the aftermath. Funny.`);
    await reply(sock, msg, `*😭 Fangirl Mode*\n\n${r}`);
  },
  async cringe2(sock, msg, args) {
    const scenario = args.join(' ') || 'social media';
    const r = await ai(`Describe a painfully cringe scenario involving ${scenario} that will make people physically recoil. Relatable content.`);
    await reply(sock, msg, `*😬 Cringe Generator*\n\n${r}`);
  },
  async embarrass(sock, msg, args) {
    const r = await ai(`Generate a funny, relatable embarrassing story scenario. Write it like a confessional. End with "I am never leaving the house again."`);
    await reply(sock, msg, `*🫣 Embarrassing Story*\n\n${r}`);
  },
  async regret(sock, msg, args) {
    const r = await ai(`Generate a hilariously specific life regret — the kind everyone feels but never admits. Make it absurdly relatable.`);
    await reply(sock, msg, `*😔 Regret Generator*\n\n${r}`);
  },
  async overthink(sock, msg, args) {
    const situation = args.join(' ') || 'sending a text';
    const r = await ai(`Show what an overthinker's brain looks like when faced with: "${situation}". Spiral dramatically and hilariously.`);
    await reply(sock, msg, `*🌀 Overthinking*\n\n${r}`);
  },
  async anxiety2(sock, msg, args) {
    const r = await ai(`Write a funny, relatable anxiety thought spiral — start with something small and escalate to catastrophic conclusions. Keep it light and humorous.`);
    await reply(sock, msg, `*😰 Anxiety Brain*\n\n${r}`);
  },
  async existential(sock, msg, args) {
    const r = await ai(`Trigger a comedic existential crisis — ask a deep question, spiral into absurdity, and end with "anyway I need a snack."`);
    await reply(sock, msg, `*🌌 Existential Crisis*\n\n${r}`);
  },
  async boomer(sock, msg, args) {
    const topic = args.join(' ') || 'technology';
    const r = await ai(`Write a classic Baby Boomer opinion about "${topic}" — include "back in my day," skepticism about youth, and nostalgia for simpler times. Funny.`);
    await reply(sock, msg, `*👴 Boomer Opinion*\n\n${r}`);
  },
  async zoomer(sock, msg, args) {
    const topic = args.join(' ') || 'modern society';
    const r = await ai(`Write a Gen Z take on "${topic}" — include brainrot slang, ironic detachment, mental health awareness, and chaos energy. Funny.`);
    await reply(sock, msg, `*😤 Gen Z Take*\n\n${r}`);
  },
  async alpha(sock, msg, args) {
    const r = await ai(`Write an extremely exaggerated "alpha male" self-improvement take — the grindset, cold showers, no emotions. Make it a clear parody.`);
    await reply(sock, msg, `*🦁 Alpha Grindset*\n\n${r}`);
  },
  async introvert(sock, msg, args) {
    const situation = args.join(' ') || 'a social event';
    const r = await ai(`Describe an introvert's internal battle when facing: "${situation}". Include the 5 stages of social anxiety and final decision to stay home.`);
    await reply(sock, msg, `*🏠 Introvert Mode*\n\n${r}`);
  },
  async extrovert(sock, msg, args) {
    const r = await ai(`Describe an extrovert's day — the energy, the need for people, the horrors of being alone for 10 minutes. Hilariously accurate.`);
    await reply(sock, msg, `*🎉 Extrovert Mode*\n\n${r}`);
  },
  async empath(sock, msg, args) {
    const person = args.join(' ') || 'you';
    const r = await ai(`Do a dramatic empath reading of ${person} — what vibes they give off, their emotional state, past wounds. Be theatrical and funny.`);
    await reply(sock, msg, `*🌟 Empath Reading*\n\n${r}`);
  },
  async conspiracy(sock, msg, args) {
    const topic = args.join(' ') || 'something random';
    const r = await ai(`Create a ridiculous conspiracy theory about "${topic}" — make it absurd, connect unrelated dots, and end with "do your research."`);
    await reply(sock, msg, `*🤫 Conspiracy Theory*\n\n${r}`);
  },
  async flatearther(sock, msg, args) {
    const r = await ai(`Write a flat earther's argument in the most confident, confused way possible. Include "they don't want you to know" and an absurd explanation.`);
    await reply(sock, msg, `*🌍 Flat Earther Mode*\n\n${r}`);
  },
  async npc2(sock, msg, args) {
    const r = await ai(`Write an NPC dialogue — limited responses, glitching, repeating the same quest info, oblivious to chaos around them. Funny gaming reference.`);
    await reply(sock, msg, `*🤖 NPC Dialogue*\n\n${r}`);
  },
  async maincharacter(sock, msg, args) {
    const r = await ai(`Write a main character moment — dramatic inner monologue, slow-motion walking, imaginary audience, and a montage of their ordinary day. Funny.`);
    await reply(sock, msg, `*🎬 Main Character*\n\n${r}`);
  },
  async philosopher2(sock, msg, args) {
    const r = await ai(`Generate a deep-sounding philosophical thought that sounds profound but is actually about something mundane like sandwiches. Be poetic and absurd.`);
    await reply(sock, msg, `*💭 Deep Thoughts*\n\n${r}`);
  },
  async fortune2(sock, msg, args) {
    const r = await ai(`Write a fortune cookie message that starts wise but ends with a completely random or absurd twist. Keep it under 3 lines.`);
    await reply(sock, msg, `*🥠 Fortune Cookie*\n\n${r}`);
  },
  async horoscope2(sock, msg, args) {
    const sign = args.join(' ') || 'your zodiac sign';
    const r = await ai(`Write a hilariously specific horoscope for ${sign} — include a ridiculous warning, unexpected opportunity, and weird advice for the week.`);
    await reply(sock, msg, `*⭐ Horoscope: ${sign}*\n\n${r}`);
  },
  async tarot(sock, msg, args) {
    const r = await ai(`Do a 3-card tarot reading — past, present, future. Pick dramatic card names, interpret them mysteriously, and make it fun and suspenseful.`);
    await reply(sock, msg, `*🃏 Tarot Reading*\n\n${r}`);
  },
  async crystalball(sock, msg, args) {
    const question = args.join(' ') || 'my future';
    const r = await ai(`The crystal ball reveals the answer about: "${question}" — be vague, dramatic, and mystical. Use ellipsis and mystery. Then add a funny footnote.`);
    await reply(sock, msg, `*🔮 Crystal Ball*\n\n${r}`);
  },
  async palmreading(sock, msg, args) {
    const r = await ai(`Do a dramatic palm reading — describe the life line, heart line, head line in theatrical terms. Mix real palmistry with absurd predictions.`);
    await reply(sock, msg, `*✋ Palm Reading*\n\n${r}`);
  },
  async spiritanimal(sock, msg, args) {
    const r = await ai(`Determine someone's spirit animal based on vibes — describe the animal, what it represents, and what it says about their personality. Be dramatic.`);
    await reply(sock, msg, `*🦁 Spirit Animal*\n\n${r}`);
  },
  async universe(sock, msg, args) {
    const r = await ai(`Channel a message from the universe to the reader — make it dramatic, cosmic, and slightly threatening but ultimately encouraging.`);
    await reply(sock, msg, `*🌌 Message from the Universe*\n\n${r}`);
  },
  async vibe2(sock, msg, args) {
    const r = await ai(`Do an instant vibe check reading — assign a vibe rating (from "immaculate" to "absolute chaos"), color, sound, and energy level. Make it fun.`);
    await reply(sock, msg, `*✨ Vibe Check*\n\n${r}`);
  },
  async energy(sock, msg, args) {
    const r = await ai(`Read someone's energy — assign them an element (fire/water/earth/air), a frequency level, and what their energy attracts. Be mysteriously accurate.`);
    await reply(sock, msg, `*⚡ Energy Reading*\n\n${r}`);
  },
  async gifted(sock, msg, args) {
    const r = await ai(`Tell someone their hidden psychic gift — be dramatic and specific (e.g., "You can sense when someone is about to text you"). Hilariously accurate.`);
    await reply(sock, msg, `*🌟 Hidden Gift*\n\n${r}`);
  },
  async previouslife(sock, msg, args) {
    const r = await ai(`Reveal someone's past life — who they were, what era, what they did, and what karma they're still working out. Be fun and theatrical.`);
    await reply(sock, msg, `*⏳ Past Life Reading*\n\n${r}`);
  },
  async soulmate(sock, msg, args) {
    const r = await ai(`Describe someone's soulmate based on cosmic alignment — their general personality, where they'll meet, and a dramatic sign to look out for.`);
    await reply(sock, msg, `*💫 Soulmate Reading*\n\n${r}`);
  },
  async auracolor(sock, msg, args) {
    const r = await ai(`Read someone's aura color — describe the color, what it means, their strengths and weaknesses, and what others feel around them.`);
    await reply(sock, msg, `*🌈 Aura Color*\n\n${r}`);
  },
  async lifepurpose(sock, msg, args) {
    const r = await ai(`Dramatically reveal someone's life purpose based on cosmic signs — make it grand, inspiring, and slightly ridiculous. End with a call to action.`);
    await reply(sock, msg, `*🌟 Life Purpose*\n\n${r}`);
  },
  async lovestatus(sock, msg, args) {
    const r = await ai(`Do a dramatic love life reading — current status (single/complicated/taken energy), what's blocking love, and what's coming next. Be theatrical.`);
    await reply(sock, msg, `*❤️ Love Reading*\n\n${r}`);
  },
  async moneyenergy(sock, msg, args) {
    const r = await ai(`Read someone's money energy — are they a magnet for abundance or repelling it? What's their financial karma? Give dramatic advice.`);
    await reply(sock, msg, `*💰 Money Energy*\n\n${r}`);
  },
  async toxicrating(sock, msg, args) {
    const trait = args.join(' ') || 'a random personality trait';
    const r = await ai(`Rate how toxic "${trait}" is on a scale of 1-10 with a funny breakdown. Include a "red flag meter" and whether to run or stay.`);
    await reply(sock, msg, `*🚩 Toxic Rating*\n\n${r}`);
  },
  async nglcheck(sock, msg, args) {
    const confession = args.join(' ') || 'something embarrassing';
    const r = await ai(`Judge this NGL confession: "${confession}" — rate the bravery (1-10), relate to it, and give a dramatic verdict. Keep it funny.`);
    await reply(sock, msg, `*👀 NGL Check*\n\n${r}`);
  },
  async thinkpiece(sock, msg, args) {
    const topic = args.join(' ') || 'modern dating';
    const r = await ai(`Write an overly dramatic think-piece about "${topic}" — use big words, make simple things sound philosophical, end with a hot take.`);
    await reply(sock, msg, `*🤔 Think Piece*\n\n${r}`);
  },
  async unpopular(sock, msg, args) {
    const r = await ai(`Share an unpopular opinion — make it mildly controversial but harmless. Then defend it passionately with 3 ridiculous arguments.`);
    await reply(sock, msg, `*🌶️ Unpopular Opinion*\n\n${r}`);
  },
  async hotthrow(sock, msg, args) {
    const r = await ai(`Generate a dramatic "hot take" that sounds controversial but is actually pretty reasonable. Deliver it with maximum confidence.`);
    await reply(sock, msg, `*🔥 Hot Take*\n\n${r}`);
  },
};

module.exports = morefun2Commands;
