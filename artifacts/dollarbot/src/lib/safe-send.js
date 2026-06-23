'use strict';

const RETRYABLE_RE = /not-acceptable|bad-request|timed out|rate-overlimit/i;
const JID_RE = /^[\d\-]+@(?:s\.whatsapp\.net|c\.us|g\.us|lid)$/;
const SEND_TIMEOUT_MS = 12_000;

function isPlainObject(value) {
  return value && typeof value === 'object' && !Buffer.isBuffer(value);
}

function normalizeJid(jid) {
  return String(jid || '').replace(/:.*@/, '@');
}

function normalizeMentions(mentions) {
  if (!Array.isArray(mentions)) return undefined;
  // Accept both @s.whatsapp.net (users) and @g.us (groups) JIDs
  const clean = [...new Set(
    mentions
      .map(normalizeJid)
      .filter(jid => JID_RE.test(jid))
  )];
  return clean.length ? clean : undefined;
}

// Message types that can carry contextInfo forwarding flags
const FORWARDABLE_TYPES = new Set(['text','image','video','audio','document','sticker','caption']);

function addForwardContext(payload) {
  if (!isPlainObject(payload)) return payload;
  // Skip control payloads (react, delete, poll votes, etc.)
  if (payload.delete || payload.react || payload.poll) return payload;
  // Skip if no actual content type (pure contextInfo updates etc.)
  const hasContent = payload.text || payload.image || payload.video || payload.audio ||
                     payload.document || payload.sticker || payload.caption;
  if (!hasContent) return payload;
  return {
    ...payload,
    contextInfo: {
      ...(isPlainObject(payload.contextInfo) ? payload.contextInfo : {}),
      forwardingScore: 999,
      isForwarded: true,
    },
  };
}

function sanitizePayload(payload) {
  if (!isPlainObject(payload)) return payload;
  let safe = addForwardContext({ ...payload });
  const mentions = normalizeMentions(safe.mentions);
  if (mentions) safe.mentions = mentions;
  else delete safe.mentions;
  return safe;
}

function fallbackText(payload) {
  if (!isPlainObject(payload)) return '';
  return String(payload.text || payload.caption || '').trim();
}

function isControlPayload(payload) {
  return isPlainObject(payload) && (payload.delete || payload.react);
}

function sanitizeOptions(jid, options) {
  // NOTE: Do NOT strip 'quoted' from group messages.
  // Removing it causes WhatsApp to show "Waiting for this message" /
  // a frozen typing indicator because the reply context is lost.
  const safe = isPlainObject(options) ? { ...options } : {};
  return safe;
}

function shouldRetry(err) {
  const msg = err?.message || String(err || '');
  const status = err?.output?.statusCode || err?.data?.status;
  return RETRYABLE_RE.test(msg) || status === 400 || status === 406 || status === 408 || status === 429;
}

async function withTimeout(promise, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${SEND_TIMEOUT_MS}ms`)), SEND_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function safeSend(sock, jid, payload, options = {}) {
  const sendMessage = sock.__rawSendMessage || sock.sendMessage.bind(sock);
  if (isControlPayload(payload)) return sendMessage(jid, payload, options || {});

  const firstPayload = sanitizePayload(payload);
  const firstOptions = sanitizeOptions(jid, options);

  try {
    return await withTimeout(sendMessage(jid, firstPayload, firstOptions), 'sendMessage');
  } catch (err) {
    if (!shouldRetry(err)) throw err;

    // Retry 1: Try the original payload but strip mentions completely (in case mentions caused the error)
    if (firstPayload.mentions) {
      try {
        console.log('[safeSend retry strip mentions]', jid, err?.message || String(err));
        const noMentionsPayload = { ...firstPayload };
        delete noMentionsPayload.mentions;
        return await withTimeout(sendMessage(jid, noMentionsPayload, firstOptions), 'sendMessage retry strip mentions');
      } catch (retryErr) {
        err = retryErr; // update error for next retry
      }
    }

    // Retry 2: Plain text fallback
    const text = fallbackText(firstPayload) || ' ';
    try {
      console.log('[safeSend retry text fallback]', jid, err?.message || String(err));
      return await withTimeout(sendMessage(jid, { text }, {}), 'sendMessage retry text fallback');
    } catch (retryErr) {
      if (!shouldRetry(retryErr)) throw retryErr;
      console.log('[safeSend final retry]', jid, retryErr?.message || String(retryErr));
      return await withTimeout(sendMessage(jid, { text: text.slice(0, 3500) || ' ' }, {}), 'sendMessage final retry');
    }
  }
}

function installSafeSend(sock) {
  if (!sock || sock.__safeSendInstalled) return sock;

  const rawSendMessage = sock.sendMessage.bind(sock);
  sock.__rawSendMessage = rawSendMessage;
  sock.sendMessage = (jid, payload, options = {}) => safeSend(sock, jid, payload, options);
  sock.__safeSendInstalled = true;
  return sock;
}

module.exports = {
  installSafeSend,
  normalizeJid,
  normalizeMentions,
  safeSend,
  sanitizeOptions,
  sanitizePayload,
};
