# DollarBot V5

A powerful WhatsApp bot with AI chat, group management, games, fun commands, and utilities. Built with Baileys and Pollinations AI.

## Run & Operate

- `pnpm --filter @workspace/dollarbot run dev` — start the bot (via "DollarBot V5" workflow)
- On first run, choose login method in the terminal: QR code or pairing code
- Owner number: +14378898269

## Stack

- pnpm workspaces, Node.js 24, JavaScript
- WhatsApp: @whiskeysockets/baileys
- AI: Pollinations (text + image generation)
- Session storage: `artifacts/dollarbot/auth_info_baileys/`
- Settings storage: `artifacts/dollarbot/data/store.json`

## Where things live

- `artifacts/dollarbot/src/index.js` — main entry, connection & auth logic
- `artifacts/dollarbot/src/handler.js` — message router & menu
- `artifacts/dollarbot/src/config.js` — owner info, AI system prompts
- `artifacts/dollarbot/src/commands/` — one file per command category
- `artifacts/dollarbot/src/lib/pollinations.js` — Pollinations AI wrapper
- `artifacts/dollarbot/src/lib/store.js` — persistent key/value store

## Commands

- **User:** .ping .alive .owner .stats .info .details .time .jid .runtime .uptime
- **Owner only:** .say .sendto .react .delete .autoreply .vv .broadcast .shutdown
- **AI:** .cortex .mera .codeai .roast .complimentai .weather .imagine .translate
- **Fun:** .joke .dadjoke .fact .advice .compliment .8ball .truth .dare .reverse .hotcheck .smartcheck .brainlevel .coolcheck .lovecheck
- **Utility:** .calculate .genpass .encode .decode .qr .tinyurl .pingweb
- **Games:** .coin .dice .rps .math .guess .slot .tictactoe
- **Group:** .kick .promote .demote .mute .unmute .tagall .everyone .hidetag .grouplink .groupinfo .antilink .welcome

## Architecture decisions

- JavaScript (not TypeScript) for the bot — avoids Baileys compilation complexity
- Pollinations AI for zero-cost AI — text generation (Cortex & Mera) + image generation
- `useMultiFileAuthState` from Baileys — session saved to disk so login persists
- Pairing code + QR code both supported at startup
- Game state is in-memory (per chat JID), settings persisted to `data/store.json`

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

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
