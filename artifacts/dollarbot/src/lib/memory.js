'use strict';
/**
 * memory.js — Advanced persistent conversation memory
 * - Per-user, per-persona history stored in store.json
 * - Timestamps, message count, last active
 * - In-memory cache for speed, persisted to disk
 */

const store = require('./store');

const MAX_HISTORY = 20;
const CACHE = {};                // jid::persona → { messages, lastSaved }
const DIRTY  = new Set();        // keys pending write-back
let   flushTimer = null;

function getKey(jid, persona) {
  return `${jid}::${persona}`;
}

function storeKey(jid, persona) {
  return `mem_${jid.replace(/[^a-zA-Z0-9]/g, '_')}_${persona}`;
}

// ── Load from disk (lazy) ──────────────────────────────────────────────────
async function ensureLoaded(jid, persona) {
  const key = getKey(jid, persona);
  if (CACHE[key]) return;
  const saved = await store.get(storeKey(jid, persona));
  CACHE[key] = saved || { messages: [], totalCount: 0, lastActive: null };
}

// ── Flush dirty keys to disk ───────────────────────────────────────────────
async function flushDirty() {
  for (const key of [...DIRTY]) {
    const [jid, persona] = key.split('::');
    if (CACHE[key]) {
      await store.set(storeKey(jid, persona), CACHE[key]).catch(() => {});
    }
    DIRTY.delete(key);
  }
}

function scheduleFLush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushDirty();
  }, 5000); // write-back after 5s idle
}

// ── Public API ──────────────────────────────────────────────────────────────
async function getHistory(jid, persona) {
  await ensureLoaded(jid, persona);
  return CACHE[getKey(jid, persona)].messages || [];
}

async function addMessage(jid, persona, role, content) {
  await ensureLoaded(jid, persona);
  const key = getKey(jid, persona);
  const entry = CACHE[key];
  entry.messages.push({ role, content, ts: Date.now() });
  if (entry.messages.length > MAX_HISTORY)
    entry.messages = entry.messages.slice(entry.messages.length - MAX_HISTORY);
  entry.totalCount = (entry.totalCount || 0) + 1;
  entry.lastActive = Date.now();
  DIRTY.add(key);
  scheduleFLush();
}

async function clearHistory(jid, persona) {
  if (persona) {
    const key = getKey(jid, persona);
    CACHE[key] = { messages: [], totalCount: 0, lastActive: null };
    DIRTY.add(key);
  } else {
    for (const key of Object.keys(CACHE)) {
      if (key.startsWith(jid + '::')) {
        CACHE[key] = { messages: [], totalCount: 0, lastActive: null };
        DIRTY.add(key);
      }
    }
  }
  scheduleFLush();
}

async function clearAll() {
  for (const key of Object.keys(CACHE)) {
    CACHE[key] = { messages: [], totalCount: 0, lastActive: null };
    DIRTY.add(key);
  }
  scheduleFLush();
}

async function getStats(jid, persona) {
  await ensureLoaded(jid, persona);
  const entry = CACHE[getKey(jid, persona)];
  return {
    messages: entry.messages.length,
    totalCount: entry.totalCount || 0,
    lastActive: entry.lastActive ? new Date(entry.lastActive).toLocaleString() : 'Never',
  };
}

module.exports = { getHistory, addMessage, clearHistory, clearAll, getStats };
