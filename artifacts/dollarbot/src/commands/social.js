'use strict';
/**
 * social.js — 70+ new commands: gaycheck, lesbiancheck, phone, celeb,
 * personality checks, AI-powered info, and more
 */

const fetch = require('node-fetch');
const pollinations = require('../lib/pollinations');
const config = require('../config');
const env = require('../env');

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(name, salt) {
  let h = 0;
  const s = (name + salt).toLowerCase();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 80) + 10; // range 10–90
}

function bar(p) {
  const filled = Math.round(p / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function getSender(msg) {
  return msg?.key?.participant || msg?.key?.remoteJid || '';
}

function getMentioned(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg.message?.imageMessage?.contextInfo?.mentionedJid ||
    []
  );
}

function getQuotedJid(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    msg.message?.imageMessage?.contextInfo?.participant ||
    null
  );
}

function resolveTarget(msg, args, sock) {
  const quoted = getQuotedJid(msg);
  if (quoted) return quoted;
  const mentioned = getMentioned(msg);
  if (mentioned.length) return mentioned[0];
  if (args[0]) {
    const digits = args[0].replace(/[^0-9]/g, '');
    if (digits.length >= 7) return digits + '@s.whatsapp.net';
  }
  return getSender(msg);
}

function targetName(msg, args, target) {
  if (args.length && !args[0].startsWith('@')) return args.join(' ');
  return target?.split('@')[0]?.split(':')[0] || 'you';
}

async function tryAI(messages, fallback) {
  try {
    const res = await pollinations.textGenerate(messages);
    return res || fallback;
  } catch { return fallback; }
}

// ── Wikipedia celeb helper ────────────────────────────────────────────────────
async function fetchCelebInfo(query) {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { timeout: 15000 }
    );
    if (searchRes.ok) {
      const d = await searchRes.json();
      if (d.type !== 'disambiguation' && d.extract) return d;
    }
    // fallback: search
    const res2 = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`,
      { timeout: 12000 }
    );
    if (res2.ok) {
      const d2 = await res2.json();
      const title = d2?.query?.search?.[0]?.title;
      if (title) {
        const res3 = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { timeout: 12000 }
        );
        if (res3.ok) return await res3.json();
      }
    }
  } catch (_) {}
  return null;
}

// ── Social commands map ───────────────────────────────────────────────────────

const socialCommands = {

  // ── .celeb <name> — celebrity full profile with AI facts ─────────────────
  async celeb(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, {
        text: '❌ Usage: .celeb <name>\nExample: .celeb Justin Bieber',
      }, { quoted: msg });
    }
    const query = args.join(' ');
    await sock.sendMessage(jid, { text: `🔍 *Searching celebrity:* _"${query}"_...` }, { quoted: msg });

    try {
      const info = await fetchCelebInfo(query);
      if (!info || !info.extract) {
        return sock.sendMessage(jid, { text: `❌ Could not find info about *${query}*. Try a more specific name.` }, { quoted: msg });
      }

      const title   = info.title || query;
      const desc    = info.description || '';
      const extract = info.extract?.slice(0, 350) + (info.extract?.length > 350 ? '...' : '');
      const imgUrl  = info.originalimage?.source || info.thumbnail?.source;

      // AI-generated cool facts
      let aiFacts = '';
      try {
        aiFacts = await tryAI([{
          role: 'user',
          content: `Give 3 surprising, interesting, or little-known facts about ${title}. Be specific and accurate. Use bullet points (•). Keep each fact under 20 words. No hashtags.`,
        }], '');
      } catch (_) {}

      const text =
        `╭━━━〔 ⭐ CELEBRITY INFO 〕━━━⬣\n` +
        `┃ *${title}*\n` +
        (desc ? `┃ _${desc}_\n` : '') +
        `┃\n` +
        `┃ 📝 *About:*\n` +
        `┃ ${extract.replace(/\n/g, '\n┃ ')}\n` +
        (aiFacts ? `┃\n┃ 💡 *Cool Facts:*\n┃ ${aiFacts.replace(/\n/g, '\n┃ ')}\n` : '') +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `_⚡ Powered by DollarBot V6_`;

      if (imgUrl) {
        try {
          const imgRes = await fetch(imgUrl, { timeout: 12000 });
          if (imgRes.ok) {
            const buf = await imgRes.buffer();
            return sock.sendMessage(jid, { image: buf, caption: text }, { quoted: msg });
          }
        } catch (_) {}
      }
      await sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Celeb Error: ${e.message}` }, { quoted: msg });
    }
  },

  // ── .phone @user — professional number lookup ─────────────────────────────
  async phone(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const num = target?.split('@')[0]?.split(':')[0] || 'unknown';
    await sock.sendMessage(jid, { text: `🔍 _Looking up +${num}..._` }, { quoted: msg });

    // Country code lookup (longest-prefix first)
    const PREFIXES = [
      ['380','Ukraine','🇺🇦',['Kyivstar','Vodafone UA','Lifecell']],
      ['234','Nigeria','🇳🇬',['MTN','Glo','Airtel','9mobile']],
      ['233','Ghana','🇬🇭',['MTN','Vodafone GH','AirtelTigo']],
      ['263','Zimbabwe','🇿🇼',['Econet','NetOne','Telecel']],
      ['260','Zambia','🇿🇲',['MTN Zambia','Airtel','Zamtel']],
      ['255','Tanzania','🇹🇿',['Vodacom','Airtel TZ','Tigo']],
      ['256','Uganda','🇺🇬',['MTN UG','Airtel UG','Africell']],
      ['254','Kenya','🇰🇪',['Safaricom','Airtel KE','Telkom KE']],
      ['251','Ethiopia','🇪🇹',['Ethio Telecom','Safaricom ET']],
      ['250','Rwanda','🇷🇼',['MTN RW','Airtel RW']],
      ['243','DR Congo','🇨🇩',['Vodacom DRC','Airtel DRC','Orange DRC']],
      ['237','Cameroon','🇨🇲',['MTN CM','Orange CM']],
      ['225','Ivory Coast','🇨🇮',['Orange CI','MTN CI','Moov']],
      ['221','Senegal','🇸🇳',['Orange SN','Free SN','Expresso']],
      ['212','Morocco','🇲🇦',['Maroc Telecom','Orange MA','Inwi']],
      ['249','Sudan','🇸🇩',['Zain SD','MTN SD','Sudatel']],
      ['267','Botswana','🇧🇼',['Mascom','Orange BW']],
      ['258','Mozambique','🇲🇿',['mCel','Vodacom MZ','Movitel']],
      ['264','Namibia','🇳🇦',['MTC','TN Mobile']],
      ['966','Saudi Arabia','🇸🇦',['STC','Mobily','Zain SA']],
      ['971','UAE','🇦🇪',['Etisalat (e&)','du']],
      ['974','Qatar','🇶🇦',['Ooredoo QA','Vodafone QA']],
      ['968','Oman','🇴🇲',['Omantel','Ooredoo OM']],
      ['964','Iraq','🇮🇶',['Zain IQ','Asiacell','Korek']],
      ['962','Jordan','🇯🇴',['Zain JO','Orange JO','Umniah']],
      ['961','Lebanon','🇱🇧',['touch','Alfa']],
      ['880','Bangladesh','🇧🇩',['Grameenphone','Robi','Banglalink']],
      ['353','Ireland','🇮🇪',['Vodafone IE','Eir','Three IE']],
      ['351','Portugal','🇵🇹',['NOS','Vodafone PT','MEO']],
      ['420','Czech Republic','🇨🇿',['T-Mobile CZ','O2 CZ','Vodafone CZ']],
      ['359','Bulgaria','🇧🇬',['A1 BG','Telenor BG','Vivacom']],
      ['27','South Africa','🇿🇦',['Vodacom','MTN SA','Cell C','Telkom']],
      ['20','Egypt','🇪🇬',['Vodafone EG','Orange EG','Etisalat EG']],
      ['55','Brazil','🇧🇷',['Vivo','Claro BR','TIM','Oi']],
      ['57','Colombia','🇨🇴',['Movistar CO','Claro CO','Tigo']],
      ['52','Mexico','🇲🇽',['Telcel','AT&T MX','Movistar MX']],
      ['54','Argentina','🇦🇷',['Personal','Claro AR','Movistar AR']],
      ['56','Chile','🇨🇱',['Movistar CL','Claro CL','Entel']],
      ['60','Malaysia','🇲🇾',['Maxis','Celcom','Digi','U Mobile']],
      ['63','Philippines','🇵🇭',['Globe','Smart','DITO']],
      ['62','Indonesia','🇮🇩',['Telkomsel','Indosat','XL Axiata']],
      ['65','Singapore','🇸🇬',['Singtel','StarHub','M1']],
      ['61','Australia','🇦🇺',['Telstra','Optus','Vodafone AU']],
      ['64','New Zealand','🇳🇿',['Spark NZ','One NZ','2degrees']],
      ['81','Japan','🇯🇵',['NTT Docomo','au (KDDI)','SoftBank']],
      ['82','South Korea','🇰🇷',['SK Telecom','KT','LG U+']],
      ['86','China','🇨🇳',['China Mobile','China Unicom','China Telecom']],
      ['91','India','🇮🇳',['Jio','Airtel IN','Vi (Vodafone-Idea)','BSNL']],
      ['92','Pakistan','🇵🇰',['Jazz','Telenor PK','Zong','Ufone']],
      ['98','Iran','🇮🇷',['Hamrah-Aval (MCI)','Irancell']],
      ['90','Turkey','🇹🇷',['Turkcell','Vodafone TR','Türk Telekom']],
      ['34','Spain','🇪🇸',['Movistar ES','Vodafone ES','Orange ES']],
      ['33','France','🇫🇷',['Orange FR','SFR','Bouygues','Free']],
      ['39','Italy','🇮🇹',['TIM','Vodafone IT','WindTre','Iliad IT']],
      ['30','Greece','🇬🇷',['Cosmote','Vodafone GR','Wind Hellas']],
      ['31','Netherlands','🇳🇱',['KPN','Vodafone NL','T-Mobile NL']],
      ['32','Belgium','🇧🇪',['Proximus','Orange BE','BASE']],
      ['41','Switzerland','🇨🇭',['Swisscom','Salt','Sunrise']],
      ['46','Sweden','🇸🇪',['Telia SE','Tele2 SE','Tre SE']],
      ['47','Norway','🇳🇴',['Telenor NO','Telia NO','Ice']],
      ['45','Denmark','🇩🇰',['TDC','Telenor DK','Telia DK']],
      ['48','Poland','🇵🇱',['Plus','Orange PL','T-Mobile PL','Play']],
      ['49','Germany','🇩🇪',['Telekom DE','Vodafone DE','O2 DE']],
      ['44','United Kingdom','🇬🇧',['EE','O2 UK','Vodafone UK','Three UK']],
      ['7','Russia','🇷🇺',['MTS','MegaFon','Beeline','Tele2 RU']],
      ['1','United States / Canada','🇺🇸🇨🇦',['AT&T','Verizon','T-Mobile US','Rogers','Bell']],
    ];

    let countryInfo = { code:'?', country:'Unknown', flag:'🌍', carriers:['Unknown Carrier'] };
    for (const [code, country, flag, carriers] of PREFIXES) {
      if (num.startsWith(code)) {
        countryInfo = { code, country, flag, carriers };
        break;
      }
    }

    let seed = 0;
    for (let i = 0; i < num.length; i++) seed = (seed * 31 + num.charCodeAt(i)) >>> 0;
    const carrier   = countryInfo.carriers[seed % countryInfo.carriers.length];
    const lineTypes = ['Mobile','Mobile','Mobile','Mobile','Prepaid Mobile','VoIP'];
    const lineType  = lineTypes[seed % lineTypes.length];
    const appLabels = ['WhatsApp ✅', 'WhatsApp ✅ · Telegram ✅', 'WhatsApp ✅ · iMessage ✅'];
    const apps      = appLabels[(seed >> 4) % appLabels.length];
    const riskList  = ['🟢 Low','🟢 Low','🟢 Low','🟡 Medium','🔴 High'];
    const risk      = riskList[(seed >> 6) % riskList.length];
    const scanTime  = new Date().toUTCString();

    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 📱 NUMBER LOOKUP 〕━━━⬣\n` +
        `┃\n` +
        `┃ 📞 *Number:*     +${num}\n` +
        `┃ 🌍 *Country:*    ${countryInfo.flag} ${countryInfo.country}\n` +
        `┃ 🔢 *Dial Code:*  +${countryInfo.code}\n` +
        `┃ 🏢 *Carrier:*    ${carrier}\n` +
        `┃ 📶 *Line Type:*  ${lineType}\n` +
        `┃ ✅ *Validity:*   Valid number\n` +
        `┃ 📲 *Apps:*       ${apps}\n` +
        `┃ ⚠️  *Risk Level:* ${risk}\n` +
        `┃\n` +
        `┃ 🕒 *Scanned:* ${scanTime}\n` +
        `┃ _Powered by DollarBot V6 Intelligence_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // ── Percentage check factory ──────────────────────────────────────────────
  async gaycheck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'gay2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🏳️‍🌈 GAY CHECK 〕━━━⬣\n` +
        `┃\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🏳️‍🌈 *Gay Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃\n` +
        `┃ ${p >= 80 ? '💅 Absolutely yes! Fully fabulous!' : p >= 60 ? '🤔 Pretty gay ngl...' : p >= 40 ? '😏 Somewhat curious maybe?' : '😂 Nope, completely straight!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async lesbiancheck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'lesbian2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🌸 LESBIAN CHECK 〕━━━⬣\n` +
        `┃\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🌸 *Lesbian Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃\n` +
        `┃ ${p >= 80 ? '🌈 Very much so! That energy is real!' : p >= 60 ? '🤔 Strong vibes for sure...' : p >= 40 ? '😄 A little bit maybe?' : '😅 Not really!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async toxic(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'toxic9999');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ☠️ TOXIC METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ ☠️ *Toxic Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🚨 RUN! Extremely toxic!' : p >= 60 ? '😬 Pretty toxic ngl' : p >= 40 ? '😅 Mild toxicity detected' : '✅ Clean soul, no toxicity!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async chad(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'chadlevel');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💪 CHAD METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 💪 *Chad Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🗿 ABSOLUTE CHAD! Bow down!' : p >= 60 ? '😎 Pretty chad fr' : p >= 40 ? '🤏 Mini chad vibes' : '😢 NPC behaviour...'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async sigma(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'sigmagrindset');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🐺 SIGMA CHECK 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🐺 *Sigma Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🗿 Lone wolf. True sigma.' : p >= 60 ? '😏 Sigma vibes detected' : p >= 40 ? '🤔 Still on the grindset' : '😴 You need the sigma mindset!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async npc(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'npccheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🤖 NPC SCANNER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🤖 *NPC Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🚨 Full NPC! No main character energy.' : p >= 60 ? '😅 Background character fr' : p >= 40 ? '🤷 Somewhere in between' : '🌟 Main character energy!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async karen(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'karencheck');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 😤 KAREN METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 😤 *Karen Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🚨 "I WANT TO SPEAK TO THE MANAGER!" 😂' : p >= 60 ? '😬 Slightly karenic energy detected' : p >= 40 ? '🤔 A little entitled maybe?' : '✅ Chill person, no manager requests!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async demon(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'demoncheck666');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 😈 DEMON SCANNER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 😈 *Demon Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🔥 Straight from the underworld!' : p >= 60 ? '😈 Dark energy detected' : p >= 40 ? '😅 A little devilish' : '😇 Angel in disguise!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async angel(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'angelcheck777');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 😇 ANGEL METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 😇 *Angel Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '✨ Pure angelic soul! Blessed!' : p >= 60 ? '😇 Very good vibes!' : p >= 40 ? '🤷 Half angel, half demon' : '😈 Needs a redemption arc!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async clout(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'cloutcheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💫 CLOUT METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 💫 *Clout Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🔥 Straight famous! Everyone knows them!' : p >= 60 ? '😎 Pretty clout, real talk' : p >= 40 ? '📈 Rising star energy' : '😅 No clout yet, keep grinding!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async swag(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'swagcheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 😎 SWAG METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 😎 *Swag Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🕶️ Dripping in pure swag!' : p >= 60 ? '😏 Got that swag energy' : p >= 40 ? '🙂 Some swag detected' : '😬 Needs a style upgrade!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async drip(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'dripcheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💧 DRIP SCANNER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 💧 *Drip Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🌊 FLOODING! Outfit is 🔥🔥🔥' : p >= 60 ? '💧 Decent drip fr' : p >= 40 ? '🤏 A little bit of drip' : '🏜️ Dry fit energy...'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async luck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name + Date.now().toString().slice(-4), 'luck');
    const b = bar(p);
    const lucky = ['🍀', '🌟', '🎰', '🔮', '✨'];
    const emoji = lucky[p % lucky.length];
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ${emoji} LUCK SCANNER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ ${emoji} *Luck Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🍀 Very lucky! Born under a star!' : p >= 60 ? '✨ Pretty good luck!' : p >= 40 ? '🤞 Average luck today' : '😬 Not your lucky day!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async karma(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'karma2025check');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ☯️ KARMA SCANNER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ ☯️ *Karma Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '😇 Excellent karma! The universe loves you!' : p >= 60 ? '✨ Good karma vibes' : p >= 40 ? '⚖️ Balanced karma' : '😬 Karma debt alert! Do good deeds!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async king(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'kingcheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 👑 KING METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 👑 *King Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '👑 All hail the king! Royalty detected!' : p >= 60 ? '🏆 Strong king energy!' : p >= 40 ? '🤴 Prince vibes for now' : '😅 Keep working for that crown!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async queen(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'queencheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 👸 QUEEN METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 👸 *Queen Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '👸 Absolute royalty! Yes queen!' : p >= 60 ? '💅 Queen energy activated!' : p >= 40 ? '🌸 Princess vibes' : '🤭 The throne awaits, keep slaying!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async goat(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'goatcheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🐐 G.O.A.T METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🐐 *GOAT Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🐐 GREATEST OF ALL TIME! Undisputed!' : p >= 60 ? '🏆 Elite level, almost GOAT!' : p >= 40 ? '📈 Rising GOAT contender' : '😅 Still in the making!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async bisexualcheck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'bi2025check');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🌈 BI CHECK 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🌈 *Bi Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🌈 Why not both? Absolutely!' : p >= 60 ? '😏 Open minded for sure' : p >= 40 ? '🤔 Exploring vibes' : '😅 Sticking to one side!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async cuteness(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'cutenesscheck');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🥰 CUTENESS METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🥰 *Cuteness:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🥰 Absolutely adorable! Maximum cute!' : p >= 60 ? '😊 Pretty cute ngl!' : p >= 40 ? '🙂 Somewhat cute' : '😤 Needs a cuteness upgrade!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async baddie(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'baddie2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💅 BADDIE METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 💅 *Baddie Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '💅 STRAIGHT BADDIE! 🔥🔥🔥' : p >= 60 ? '😎 Got those baddie vibes' : p >= 40 ? '🤷 Semi-baddie' : '😅 Needs more badditude!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async savage(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'savagecheck');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔥 SAVAGE METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🔥 *Savage Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🔥 SAVAGE MODE ON! No mercy!' : p >= 60 ? '😈 Real savage energy!' : p >= 40 ? '😏 A bit savage' : '😇 Too nice, no savage!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async nerd(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'nerdcheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🤓 NERD SCANNER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🤓 *Nerd Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🤓 Ultimate nerd! Probably uses Linux!' : p >= 60 ? '📚 Smart cookie detected!' : p >= 40 ? '🙂 A little bookworm' : '😜 Street smart, not book smart!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async hater(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'hatercheck');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 😒 HATER METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 😒 *Hater Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '😤 Professional hater! Hating is their job!' : p >= 60 ? '😒 Got some hate in them fr' : p >= 40 ? '🤨 Secretly hating a little' : '😊 Pure supporter, no hate!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async single(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'singlecheck');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💔 SINGLE DETECTOR 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 💔 *Single Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '💔 Certified single! Netflix & chill... alone!' : p >= 60 ? '😔 Pretty single ngl' : p >= 40 ? '🤔 Complicated status' : '😍 Someone special exists!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async lifespan(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'lifespan2025') + 50; // range 60-140
    const years = Math.min(120, Math.max(50, p));
    const currentAge = pct(name, 'currentage') + 15; // 15-95
    const remaining = Math.max(0, years - currentAge);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ⏳ LIFE SCANNER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ ⏳ *Predicted Lifespan:* *${years} years*\n` +
        `┃ 🎂 *Estimated Age:* ~${currentAge} years\n` +
        `┃ ⚡ *Time Remaining:* ~${remaining} years\n` +
        `┃\n` +
        `┃ ${years >= 90 ? '🌟 Long and prosperous life!' : years >= 70 ? '✅ Good lifespan ahead!' : '⚠️ Live healthy, stay blessed!'}\n` +
        `┃\n` +
        `┃ _*Disclaimer: This is just for fun!*_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async salary(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const amounts = [500, 1200, 2500, 5000, 10000, 25000, 50000, 100000, 250000];
    let h = 0;
    const s = (name + 'salary2025').toLowerCase();
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const amount = amounts[h % amounts.length];
    const currencies = ['USD', 'CAD', 'NGN (x1000)', 'GBP', 'EUR'];
    const currency = currencies[h % currencies.length];
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💵 SALARY SCANNER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 💵 *Monthly Salary:* *$${amount.toLocaleString()} ${currency}*\n` +
        `┃\n` +
        `┃ ${amount >= 50000 ? '🤑 RICH RICH! Living luxury!' : amount >= 10000 ? '😎 Comfortable life!' : amount >= 2500 ? '🙂 Getting by fine' : '😅 Budget life, hustle harder!'}\n` +
        `┃\n` +
        `┃ _*Just for fun! Not real.*_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async crush(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'crushcheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💘 CRUSH METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 💘 *Crush Vibes:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '💘 Deeply in love! Ask them out! 😍' : p >= 60 ? '😍 Strong crush feelings!' : p >= 40 ? '🤭 A little smitten' : '😐 No crush detected right now!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async stancheck(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args, sock);
    const name = targetName(msg, args, target);
    const p = pct(name, 'stancheck2025');
    const b = bar(p);
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🌟 STAN METER 〕━━━⬣\n` +
        `┃ 👤 *User:* ${name}\n` +
        `┃ 🌟 *Stan Level:* *${p}%*\n` +
        `┃ [${b}]\n` +
        `┃ ${p >= 80 ? '🌟 Ultra stan! Knows every lyric!' : p >= 60 ? '😍 Major fan!' : p >= 40 ? '🙂 Casual enjoyer' : '😐 Not really a stan'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // ── AI-powered deep commands ───────────────────────────────────────────────

  async prediction(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .prediction <topic>' }, { quoted: msg });
    const topic = args.join(' ');
    await sock.sendMessage(jid, { text: `🔮 _Predicting the future of "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'You are a bold futurist. Give 3 specific, creative predictions about the given topic. Use *bold* for key points. Format as numbered list. WhatsApp only, no HTML.' },
        { role: 'user', content: `Make 3 bold predictions about: ${topic}` },
      ], `🔮 The future of ${topic} looks bright and unpredictable!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🔮 PREDICTION AI 〕━━━⬣\n┃ *Topic:* ${topic}\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Future Scanner_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async timeline(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .timeline <event/person>' }, { quoted: msg });
    const topic = args.join(' ');
    await sock.sendMessage(jid, { text: `📅 _Building timeline for "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Create a short historical timeline (5-7 key events) for the topic. Format: *Year/Period:* - Event description. WhatsApp markdown only, no HTML.' },
        { role: 'user', content: `Timeline of: ${topic}` },
      ], `📅 The timeline of ${topic} spans many important events!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 📅 TIMELINE 〕━━━⬣\n┃ *${topic}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ Powered by DollarBot_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async compare(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const body = args.join(' ');
    if (!body.includes('vs') && !body.includes('VS')) {
      return sock.sendMessage(jid, { text: '❌ Usage: .compare iPhone vs Android\nUse "vs" to separate items' }, { quoted: msg });
    }
    const parts = body.split(/\svs\s/i).map(p => p.trim());
    if (parts.length < 2) return sock.sendMessage(jid, { text: '❌ Need two items. Example: .compare iPhone vs Android' }, { quoted: msg });
    await sock.sendMessage(jid, { text: `⚖️ _Comparing ${parts[0]} vs ${parts[1]}..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'You are an expert analyst. Compare the two things given with pros and cons for each. Use *bold* for category names. Keep it concise. WhatsApp markdown only.' },
        { role: 'user', content: `Compare: ${parts[0]} vs ${parts[1]}` },
      ], `Both ${parts[0]} and ${parts[1]} have their unique advantages!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 ⚖️ COMPARISON 〕━━━⬣\n┃ *${parts[0]}* vs *${parts[1]}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot AI Analysis_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async versus(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const body = args.join(' ');
    if (!body.includes('vs') && !body.includes('VS')) {
      return sock.sendMessage(jid, { text: '❌ Usage: .versus Lion vs Tiger' }, { quoted: msg });
    }
    const parts = body.split(/\svs\s/i).map(p => p.trim());
    await sock.sendMessage(jid, { text: `⚔️ _Who would win: ${parts[0]} vs ${parts[1]}?_` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Determine who would win in a fight/competition. Be decisive, pick a winner with reasoning. Be creative and entertaining. Use *bold* for the winner. WhatsApp only.' },
        { role: 'user', content: `Who wins: ${parts[0]} vs ${parts[1]}?` },
      ], `It would be an epic battle between ${parts[0]} and ${parts[1]}!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 ⚔️ WHO WINS? 〕━━━⬣\n┃ *${parts[0]}* 🆚 *${parts[1]}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Battle Analyzer_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async explain(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .explain <topic>' }, { quoted: msg });
    const topic = args.join(' ');
    await sock.sendMessage(jid, { text: `📖 _Explaining "${topic}" simply..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Explain the topic in extremely simple terms anyone can understand. Use analogies. 3-4 sentences max. Use *bold* for key terms. WhatsApp markdown only.' },
        { role: 'user', content: `Explain simply: ${topic}` },
      ], `${topic} is a fascinating concept worth exploring!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 📖 EXPLAIN 〕━━━⬣\n┃ *${topic}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Simple Explainer_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async funfact(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const topic = args.length ? args.join(' ') : 'the world';
    await sock.sendMessage(jid, { text: `💡 _Finding fun facts about "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Give 3 surprising, mind-blowing fun facts about the topic. Number them 1. 2. 3. Use *bold* for the most surprising parts. WhatsApp markdown only.' },
        { role: 'user', content: `Fun facts about: ${topic}` },
      ], `${topic} is full of amazing and surprising facts!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 💡 FUN FACTS 〕━━━⬣\n┃ *About: ${topic}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Knowledge Base_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async history(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .history <topic/person/place>' }, { quoted: msg });
    const topic = args.join(' ');
    await sock.sendMessage(jid, { text: `📜 _Searching historical records for "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Give a brief but fascinating historical overview of the topic. Include key dates/events. Use *bold* for names and dates. Max 200 words. WhatsApp markdown only.' },
        { role: 'user', content: `Historical overview of: ${topic}` },
      ], `The history of ${topic} spans many centuries of fascinating events!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 📜 HISTORY 〕━━━⬣\n┃ *${topic}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot History Engine_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async hack(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = args.join(' ') || 'target system';
    await sock.sendMessage(jid, { text: `╭━━━〔 💻 HACKING SYSTEM 〕━━━⬣\n┃ _Initiating sequence..._\n╰━━━━━━━━━━━━━━━━━━⬣` }, { quoted: msg });
    await new Promise(r => setTimeout(r, 1500));
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💻 HACK IN PROGRESS 〕━━━⬣\n` +
        `┃ 🎯 *Target:* ${target}\n` +
        `┃\n` +
        `┃ [▓▓▓▓░░░░░░] 40% — Port scanning...\n` +
        `┃ [▓▓▓▓▓▓░░░░] 60% — Bypassing firewall...\n` +
        `┃ [▓▓▓▓▓▓▓▓░░] 80% — Extracting data...\n` +
        `┃ [▓▓▓▓▓▓▓▓▓▓] 100% — ✅ DONE!\n` +
        `┃\n` +
        `┃ 🔐 Password: *••••••••*\n` +
        `┃ 📧 Email: *h****@gmail.com*\n` +
        `┃ 📍 Location: *[CLASSIFIED]*\n` +
        `┃\n` +
        `┃ _*Just kidding! For fun only 😂*_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async matrix(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const chars = '01アイウエオカキクケコサシスセソタチツテト';
    const rows = 6;
    const cols = 20;
    let matrixText = '';
    for (let r = 0; r < rows; r++) {
      let row = '';
      for (let c = 0; c < cols; c++) {
        row += chars[Math.floor(Math.random() * chars.length)];
      }
      matrixText += `\`${row}\`\n`;
    }
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🟩 THE MATRIX 〕━━━⬣\n` +
        `┃ _Wake up, Neo..._\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        matrixText + `\n_⚡ DollarBot Matrix Generator_`,
    }, { quoted: msg });
  },

  async anagram(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .anagram <word>' }, { quoted: msg });
    const word = args[0].toLowerCase().replace(/[^a-z]/g, '');
    if (word.length > 10) return sock.sendMessage(jid, { text: '❌ Word too long (max 10 letters).' }, { quoted: msg });
    // Generate a few shuffled versions
    const shuffles = new Set();
    for (let i = 0; i < 50 && shuffles.size < 5; i++) {
      const arr = word.split('');
      for (let j = arr.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [arr[j], arr[k]] = [arr[k], arr[j]];
      }
      const shuffled = arr.join('');
      if (shuffled !== word) shuffles.add(shuffled);
    }
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔤 ANAGRAM MAKER 〕━━━⬣\n` +
        `┃ *Original:* ${word.toUpperCase()}\n` +
        `┃\n` +
        `┃ *Anagrams:*\n` +
        [...shuffles].map((s, i) => `┃ ${i + 1}. ${s.toUpperCase()}`).join('\n') + '\n' +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async emoji2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .emoji2 <text>' }, { quoted: msg });
    const text = args.join(' ');
    try {
      const res = await tryAI([
        { role: 'system', content: 'Translate the text into emojis. Replace each word or concept with a relevant emoji. Show original then emoji version. Be creative!' },
        { role: 'user', content: `Emoji translate: ${text}` },
      ], text.split(' ').map(() => ['😀', '🔥', '✨', '💫', '⚡'][Math.floor(Math.random() * 5)]).join(' '));
      await sock.sendMessage(jid, {
        text: `╭━━━〔 ✨ EMOJI TRANSLATOR 〕━━━⬣\n┃ *Original:* ${text}\n┃\n┃ *Emoji:*\n┃ ${res}\n╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async reverse2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .reverse2 <words>' }, { quoted: msg });
    const words = args.join(' ').split(' ').reverse().join(' ');
    await sock.sendMessage(jid, {
      text: `╭━━━〔 🔄 WORD REVERSE 〕━━━⬣\n┃ *Original:* ${args.join(' ')}\n┃ *Reversed:* ${words}\n╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async dark2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .dark2 <topic>' }, { quoted: msg });
    const topic = args.join(' ');
    await sock.sendMessage(jid, { text: `💀 _Cooking up dark humor about "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Generate 1-2 dark humor jokes or takes about the topic. Keep it edgy but not offensive. Use *bold* for punchlines. WhatsApp markdown only.' },
        { role: 'user', content: `Dark take on: ${topic}` },
      ], `${topic} but make it dark... 💀`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 💀 DARK MODE 〕━━━⬣\n┃ *Topic:* ${topic}\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Dark Engine_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async love2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .love2 <name/topic>' }, { quoted: msg });
    const topic = args.join(' ');
    await sock.sendMessage(jid, { text: `💕 _Writing a love letter for "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Write a short, romantic, heartfelt love letter or poem (4-6 lines). Use _italic_ for the poem lines. WhatsApp markdown only.' },
        { role: 'user', content: `Write a love poem about/for: ${topic}` },
      ], `💕 You make the world brighter, ${topic}...`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 💕 LOVE LETTER 〕━━━⬣\n┃ *For:* ${topic}\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Love Engine_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async roast2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .roast2 <topic/place/thing>' }, { quoted: msg });
    const topic = args.join(' ');
    await sock.sendMessage(jid, { text: `🔥 _Roasting "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'You are a savage roast comedian. Roast the given topic/place/thing in 2-3 hilarious lines. Keep it funny, not offensive. Use *bold* for punchlines. WhatsApp only.' },
        { role: 'user', content: `Roast: ${topic}` },
      ], `🔥 ${topic} is so bad, even Google won't search for it!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🔥 ROAST 2.0 〕━━━⬣\n┃ *Target:* ${topic}\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Roast Engine_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async mythology2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .mythology2 <god/creature/topic>' }, { quoted: msg });
    const topic = args.join(' ');
    await sock.sendMessage(jid, { text: `⚡ _Consulting the ancient scrolls about "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Share fascinating mythology lore about the given topic. Include its powers, story, origin culture. Use *bold* for names. 150-200 words. WhatsApp markdown only.' },
        { role: 'user', content: `Mythology about: ${topic}` },
      ], `${topic} is a legendary figure from ancient mythology!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 ⚡ MYTHOLOGY 〕━━━⬣\n┃ *${topic}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Ancient Library_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async conspiracy2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const topic = args.join(' ') || 'the government';
    await sock.sendMessage(jid, { text: `🕵️ _Accessing classified files on "${topic}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Create a funny, outrageous fictional conspiracy theory about the topic. Make it creative and absurd. Label it as fiction. Use *bold* for dramatic claims. WhatsApp only.' },
        { role: 'user', content: `Create a funny conspiracy theory about: ${topic}` },
      ], `🕵️ What if ${topic} was secretly run by lizard people? 👀`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🕵️ CONSPIRACY FILE 〕━━━⬣\n┃ *Classified: ${topic}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚠️ For entertainment only!_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async zodiac3(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .zodiac3 <sign>\nSigns: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces' }, { quoted: msg });
    const sign = args.join(' ');
    await sock.sendMessage(jid, { text: `♈ _Reading the stars for ${sign}..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Give a detailed, entertaining zodiac reading for today. Include: personality traits, love, career, lucky numbers. Use *bold* for categories. WhatsApp only.' },
        { role: 'user', content: `Today\'s zodiac reading for: ${sign}` },
      ], `The stars shine bright for ${sign} today!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 ⭐ ZODIAC READING 〕━━━⬣\n┃ *${sign} Today*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Astrology_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async encrypt(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .encrypt <text>' }, { quoted: msg });
    const text = args.join(' ');
    const key = 13; // ROT13 style
    const encrypted = text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + key) % 26) + 65);
      if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + key) % 26) + 97);
      return c;
    }).join('');
    const base = Buffer.from(text).toString('base64');
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔒 ENCRYPT ENGINE 〕━━━⬣\n` +
        `┃ *Original:* ${text}\n` +
        `┃\n` +
        `┃ 🔐 *Caesar:* \`${encrypted}\`\n` +
        `┃ 📦 *Base64:* \`${base.slice(0, 40)}${base.length > 40 ? '...' : ''}\`\n` +
        `┃ 🔑 *Key:* ROT-${key}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async decrypt(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .decrypt <encoded text>' }, { quoted: msg });
    const text = args.join(' ');
    const key = 13;
    const decrypted = text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + (26 - key)) % 26) + 65);
      if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + (26 - key)) % 26) + 97);
      return c;
    }).join('');
    let fromBase64 = '';
    try { fromBase64 = Buffer.from(text, 'base64').toString('utf8'); } catch (_) { fromBase64 = '(invalid)'; }
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔓 DECRYPT ENGINE 〕━━━⬣\n` +
        `┃ *Encoded:* ${text.slice(0, 30)}...\n` +
        `┃\n` +
        `┃ 🔓 *Caesar Decrypt:* ${decrypted}\n` +
        `┃ 📦 *Base64 Decode:* ${fromBase64.slice(0, 40)}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async wordgame(sock, msg) {
    const jid = msg.key.remoteJid;
    const categories = ['animals', 'countries', 'fruits', 'movies', 'sports'];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const letters = 'ABCDEFGHIJKLMNOPRSTW';
    const letter = letters[Math.floor(Math.random() * letters.length)];
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🎮 WORD GAME 〕━━━⬣\n` +
        `┃\n` +
        `┃ 🔤 *Category:* ${cat.toUpperCase()}\n` +
        `┃ 🅰️ *Letter:* *${letter}*\n` +
        `┃\n` +
        `┃ Name a *${cat}* starting with *${letter}*!\n` +
        `┃ First person to reply wins! 🏆\n` +
        `┃\n` +
        `┃ ⏱️ You have 30 seconds!\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async actor(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .actor <name>' }, { quoted: msg });
    return socialCommands.celeb(sock, msg, args); // reuse celeb
  },

  async country2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .country2 <country name>' }, { quoted: msg });
    const country = args.join(' ');
    await sock.sendMessage(jid, { text: `🌍 _Researching ${country}..._` }, { quoted: msg });
    try {
      const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=false&limit=1`, { timeout: 12000 });
      if (res.ok) {
        const data = await res.json();
        const c = data[0];
        const capital = c.capital?.[0] || 'N/A';
        const pop = c.population?.toLocaleString() || 'N/A';
        const region = c.region || 'N/A';
        const subregion = c.subregion || 'N/A';
        const languages = Object.values(c.languages || {}).join(', ') || 'N/A';
        const currencies = Object.values(c.currencies || {}).map(cu => `${cu.name} (${cu.symbol})`).join(', ') || 'N/A';
        const timezones = c.timezones?.slice(0, 2).join(', ') || 'N/A';
        const flag = c.flag || '';
        const area = c.area ? `${c.area.toLocaleString()} km²` : 'N/A';
        await sock.sendMessage(jid, {
          text:
            `╭━━━〔 🌍 COUNTRY INFO 〕━━━⬣\n` +
            `┃ ${flag} *${c.name.common}* (${c.name.official})\n` +
            `┃\n` +
            `┃ 🏙️ *Capital:* ${capital}\n` +
            `┃ 🌏 *Region:* ${region} / ${subregion}\n` +
            `┃ 👥 *Population:* ${pop}\n` +
            `┃ 📐 *Area:* ${area}\n` +
            `┃ 🗣️ *Languages:* ${languages}\n` +
            `┃ 💰 *Currency:* ${currencies}\n` +
            `┃ ⏰ *Timezone:* ${timezones}\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣`,
        }, { quoted: msg });
      } else {
        throw new Error('Country not found');
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Country Error: ${e.message}` }, { quoted: msg });
    }
  },

  async planet(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .planet <name>\nPlanets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune' }, { quoted: msg });
    const planet = args.join(' ');
    await sock.sendMessage(jid, { text: `🪐 _Scanning planetary data for ${planet}..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Give detailed facts about the planet. Include: diameter, distance from sun, moons, temperature, atmosphere, interesting facts. Use *bold* for values. WhatsApp markdown only.' },
        { role: 'user', content: `Facts about the planet: ${planet}` },
      ], `${planet} is a fascinating planet in our solar system!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🪐 PLANET INFO 〕━━━⬣\n┃ *${planet}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Space Database_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async animal(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .animal <name>\nExample: .animal lion' }, { quoted: msg });
    const animalName = args.join(' ');
    await sock.sendMessage(jid, { text: `🐾 _Looking up ${animalName}..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Give fascinating facts about the animal. Include: habitat, diet, lifespan, size, special abilities, conservation status. Use *bold* for key stats. Max 150 words. WhatsApp only.' },
        { role: 'user', content: `Animal facts about: ${animalName}` },
      ], `The ${animalName} is a remarkable creature in the animal kingdom!`);
      // Try to get an animal image via Unsplash
      const imgUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(animalName)}`;
      const caption = `╭━━━〔 🐾 ANIMAL INFO 〕━━━⬣\n┃ *${animalName.toUpperCase()}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Wildlife Database_`;
      try {
        const imgRes = await fetch(imgUrl, { timeout: 10000 });
        if (imgRes.ok) {
          const buf = await imgRes.buffer();
          return sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
        }
      } catch (_) {}
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async nutrition(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .nutrition <food>' }, { quoted: msg });
    const food = args.join(' ');
    await sock.sendMessage(jid, { text: `🥗 _Analyzing nutritional data for "${food}"..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Give approximate nutritional information per 100g serving. Include: calories, protein, carbs, fat, fiber, vitamins. Use *bold* for values. Format clearly. WhatsApp markdown only.' },
        { role: 'user', content: `Nutrition facts for: ${food}` },
      ], `${food} contains various important nutrients for your health!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🥗 NUTRITION INFO 〕━━━⬣\n┃ *${food}* (per 100g)\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Nutrition Database_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async exercise(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .exercise <name>\nExample: .exercise push up' }, { quoted: msg });
    const ex = args.join(' ');
    await sock.sendMessage(jid, { text: `💪 _Looking up "${ex}" exercise..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Explain the exercise. Include: muscles worked, proper form, sets/reps recommendation, common mistakes, beginner tips. Use *bold* for key points. WhatsApp only.' },
        { role: 'user', content: `Exercise guide for: ${ex}` },
      ], `The ${ex} is an excellent exercise for building strength!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 💪 EXERCISE GUIDE 〕━━━⬣\n┃ *${ex.toUpperCase()}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Fitness Coach_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async language2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .language2 <language name>' }, { quoted: msg });
    const lang = args.join(' ');
    await sock.sendMessage(jid, { text: `🗣️ _Researching ${lang} language..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'Give facts about the language. Include: number of speakers, origin, where it\'s spoken, writing system, fun phrases, relation to other languages. Use *bold* for key info. WhatsApp only.' },
        { role: 'user', content: `Facts about the language: ${lang}` },
      ], `${lang} is a fascinating language with a rich history!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🗣️ LANGUAGE INFO 〕━━━⬣\n┃ *${lang}*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Linguistics_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },

  async decode2(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: '❌ Usage: .decode2 <slang/word>' }, { quoted: msg });
    const word = args.join(' ');
    await sock.sendMessage(jid, { text: `📖 _Looking up "${word}" in street dictionary..._` }, { quoted: msg });
    try {
      const res = await tryAI([
        { role: 'system', content: 'You are Urban Dictionary. Define the slang/word in a fun way. Include: meaning, origin if known, example sentence, similar words. Use *bold* for the definition. WhatsApp only.' },
        { role: 'user', content: `Urban dictionary definition of: ${word}` },
      ], `${word}: A term with deep cultural meaning in modern slang!`);
      await sock.sendMessage(jid, {
        text: `╭━━━〔 📖 STREET DICTIONARY 〕━━━⬣\n┃ *"${word}"*\n╰━━━━━━━━━━━━━━━━━━⬣\n\n${res}\n\n_⚡ DollarBot Slang Engine_`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },
};

module.exports = socialCommands;
