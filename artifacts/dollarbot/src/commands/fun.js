const fetch = require('node-fetch');

const jokes = [
  "Why don't scientists trust atoms? Because they make up everything! 😂",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "Why do cows wear bells? Because their horns don't work! 🐄",
  "What do you call a fish with no eyes? A fsh! 🐟",
  "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "Why don't eggs tell jokes? They'd crack each other up!",
  "What do you call cheese that isn't yours? Nacho cheese! 🧀",
  "Why did the bicycle fall over? Because it was two-tired! 🚲",
  "What do you get when you cross a snowman and a vampire? Frostbite! ❄️",
];

const dadjokes = [
  "I'm afraid for the calendar. Its days are numbered.",
  "My wife said I had to stop acting like a flamingo. I had to put my foot down.",
  "Why can't you give Elsa a balloon? She'll let it go.",
  "Did you hear about the guy who invented Lifesavers? He made a mint.",
  "I only know 25 letters of the alphabet. I don't know y.",
  "Why do fathers take an extra pair of socks when they go golfing? In case they get a hole in one!",
  "I used to hate facial hair, but then it grew on me.",
  "What do you call a fake noodle? An impasta.",
  "Why do seagulls fly over the ocean? Because if they flew over the bay, we'd call them bagels!",
  "I asked my dog what two minus two is. He said nothing.",
];

const facts = [
  "🦦 Otters hold hands while sleeping so they don't drift apart.",
  "🐙 Octopuses have three hearts, blue blood, and nine brains.",
  "🍯 Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs still edible.",
  "🌍 There are more stars in the universe than grains of sand on Earth.",
  "🦈 Sharks are older than trees — they've been around for over 400 million years.",
  "🐘 Elephants are the only animals that can't jump.",
  "🧠 Your brain generates about 20 watts of power — enough to light a dim bulb.",
  "🦆 A group of flamingos is called a 'flamboyance'.",
  "🌙 The Moon is drifting away from Earth at about 3.8 cm per year.",
  "🐝 Bees can recognize human faces.",
];

const advices = [
  "💡 Drink more water. Most problems start with dehydration.",
  "💡 Talk to yourself like you'd talk to someone you love.",
  "💡 Spend time with people who make you feel alive.",
  "💡 Stop waiting for the perfect moment — create it.",
  "💡 Rest is productive. Don't feel guilty for it.",
  "💡 Learn one new thing every day. In a year, that's 365 new things.",
  "💡 Your energy is currency. Spend it wisely.",
  "💡 Be the person you needed when you were younger.",
  "💡 Consistency beats intensity. Show up every day.",
  "💡 Compare yourself only to who you were yesterday.",
];

const compliments = [
  "✨ You radiate positive energy that lights up any room.",
  "✨ Your kindness is genuinely one of a kind.",
  "✨ You have the rare ability to make people feel truly seen.",
  "✨ The world is better with you in it.",
  "✨ You handle things with such grace and strength.",
  "✨ Your smile could brighten the darkest day.",
  "✨ You inspire people without even realizing it.",
  "✨ You're the kind of person others aspire to be.",
  "✨ Your passion is infectious in the best way possible.",
  "✨ Everything you touch, you make better.",
];

const truths = [
  "Have you ever lied to get out of a social event?",
  "What's the most embarrassing thing you've done in front of a crush?",
  "Have you ever cheated on a test?",
  "What's one secret you've never told anyone?",
  "Have you ever ghosted someone?",
  "What's the biggest lie you've ever told?",
  "Have you ever pretended to be someone else online?",
  "What's something you're genuinely scared of?",
  "Have you ever read someone else's messages without permission?",
  "What's the most childish thing you still do?",
];

const dares = [
  "Send a voice note singing your favorite song.",
  "Change your profile picture to something embarrassing for 10 minutes.",
  "Text your last contact and say 'I've been thinking about you'.",
  "Send a selfie with the most ridiculous face you can make.",
  "Type your next 5 messages with your elbows.",
  "Send a compliment to 3 random people in your contacts.",
  "Do your best celebrity impression in a voice note.",
  "Post a random emoji as your status for 1 hour.",
  "Send a message only using emojis to your best friend.",
  "Record yourself doing a 10-second dance and send it.",
];

const eightBallResponses = [
  "🎱 It is certain.",
  "🎱 Without a doubt.",
  "🎱 Yes, definitely.",
  "🎱 You may rely on it.",
  "🎱 As I see it, yes.",
  "🎱 Most likely.",
  "🎱 Outlook good.",
  "🎱 Yes.",
  "🎱 Signs point to yes.",
  "🎱 Reply hazy, try again.",
  "🎱 Ask again later.",
  "🎱 Better not tell you now.",
  "🎱 Cannot predict now.",
  "🎱 Concentrate and ask again.",
  "🎱 Don't count on it.",
  "🎱 My reply is no.",
  "🎱 My sources say no.",
  "🎱 Outlook not so good.",
  "🎱 Very doubtful.",
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPercent(label) {
  const seed = label.toLowerCase().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((seed * 137) % 101);
}

function getBar(pct) {
  const filled = Math.floor(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

const funCommands = {
  async joke(sock, msg) {
    await sock.sendMessage(msg.key.remoteJid, { text: `😂 *Joke Time!*\n\n${getRandom(jokes)}` });
  },

  async dadjoke(sock, msg) {
    await sock.sendMessage(msg.key.remoteJid, { text: `👨 *Dad Joke Alert!*\n\n${getRandom(dadjokes)}` });
  },

  async fact(sock, msg) {
    await sock.sendMessage(msg.key.remoteJid, { text: `🤯 *Random Fact!*\n\n${getRandom(facts)}` });
  },

  async advice(sock, msg) {
    await sock.sendMessage(msg.key.remoteJid, { text: `💡 *Daily Advice*\n\n${getRandom(advices)}` });
  },

  async compliment(sock, msg) {
    await sock.sendMessage(msg.key.remoteJid, { text: `💝 *Compliment for You!*\n\n${getRandom(compliments)}` });
  },

  async eightball(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '🎱 Usage: .8ball <your question>' });
    }
    const question = args.join(' ');
    const answer = getRandom(eightBallResponses);
    await sock.sendMessage(jid, { text: `🎱 *Magic 8-Ball*\n\n❓ ${question}\n\n${answer}` });
  },

  async truth(sock, msg) {
    await sock.sendMessage(msg.key.remoteJid, { text: `😮 *Truth!*\n\n${getRandom(truths)}` });
  },

  async dare(sock, msg) {
    await sock.sendMessage(msg.key.remoteJid, { text: `😈 *Dare!*\n\n${getRandom(dares)}` });
  },

  async reverse(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, { text: '❌ Usage: .reverse <text>' });
    }
    const reversed = args.join(' ').split('').reverse().join('');
    await sock.sendMessage(jid, { text: `🔄 *Reversed:*\n\n${reversed}` });
  },

  async hotcheck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = args.join(' ') || msg.pushName || 'You';
    const pct = getPercent(name + 'hot');
    await sock.sendMessage(jid, {
      text: `🔥 *Hot Check for ${name}*\n\n${getBar(pct)} ${pct}%\n\n${pct >= 80 ? '🔥 Absolutely smoking!' : pct >= 60 ? '😍 Pretty hot!' : pct >= 40 ? '😊 Decent!' : '❄️ Needs warming up!'}`,
    });
  },

  async smartcheck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = args.join(' ') || msg.pushName || 'You';
    const pct = getPercent(name + 'smart');
    await sock.sendMessage(jid, {
      text: `🧠 *Smart Check for ${name}*\n\n${getBar(pct)} ${pct}%\n\n${pct >= 80 ? '🧠 Genius level!' : pct >= 60 ? '📚 Quite intelligent!' : pct >= 40 ? '💡 Average smart!' : '😅 Room for growth!'}`,
    });
  },

  async brainlevel(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = args.join(' ') || msg.pushName || 'You';
    const pct = getPercent(name + 'brain');
    const levels = ['🥚 Egg Brain', '🐣 Hatching', '🐥 Baby Brain', '😐 Average', '🤔 Thinker', '📖 Scholar', '🔬 Intellectual', '🧬 Genius', '🚀 Mastermind', '🌌 Galaxy Brain'];
    const level = levels[Math.floor(pct / 10)];
    await sock.sendMessage(jid, {
      text: `🧠 *Brain Level for ${name}*\n\n${getBar(pct)} ${pct}%\n\n🏆 Level: ${level}`,
    });
  },

  async coolcheck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = args.join(' ') || msg.pushName || 'You';
    const pct = getPercent(name + 'cool');
    await sock.sendMessage(jid, {
      text: `😎 *Cool Check for ${name}*\n\n${getBar(pct)} ${pct}%\n\n${pct >= 80 ? '😎 Ice cold, too cool for school!' : pct >= 60 ? '🤙 Pretty cool dude!' : pct >= 40 ? '🙂 Sorta cool!' : '🥱 Needs a vibe upgrade!'}`,
    });
  },

  async lovecheck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = args.join(' ') || msg.pushName || 'You';
    const pct = getPercent(name + 'love');
    await sock.sendMessage(jid, {
      text: `❤️ *Love Check for ${name}*\n\n${getBar(pct)} ${pct}%\n\n${pct >= 80 ? '💘 Overflowing with love!' : pct >= 60 ? '💖 Very loveable!' : pct >= 40 ? '💛 Warmhearted!' : '🥶 Needs to open up!'}`,
    });
  },
};

module.exports = funCommands;
