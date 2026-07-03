'use strict';
/**
 * src/commands/sticker.js
 * Commands:
 *   .sticker   — convert replied/sent image or video to sticker (512x512 WebP)
 *   .toimage   — convert replied sticker to image (PNG)
 *   .steal     — re-brand any replied sticker with DollarBot name + 🇨🇦 flag
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { imageToSticker, stickerToImage, addStickerMetadata } = require('../lib/sticker');
const { getContextInfo, getMessageContent } = require('../lib/messages');

const SILENT_LOGGER = {
  level: 'silent',
  fatal: () => {}, error: () => {}, warn: () => {},
  info:  () => {}, debug: () => {}, trace: () => {},
  child: () => SILENT_LOGGER,
};

// Resolve media from quoted message or current message
async function resolveMedia(sock, msg, types = ['imageMessage', 'videoMessage', 'stickerMessage']) {
  const ctx = getContextInfo(msg);

  // Check quoted first
  if (ctx?.quotedMessage) {
    const mediaType = types.find(t => ctx.quotedMessage[t]);
    if (mediaType) {
      const fakeMsg = {
        key: { remoteJid: msg.key.remoteJid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant },
        message: ctx.quotedMessage,
      };
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, { logger: SILENT_LOGGER });
      return { buffer, type: mediaType };
    }
  }

  // Then check current message
  const content = getMessageContent(msg);
  const mediaType = types.find(t => content[t]);
  if (mediaType) {
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: SILENT_LOGGER });
    return { buffer, type: mediaType };
  }

  return null;
}

const stickerCommands = {

  // ── .sticker — convert image/video to sticker ─────────────────────────────
  async sticker(sock, msg, args) {
    const jid = msg.key.remoteJid;
    await msg.reply('_🎨 Converting to sticker..._');

    try {
      const media = await resolveMedia(sock, msg, ['imageMessage', 'videoMessage', 'stickerMessage']);
      if (!media) {
        return msg.reply(
          '❌ *No image or video found!*\n\n' +
          'Usage:\n' +
          '• Reply to an image with *.sticker*\n' +
          '• Send an image with *.sticker* as caption\n' +
          '• Reply to a video clip with *.sticker*'
        );
      }

      // Custom packname/author from args: .sticker MyPack | Author
      const parts    = args.join(' ').split('|');
      const packname = parts[0]?.trim() || 'DollarBot 💵';
      const author   = parts[1]?.trim() || 'Dollar 🇨🇦';

      const stickerBuf = await imageToSticker(media.buffer, packname, author);

      await sock.sendMessage(jid, { sticker: stickerBuf }, { quoted: msg });
    } catch (e) {
      await msg.reply(`❌ Sticker error: ${e.message}`);
    }
  },

  // ── .toimage — convert sticker to image ──────────────────────────────────
  async toimage(sock, msg) {
    const jid = msg.key.remoteJid;
    await msg.reply('_🖼️ Converting sticker to image..._');

    try {
      const media = await resolveMedia(sock, msg, ['stickerMessage', 'imageMessage']);
      if (!media) {
        return msg.reply('❌ Reply to a sticker or image with *.toimage*');
      }

      const imgBuf = await stickerToImage(media.buffer);
      await sock.sendMessage(jid, { image: imgBuf, caption: '_Sticker converted to image by DollarBot_ 💵' }, { quoted: msg });
    } catch (e) {
      await msg.reply(`❌ Conversion error: ${e.message}`);
    }
  },

  // ── .steal — rebrand sticker with DollarBot identity ─────────────────────
  async steal(sock, msg, args) {
    const jid = msg.key.remoteJid;
    await msg.reply('_🔖 Re-branding sticker..._');

    try {
      const media = await resolveMedia(sock, msg, ['stickerMessage']);
      if (!media) {
        return msg.reply(
          '❌ Reply to a *sticker* with *.steal*\n\n' +
          '_This will re-brand it with DollarBot\'s name and save it to your collection._'
        );
      }

      // Allow custom name override: .steal PackName
      const customPack = args.join(' ').trim() || 'Dollar 🇨🇦';
      const author     = 'Dollar | DollarBot V6';

      // Inject fresh metadata over existing sticker buffer
      const branded = addStickerMetadata(media.buffer, {
        packname: customPack,
        author,
      });

      await sock.sendMessage(jid, { sticker: branded }, { quoted: msg });
      await msg.reply(`✅ *Sticker stolen & branded!*\n\n📦 Pack: *${customPack}*\n✍️ Author: *Dollar | DollarBot V-Ultra*\n\n_Save it from your sticker tray!_`);
    } catch (e) {
      await msg.reply(`❌ Steal error: ${e.message}`);
    }
  },

  // ── .savestatus — save replied media (view-once or normal) as regular media ─
  async savestatus(sock, msg) {
    const jid = msg.key.remoteJid;
    await msg.reply('_💾 Saving media..._');
    try {
      const ctx = getContextInfo(msg);
      const quoted = ctx?.quotedMessage;
      if (!quoted) {
        return msg.reply('❌ Reply to an *image*, *video*, *audio*, or *view-once* message with *.savestatus*');
      }
      const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage',
        'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
      let mediaType = mediaTypes.find(t => quoted[t]);
      let actualMsg = quoted;
      if (!mediaType) {
        return msg.reply('❌ No media found in the replied message.');
      }
      // Unwrap view-once
      if (mediaType === 'viewOnceMessage' || mediaType === 'viewOnceMessageV2' || mediaType === 'viewOnceMessageV2Extension') {
        const inner = quoted[mediaType]?.message;
        actualMsg = inner;
        mediaType = ['imageMessage', 'videoMessage', 'audioMessage'].find(t => inner?.[t]);
        if (!mediaType || !actualMsg) return msg.reply('❌ Could not extract view-once media.');
      }
      const fakeMsg = {
        key: { remoteJid: jid, id: ctx.stanzaId || msg.key.id, fromMe: false, participant: ctx.participant },
        message: { [mediaType]: actualMsg[mediaType] || actualMsg },
      };
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const SILENT = { level:'silent', fatal:()=>{}, error:()=>{}, warn:()=>{}, info:()=>{}, debug:()=>{}, trace:()=>{}, child:()=>SILENT };
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, { logger: SILENT });
      if (mediaType === 'imageMessage') {
        await sock.sendMessage(jid, { image: buffer, caption: '✅ *Saved!* — DollarBot V-Ultra 💵' }, { quoted: msg });
      } else if (mediaType === 'videoMessage') {
        await sock.sendMessage(jid, { video: buffer, caption: '✅ *Saved!* — DollarBot V-Ultra 💵' }, { quoted: msg });
      } else if (mediaType === 'audioMessage') {
        await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
      } else if (mediaType === 'stickerMessage') {
        await sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { document: buffer, mimetype: 'application/octet-stream', fileName: 'saved_media' }, { quoted: msg });
      }
    } catch (e) {
      await msg.reply(`❌ Save error: ${e.message}`);
    }
  },

  // ── .xemoji — convert emoji to sticker ───────────────────────────────────
  async xemoji(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return msg.reply('❌ Usage: .xemoji <emoji>\nExample: .xemoji 😂');
    const emoji = args[0];
    await msg.reply('_🎨 Creating emoji sticker..._');

    const fetch = require('node-fetch');

    // Build Twemoji codepoint string: filter variation selectors (U+FE0F, U+200D handled)
    function emojiToTwemojiHex(em) {
      const cps = [...em]
        .map(c => c.codePointAt(0))
        .filter(cp => cp !== 0xFE0F); // strip variation selector-16
      return cps.map(cp => cp.toString(16)).join('-');
    }

    const hexCode = emojiToTwemojiHex(emoji);

    // CDN sources in priority order — all serve reliable PNG
    const cdnSources = [
      `https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/72x72/${hexCode}.png`,
      `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${hexCode}.png`,
      `https://twemoji.maxcdn.com/v/latest/72x72/${hexCode}.png`,
    ];

    let imgBuf = null;
    for (const url of cdnSources) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 12000 });
        if (r.ok) {
          const b = await r.buffer();
          if (b.length > 200) { imgBuf = b; break; }
        }
      } catch (_) {}
    }

    // Fallback: AI-generated emoji sticker via Pollinations
    if (!imgBuf) {
      try {
        const prompt = `${emoji} emoji style illustration, flat design, clean white background, high quality`;
        const r = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Date.now()}`, { timeout: 35000 });
        if (r.ok) imgBuf = await r.buffer();
      } catch (_) {}
    }

    if (!imgBuf) return msg.reply('❌ Could not find or generate this emoji. Try a different one.');

    try {
      const stickerBuf = await imageToSticker(imgBuf, 'DollarBot V-Ultra 💵', 'Dollar 🇨🇦');
      await sock.sendMessage(jid, { sticker: stickerBuf }, { quoted: msg });
    } catch (e) {
      await msg.reply(`❌ Sticker conversion failed: ${e.message}`);
    }
  },

  // ── .attp — animated text sticker ────────────────────────────────────────
  async attp(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return msg.reply('❌ Usage: .attp <text>\nExample: .attp DollarBot V-Ultra');
    const text = args.join(' ').slice(0, 40);
    await msg.reply('_✨ Creating text sticker..._');
    try {
      const fetch = require('node-fetch');
      // Use Pollinations to generate stylized text as sticker image
      const prompt = `stylized text sticker saying "${text}", bold colorful typography, graffiti style, transparent background, high quality, clean`;
      const imgRes = await fetch(
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`,
        { timeout: 30000 }
      );
      if (!imgRes.ok) throw new Error('Image generation failed');
      const buf = await imgRes.buffer();
      const stickerBuf = await imageToSticker(buf, 'DollarBot V-Ultra 🇨🇦', 'Dollar');
      await sock.sendMessage(jid, { sticker: stickerBuf }, { quoted: msg });
    } catch (e) {
      await msg.reply(`❌ ATTP error: ${e.message}`);
    }
  },
};

module.exports = stickerCommands;
