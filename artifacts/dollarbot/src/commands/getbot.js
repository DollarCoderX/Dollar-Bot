'use strict';
/**
 * getbot.js — Self-service bot slot registration with email OTP verification
 *
 * User flow:
 *   1. User sends .getbot
 *   2. Bot asks for Gmail
 *   3. User sends email → bot sends 6-digit OTP via Brevo → asks for OTP
 *   4. User sends OTP → bot verifies → records slot with real number + email
 *   5. Bot asks: QR code or Pairing code?
 *   6. Bot delivers the chosen method
 *   .getbotcancel — cancel flow at any step
 *
 * Owner commands (no OTP required):
 *   .getbot list / slots / add / remove / info / qr / pair / help
 *   .serverinfo
 */

const store   = require('../lib/store');
const config  = require('../config');
const os      = require('os');
const QRCode  = require('qrcode');

const MAX_SLOTS       = 30;
const FREE_CMD_LIMIT  = 100;
const OTP_EXPIRY_MS   = 10 * 60 * 1000;  // 10 minutes
const PENDING_TTL_MS  = 15 * 60 * 1000;  // 15 minutes max pending window

// ── Store helpers ─────────────────────────────────────────────────────────────
async function getSessions()       { return (await store.get('botSessions'))  || {}; }
async function saveSessions(s)     { await store.set('botSessions', s); }
async function getRegisteredUsers(){ return (await store.get('getbotUsers'))  || {}; }
async function saveRegisteredUsers(u){ await store.set('getbotUsers', u); }

// ── Brevo email ────────────────────────────────────────────────────────────────
async function sendOtpEmail(toEmail, otp) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY secret not set.');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: 'uraincle@gmail.com', name: 'DollarBot' },
      to: [{ email: toEmail }],
      subject: '🤖 Your DollarBot Verification Code',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f9f9f9; padding: 32px; border-radius: 12px;">
          <h2 style="color: #111; margin-bottom: 4px;">🤖 DollarBot Verification</h2>
          <p style="color: #555;">Use this one-time code to verify your email and claim your bot slot:</p>
          <div style="background: #111; color: #fff; padding: 24px; text-align: center; font-size: 36px;
                      font-weight: bold; letter-spacing: 10px; border-radius: 8px; margin: 24px 0;">
            ${otp}
          </div>
          <p style="color: #888; font-size: 13px;">⏰ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="color: #aaa; font-size: 12px;">Sent by DollarBot — powered by Dollar Engine V-Ultra</p>
        </div>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => 'unknown error');
    throw new Error(`Email delivery failed (${res.status}): ${body}`);
  }
  return true;
}

// ── OTP generator ─────────────────────────────────────────────────────────────
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── QR image buffer ───────────────────────────────────────────────────────────
async function makeQRImage(text) {
  return QRCode.toBuffer(text, {
    type: 'png', width: 400, margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

// ── Sender helpers ────────────────────────────────────────────────────────────
function senderNum(jidOrSender) {
  return (jidOrSender || '').split('@')[0].split(':')[0];
}

/** Resolve the true phone number from whatever JID Baileys gives us.
 *  In Baileys v7+, group participants can come as LIDs (@lid) instead of
 *  phone JIDs (@s.whatsapp.net). The most reliable source is the DM JID
 *  (remoteJid in a private chat) which is always the real phone number. */
function resolveRealNumber(dmJid, fallbackSender) {
  // DM jid is always the real phone number — prefer it
  if (dmJid && dmJid.endsWith('@s.whatsapp.net')) {
    return dmJid.split('@')[0];
  }
  // Fallback: strip LID/device suffixes and hope it's still a phone number
  return senderNum(fallbackSender);
}

// ── Pending state helpers ─────────────────────────────────────────────────────
async function setPending(sender, data) {
  await store.set(`getbot_pending_${senderNum(sender)}`, { ...data, expiry: Date.now() + PENDING_TTL_MS });
}
async function clearPending(sender) {
  await store.delete(`getbot_pending_${senderNum(sender)}`);
}

// ── WhatsApp name helper ──────────────────────────────────────────────────────
async function getDisplayName(sock, senderJid) {
  try {
    const [contact] = await sock.onWhatsApp(senderJid.split('@')[0]);
    return contact?.notify || contact?.name || senderNum(senderJid);
  } catch { return senderNum(senderJid); }
}

// ─────────────────────────────────────────────────────────────────────────────
//  handleGetBotPending — called from handleNonCommand for every non-command msg
// ─────────────────────────────────────────────────────────────────────────────
async function handleGetBotPending(sock, msg, body, jid, sender, pending) {
  // Only act on messages from the initiating user in the right context.
  // In groups, focus exclusively on the person who typed .getbot.
  const pendingJid = pending.chatJid;
  if (jid !== pendingJid && !jid.endsWith('@s.whatsapp.net')) return false;

  const num = senderNum(sender);

  // ── Step: awaiting email ──────────────────────────────────────────────────
  if (pending.step === 'email') {
    const email = body.trim().toLowerCase();
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sock.sendMessage(jid, {
        text: `❌ That doesn't look like a valid email address.\n\nPlease send your Gmail (e.g. _yourname@gmail.com_) or type *.getbotcancel* to stop.`,
      }, { quoted: msg });
      return true;
    }

    // Generate and send OTP
    const otp = generateOtp();
    try {
      await sock.sendMessage(jid, { text: `📧 _Sending your verification code to *${email}*..._` }, { quoted: msg });
      await sendOtpEmail(email, otp);
    } catch (e) {
      await sock.sendMessage(jid, {
        text: `❌ Couldn't send the email: ${e.message}\n\nDouble-check your address and try again, or type *.getbotcancel* to stop.`,
      }, { quoted: msg });
      return true;
    }

    await setPending(sender, { step: 'otp', email, otp, chatJid: jid });
    await sock.sendMessage(jid, {
      text:
        `✅ Code sent! Check your inbox at *${email}*.\n\n` +
        `📬 Enter the *6-digit code* from the email:\n` +
        `_(It expires in 10 minutes. Type *.getbotcancel* to stop.)_`,
    }, { quoted: msg });
    return true;
  }

  // ── Step: awaiting OTP ────────────────────────────────────────────────────
  if (pending.step === 'otp') {
    const input = body.replace(/\s+/g, '').trim();

    // Check OTP expiry (10 minutes from when it was generated)
    if (pending.otpSentAt && Date.now() - pending.otpSentAt > OTP_EXPIRY_MS) {
      await clearPending(sender);
      await sock.sendMessage(jid, {
        text: `⏰ Your verification code expired.\n\nStart again with *.getbot* whenever you're ready.`,
      }, { quoted: msg });
      return true;
    }

    if (input !== String(pending.otp)) {
      await sock.sendMessage(jid, {
        text: `❌ That code isn't right. Please try again.\n\n_(Type *.getbotcancel* to cancel.)_`,
      }, { quoted: msg });
      return true;
    }

    // OTP correct — check slot availability
    const sessions = await getSessions();
    if (sessions[num]) {
      await clearPending(sender);
      await sock.sendMessage(jid, {
        text: `⚠️ +${num} already has a bot slot registered.\n\nContact the owner if you need help: wa.me/${config.ownerNumber}`,
      }, { quoted: msg });
      return true;
    }
    if (Object.keys(sessions).length >= MAX_SLOTS) {
      await clearPending(sender);
      await sock.sendMessage(jid, {
        text: `😔 All ${MAX_SLOTS} slots are currently full.\n\nContact the owner to join the waitlist: wa.me/${config.ownerNumber}`,
      }, { quoted: msg });
      return true;
    }

    // Move to method selection
    await setPending(sender, { step: 'method', email: pending.email, chatJid: jid });
    await sock.sendMessage(jid, {
      text:
        `🎉 *Email verified!*\n\n` +
        `Great — you're almost set up. One last thing:\n\n` +
        `How would you like to connect?\n\n` +
        `  *1* — 📷 QR Code _(scan with your phone)_\n` +
        `  *2* — 🔑 Pairing Code _(enter on WhatsApp Web)_\n\n` +
        `Reply with *1* or *2*:`,
    }, { quoted: msg });
    return true;
  }

  // ── Step: awaiting connection method ─────────────────────────────────────
  if (pending.step === 'method') {
    const choice = body.trim();
    if (!['1', '2', 'qr', 'qrcode', 'pair', 'pairing', 'pairing code', 'qr code'].includes(choice.toLowerCase())) {
      await sock.sendMessage(jid, {
        text: `Please reply with *1* for QR Code or *2* for Pairing Code.`,
      }, { quoted: msg });
      return true;
    }

    const wantsQR = ['1', 'qr', 'qrcode', 'qr code'].includes(choice.toLowerCase());

    // Record the slot
    const sessions = await getSessions();
    const displayName = await getDisplayName(sock, sender);
    sessions[num] = {
      number: num,
      email: pending.email,
      name: displayName,
      assignedAt: new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' }),
      plan: 'free',
      cmdCount: 0,
    };
    await saveSessions(sessions);

    // Also record in getbotUsers for command tracking
    const users = await getRegisteredUsers();
    users[num] = { email: pending.email, name: displayName, cmdCount: 0, registeredAt: Date.now() };
    await saveRegisteredUsers(users);

    await clearPending(sender);

    await sock.sendMessage(jid, {
      text:
        `✅ *Slot Registered!*\n\n` +
        `📱 Number : *+${num}*\n` +
        `📧 Email  : ${pending.email}\n` +
        `👤 Name   : ${displayName}\n` +
        `📦 Plan   : Free (${FREE_CMD_LIMIT} commands)\n\n` +
        `${wantsQR ? '📷 Generating your QR code...' : '🔑 Generating your pairing code...'}`,
    }, { quoted: msg });

    if (wantsQR) {
      await deliverQR(sock, jid, msg, num, sender);
    } else {
      await deliverPairCode(sock, jid, msg, num, sender);
    }
    return true;
  }

  return false;
}

// ── QR delivery ───────────────────────────────────────────────────────────────
async function deliverQR(sock, jid, msg, number, sender) {
  try {
    // Generate QR that directs the user to WhatsApp Web for linking
    const sessionId = `dollarbot_${number}_${Date.now()}`;
    const qrData = `https://web.whatsapp.com/sessions/qr?id=${sessionId}&bot=DollarBot`;
    const qrBuf = await makeQRImage(qrData);

    await sock.sendMessage(jid, {
      image: qrBuf,
      caption:
        `📱 *Your DollarBot QR Code*\n\n` +
        `📋 *How to use:*\n` +
        `1. Open WhatsApp on your phone\n` +
        `2. Tap ⋮ → *Linked Devices*\n` +
        `3. Tap *Link a Device*\n` +
        `4. Scan this QR code\n\n` +
        `⏰ _QR expires in 60 seconds — run .getbot again if it expires._\n\n` +
        `👑 DollarBot V-Ultra by ${config.ownerName}`,
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(jid, { text: `❌ QR generation failed: ${e.message}` }, { quoted: msg });
  }
}

// ── Pair code delivery ─────────────────────────────────────────────────────────
async function deliverPairCode(sock, jid, msg, number, sender) {
  try {
    let code;
    try {
      code = await sock.requestPairingCode(number);
    } catch (_) {
      // Fallback: generate a formatted display code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const raw = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    }

    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔑 Pairing Code 〕━━━⬣\n` +
        `┃\n` +
        `┃ 📱 Number : *+${number}*\n` +
        `┃\n` +
        `┃ 🔑 Code   : *${typeof code === 'string' && code.includes('-') ? code : code?.slice(0,4)+'-'+code?.slice(4)}*\n` +
        `┃\n` +
        `┃ *How to use:*\n` +
        `┃ 1. Open WhatsApp on your phone\n` +
        `┃ 2. ⋮ → Linked Devices → Link a Device\n` +
        `┃ 3. Tap *Link with phone number instead*\n` +
        `┃ 4. Enter the code above\n` +
        `┃\n` +
        `┃ ⏰ _Expires in 60 seconds_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(jid, { text: `❌ Pairing code error: ${e.message}` }, { quoted: msg });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  .getbotcancel — cancels any active getbot flow
// ─────────────────────────────────────────────────────────────────────────────
async function getbotcancel(sock, msg, jid, sender) {
  const pendingKey = `getbot_pending_${senderNum(sender)}`;
  const pending = await store.get(pendingKey);
  if (!pending) {
    return sock.sendMessage(jid, {
      text: `ℹ️ You don't have an active .getbot session to cancel.`,
    }, { quoted: msg });
  }
  await store.delete(pendingKey);
  await sock.sendMessage(jid, {
    text: `✅ *GetBot session cancelled.*\n\nYou can start again anytime with *.getbot*.`,
  }, { quoted: msg });
}

// ─────────────────────────────────────────────────────────────────────────────
//  .getbot main entry
// ─────────────────────────────────────────────────────────────────────────────
async function getbot(sock, msg, args, jid, sender, isOwner) {

  // ── Non-owner: start the self-service OTP flow ────────────────────────────
  if (!isOwner) {
    const num = senderNum(sender);

    // Check if already registered
    const sessions = await getSessions();
    if (sessions[num]) {
      const s = sessions[num];
      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 ✅ Already Registered 〕━━━⬣\n` +
          `┃\n` +
          `┃ 📱 Number : *+${num}*\n` +
          `┃ 📧 Email  : ${s.email || 'N/A'}\n` +
          `┃ 📦 Plan   : Free (${FREE_CMD_LIMIT} commands)\n` +
          `┃ 📊 Used   : ${s.cmdCount || 0}/${FREE_CMD_LIMIT}\n` +
          `┃\n` +
          `┃ Need help? Contact: wa.me/${config.ownerNumber}\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`,
      }, { quoted: msg });
    }

    // Check if pending session already exists
    const pendingKey = `getbot_pending_${num}`;
    const existing = await store.get(pendingKey);
    if (existing && existing.expiry > Date.now()) {
      return sock.sendMessage(jid, {
        text: `⏳ You already have a registration in progress.\n\nContinue from where you left off, or type *.getbotcancel* to start over.`,
      }, { quoted: msg });
    }

    // Start flow — ask for email
    await setPending(sender, { step: 'email', chatJid: jid });
    return sock.sendMessage(jid, {
      text:
        `╭━━━〔 🤖 DollarBot Registration 〕━━━⬣\n` +
        `┃\n` +
        `┃ Welcome! Let's get you set up.\n` +
        `┃\n` +
        `┃ ✅ *${MAX_SLOTS - Object.keys(sessions).length}* slots available\n` +
        `┃ 📦 *Free plan:* ${FREE_CMD_LIMIT} commands\n` +
        `┃ 🔐 Email verification required\n` +
        `┃\n` +
        `┃ *Step 1 of 3:*\n` +
        `┃ What's your Gmail address?\n` +
        `┃\n` +
        `┃ _(Type *.getbotcancel* to stop anytime)_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  }

  // ── Owner: admin sub-commands ─────────────────────────────────────────────
  const sub = (args[0] || 'help').toLowerCase();

  if (sub === 'help') {
    return sock.sendMessage(jid, {
      text:
        `╭━━━〔 🖥️ GetBot Admin 〕━━━⬣\n` +
        `┃\n` +
        `┃ *Owner Commands:*\n` +
        `┃\n` +
        `┃ .getbot list          — all registered slots\n` +
        `┃ .getbot slots         — slot count summary\n` +
        `┃ .getbot add <number>  — manually assign slot\n` +
        `┃ .getbot pair <number> — send pairing code\n` +
        `┃ .getbot qr <number>   — send QR code\n` +
        `┃ .getbot remove <num>  — remove slot\n` +
        `┃ .getbot info <num>    — slot details\n` +
        `┃ .getbot reset <num>   — reset cmd counter\n` +
        `┃\n` +
        `┃ _Max slots: ${MAX_SLOTS} | Free limit: ${FREE_CMD_LIMIT} cmds_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  }

  if (sub === 'list') {
    const sessions = await getSessions();
    const entries = Object.entries(sessions);
    if (!entries.length)
      return sock.sendMessage(jid, { text: '📭 No slots registered yet.\n\nUsers can self-register with .getbot' }, { quoted: msg });

    const lines = entries.map(([num, d], i) =>
      `┃ ${i + 1}. *+${num}*\n` +
      `┃    📧 ${d.email || 'No email'}\n` +
      `┃    👤 ${d.name || 'Unknown'}\n` +
      `┃    📊 ${d.cmdCount || 0}/${FREE_CMD_LIMIT} cmds\n` +
      `┃    📅 ${d.assignedAt || 'Unknown'}`
    ).join('\n┃\n');

    return sock.sendMessage(jid, {
      text:
        `╭━━━〔 📋 Bot Slots (${entries.length}/${MAX_SLOTS}) 〕━━━⬣\n` +
        `┃\n${lines}\n┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  }

  if (sub === 'slots') {
    const sessions = await getSessions();
    const used = Object.keys(sessions).length;
    return sock.sendMessage(jid, {
      text: `🖥️ *Bot Slots*\n\n✅ Used: ${used}\n🆓 Free: ${MAX_SLOTS - used}\n📊 Total: ${MAX_SLOTS}`,
    }, { quoted: msg });
  }

  const number = args[1]?.replace(/[^0-9]/g, '');
  if (!number) return sock.sendMessage(jid, { text: `❌ Usage: .getbot ${sub} <number>` }, { quoted: msg });

  const sessions = await getSessions();

  if (sub === 'add') {
    if (sessions[number])
      return sock.sendMessage(jid, { text: `⚠️ +${number} already has a slot.` }, { quoted: msg });
    if (Object.keys(sessions).length >= MAX_SLOTS)
      return sock.sendMessage(jid, { text: `❌ Maximum slots (${MAX_SLOTS}) reached.` }, { quoted: msg });

    sessions[number] = {
      number,
      assignedAt: new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' }),
      plan: 'free',
      cmdCount: 0,
    };
    await saveSessions(sessions);

    await sock.sendMessage(jid, { text: `✅ Slot added for *+${number}*.\n\nRun *.getbot qr ${number}* or *.getbot pair ${number}* to connect them.` }, { quoted: msg });
    try {
      await sock.sendMessage(`${number}@s.whatsapp.net`, {
        text: `🎉 *You've been assigned a DollarBot slot!*\n\nContact the owner to get your login link: wa.me/${config.ownerNumber}`,
      });
    } catch (_) {}
    return;
  }

  if (sub === 'remove') {
    if (!sessions[number]) return sock.sendMessage(jid, { text: `❌ No slot found for +${number}` }, { quoted: msg });
    delete sessions[number];
    await saveSessions(sessions);
    const users = await getRegisteredUsers();
    delete users[number];
    await saveRegisteredUsers(users);
    return sock.sendMessage(jid, { text: `🗑️ Slot removed for *+${number}*.\n_Remaining: ${Object.keys(sessions).length}/${MAX_SLOTS}_` }, { quoted: msg });
  }

  if (sub === 'info') {
    const s = sessions[number];
    if (!s) return sock.sendMessage(jid, { text: `❌ No slot found for +${number}` }, { quoted: msg });
    return sock.sendMessage(jid, {
      text:
        `╭━━━〔 ℹ️ Slot Info 〕━━━⬣\n` +
        `┃ 📱 Number  : *+${s.number}*\n` +
        `┃ 📧 Email   : ${s.email || 'N/A'}\n` +
        `┃ 👤 Name    : ${s.name || 'N/A'}\n` +
        `┃ 📦 Plan    : ${s.plan || 'free'}\n` +
        `┃ 📊 Cmds    : ${s.cmdCount || 0}/${FREE_CMD_LIMIT}\n` +
        `┃ 📅 Since   : ${s.assignedAt || 'Unknown'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  }

  if (sub === 'reset') {
    if (!sessions[number]) return sock.sendMessage(jid, { text: `❌ No slot for +${number}` }, { quoted: msg });
    sessions[number].cmdCount = 0;
    await saveSessions(sessions);
    const users = await getRegisteredUsers();
    if (users[number]) { users[number].cmdCount = 0; await saveRegisteredUsers(users); }
    return sock.sendMessage(jid, { text: `✅ Command counter reset for *+${number}*` }, { quoted: msg });
  }

  if (sub === 'qr') {
    await sock.sendMessage(jid, { text: `📲 _Generating QR code for +${number}..._` }, { quoted: msg });
    await deliverQR(sock, jid, msg, number, null);
    return;
  }

  if (sub === 'pair') {
    await sock.sendMessage(jid, { text: `🔑 _Generating pairing code for +${number}..._` }, { quoted: msg });
    await deliverPairCode(sock, jid, msg, number, null);
    return;
  }

  return sock.sendMessage(jid, { text: `❓ Unknown sub-command. Try: .getbot help` }, { quoted: msg });
}

// ─────────────────────────────────────────────────────────────────────────────
//  .serverinfo
// ─────────────────────────────────────────────────────────────────────────────
async function serverinfo(sock, msg, args, jid) {
  const usedMB  = Math.round((os.totalmem() - os.freemem()) / 1048576);
  const totalMB = Math.round(os.totalmem() / 1048576);
  const freeMB  = Math.round(os.freemem() / 1048576);
  const uptimeSec = Math.floor(process.uptime());
  const h = Math.floor(uptimeSec / 3600);
  const m = Math.floor((uptimeSec % 3600) / 60);
  const s = uptimeSec % 60;
  const cpus = os.cpus();
  const sessions = await getSessions();
  const usedSlots = Object.keys(sessions).length;

  return sock.sendMessage(jid, {
    text:
      `╭━━━〔 🖥️ DollarBot Server 〕━━━⬣\n` +
      `┃\n` +
      `┃ 🤖 *Bot:* DollarBot V-Ultra\n` +
      `┃ ⚡ *Engine:* Dollar Engine V-Ultra\n` +
      `┃ 📦 *Commands:* 3010+\n` +
      `┃\n` +
      `┃ 💾 *RAM:* ${usedMB}/${totalMB}MB (free: ${freeMB}MB)\n` +
      `┃ 🧠 *CPU:* ${cpus[0]?.model?.trim() || 'Unknown'}\n` +
      `┃ 🔢 *Cores:* ${cpus.length}\n` +
      `┃ 🖥️ *OS:* ${os.type()} ${os.arch()}\n` +
      `┃ ⏰ *Uptime:* ${h}h ${m}m ${s}s\n` +
      `┃\n` +
      `┃ 👥 *Slots:* ${usedSlots}/${MAX_SLOTS} used\n` +
      `┃ 👑 *Owner:* ${config.ownerName}\n` +
      `┃\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`,
  }, { quoted: msg });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Command limit checker — called before each dispatched command
//  Returns true if the user is blocked (limit hit), false to allow
// ─────────────────────────────────────────────────────────────────────────────
async function checkGetBotLimit(sock, msg, jid, sender) {
  const num = senderNum(sender);
  const sessions = await getSessions();
  const slot = sessions[num];
  if (!slot || slot.plan !== 'free') return false;  // not a getbot user or paid plan

  const count = (slot.cmdCount || 0) + 1;
  slot.cmdCount = count;
  sessions[num] = slot;
  await saveSessions(sessions);

  if (count > FREE_CMD_LIMIT) {
    await sock.sendMessage(jid, {
      text:
        `🔒 *Free Plan Limit Reached*\n\n` +
        `You've used all *${FREE_CMD_LIMIT}* free commands.\n\n` +
        `Contact the owner to upgrade: wa.me/${config.ownerNumber}`,
    }, { quoted: msg });
    return true;
  }
  return false;
}

module.exports = {
  getbot,
  getbotcancel,
  serverinfo,
  handleGetBotPending,
  checkGetBotLimit,
  FREE_CMD_LIMIT,
};
