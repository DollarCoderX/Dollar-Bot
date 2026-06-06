'use strict';
/**
 * src/commands/wild.js
 * 3 Wild Features that make DollarBot stand out:
 *
 *  1. .aura     — AI rates your "aura" with a detailed personality/vibe analysis
 *  2. .roastwar — Two users roast each other, bot judges the winner
 *  3. .demotivate — Brutally honest de-motivational speech (anti-self-help satire)
 */

const fetch = require('node-fetch');
const pollinations = require('../lib/pollinations');

// ── Groq request helper ───────────────────────────────────────────────────────
const GROQ_KEYS = [
  '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',
  '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',
];
let _groqIdx = 0;

async function groq(messages, maxTokens = 500) {
  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    const key = GROQ_KEYS[_groqIdx++ % GROQ_KEYS.length];
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, max_tokens: maxTokens }),
        timeout: 30000,
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content.trim();
      }
    } catch (_) {}
  }
  // Pollinations fallback
  return pollinations.textGenerate(messages);
}

// Active roar-war sessions: jid → { challenger, opponent, challengerRoast, judging }
const roastWarSessions = new Map();

const wildCommands = {

  // ── 1. .aura — AI personality + vibe scanner ─────────────────────────────
  // Usage: .aura OR .aura @user OR .aura <name/description>
  async aura(sock, msg, args) {
    const jid = msg.key.remoteJid;
    await msg.reply('_✨ Scanning your aura..._');

    const subject = args.length
      ? args.join(' ')
      : (msg.pushName || msg.key?.participant?.split('@')[0] || 'you');

    try {
      const result = await groq([
        {
          role: 'system',
          content:
            'You are an AI "aura reader" that gives extremely detailed, dramatic, funny yet oddly accurate personality readings. ' +
            'Give a reading with: Aura Color, Energy Level (1-100), Vibe Score (1-100), Main Personality Traits (3), ' +
            'Hidden Weakness, Spirit Animal, Biggest Flex, and a Final Prophecy. ' +
            'Be dramatic, specific, and a little unhinged. Use *bold* for labels. No tables, WhatsApp formatting only.',
        },
        { role: 'user', content: `Read the aura of: ${subject}` },
      ], 700);

      await msg.reply(
        `╭━━━〔 ✨ AURA READER 〕━━━⬣\n` +
        `┃ Subject: *${subject}*\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `${result}\n\n` +
        `_⚡ Powered by DollarBot Aura AI_`
      );
    } catch (e) {
      await msg.reply(`❌ Aura scan failed: ${e.message}`);
    }
  },

  // ── 2. .roastwar — Two-player roast battle judged by AI ──────────────────
  // Flow:
  //   Player A: .roastwar @PlayerB       → starts session, A goes first
  //   Player B: .roastwar <their roast>  → B fires back
  //   Bot judges both and declares winner
  async roastwar(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNum = sender.split('@')[0].split(':')[0];
    const existing = roastWarSessions.get(jid);

    // ── Round 1: Challenger starts ──────────────────────────────────────────
    if (!existing) {
      // Require a mention or name
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = ctx?.mentionedJid?.[0];

      if (!mentioned && !args.length) {
        return msg.reply(
          `╭━━━〔 🔥 ROAST WAR 〕━━━⬣\n` +
          `┃ Challenge someone to a roast battle!\n` +
          `┃\n` +
          `┃ *Usage:*\n` +
          `┃ .roastwar @opponent\n` +
          `┃\n` +
          `┃ Then your opponent replies:\n` +
          `┃ .roastwar <their best roast>\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`
        );
      }

      // Generate AI roast for challenger automatically
      const opponentNum = mentioned?.split('@')[0] || args.join(' ');
      await msg.reply('_🔥 Generating your roast..._');

      let challengerRoast;
      try {
        challengerRoast = await groq([
          { role: 'system', content: 'You are a savage roast comedian. Write 2-3 brutally funny roast lines. WhatsApp *bold* for punchlines only.' },
          { role: 'user', content: `Roast @${opponentNum} on behalf of @${senderNum}. Make it savage but funny.` },
        ], 300);
      } catch (e) {
        return msg.reply(`❌ Roast generation failed: ${e.message}`);
      }

      roastWarSessions.set(jid, {
        challenger: senderNum,
        opponent: opponentNum,
        challengerRoast,
        judging: false,
      });

      // Auto-clear session after 10 minutes
      setTimeout(() => roastWarSessions.delete(jid), 10 * 60 * 1000);

      await sock.sendMessage(jid, {
        text:
          `🔥 *ROAST WAR STARTED!*\n\n` +
          `⚔️ *@${senderNum}* vs *@${opponentNum}*\n\n` +
          `*@${senderNum}'s Roast:*\n${challengerRoast}\n\n` +
          `💬 *@${opponentNum}* — fire back with:\n*.roastwar <your roast>*\n\n_You have 10 minutes!_`,
        mentions: mentioned ? [mentioned, sender] : [sender],
      }, { quoted: msg });
      return;
    }

    // ── Round 2: Opponent fires back ────────────────────────────────────────
    if (existing && !existing.judging) {
      const opponentRoast = args.join(' ');
      if (!opponentRoast) return msg.reply('❌ Include your roast! e.g. *.roastwar you look like...*');

      existing.judging = true;
      await msg.reply('_⚖️ The AI judge is making a decision..._');

      try {
        const verdict = await groq([
          {
            role: 'system',
            content:
              'You are an unbiased, savage roast battle judge. Analyze both roasts and declare a winner with reasons. ' +
              'Be dramatic and funny. Rate each out of 10 for: Delivery, Savagery, Originality. ' +
              'Declare the winner clearly. Use *bold* for scores and winner. WhatsApp formatting only, no HTML.',
          },
          {
            role: 'user',
            content: `Roast 1 by @${existing.challenger}:\n"${existing.challengerRoast}"\n\nRoast 2 by @${existing.opponent}:\n"${opponentRoast}"\n\nWho wins?`,
          },
        ], 600);

        roastWarSessions.delete(jid);

        await sock.sendMessage(jid, {
          text:
            `╭━━━〔 🔥 ROAST WAR VERDICT 〕━━━⬣\n\n` +
            `⚔️ *@${existing.challenger}* vs *@${existing.opponent}*\n\n` +
            `🗣️ *Round 1 (@${existing.challenger}):*\n${existing.challengerRoast}\n\n` +
            `🗣️ *Round 2 (@${existing.opponent}):*\n${opponentRoast}\n\n` +
            `⚖️ *AI VERDICT:*\n${verdict}\n\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣\n_Powered by DollarBot V5_`,
        }, { quoted: msg });
      } catch (e) {
        roastWarSessions.delete(jid);
        await msg.reply(`❌ Judge failed: ${e.message}`);
      }
      return;
    }

    await msg.reply('⏳ A roast war is already in progress or being judged. Wait for the result!');
  },

  // ── 3. .demotivate — Brutally honest de-motivational quote ───────────────
  // The anti-self-help: darkly funny, satirical, weirdly accurate
  async demotivate(sock, msg, args) {
    const jid = msg.key.remoteJid;
    await msg.reply('_📉 Generating your daily dose of reality..._');

    const topic = args.join(' ') || 'life in general';

    try {
      const result = await groq([
        {
          role: 'system',
          content:
            'You are a darkly funny, brutally honest de-motivational speaker. ' +
            'Write one devastating yet hilarious de-motivational quote/paragraph (4-6 sentences) about the given topic. ' +
            'It should be like a dark self-help book that tells the real truth nobody wants to hear. ' +
            'Be savage but not cruel — satirical, absurd, and oddly wise. ' +
            'End with a "DollarBot Life Tip" that is equally absurd. ' +
            'Use *bold* for the main quote and _italic_ for the tip. WhatsApp formatting only.',
        },
        { role: 'user', content: `De-motivate me about: ${topic}` },
      ], 500);

      await msg.reply(
        `╭━━━〔 📉 DAILY REALITY CHECK 〕━━━⬣\n` +
        `┃ Topic: _${topic}_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `${result}\n\n` +
        `_💵 DollarBot V5 — Keeping it real since 2024_`
      );
    } catch (e) {
      await msg.reply(`❌ Error: ${e.message}`);
    }
  },
};

module.exports = wildCommands;
