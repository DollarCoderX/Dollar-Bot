'use strict';

/**
 * Build a WhatsApp-friendly ASCII/Unicode "box" where each item is rendered
 * on its own line prefixed with `│`.
 *
 * Example output:
 *  ╭─❏ ᴡʜᴀᴛsᴀᴘᴘ ❏\n │ 𝗔𝗡𝗧𝗜𝗘𝗗𝗜𝗧𝗜𝗢𝗧\n │ 𝗖𝗔𝗟𝗟\n ╰─────────────────\n
 * Notes:
 * - We intentionally use literal `\n` in the returned string so callers can
 *   keep the exact same pattern as `handler.js` menu captions.
 */
function boxLines(title, lines, footer = '─────────────────') {
  const safeTitle = title ? String(title) : '';
  const items = Array.isArray(lines) ? lines : (lines == null ? [] : [String(lines)]);

  // Ensure no accidental undefined
  const cleaned = items
    .filter(v => v !== undefined && v !== null)
    .map(v => String(v));

  // Each row must start with: " │ "
  const body = cleaned.map(v => ` │ ${v}`).join('\n');

  return ` ╭─❏ ${safeTitle} ❏\n${body}\n ╰${footer}`;
}

function boxSingle(title, text, footer = '─────────────────') {
  return boxLines(title, [text], footer);
}

module.exports = {
  boxLines,
  boxSingle,
};

