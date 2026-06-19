'use strict';

const pollinations = require('../lib/pollinations');
const crypto = require('crypto');

async function aiGen(system, user) {
  return pollinations.textGenerate([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}

function send(sock, jid, msg, text) {
  return sock.sendMessage(jid, { text }, { quoted: msg });
}

function box(title, content) {
  return `╭━━━〔 ${title} 〕━━━⬣\n\n${content}\n\n╰━━━━━━━━━━━━━━━━━━⬣`;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const COLORS = [
  {name:'Crimson Red',hex:'#DC143C',rgb:'220,20,60'},
  {name:'Ocean Blue',hex:'#006994',rgb:'0,105,148'},
  {name:'Emerald Green',hex:'#50C878',rgb:'80,200,120'},
  {name:'Sunset Orange',hex:'#FD5E53',rgb:'253,94,83'},
  {name:'Royal Purple',hex:'#7851A9',rgb:'120,81,169'},
  {name:'Golden Yellow',hex:'#FFD700',rgb:'255,215,0'},
  {name:'Rose Pink',hex:'#FF007F',rgb:'255,0,127'},
  {name:'Teal',hex:'#008080',rgb:'0,128,128'},
  {name:'Coral',hex:'#FF6B6B',rgb:'255,107,107'},
  {name:'Lavender',hex:'#E6E6FA',rgb:'230,230,250'},
  {name:'Mint',hex:'#98FF98',rgb:'152,255,152'},
  {name:'Charcoal',hex:'#36454F',rgb:'54,69,79'},
  {name:'Peach',hex:'#FFCBA4',rgb:'255,203,164'},
  {name:'Sky Blue',hex:'#87CEEB',rgb:'135,206,235'},
  {name:'Maroon',hex:'#800000',rgb:'128,0,0'},
];

const COUNTRIES = ['Japan','Brazil','Canada','Germany','Australia','India','France','Mexico','South Korea','Nigeria','Sweden','Argentina','Netherlands','Egypt','Thailand','Colombia','Italy','Spain','New Zealand','Kenya','Portugal','Iceland','Morocco','Chile','Philippines'];

const ANIMALS = [
  {name:'Axolotl',fact:'Can regenerate entire limbs, including parts of their heart and brain'},
  {name:'Mantis Shrimp',fact:'Can see 16 types of color receptors (humans have only 3) and punch with the force of a bullet'},
  {name:'Tardigrade',fact:'Can survive the vacuum of space, extreme radiation, and temperatures from -272°C to 150°C'},
  {name:'Platypus',fact:'Is one of the only venomous mammals and detects electric fields with its bill'},
  {name:'Mimic Octopus',fact:'Can impersonate over 15 different sea creatures to avoid predators'},
  {name:'Narwhal',fact:'Their "horn" is actually a tooth that can grow up to 10 feet long with 10 million nerve endings'},
  {name:'Pistol Shrimp',fact:'Creates a cavitation bubble hotter than the surface of the Sun to stun prey'},
  {name:'Crows',fact:'Recognize individual human faces and hold grudges for years'},
  {name:'Wolverine',fact:'Can track prey through 20 feet of snow and take down animals 10x their size'},
  {name:'Electric Eel',fact:'Can generate up to 860 volts — enough to stun a horse'},
];

const FOOD_FACTS = [
  'Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.',
  'Strawberries aren\'t technically berries, but bananas, avocados, and watermelons are.',
  'The world\'s most expensive coffee (Kopi Luwak) is made from beans that have been eaten and digested by civet cats.',
  'Apples float in water because they\'re 25% air.',
  'A single teaspoon of sriracha sauce contains about 6-8 drops per chili. Each bottle takes 3-4 years to produce.',
  'Pistachios are technically fruits and the "nut" is the seed inside.',
  'Dark chocolate has more antioxidants than blueberries.',
  'Broccoli contains more protein per calorie than steak.',
  'Carrots were originally purple — not orange. The orange variety was bred by the Dutch.',
  'The entire world\'s population of wild Dungeness crab could fit in a single US state.',
];

const HOBBIES = ['Urban sketching','Aquaponics','Speedcubing','Foraging','Bookbinding','Soap making','Drone photography','Fermenting','Calligraphy','Parkour','Bonsai','Lock sport','Chainmail making','Astronomy','Origami','Lapidary','Wire wrapping','Terrarium building','Falconry','Shibori dyeing','Historical fencing','Microgreens growing','Glassblowing','Leather working'];

const JOBS = ['UX Researcher','Ethical Hacker','Data Storyteller','Sleep Consultant','Digital Archaeologist','Biomimicry Engineer','Happiness Coach','Quantum Computing Researcher','Ocean Plastic Collector','Food Futurist','Memory Athletic Coach','AR/VR Experience Designer','Bioinformatician','Urban Farmer','Narrative Game Designer','Chief Listening Officer','Mycelium Architect','Space Tourism Guide','AI Ethics Auditor','Longevity Scientist'];

const SUPERPOWERS = [
  {name:'Chronokinesis',desc:'Control and manipulate time — pause, rewind, or fast-forward events'},
  {name:'Technopathy',desc:'Communicate with and control any electronic device with your mind'},
  {name:'Biokinesis',desc:'Control living organisms at a cellular level — yours or others\' bodies'},
  {name:'Probability Manipulation',desc:'Make unlikely events happen — or prevent them from occurring'},
  {name:'Memory Absorption',desc:'Touch objects or people and see their complete history'},
  {name:'Molecular Reformation',desc:'Disassemble and reassemble matter into anything you imagine'},
  {name:'Empathic Mirroring',desc:'Instantly gain any skill or knowledge from observing someone do it once'},
  {name:'Reality Anchor',desc:'Your perception of reality is objectively true — you decide what "real" is'},
  {name:'Quantum Entanglement',desc:'Be in two places simultaneously — different versions of you in parallel'},
  {name:'Linguistic Omniscience',desc:'Speak, understand, and write every language including animal communication'},
];

const CHALLENGES = [
  'Go 24 hours without complaining — and mentally reframe every frustration as a lesson',
  'Write 3 handwritten letters to people who impacted your life and actually mail them',
  'Try a completely new cuisine you\'ve never had before and learn its cultural origin',
  'Do a 24-hour digital detox — no social media, streaming, or unnecessary screens',
  'Learn 10 words in a new language and use them in a real conversation',
  'Wake up at 5AM tomorrow and spend the first hour doing something just for you',
  'Compliment 5 strangers genuinely today — and notice their reactions',
  'Cook a full meal from a country you\'ve never visited using authentic ingredients',
  'Sit in complete silence for 30 minutes without your phone',
  'Do something you\'ve been putting off for over a month — right now, start it',
  'Read 50 pages of a non-fiction book today',
  'Go for a 10km walk and listen to a full album or audiobook chapter',
  'Create something with your hands — draw, build, or make anything physical',
  'Research a historical figure you\'ve never heard of and teach someone about them',
  'Interview someone 20+ years older than you about their biggest life lesson',
];

const QUOTES = [
  {q:'The only way out is through.',a:'Robert Frost'},
  {q:'You don\'t have to see the whole staircase, just take the first step.',a:'Martin Luther King Jr.'},
  {q:'Life is what happens when you\'re busy making other plans.',a:'John Lennon'},
  {q:'The greatest glory in living lies not in never falling, but in rising every time we fall.',a:'Nelson Mandela'},
  {q:'Your time is limited, don\'t waste it living someone else\'s life.',a:'Steve Jobs'},
  {q:'The world is not a problem to be solved; it is a living being to which we belong.',a:'Llewelyn Vaughan-Lee'},
  {q:'It does not matter how slowly you go as long as you do not stop.',a:'Confucius'},
  {q:'Darkness cannot drive out darkness; only light can do that.',a:'Martin Luther King Jr.'},
  {q:'In the middle of every difficulty lies opportunity.',a:'Albert Einstein'},
  {q:'The cave you fear to enter holds the treasure you seek.',a:'Joseph Campbell'},
  {q:'Do not go where the path may lead, go instead where there is no path and leave a trail.',a:'Ralph Waldo Emerson'},
  {q:'Two things are infinite: the universe and human stupidity; and I\'m not sure about the universe.',a:'Albert Einstein'},
];

const generatorCommands = {

  async randomname(sock, msg, args) {
    const style = args.join(' ') || '';
    const r = await aiGen('Generate a creative name with its cultural origin and meaning. Format: *Name:* [name]\n*Origin:* [country/culture]\n*Meaning:* [meaning]\n*Personality:* [2-3 traits associated with this name]\n*Famous:* [a famous person with this name]. No extra text. WhatsApp formatting.', `Style/theme: ${style || 'random elegant'}`);
    await send(sock, msg.key.remoteJid, msg, box('🎲 RANDOM NAME', r));
  },

  async randomword(sock, msg, args) {
    const theme = args.join(' ') || '';
    const r = await aiGen('Generate one unusual, interesting English word. Format: *Word:* [word]\n*Pronunciation:* [phonetic]\n*Part of speech:* [noun/verb/etc]\n*Definition:* [clear definition]\n*Etymology:* [origin story]\n*Example sentence:* [creative example]\n*Rarity:* [how common/rare it is]. WhatsApp formatting.', `Theme: ${theme || 'random obscure word'}`);
    await send(sock, msg.key.remoteJid, msg, box('📖 WORD OF THE DAY', r));
  },

  async randomsentence(sock, msg, args) {
    const mood = args.join(' ') || 'mysterious';
    const r = await aiGen(`Write one perfect, creative sentence with a ${mood} tone. Make it vivid, original, and memorable. Just the sentence, nothing else.`, '');
    await send(sock, msg.key.remoteJid, msg, `✍️ _"${r}"_`);
  },

  async randomcolor(sock, msg, args) {
    const c = pick(COLORS);
    await send(sock, msg.key.remoteJid, msg,
      box('🎨 RANDOM COLOR',
        `🖌️ *Name:* ${c.name}\n` +
        `🔣 *HEX:* \`${c.hex}\`\n` +
        `🔢 *RGB:* \`rgb(${c.rgb})\`\n` +
        `✨ *Mood:* ${['Energetic','Calm','Bold','Mysterious','Playful','Elegant','Fresh','Warm','Cool'][Math.floor(Math.random()*9)]}\n` +
        `🎯 *Best for:* ${pick(['branding','interiors','fashion','art','UI design','photography'])}`
      )
    );
  },

  async randomemoji(sock, msg, args) {
    const emojis = ['😂','🔥','💯','👑','😍','🌊','⚡','🎯','💎','🌹','🦋','🎭','🚀','🌙','✨','🎪','💫','🌺','🦚','🎨'];
    const count = Math.min(parseInt(args[0]) || 5, 15);
    const combo = Array.from({length: count}, () => pick(emojis)).join('');
    await send(sock, msg.key.remoteJid, msg, `🎲 Random emoji combo:\n\n${combo}`);
  },

  async randomadvice2(sock, msg, args) {
    const area = args.join(' ') || pick(['life','relationships','career','money','health','mindset']);
    const r = await aiGen(`Give one profound piece of advice about ${area}. Make it specific, actionable, and genuinely helpful. Not a cliché. 2-3 sentences max. Start with the advice directly.`, '');
    await send(sock, msg.key.remoteJid, msg, box(`💡 ADVICE: ${area.toUpperCase()}`, r));
  },

  async randomcountry(sock, msg, args) {
    const country = args.join(' ') || pick(COUNTRIES);
    const r = await aiGen(`Give 5 surprising facts about ${country} that most people don't know. Number each fact. Focus on unique culture, geography, history, or world records. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg, box(`🌍 ${country.toUpperCase()}`, r));
  },

  async randomanimaI(sock, msg, args) {
    const a = pick(ANIMALS);
    const r = await aiGen(`Share 4 more mind-blowing facts about the ${a.name}. Include anatomy, behavior, and ecosystem role. Short bullets. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg,
      box(`🦁 ${a.name.toUpperCase()}`,
        `🤯 *Key fact:* ${a.fact}\n\n${r}`
      )
    );
  },

  async randomfood2(sock, msg, args) {
    const f = pick(FOOD_FACTS);
    const ingredient = args.join(' ') || '';
    if (ingredient) {
      const r = await aiGen(`Give 3 surprising food science facts about ${ingredient}. Include nutritional science, culinary chemistry, and cultural history. Short bullets. WhatsApp formatting.`, '');
      await send(sock, msg.key.remoteJid, msg, box(`🍽️ ${ingredient.toUpperCase()} FACTS`, r));
    } else {
      await send(sock, msg.key.remoteJid, msg, box('🍽️ FOOD FACT', `🤯 ${f}`));
    }
  },

  async randomjob(sock, msg, args) {
    const job = pick(JOBS);
    const r = await aiGen(`Describe the job "${job}" in an engaging way. Include: What you actually do daily, skills needed, why it matters, salary range estimate, and how to get into it. WhatsApp formatting, *bold* section headers.`, '');
    await send(sock, msg.key.remoteJid, msg, box(`💼 JOB: ${job.toUpperCase()}`, r));
  },

  async randomhobby(sock, msg, args) {
    const hobby = args.join(' ') || pick(HOBBIES);
    const r = await aiGen(`Introduce the hobby "${hobby}" to a complete beginner. Include: What it is, why people love it, starter cost estimate, how to begin this week, online communities to join, and one beginner tip. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg, box(`🎯 HOBBY: ${hobby.toUpperCase()}`, r));
  },

  async randomdream(sock, msg, args) {
    const r = await aiGen('Generate a vivid, surreal dream scenario (2-3 sentences). Include: an unusual setting, a surprising character, an impossible event, and an emotion. Make it feel like a real dream memory. No explanation, just the dream.', '');
    await send(sock, msg.key.remoteJid, msg, box('😴 RANDOM DREAM', `_"${r}"_`));
  },

  async randomsuperpower(sock, msg, args) {
    const sp = pick(SUPERPOWERS);
    const r = await aiGen(`For the superpower "${sp.name}" (${sp.desc}), describe: 3 creative uses, 1 major weakness, 1 unintended consequence, and what your hero name would be. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg,
      box(`⚡ SUPERPOWER: ${sp.name.toUpperCase()}`,
        `📖 *Description:* ${sp.desc}\n\n${r}`
      )
    );
  },

  async randomquote2(sock, msg, args) {
    const q = pick(QUOTES);
    await send(sock, msg.key.remoteJid, msg,
      box('💬 QUOTE',
        `_"${q.q}"_\n\n— *${q.a}*`
      )
    );
  },

  async randomfact3(sock, msg, args) {
    const category = args.join(' ') || pick(['psychology','history','science','technology','nature','society','economics']);
    const r = await aiGen(`Share one completely mind-blowing, verified fact from ${category}. Make it the most surprising, counterintuitive, or shocking fact you know about this area. 2-3 sentences. Start with the fact directly.`, '');
    await send(sock, msg.key.remoteJid, msg, box(`🤯 MIND-BLOWING FACT`, r));
  },

  async randomchallenge2(sock, msg, args) {
    const c = pick(CHALLENGES);
    await send(sock, msg.key.remoteJid, msg,
      box('🎯 RANDOM CHALLENGE',
        `${c}\n\n_Will you accept? 👀_`
      )
    );
  },

  async randomteam(sock, msg, args) {
    if (args.length < 4) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .randomteam <name1> <name2> <name3> ... (min 4 names)');
    const names = [...args];
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    const half = Math.ceil(names.length / 2);
    const team1 = names.slice(0, half);
    const team2 = names.slice(half);
    await send(sock, msg.key.remoteJid, msg,
      box('⚽ RANDOM TEAMS',
        `*Team A:* ${team1.join(', ')}\n*Team B:* ${team2.join(', ')}`
      )
    );
  },

  async randomnumber2(sock, msg, args) {
    const min = parseInt(args[0]) || 1;
    const max = parseInt(args[1]) || 100;
    if (min >= max) return send(sock, msg.key.remoteJid, msg, '❌ Min must be less than max\nUsage: .randomnumber2 <min> <max>');
    const n = rng(min, max);
    await send(sock, msg.key.remoteJid, msg, `🎲 Random number (${min}-${max}):\n\n*${n}*`);
  },

  async dice2(sock, msg, args) {
    const sides = Math.min(Math.max(parseInt(args[0]) || 6, 2), 1000);
    const count = Math.min(parseInt(args[1]) || 1, 10);
    const rolls = Array.from({length: count}, () => rng(1, sides));
    const total = rolls.reduce((a,b) => a + b, 0);
    await send(sock, msg.key.remoteJid, msg,
      box('🎲 DICE ROLL',
        `Rolling *${count}d${sides}*...\n\n` +
        `Results: ${rolls.join(', ')}\n` +
        (count > 1 ? `*Total:* ${total}` : '')
      )
    );
  },

  async coin2(sock, msg, args) {
    const weight = parseInt(args[0]);
    let heads;
    if (!isNaN(weight) && weight >= 1 && weight <= 99) {
      heads = Math.random() * 100 < weight;
      await send(sock, msg.key.remoteJid, msg, `🪙 *${heads ? 'HEADS' : 'TAILS'}* (${weight}% heads bias)`);
    } else {
      heads = Math.random() < 0.5;
      await send(sock, msg.key.remoteJid, msg, `🪙 *${heads ? 'HEADS' : 'TAILS'}*`);
    }
  },

  async uuid(sock, msg, args) {
    const count = Math.min(parseInt(args[0]) || 1, 10);
    const ids = Array.from({length: count}, () => crypto.randomUUID());
    await send(sock, msg.key.remoteJid, msg,
      `🔑 *Generated UUID${count > 1 ? 's' : ''}:*\n\n` + ids.map(id => `\`${id}\``).join('\n')
    );
  },

  async randompassword(sock, msg, args) {
    const length = Math.min(Math.max(parseInt(args[0]) || 16, 8), 64);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const pwd = Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const strength = length >= 20 ? '🟢 Very Strong' : length >= 16 ? '🟡 Strong' : length >= 12 ? '🟠 Moderate' : '🔴 Weak';
    await send(sock, msg.key.remoteJid, msg,
      `🔐 *Generated Password (${length} chars):*\n\n\`${pwd}\`\n\n*Strength:* ${strength}`
    );
  },

  async randomdate(sock, msg, args) {
    const year = rng(1000, 2023);
    const month = rng(1, 12);
    const day = rng(1, 28);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const r = await aiGen(`What notable event happened on ${months[month-1]} ${day}, ${year}? If nothing exact on that date, tell me what was happening in the world around that time. 2-3 sentences. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg,
      box('📅 RANDOM DATE',
        `📆 *Date:* ${months[month-1]} ${day}, ${year}\n\n${r}`
      )
    );
  },

  async would2(sock, msg, args) {
    const r = await aiGen('Create a creative, thought-provoking "Would You Rather" question with 2 genuinely difficult options. Both options should be equally appealing or unappealing. Format: "Would you rather [option A] or [option B]?" Then explain why each choice has value. WhatsApp formatting.', args.join(' ') || '');
    await send(sock, msg.key.remoteJid, msg, box('🤔 WOULD YOU RATHER', r));
  },

  async spinwheel2(sock, msg, args) {
    if (args.length < 2) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .spinwheel2 <option1> <option2> [option3...]');
    const winner = pick(args);
    const display = args.map(a => a === winner ? `✅ *${a}* ← WINNER!` : `⬜ ${a}`).join('\n');
    await send(sock, msg.key.remoteJid, msg,
      box('🎡 SPIN THE WHEEL',
        `Spinning ${args.length} options...\n\n${display}\n\n🎉 The wheel lands on: *${winner}*!`
      )
    );
  },

  async bracket(sock, msg, args) {
    if (args.length < 4) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .bracket <item1> <item2> <item3> <item4> ... (min 4 items)');
    const items = [...args].sort(() => Math.random() - 0.5);
    let text = `*🏆 TOURNAMENT BRACKET*\n\n`;
    const matchups = [];
    for (let i = 0; i < items.length - 1; i += 2) {
      matchups.push([items[i], items[i+1] || 'BYE']);
    }
    matchups.forEach((m, i) => {
      text += `*Match ${i+1}:* ${m[0]} 🆚 ${m[1]}\n`;
    });
    text += `\n_Vote for who advances! 🗳️_`;
    await send(sock, msg.key.remoteJid, msg, text);
  },
};

module.exports = generatorCommands;
