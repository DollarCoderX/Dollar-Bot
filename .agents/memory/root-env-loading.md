---
name: Root .env not auto-loaded in dollarbot
description: Why GROQ_KEYS/env vars silently failed to load and how it was fixed for Replit.
---

`artifacts/dollarbot` has no `dotenv` dependency and never called anything to load a `.env` file. The repo keeps a single `.env` at the workspace root (not inside `artifacts/dollarbot/`), so `process.env.GROQ_API_KEY` etc. were always empty at runtime — the bot printed "No GROQ_KEYS provided in env" even though the root `.env` had valid keys.

**Why:** Node does not read `.env` files automatically; someone needs to either use a package like `dotenv` or pass Node's built-in `--env-file` flag. Nothing in this project did either.

**How to apply:** The dev/start scripts in `artifacts/dollarbot/package.json` now run `node --env-file-if-exists=../../.env src/index.js` (path is relative to the package's cwd, since pnpm runs scripts with cwd = package dir). If you add more workspace packages that need root `.env` values, apply the same pattern rather than adding a `dotenv` dependency. Also note: the root `.env` was tracked in git (not in `.gitignore`) — it's now ignored going forward, but existing git history still has the old key values, so consider rotating them if this repo is ever made public.
