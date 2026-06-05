# DollarBot V5

A powerful WhatsApp bot with AI chat, group management, games, fun commands, and utilities. Built with Baileys and Pollinations AI.

## Run & Operate

- `pnpm --filter @workspace/dollarbot run dev` — start the bot (via "DollarBot V5" workflow)
- On first run, choose login method in the terminal: QR code or pairing code
- Owner number: +14378898269

## Stack

- pnpm workspaces, Node.js 24, JavaScript
- WhatsApp: @whiskeysockets/baileys
- AI: Pollinations + Groq (text, image, vision)
- Session storage: `artifacts/dollarbot/auth_info_baileys/`
- Settings storage: `artifacts/dollarbot/data/store.json`

## Where things live

- `artifacts/dollarbot/src/index.js` — main entry, connection & auth logic
- `artifacts/dollarbot/src/handler.js` — message router & menu (fixed group handling)
- `artifacts/dollarbot/src/config.js` — owner info, AI system prompts
- `artifacts/dollarbot/src/commands/` — one file per command category
- `artifacts/dollarbot/src/commands/ai.js` — AI commands incl. .summary, .vision, .manhwa
- `artifacts/dollarbot/src/commands/bypass.js` — owner bypass group controls
- `artifacts/dollarbot/src/commands/morefun.js` — 50+ new commands
- `artifacts/dollarbot/src/lib/pollinations.js` — Pollinations + Groq AI wrapper
- `artifacts/dollarbot/src/lib/store.js` — persistent key/value store

## Commands

- **User:** .ping .alive .owner .stats .info .details .time .jid .runtime .uptime
- **Owner only:** .say .sendto .react .delete .autoreply .vv .broadcast .shutdown
- **AI:** .cortex .mera .ask .codeai .roast .complimentai .weather .imagine .translate .story .poem .motivate .summarize .clear
- **AI New:** .summary (group chat summary via Groq) .vision (image analysis) .manhwa (manga/manhwa search)
- **Fun:** .joke .dadjoke .fact .advice .compliment .8ball .truth .dare .reverse .hotcheck .smartcheck .brainlevel .coolcheck .lovecheck
- **Fun New:** .wouldyourather .neverhavei .paranoia .sus .iq .cringe .simp .rizzmeter .slay .bully .thisorthat .bodycount .conspiracy .superpower .typingtest .pickup .prank
- **AI Extras:** .debate .quiz .bedtime .eli5 .acronym .haiku .caption .mythology .element .zodiac2 .numerology .dreaminterp .flag .timezone .bio
- **Utility:** .calculate .genpass .encode .decode .qr .tinyurl .pingweb .tts
- **Utility New:** .roman .palindrome .bmi .tip .worldclock .daysuntil .wordcount .lorem .mocktext .shuffle .age
- **Games:** .coin .dice .rps .math .guess .slot .tictactoe
- **Games New:** .trivia .hangman .hguess .scramble .highlow .hl .spinwheel .lottery .roulette
- **Group:** .kick .promote .demote .mute .unmute .tagall .everyone .hidetag .grouplink .groupinfo .antilink .welcome
- **Bypass (Owner):** .bypass admin/silence/unsilence/nosticker/nosave/status

## Architecture decisions

- JavaScript (not TypeScript) for the bot — avoids Baileys compilation complexity
- Pollinations AI for zero-cost AI — text generation (Cortex & Mera) + image generation
- Groq API for fast LLM inference + vision model (llama-4-scout) + TTS (Orpheus)
- `useMultiFileAuthState` from Baileys — session saved to disk so login persists
- Pairing code + QR code both supported at startup
- Game state is in-memory (per chat JID), settings persisted to `data/store.json`
- Auto-reply is strictly DM-only — never triggers in group chats
- Group prefix detection: only messages starting with `.` are processed as commands in groups
- Bypass state persisted in store.json per group JID

## Group Handler Fix

- **Before:** `handleNonCommand` had an early `if (isGroup) return` that silently killed anti-link
- **After:** Anti-link, trivia, scramble, and math checks all work in groups; auto-reply is explicitly DM-only
- **Bypass intercept** runs before any command processing so silenced users and blocked stickers are caught first

## Product

DollarBot V5 is a full-featured public WhatsApp bot that runs 24/7. Users interact with it by sending commands prefixed with `.` in any chat or group where the bot is active.

## User preferences

- Owner: Dollar, Canada 🇨🇦, +14378898269
- Prefix: `.`
- Mode: Public
- Engine branding: Cortex AI + Mera AI (Powered by Pollinations)
- Version: 5.0.0

## Gotchas

- Run `pnpm approve-builds` if protobufjs build is blocked after a fresh install
- `auth_info_baileys/` holds session — delete this folder to log out and re-scan
- Bot sends an online notification to owner's WhatsApp every time it (re)connects
- Auto-reconnect is built in — it will automatically reconnect if disconnected
- `.summary` only works in groups and requires some messages to be cached after bot connects
- `.vision` requires replying to an image or sending an image with `.vision` as caption
- Bypass commands only work inside group chats

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
