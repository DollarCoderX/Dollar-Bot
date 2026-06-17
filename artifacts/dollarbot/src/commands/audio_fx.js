'use strict';
const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// FFmpeg audio effect filters
const EFFECTS = {
  avec:      { filter: 'aecho=0.8:0.9:1000|1800:0.3|0.25', label: '🎵 Reverb (Avec)' },
  bass:      { filter: 'bass=g=12,dynaudnorm', label: '🔊 Bass Boost' },
  black:     { filter: 'equalizer=f=300:width_type=o:width=2:g=8,asetrate=44100*0.95,aresample=44100', label: '🖤 Black' },
  blown:     { filter: 'volume=5.0,alimiter=level_out=1.0', label: '💥 Blown Out' },
  cut:       { filter: 'atrim=start=0:end=30,asetpts=PTS-STARTPTS', label: '✂️ Cut (30s)' },
  deep:      { filter: 'asetrate=44100*0.78,aresample=44100,atempo=1.28', label: '🌊 Deep' },
  earrape:   { filter: 'volume=20.0', label: '👂 Earrape' },
  fast:      { filter: 'atempo=1.5', label: '⚡ Fast' },
  fat:       { filter: 'equalizer=f=80:width_type=o:width=2:g=10,dynaudnorm', label: '🐋 Fat' },
  histo:     { filter: 'dynaudnorm=p=0.95:m=100,alimiter', label: '📊 Histo (Normalize)' },
  low:       { filter: 'asetrate=44100*0.65,aresample=44100,atempo=1.54', label: '📉 Low Pitch' },
  nightcore: { filter: 'asetrate=44100*1.25,aresample=44100', label: '🌙 Nightcore' },
  pitch:     { filter: 'asetrate=44100*1.35,aresample=44100', label: '🎵 Pitch Up' },
  robot:     { filter: 'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75', label: '🤖 Robot' },
  slow:      { filter: 'atempo=0.7', label: '🐌 Slow' },
  smooth:    { filter: 'dynaudnorm=p=0.9:m=100,afade=t=in:ss=0:d=2', label: '🌊 Smooth' },
  treble:    { filter: 'treble=g=12', label: '🎶 Treble' },
  tupai:     { filter: 'asetrate=44100*2.0,aresample=44100,atempo=0.5', label: '🐿️ Chipmunk (Tupai)' },
  vector:    { filter: 'aecho=0.8:0.88:60|130:0.4|0.3', label: '🔉 Vector Echo' },
};

async function applyAudioEffect(sock, msg, effectName) {
  const jid = msg.key.remoteJid;
  const effect = EFFECTS[effectName];
  if (!effect) return;

  // Find quoted audio/PTT message
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const audioMsg = quoted?.audioMessage || quoted?.pttMessage;
  if (!audioMsg && !msg.message?.audioMessage && !msg.message?.pttMessage) {
    return sock.sendMessage(jid, {
      text: `❌ Reply to a voice note or audio with *.${effectName}*`,
    }, { quoted: msg });
  }

  await sock.sendMessage(jid, { text: `⏳ Applying ${effect.label} effect...` }, { quoted: msg });

  try {
    // Rebuild a proper quoted message context for download
    const targetMsg = (msg.message?.audioMessage || msg.message?.pttMessage)
      ? msg
      : {
          key: msg.message.extendedTextMessage.contextInfo.stanzaId
            ? { remoteJid: jid, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: false, participant: msg.message.extendedTextMessage.contextInfo.participant }
            : msg.key,
          message: quoted,
        };

    const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
    if (!buffer || buffer.length < 100) throw new Error('Empty audio buffer');

    const id = crypto.randomBytes(4).toString('hex');
    const tmpIn  = path.join(os.tmpdir(), `dbfx_${id}_in.ogg`);
    const tmpOut = path.join(os.tmpdir(), `dbfx_${id}_out.ogg`);

    fs.writeFileSync(tmpIn, buffer);

    await new Promise((resolve, reject) => {
      const args = [
        '-y', '-i', tmpIn,
        '-af', effect.filter,
        '-c:a', 'libopus',
        '-b:a', '64k',
        '-ar', '48000',
        '-ac', '1',
        tmpOut,
      ];
      execFile('ffmpeg', args, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    const outBuf = fs.readFileSync(tmpOut);
    fs.unlinkSync(tmpIn);
    fs.unlinkSync(tmpOut);

    await sock.sendMessage(jid, {
      audio: outBuf,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
    }, { quoted: msg });
  } catch (e) {
    console.error('[AudioFX]', e.message);
    await sock.sendMessage(jid, { text: `❌ Audio effect failed: ${e.message}` }, { quoted: msg });
  }
}

// Export one handler per effect
const exports_ = {};
for (const name of Object.keys(EFFECTS)) {
  exports_[name] = (sock, msg) => applyAudioEffect(sock, msg, name);
}
module.exports = exports_;
