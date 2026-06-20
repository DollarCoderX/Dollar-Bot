'use strict';
const pollinations = require('../lib/pollinations');

async function ai(prompt) {
  return await pollinations.textGenerate([{ role: 'user', content: prompt }]);
}
async function reply(sock, msg, text) {
  await sock.sendMessage(msg.key.remoteJid, { text: text || '❌ Try again.' }, { quoted: msg });
}

const sportsCommands = {
  async sportnews(sock, msg, args) {
    const r = await ai(`Give me 5 interesting current-style sports headlines across different sports. Format them as a numbered list with emojis. Make them sound real and exciting.`);
    await reply(sock, msg, `*📰 Sports Headlines*\n\n${r}`);
  },
  async nba(sock, msg, args) {
    const r = await ai(`Share an interesting NBA fact or trivia. Include a player name, team, or historic moment. Keep it under 3 sentences.`);
    await reply(sock, msg, `*🏀 NBA Fact*\n\n${r}`);
  },
  async nfl(sock, msg, args) {
    const r = await ai(`Share an interesting NFL fact or trivia. Include a player, team, or Super Bowl moment. Keep it under 3 sentences.`);
    await reply(sock, msg, `*🏈 NFL Fact*\n\n${r}`);
  },
  async soccer(sock, msg, args) {
    const topic = args.join(' ') || 'world football';
    const r = await ai(`Share an interesting soccer/football fact about: ${topic}. Include a player or club name.`);
    await reply(sock, msg, `*⚽ Soccer Fact*\n\n${r}`);
  },
  async cricket(sock, msg, args) {
    const r = await ai(`Share an interesting cricket fact or record. Mention a player or match. Keep it engaging.`);
    await reply(sock, msg, `*🏏 Cricket Fact*\n\n${r}`);
  },
  async tennis(sock, msg, args) {
    const r = await ai(`Share an interesting tennis fact. Mention a Grand Slam, player, or historic match.`);
    await reply(sock, msg, `*🎾 Tennis Fact*\n\n${r}`);
  },
  async golf(sock, msg, args) {
    const r = await ai(`Give a useful golf tip for beginners or share an interesting golf fact.`);
    await reply(sock, msg, `*⛳ Golf Tip*\n\n${r}`);
  },
  async boxing(sock, msg, args) {
    const r = await ai(`Share an exciting boxing history fact or legendary fight story. Keep it punchy.`);
    await reply(sock, msg, `*🥊 Boxing Fact*\n\n${r}`);
  },
  async mma(sock, msg, args) {
    const r = await ai(`Share an interesting MMA/UFC fact, fighter stat, or iconic fight moment.`);
    await reply(sock, msg, `*🥋 MMA Fact*\n\n${r}`);
  },
  async f1(sock, msg, args) {
    const r = await ai(`Share a fascinating Formula 1 fact, race record, or team history. Keep it exciting.`);
    await reply(sock, msg, `*🏎️ Formula 1 Fact*\n\n${r}`);
  },
  async athletics(sock, msg, args) {
    const r = await ai(`Share an amazing athletics/track and field world record or athlete story.`);
    await reply(sock, msg, `*🏃 Athletics Fact*\n\n${r}`);
  },
  async swimming(sock, msg, args) {
    const r = await ai(`Share an interesting swimming world record, technique tip, or swimmer story.`);
    await reply(sock, msg, `*🏊 Swimming Fact*\n\n${r}`);
  },
  async cycling(sock, msg, args) {
    const r = await ai(`Share an interesting cycling fact — Tour de France, BMX, or mountain biking.`);
    await reply(sock, msg, `*🚴 Cycling Fact*\n\n${r}`);
  },
  async baseball(sock, msg, args) {
    const r = await ai(`Share an interesting baseball stat, World Series moment, or player legend.`);
    await reply(sock, msg, `*⚾ Baseball Fact*\n\n${r}`);
  },
  async hockey(sock, msg, args) {
    const r = await ai(`Share an interesting ice hockey fact, Stanley Cup story, or player record.`);
    await reply(sock, msg, `*🏒 Hockey Fact*\n\n${r}`);
  },
  async rugby(sock, msg, args) {
    const r = await ai(`Share an interesting rugby fact, World Cup moment, or player legend.`);
    await reply(sock, msg, `*🏉 Rugby Fact*\n\n${r}`);
  },
  async volleyball(sock, msg, args) {
    const r = await ai(`Share a volleyball tip, Olympic moment, or interesting volleyball fact.`);
    await reply(sock, msg, `*🏐 Volleyball Fact*\n\n${r}`);
  },
  async basketball(sock, msg, args) {
    const topic = args.join(' ') || 'basketball history';
    const r = await ai(`Tell me something fascinating about ${topic} in basketball.`);
    await reply(sock, msg, `*🏀 Basketball*\n\n${r}`);
  },
  async esports(sock, msg, args) {
    const game = args.join(' ') || 'gaming';
    const r = await ai(`Share an interesting esports/competitive gaming fact about ${game}.`);
    await reply(sock, msg, `*🎮 Esports Fact*\n\n${r}`);
  },
  async olympics(sock, msg, args) {
    const r = await ai(`Share a fascinating Olympic Games fact — ancient or modern history, amazing athlete or record.`);
    await reply(sock, msg, `*🏅 Olympics Fact*\n\n${r}`);
  },
  async sportsquiz(sock, msg, args) {
    const r = await ai(`Create a fun sports trivia question with 4 options (A/B/C/D) and reveal the answer at the end. Make it medium difficulty.`);
    await reply(sock, msg, `*🧠 Sports Quiz*\n\n${r}`);
  },
  async stadiumfact(sock, msg, args) {
    const r = await ai(`Share a fascinating fact about a famous sports stadium in the world — capacity, architecture, or iconic events.`);
    await reply(sock, msg, `*🏟️ Stadium Fact*\n\n${r}`);
  },
  async sporthistory(sock, msg, args) {
    const r = await ai(`Describe an iconic historic sports moment that changed the game forever. Make it vivid and exciting.`);
    await reply(sock, msg, `*📜 Sports History*\n\n${r}`);
  },
  async playertrivia(sock, msg, args) {
    const r = await ai(`Share surprising trivia about a famous sports athlete — their off-field life, unusual records, or lesser-known achievements.`);
    await reply(sock, msg, `*⭐ Player Trivia*\n\n${r}`);
  },
  async teamrival(sock, msg, args) {
    const r = await ai(`Describe one of the most famous sports rivalries in history. Explain why fans are so passionate about it.`);
    await reply(sock, msg, `*⚔️ Team Rivalry*\n\n${r}`);
  },
  async sportmotivate(sock, msg, args) {
    const r = await ai(`Give me an extremely motivating sports-themed message to push someone to train harder today. Be intense and powerful.`);
    await reply(sock, msg, `*💪 Sports Motivation*\n\n${r}`);
  },
  async coachquote(sock, msg, args) {
    const r = await ai(`Give me an inspiring quote from a legendary sports coach or manager, with their name and sport. Then add a brief explanation of what it means.`);
    await reply(sock, msg, `*🎯 Coach Quote*\n\n${r}`);
  },
  async extremesport(sock, msg, args) {
    const r = await ai(`Tell me about an extreme sport — what makes it dangerous, who does it, and one record or amazing feat.`);
    await reply(sock, msg, `*🤿 Extreme Sports*\n\n${r}`);
  },
  async watersport(sock, msg, args) {
    const r = await ai(`Share an interesting water sport fact — surfing, sailing, kayaking, wakeboarding, or kitesurfing.`);
    await reply(sock, msg, `*🌊 Water Sports*\n\n${r}`);
  },
  async wintersport(sock, msg, args) {
    const r = await ai(`Share an interesting winter sports fact — skiing, snowboarding, luge, bobsled, or ice skating.`);
    await reply(sock, msg, `*❄️ Winter Sports*\n\n${r}`);
  },
  async sportsidol(sock, msg, args) {
    const name = args.join(' ') || 'a legendary athlete';
    const r = await ai(`Tell me the inspiring story of ${name} — their rise, challenges, and greatest achievements.`);
    await reply(sock, msg, `*🌟 Sports Idol*\n\n${r}`);
  },
  async recordbreak(sock, msg, args) {
    const r = await ai(`Tell me about an incredible sports world record that seems almost impossible to break. Describe the achievement vividly.`);
    await reply(sock, msg, `*🌍 World Record*\n\n${r}`);
  },
  async sportscience(sock, msg, args) {
    const r = await ai(`Explain a fascinating sports science concept — biomechanics, aerodynamics, sports psychology, or nutrition for athletes.`);
    await reply(sock, msg, `*🔬 Sports Science*\n\n${r}`);
  },
  async recoveryplan(sock, msg, args) {
    const sport = args.join(' ') || 'general training';
    const r = await ai(`Give an athlete recovery plan after intense ${sport} training. Include rest, nutrition, and stretching tips.`);
    await reply(sock, msg, `*🛌 Recovery Plan*\n\n${r}`);
  },
  async nutrition3(sock, msg, args) {
    const goal = args.join(' ') || 'athletic performance';
    const r = await ai(`Provide sports nutrition advice for: ${goal}. Include pre-workout, during, and post-workout nutrition tips.`);
    await reply(sock, msg, `*🥗 Sports Nutrition*\n\n${r}`);
  },
  async warmup(sock, msg, args) {
    const sport = args.join(' ') || 'general workout';
    const r = await ai(`Give a 5-minute warm-up routine for ${sport}. List exercises with duration and purpose.`);
    await reply(sock, msg, `*🔥 Warm-Up Routine*\n\n${r}`);
  },
  async cooldown(sock, msg, args) {
    const sport = args.join(' ') || 'general workout';
    const r = await ai(`Give a 5-minute cool-down routine after ${sport}. Focus on stretching and breathing.`);
    await reply(sock, msg, `*🧊 Cool-Down Routine*\n\n${r}`);
  },
  async marathon(sock, msg, args) {
    const r = await ai(`Give beginner marathon training tips — weekly mileage, nutrition, mental strategy, and race day advice.`);
    await reply(sock, msg, `*🏃 Marathon Tips*\n\n${r}`);
  },
  async yoga2(sock, msg, args) {
    const r = await ai(`Suggest 5 yoga poses perfect for athletes. Explain each pose's benefit for sports performance.`);
    await reply(sock, msg, `*🧘 Yoga for Athletes*\n\n${r}`);
  },
  async pilates(sock, msg, args) {
    const r = await ai(`Explain 5 Pilates exercises for core strength and flexibility. Who benefits most from Pilates?`);
    await reply(sock, msg, `*🤸 Pilates Tips*\n\n${r}`);
  },
  async crossfit(sock, msg, args) {
    const r = await ai(`Describe 5 classic CrossFit WOD exercises. Explain what makes CrossFit different from regular gym workouts.`);
    await reply(sock, msg, `*💪 CrossFit*\n\n${r}`);
  },
  async strengthtrain(sock, msg, args) {
    const muscle = args.join(' ') || 'full body';
    const r = await ai(`Give a strength training workout plan for: ${muscle}. Include exercises, sets, reps, and rest times.`);
    await reply(sock, msg, `*🏋️ Strength Training*\n\n${r}`);
  },
  async cardio(sock, msg, args) {
    const r = await ai(`Give 5 effective cardio exercises for burning fat and improving endurance. Include duration and calorie estimates.`);
    await reply(sock, msg, `*❤️ Cardio Tips*\n\n${r}`);
  },
  async bodyweight(sock, msg, args) {
    const r = await ai(`Design a 10-minute bodyweight workout anyone can do at home. No equipment needed. List exercises with reps.`);
    await reply(sock, msg, `*🤸 Bodyweight Workout*\n\n${r}`);
  },
  async fitcheck(sock, msg, args) {
    const r = await ai(`Create a fun and snarky fitness level assessment based on 5 questions. Rate from "Couch Potato" to "Olympic God". Make it humorous.`);
    await reply(sock, msg, `*💯 Fitness Check*\n\n${r}`);
  },
  async sportsmeme(sock, msg, args) {
    const r = await ai(`Write a funny sports-themed text joke or meme scenario. Keep it relatable to sports fans everywhere.`);
    await reply(sock, msg, `*😂 Sports Meme*\n\n${r}`);
  },
  async mvp(sock, msg, args) {
    const sport = args.join(' ') || 'any sport';
    const r = await ai(`Who is considered the GOAT or MVP in ${sport}? Explain why with stats and achievements.`);
    await reply(sock, msg, `*🏆 MVP/GOAT*\n\n${r}`);
  },
  async sportbet(sock, msg, args) {
    const r = await ai(`Explain 5 common sports betting terms (odds, spread, moneyline, parlay, handicap) in simple language.`);
    await reply(sock, msg, `*🎰 Betting Terms*\n\n${r}`);
  },
  async draftpick(sock, msg, args) {
    const r = await ai(`Tell me about a famous sports draft pick — who was picked, what was expected, and what actually happened.`);
    await reply(sock, msg, `*🎯 Draft Pick Story*\n\n${r}`);
  },
};

module.exports = sportsCommands;
