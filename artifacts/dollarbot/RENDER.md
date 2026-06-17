# DollarBot V6 — Render environment variables guide

This bot is configured to read secrets from **environment variables** (Render Dashboard → Environment).

## 1) Files involved
- `src/env.js` — reads env vars and exposes them to the app
- `src/lib/pollinations.js` — uses `GROQ_KEYS` for Groq calls and `GROQ_TTS_KEY` for TTS
- `src/config.js` — still contains some keys (Google/Serper/News). Prefer moving them to env later if you want.

## 2) Required env vars for the changes we made
### A) Groq (LLM) — used by AI commands
Add:
- `GROQ_KEYS` = comma-separated Groq API keys

Example:
- `GROQ_KEYS=gsk_xxx1,gsk_xxx2`

### B) Groq TTS — used for `.tts` command (canopy male voice)
Add:
- `GROQ_TTS_KEY` = your Groq API key used for audio/speech

Example:
- `GROQ_TTS_KEY=gsk_xxx`

> Voice setting: the code uses `model: canopylabs/orpheus-v1-english` and `voice: "austin"` (male).
> If you want a different male voice, change `voice` in `src/lib/pollinations.js`.

## 3) Optional env vars (for Render persistent storage)
If you deploy with a persistent disk, also set:
- `AUTH_DIR` = mount path for WhatsApp auth session
  - Example: `/data/auth`
- `DATA_DIR` = mount path for bot data
  - Example: `/data/store`

Render mountPath is configured in `render.yaml`.

## 4) Render `render.yaml` notes
In `artifacts/dollarbot/render.yaml`, the service expects persistent disk mounted at `/var/data` (per the yaml).
If you use that mount, set:
- `AUTH_DIR=/var/data/auth_info_baileys`
- `DATA_DIR=/var/data/dollarbot_data`

OR update `render.yaml` to match your mount paths.

## 5) How to fill `.env` (if you use local dev)
We don’t read `.env` inside code; Render injects env vars.
For local tests, you can create a `.env` file and export it via your shell/launcher.

A template exists at:
- `/.env.example`

## 6) Quick checklist
1. Put `GROQ_KEYS` and `GROQ_TTS_KEY` into Render → Environment.
2. Restart the service.
3. Test:
   - `.ask hello` (should work via Groq or fallback to Pollinations)
   - `.tts hello` (should use Groq audio/speech with male voice "austin")

