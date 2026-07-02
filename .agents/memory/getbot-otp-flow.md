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

## What's simulated vs real
- QR code: generates a QRCode PNG from a URL string (not a real WhatsApp Web session QR) — see `deliverQR()`
- Pair code: tries `sock.requestPairingCode(number)` first; falls back to a random alphanumeric code — real multi-instance requires separate Baileys sockets per user (follow-up task)

## How to apply
- Any future change to registration must update both `botSessions` and `getbotUsers` store keys in sync
- `.getbotcancel` clears the pending key; always call `clearPending()` after completing or cancelling flow
