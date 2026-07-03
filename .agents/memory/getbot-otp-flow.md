---
name: GetBot OTP registration flow
description: How the getbot self-service registration works — Brevo email OTP, pending state pattern, command limits, and what's real vs simulated.
---

# GetBot OTP Registration Flow

## The rule
getbot.js handles two separate user modes: non-owner self-registration (OTP flow) and owner admin sub-commands. They split at the top of the `getbot()` function on `isOwner`.

**Why:** Keeps owner management commands clean while giving regular users a guided conversational registration experience.

## Pending state pattern
- Key: `getbot_pending_{senderNum}` in store
- Value: `{ step: 'email'|'otp'|'method', email, otp, expiry, chatJid }`
- `expiry` = 15 min window; OTP itself expires at 10 min (checked against `otpSentAt`)
- `handleGetBotPending()` is called from `handleNonCommand()` in handler.js for every non-command message

## Brevo API
- Uses `process.env.BREVO_API_KEY` (stored as Replit Secret)
- Sender email: `uraincle@gmail.com`, sender name: `DollarBot`
- Endpoint: `POST https://api.brevo.com/v3/smtp/email`
- Uses global `fetch` (Node 24)

## Slot storage
- `botSessions` store key: `{ [phoneNum]: { number, email, name, assignedAt, plan, cmdCount } }`
- `getbotUsers` store key mirrors for fast lookup: `{ [phoneNum]: { email, name, cmdCount, registeredAt } }`
- Free plan = 100 commands (`FREE_CMD_LIMIT`), tracked via `slot.cmdCount` incremented by `checkGetBotLimit()`

## Real per-slot connections (`lib/subbot.js`)
- QR and pairing codes are now genuine — `deliverQR`/`deliverPairCode` in getbot.js call `startSubBot(number, mode, callbacks)` which spins up its own `makeWASocket` + `useMultiFileAuthState` under `artifacts/dollarbot/subbot_auth/<number>/`, mirroring index.js's main-bot connection logic (reconnect backoff, loggedOut wipes auth dir, pairing code requested via `sock.requestPairingCode` a few seconds after socket creation).
- Real WhatsApp display name/number is captured only in the `connection === 'open'` handler via `sock.user?.name || sock.user?.notify || sock.user?.verifiedName` and `sock.user.id` — never trust the number the user typed until the socket actually connects.
- Each sub-bot's own `messages.upsert` is routed through the shared `handleMessage` from `handler.js`, so registered numbers get the full command set on their own real connection, not the owner's.
- `stopSubBot(number)` logs out, ends the socket, and deletes its auth folder — this is what `.getbot clear` calls per-slot before wiping `botSessions`/`getbotUsers`.

## Number resolution gotcha
- `senderNum(sender)` alone is unreliable for registering the "real" number because Baileys v7+ can hand you a `@lid` in `sender` for group contexts. Use `resolveRealNumber(dmJid, sender)` (prefers the DM `remoteJid`, which is always the true phone-number JID) anywhere a number gets *stored* as a slot's identity — not just internal pending-state keys.

## How to apply
- Any future change to registration must update both `botSessions` and `getbotUsers` store keys in sync
- `.getbotcancel` clears the pending key; always call `clearPending()` after completing or cancelling flow
- `.upgrade <number>` (owner) and `.botupgrade` (any user, sends owner vcard) live in `owner.js`; `.upgrade` calls `setSlotPlan` exported from `getbot.js`
