'use strict';
const fetch = require('node-fetch');
const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Image editor commands — uses FFmpeg for basic transforms + Pollinations for AI effects

async function getImageBuffer(sock, msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const imgMsg = msg.message?.imageMessage || quoted?.imageMessage || quoted?.stickerMessage;
  if (!imgMsg) return null;
  const targetMsg = msg.message?.imageMessage
    ? msg
    : { key: { remoteJid: msg.key.remoteJid, id: msg.message.extendedTextMessage.contextInfo.stanzaId, fromMe: false }, message: quoted };
  try {
    return await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
  } catch (e) { return null; }
}

async function ffmpegImg(buffer, vfFilter) {
  const id = crypto.randomBytes(4).toString('hex');
  const tmpIn  = path.join(os.tmpdir(), `dbed_${id}_in.jpg`);
  const tmpOut = path.join(os.tmpdir(), `dbed_${id}_out.jpg`);
  fs.writeFileSync(tmpIn, buffer);
  await new Promise((resolve, reject) => {
    execFile('ffmpeg', ['-y', '-i', tmpIn, '-vf', vfFilter, '-q:v', '2', tmpOut],
      { timeout: 30000 }, (err, _, stderr) => { if (err) reject(new Error(stderr || err.message)); else resolve(); });
  });
  const out = fs.readFileSync(tmpOut);
  try { fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); } catch (_) {}
  return out;
}

async function pollinationsStyle(text, style) {
  const prompts = {
    bloody:   `horror blood splatter gore style image "${text}" dark red blood dripping dramatic horror`,
    bokeh:    `beautiful bokeh depth-of-field photograph soft blurred background "${text}" professional DSLR`,
    cartoon:  `cartoon animated style illustration "${text}" colorful vibrant flat design`,
    dark:     `dark moody cinematic noir photograph "${text}" shadows dramatic low-key lighting`,
    demon:    `demonic supernatural dark fantasy "${text}" red eyes horns fire shadows ominous`,
    gandm:    `galaxy and moon cosmic space photograph "${text}" nebula stars milky way`,
    horned:   `fantasy character with dramatic horns "${text}" epic fantasy art digital painting`,
    kiss:     `romantic kiss watercolor painting "${text}" soft warm colors love couple`,
    look:     `stylish fashion editorial photograph "${text}" luxury aesthetic cinematic`,
    makeup:   `professional glamour makeup beauty photograph "${text}" studio lighting cosmetics`,
    skull:    `skull art gothic design "${text}" black white dramatic crossbones`,
    wanted:   `old west wanted poster "${text}" sepia vintage paper torn edges sheriff`,
    zombie:   `zombie apocalypse horror "${text}" undead decaying dramatic cinematic`,
  };
  const prompt = prompts[style] || `${style} artistic style "${text}"`;
  const seed = Math.floor(Math.random() * 99999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&nologo=true&seed=${seed}`;
  const res = await fetch(url, { timeout: 60000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.buffer();
}

const AI_EFFECTS  = ['bloody','bokeh','cartoon','dark','demon','gandm','horned','kiss','look','makeup','skull','wanted','zombie'];
const FFX_EFFECTS = {
  color:   'hue=s=2.5,eq=saturation=1.8',
  enhance: 'unsharp=5:5:1.5:5:5:0.0,eq=brightness=0.05',
  pencil:  'edgedetect=low=0.1:high=0.4,colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
  sketch:  'format=gray,edgedetect=mode=colormix:high=0.1',
};

async function editorCmd(sock, msg, args, effect) {
  const jid = msg.key.remoteJid;

  if (AI_EFFECTS.includes(effect)) {
    // These work on text prompt (can still check for image)
    const queryText = args.join(' ') || 'amazing art';
    await sock.sendMessage(jid, { text: `🎨 Generating *${effect.toUpperCase()}* image...` }, { quoted: msg });
    try {
      const buf = await pollinationsStyle(queryText, effect);
      await sock.sendMessage(jid, {
        image: buf,
        caption: `✨ *${effect.toUpperCase()}* — _${queryText}_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ ${effect} failed: ${e.message}` }, { quoted: msg });
    }
    return;
  }

  // FFmpeg-based effects require an image
  const buf = await getImageBuffer(sock, msg);
  if (!buf) {
    return sock.sendMessage(jid, {
      text: `❌ Reply to an *image* with *.${effect}* to apply the filter.`,
    }, { quoted: msg });
  }
  await sock.sendMessage(jid, { text: `🎨 Applying *${effect.toUpperCase()}* effect...` }, { quoted: msg });
  try {
    const filter = FFX_EFFECTS[effect];
    const result = await ffmpegImg(buf, filter);
    await sock.sendMessage(jid, {
      image: result,
      caption: `✨ *${effect.toUpperCase()}* filter applied.`,
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(jid, { text: `❌ ${effect} failed: ${e.message}` }, { quoted: msg });
  }
}

const m = {};
for (const e of [...AI_EFFECTS, ...Object.keys(FFX_EFFECTS)]) {
  m[e] = (sock, msg, args) => editorCmd(sock, msg, args, e);
}
module.exports = m;
