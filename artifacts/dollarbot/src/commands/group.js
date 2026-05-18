const store = require('../lib/store');

const groupCommands = {
  async kick(sock, msg, args, isAdmin) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ This command works only in groups.' });
    if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Bot must be an admin to kick members.' });

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
      msg.message?.buttonsResponseMessage?.contextInfo?.mentionedJid || [];

    if (!mentioned.length) return sock.sendMessage(jid, { text: '❌ Usage: .kick @user\nExample: .kick @user' });

    for (const user of mentioned) {
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'remove');
        await sock.sendMessage(jid, { text: `✅ Kicked: @${user.split('@')[0]}`, mentions: [user] });
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Failed to kick @${user.split('@')[0]}: ${e.message}`, mentions: [user] });
      }
    }
  },

  async promote(sock, msg, args, isAdmin) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Bot must be an admin.' });

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return sock.sendMessage(jid, { text: '❌ Usage: .promote @user' });

    for (const user of mentioned) {
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'promote');
        await sock.sendMessage(jid, { text: `⬆️ Promoted @${user.split('@')[0]} to admin!`, mentions: [user] });
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` });
      }
    }
  },

  async demote(sock, msg, args, isAdmin) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Bot must be an admin.' });

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return sock.sendMessage(jid, { text: '❌ Usage: .demote @user' });

    for (const user of mentioned) {
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'demote');
        await sock.sendMessage(jid, { text: `⬇️ Demoted @${user.split('@')[0]} from admin.`, mentions: [user] });
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` });
      }
    }
  },

  async mute(sock, msg, isAdmin) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Bot must be an admin.' });
    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      await sock.sendMessage(jid, { text: '🔇 Group has been *muted*. Only admins can send messages.' });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async unmute(sock, msg, isAdmin) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Bot must be an admin.' });
    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      await sock.sendMessage(jid, { text: '🔊 Group has been *unmuted*. Everyone can send messages.' });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async tagall(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    try {
      const meta = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const text = members.map(m => `@${m.split('@')[0]}`).join(' ');
      await sock.sendMessage(jid, {
        text: `📢 *Tagging everyone!*\n\n${text}`,
        mentions: members,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async everyone(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    const message = args.join(' ') || '👋 Attention everyone!';
    try {
      const meta = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const tags = members.map(m => `@${m.split('@')[0]}`).join(' ');
      await sock.sendMessage(jid, {
        text: `📣 ${message}\n\n${tags}`,
        mentions: members,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async hidetag(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    const message = args.join(' ') || '📢 Announcement';
    try {
      const meta = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      await sock.sendMessage(jid, {
        text: message,
        mentions: members,
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async grouplink(sock, msg, isAdmin) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Bot must be an admin to get invite link.' });
    try {
      const link = await sock.groupInviteCode(jid);
      await sock.sendMessage(jid, { text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${link}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async groupinfo(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    try {
      const meta = await sock.groupMetadata(jid);
      const admins = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join(', ') || 'None';
      const created = new Date(meta.creation * 1000).toDateString();
      const text =
        `╭━━━〔 👥 GROUP INFO 〕━━━⬣\n` +
        `┃ ✦ Name : ${meta.subject}\n` +
        `┃ ✦ ID : ${jid}\n` +
        `┃ ✦ Members : ${meta.participants.length}\n` +
        `┃ ✦ Admins : ${admins}\n` +
        `┃ ✦ Created : ${created}\n` +
        `┃ ✦ Description :\n` +
        `┃   ${meta.desc || 'None'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`;
      await sock.sendMessage(jid, { text, mentions: meta.participants.filter(p => p.admin).map(p => p.id) });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
    }
  },

  async antilink(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting)) {
      return sock.sendMessage(jid, { text: '❌ Usage: .antilink on/off' });
    }
    const antilinkGroups = store.get('antilinkGroups') || {};
    antilinkGroups[jid] = setting === 'on';
    store.set('antilinkGroups', antilinkGroups);
    await sock.sendMessage(jid, {
      text: `🔗 Anti-Link is now *${setting.toUpperCase()}* ${setting === 'on' ? '✅' : '❌'}\n${setting === 'on' ? 'Members sending links will be removed.' : 'Link detection disabled.'}`,
    });
  },

  async welcome(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting)) {
      return sock.sendMessage(jid, { text: '❌ Usage: .welcome on/off' });
    }
    const welcomeGroups = store.get('welcomeGroups') || {};
    welcomeGroups[jid] = setting === 'on';
    store.set('welcomeGroups', welcomeGroups);
    await sock.sendMessage(jid, {
      text: `👋 Welcome message is now *${setting.toUpperCase()}* ${setting === 'on' ? '✅' : '❌'}`,
    });
  },
};

module.exports = groupCommands;
