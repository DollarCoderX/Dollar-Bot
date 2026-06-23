const config = require('../config');
const store = require('../lib/store');
const { getContextInfo } = require('../lib/messages');

// Helper: extract quoted message context
function getQuoted(msg) {
  return getContextInfo(msg);
}

const ownerCommands = {

  // ── .self — switch bot to self/owner-only mode ────────────────────────────
  async self(sock, msg) {
    const jid = msg.key.remoteJid;
    await store.set('botMode', 'self');
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔒 BOT MODE 〕━━━⬣\n` +
        `┃ Mode: *SELF* (Owner Only)\n` +
        `┃\n` +
        `┃ Bot will now *only respond*\n` +
        `┃ to the bot owner.\n` +
        `┃ All other users are ignored.\n` +
        `┃\n` +
        `┃ To restore: *.public*\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    });
  },

  // ── .public — switch bot to public mode ───────────────────────────────────
  async public(sock, msg) {
    const jid = msg.key.remoteJid;
    await store.set('botMode', 'public');
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🌐 BOT MODE 〕━━━⬣\n` +
        `┃ Mode: *PUBLIC* (Everyone)\n` +
        `┃\n` +
        `┃ Bot will now respond\n` +
        `┃ to *all users*.\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    });
  },

  async say(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) return sock.sendMessage(jid, { text: 'Usage: .say <text>' });
    await sock.sendMessage(jid, { text: args.join(' ') });
  },

  async sendto(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (args.length < 2) {
      return sock.sendMessage(jid, { text: 'Usage: .sendto <number> <message>\nExample: .sendto 14378898269 Hello!' });
    }
    const number = args[0].replace(/\D/g, '');
    const text = args.slice(1).join(' ');
    try {
      await sock.sendMessage(`${number}@s.whatsapp.net`, { text });
      await sock.sendMessage(jid, { text: `Sent to +${number}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` });
    }
  },

  async react(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const emoji = args[0];
    if (!emoji) return sock.sendMessage(jid, { text: '❌ Usage: .react <emoji>\nReply to a message with this command.' });

    const ctx = getQuoted(msg);
    const targetKey = ctx?.stanzaId
      ? { remoteJid: jid, id: ctx.stanzaId, fromMe: false, participant: ctx.participant || undefined }
      : msg.key;

    try {
      await sock.sendMessage(jid, { react: { text: emoji, key: targetKey } });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ React failed: ${e.message}` });
    }
  },

  async delete(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = getQuoted(msg);
    if (!ctx?.stanzaId) {
      return sock.sendMessage(jid, { text: '❌ Reply to the message you want to delete.' });
    }
    const isGroup = jid.endsWith('@g.us');
    try {
      await sock.sendMessage(jid, {
        delete: {
          remoteJid: jid,
          id: ctx.stanzaId,
          fromMe: false,
          participant: isGroup ? (ctx.participant || undefined) : undefined,
        },
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Delete failed: ${e.message}` });
    }
  },

  async autoreply(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const val = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(val)) {
      return sock.sendMessage(jid, { text: '❌ Usage: .autoreply on/off' });
    }
    await store.set('autoreply', val === 'on');
    await sock.sendMessage(jid, {
      text: `*AutoReply is now ${val.toUpperCase()}*\n\n${val === 'on' ? 'Bot will respond to DMs and group mentions automatically.' : 'AutoReply disabled.'}`,
    });
  },

  async autolike(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const val = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(val)) {
      return sock.sendMessage(jid, { text: 'Usage: .autolike on/off' });
    }
    await store.set('autolike', val === 'on');
    await sock.sendMessage(jid, {
      text: `*AutoLike Status is now ${val.toUpperCase()}*\n\n${val === 'on' ? 'Will auto-react to statuses (cycles on/off every 60s to stay safe).' : 'Auto-like disabled.'}`,
    });
  },

  async rapidlike(sock, msg) {
    const jid = msg.key.remoteJid;
    const msgStore = global.msgStore;
    if (!msgStore) {
      return sock.sendMessage(jid, { text: '❌ Message store is not initialized yet. Please wait a moment.' });
    }

    const statusMsgs = msgStore.messages['status@broadcast']?.array || [];
    if (!statusMsgs.length) {
      return sock.sendMessage(jid, { text: 'ℹ️ No status updates found in the store to like.' });
    }

    await sock.sendMessage(jid, { text: `⚡ *Rapid-Like Status:* Found ${statusMsgs.length} status updates. Starting rapid-liking...` });

    const emojis = ['🔥', '❤️', '👍', '😍', '👏', '💯', '✨'];
    let count = 0;

    for (const m of statusMsgs) {
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      try {
        await sock.sendMessage(m.key.participant || m.key.remoteJid, {
          react: { text: randomEmoji, key: m.key },
        });
        count++;
        // Controlled 500ms delay to keep account safe
        await new Promise(r => setTimeout(r, 500));
      } catch (_) {}
    }

    await sock.sendMessage(jid, { text: `✅ *Rapid-Like Complete!* Successfully liked ${count}/${statusMsgs.length} status updates.` });
  },

  async vv(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = getQuoted(msg);

    if (!ctx?.quotedMessage) {
      return sock.sendMessage(jid, { text: 'Reply to a view-once photo or video with .vv' });
    }

    const qMsg = ctx.quotedMessage;

    // Unwrap view-once layers
    const viewOnceWrapper =
      qMsg?.viewOnceMessage ||
      qMsg?.viewOnceMessageV2 ||
      qMsg?.viewOnceMessageV2Extension;

    const innerMsg = viewOnceWrapper?.message || qMsg;

    // Find the media type
    const mediaType = ['imageMessage', 'videoMessage', 'audioMessage'].find(t => innerMsg?.[t]);

    if (!mediaType || !innerMsg?.[mediaType]) {
      return sock.sendMessage(jid, { text: 'That is not a view-once photo or video.' });
    }

    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');

      // Build a fake message object that Baileys can download from
      const fakeMsg = {
        key: { remoteJid: jid, id: ctx.stanzaId, fromMe: false },
        message: { [mediaType]: innerMsg[mediaType] },
      };

      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
      const caption = innerMsg[mediaType]?.caption || 'View-once revealed by DollarBot';

      if (mediaType === 'imageMessage') {
        await sock.sendMessage(jid, { image: buffer, caption });
      } else if (mediaType === 'videoMessage') {
        await sock.sendMessage(jid, { video: buffer, caption });
      } else if (mediaType === 'audioMessage') {
        await sock.sendMessage(jid, {
          audio: buffer,
          mimetype: 'audio/mp4',
          ptt: innerMsg[mediaType]?.ptt || false,
        });
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `VV Error: ${e.message}` });
    }
  },

  // ── .broadcast [group|dm|all] <message> — Advanced broadcast ─────────────
  async broadcast(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 📡 Broadcast 〕━━━⬣\n` +
          `┃\n` +
          `┃ *Usage:*\n` +
          `┃ .broadcast <message>\n` +
          `┃ .broadcast group <message>\n` +
          `┃ .broadcast dm <message>\n` +
          `┃ .broadcast all <message>\n` +
          `┃\n` +
          `┃ _group_ → groups only\n` +
          `┃ _dm_ → saved contacts only\n` +
          `┃ _all_ → groups + DMs\n` +
          `┃ (default) → groups only\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    const modeWords = ['group', 'dm', 'all'];
    let mode = 'group';
    let textArgs = [...args];
    if (modeWords.includes(args[0]?.toLowerCase())) {
      mode = args[0].toLowerCase();
      textArgs = args.slice(1);
    }
    if (!textArgs.length)
      return sock.sendMessage(jid, { text: '❌ Please include a message after the mode.' }, { quoted: msg });

    const text = textArgs.join(' ');
    const broadcastMsg =
      `╭━━━〔 📡 *DOLLARBOT BROADCAST* 〕━━━⬣\n\n` +
      `${text}\n\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣\n` +
      `_— DollarBot V-Ultra_`;

    // ── Collect targets ──
    let targets = [];
    let groupCount = 0, dmCount = 0;

    if (mode === 'group' || mode === 'all') {
      try {
        const groups = await sock.groupFetchAllParticipating();
        const gids = Object.keys(groups);
        targets.push(...gids);
        groupCount = gids.length;
      } catch (e) {
        await sock.sendMessage(jid, { text: `⚠️ Could not fetch groups: ${e.message}` }, { quoted: msg });
      }
    }

    if (mode === 'dm' || mode === 'all') {
      try {
        // Use the in-memory message store to find known DM contacts
        const msgStore = global.msgStore;
        if (msgStore?.messages) {
          for (const chatJid of Object.keys(msgStore.messages)) {
            if (!chatJid.endsWith('@g.us') && chatJid.endsWith('@s.whatsapp.net') &&
                !chatJid.startsWith('status@') && chatJid !== `${config.ownerNumber}@s.whatsapp.net`) {
              targets.push(chatJid);
              dmCount++;
            }
          }
        }
      } catch (_) {}
    }

    targets = [...new Set(targets)]; // deduplicate
    if (!targets.length)
      return sock.sendMessage(jid, { text: '❌ No targets found to broadcast to.' }, { quoted: msg });

    await sock.sendMessage(jid, {
      text:
        `📡 *Broadcast starting*\n\n` +
        `Mode: *${mode.toUpperCase()}*\n` +
        `Groups: ${groupCount}  |  DMs: ${dmCount}\n` +
        `Total targets: *${targets.length}*\n\n` +
        `_Sending... please wait_`,
    }, { quoted: msg });

    let sent = 0, failed = 0;
    for (const tid of targets) {
      try {
        await sock.sendMessage(tid, { text: broadcastMsg });
        sent++;
        await new Promise(r => setTimeout(r, 700)); // rate-limit safe delay
      } catch (_) { failed++; }
    }

    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ✅ Broadcast Complete 〕━━━⬣\n` +
        `┃\n` +
        `┃ ✅ Sent : *${sent}*\n` +
        `┃ ❌ Failed: *${failed}*\n` +
        `┃ 📊 Total : *${targets.length}*\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  async shutdown(sock, msg) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: '*DollarBot v6 shutting down...*\nGoodbye!' });
    await new Promise(r => setTimeout(r, 2000));
    process.exit(0);
  },
};

module.exports = ownerCommands;
