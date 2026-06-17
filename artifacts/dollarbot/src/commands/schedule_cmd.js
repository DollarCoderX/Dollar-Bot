'use strict';
const store = require('../lib/store');

const activeTimers = new Map(); // id → NodeJS.Timeout

function senderNum(msg) {
  return (msg.key.participant || msg.key.remoteJid || '').split('@')[0].split(':')[0];
}
function uid() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function parseDelay(str) {
  // e.g. "5m", "2h", "30s", "1h30m", "3600"
  if (!str) return null;
  const s = str.toLowerCase();
  let ms = 0;
  const h = s.match(/(\d+)h/); if (h) ms += parseInt(h[1]) * 3600000;
  const m = s.match(/(\d+)m/); if (m) ms += parseInt(m[1]) * 60000;
  const sec = s.match(/(\d+)s/); if (sec) ms += parseInt(sec[1]) * 1000;
  if (!ms) { const n = parseInt(s); if (!isNaN(n)) ms = n * 1000; }
  return ms > 0 ? ms : null;
}
function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h && `${h}h`, m && `${m}m`, sec && `${sec}s`].filter(Boolean).join(' ') || '0s';
}

async function loadSchedules() { return (await store.get('schedules')) || {}; }
async function saveSchedules(s) { return store.set('schedules', s); }

// Re-arm timers on bot restart
async function initSchedules(sock) {
  const schedules = await loadSchedules();
  const now = Date.now();
  for (const [id, entry] of Object.entries(schedules)) {
    const remaining = entry.fireAt - now;
    if (remaining <= 0) {
      // Already expired — fire immediately then delete
      try { await sock.sendMessage(entry.jid, { text: `⏰ *Scheduled Message:*\n\n${entry.message}` }); } catch (_) {}
      delete schedules[id];
    } else {
      const t = setTimeout(async () => {
        try { await sock.sendMessage(entry.jid, { text: `⏰ *Scheduled Message:*\n\n${entry.message}` }); } catch (_) {}
        const s2 = await loadSchedules(); delete s2[id]; await saveSchedules(s2);
        activeTimers.delete(id);
      }, remaining);
      activeTimers.set(id, t);
    }
  }
  await saveSchedules(schedules);
}

module.exports = {
  initSchedules,

  // .setschedule <delay> <message> — schedule a message
  // delay examples: 5m, 2h, 30s, 1h30m
  async setschedule(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (args.length < 2)
      return sock.sendMessage(jid, {
        text:
          '❌ Usage: .setschedule <delay> <message>\n\n' +
          '_Examples:_\n' +
          '.setschedule 5m Reminder: Call mum!\n' +
          '.setschedule 2h Meeting in 2 hours!\n' +
          '.setschedule 30s Test message',
      }, { quoted: msg });
    const delay = parseDelay(args[0]);
    if (!delay)
      return sock.sendMessage(jid, { text: '❌ Invalid time format. Use: 5m, 2h, 30s, 1h30m' }, { quoted: msg });
    if (delay > 7 * 24 * 3600000)
      return sock.sendMessage(jid, { text: '❌ Maximum schedule is 7 days.' }, { quoted: msg });

    const message = args.slice(1).join(' ');
    const id = uid();
    const fireAt = Date.now() + delay;
    const schedules = await loadSchedules();
    schedules[id] = { id, jid, message, fireAt, creator: senderNum(msg), created: Date.now() };
    await saveSchedules(schedules);

    const t = setTimeout(async () => {
      try { await sock.sendMessage(jid, { text: `⏰ *Scheduled Message:*\n\n${message}` }); } catch (_) {}
      const s2 = await loadSchedules(); delete s2[id]; await saveSchedules(s2);
      activeTimers.delete(id);
    }, delay);
    activeTimers.set(id, t);

    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ⏰ SCHEDULED 〕━━━⬣\n` +
        `┃ 🆔 *ID:* ${id}\n` +
        `┃ ⏳ *In:* ${fmtMs(delay)}\n` +
        `┃ 📝 *Message:* ${message.slice(0, 60)}${message.length > 60 ? '...' : ''}\n` +
        `┃\n┃ _Cancel with .delschedule ${id}_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .getschedule — list all scheduled messages
  async getschedule(sock, msg) {
    const jid = msg.key.remoteJid;
    const schedules = await loadSchedules();
    const entries = Object.values(schedules);
    if (!entries.length)
      return sock.sendMessage(jid, { text: '📋 No scheduled messages.\n\nSchedule one with *.setschedule <delay> <message>*' }, { quoted: msg });
    const now = Date.now();
    let text = `╭━━━〔 ⏰ SCHEDULES 〕━━━⬣\n`;
    for (const e of entries) {
      const remaining = Math.max(0, e.fireAt - now);
      text += `┃ *[${e.id}]* — In ${fmtMs(remaining)}\n┃ _${e.message.slice(0, 50)}_\n┃\n`;
    }
    text += `╰━━━━━━━━━━━━━━━━━━⬣\n_Total: ${entries.length} schedule(s)_`;
    await sock.sendMessage(jid, { text }, { quoted: msg });
  },

  // .delschedule <id> — cancel a scheduled message
  async delschedule(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const id = args[0]?.toUpperCase();
    if (!id)
      return sock.sendMessage(jid, { text: '❌ Usage: .delschedule <ID>\nGet IDs with .getschedule' }, { quoted: msg });
    const schedules = await loadSchedules();
    if (!schedules[id])
      return sock.sendMessage(jid, { text: `❌ Schedule *${id}* not found.` }, { quoted: msg });
    if (activeTimers.has(id)) { clearTimeout(activeTimers.get(id)); activeTimers.delete(id); }
    delete schedules[id];
    await saveSchedules(schedules);
    await sock.sendMessage(jid, { text: `✅ Schedule *${id}* cancelled.` }, { quoted: msg });
  },
};
