'use strict';
const fetch = require('node-fetch');
const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function tmpFile(ext) {
  return path.join(os.tmpdir(), `dbdl_${crypto.randomBytes(4).toString('hex')}.${ext}`);
}
function isUrl(str) { return /^https?:\/\//i.test(str); }

// ─── TikTok ──────────────────────────────────────────────────────────────────
async function dlTikTok(url) {
  const r = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, { timeout: 30000 });
  const d = await r.json();
  if (!d?.data?.play) throw new Error('Could not fetch TikTok video');
  return { url: d.data.hdplay || d.data.play, title: d.data.title || 'TikTok', author: d.data.author?.nickname || '' };
}

// ─── Instagram ────────────────────────────────────────────────────────────────
async function dlInsta(url) {
  const r = await fetch(`https://instavideosave.com/download?url=${encodeURIComponent(url)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
  if (!m) {
    // Try image fallback
    const m2 = html.match(/src="(https:\/\/[^"]+\.jpg[^"]*)"/);
    if (m2) return { url: m2[1], type: 'image' };
    throw new Error('Could not find Instagram media');
  }
  return { url: m[1], type: 'video' };
}

// ─── Facebook ─────────────────────────────────────────────────────────────────
async function dlFacebook(url) {
  const r = await fetch('https://snapsave.app/action.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://snapsave.app/',
    },
    body: `url=${encodeURIComponent(url)}`,
    timeout: 30000,
  });
  const html = await r.text();
  const m = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
  if (!m) throw new Error('Could not fetch Facebook video');
  return { url: m[1].replace(/&amp;/g, '&') };
}

// ─── Twitter/X ────────────────────────────────────────────────────────────────
async function dlTwitter(url) {
  const r = await fetch(`https://twdown.net/download.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://twdown.net/',
    },
    body: `URL=${encodeURIComponent(url)}`,
    timeout: 30000,
  });
  const html = await r.text();
  const m = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
  if (!m) throw new Error('Could not fetch Twitter video');
  return { url: m[1].replace(/&amp;/g, '&') };
}

// ─── Pinterest ────────────────────────────────────────────────────────────────
async function dlPinterest(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 });
  const html = await r.text();
  // Extract high-res image
  const m = html.match(/"url":"(https:\/\/i\.pinimg\.com\/[^"]+\.jpg)"/);
  if (!m) {
    const m2 = html.match(/content="(https:\/\/i\.pinimg\.com\/[^"]+\.jpg)"/);
    if (!m2) throw new Error('Could not find Pinterest image');
    return { url: m2[1].replace(/&amp;/g, '&'), type: 'image' };
  }
  return { url: m[1], type: 'image' };
}

// ─── Reddit ───────────────────────────────────────────────────────────────────
async function dlReddit(url) {
  const jsonUrl = url.replace(/\/$/, '') + '.json';
  const r = await fetch(jsonUrl, { headers: { 'User-Agent': 'DollarBot/6.0' }, timeout: 30000 });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const post = data?.[0]?.data?.children?.[0]?.data;
  if (!post) throw new Error('Could not parse Reddit post');
  const videoUrl = post?.media?.reddit_video?.fallback_url
    || post?.url_overridden_by_dest
    || post?.url;
  if (!videoUrl) throw new Error('No media found in Reddit post');
  return { url: videoUrl, title: post.title, type: videoUrl.includes('.jpg') || videoUrl.includes('.png') ? 'image' : 'video' };
}

// ─── MediaFire ────────────────────────────────────────────────────────────────
async function dlMediaFire(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 });
  const html = await r.text();
  const m = html.match(/href="(https?:\/\/download\d+\.mediafire\.com\/[^"]+)"/);
  if (!m) throw new Error('Could not find MediaFire download link');
  return { url: m[1], filename: url.split('/').pop().split('?')[0] };
}

// ─── YouTube audio ────────────────────────────────────────────────────────────
async function dlYouTubeAudio(url) {
  const ytdl = require('@distube/ytdl-core');
  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title;
  const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
  const bestAudio = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
  if (!bestAudio) throw new Error('No audio stream found');
  return { streamUrl: bestAudio.url, title, ext: 'webm' };
}

// ─── YouTube video ────────────────────────────────────────────────────────────
async function dlYouTubeVideo(url) {
  const ytdl = require('@distube/ytdl-core');
  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title;
  const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 360p mp4
  if (!format) throw new Error('No suitable video format found');
  return { streamUrl: format.url, title, ext: 'mp4' };
}

// ─── Screenshot ───────────────────────────────────────────────────────────────
async function screenshot(url, full = false) {
  const ssUrl = full
    ? `https://image.thum.io/get/width/1280/crop/900/fullpage/${url}`
    : `https://image.thum.io/get/width/1280/crop/720/${url}`;
  const r = await fetch(ssUrl, { timeout: 60000 });
  if (!r.ok) throw new Error(`Screenshot failed: HTTP ${r.status}`);
  return r.buffer();
}

// ─── Download buffer from URL ─────────────────────────────────────────────────
async function fetchBuffer(url, maxMB = 50) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 60000 });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const cl = r.headers.get('content-length');
  if (cl && parseInt(cl) > maxMB * 1048576) throw new Error(`File too large (>${maxMB}MB)`);
  return r.buffer();
}

module.exports = {

  // .tiktok <url> — download TikTok video
  async tiktok(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .tiktok <tiktok url>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '⬇️ Downloading TikTok video...' }, { quoted: msg });
    try {
      const d = await dlTikTok(url);
      const buf = await fetchBuffer(d.url);
      await sock.sendMessage(jid, {
        video: buf, mimetype: 'video/mp4',
        caption: `🎵 *${d.title}*\n👤 ${d.author}`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ TikTok download failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .fb <url> — download Facebook video
  async fb(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .fb <facebook video url>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '⬇️ Downloading Facebook video...' }, { quoted: msg });
    try {
      const d = await dlFacebook(url);
      const buf = await fetchBuffer(d.url);
      await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: '📘 Facebook Video' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Facebook download failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .insta <url> — download Instagram post
  async insta(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .insta <instagram url>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '⬇️ Downloading Instagram media...' }, { quoted: msg });
    try {
      const d = await dlInsta(url);
      const buf = await fetchBuffer(d.url);
      if (d.type === 'image') {
        await sock.sendMessage(jid, { image: buf, caption: '📸 Instagram Photo' }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: '📸 Instagram Video' }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Instagram download failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .twitter <url> — download Twitter/X video
  async twitter(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .twitter <tweet url>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '⬇️ Downloading Twitter media...' }, { quoted: msg });
    try {
      const d = await dlTwitter(url);
      const buf = await fetchBuffer(d.url);
      await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: '🐦 Twitter Video' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Twitter download failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .pinterest <url> — download Pinterest image
  async pinterest(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .pinterest <pin url>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '⬇️ Downloading Pinterest image...' }, { quoted: msg });
    try {
      const d = await dlPinterest(url);
      const buf = await fetchBuffer(d.url);
      await sock.sendMessage(jid, { image: buf, caption: '📌 Pinterest Image' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Pinterest failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .reddit <url> — download Reddit media
  async reddit(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .reddit <reddit post url>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '⬇️ Downloading Reddit media...' }, { quoted: msg });
    try {
      const d = await dlReddit(url);
      const buf = await fetchBuffer(d.url);
      if (d.type === 'image') {
        await sock.sendMessage(jid, { image: buf, caption: `🤖 ${d.title || 'Reddit Media'}` }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: `🤖 ${d.title || 'Reddit Video'}` }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Reddit download failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .mediafire <url> — download MediaFire file
  async mediafire(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .mediafire <mediafire url>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '⬇️ Fetching MediaFire link...' }, { quoted: msg });
    try {
      const d = await dlMediaFire(url);
      const buf = await fetchBuffer(d.url, 30);
      await sock.sendMessage(jid, {
        document: buf,
        fileName: d.filename || 'download',
        mimetype: 'application/octet-stream',
        caption: `📦 ${d.filename || 'MediaFire Download'}`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ MediaFire failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .yta <url|query> — YouTube audio download
  async yta(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return sock.sendMessage(jid, { text: '❌ Usage: .yta <youtube url or search query>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '🎵 Fetching YouTube audio...' }, { quoted: msg });
    try {
      let url = args[0];
      if (!isUrl(url)) {
        // Search first
        const yt = require('youtube-sr').default;
        const results = await yt.search(args.join(' '), { limit: 1 });
        if (!results.length) throw new Error('No results found');
        url = `https://youtube.com/watch?v=${results[0].id}`;
      }
      const d = await dlYouTubeAudio(url);
      const buf = await fetchBuffer(d.streamUrl, 50);
      await sock.sendMessage(jid, {
        audio: buf,
        mimetype: 'audio/webm',
        ptt: false,
        caption: `🎵 ${d.title}`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ YouTube audio failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .ytv <url|query> — YouTube video download
  async ytv(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return sock.sendMessage(jid, { text: '❌ Usage: .ytv <youtube url or search query>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '🎬 Fetching YouTube video...' }, { quoted: msg });
    try {
      let url = args[0];
      if (!isUrl(url)) {
        const yt = require('youtube-sr').default;
        const results = await yt.search(args.join(' '), { limit: 1 });
        if (!results.length) throw new Error('No results found');
        url = `https://youtube.com/watch?v=${results[0].id}`;
      }
      const d = await dlYouTubeVideo(url);
      const buf = await fetchBuffer(d.streamUrl, 100);
      await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: `🎬 ${d.title}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ YouTube video failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .ss <url> — screenshot a webpage
  async ss(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .ss <url>\nExample: .ss https://google.com' }, { quoted: msg });
    await sock.sendMessage(jid, { text: `📸 Taking screenshot of ${url}...` }, { quoted: msg });
    try {
      const buf = await screenshot(url, false);
      await sock.sendMessage(jid, { image: buf, caption: `📸 Screenshot: ${url}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Screenshot failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .fullss <url> — full page screenshot
  async fullss(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !isUrl(url))
      return sock.sendMessage(jid, { text: '❌ Usage: .fullss <url>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: `📸 Taking full-page screenshot of ${url}...` }, { quoted: msg });
    try {
      const buf = await screenshot(url, true);
      await sock.sendMessage(jid, { image: buf, caption: `📸 Full screenshot: ${url}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Full screenshot failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .song <query> — search and send YouTube audio as song
  async song(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return sock.sendMessage(jid, { text: '❌ Usage: .song <song name>\nExample: .song Blinding Lights' }, { quoted: msg });
    return module.exports.yta(sock, msg, args);
  },

  // .play <query> — same as song (alias)
  async play(sock, msg, args) { return module.exports.song(sock, msg, args); },

  // .video <query> — search YouTube and return video info
  async video(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return sock.sendMessage(jid, { text: '❌ Usage: .video <search query>' }, { quoted: msg });
    try {
      const yt = require('youtube-sr').default;
      const query = args.join(' ');
      const results = await yt.search(query, { limit: 3 });
      if (!results.length)
        return sock.sendMessage(jid, { text: '❌ No results found.' }, { quoted: msg });
      let text = `╭━━━〔 🎬 YOUTUBE RESULTS 〕━━━⬣\n`;
      for (const r of results) {
        const dur = r.durationFormatted || 'LIVE';
        text += `┃\n┃ 🎥 *${r.title}*\n┃ ⏱ ${dur} | 👁 ${(r.views||0).toLocaleString()} views\n┃ 🔗 https://youtu.be/${r.id}\n`;
      }
      text += `╰━━━━━━━━━━━━━━━━━━⬣\n_Use .ytv <url> to download_`;
      await sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ YouTube search failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .upload — info about uploading files to the bot
  async upload(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, {
      text:
        `📤 *Upload Guide*\n\n` +
        `• Send any image, video, or audio directly to the bot\n` +
        `• Use .sticker (reply to image) to make stickers\n` +
        `• Use .mp3 (reply to video) to extract audio\n` +
        `• Use .compress (reply to video) to compress\n\n` +
        `_All media processing is done locally on the bot._`,
    }, { quoted: msg });
  },

  // .story — WhatsApp status/story saver (reply to status)
  async story(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, {
      text:
        `📖 *Status Saver*\n\n` +
        `To save a WhatsApp status:\n` +
        `1. Open the status in WhatsApp\n` +
        `2. Forward it to this bot\n` +
        `3. The bot will re-send it as a saved media file\n\n` +
        `_Or reply to any media with .save to download it._`,
    }, { quoted: msg });
  },

  // .apk <app name> — search for APK
  async apk(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return sock.sendMessage(jid, { text: '❌ Usage: .apk <app name>\nExample: .apk minecraft' }, { quoted: msg });
    const query = args.join(' ');
    await sock.sendMessage(jid, { text: `🔍 Searching APK for *${query}*...` }, { quoted: msg });
    try {
      const r = await fetch(`https://apkpure.com/search?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000,
      });
      const html = await r.text();
      const nameM = html.match(/class="title"[^>]*>([^<]+)</);
      const dlM   = html.match(/href="(https:\/\/apkpure\.com\/[^"]+\/download)">/);
      const nameStr = nameM ? nameM[1].trim() : query;
      const dlUrl   = dlM ? dlM[1] : `https://apkpure.com/search?q=${encodeURIComponent(query)}`;
      await sock.sendMessage(jid, {
        text:
          `📦 *APK Found:* ${nameStr}\n\n` +
          `🔗 Download: ${dlUrl}\n\n` +
          `_Open the link to download the APK file_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ APK search failed: ${e.message}` }, { quoted: msg });
    }
  },

  // .spotify <query> — search Spotify tracks (metadata only)
  async spotify(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return sock.sendMessage(jid, { text: '❌ Usage: .spotify <song name>\nExample: .spotify Blinding Lights' }, { quoted: msg });
    const query = args.join(' ');
    try {
      // Use iTunes Search API as a free substitute for Spotify search
      const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=3`, { timeout: 20000 });
      const d = await r.json();
      if (!d.results?.length)
        return sock.sendMessage(jid, { text: `❌ No results for: ${query}` }, { quoted: msg });
      let text = `╭━━━〔 🎵 SPOTIFY / MUSIC SEARCH 〕━━━⬣\n`;
      for (const track of d.results.slice(0, 3)) {
        text += `┃\n┃ 🎵 *${track.trackName}*\n┃ 👤 ${track.artistName}\n┃ 💿 ${track.collectionName || ''}\n┃ ⏱ ${Math.round((track.trackTimeMillis || 0) / 1000)}s\n`;
      }
      text += `╰━━━━━━━━━━━━━━━━━━⬣\n_Use .song <name> to download_`;
      await sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Music search failed: ${e.message}` }, { quoted: msg });
    }
  },
};
