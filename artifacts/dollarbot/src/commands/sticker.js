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
      await msg.reply(`✅ *Sticker stolen & branded!*\n\n📦 Pack: *${customPack}*\n✍️ Author: *${author}*\n\n_Save it from your sticker tray!_`);
    } catch (e) {
      await msg.reply(`❌ Steal error: ${e.message}`);
    }
  },
};

module.exports = stickerCommands;
