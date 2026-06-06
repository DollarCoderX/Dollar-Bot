const store = require('../lib/store');

// ── Helpers ───────────────────────────────────────────────────────────────

function getSender(msg) {
  return msg?.key?.participant || msg?.key?.remoteJid || '';
}

// Get quoted participant directly (most reliable method)
function getQuotedJid(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    msg.message?.imageMessage?.contextInfo?.participant ||
    msg.message?.videoMessage?.contextInfo?.participant ||
    msg.message?.audioMessage?.contextInfo?.participant ||
    msg.message?.stickerMessage?.contextInfo?.participant ||
    null
  );
}

// Get mentioned JIDs from @tag
function getMentioned(msg) {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    null;
  return ctx?.mentionedJid || [];
}

// Resolve the target user — tries quoted first, then @mention, then raw number arg
function resolveTarget(msg, args) {
  const quoted = getQuotedJid(msg);
  if (quoted) return quoted;

  const mentioned = getMentioned(msg);
  if (mentioned.length) return mentioned[0];

  if (args[0]) {
    const digits = args[0].replace(/[^0-9]/g, '');
    if (digits.length >= 7) return digits + '@s.whatsapp.net';
  }

  return null;
}

// Normalize bot JID (strip :device suffix)
function getBotJid(sock) {
  return (sock.user?.id || '').replace(/:.*@/, '@');
}

async function isBotGroupAdmin(sock, jid) {
  try {
    const meta = await sock.groupMetadata(jid);
    const botJid = getBotJid(sock);
    const botNum = botJid.split('@')[0];
    return meta.participants.some(p => {
      const pNum = p.id.split('@')[0].split(':')[0];
      return (p.id === botJid || pNum === botNum) && (p.admin === 'admin' || p.admin === 'superadmin');
    });
  } catch { return false; }
}

async function send(sock, jid, msg, text, opts = {}) {
  return sock.sendMessage(jid, { text, ...opts }, { quoted: msg });
}

// ── Commands ─────────────────────────────────────────────────────────────

const groupCommands = {

  // .kick — remove member (reply or @mention or number)
  async kick(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSender(msg);

    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to kick members.');

    const target = resolveTarget(msg, args);
    if (!target)
      return send(sock, jid, msg, '❌ Reply to a message, @mention, or provide a number.\nUsage: .kick @user');

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'remove');
      const tag = target.split('@')[0].split(':')[0];
      await send(sock, jid, msg,
        `╭━━━〔 👢 KICKED 〕━━━⬣\n┃ @${tag} has been removed.\n╰━━━━━━━━━━━━━━━━━━⬣`,
        { mentions: [target] }
      );
    } catch (e) {
      await send(sock, jid, msg, `❌ Kick failed: ${e.message}`);
    }
  },

  // .add — add member by number
  async add(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to add members.');

    if (!args[0])
      return send(sock, jid, msg, '❌ Usage: .add <number>\nExample: .add 14378898269');

    const number = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    try {
      await sock.groupParticipantsUpdate(jid, [number], 'add');
      await send(sock, jid, msg, `✅ Added *+${args[0].replace(/[^0-9]/g, '')}* to the group!`);
    } catch (e) {
      await send(sock, jid, msg, `❌ Could not add: ${e.message}`);
    }
  },

  // .promote — make member admin
  async promote(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to promote members.');

    const target = resolveTarget(msg, args);
    if (!target)
      return send(sock, jid, msg, '❌ Reply to a message, @mention, or provide a number.\nUsage: .promote @user');

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'promote');
      const tag = target.split('@')[0].split(':')[0];
      await send(sock, jid, msg,
        `╭━━━〔 ⬆️ PROMOTED 〕━━━⬣\n┃ @${tag} is now an admin! 👑\n╰━━━━━━━━━━━━━━━━━━⬣`,
        { mentions: [target] }
      );
    } catch (e) {
      await send(sock, jid, msg, `❌ Promote failed: ${e.message}`);
    }
  },

  // .demote — remove admin rights
  async demote(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to demote members.');

    const target = resolveTarget(msg, args);
    if (!target)
      return send(sock, jid, msg, '❌ Reply to a message, @mention, or provide a number.\nUsage: .demote @user');

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'demote');
      const tag = target.split('@')[0].split(':')[0];
      await send(sock, jid, msg,
        `╭━━━〔 ⬇️ DEMOTED 〕━━━⬣\n┃ @${tag} is no longer admin.\n╰━━━━━━━━━━━━━━━━━━⬣`,
        { mentions: [target] }
      );
    } catch (e) {
      await send(sock, jid, msg, `❌ Demote failed: ${e.message}`);
    }
  },

  // .mute — only admins can send
  async mute(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to mute the group.');
    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      await send(sock, jid, msg, '🔇 Group *muted* — only admins can send messages.');
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .unmute — everyone can send
  async unmute(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to unmute the group.');
    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      await send(sock, jid, msg, '🔊 Group *unmuted* — everyone can send messages.');
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .open — alias for unmute
  async open(sock, msg) {
    return groupCommands.unmute(sock, msg);
  },

  // .close — alias for mute
  async close(sock, msg) {
    return groupCommands.mute(sock, msg);
  },

  // .tagall — tag every member
  async tagall(sock, msg, args) {
    const jid = msg.key.remoteJid;
    try {
      const meta = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const message = args.join(' ') || '📢 Attention everyone!';
      const tags = members.map(m => `@${m.split('@')[0].split(':')[0]}`).join(' ');
      await sock.sendMessage(jid,
        { text: `*${message}*\n\n${tags}`, mentions: members },
        { quoted: msg }
      );
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .everyone — same as tagall with optional message
  async everyone(sock, msg, args) {
    return groupCommands.tagall(sock, msg, args);
  },

  // .hidetag — tag all silently (no visible @names)
  async hidetag(sock, msg, args) {
    const jid = msg.key.remoteJid;
    try {
      const meta = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const message = args.join(' ') || '📯 Announcement';
      await sock.sendMessage(jid, { text: message, mentions: members }, { quoted: msg });
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .admins — list all group admins
  async admins(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const meta = await sock.groupMetadata(jid);
      const admins = meta.participants.filter(p => p.admin);
      if (!admins.length) return send(sock, jid, msg, '❌ No admins found in this group.');

      let text = `╭━━━〔 👑 GROUP ADMINS 〕━━━⬣\n┃\n`;
      for (const a of admins) {
        const num = a.id.split('@')[0].split(':')[0];
        const role = a.admin === 'superadmin' ? '👑 Creator' : '⭐ Admin';
        text += `┃ ${role}: @${num}\n`;
      }
      text += `┃\n┃ Total: ${admins.length} admin(s)\n╰━━━━━━━━━━━━━━━━━━⬣`;

      await sock.sendMessage(jid,
        { text, mentions: admins.map(a => a.id) },
        { quoted: msg }
      );
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .grouplink — get invite link
  async grouplink(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to get the group link.');
    try {
      const code = await sock.groupInviteCode(jid);
      const meta = await sock.groupMetadata(jid);
      await send(sock, jid, msg,
        `╭━━━〔 🔗 GROUP LINK 〕━━━⬣\n┃\n┃ *${meta.subject}*\n┃\n┃ https://chat.whatsapp.com/${code}\n┃\n╰━━━━━━━━━━━━━━━━━━⬣`
      );
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .revoke — reset group invite link
  async revoke(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to revoke the link.');
    try {
      await sock.groupRevokeInvite(jid);
      const newCode = await sock.groupInviteCode(jid);
      await send(sock, jid, msg,
        `✅ Group link *revoked*.\n\n🔗 New link:\nhttps://chat.whatsapp.com/${newCode}`
      );
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .groupinfo — full group details
  async groupinfo(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const meta = await sock.groupMetadata(jid);
      const admins = meta.participants.filter(p => p.admin);
      const created = meta.creation
        ? new Date(meta.creation * 1000).toLocaleDateString('en-CA')
        : 'N/A';
      const ownerNum = meta.owner ? meta.owner.split('@')[0].split(':')[0] : 'Unknown';

      let adminList = admins.map(a => `@${a.id.split('@')[0].split(':')[0]}`).join(', ') || 'None';

      const text =
        `╭━━━〔 👥 GROUP INFO 〕━━━⬣\n` +
        `┃ ✦ Name    : ${meta.subject}\n` +
        `┃ ✦ Members : ${meta.participants.length}\n` +
        `┃ ✦ Admins  : ${admins.length}\n` +
        `┃ ✦ Owner   : @${ownerNum}\n` +
        `┃ ✦ Created : ${created}\n` +
        `┃ ✦ Admin List:\n` +
        `┃   ${adminList}\n` +
        `┃ ✦ Description:\n` +
        `┃   ${(meta.desc || 'No description').slice(0, 120)}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`;

      await sock.sendMessage(jid,
        { text, mentions: admins.map(a => a.id) },
        { quoted: msg }
      );
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .setname — change group name
  async setname(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return send(sock, jid, msg, '❌ Usage: .setname <new name>');
    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to change the group name.');
    try {
      const newName = args.join(' ');
      await sock.groupUpdateSubject(jid, newName);
      await send(sock, jid, msg, `✅ Group name changed to *${newName}*`);
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .setdesc — change group description
  async setdesc(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length)
      return send(sock, jid, msg, '❌ Usage: .setdesc <new description>');
    if (!await isBotGroupAdmin(sock, jid))
      return send(sock, jid, msg, '❌ Bot must be admin to change the description.');
    try {
      const desc = args.join(' ');
      await sock.groupUpdateDescription(jid, desc);
      await send(sock, jid, msg, `✅ Group description updated!`);
    } catch (e) {
      await send(sock, jid, msg, `❌ Error: ${e.message}`);
    }
  },

  // .antilink — toggle anti-link protection
  async antilink(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting))
      return send(sock, jid, msg, '❌ Usage: .antilink on/off');

    const antilinkGroups = (await store.get('antilinkGroups')) || {};
    antilinkGroups[jid] = setting === 'on';
    await store.set('antilinkGroups', antilinkGroups);

    await send(sock, jid, msg,
      `🔗 Anti-Link is now *${setting.toUpperCase()}* ${setting === 'on' ? '✅' : '❌'}\n` +
      (setting === 'on' ? 'Members sending links will have their message deleted.' : 'Link detection disabled.')
    );
  },

  // .welcome — toggle welcome messages
  async welcome(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting))
      return send(sock, jid, msg, '❌ Usage: .welcome on/off');

    const welcomeGroups = (await store.get('welcomeGroups')) || {};
    welcomeGroups[jid] = setting === 'on';
    await store.set('welcomeGroups', welcomeGroups);

    await send(sock, jid, msg,
      `👋 Welcome messages are now *${setting.toUpperCase()}* ${setting === 'on' ? '✅' : '❌'}`
    );
  },

  // .antidelete — toggle anti-delete protection
  async antidelete(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting))
      return send(sock, jid, msg, '❌ Usage: .antidelete on/off');

    const antideleteGroups = (await store.get('antideleteGroups')) || {};
    antideleteGroups[jid] = setting === 'on';
    await store.set('antideleteGroups', antideleteGroups);

    await send(sock, jid, msg,
      `🗑️ Anti-Delete is now *${setting.toUpperCase()}* ${setting === 'on' ? '✅' : '❌'}\n` +
      (setting === 'on' ? 'Deleted messages in this group will be intercepted and resent.' : 'Anti-delete disabled.')
    );
  },


  // .antibot — kick any bot (non-human) detected in the group except DollarBot
  // Detection: checks verifiedName, known bot number patterns, and bot name keywords
  async antibot(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting))
      return send(sock, jid, msg, '❌ Usage: .antibot on/off');

    const antibotGroups = (await store.get('antibotGroups')) || {};
    antibotGroups[jid] = setting === 'on';
    await store.set('antibotGroups', antibotGroups);

    await send(sock, jid, msg,
      `🤖 Anti-Bot is now *${setting.toUpperCase()}* ${setting === 'on' ? '✅' : '❌'}\n` +
      (setting === 'on'
        ? '_Any bot detected in this group (except DollarBot) will be kicked automatically._'
        : 'Anti-bot disabled.')
    );
  },

  // .cancelbot — neutralize another bot's command by sending the same command first
  // Usage: .cancelbot .commandprefix  (e.g. .cancelbot /kick)
  // This makes your bot respond to that command before the rival bot does,
  // effectively cancelling it or overriding its output.
  async cancelbot(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!args.length) {
      return send(sock, jid, msg,
        `╭━━━〔 🛡️ CANCEL-BOT 〕━━━⬣\n` +
        `┃ Block rival bot commands!\n` +
        `┃\n` +
        `┃ *Usage:*\n` +
        `┃ .cancelbot on  — intercept mode\n` +
        `┃ .cancelbot off — disable\n` +
        `┃ .cancelbot add <prefix>\n` +
        `┃   e.g: .cancelbot add /kick\n` +
        `┃        .cancelbot add !\n` +
        `┃\n` +
        `┃ When ON, bot intercepts any\n` +
        `┃ message starting with rival\n` +
        `┃ prefixes and deletes it before\n` +
        `┃ the rival bot can respond.\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`
      );
    }

    const subCmd = args[0].toLowerCase();
    const cancelbotData = (await store.get('cancelbotGroups')) || {};

    if (subCmd === 'on' || subCmd === 'off') {
      if (!cancelbotData[jid]) cancelbotData[jid] = { active: false, prefixes: [] };
      cancelbotData[jid].active = subCmd === 'on';
      await store.set('cancelbotGroups', cancelbotData);
      return send(sock, jid, msg,
        `🛡️ Cancel-Bot is now *${subCmd.toUpperCase()}* ${subCmd === 'on' ? '✅' : '❌'}\n` +
        (subCmd === 'on'
          ? `_Rival bot commands with tracked prefixes will be auto-deleted._\n_Add prefixes: .cancelbot add /<cmd>_`
          : 'Cancel-bot disabled.')
      );
    }

    if (subCmd === 'add' && args[1]) {
      if (!cancelbotData[jid]) cancelbotData[jid] = { active: false, prefixes: [] };
      const prefix = args[1].trim();
      if (!cancelbotData[jid].prefixes.includes(prefix)) {
        cancelbotData[jid].prefixes.push(prefix);
      }
      await store.set('cancelbotGroups', cancelbotData);
      return send(sock, jid, msg,
        `✅ Added *${prefix}* to cancel-bot list!\n` +
        `Current prefixes: *${cancelbotData[jid].prefixes.join(', ')}*`
      );
    }

    if (subCmd === 'list') {
      const data = cancelbotData[jid];
      if (!data || !data.prefixes.length)
        return send(sock, jid, msg, '❌ No prefixes tracked. Use: .cancelbot add /kick');
      return send(sock, jid, msg,
        `🛡️ *Cancel-Bot Prefixes:*\n${data.prefixes.map(p => `• ${p}`).join('\n')}\n\nStatus: ${data.active ? '✅ ON' : '❌ OFF'}`
      );
    }

    if (subCmd === 'clear') {
      if (cancelbotData[jid]) cancelbotData[jid].prefixes = [];
      await store.set('cancelbotGroups', cancelbotData);
      return send(sock, jid, msg, '🗑️ Cancel-bot prefix list cleared.');
    }

    return send(sock, jid, msg, '❌ Usage: .cancelbot on/off/add <prefix>/list/clear');
  },

  // .delete — delete a replied-to message
  async delete(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted?.stanzaId)
      return send(sock, jid, msg, '❌ Reply to the message you want to delete.');

    const key = {
      remoteJid: jid,
      fromMe: quoted.participant === getBotJid(sock),
      id: quoted.stanzaId,
      participant: quoted.participant,
    };
    try {
      await sock.sendMessage(jid, { delete: key });
    } catch (e) {
      await send(sock, jid, msg, `❌ Could not delete: ${e.message}`);
    }
  },
};

module.exports = groupCommands;
