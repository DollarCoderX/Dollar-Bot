const { textGenerate } = require('../lib/pollinations');
const fetch = require('node-fetch');

// ── In-memory game states ─────────────────────────────────────────────────
const hangmanState = {};
const triviaState  = {};
const highLowState = {};
const scrambleState = {};

const HANGMAN_WORDS = [
  'javascript','python','elephant','rainbow','mountain','keyboard','dolphin',
  'universe','chocolate','adventure','umbrella','pineapple','astronaut',
  'butterfly','telephone','democracy','algorithm','photograph','lightning',
];

const TRIVIA_POOL = [
  { q:'What is the capital of Canada?', a:'ottawa', hint:'It starts with O' },
  { q:'What planet is known as the Red Planet?', a:'mars', hint:'4th from the sun' },
  { q:'How many sides does a hexagon have?', a:'6', hint:'Think hive' },
  { q:'What gas do plants absorb from the air?', a:'carbon dioxide', hint:'CO₂' },
  { q:'Who painted the Mona Lisa?', a:'da vinci', hint:'Italian Renaissance genius' },
  { q:'What is the largest ocean on Earth?', a:'pacific', hint:'Covers more than all land combined' },
  { q:'What is the chemical symbol for gold?', a:'au', hint:'Latin: Aurum' },
  { q:'How many bones are in the adult human body?', a:'206', hint:'Triple digits' },
  { q:'What is the fastest land animal?', a:'cheetah', hint:'African big cat' },
  { q:'In what year did World War II end?', a:'1945', hint:'Mid-40s' },
  { q:'What is the smallest planet in our solar system?', a:'mercury', hint:'Closest to the sun' },
  { q:'What language is most spoken worldwide?', a:'mandarin', hint:'China' },
  { q:'What is the square root of 144?', a:'12', hint:'A dozen' },
  { q:'What is the powerhouse of the cell?', a:'mitochondria', hint:'Biology class meme' },
  { q:'How many continents are there?', a:'7', hint:'Lucky number' },
];

const SCRAMBLE_WORDS = [
  'PLANET','FOREST','GUITAR','CASTLE','BRIDGE','FLOWER','DESERT',
  'WIZARD','PICKLE','BUTTER','SOCKET','PILLOW','CAMERA','WALLET','MONKEY',
];

const WOULD_YOU_RATHER = [
  ['fly','be invisible'],['always be hot','always be cold'],
  ['read minds','see the future'],['never sleep','never eat'],
  ['speak every language','play every instrument'],
  ['lose your phone','lose your wallet'],
  ['be 5 years old forever','be 90 years old forever'],
  ['fight 100 duck-sized horses','fight 1 horse-sized duck'],
  ['always say what you think','never speak again'],
  ['have no internet','have no AC or heat'],
];

const NEVER_HAVE_I = [
  'never have I ever gone skinny dipping.',
  'never have I ever lied to a teacher.',
  'never have I ever eaten food off the floor.',
  'never have I ever stalked someone on social media.',
  'never have I ever pretended to be sick to skip work/school.',
  'never have I ever sent a text to the wrong person.',
  'never have I ever cried at a movie.',
  'never have I ever stayed up for 24 hours.',
  'never have I ever prank called someone.',
  'never have I ever broken a bone.',
];

const PARANOIA_QS = [
  'Who in this chat is most likely to become famous?',
  'Who would survive a zombie apocalypse the longest?',
  'Who sends the most cringe texts?',
  'Who in this chat has the worst sleep schedule?',
  'Who is the biggest simp here?',
  'Who would eat expired food and not notice?',
  'Who talks the most but says the least?',
  'Who is secretly a genius?',
  'Who would betray the group for pizza?',
  'Who has the most drama in their life?',
];

const morefun = {

  // ── Would You Rather ─────────────────────────────────────────────────────
  async wouldyourather(sock, msg) {
    const pair = WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)];
    await msg.reply(
      `╭━━━〔 🤔 WOULD YOU RATHER? 〕━━━⬣\n\n` +
      `  *A)* ${pair[0].toUpperCase()}\n\n` +
      `          ——— OR ———\n\n` +
      `  *B)* ${pair[1].toUpperCase()}\n\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣\n\nReply *A* or *B*!`
    );
  },

  // ── Never Have I Ever ────────────────────────────────────────────────────
  async neverhavei(sock, msg) {
    const stmt = NEVER_HAVE_I[Math.floor(Math.random() * NEVER_HAVE_I.length)];
    await msg.reply(`🙋 *NEVER HAVE I EVER*\n\n${stmt}\n\n_👍 = I have  |  👎 = Never_`);
  },

  // ── Paranoia Question ────────────────────────────────────────────────────
  async paranoia(sock, msg) {
    const q = PARANOIA_QS[Math.floor(Math.random() * PARANOIA_QS.length)];
    await msg.reply(`😨 *PARANOIA*\n\n${q}\n\n_Tag the person you think it is!_`);
  },

  // ── Sus Meter ────────────────────────────────────────────────────────────
  async sus(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .sus <name>');
    const name = args.join(' ');
    const pct = Math.floor(Math.random() * 101);
    const bar = '🟥'.repeat(Math.floor(pct / 10)) + '⬛'.repeat(10 - Math.floor(pct / 10));
    const level = pct > 80 ? 'EXTREMELY SUS 🔴' : pct > 50 ? 'Pretty Sus 🟡' : pct > 20 ? 'Slightly Sus 🟢' : 'Not Sus At All ✅';
    await msg.reply(`📊 *SUS METER*\n\n*${name}*\n\n${bar}\n${pct}% Sus\n\n_Verdict: ${level}_`);
  },

  // ── IQ Meter ─────────────────────────────────────────────────────────────
  async iq(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .iq <name>');
    const name = args.join(' ');
    const iqVal = Math.floor(Math.random() * 101) + 70;
    const label = iqVal >= 160 ? '🧠 GENIUS' : iqVal >= 130 ? '✨ Very Smart' : iqVal >= 110 ? '👍 Above Average' : iqVal >= 90 ? '😐 Average' : '💀 Needs Help';
    await msg.reply(`🧠 *IQ TEST*\n\n*${name}* scored:\n\n*${iqVal} IQ*\n\n_Level: ${label}_`);
  },

  // ── Cringe Generator ─────────────────────────────────────────────────────
  async cringe(sock, msg) {
    const cringes = [
      'When you text "haha" but you didn\'t even smile.',
      'Putting "XD" at the end of something that wasn\'t funny.',
      'People who say "I\'m not like other people."',
      'Using "lol" as punctuation after everything lol.',
      'Introducing yourself with your zodiac sign.',
      'Replying "K." to a paragraph message.',
      'Adding "no offense" before saying something very offensive.',
      '"I don\'t watch TV" said while watching 8 hours of YouTube.',
      'Laughing at your own joke before finishing it.',
      'Typing in cAmElCaSe UnIrOnIcAlLy.',
    ];
    await msg.reply(`😬 *CRINGE ALERT*\n\n${cringes[Math.floor(Math.random() * cringes.length)]}`);
  },

  // ── Simp Meter ───────────────────────────────────────────────────────────
  async simp(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .simp <name>');
    const name = args.join(' ');
    const pct = Math.floor(Math.random() * 101);
    const bar = '💗'.repeat(Math.floor(pct / 10)) + '🖤'.repeat(10 - Math.floor(pct / 10));
    const label = pct > 80 ? 'CERTIFIED SIMP 💘' : pct > 50 ? 'Moderate Simp 💓' : pct > 20 ? 'Slightly Simping 💛' : 'Not a Simp ✊';
    await msg.reply(`💗 *SIMP METER*\n\n*${name}*\n\n${bar}\n${pct}%\n\n_${label}_`);
  },

  // ── Rizz Meter ───────────────────────────────────────────────────────────
  async rizzmeter(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .rizzmeter <name>');
    const name = args.join(' ');
    const pct = Math.floor(Math.random() * 101);
    const bar = '✨'.repeat(Math.floor(pct / 10)) + '⬛'.repeat(10 - Math.floor(pct / 10));
    const label = pct > 90 ? 'GOD TIER RIZZ 👑' : pct > 70 ? 'W Rizz 🔥' : pct > 40 ? 'Mid Rizz 😐' : 'L Rizz 💀';
    await msg.reply(`✨ *RIZZ METER*\n\n*${name}*\n\n${bar}\n${pct}% Rizz\n\n_${label}_`);
  },

  // ── Slay Check ───────────────────────────────────────────────────────────
  async slay(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .slay <name>');
    const name = args.join(' ');
    const pct = Math.floor(Math.random() * 101);
    const label = pct > 85 ? '👑 MAIN CHARACTER SLAY' : pct > 60 ? '💅 Slaying Hard' : pct > 35 ? '😌 Slay Adjacent' : '💀 No Slay Detected';
    await msg.reply(`💅 *SLAY CHECK*\n\n*${name}* — *${pct}%*\n\n_${label}_`);
  },

  // ── Bully (fun, not real) ─────────────────────────────────────────────────
  async bully(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .bully <name>');
    const name = args.join(' ');
    const lines = [
      `${name} types with one finger.`,
      `${name} still uses Internet Explorer.`,
      `${name}'s WiFi password is "password".`,
      `${name} laughs at their own texts before sending them.`,
      `${name} puts their phone in a case but still cracks the screen.`,
      `${name} mutes the group but complains when they miss things.`,
      `${name} says "I'm fine" and is never fine.`,
      `${name} asks "is this on?" before every voice message.`,
    ];
    await msg.reply(`😂 *BULLY ALERT*\n\n${lines[Math.floor(Math.random() * lines.length)]}\n\n_Just jokes!_ 😭`);
  },

  // ── Trivia ───────────────────────────────────────────────────────────────
  async trivia(sock, msg) {
    const jid = msg.key.remoteJid;
    const item = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];
    triviaState[jid] = { answer: item.a, hint: item.hint, timeout: Date.now() + 60000 };
    await msg.reply(
      `🎯 *TRIVIA TIME!*\n\n${item.q}\n\n_You have 60 seconds!_\n_Hint: ${item.hint}_`
    );
  },

  checkTrivia(jid, text) {
    const state = triviaState[jid];
    if (!state) return null;
    if (Date.now() > state.timeout) { delete triviaState[jid]; return { expired: true }; }
    const guess = text.trim().toLowerCase();
    if (state.answer.toLowerCase().includes(guess) || guess.includes(state.answer.toLowerCase())) {
      delete triviaState[jid];
      return { correct: true, answer: state.answer };
    }
    return { correct: false };
  },

  // ── Spin the Wheel ───────────────────────────────────────────────────────
  async spinwheel(sock, msg, args) {
    const full = args.join(' ');
    const opts = full.split('|').map(o => o.trim()).filter(Boolean);
    if (opts.length < 2) return msg.reply('❌ Usage: .spinwheel option1 | option2 | option3 ...');
    const winner = opts[Math.floor(Math.random() * opts.length)];
    const display = opts.map((o, i) => `${i + 1}. ${o}`).join('\n');
    await msg.reply(`🎡 *SPIN THE WHEEL!*\n\nOptions:\n${display}\n\n🏆 *Winner: ${winner}*`);
  },

  // ── Lottery ──────────────────────────────────────────────────────────────
  async lottery(sock, msg) {
    const nums = [];
    while (nums.length < 6) {
      const n = Math.floor(Math.random() * 49) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    nums.sort((a, b) => a - b);
    const bonus = Math.floor(Math.random() * 49) + 1;
    await msg.reply(
      `🎱 *LOTTERY NUMBERS*\n\n` +
      `Main: *${nums.join('  ')}*\n` +
      `Bonus Ball: *${bonus}*\n\n` +
      `_Good luck! 🍀_`
    );
  },

  // ── Russian Roulette ─────────────────────────────────────────────────────
  async roulette(sock, msg) {
    const bang = Math.random() < 1 / 6;
    if (bang) {
      await msg.reply('🔫 *CLICK...*\n\n💥 *BANG!* You\'re eliminated! 💀\n\n_Better luck next life._');
    } else {
      await msg.reply('🔫 *CLICK...*\n\n😮‍💨 *Safe!* The chamber was empty. You live another day!\n\n_1 bullet, 6 chambers. You got lucky._');
    }
  },

  // ── Hangman ──────────────────────────────────────────────────────────────
  async hangman(sock, msg) {
    const jid = msg.key.remoteJid;
    const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
    hangmanState[jid] = { word, guessed: [], lives: 6 };
    await msg.reply(this._renderHangman(jid));
  },

  async hangmanguess(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const state = hangmanState[jid];
    if (!state) return msg.reply('❌ No active hangman game. Start one with .hangman');

    const letter = args[0]?.toLowerCase();
    if (!letter || letter.length !== 1 || !/[a-z]/.test(letter)) {
      return msg.reply('❌ Usage: .guess <single letter>');
    }
    if (state.guessed.includes(letter)) return msg.reply(`❌ You already guessed *${letter}*!`);

    state.guessed.push(letter);
    if (!state.word.includes(letter)) state.lives--;

    const won = state.word.split('').every(l => state.guessed.includes(l));
    const lost = state.lives <= 0;

    if (won) {
      delete hangmanState[jid];
      return msg.reply(`🎉 *YOU WIN!*\nThe word was *${state.word.toUpperCase()}*!`);
    }
    if (lost) {
      delete hangmanState[jid];
      return msg.reply(`💀 *GAME OVER!*\nThe word was *${state.word.toUpperCase()}*.\nBetter luck next time!`);
    }
    await msg.reply(this._renderHangman(jid));
  },

  _renderHangman(jid) {
    const state = hangmanState[jid];
    const display = state.word.split('').map(l => state.guessed.includes(l) ? l.toUpperCase() : '_').join(' ');
    const wrong = state.guessed.filter(l => !state.word.includes(l));
    const BODY = ['😵','🦶','🦵','👊','💪','😐'];
    const head = BODY[6 - state.lives] || '😐';
    return (
      `🎮 *HANGMAN*\n\n` +
      `${head} Lives: ${'❤️'.repeat(state.lives)}${'🖤'.repeat(6 - state.lives)}\n\n` +
      `Word: *${display}*\n\n` +
      `Wrong guesses: ${wrong.length ? wrong.join(', ') : 'None'}\n\n` +
      `_Type .guess <letter> to guess!_`
    );
  },

  // ── Word Scramble ────────────────────────────────────────────────────────
  async scramble(sock, msg) {
    const jid = msg.key.remoteJid;
    const word = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
    const shuffled = word.split('').sort(() => Math.random() - 0.5).join('');
    scrambleState[jid] = { word: word.toLowerCase(), timeout: Date.now() + 30000 };
    await msg.reply(`🔀 *WORD SCRAMBLE!*\n\nUnscramble this: *${shuffled}*\n\n_You have 30 seconds! Type your answer._`);
  },

  checkScramble(jid, text) {
    const state = scrambleState[jid];
    if (!state) return null;
    if (Date.now() > state.timeout) { delete scrambleState[jid]; return { expired: true }; }
    if (text.trim().toLowerCase() === state.word) {
      delete scrambleState[jid];
      return { correct: true, answer: state.word };
    }
    return { correct: false };
  },

  // ── High-Low ─────────────────────────────────────────────────────────────
  async highlow(sock, msg) {
    const jid = msg.key.remoteJid;
    const num = Math.floor(Math.random() * 100) + 1;
    highLowState[jid] = { num, attempts: 0 };
    await msg.reply(`🔢 *HIGH-LOW GAME*\n\nI picked a number between *1 and 100*!\nType *.hl <number>* to guess!\n\n_No limit on attempts._`);
  },

  async hlguess(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const state = highLowState[jid];
    if (!state) return msg.reply('❌ No active game. Start with .highlow');
    const guess = parseInt(args[0]);
    if (isNaN(guess)) return msg.reply('❌ Usage: .hl <number>');
    state.attempts++;
    if (guess === state.num) {
      delete highLowState[jid];
      return msg.reply(`🎉 *CORRECT!* The number was *${state.num}* and you got it in *${state.attempts}* ${state.attempts === 1 ? 'guess' : 'guesses'}!`);
    }
    await msg.reply(`${guess > state.num ? '📉 *Lower!*' : '📈 *Higher!*'} Attempt #${state.attempts}`);
  },

  // ── Roman Numeral Converter ───────────────────────────────────────────────
  async roman(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .roman <number or roman numeral>\nExample: .roman 42 or .roman XLII');
    const input = args[0].trim();
    const num = parseInt(input);
    if (!isNaN(num) && num > 0 && num < 4000) {
      const result = toRoman(num);
      return msg.reply(`🏛️ *Roman Numeral*\n\n${num} → *${result}*`);
    }
    // Try to parse as roman
    const parsed = fromRoman(input.toUpperCase());
    if (parsed > 0) {
      return msg.reply(`🏛️ *Roman Numeral*\n\n${input.toUpperCase()} → *${parsed}*`);
    }
    await msg.reply('❌ Invalid input. Provide a number (1-3999) or a valid Roman numeral.');
  },

  // ── Palindrome Check ─────────────────────────────────────────────────────
  async palindrome(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .palindrome <word or phrase>');
    const text = args.join(' ');
    const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isPalin = clean === clean.split('').reverse().join('');
    await msg.reply(`🔄 *PALINDROME CHECK*\n\n"${text}"\n\n${isPalin ? '✅ YES — it reads the same forwards and backwards!' : '❌ NO — not a palindrome.'}`);
  },

  // ── BMI Calculator ───────────────────────────────────────────────────────
  async bmi(sock, msg, args) {
    if (args.length < 2) return msg.reply('Usage: .bmi <weight kg> <height cm>\nExample: .bmi 70 175');
    const weight = parseFloat(args[0]);
    const heightCm = parseFloat(args[1]);
    if (isNaN(weight) || isNaN(heightCm)) return msg.reply('❌ Please provide valid numbers.');
    const h = heightCm / 100;
    const bmi = (weight / (h * h)).toFixed(1);
    const cat = bmi < 18.5 ? 'Underweight 🟡' : bmi < 25 ? 'Normal weight ✅' : bmi < 30 ? 'Overweight 🟠' : 'Obese 🔴';
    await msg.reply(`⚖️ *BMI CALCULATOR*\n\nWeight: ${weight}kg\nHeight: ${heightCm}cm\n\n*BMI: ${bmi}*\nCategory: *${cat}*\n\n_This is a general guide only._`);
  },

  // ── Tip Calculator ───────────────────────────────────────────────────────
  async tip(sock, msg, args) {
    if (args.length < 2) return msg.reply('Usage: .tip <amount> <tip%>\nExample: .tip 50 18');
    const amount = parseFloat(args[0]);
    const pct = parseFloat(args[1]);
    if (isNaN(amount) || isNaN(pct)) return msg.reply('❌ Invalid numbers.');
    const tipAmt = (amount * pct / 100).toFixed(2);
    const total = (amount + parseFloat(tipAmt)).toFixed(2);
    await msg.reply(`💰 *TIP CALCULATOR*\n\nBill: $${amount.toFixed(2)}\nTip (${pct}%): *$${tipAmt}*\nTotal: *$${total}*`);
  },

  // ── World Clock ──────────────────────────────────────────────────────────
  async worldclock(sock, msg) {
    const zones = [
      { city: 'Toronto', tz: 'America/Toronto' },
      { city: 'New York', tz: 'America/New_York' },
      { city: 'London', tz: 'Europe/London' },
      { city: 'Lagos', tz: 'Africa/Lagos' },
      { city: 'Dubai', tz: 'Asia/Dubai' },
      { city: 'Tokyo', tz: 'Asia/Tokyo' },
      { city: 'Sydney', tz: 'Australia/Sydney' },
    ];
    const lines = zones.map(z => {
      const time = new Date().toLocaleTimeString('en-US', { timeZone: z.tz, hour: '2-digit', minute: '2-digit', hour12: true });
      const date = new Date().toLocaleDateString('en-US', { timeZone: z.tz, weekday: 'short', month: 'short', day: 'numeric' });
      return `┃ 🌍 ${z.city.padEnd(10)} ${time} — ${date}`;
    });
    await msg.reply(`╭━━━〔 🕐 WORLD CLOCK 〕━━━⬣\n${lines.join('\n')}\n╰━━━━━━━━━━━━━━━━━━⬣`);
  },

  // ── Days Until ───────────────────────────────────────────────────────────
  async daysuntil(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .daysuntil <YYYY-MM-DD>\nExample: .daysuntil 2025-12-25');
    const target = new Date(args[0]);
    if (isNaN(target.getTime())) return msg.reply('❌ Invalid date. Use format YYYY-MM-DD');
    const now = new Date();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return msg.reply(`📅 That date was *${Math.abs(diff)} days ago*.`);
    if (diff === 0) return msg.reply('📅 That date is *TODAY!* 🎉');
    await msg.reply(`📅 *Days Until ${args[0]}*\n\n*${diff} days* to go!`);
  },

  // ── Word Count ───────────────────────────────────────────────────────────
  async wordcount(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .wordcount <text>');
    const text = args.join(' ');
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sentences = text.split(/[.!?]+/).filter(Boolean).length;
    await msg.reply(
      `📝 *WORD COUNT*\n\n` +
      `Words: *${words}*\n` +
      `Characters: *${chars}*\n` +
      `Characters (no spaces): *${charsNoSpace}*\n` +
      `Sentences: *${sentences}*`
    );
  },

  // ── Lorem Ipsum ──────────────────────────────────────────────────────────
  async lorem(sock, msg, args) {
    const count = Math.min(parseInt(args[0]) || 1, 5);
    const paragraphs = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.',
    ];
    const result = paragraphs.slice(0, count).join('\n\n');
    await msg.reply(`📄 *Lorem Ipsum (${count} paragraph${count > 1 ? 's' : ''})*\n\n${result}`);
  },

  // ── Mock Text (SpongeBob) ─────────────────────────────────────────────────
  async mocktext(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .mocktext <text>');
    const text = args.join(' ');
    const mocked = text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
    await msg.reply(`🧽 *${mocked}*`);
  },

  // ── Shuffle Words ────────────────────────────────────────────────────────
  async shuffle(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .shuffle <word1 word2 word3 ...>');
    const words = [...args].sort(() => Math.random() - 0.5);
    await msg.reply(`🔀 *SHUFFLED*\n\n${words.join(' ')}`);
  },

  // ── Debate ────────────────────────────────────────────────────────────────
  async debate(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .debate <topic>\nExample: .debate social media is harmful');
    await msg.reply('_Preparing both sides of the debate..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You are a debate coach. Present BOTH sides of the argument fairly in 2-3 points each. Format with WhatsApp markdown: *bold* for key arguments, use ✅ for PRO and ❌ for CON. No tables, no HTML. Keep it concise.' },
        { role: 'user', content: `Debate topic: "${args.join(' ')}"` },
      ]);
      await msg.reply(`⚖️ *DEBATE: ${args.join(' ').toUpperCase()}*\n\n${result}\n\n_Powered by Dollar AI_`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Quiz ─────────────────────────────────────────────────────────────────
  async quiz(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .quiz <topic>\nExample: .quiz astronomy');
    await msg.reply('_Generating quiz question..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Generate ONE multiple-choice quiz question about the given topic. Format: Question, then A) B) C) D) options, then on a new line "Answer: X) correct option". Use WhatsApp formatting only.' },
        { role: 'user', content: `Topic: ${args.join(' ')}` },
      ]);
      await msg.reply(`📚 *QUIZ TIME!*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Pickup Line ───────────────────────────────────────────────────────────
  async pickup(sock, msg, args) {
    const target = args.join(' ') || 'you';
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You generate clever, funny, and creative pickup lines. Make them original and charming, not vulgar. WhatsApp formatting only.' },
        { role: 'user', content: `Generate a pickup line for someone named "${target}"` },
      ]);
      await msg.reply(`😏 *PICKUP LINE*\n\n${result}`);
    } catch (e) {
      await msg.reply('Did it hurt? When you fell from heaven? 😇');
    }
  },

  // ── Bedtime Story ─────────────────────────────────────────────────────────
  async bedtime(sock, msg, args) {
    const topic = args.join(' ') || 'a brave little star';
    await msg.reply('_Once upon a time... (writing your story)_');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Write a short, sweet bedtime story (100-150 words) suitable for all ages. Begin with "Once upon a time..." End with a peaceful moral. WhatsApp formatting — *bold* for character names.' },
        { role: 'user', content: `Write a bedtime story about: ${topic}` },
      ]);
      await msg.reply(`🌙 *BEDTIME STORY*\n\n${result}\n\n_Sweet dreams! 🌟_`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Explain Like I'm 5 ────────────────────────────────────────────────────
  async eli5(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .eli5 <topic>\nExample: .eli5 black holes');
    await msg.reply('_Simplifying for a 5-year-old..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You explain complex topics like you\'re talking to a 5-year-old. Use very simple words, fun analogies, and short sentences. WhatsApp formatting: *bold* for key words. Keep it under 100 words.' },
        { role: 'user', content: `Explain "${args.join(' ')}" like I\'m 5 years old.` },
      ]);
      await msg.reply(`👶 *ELI5: ${args.join(' ')}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Acronym ───────────────────────────────────────────────────────────────
  async acronym(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .acronym <word>\nExample: .acronym LIFE');
    const word = args[0].toUpperCase().replace(/[^A-Z]/g, '');
    if (word.length < 2 || word.length > 10) return msg.reply('❌ Word must be 2-10 letters.');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Create a funny, creative, or motivational acronym from the given letters. Each letter starts a word. Format: one word per letter. WhatsApp formatting only.' },
        { role: 'user', content: `Create an acronym for: ${word}` },
      ]);
      await msg.reply(`🔤 *ACRONYM: ${word}*\n\n${result}`);
    } catch (e) {
      // Fallback: simple acronym
      const words = ['Amazing','Bold','Creative','Dynamic','Energetic','Fearless','Glorious','Heroic','Inspiring','Joyful','Kind','Legendary'];
      const out = word.split('').map(l => `*${l}* - ${words[Math.floor(Math.random() * words.length)]}`).join('\n');
      await msg.reply(`🔤 *ACRONYM: ${word}*\n\n${out}`);
    }
  },

  // ── Haiku ─────────────────────────────────────────────────────────────────
  async haiku(sock, msg, args) {
    const topic = args.join(' ') || 'the night sky';
    await msg.reply('_Writing your haiku (5-7-5)..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Write a haiku (3 lines: 5 syllables, 7 syllables, 5 syllables) about the given topic. Label each line. WhatsApp formatting: _italic_ for the haiku lines.' },
        { role: 'user', content: `Topic: ${topic}` },
      ]);
      await msg.reply(`🌸 *HAIKU: ${topic}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Caption Generator ─────────────────────────────────────────────────────
  async caption(sock, msg, args) {
    const topic = args.join(' ') || 'good vibes';
    await msg.reply('_Generating caption..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Generate 3 creative, catchy social media captions for the given topic. Include relevant emojis. Keep each caption under 2 sentences. WhatsApp formatting only.' },
        { role: 'user', content: `Topic: ${topic}` },
      ]);
      await msg.reply(`📸 *CAPTION IDEAS: ${topic}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── AI Prank Idea ─────────────────────────────────────────────────────────
  async prank(sock, msg, args) {
    const target = args.join(' ') || 'your friend';
    await msg.reply('_Cooking up a harmless prank..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You suggest funny, harmless, creative pranks that don\'t cause harm or property damage. Keep it light and fun. WhatsApp formatting only.' },
        { role: 'user', content: `Suggest a harmless funny prank for ${target}` },
      ]);
      await msg.reply(`😈 *PRANK IDEA*\n\n${result}\n\n_Prank responsibly! 😂_`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Mythology Info ───────────────────────────────────────────────────────
  async mythology(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .mythology <character>\nExample: .mythology Zeus');
    await msg.reply('_Looking up mythology..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You are a mythology expert. Give a detailed but concise overview of the mythological character — origin, powers, myths, and significance. WhatsApp formatting: *bold* for key terms. No tables, no HTML.' },
        { role: 'user', content: `Tell me about the mythological figure: ${args.join(' ')}` },
      ]);
      await msg.reply(`🏛️ *MYTHOLOGY: ${args.join(' ')}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Periodic Element ─────────────────────────────────────────────────────
  async element(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .element <symbol or name>\nExample: .element Au or .element Gold');
    await msg.reply('_Fetching element data..._');
    try {
      const res = await fetch(`https://periodictable.p.rapidapi.com/`, {
        headers: { 'X-RapidAPI-Host': 'periodictable.p.rapidapi.com' }
      }).catch(() => null);

      // Use AI fallback
      const result = await textGenerate([
        { role: 'system', content: 'You are a chemistry expert. Provide the element\'s: full name, symbol, atomic number, atomic mass, category, boiling/melting point, and one interesting fact. Use *bold* for values. WhatsApp formatting only. No tables.' },
        { role: 'user', content: `Periodic table element: ${args.join(' ')}` },
      ]);
      await msg.reply(`⚗️ *ELEMENT: ${args.join(' ').toUpperCase()}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Zodiac Reading ───────────────────────────────────────────────────────
  async zodiacread(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .zodiac2 <sign>\nSigns: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces');
    const sign = args[0];
    await msg.reply(`_Reading the stars for ${sign}..._`);
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You are an astrologer. Give a detailed daily horoscope and personality overview for the zodiac sign. Include: love, career, health, lucky number, lucky color. WhatsApp formatting: *bold* for categories. No tables.' },
        { role: 'user', content: `Give a detailed horoscope for ${sign}` },
      ]);
      await msg.reply(`⭐ *${sign.toUpperCase()} HOROSCOPE*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Numerology ───────────────────────────────────────────────────────────
  async numerology(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .numerology <your name>\nExample: .numerology Dollar');
    const name = args.join(' ');
    const num = name.toUpperCase().split('').reduce((acc, c) => {
      const v = c.charCodeAt(0) - 64;
      return v > 0 && v <= 26 ? acc + v : acc;
    }, 0);
    const lifeNum = num.toString().split('').reduce((a, b) => a + parseInt(b), 0) % 9 || 9;
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You are a numerology expert. Based on the life number provided, give insights about personality, strengths, challenges, and destiny. WhatsApp formatting: *bold* for key traits.' },
        { role: 'user', content: `Life number ${lifeNum} for the name "${name}"` },
      ]);
      await msg.reply(`🔢 *NUMEROLOGY: ${name}*\n\n*Life Number: ${lifeNum}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`🔢 *${name}'s* Life Number is *${lifeNum}*!`);
    }
  },

  // ── Dream Interpretation ──────────────────────────────────────────────────
  async dreaminterp(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .dreaminterp <describe your dream>');
    await msg.reply('_Consulting the dream oracle..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You are a dream interpreter with knowledge of psychology and symbolism. Interpret the dream described, covering symbols, emotions, and what the subconscious might be saying. WhatsApp formatting: *bold* for key symbols. Keep it mystical but grounded.' },
        { role: 'user', content: `Interpret this dream: ${args.join(' ')}` },
      ]);
      await msg.reply(`💭 *DREAM INTERPRETATION*\n\n${result}\n\n_Remember: Dreams reflect your inner world. 🌙_`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Age Calculator ────────────────────────────────────────────────────────
  async age(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .age <YYYY-MM-DD>\nExample: .age 2000-05-15');
    const birth = new Date(args[0]);
    if (isNaN(birth.getTime())) return msg.reply('❌ Invalid date. Use YYYY-MM-DD format.');
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) { months--; days += 30; }
    if (months < 0) { years--; months += 12; }
    const totalDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
    await msg.reply(
      `🎂 *AGE CALCULATOR*\n\n` +
      `Birthdate: ${args[0]}\n\n` +
      `*${years} years, ${months} months, ${days} days*\n\n` +
      `That's *${totalDays.toLocaleString()} days* old! 🎉`
    );
  },

  // ── Flag by Country ───────────────────────────────────────────────────────
  async flag(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .flag <country name>\nExample: .flag Nigeria');
    const country = args.join(' ');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Give the flag emoji and 3 quick facts about the country: capital, population, and one interesting fact. Keep it very brief. WhatsApp formatting only.' },
        { role: 'user', content: `Country: ${country}` },
      ]);
      await msg.reply(`🌍 *${country.toUpperCase()}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Timezone Info ─────────────────────────────────────────────────────────
  async timezone(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .timezone <city>\nExample: .timezone Lagos');
    const city = args.join(' ');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'State the timezone of the given city, current UTC offset, and current approximate time there. Also name the country. WhatsApp formatting only.' },
        { role: 'user', content: `What is the timezone of ${city}?` },
      ]);
      await msg.reply(`🕐 *TIMEZONE: ${city}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── This or That ─────────────────────────────────────────────────────────
  async thisorthat(sock, msg) {
    const pairs = [
      ['Netflix','YouTube'],['Coffee','Tea'],['Beach','Mountains'],
      ['Dogs','Cats'],['Summer','Winter'],['Pizza','Burger'],
      ['Morning person','Night owl'],['Texting','Calling'],
      ['TikTok','Instagram'],['Spicy food','Sweet food'],
    ];
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    await msg.reply(`🎯 *THIS OR THAT?*\n\n*${pair[0]}* — or — *${pair[1]}*\n\nPick one! 👇`);
  },

  // ── Bodycount Meter (fun) ─────────────────────────────────────────────────
  async bodycount(sock, msg, args) {
    const name = args.join(' ') || 'you';
    const count = Math.floor(Math.random() * 20);
    const labels = ['Pure soul 😇','Still innocent 😌','Normal range 😐','Getting around 😏','Legends never die 💀'];
    const label = labels[Math.min(Math.floor(count / 4), 4)];
    await msg.reply(`💀 *BODYCOUNT METER*\n\n*${name}*'s body count: *${count}*\n\n_Verdict: ${label}_\n\n_Results are randomly generated for fun!_ 😭`);
  },

  // ── Typing Test Prompt ────────────────────────────────────────────────────
  async typingtest(sock, msg) {
    const sentences = [
      'The quick brown fox jumps over the lazy dog.',
      'Pack my box with five dozen liquor jugs.',
      'How vexingly quick daft zebras jump!',
      'The five boxing wizards jump quickly.',
      'Sphinx of black quartz, judge my vow.',
    ];
    const sent = sentences[Math.floor(Math.random() * sentences.length)];
    await msg.reply(`⌨️ *TYPING TEST*\n\nType this exactly:\n\n_"${sent}"_\n\n_Reply with the sentence to test your accuracy!_`);
  },

  // ── Conspiracy Theory Generator ────────────────────────────────────────────
  async conspiracy(sock, msg) {
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Generate a completely fictional, absurd, and humorous conspiracy theory. Make it ridiculous and obviously fake. No real harmful conspiracies. End with "🚨 THIS IS PURELY FICTIONAL FOR ENTERTAINMENT". WhatsApp formatting only.' },
        { role: 'user', content: 'Give me a funny fake conspiracy theory' },
      ]);
      await msg.reply(`🕵️ *CONSPIRACY THEORY*\n\n${result}`);
    } catch (e) {
      await msg.reply('🕵️ The government controls your toaster to monitor your bread choices. Wake up sheeple! 🍞\n\n_🚨 THIS IS PURELY FICTIONAL FOR ENTERTAINMENT_');
    }
  },

  // ── Superpowers ──────────────────────────────────────────────────────────
  async superpower(sock, msg, args) {
    const name = args.join(' ') || 'you';
    const powers = [
      'Telepathy 🧠', 'Invisibility 👻', 'Super speed ⚡', 'Flight ✈️',
      'Time control ⏰', 'Telekinesis 🌀', 'Healing factor 💚', 'Fire control 🔥',
      'Ice control 🧊', 'Super strength 💪', 'Shape-shifting 🦎', 'Electricity ⚡',
    ];
    const power = powers[Math.floor(Math.random() * powers.length)];
    try {
      const desc = await textGenerate([
        { role: 'system', content: 'In 2 short sentences, describe what this superpower would be like for this person. Be fun and creative. WhatsApp formatting only.' },
        { role: 'user', content: `${name}'s superpower is ${power}` },
      ]);
      await msg.reply(`🦸 *SUPERPOWER*\n\n*${name}* got: *${power}*\n\n${desc}`);
    } catch (e) {
      await msg.reply(`🦸 *${name}*'s superpower is: *${power}*\n\n_Use your powers wisely!_`);
    }
  },

  // ── Aesthetic Bio ─────────────────────────────────────────────────────────
  async bio(sock, msg, args) {
    const name = args.join(' ') || 'Mystery Person';
    await msg.reply('_Crafting your bio..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Create a fun, aesthetic, creative WhatsApp/Instagram bio for the person. Include vibe, personality hints, and 3 emojis. Keep it under 3 lines. No hashtags.' },
        { role: 'user', content: `Create a cool bio for: ${name}` },
      ]);
      await msg.reply(`✨ *BIO FOR ${name.toUpperCase()}*\n\n${result}`);
    } catch (e) {
      await msg.reply(`Error: ${e.message}`);
    }
  },

  // ── Fortune Cookie ────────────────────────────────────────────────────────
  async fortune(sock, msg) {
    const fortunes = [
      'Your kindness will be rewarded when you least expect it.',
      'The answer you seek is closer than you think.',
      'Today is a great day to try something new.',
      'A surprise is waiting just around the corner.',
      'Your hard work will soon pay off in unexpected ways.',
      'The best is yet to come — keep going.',
      'Someone is thinking about you right now.',
      'A small act of courage will change everything.',
      'You will find what you are looking for.',
      'Good things are already on their way to you.',
    ];
    const lucky = Array.from({length:6}, () => Math.floor(Math.random()*49)+1).join(' · ');
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    await msg.reply(
      `🥠 *FORTUNE COOKIE*\n\n_"${fortune}"_\n\n🍀 *Lucky numbers:* ${lucky}\n🌟 *Lucky color:* ${['Gold','Blue','Red','Green','Purple','Silver'][Math.floor(Math.random()*6)]}`
    );
  },

  // ── Rap Generator ─────────────────────────────────────────────────────────
  async rap(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .rap <topic or name>\nExample: .rap my life');
    const topic = args.join(' ');
    await msg.reply('_🎤 Spitting bars..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You are a rap lyricist. Write a short rap verse (8 lines, must rhyme AABB or ABAB). Keep it clean, fun, and creative. WhatsApp formatting: *bold* the rhyming words. No explicit content.' },
        { role: 'user', content: `Write a rap about: ${topic}` },
      ]);
      await msg.reply(`🎤 *RAP: ${topic.toUpperCase()}*\n\n${result}\n\n_🎵 Bars by Dollar AI_`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Gen Z Translator ──────────────────────────────────────────────────────
  async genz(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .genz <text to translate>\nExample: .genz I am very happy today');
    const text = args.join(' ');
    await msg.reply('_no cap translating fr fr..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Translate the given text into Gen Z slang. Use terms like: no cap, fr fr, bussin, slay, lowkey, highkey, vibe, sheesh, periodt, snatched, rent free, understood the assignment, ate that, main character, it\'s giving, bestie, ngl. Keep it fun. WhatsApp formatting only.' },
        { role: 'user', content: `Translate to Gen Z: ${text}` },
      ]);
      await msg.reply(`💅 *GEN Z TRANSLATION*\n\n*Original:* ${text}\n\n*Gen Z:* ${result}`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Villain Backstory ─────────────────────────────────────────────────────
  async villain(sock, msg, args) {
    const name = args.join(' ') || 'the mysterious one';
    await msg.reply('_🦹 Crafting a dark origin story..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Write a dramatic, theatrical villain origin story in 4-5 sentences. Make it over-the-top dramatic, funny, and epic. Use *bold* for dramatic moments. WhatsApp formatting only.' },
        { role: 'user', content: `Write a villain backstory for: ${name}` },
      ]);
      await msg.reply(`🦹 *VILLAIN ORIGIN: ${name.toUpperCase()}*\n\n${result}\n\n_Muhahaha! 😈_`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Hero Backstory ────────────────────────────────────────────────────────
  async hero(sock, msg, args) {
    const name = args.join(' ') || 'the chosen one';
    await msg.reply('_🦸 Writing your epic origin..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Write a dramatic, inspiring hero origin story in 4-5 sentences. Make it epic, motivating, and exciting. Use *bold* for heroic moments. WhatsApp formatting only.' },
        { role: 'user', content: `Write a hero backstory for: ${name}` },
      ]);
      await msg.reply(`🦸 *HERO ORIGIN: ${name.toUpperCase()}*\n\n${result}\n\n_Rise up, hero! ⚡_`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Emojify Text ──────────────────────────────────────────────────────────
  async emojify(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .emojify <text>\nExample: .emojify I love pizza and music');
    const text = args.join(' ');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Add relevant emojis after key words in the text to make it more expressive. Keep the original words, just add emojis. Do not change the sentence structure.' },
        { role: 'user', content: `Emojify this text: ${text}` },
      ]);
      await msg.reply(`✨ *EMOJIFIED*\n\n${result}`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Love Calculator ───────────────────────────────────────────────────────
  async lovecalc(sock, msg, args) {
    if (args.length < 2) return msg.reply('Usage: .lovecalc <name1> and <name2>\nExample: .lovecalc John and Jane');
    const full = args.join(' ');
    const andIdx = args.findIndex(a => a.toLowerCase() === 'and');
    const name1 = andIdx > 0 ? args.slice(0, andIdx).join(' ') : args[0];
    const name2 = andIdx > 0 ? args.slice(andIdx + 1).join(' ') : args.slice(1).join(' ');
    const score = Math.floor(Math.random() * 51) + 50;
    const hearts = '❤️'.repeat(Math.floor(score / 20)) + '🖤'.repeat(5 - Math.floor(score / 20));
    const levels = [
      [50, 60, 'Acquaintances 🤝', 'Not much chemistry yet, but who knows!'],
      [60, 75, 'Good Friends 💛', 'A solid foundation — friendship is love too!'],
      [75, 88, 'Potential 💕', 'Something special is brewing between you two!'],
      [88, 96, 'Soulmates 💖', 'You two are made for each other!'],
      [96, 101, 'Twin Flames 🔥💞', 'Legendary love — the universe shipped this!'],
    ];
    const [, , label, desc] = levels.find(([lo, hi]) => score >= lo && score < hi) || levels[0];
    await msg.reply(
      `💘 *LOVE CALCULATOR*\n\n` +
      `*${name1}* ❤️ *${name2}*\n\n` +
      `${hearts}\n\n` +
      `💯 *Score:* ${score}%\n` +
      `💑 *Status:* ${label}\n\n` +
      `_${desc}_\n\n_Results purely for fun! 😄_`
    );
  },

  // ── Two Truths One Lie ────────────────────────────────────────────────────
  async twotruth(sock, msg, args) {
    const topic = args.join(' ') || 'random';
    await msg.reply('_🎭 Generating two truths and a lie..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Generate a "Two Truths and a Lie" game. Provide exactly 3 statements (2 true, 1 false) about the given topic. Number them 1, 2, 3. Do NOT reveal which is the lie. Use *bold* for the statement numbers. The lie should be subtle and believable. WhatsApp formatting only.' },
        { role: 'user', content: `Two truths and a lie about: ${topic}` },
      ]);
      await msg.reply(
        `🎭 *TWO TRUTHS & A LIE*\n\n` +
        `Topic: *${topic}*\n\n` +
        `${result}\n\n` +
        `_Which one is the lie? Reply with 1, 2, or 3!_`
      );
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Dark Humor ────────────────────────────────────────────────────────────
  async darkhumor(sock, msg) {
    await msg.reply('_💀 Loading dark humor..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Tell one dark humor joke. Keep it clever, not offensive or targeting any group. More absurdist/ironic than mean. WhatsApp formatting only.' },
        { role: 'user', content: 'Tell me a dark humor joke.' },
      ]);
      await msg.reply(`💀 *DARK HUMOR*\n\n${result}\n\n_😅 Too dark? My bad._`);
    } catch (e) {
      const fallbacks = [
        "I told my doctor I broke my arm in two places. He told me to stop going to those places. 💀",
        "I'm reading a book about anti-gravity. It's impossible to put down. 💀",
        "My therapist says I have trouble accepting things I can't control. We'll see about that. 💀",
      ];
      await msg.reply(`💀 *DARK HUMOR*\n\n${fallbacks[Math.floor(Math.random()*fallbacks.length)]}`);
    }
  },

  // ── Relationship Advice ───────────────────────────────────────────────────
  async advice2(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .advice2 <your situation>\nExample: .advice2 my crush keeps leaving me on read');
    const situation = args.join(' ');
    await msg.reply('_💭 Thinking about your situation..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'You are a wise, empathetic relationship/life advisor. Give genuine, thoughtful advice for the given situation. Be honest but kind, practical, and supportive. Use *bold* for key advice points. Keep it concise (3-5 points max). WhatsApp formatting only.' },
        { role: 'user', content: `I need advice: ${situation}` },
      ]);
      await msg.reply(`💬 *ADVICE*\n\n${result}\n\n_💙 Wishing you the best!_`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Roast Battle ──────────────────────────────────────────────────────────
  async roastbattle(sock, msg, args) {
    if (args.length < 2) return msg.reply('Usage: .roastbattle <name1> <name2>\nExample: .roastbattle John Jane');
    const [name1, name2] = [args[0], args[1]];
    await msg.reply('_🔥 Roast battle starting..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Write a fun, playful roast battle between two people. 2 roasts each, alternating. Keep it lighthearted and funny, not mean-spirited. Use *bold* for names. WhatsApp formatting only.' },
        { role: 'user', content: `Write a roast battle between ${name1} and ${name2}` },
      ]);
      await msg.reply(`🔥 *ROAST BATTLE*\n*${name1}* vs *${name2}*\n\n${result}\n\n_🏆 Crowd decides the winner!_`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Friendship Level ──────────────────────────────────────────────────────
  async friendlevel(sock, msg, args) {
    if (args.length < 2) return msg.reply('Usage: .friendlevel <name1> <name2>\nExample: .friendlevel John Jane');
    const [n1, n2] = [args[0], args[1]];
    const score = Math.floor(Math.random() * 61) + 40;
    const bars = '█'.repeat(Math.floor(score/10)) + '░'.repeat(10 - Math.floor(score/10));
    const levels = [
      [40, 55, 'Strangers 🚶', 'Barely know each other.'],
      [55, 70, 'Acquaintances 🤝', 'Know each other, not close.'],
      [70, 85, 'Good Friends 😊', 'Solid friendship!'],
      [85, 95, 'Best Friends 💛', 'Thick as thieves!'],
      [95, 101, 'LEGENDARY 🌟', 'Unbreakable bond — ride or die!'],
    ];
    const [,,label,desc] = levels.find(([lo,hi]) => score >= lo && score < hi) || levels[0];
    await msg.reply(
      `👥 *FRIENDSHIP METER*\n\n*${n1}* & *${n2}*\n\n[${bars}] ${score}%\n\n🏷️ *Level:* ${label}\n_${desc}_`
    );
  },

  // ── Word of the Day ───────────────────────────────────────────────────────
  async wotd(sock, msg) {
    await msg.reply('_📚 Fetching word of the day..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Give a random interesting English word. Format: *Word*, /pronunciation/, (part of speech)\nDefinition: ...\nExample: ...\nFun fact: ...\nWhatsApp formatting only.' },
        { role: 'user', content: 'Give me an interesting word of the day.' },
      ]);
      await msg.reply(`📚 *WORD OF THE DAY*\n\n${result}`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Personality Test ──────────────────────────────────────────────────────
  async personality(sock, msg, args) {
    const name = args.join(' ') || 'you';
    const types = [
      ['INTJ', 'The Architect 🏛️', 'Strategic, independent, and determined. You see the big picture and execute with precision.'],
      ['ENFP', 'The Campaigner 🌈', 'Enthusiastic, creative, and free-spirited. You see life as full of possibilities.'],
      ['ISTP', 'The Virtuoso 🔧', 'Bold, practical, and masters of tools. You love exploring with your hands and eyes.'],
      ['ESFJ', 'The Consul 🤝', 'Caring, social, and popular. You love supporting others and making everyone feel included.'],
      ['INFP', 'The Mediator 🌙', 'Poetic, kind, and idealistic. You believe in growth and always strive to improve.'],
      ['ENTJ', 'The Commander ⚔️', 'Bold, imaginative, strong-willed. You always find a way — or make one.'],
      ['ISFJ', 'The Defender 🛡️', 'Warm and dedicated protectors. You cherish safety, stability, and loyalty.'],
      ['ENTP', 'The Debater 💡', 'Smart and curious. You love a battle of wits and won\'t back down from a challenge.'],
    ];
    const [mbti, title, desc] = types[Math.floor(Math.random() * types.length)];
    await msg.reply(
      `🧠 *PERSONALITY READING*\n\n*${name}* vibes as:\n\n*${mbti} — ${title}*\n\n${desc}\n\n_This is a fun random result!_`
    );
  },

  // ── Random Challenge ──────────────────────────────────────────────────────
  async challenge(sock, msg) {
    const challenges = [
      'Talk in rhymes for the next 5 messages 🎤',
      'React with an emoji to every message for 10 minutes 😂',
      'Reply to everything with only one word for 5 minutes 🤐',
      'Compliment every person who sends a message next 🥰',
      'Start every message with "Sire," for the next 3 messages 👑',
      'Send a voice note instead of text for your next 3 replies 🎙️',
      'Add "...or else 😈" to the end of your next 5 messages',
      'Speak only in questions for the next 5 minutes ❓',
      'Put a random emoji at the start of every message for 5 mins 🎲',
      'Reply to everything with "That\'s what SHE said" for 3 messages 😭',
    ];
    const c = challenges[Math.floor(Math.random() * challenges.length)];
    await msg.reply(`🎯 *RANDOM CHALLENGE*\n\n${c}\n\n_Who dares? 😈_`);
  },

  // ── Rate Anything ─────────────────────────────────────────────────────────
  async rate(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .rate <anything>\nExample: .rate pizza');
    const thing = args.join(' ');
    const score = (Math.random() * 4 + 6).toFixed(1);
    const stars = '⭐'.repeat(Math.round(score/2));
    await msg.reply('_🔍 Analyzing..._');
    try {
      const verdict = await textGenerate([
        { role: 'system', content: 'Rate the given thing in 1-2 sentences, being funny and opinionated. WhatsApp formatting only.' },
        { role: 'user', content: `Rate: ${thing}` },
      ]);
      await msg.reply(`📊 *RATING: ${thing.toUpperCase()}*\n\n${stars}\n*Score: ${score}/10*\n\n${verdict}`);
    } catch (e) {
      await msg.reply(`📊 *${thing}*: ${score}/10 ${stars}`);
    }
  },

  // ── Name Meaning ──────────────────────────────────────────────────────────
  async namemeaning(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .namemeaning <name>\nExample: .namemeaning Dollar');
    const name = args.join(' ');
    await msg.reply('_📖 Looking up name meaning..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Explain the meaning, origin, and personality traits associated with this name. Format: *Name*, *Origin*, *Meaning*, *Personality*, *Famous people with this name*. WhatsApp formatting only.' },
        { role: 'user', content: `What is the meaning of the name: ${name}` },
      ]);
      await msg.reply(`📖 *NAME MEANING*\n\n${result}`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Tongue Twister ────────────────────────────────────────────────────────
  async tonguetwister(sock, msg) {
    const twisters = [
      'She sells seashells by the seashore. The shells she sells are surely seashells.',
      'How much wood would a woodchuck chuck if a woodchuck could chuck wood?',
      'Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked.',
      'Betty Botter bought some butter, but she said the butter\'s bitter!',
      'Red lorry, yellow lorry, red lorry, yellow lorry.',
      'Unique New York, unique New York, you know you need unique New York.',
      'Fuzzy Wuzzy was a bear. Fuzzy Wuzzy had no hair. Fuzzy Wuzzy wasn\'t fuzzy, was he?',
    ];
    const t = twisters[Math.floor(Math.random() * twisters.length)];
    await msg.reply(`👅 *TONGUE TWISTER*\n\n_"${t}"_\n\nSay that 3 times fast! 😂`);
  },

  // ── Roast Me (self-deprecating) ───────────────────────────────────────────
  async roastself(sock, msg, args) {
    const name = args.join(' ') || 'yourself';
    await msg.reply('_🔥 Preparing your personal roast..._');
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Write 3 funny, self-deprecating one-liners as if the person is roasting themselves. Keep it light, funny, not mean. Use *bold* for punchlines. WhatsApp formatting only.' },
        { role: 'user', content: `Write a self-roast for: ${name}` },
      ]);
      await msg.reply(`🔥 *SELF-ROAST: ${name.toUpperCase()}*\n\n${result}\n\n_😂 Gotta laugh at yourself sometimes!_`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },

  // ── Daily Mission ─────────────────────────────────────────────────────────
  async mission(sock, msg) {
    const missions = [
      '💪 Do 20 push-ups right now. No excuses.',
      '📵 Put your phone down for 1 hour. Go outside.',
      '😊 Compliment someone sincerely today.',
      '💧 Drink 3 glasses of water in the next hour.',
      '📚 Read 5 pages of any book today.',
      '🧹 Clean one area of your room you\'ve been ignoring.',
      '📞 Call or text a friend you haven\'t spoken to in a while.',
      '🚶 Take a 10-minute walk. Fresh air only.',
      '✍️ Write down 3 things you\'re grateful for.',
      '🛌 Sleep before midnight tonight. Non-negotiable.',
      '😤 Say no to one thing today that wastes your time.',
      '🎯 Set one small goal and complete it before bed.',
    ];
    const m = missions[Math.floor(Math.random() * missions.length)];
    await msg.reply(`🎯 *YOUR DAILY MISSION*\n\n${m}\n\n_Accept the mission? 💪_`);
  },

  // ── Yes or No Oracle ──────────────────────────────────────────────────────
  async yesorno(sock, msg, args) {
    if (!args.length) return msg.reply('Usage: .yesorno <your question>\nExample: .yesorno will I pass my exam?');
    const q = args.join(' ');
    const answers = [
      ['YES ✅', 'Absolutely — the universe agrees!'],
      ['NO ❌', 'The signs say no — trust the process.'],
      ['MAYBE 🤷', 'The oracle is uncertain. Flip a coin.'],
      ['DEFINITELY YES 🔥', '100% — don\'t even question it.'],
      ['DEFINITELY NO 💀', 'Hard no. Let it go.'],
      ['ASK AGAIN LATER 🔮', 'The stars need more time.'],
    ];
    const [verdict, flavor] = answers[Math.floor(Math.random() * answers.length)];
    await msg.reply(`🔮 *YES OR NO ORACLE*\n\n_Q: ${q}_\n\n*${verdict}*\n\n_${flavor}_`);
  },

  // ── Random Fact by Category ───────────────────────────────────────────────
  async factcat(sock, msg, args) {
    const cat = args[0]?.toLowerCase() || 'random';
    const cats = ['science','history','animals','space','food','technology','psychology','geography'];
    if (args[0] && !cats.includes(cat)) {
      return msg.reply(`Usage: .factcat [category]\nCategories: ${cats.join(', ')}`);
    }
    await msg.reply(`_📚 Fetching a ${cat} fact..._`);
    try {
      const result = await textGenerate([
        { role: 'system', content: 'Give one fascinating, mind-blowing fact about the given topic. Keep it short (2-3 sentences). Start with the fact, then explain why it\'s interesting. WhatsApp formatting: *bold* the key fact.' },
        { role: 'user', content: `Give me a fascinating ${cat} fact.` },
      ]);
      await msg.reply(`💡 *${cat.toUpperCase()} FACT*\n\n${result}`);
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },
};

// ── Roman numeral helpers ─────────────────────────────────────────────────
function toRoman(num) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}

function fromRoman(str) {
  const map = { M:1000,D:500,C:100,L:50,X:10,V:5,I:1 };
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const cur = map[str[i]] || 0;
    const next = map[str[i+1]] || 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

module.exports = morefun;
