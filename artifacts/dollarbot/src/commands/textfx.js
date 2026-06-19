'use strict';

// ── Text Transformation / FX Commands ─────────────────────────────────────────
// All purely local JS — zero API calls, instant responses

// ── Unicode character map helpers ─────────────────────────────────────────────
const MAPS = {
  bold:       'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('').reduce((m,c,i)=>{const b='𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗'.split('');m[c]=b[i];return m;},{}),
  italic:     'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('').reduce((m,c,i)=>{const b='𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧'.split('');m[c]=b[i]||c;return m;},{}),
  mono:       'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('').reduce((m,c,i)=>{const b='𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿'.split('');m[c]=b[i]||c;return m;},{}),
  double:     'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('').reduce((m,c,i)=>{const b='𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡'.split('');m[c]=b[i]||c;return m;},{}),
  fraktur:    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('').reduce((m,c,i)=>{const b='𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷'.split('');m[c]=b[i]||c;return m;},{}),
  sansbold:   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('').reduce((m,c,i)=>{const b='𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'.split('');m[c]=b[i]||c;return m;},{}),
};

function applyMap(map, text) {
  return text.split('').map(c => map[c] || c).join('');
}

// Flip map for upside down text
const FLIP_MAP = {a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ı',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',A:'∀',B:'ᗺ',C:'Ɔ',D:'ᗡ',E:'Ǝ',F:'Ⅎ',G:'פ',H:'H',I:'I',J:'ſ',K:'ʞ',L:'˥',M:'W',N:'N',O:'O',P:'Ԁ',Q:'Q',R:'ᴚ',S:'S',T:'┴',U:'∩',V:'Λ',W:'M',X:'X',Y:'⅄',Z:'Z','0':'0','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'ᔭ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6','!':'¡','?':'¿',',':'\'','.':'\u02D9','\'':',','(':')',')':'(','[':']',']':'[','{':'}','}':'{','<':'>','>':'<',' ':' '};

// Zalgo diacritics
const ZALGO_UP = ['̍','̎','̄','̅','̿','̑','̆','̐','͒','͗','͑','̇','̈','̊','͂','̓','̈','͊','͋','͌','̃','̂','̌','͐','̀','́','̋','̏','̒','̓','̔','̽','̾','͛','͆','̚'];
const ZALGO_MID = ['̕','̛','̀','́','͘','̡','̢','̧','̨','̴','̵','̶','͜','͝','͞','͟','͠','͢','̸','̷','͡','҉'];
const ZALGO_DOWN = ['̖','̗','̘','̙','̜','̝','̞','̟','̠','̤','̥','̦','̩','̪','̫','̬','̭','̮','̯','̰','̱','̲','̳','̹','̺','̻','̼','ͅ','͇','͈','͉','͍','͎','͓','͔','͕','͖','͙','͚','̣'];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function zalgoText(text, intensity = 'medium') {
  const levels = { light: [1,0,1], medium: [2,1,2], heavy: [4,2,4] };
  const [u, m, d] = levels[intensity] || levels.medium;
  return text.split('').map(c => {
    if (c === ' ') return c;
    let r = c;
    for (let i = 0; i < Math.floor(Math.random() * u) + 1; i++) r += randomFrom(ZALGO_UP);
    for (let i = 0; i < Math.floor(Math.random() * m); i++) r += randomFrom(ZALGO_MID);
    for (let i = 0; i < Math.floor(Math.random() * d) + 1; i++) r += randomFrom(ZALGO_DOWN);
    return r;
  }).join('');
}

const MORSE_MAP = {
  'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---','K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-','U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
  ' ':'/','.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--',':':'---...',';':'-.-.-.','=':'-...-','+':'.-.-.','_':'..--.-','@':'.--.-.','&':'.-...',
};

const BRAILLE_MAP = {a:'⠁',b:'⠃',c:'⠉',d:'⠙',e:'⠑',f:'⠋',g:'⠛',h:'⠓',i:'⠊',j:'⠚',k:'⠅',l:'⠇',m:'⠍',n:'⠝',o:'⠕',p:'⠏',q:'⠟',r:'⠗',s:'⠎',t:'⠞',u:'⠥',v:'⠧',w:'⠺',x:'⠭',y:'⠽',z:'⠵',' ':'⠀','A':'⠁','B':'⠃','C':'⠉','D':'⠙','E':'⠑','F':'⠋','G':'⠛','H':'⠓','I':'⠊','J':'⠚','K':'⠅','L':'⠇','M':'⠍','N':'⠝','O':'⠕','P':'⠏','Q':'⠟','R':'⠗','S':'⠎','T':'⠞','U':'⠥','V':'⠧','W':'⠺','X':'⠭','Y':'⠽','Z':'⠵'};

const LEET_MAP = {'a':'4','e':'3','g':'9','i':'1','l':'1','o':'0','s':'5','t':'7','b':'8','A':'4','E':'3','G':'9','I':'1','L':'1','O':'0','S':'5','T':'7','B':'8'};

// Superscript tiny letters
const TINY_MAP = {a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',q:'ᶿ',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ',A:'ᴬ',B:'ᴮ',C:'ᶜ',D:'ᴰ',E:'ᴱ',F:'ᶠ',G:'ᴳ',H:'ᴴ',I:'ᴵ',J:'ᴶ',K:'ᴷ',L:'ᴸ',M:'ᴹ',N:'ᴺ',O:'ᴼ',P:'ᴾ',Q:'ᵠ',R:'ᴿ',S:'ˢ',T:'ᵀ',U:'ᵁ',V:'ᵛ',W:'ᵂ',X:'ˣ',Y:'ʸ',Z:'ᶻ',' ':' '};

// Vaporwave full-width
const VAPOR_MAP = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
const VAPOR_FULL = '　ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９'.split('');
const vaporMap = VAPOR_MAP.reduce((m,c,i)=>{m[c]=VAPOR_FULL[i]||c;return m;},{});

function uwuify(text) {
  return text
    .replace(/[rl]/g, 'w').replace(/[RL]/g, 'W')
    .replace(/n([aeiou])/g, 'ny$1').replace(/N([aeiou])/g, 'Ny$1').replace(/N([AEIOU])/g, 'NY$1')
    .replace(/ove/g, 'uv')
    .replace(/!+/g, match => match + ' uwu')
    .replace(/\?+/g, match => match + ' owo')
    .replace(/\./g, '. ' + ['UwU','OwO','uwu','*nuzzles*','*blushes*','*wags tail*'][Math.floor(Math.random()*6)]);
}

function owoify(text) {
  const faces = ['OwO','UwU','o.o','-.-','x3','O-O','0w0','^w^','>w<'];
  return text
    .replace(/[rl]/g,'w').replace(/[RL]/g,'W')
    .replace(/!+/g, _ => '! ' + randomFrom(faces))
    .replace(/n([aeiou])/g,'ny$1');
}

function mockText(text) {
  let up = false;
  return text.split('').map(c => {
    if (c.match(/[a-zA-Z]/)) { const r = up ? c.toUpperCase() : c.toLowerCase(); up = !up; return r; }
    return c;
  }).join('');
}

function piglatin(text) {
  const vowels = 'aeiouAEIOU';
  return text.split(' ').map(word => {
    if (!word.match(/[a-zA-Z]/)) return word;
    const lc = word.toLowerCase();
    if (vowels.includes(lc[0])) return word + 'way';
    const ci = lc.split('').findIndex(c => vowels.includes(c));
    if (ci === -1) return word + 'ay';
    return word.slice(ci) + word.slice(0, ci).toLowerCase() + 'ay';
  }).join(' ');
}

function caesar(text, shift) {
  return text.split('').map(c => {
    if (c.match(/[a-z]/)) return String.fromCharCode(((c.charCodeAt(0) - 97 + shift) % 26 + 26) % 26 + 97);
    if (c.match(/[A-Z]/)) return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26 + 26) % 26 + 65);
    return c;
  }).join('');
}

function atbash(text) {
  return text.split('').map(c => {
    if (c.match(/[a-z]/)) return String.fromCharCode(122 - (c.charCodeAt(0) - 97));
    if (c.match(/[A-Z]/)) return String.fromCharCode(90 - (c.charCodeAt(0) - 65));
    return c;
  }).join('');
}

function flipText(text) {
  return text.split('').reverse().map(c => FLIP_MAP[c] || c).join('');
}

function jumble(text) {
  return text.split(' ').map(word => {
    if (word.length <= 3) return word;
    const mid = word.slice(1, -1).split('').sort(() => Math.random() - 0.5).join('');
    return word[0] + mid + word[word.length - 1];
  }).join(' ');
}

function aestheticText(text) {
  return text.split('').join(' ');
}

function rainbowText(text) {
  const emojis = ['🔴','🟠','🟡','🟢','🔵','🟣'];
  return text.split('').map((c, i) => i === 0 ? c : (c === ' ' ? ' ' : emojis[i % emojis.length] + c)).join('');
}

function send(sock, jid, msg, text) {
  return sock.sendMessage(jid, { text }, { quoted: msg });
}

const textfxCommands = {

  async uwu(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .uwu <text>');
    const result = uwuify(args.join(' '));
    await send(sock, msg.key.remoteJid, msg, `OwO: ${result}`);
  },

  async owo(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .owo <text>');
    const result = owoify(args.join(' '));
    await send(sock, msg.key.remoteJid, msg, `OwO: ${result}`);
  },

  async mock(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .mock <text>');
    await send(sock, msg.key.remoteJid, msg, `🧽 ${mockText(args.join(' '))}`);
  },

  async vaporwave(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .vaporwave <text>');
    const v = args.join(' ').split('').map(c => vaporMap[c] || c).join('');
    await send(sock, msg.key.remoteJid, msg, `🌊 ${v}`);
  },

  async leet(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .leet <text>');
    const l = args.join(' ').split('').map(c => LEET_MAP[c] || c).join('');
    await send(sock, msg.key.remoteJid, msg, `💻 ${l}`);
  },

  async piglatin(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .piglatin <text>');
    await send(sock, msg.key.remoteJid, msg, `🐷 ${piglatin(args.join(' '))}`);
  },

  async clap(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .clap <text>');
    await send(sock, msg.key.remoteJid, msg, args.join(' ').split(' ').join(' 👏 '));
  },

  async zalgo(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .zalgo <text>');
    const intensity = ['light','medium','heavy'].includes(args[args.length-1]) ? args.pop() : 'medium';
    await send(sock, msg.key.remoteJid, msg, `👁️ ${zalgoText(args.join(' '), intensity)}`);
  },

  async flip(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .flip <text>');
    await send(sock, msg.key.remoteJid, msg, `🙃 ${flipText(args.join(' '))}`);
  },

  async mirror(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .mirror <text>');
    const t = args.join(' ');
    await send(sock, msg.key.remoteJid, msg, `🪞 ${t} | ${t.split('').reverse().join('')}`);
  },

  async aesthetic(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .aesthetic <text>');
    await send(sock, msg.key.remoteJid, msg, `✨ ${aestheticText(args.join(' '))}`);
  },

  async caesar(sock, msg, args) {
    const shift = parseInt(args[args.length - 1]);
    const hasShift = !isNaN(shift);
    const text = hasShift ? args.slice(0, -1).join(' ') : args.join(' ');
    if (!text) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .caesar <text> [shift=13]');
    const s = hasShift ? shift : 13;
    const enc = caesar(text, s);
    await send(sock, msg.key.remoteJid, msg, `🔐 Caesar (shift ${s}):\n${enc}`);
  },

  async atbash(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .atbash <text>');
    await send(sock, msg.key.remoteJid, msg, `🔄 Atbash:\n${atbash(args.join(' '))}`);
  },

  async morse(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .morse <text>');
    const text = args.join(' ').toUpperCase();
    const code = text.split('').map(c => MORSE_MAP[c] || c).join(' ');
    await send(sock, msg.key.remoteJid, msg, `📡 Morse Code:\n\`${code}\``);
  },

  async unmorse(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .unmorse <morse code>');
    const reverseMap = Object.fromEntries(Object.entries(MORSE_MAP).map(([k,v])=>[v,k]));
    const decoded = args.join(' ').split(' / ').map(word =>
      word.split(' ').map(c => reverseMap[c] || '?').join('')
    ).join(' ');
    await send(sock, msg.key.remoteJid, msg, `📡 Decoded:\n${decoded}`);
  },

  async braille(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .braille <text>');
    const b = args.join(' ').split('').map(c => BRAILLE_MAP[c.toLowerCase()] || c).join('');
    await send(sock, msg.key.remoteJid, msg, `👁️ Braille:\n${b}`);
  },

  async tiny(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .tiny <text>');
    const t = args.join(' ').split('').map(c => TINY_MAP[c] || c).join('');
    await send(sock, msg.key.remoteJid, msg, `🔡 Tiny: ${t}`);
  },

  async bold2(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .bold2 <text>');
    await send(sock, msg.key.remoteJid, msg, applyMap(MAPS.bold, args.join(' ')));
  },

  async italic2(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .italic2 <text>');
    await send(sock, msg.key.remoteJid, msg, applyMap(MAPS.italic, args.join(' ')));
  },

  async double2(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .double2 <text>');
    await send(sock, msg.key.remoteJid, msg, `𝕃𝕠𝕠𝕜: ${applyMap(MAPS.double, args.join(' '))}`);
  },

  async fraktur(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .fraktur <text>');
    await send(sock, msg.key.remoteJid, msg, applyMap(MAPS.fraktur, args.join(' ')));
  },

  async sansbold(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .sansbold <text>');
    await send(sock, msg.key.remoteJid, msg, applyMap(MAPS.sansbold, args.join(' ')));
  },

  async jumble(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .jumble <text>');
    await send(sock, msg.key.remoteJid, msg, `🎲 ${jumble(args.join(' '))}`);
  },

  async shout(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .shout <text>');
    await send(sock, msg.key.remoteJid, msg, `📢 ${args.join(' ').toUpperCase()}!!!`);
  },

  async whisper(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .whisper <text>');
    await send(sock, msg.key.remoteJid, msg, `🤫 _${args.join(' ').toLowerCase()}_`);
  },

  async rainbow(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .rainbow <text>');
    const emojis = ['🔴','🟠','🟡','🟢','🔵','🟣','🟤'];
    const result = args.join(' ').split('').map((c, i) => c === ' ' ? ' ' : emojis[i % 7] + c).join('');
    await send(sock, msg.key.remoteJid, msg, result);
  },

  async repeat(sock, msg, args) {
    const n = parseInt(args[args.length - 1]);
    if (isNaN(n) || n < 1 || n > 20) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .repeat <text> <count 1-20>');
    const text = args.slice(0, -1).join(' ');
    if (!text) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .repeat <text> <count>');
    await send(sock, msg.key.remoteJid, msg, Array(n).fill(text).join('\n'));
  },

  async backwards(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .backwards <text>');
    await send(sock, msg.key.remoteJid, msg, `🔄 ${args.reverse().join(' ')}`);
  },

  async charcount(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .charcount <text>');
    const text = args.join(' ');
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    const noSpaces = text.replace(/\s/g,'').length;
    const sentences = (text.match(/[.!?]+/g)||[]).length;
    await send(sock, msg.key.remoteJid, msg,
      `📊 *Text Stats*\n\n` +
      `📝 Characters: *${chars}*\n` +
      `🔤 Without spaces: *${noSpaces}*\n` +
      `📄 Words: *${words}*\n` +
      `💬 Sentences: *${sentences}*`
    );
  },

  async upper(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .upper <text>');
    await send(sock, msg.key.remoteJid, msg, args.join(' ').toUpperCase());
  },

  async lower(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .lower <text>');
    await send(sock, msg.key.remoteJid, msg, args.join(' ').toLowerCase());
  },

  async titlecase(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .titlecase <text>');
    const t = args.join(' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    await send(sock, msg.key.remoteJid, msg, t);
  },

  async base64e(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .base64e <text>');
    await send(sock, msg.key.remoteJid, msg, `🔒 Base64:\n${Buffer.from(args.join(' ')).toString('base64')}`);
  },

  async base64d(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .base64d <base64>');
    try {
      const dec = Buffer.from(args.join(' '), 'base64').toString('utf8');
      await send(sock, msg.key.remoteJid, msg, `🔓 Decoded:\n${dec}`);
    } catch { await send(sock, msg.key.remoteJid, msg, '❌ Invalid base64 string'); }
  },

  async hexify(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .hexify <text>');
    const hex = args.join(' ').split('').map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ');
    await send(sock, msg.key.remoteJid, msg, `🔢 Hex:\n${hex}`);
  },

  async unhex(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .unhex <hex>');
    try {
      const text = args.join('').replace(/[^0-9a-fA-F]/g,'').match(/.{2}/g).map(h => String.fromCharCode(parseInt(h,16))).join('');
      await send(sock, msg.key.remoteJid, msg, `📝 Decoded:\n${text}`);
    } catch { await send(sock, msg.key.remoteJid, msg, '❌ Invalid hex string'); }
  },

  async binarytext(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .binarytext <text>');
    const bin = args.join(' ').split('').map(c => c.charCodeAt(0).toString(2).padStart(8,'0')).join(' ');
    await send(sock, msg.key.remoteJid, msg, `💾 Binary:\n${bin}`);
  },

  async unbinary(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .unbinary <binary>');
    try {
      const text = args.join(' ').trim().split(/\s+/).map(b => String.fromCharCode(parseInt(b,2))).join('');
      await send(sock, msg.key.remoteJid, msg, `📝 Decoded:\n${text}`);
    } catch { await send(sock, msg.key.remoteJid, msg, '❌ Invalid binary string'); }
  },

  async cursed(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .cursed <text>');
    await send(sock, msg.key.remoteJid, msg, `👁️ ${zalgoText(args.join(' '), 'heavy')}`);
  },

  async monospacetext(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .monospacetext <text>');
    await send(sock, msg.key.remoteJid, msg, applyMap(MAPS.mono, args.join(' ')));
  },

  async findreplace(sock, msg, args) {
    if (args.length < 3) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .findreplace <word_to_find> <replace_with> <text>');
    const find = args[0];
    const replace = args[1];
    const text = args.slice(2).join(' ');
    await send(sock, msg.key.remoteJid, msg, text.split(find).join(replace));
  },

  async shuffle(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .shuffle <word1> <word2> ...');
    const shuffled = [...args].sort(() => Math.random() - 0.5).join(' ');
    await send(sock, msg.key.remoteJid, msg, `🔀 ${shuffled}`);
  },

  async stutter(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .stutter <text>');
    const t = args.join(' ').split(' ').map(w => w[0] ? `${w[0]}-${w[0]}-${w}` : w).join(' ');
    await send(sock, msg.key.remoteJid, msg, `😰 ${t}`);
  },

  async emspace(sock, msg, args) {
    if (!args.length) return send(sock, msg.key.remoteJid, msg, '❌ Usage: .emspace <text>');
    await send(sock, msg.key.remoteJid, msg, args.join('   '));
  },
};

module.exports = textfxCommands;
