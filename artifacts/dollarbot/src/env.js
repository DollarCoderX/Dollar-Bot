// Central place for env var access
// NOTE: avoids reading .env files at runtime; the hosting platform (Render) should
// inject environment variables.

function required(name, fallback) {
  const v = process.env[name];
  if (v !== undefined && v !== '') return v;
  return fallback;
}

module.exports = {
  // AI / LLM
  GROQ_KEYS: (process.env.GROQ_KEYS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  // Google Gemini (optional)
  GEMINI_API_KEY: required('GEMINI_API_KEY', ''),
  GEMINI_MODEL: required('GEMINI_MODEL', 'gemini-1.5-flash'),

  // Search APIs
  GOOGLE_API_KEY: required('GOOGLE_API_KEY', ''),
  SERPER_API_KEY: required('SERPER_API_KEY', ''),
  NEWS_API_KEY: required('NEWS_API_KEY', ''),

  // Groq TTS (optional)
  GROQ_TTS_KEY: required('GROQ_TTS_KEY', ''),
};


