'use strict';
const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function getVideoBuffer(sock, msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const vidMsg = msg.message?.videoMessage || quoted?.videoMessage;
  if (!vidMsg) return null;
  const targetMsg = msg.message?.videoMessage
    ? msg
    : { key: { remoteJid: msg.key.remoteJid, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: false }, message: quoted };
  try {
    return await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
  } catch (e) { return null; }
}

async function getAudioBuffer(sock, msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const msg2 = msg.message?.audioMessage || msg.message?.pttMessage || quoted?.audioMessage || quoted?.pttMessage;
  if (!msg2) return null;
  const targetMsg = (msg.message?.audioMessage || msg.message?.pttMessage)
    ? msg
    : { key: { remoteJid: msg.key.remoteJid, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: false }, message: quoted };
  try {
    return await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
  } catch (e) { return null; }
}

function ffmpegRun(args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, { timeout: timeoutMs }, (err, _, stderr) => {
      if (err) reject(new Error(stderr?.slice(-300) || err.message));
      else resolve();
    });
  });
}

function tmpFile(ext) {
  return path.join(os.tmpdir(), `dbvid_${crypto.randomBytes(4).toString('hex')}.${ext}`);
}

module.exports = {

  // .trim <start> <end> — trim video (e.g. .trim 5 30)
  async trim(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const [start, end] = args.map(Number);
    if (isNaN(start) || isNaN(end) || end <= start)
      return sock.sendMessage(jid, { text: '❌ Usage: .trim <start_sec> <end_sec>\nExample: .trim 5 30' }, { quoted: msg });
    const buf = await getVideoBuffer(sock, msg);
    if (!buf) return sock.sendMessage(jid, { text: '❌ Reply to a *video* with .trim <start> <end>' }, { quoted: msg });
    await sock.sendMessage(jid, { text: `✂️ Trimming video from ${start}s to ${end}s...` }, { quoted: msg });
    const inF = tmpFile('mp4'), outF = tmpFile('mp4');
    try {
      fs.writeFileSync(inF, buf);
      await ffmpegRun(['-y', '-i', inF, '-ss', String(start), '-to', String(end), '-c', 'copy', outF]);
      const out = fs.readFileSync(outF);
      await sock.sendMessage(jid, { video: out, mimetype: 'video/mp4', caption: `✂️ Trimmed: ${start}s → ${end}s` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Trim failed: ${e.message}` }, { quoted: msg });
    } finally {
      try { fs.unlinkSync(inF); fs.unlinkSync(outF); } catch (_) {}
    }
  },

  // .compress — compress video to smaller size
  async compress(sock, msg) {
    const jid = msg.key.remoteJid;
    const buf = await getVideoBuffer(sock, msg);
    if (!buf) return sock.sendMessage(jid, { text: '❌ Reply to a *video* with .compress' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '📦 Compressing video...' }, { quoted: msg });
    const inF = tmpFile('mp4'), outF = tmpFile('mp4');
    try {
      fs.writeFileSync(inF, buf);
      await ffmpegRun(['-y', '-i', inF, '-vcodec', 'libx264', '-crf', '35', '-preset', 'fast', '-acodec', 'aac', '-b:a', '64k', outF]);
      const out = fs.readFileSync(outF);
      const saved = Math.round((1 - out.length / buf.length) * 100);
      await sock.sendMessage(jid, { video: out, mimetype: 'video/mp4', caption: `📦 Compressed — ${saved}% smaller` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Compress failed: ${e.message}` }, { quoted: msg });
    } finally {
      try { fs.unlinkSync(inF); fs.unlinkSync(outF); } catch (_) {}
    }
  },

  // .mp3 — extract audio from video
  async mp3(sock, msg) {
    const jid = msg.key.remoteJid;
    const buf = await getVideoBuffer(sock, msg);
    if (!buf) return sock.sendMessage(jid, { text: '❌ Reply to a *video* with .mp3 to extract audio' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '🎵 Extracting audio...' }, { quoted: msg });
    const inF = tmpFile('mp4'), outF = tmpFile('ogg');
    try {
      fs.writeFileSync(inF, buf);
      await ffmpegRun(['-y', '-i', inF, '-vn', '-c:a', 'libopus', '-b:a', '128k', outF]);
      const out = fs.readFileSync(outF);
      await sock.sendMessage(jid, { audio: out, mimetype: 'audio/ogg; codecs=opus', ptt: false }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ MP3 extract failed: ${e.message}` }, { quoted: msg });
    } finally {
      try { fs.unlinkSync(inF); fs.unlinkSync(outF); } catch (_) {}
    }
  },

  // .reverse — reverse video
  async reverse(sock, msg) {
    const jid = msg.key.remoteJid;
    const buf = await getVideoBuffer(sock, msg);
    if (!buf) return sock.sendMessage(jid, { text: '❌ Reply to a *video* with .reverse' }, { quoted: msg });
    await sock.sendMessage(jid, { text: '⏮️ Reversing video...' }, { quoted: msg });
    const inF = tmpFile('mp4'), outF = tmpFile('mp4');
    try {
      fs.writeFileSync(inF, buf);
      await ffmpegRun(['-y', '-i', inF, '-vf', 'reverse', '-af', 'areverse', outF], 180000);
      const out = fs.readFileSync(outF);
      await sock.sendMessage(jid, { video: out, mimetype: 'video/mp4', caption: '⏮️ Video reversed!' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Reverse failed: ${e.message}` }, { quoted: msg });
    } finally {
      try { fs.unlinkSync(inF); fs.unlinkSync(outF); } catch (_) {}
    }
  },

  // .rotate <90|180|270> — rotate video
  async rotate(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const deg = parseInt(args[0]) || 90;
    const transposeMap = { 90: '1', 180: '2,transpose=2', 270: '2' };
    const transpose = transposeMap[deg] || '1';
    const buf = await getVideoBuffer(sock, msg);
    if (!buf) return sock.sendMessage(jid, { text: '❌ Reply to a *video* with .rotate [90|180|270]' }, { quoted: msg });
    await sock.sendMessage(jid, { text: `🔄 Rotating ${deg}°...` }, { quoted: msg });
    const inF = tmpFile('mp4'), outF = tmpFile('mp4');
    try {
      fs.writeFileSync(inF, buf);
      await ffmpegRun(['-y', '-i', inF, '-vf', `transpose=${transpose}`, '-c:a', 'copy', outF]);
      const out = fs.readFileSync(outF);
      await sock.sendMessage(jid, { video: out, mimetype: 'video/mp4', caption: `🔄 Rotated ${deg}°` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Rotate failed: ${e.message}` }, { quoted: msg });
    } finally {
      try { fs.unlinkSync(inF); fs.unlinkSync(outF); } catch (_) {}
    }
  },

  // .crop <w>:<h>:<x>:<y> — crop video
  async crop(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const spec = args[0] || '640:480:0:0';
    const buf = await getVideoBuffer(sock, msg);
    if (!buf) return sock.sendMessage(jid, { text: '❌ Reply to a *video* with .crop <w:h:x:y>\nExample: .crop 640:480:0:0' }, { quoted: msg });
    await sock.sendMessage(jid, { text: `✂️ Cropping video (${spec})...` }, { quoted: msg });
    const inF = tmpFile('mp4'), outF = tmpFile('mp4');
    try {
      fs.writeFileSync(inF, buf);
      await ffmpegRun(['-y', '-i', inF, '-vf', `crop=${spec}`, '-c:a', 'copy', outF]);
      const out = fs.readFileSync(outF);
      await sock.sendMessage(jid, { video: out, mimetype: 'video/mp4', caption: `✂️ Cropped: ${spec}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Crop failed: ${e.message}` }, { quoted: msg });
    } finally {
      try { fs.unlinkSync(inF); fs.unlinkSync(outF); } catch (_) {}
    }
  },

  // .merge — merge two videos (reply to one, send command with second quoted)
  async merge(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, {
      text:
        '📎 *Merge Videos*\n\n' +
        'To merge, forward both videos and use .trim on each, then send them back-to-back.\n\n' +
        '_Note: Full merge requires two uploaded videos. For now, use .trim to cut segments._',
    }, { quoted: msg });
  },
};
