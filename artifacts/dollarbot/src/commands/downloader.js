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
  // Method 1: saveinsta API (reliable, good quality)
  try {
    const r = await fetch('https://v3.saveinsta.app/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://saveinsta.app/',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: `q=${encodeURIComponent(url)}&t=media&lang=en`,
      timeout: 30000,
    });
    const json = await r.json();
    if (json?.data) {
      const html = json.data;
      // Extract HD video
      const videoM = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)" class="[^"]*btn[^"]*"/);
      if (videoM) return { url: videoM[1].replace(/&amp;/g,'&'), type: 'video' };
      // Extract image
      const imgM = html.match(/src="(https:\/\/[^"]+(?:instagram|cdninstagram)[^"]+\.jpg[^"]*)"/);
      if (imgM) return { url: imgM[1].replace(/&amp;/g,'&'), type: 'image' };
    }
  } catch (_) {}
  // Method 2: Snapinsta API
  try {
    const r2 = await fetch('https://snapinsta.app/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://snapinsta.app/',
      },
      body: `q=${encodeURIComponent(url)}&lang=en`,
      timeout: 30000,
    });
    const json2 = await r2.json();
    if (json2?.data) {
      const html2 = json2.data;
      const vidM2 = html2.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
      if (vidM2) return { url: vidM2[1].replace(/&amp;/g,'&'), type: 'video' };
      const imgM2 = html2.match(/src="(https:\/\/[^"]+\.jpg[^"]*)"/);
      if (imgM2) return { url: imgM2[1].replace(/&amp;/g,'&'), type: 'image' };
    }
  } catch (_) {}
  // Method 3: Direct scrape from Instagram page (image/video from meta)
  try {
    const r3 = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    });
    const html3 = await r3.text();
    const vidM3 = html3.match(/"video_url":"(https:\/\/[^"]+)"/);
    if (vidM3) return { url: vidM3[1].replace(/\\u0026/g,'&'), type: 'video' };
    const imgM3 = html3.match(/property="og:image" content="([^"]+)"/);
    if (imgM3) return { url: imgM3[1], type: 'image' };
  } catch (_) {}
  throw new Error('Could not find Instagram media. Link may be private or expired');
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
  // Method 1: twitsave (reliable)
  try {
    const r = await fetch(`https://twitsave.com/info?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000,
    });
    const html = await r.text();
    // Extract highest quality — look for download-btn links with quality labels
    const matches = [...html.matchAll(/href="(https:\/\/video\.twimg\.com\/[^"]+\.mp4[^"]*)"/g)];
    if (matches.length > 0) {
      const best = matches[matches.length - 1][1].replace(/&amp;/g,'&');
      return { url: best };
    }
  } catch (_) {}
  // Method 2: ssstwitter
  try {
    const r2 = await fetch('https://ssstwitter.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://ssstwitter.com/',
      },
      body: `id=${encodeURIComponent(url)}&locale=en&tt=&ts=&_ts=`,
      timeout: 30000,
    });
    const html2 = await r2.text();
    const m2 = html2.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (m2) return { url: m2[1].replace(/&amp;/g,'&') };
  } catch (_) {}
  throw new Error('Could not fetch Twitter video. Make sure the tweet contains a video');
}

// ─── Pinterest ────────────────────────────────────────────────────────────────
// btch-downloader ships a maintained Pinterest resolver — try it first since
// raw scraping gets blocked/served a placeholder ("unknown type") image.
async function dlPinterestViaLib(url) {
  const { pinterest } = require('btch-downloader');
  const res = await pinterest(url);
  if (!res?.status || !res?.result) throw new Error('btch-downloader had no result');
  const r = res.result;
  const link = r.url || r.video || (Array.isArray(r) ? r[0]?.url : null) || r.result?.url;
  if (!link) throw new Error('btch-downloader returned no media link');
  const type = /\.mp4($|\?)/i.test(link) ? 'video' : 'image';
  return { url: link, type };
}

async function dlPinterest(url) {
  try {
    return await dlPinterestViaLib(url);
  } catch (_) {
    // fall through to manual scrape below
  }
  // Resolve shortlinks (pin.it)
  let resolvedUrl = url;
  if (url.includes('pin.it')) {
    try {
      const redir = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
      resolvedUrl = redir.url;
    } catch (_) {}
  }

  const r = await fetch(resolvedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 30000,
  });
  const html = await r.text();

  // ── Video pins ─────────────────────────────────────────────────
  const videoPatterns = [
    /https:\/\/v\.pinimg\.com\/[^"'\s\\]+\.mp4/g,
    /"url":"(https:\/\/v\.pinimg\.com\/[^"]+\.mp4)"/g,
  ];
  for (const pat of videoPatterns) {
    const matches = [...html.matchAll(pat)];
    if (matches.length > 0) {
      const videoUrl = (matches[matches.length - 1][1] || matches[matches.length - 1][0]).replace(/\\u002F/g,'/').replace(/\\/g,'');
      if (videoUrl.startsWith('http')) return { url: videoUrl, type: 'video' };
    }
  }

  // ── Image pins — extract ALL pinimg URLs and pick highest quality ──
  const allPinUrls = new Set();
  const imgRegexes = [
    /https:\/\/i\.pinimg\.com\/originals\/[^"'\s\\]+\.(?:jpg|jpeg|png|gif|webp)/gi,
    /https:\/\/i\.pinimg\.com\/736x\/[^"'\s\\]+\.(?:jpg|jpeg|png|gif|webp)/gi,
    /https:\/\/i\.pinimg\.com\/564x\/[^"'\s\\]+\.(?:jpg|jpeg|png|gif|webp)/gi,
    /https:\/\/i\.pinimg\.com\/474x\/[^"'\s\\]+\.(?:jpg|jpeg|png|gif|webp)/gi,
    /https:\/\/i\.pinimg\.com\/236x\/[^"'\s\\]+\.(?:jpg|jpeg|png|gif|webp)/gi,
  ];

  // Priority: originals > 736x > 564x > 474x > 236x
  for (const regex of imgRegexes) {
    const found = [...html.matchAll(regex)];
    if (found.length > 0) {
      const best = found[0][0].replace(/\\u002F/g,'/').replace(/\\/g,'').replace(/&amp;/g,'&');
      return { url: best, type: 'image' };
    }
  }

  // Fallback: og:image meta tag
  const ogImg = html.match(/property="og:image" content="([^"]+)"/);
  if (ogImg) return { url: ogImg[1], type: 'image' };

  // Fallback: any pinimg URL in the page
  const anyPin = html.match(/https:\/\/i\.pinimg\.com\/[^"'\s\\]+\.(?:jpg|jpeg|png)/i);
  if (anyPin) return { url: anyPin[0], type: 'image' };

  throw new Error('Could not find Pinterest media. Make sure it\'s a public pin URL');
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
  const ct = (r.headers.get('content-type') || '').toLowerCase();
  if (ct && !/image|video|audio|octet-stream|webp/.test(ct)) {
    throw new Error(`Unexpected content type (${ct || 'unknown'}) — the source likely returned an error page instead of media`);
  }
  const buf = await r.buffer();
  // Sites often serve a tiny placeholder/"unavailable" image instead of a real
  // 404 — reject obviously-too-small buffers so callers can fall back cleanly.
  if (buf.length < 300) {
    throw new Error('Media too small — likely a broken/placeholder image, not real content');
  }
  return buf;
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

  // .pinterest [keyword or url] — download/search Pinterest image
  async pinterest(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return sock.sendMessage(jid, { text: '❌ Usage:\n• .pinterest <keyword> — search Pinterest\n• .pinterest <pin url> — download specific pin' }, { quoted: msg });

    const input = args.join(' ');
    const isLink = isUrl(input);

    await sock.sendMessage(jid, { text: `🔍 ${isLink ? 'Downloading' : 'Searching Pinterest for'}: _${input}_...` }, { quoted: msg });

    try {
      if (isLink) {
        // Direct URL download
        const d = await dlPinterest(input);
        const buf = await fetchBuffer(d.url);
        await sock.sendMessage(jid, {
          [d.type === 'video' ? 'video' : 'image']: buf,
          caption: '📌 Pinterest',
        }, { quoted: msg });
      } else {
        // Keyword search — scrape Pinterest search page
        const query = encodeURIComponent(input);
        const r = await fetch(`https://www.pinterest.com/search/pins/?q=${query}&rs=typed`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml',
          },
          timeout: 20000,
        });
        const html = await r.text();

        // Extract image URLs from search results
        const imgMatches = [
          ...html.matchAll(/https:\/\/i\.pinimg\.com\/originals\/[^"'\s\\]+\.(?:jpg|jpeg|png)/gi),
          ...html.matchAll(/https:\/\/i\.pinimg\.com\/736x\/[^"'\s\\]+\.(?:jpg|jpeg|png)/gi),
          ...html.matchAll(/https:\/\/i\.pinimg\.com\/564x\/[^"'\s\\]+\.(?:jpg|jpeg|png)/gi),
        ].map(m => m[0].replace(/\\u002F/g, '/').replace(/\\/g, ''));

        // Deduplicate — shuffle a handful of candidates and try each one
        // until we get a real image back (Pinterest sometimes serves a
        // broken/placeholder asset for a given URL, which used to make
        // .pinterest send "the same unknown image every time").
        const unique = [...new Set(imgMatches)];
        if (!unique.length) throw new Error('No images found for that keyword. Try a different search.');

        const candidates = unique
          .slice(0, Math.min(unique.length, 8))
          .sort(() => Math.random() - 0.5);

        let buf = null, lastErr;
        for (const candidate of candidates) {
          try {
            buf = await fetchBuffer(candidate);
            break;
          } catch (e) { lastErr = e; }
        }
        if (!buf) throw lastErr || new Error('All candidate images failed to load');

        await sock.sendMessage(jid, {
          image: buf,
          caption: `📌 *Pinterest:* ${input}\n_Found ${unique.length} results_`,
        }, { quoted: msg });
      }
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
