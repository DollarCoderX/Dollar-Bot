// Central place for env var access
function required(name, fallback) {
  const v = process.env[name];
  if (v !== undefined && v !== '') return v;
  return fallback;
}

// Build a deduplicated GROQ key list from both GROQ_KEYS (comma-sep) and GROQ_API_KEY (single)
const _groqMulti = (process.env.GROQ_KEYS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const _groqSingle = (process.env.GROQ_API_KEY || '').trim();
if (_groqSingle && !_groqMulti.includes(_groqSingle)) {
  _groqMulti.push(_groqSingle);
}

module.exports = {
  GROQ_KEYS: _groqMulti,
  GROQ_TTS_KEY: required('GROQ_TTS_KEY', _groqSingle || (_groqMulti[0] || '')),

  GEMINI_API_KEY: required('GEMINI_API_KEY', ''),
  GEMINI_MODEL: required('GEMINI_MODEL', 'gemini-1.5-flash'),

  GOOGLE_API_KEY: required('GOOGLE_API_KEY', ''),
  SERPER_API_KEY: required('SERPER_API_KEY', ''),
  NEWS_API_KEY: required('NEWS_API_KEY', ''),
};
