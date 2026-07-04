---
name: Baileys call handling limits
description: What is and isn't possible with WhatsApp calls via the Baileys library — relevant before promising any "voice call AI" feature.
---

Baileys (checked at 7.0.0-rc13) only exposes the call *signaling* layer, not the media layer:
- `call` event fires with statuses like `offer`, `ringing`, `accept`, `reject`, `terminate`.
- `sock.rejectCall(callId, callFrom)` is the only call-control API provided.
- There is no `answerCall`/`offerCall`/`relayCall`, and no WebRTC/VoIP audio stream access — Baileys does not implement the media transport for calls at all.

**Why:** a user asked for an AI persona ("Luna") that answers WhatsApp voice calls and talks back with synthesized speech. That requires intercepting/injecting the live call audio stream, which Baileys structurally does not support (it's a messaging-layer library, not a VoIP client).

**How to apply:** when a feature request implies live call audio (answer/talk during a WhatsApp call), tell the user this is infeasible via Baileys rather than building a fake/partial version. The best real substitute is: listen for the `call` event, auto-reject with `rejectCall`, and send an explanatory text message to the caller instead.
