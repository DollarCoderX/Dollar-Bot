const MAX_HISTORY = 12;

const memories = {};

function getKey(jid, persona) {
  return `${jid}::${persona}`;
}

function getHistory(jid, persona) {
  const key = getKey(jid, persona);
  return memories[key] || [];
}

function addMessage(jid, persona, role, content) {
  const key = getKey(jid, persona);
  if (!memories[key]) memories[key] = [];
  memories[key].push({ role, content });
  if (memories[key].length > MAX_HISTORY) {
    memories[key] = memories[key].slice(memories[key].length - MAX_HISTORY);
  }
}

function clearHistory(jid, persona) {
  if (persona) {
    delete memories[getKey(jid, persona)];
  } else {
    Object.keys(memories).forEach(k => { if (k.startsWith(jid + '::')) delete memories[k]; });
  }
}

function clearAll() {
  Object.keys(memories).forEach(k => delete memories[k]);
}

module.exports = { getHistory, addMessage, clearHistory, clearAll };
