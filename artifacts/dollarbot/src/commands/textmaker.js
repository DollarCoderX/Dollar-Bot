'use strict';
const fetch = require('node-fetch');

// Text art generator via Pollinations image API — each style has a unique prompt template
const STYLES = {
  '3d':         (t) => `3D chrome metallic floating text "${t}" dramatic studio lighting dark background, 8K render, photorealistic`,
  angel:        (t) => `glowing golden angel wings text art "${t}" on heavenly white cloud background, divine light beams, ethereal`,
  avenger:      (t) => `Marvel Avengers logo style text "${t}" gold and dark red metallic, comic book art, dramatic`,
  blub:         (t) => `bubbly cartoon bubble letters text "${t}" soft blue pastel cute style kawaii`,
  bpink:        (t) => `BLACKPINK K-pop style pink glitter sparkle text "${t}" on black background, bold iconic`,
  cat:          (t) => `cute cat paw kawaii text art "${t}" pink soft background, adorable chibi style`,
  glitch:       (t) => `glitch art distorted text "${t}" RGB split VHS digital corruption cyan magenta on dark`,
  glitter:      (t) => `sparkling glitter text "${t}" gold silver shimmering bokeh luxury style`,
  graffiti:     (t) => `urban street graffiti tag "${t}" spray paint on brick wall, colorful, tags wild style`,
  hacker:       (t) => `dark hacker terminal green phosphor text "${t}" on pure black, matrix code, cyber`,
  light:        (t) => `neon light tube sign photography "${t}" warm white and yellow glow dark background realistic`,
  marvel:       (t) => `Marvel Comics classic title card "${t}" red gold metallic embossed dramatic`,
  neon:         (t) => `neon sign glowing text "${t}" pink blue purple glow dark background, nightclub, synthwave`,
  sci:          (t) => `sci-fi holographic HUD display text "${t}" blue glowing digital futuristic technology`,
  sign:         (t) => `vintage retro enamel road sign "${t}" weathered metal frame bold white letters rustic`,
  tattoo:       (t) => `fine line tattoo script calligraphy text "${t}" black ink on skin, intricate elegant`,
  watercolor:   (t) => `watercolor painted text "${t}" soft pastel colors paper texture artistic brushstroke`,
};

const W = 900, H = 350;

async function makeText(sock, msg, style, args) {
  const jid = msg.key.remoteJid;
  if (!args.length)
    return sock.sendMessage(jid, {
      text: `❌ Usage: .${style} <text>\nExample: .${style} Dollar`,
    }, { quoted: msg });

  const text = args.join(' ').slice(0, 60);
  await sock.sendMessage(jid, { text: `🎨 Generating *${style.toUpperCase()}* text art...` }, { quoted: msg });

  try {
    const promptFn = STYLES[style];
    const prompt = promptFn(text);
    const seed = Math.floor(Math.random() * 99999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${W}&height=${H}&nologo=true&seed=${seed}&model=flux`;

    const res = await fetch(url, { timeout: 60000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.buffer();

    await sock.sendMessage(jid, {
      image: buf,
      mimetype: 'image/jpeg',
      caption: `✨ *${style.toUpperCase()}* — _${text}_`,
    }, { quoted: msg });
  } catch (e) {
    console.error('[TextMaker]', e.message);
    await sock.sendMessage(jid, { text: `❌ TextMaker failed: ${e.message}` }, { quoted: msg });
  }
}

const module_ = {};
for (const [style] of Object.entries(STYLES)) {
  module_[style] = (sock, msg, args) => makeText(sock, msg, style, args);
}
module_['3d'] = (sock, msg, args) => makeText(sock, msg, '3d', args);
module.exports = module_;
