---
name: AI persona command bridge
description: How DollarBot AI personas (Cortex/Mera/Brie/Jarvis/Alan/Kerrick/Beejay) can secretly trigger real bot commands mid-conversation.
---

`src/lib/aiCommandBridge.js` lets conversational AI personas run a real bot command when the user asks for it in plain chat (e.g. "show me the menu" while talking to Cortex actually runs `.menu`).

Mechanism: each persona's system prompt gets `buildBridgeInstructions()` appended, which tells the model to prefix its reply with `[RUN:<name>]` when the user clearly wants one of a small whitelisted set of commands (`menu`, `ping`, `alive`, `stats`, `owner`, `jid`). The caller (in `commands/ai.js` / `commands/v7ai.js`) calls `parseBridgeResponse(raw)` to strip the marker and get `{ cleanText, command }`, displays `cleanText`, and if `command` is set calls `runBridgedCommand(sock, msg, jid, command)`.

`runBridgedCommand` lazily `require('../handler')` and `require('../commands/user')` inside the function body (not at module top) — handler.js requires ai.js at the top of the file, so a top-level require of handler.js from ai.js/aiCommandBridge.js would deadlock on the circular require.

**Why:** the user wanted AI personas to be able to "secretly" run commands rather than just describe them, without building a full command-registry refactor of the giant handler.js switch statement.

**How to apply:** to make a new command AI-triggerable, add it to `RUNNABLE_COMMANDS` in aiCommandBridge.js and add a case in `runBridgedCommand`'s switch — reuse the exact function signature the real command handler expects (some take `(sock, msg)`, others `(sock, msg, args, jid)` — check before wiring).
