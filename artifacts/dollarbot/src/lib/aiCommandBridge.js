'use strict';

// Allows AI personas (Cortex, Mera, Brie, Jarvis, Alan, Kerrick, Beejay) to
// secretly trigger real bot commands when the user asks for them inside a
// normal conversation — e.g. "show me the menu" while chatting with Cortex
// actually runs `.menu` instead of Cortex just describing what a menu is.
//
// How it works: the persona's system prompt instructs the model to prefix
// its reply with a hidden marker like [RUN:menu] when (and only when) the
// user is clearly asking to see/run that feature. We strip the marker before
// showing the reply, and separately invoke the real command handler.

const RUNNABLE_COMMANDS = {
  menu: { describe: 'shows the full command menu' },
  ping: { describe: 'checks bot latency' },
  alive: { describe: 'shows bot alive/status message' },
  stats: { describe: 'shows bot stats' },
  owner: { describe: "shows the bot owner's contact info" },
  jid: { describe: 'shows the chat JID' },
};

const MARKER_RE = /^\s*\[RUN:([a-z0-9]+)\]\s*/i;

function buildBridgeInstructions() {
  const list = Object.entries(RUNNABLE_COMMANDS)
    .map(([name, { describe }]) => `- ${name}: ${describe}`)
    .join('\n');
  return `\n\n[INTERNAL COMMAND BRIDGE]
You are wired into a WhatsApp bot and can trigger a small set of real bot commands on the user's behalf when they clearly ask for one of them in conversation (not just mentioning the word). Available commands:
${list}
If — and only if — the user is clearly asking you to run/show one of these, begin your reply with the exact token [RUN:<name>] (no space after, lowercase, one of the names above) followed by a short, natural one-line reply acknowledging it (e.g. "Sure, pulling that up for you now."). Never use this token for anything else, never explain the token, and never use it speculatively.`;
}

// Parses raw model output for the [RUN:name] marker. Returns
// { cleanText, command } where command is null if no valid marker found.
function parseBridgeResponse(raw) {
  const match = raw.match(MARKER_RE);
  if (!match) return { cleanText: raw, command: null };
  const name = match[1].toLowerCase();
  const cleanText = raw.replace(MARKER_RE, '').trim();
  if (!RUNNABLE_COMMANDS[name]) return { cleanText, command: null };
  return { cleanText, command: name };
}

// Actually executes the bridged command. Requires handler.js lazily to
// avoid a circular-require deadlock (handler.js requires the ai commands
// module at the top of the file).
async function runBridgedCommand(sock, msg, jid, name) {
  try {
    const handler = require('../handler');
    switch (name) {
      case 'menu':
        return await handler.sendMenu(sock, jid, 0, msg, null);
      case 'ping':
      case 'alive':
      case 'stats':
      case 'owner': {
        const userCommands = require('../commands/user');
        if (typeof userCommands[name] === 'function') {
          return await userCommands[name](sock, msg);
        }
        break;
      }
      case 'jid': {
        const userCommands = require('../commands/user');
        return await userCommands.jid(sock, msg, msg.key.participant || jid);
      }
    }
  } catch (e) {
    console.error('[AI Command Bridge]', name, e.message);
  }
}

module.exports = { buildBridgeInstructions, parseBridgeResponse, runBridgedCommand };
