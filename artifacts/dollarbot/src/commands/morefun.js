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
