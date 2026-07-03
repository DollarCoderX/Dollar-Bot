// ─────────────────────────────────────────────────────────────────────────────
//  Robust bot-admin detection — works regardless of group addressing mode
// ─────────────────────────────────────────────────────────────────────────────
// Baileys 7.x groups can list participants using either phone-number JIDs
// (@s.whatsapp.net) or LIDs (@lid), depending on the group's `addressingMode`.
// `sock.user.id` is always the bot's own phone-number JID, so comparing it
// directly against `p.id` silently fails (returns "not admin") whenever the
// group uses LID addressing — even though the bot really is an admin.
// This helper checks every identifier we can get for both the bot and each
// participant (id / lid / phoneNumber) before deciding.

function normNum(jid) {
  return (jid || '').replace(/:.*@/, '@').split('@')[0];
}

function getBotIdentifiers(sock) {
  const ids = [
    sock?.user?.id,
    sock?.user?.lid,
    sock?.authState?.creds?.me?.id,
    sock?.authState?.creds?.me?.lid,
  ]
    .filter(Boolean)
    .map(normNum);
  return new Set(ids);
}

async function getBotGroupParticipant(sock, jid) {
  try {
    const meta = await sock.groupMetadata(jid);
    const botIds = getBotIdentifiers(sock);
    return (
      meta.participants.find(p => {
        const candidates = [p.id, p.lid, p.phoneNumber].filter(Boolean).map(normNum);
        return candidates.some(c => botIds.has(c));
      }) || null
    );
  } catch {
    return null;
  }
}

async function isBotGroupAdmin(sock, jid) {
  const p = await getBotGroupParticipant(sock, jid);
  return !!(p && (p.admin === 'admin' || p.admin === 'superadmin'));
}

async function isParticipantAdmin(sock, jid, participantJid) {
  try {
    const meta = await sock.groupMetadata(jid);
    const num = normNum(participantJid);
    return meta.participants.some(p => {
      const candidates = [p.id, p.lid, p.phoneNumber].filter(Boolean).map(normNum);
      return candidates.some(c => c === num) && (p.admin === 'admin' || p.admin === 'superadmin');
    });
  } catch {
    return false;
  }
}

module.exports = { isBotGroupAdmin, isParticipantAdmin, getBotGroupParticipant, normNum };
