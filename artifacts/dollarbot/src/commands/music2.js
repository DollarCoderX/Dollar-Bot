'use strict';
const pollinations = require('../lib/pollinations');

async function ai(prompt) {
  return await pollinations.textGenerate([{ role: 'user', content: prompt }]);
}
async function reply(sock, msg, text) {
  await sock.sendMessage(msg.key.remoteJid, { text: text || '❌ Try again.' }, { quoted: msg });
}

const music2Commands = {
  async lyrics(sock, msg, args) {
    if (!args.length) return reply(sock, msg, '❌ Usage: .lyrics <song name> - <artist>');
    const song = args.join(' ');
    const r = await ai(`Write creative lyrics inspired by the style of: "${song}". Create 2 verses and a chorus. Make it sound authentic.`);
    await reply(sock, msg, `*🎵 Lyrics: ${song}*\n\n${r}`);
  },
  async artist(sock, msg, args) {
    const name = args.join(' ') || 'a legendary musician';
    const r = await ai(`Share interesting facts and the musical journey of ${name}. Include albums, achievements, and influence on music.`);
    await reply(sock, msg, `*🎤 Artist: ${name}*\n\n${r}`);
  },
  async genre(sock, msg, args) {
    const genre = args.join(' ') || 'music genres';
    const r = await ai(`Tell me about the ${genre} music genre — origins, key artists, subgenres, and its cultural impact.`);
    await reply(sock, msg, `*🎸 Genre: ${genre}*\n\n${r}`);
  },
  async recommend(sock, msg, args) {
    const mood = args.join(' ') || 'good vibes';
    const r = await ai(`Recommend 5 songs that perfectly match the mood: "${mood}". Include artist names and why each song fits.`);
    await reply(sock, msg, `*🎧 Music Recommendations*\n\n${r}`);
  },
  async musicfact2(sock, msg, args) {
    const r = await ai(`Share a fascinating music fact that most people don't know — could be about any era, genre, or artist.`);
    await reply(sock, msg, `*🎵 Music Fact*\n\n${r}`);
  },
  async albuminfo(sock, msg, args) {
    const album = args.join(' ') || 'a legendary album';
    const r = await ai(`Tell me about the album "${album}" — creation story, tracklist highlights, and its cultural impact.`);
    await reply(sock, msg, `*💿 Album Info*\n\n${r}`);
  },
  async songhistory(sock, msg, args) {
    const song = args.join(' ') || 'a classic song';
    const r = await ai(`Tell me the history behind "${song}" — when it was made, inspiration, and how it became iconic.`);
    await reply(sock, msg, `*📜 Song History*\n\n${r}`);
  },
  async concertidea(sock, msg, args) {
    const r = await ai(`Give tips for the ultimate concert experience — what to bring, how to get good spots, pre-show tips, and etiquette.`);
    await reply(sock, msg, `*🎟️ Concert Tips*\n\n${r}`);
  },
  async playlist(sock, msg, args) {
    const theme = args.join(' ') || 'workout motivation';
    const r = await ai(`Create a themed playlist for: "${theme}". List 10 song titles and artists that would fit perfectly.`);
    await reply(sock, msg, `*📋 Playlist: ${theme}*\n\n${r}`);
  },
  async musictheory(sock, msg, args) {
    const concept = args.join(' ') || 'basic music theory';
    const r = await ai(`Explain ${concept} in music theory. Keep it simple enough for beginners with practical examples.`);
    await reply(sock, msg, `*📚 Music Theory*\n\n${r}`);
  },
  async chord(sock, msg, args) {
    const key = args.join(' ') || 'C major';
    const r = await ai(`Explain the ${key} chord — notes, fingering tips for guitar/piano, and common chord progressions that use it.`);
    await reply(sock, msg, `*🎸 Chord: ${key}*\n\n${r}`);
  },
  async scale(sock, msg, args) {
    const scale = args.join(' ') || 'pentatonic scale';
    const r = await ai(`Explain the ${scale} — what it sounds like, how to play it, and what genres use it most.`);
    await reply(sock, msg, `*🎼 Scale: ${scale}*\n\n${r}`);
  },
  async tempo(sock, msg, args) {
    const r = await ai(`Explain BPM and tempo in music — common BPM ranges for different genres, and how tempo affects the feel of a song.`);
    await reply(sock, msg, `*⏱️ Tempo & BPM*\n\n${r}`);
  },
  async beatmaker(sock, msg, args) {
    const r = await ai(`Give beginner tips for beat making — DAWs to use, drum pattern basics, layering sounds, and avoiding common mistakes.`);
    await reply(sock, msg, `*🥁 Beat Making Tips*\n\n${r}`);
  },
  async rap2(sock, msg, args) {
    const topic = args.join(' ') || 'hustle and grind';
    const r = await ai(`Write 4 bars of clever rap lyrics about: "${topic}". Use rhyme schemes, wordplay, and rhythm. Make it fire.`);
    await reply(sock, msg, `*🎤 Rap Bars*\n\n${r}`);
  },
  async freestyle(sock, msg, args) {
    const r = await ai(`Give me a random freestyle rap topic and 3 keywords to incorporate. Make the topic unique and challenging.`);
    await reply(sock, msg, `*🎙️ Freestyle Topic*\n\n${r}`);
  },
  async singbattle(sock, msg, args) {
    const r = await ai(`Create a fun singing challenge — pick a vocal style, give a lyric prompt, and judge criteria. Make it competitive and fun.`);
    await reply(sock, msg, `*🎤 Singing Battle*\n\n${r}`);
  },
  async musicquiz(sock, msg, args) {
    const r = await ai(`Create a music trivia question with 4 options (A/B/C/D). Cover any era or genre. Reveal the answer at the end.`);
    await reply(sock, msg, `*🧠 Music Quiz*\n\n${r}`);
  },
  async rockfact(sock, msg, args) {
    const r = await ai(`Share a fascinating rock music fact — classic rock, metal, punk, or grunge. Include band names and iconic moments.`);
    await reply(sock, msg, `*🎸 Rock Fact*\n\n${r}`);
  },
  async popfact(sock, msg, args) {
    const r = await ai(`Share a surprising pop music fact — biggest selling albums, chart records, or behind-the-scenes stories.`);
    await reply(sock, msg, `*🌟 Pop Music Fact*\n\n${r}`);
  },
  async jazzfact(sock, msg, args) {
    const r = await ai(`Share a fascinating jazz music fact — history, legendary musicians, or unique musical concepts in jazz.`);
    await reply(sock, msg, `*🎷 Jazz Fact*\n\n${r}`);
  },
  async hiphopfact(sock, msg, args) {
    const r = await ai(`Share an interesting hip-hop culture fact — its origins, pioneering artists, or cultural impact on music and fashion.`);
    await reply(sock, msg, `*🎤 Hip-Hop Fact*\n\n${r}`);
  },
  async classicalfact(sock, msg, args) {
    const r = await ai(`Share a fascinating classical music fact — Beethoven, Mozart, Bach, or another composer. Include a surprising story.`);
    await reply(sock, msg, `*🎻 Classical Music Fact*\n\n${r}`);
  },
  async guitartips(sock, msg, args) {
    const level = args.join(' ') || 'beginner';
    const r = await ai(`Give 5 guitar playing tips for a ${level}. Include technique, practice habits, and common mistakes to avoid.`);
    await reply(sock, msg, `*🎸 Guitar Tips*\n\n${r}`);
  },
  async pianotips(sock, msg, args) {
    const r = await ai(`Give 5 piano learning tips for beginners — hand position, scales to start with, and how to practice effectively.`);
    await reply(sock, msg, `*🎹 Piano Tips*\n\n${r}`);
  },
  async djterms(sock, msg, args) {
    const r = await ai(`Explain 5 essential DJ terms — BPM, beatmatching, crossfading, EQ, and cue points. Keep it beginner-friendly.`);
    await reply(sock, msg, `*🎧 DJ Terminology*\n\n${r}`);
  },
  async mixingtip(sock, msg, args) {
    const r = await ai(`Give 5 audio mixing tips for beginners — levels, EQ, reverb, compression, and mastering basics.`);
    await reply(sock, msg, `*🎚️ Mixing Tips*\n\n${r}`);
  },
  async producer(sock, msg, args) {
    const r = await ai(`Give beginner music production tips — best free/cheap DAWs, how to start your first track, and common beginner mistakes.`);
    await reply(sock, msg, `*🎛️ Music Production*\n\n${r}`);
  },
  async vocalwarmup(sock, msg, args) {
    const r = await ai(`Give 5 vocal warm-up exercises before singing. Include breathing, scales, and tongue twisters. Explain each.`);
    await reply(sock, msg, `*🎤 Vocal Warm-Up*\n\n${r}`);
  },
  async songwrite(sock, msg, args) {
    const theme = args.join(' ') || 'love and loss';
    const r = await ai(`Give songwriting tips for the theme: "${theme}". Include structure (verse/chorus/bridge), rhyme tips, and emotional hooks.`);
    await reply(sock, msg, `*✍️ Songwriting Tips*\n\n${r}`);
  },
  async musicbiz(sock, msg, args) {
    const r = await ai(`Share 5 facts about the music industry — how artists make money, streaming royalties, and record deal tips.`);
    await reply(sock, msg, `*💼 Music Business*\n\n${r}`);
  },
  async streaming(sock, msg, args) {
    const r = await ai(`Explain how music streaming works — how Spotify/Apple Music pays artists, the royalty system, and how many plays equals $1.`);
    await reply(sock, msg, `*📱 Music Streaming*\n\n${r}`);
  },
  async bandname(sock, msg, args) {
    const style = args.join(' ') || 'rock';
    const r = await ai(`Generate 5 creative band name ideas for a ${style} band. Explain the vibe of each name.`);
    await reply(sock, msg, `*🎸 Band Name Ideas*\n\n${r}`);
  },
  async albumname(sock, msg, args) {
    const mood = args.join(' ') || 'melancholy';
    const r = await ai(`Generate 5 creative album name ideas with a ${mood} theme. Explain why each title works artistically.`);
    await reply(sock, msg, `*💿 Album Name Ideas*\n\n${r}`);
  },
  async songname(sock, msg, args) {
    const emotion = args.join(' ') || 'heartbreak';
    const r = await ai(`Generate 5 creative song title ideas for a track about: "${emotion}". Make them catchy and memorable.`);
    await reply(sock, msg, `*🎵 Song Title Ideas*\n\n${r}`);
  },
  async musiccollab(sock, msg, args) {
    const r = await ai(`Give tips for collaborating with other musicians — online tools, creative process, handling creative differences, and splitting royalties.`);
    await reply(sock, msg, `*🤝 Music Collab Tips*\n\n${r}`);
  },
  async copyrightmusic(sock, msg, args) {
    const r = await ai(`Explain music copyright basics — how to protect your music, what sampling means legally, and how to avoid copyright strikes.`);
    await reply(sock, msg, `*©️ Music Copyright*\n\n${r}`);
  },
  async karaoke(sock, msg, args) {
    const r = await ai(`Give karaoke tips — song selection for different voice types, how to project confidence, and beginner-friendly songs to start with.`);
    await reply(sock, msg, `*🎤 Karaoke Tips*\n\n${r}`);
  },
  async drumfact(sock, msg, args) {
    const r = await ai(`Share an interesting drum fact — drum history, famous drummers, or interesting rhythm patterns across cultures.`);
    await reply(sock, msg, `*🥁 Drum Facts*\n\n${r}`);
  },
  async bassfact(sock, msg, args) {
    const r = await ai(`Share interesting bass guitar facts — its role in music, famous bass lines, or legendary bass players.`);
    await reply(sock, msg, `*🎸 Bass Guitar Facts*\n\n${r}`);
  },
  async synthesizer(sock, msg, args) {
    const r = await ai(`Explain the history of synthesizers — from Moog to modern soft synths. How did they change music forever?`);
    await reply(sock, msg, `*🎛️ Synthesizer History*\n\n${r}`);
  },
  async musiccolors(sock, msg, args) {
    const r = await ai(`Explain synesthesia in music — how some musicians see colors when they hear music. Which famous musicians had this?`);
    await reply(sock, msg, `*🌈 Music & Colors*\n\n${r}`);
  },
  async soundtrack(sock, msg, args) {
    const movie = args.join(' ') || 'a famous movie';
    const r = await ai(`Talk about the iconic soundtrack of "${movie}" — composer, key themes, and how the music enhanced the film.`);
    await reply(sock, msg, `*🎬 Soundtrack*\n\n${r}`);
  },
  async musicsoul(sock, msg, args) {
    const r = await ai(`What is soul music? Explain its origins, pioneers (Aretha Franklin, Ray Charles, James Brown), and its emotional power.`);
    await reply(sock, msg, `*🎵 Soul Music*\n\n${r}`);
  },
  async afrobeats(sock, msg, args) {
    const r = await ai(`Explain Afrobeats — its origins in Nigeria/Ghana, key artists (Burna Boy, Wizkid, Davido), and its global rise.`);
    await reply(sock, msg, `*🌍 Afrobeats*\n\n${r}`);
  },
  async reggae(sock, msg, args) {
    const r = await ai(`Explain reggae music — its Jamaican roots, Bob Marley's influence, musical characteristics, and global impact.`);
    await reply(sock, msg, `*🌴 Reggae Music*\n\n${r}`);
  },
  async kpop(sock, msg, args) {
    const r = await ai(`Explain K-pop — its origins, idol training system, BTS's global impact, and why it has such passionate fans worldwide.`);
    await reply(sock, msg, `*🇰🇷 K-Pop*\n\n${r}`);
  },
  async musicpsych(sock, msg, args) {
    const r = await ai(`Explain the psychology of music — why certain songs make us emotional, how music affects memory, and the science of earworms.`);
    await reply(sock, msg, `*🧠 Music Psychology*\n\n${r}`);
  },
  async concertgoer(sock, msg, args) {
    const r = await ai(`Rate different types of concert-goers (the superfan, the phone person, the pusher, the singer-along) in a funny tier list.`);
    await reply(sock, msg, `*🏟️ Concert-Goer Types*\n\n${r}`);
  },
};

module.exports = music2Commands;
