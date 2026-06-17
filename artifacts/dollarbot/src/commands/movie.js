const fetch = require('node-fetch');
const pollinations = require('../lib/pollinations');

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function youtubeMp4FromQuery(query) {
  // Best effort: use YouTube search via serper if present, else fallback to simple YouTube results scrape
  // This matches the project style: lightweight + best effort.
  const searchQuery = encodeURIComponent(query);
  const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    timeout: 15000,
  });

  if (!res.ok) throw new Error(`YouTube search failed: HTTP ${res.status}`);
  const html = await res.text();

  // Try common pattern for embedded videoId
  const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
  const videoId = idMatch?.[1];
  if (!videoId) throw new Error('Could not find a videoId on YouTube results.');

  const titleMatch = html.match(/"title":\{"runs":\[{"text":"([^"]+)"/);
  const title = titleMatch?.[1] || query;

  return {
    videoId,
    title,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

async function sendYoutubeVideo(sock, jid, msg, videoUrl, title) {
  const btch = require('btch-downloader');
  const media = await btch.youtube(videoUrl);
  if (!media || !media.mp4) throw new Error('Could not extract direct MP4 stream.');

  await sock.sendMessage(jid, {
    video: { url: media.mp4 },
    caption: `🎬 *${title}*\n\n_Ready by DollarBot V6_ 💵\n\n🔗 ${videoUrl}`,
  }, { quoted: msg });
}

async function sendTrailerFallbackText(sock, jid, msg, query) {
  // If video extraction fails, still give something helpful.
  const response = await pollinations.textGenerate([
    {
      role: 'system',
      content:
        'You are a movie trailer assistant. Provide a short (max 3 sentences) trailer-style description for the movie/search query. WhatsApp formatting only.'
    },
    { role: 'user', content: `Write a trailer-style short description for: ${query}` },
  ]);

  await sock.sendMessage(jid, {
    text: `🎞️ *No trailer video found, but here is a description:*\n\n${response}`,
  }, { quoted: msg });
}

const movieCommands = {
  // .movie <query>
  async movie(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, {
        text: 'Usage: .movie <movie name / trailer query>\nExample: .movie Interstellar trailer'
      });
    }

    const query = args.join(' ');
    await sock.sendMessage(jid, { text: `🎬 *Searching trailer for:* "${query}"\n_Please wait..._` });

    try {
      const { videoUrl, title } = await youtubeMp4FromQuery(`${query} trailer`);

      // Try sending MP4 video
      try {
        await sendYoutubeVideo(sock, jid, msg, videoUrl, title);
      } catch (e) {
        // Fallback: still give description
        await sendTrailerFallbackText(sock, jid, msg, query);
      }

      // Always send a rating/summary from AI so user gets the 2nd message too.
      const ratingText = await pollinations.textGenerate([
        {
          role: 'system',
          content:
            'You are a movie reviewer. Give a short rating (1-10) and 2-3 sentences review. WhatsApp formatting only. No tables.'
        },
        { role: 'user', content: `Rate and review: ${query}` }
      ]);

      await sock.sendMessage(jid, {
        text: `⭐ *Quick Review / Rating*\n\n${ratingText}`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, {
        text: `❌ *Movie Error:* ${e.message}\n\nTip: try a more specific name (e.g. "Interstellar trailer")`
      });
    }
  }
};

module.exports = movieCommands;

