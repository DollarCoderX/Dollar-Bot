'use strict';
/**
 * src/lib/sticker.js
 * Sticker utilities for DollarBot V5:
 *   - imageToSticker(buffer, packname, author)  → WebP buffer with EXIF metadata
 *   - stickerToImage(buffer)                    → PNG buffer
 *   - addStickerMetadata(webpBuffer, opts)       → injects packname/author EXIF
 */

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// ── Helpers ───────────────────────────────────────────────────────────────────

function tmpFile(ext) {
  return path.join(os.tmpdir(), `db_stk_${crypto.randomBytes(6).toString('hex')}.${ext}`);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

// ── Pure-JS WhatsApp sticker EXIF injection ──────────────────────────────────
// WhatsApp reads a JSON object embedded in the WebP EXIF chunk.
// Format: standard TIFF little-endian header + JSON payload.

function buildExifBuffer({ packname = 'DollarBot 💵', author = 'Dollar 🇨🇦' } = {}) {
  const json = {
    'sticker-pack-id': 'com.dollarbot.stickers',
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': ['💵', '🇨🇦', '✨'],
  };
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');

  // Fixed TIFF/EXIF header that WhatsApp accepts (little-endian, one IFD entry)
  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, // TIFF little-endian magic
    0x08, 0x00, 0x00, 0x00, // IFD offset = 8
    0x01, 0x00,             // 1 IFD entry
    0x41, 0x57,             // tag 0x5741 ("WA")
    0x07, 0x00,             // type = UNDEFINED
    0x00, 0x00, 0x00, 0x00, // count (filled below)
    0x16, 0x00, 0x00, 0x00, // value offset = 22 (after this entry)
  ]);

  // Write length of JSON payload into bytes 12-15
  exifHeader.writeUInt32LE(jsonBuf.length, 12);

  return Buffer.concat([exifHeader, jsonBuf]);
}

/**
 * Inject EXIF metadata into an existing WebP buffer.
 * Inserts an 'EXIF' RIFF chunk into the WebP container.
 */
function addStickerMetadata(webpBuffer, opts = {}) {
  try {
    const exifData = buildExifBuffer(opts);

    // 'EXIF' chunk: 4-byte tag + 4-byte LE size + data (padded to even)
    const tag = Buffer.from('EXIF');
    const sizeLE = Buffer.allocUnsafe(4);
    sizeLE.writeUInt32LE(exifData.length, 0);
    const padding = exifData.length % 2 ? Buffer.from([0x00]) : Buffer.alloc(0);
    const exifChunk = Buffer.concat([tag, sizeLE, exifData, padding]);

    // Insert EXIF chunk right after the 12-byte RIFF/WEBP header
    const header = webpBuffer.slice(0, 12);
    const body   = webpBuffer.slice(12);

    // Update the RIFF total size (bytes 4-7)
    const newTotal = webpBuffer.length - 8 + exifChunk.length;
    const newHeader = Buffer.from(header);
    newHeader.writeUInt32LE(newTotal, 4);

    return Buffer.concat([newHeader, exifChunk, body]);
  } catch {
    return webpBuffer; // fallback: return original if something goes wrong
  }
}

// ── Image → Sticker ───────────────────────────────────────────────────────────
/**
 * Convert any image buffer (PNG/JPG/GIF/WebP) into a 512x512 WebP sticker.
 * Embeds packname and author EXIF metadata.
 * @param {Buffer} inputBuffer
 * @param {string} packname
 * @param {string} author
 * @returns {Promise<Buffer>}
 */
async function imageToSticker(inputBuffer, packname = 'DollarBot 💵', author = 'Dollar 🇨🇦') {
  const inFile  = tmpFile('img');
  const outFile = tmpFile('webp');

  try {
    fs.writeFileSync(inFile, inputBuffer);

    await runFfmpeg([
      '-y',
      '-i', inFile,
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0',
      '-vcodec', 'libwebp',
      '-lossless', '0',
      '-q:v', '80',
      '-loop', '0',
      '-preset', 'picture',
      '-an', '-vsync', '0',
      outFile,
    ]);

    const rawWebp = fs.readFileSync(outFile);
    return addStickerMetadata(rawWebp, { packname, author });
  } finally {
    try { fs.unlinkSync(inFile);  } catch (_) {}
    try { fs.unlinkSync(outFile); } catch (_) {}
  }
}

// ── Sticker → Image ───────────────────────────────────────────────────────────
/**
 * Convert a WebP sticker buffer back to a PNG image buffer.
 * @param {Buffer} webpBuffer
 * @returns {Promise<Buffer>}
 */
async function stickerToImage(webpBuffer) {
  const inFile  = tmpFile('webp');
  const outFile = tmpFile('png');

  try {
    fs.writeFileSync(inFile, webpBuffer);

    await runFfmpeg([
      '-y',
      '-i', inFile,
      '-frames:v', '1',
      outFile,
    ]);

    return fs.readFileSync(outFile);
  } finally {
    try { fs.unlinkSync(inFile);  } catch (_) {}
    try { fs.unlinkSync(outFile); } catch (_) {}
  }
}

module.exports = { imageToSticker, stickerToImage, addStickerMetadata, buildExifBuffer };
