const fetch = require('node-fetch');
const config = require('../config');
const memory = require('./memory');

// Groq API keys rotation
const groqKeys = [
  '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', // Ejiro (api2)
  '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'  // Blessing (api3)
];
let currentKeyIndex = 0;

function getNextGroqKey() {
  const key = groqKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % groqKeys.length;
  return key;
}

// ── Core text generation (Groq → Pollinations fallback) ───────────────────
async function textGenerate(messages, model = 'openai') {
  let groqError;

  // Try each API key in rotation
  for (let i = 0; i < groqKeys.length; i++) {
    const apiKey = getNextGroqKey();
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ messages, model: 'llama-3.1-8b-instant' }),
        timeout: 45000,
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content.trim();
      } else {
        const errText = await res.text();
        groqError = `Groq HTTP ${res.status}: ${errText}`;
      }
    } catch (e) {
      groqError = e.message;
    }
  }

  // Fallback to Pollinations
  console.log(`[AI] Groq failed (${groqError}). Using Pollinations fallback...`);
  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model: 'openai',
      seed: Math.floor(Math.random() * 99999),
      private: true,
    }),
    timeout: 45000,
  });
  if (!res.ok) throw new Error('All AI services failed. Please try again.');
  return (await res.text()).trim();
}

// ── AI Personas ───────────────────────────────────────────────────────────
async function cortex(jid, question) {
  const history = memory.getHistory(jid, 'cortex');
  const messages = [
    { role: 'system', content: config.cortexSystemPrompt },
    ...history,
    { role: 'user', content: question },
  ];
  const reply = await textGenerate(messages);
  memory.addMessage(jid, 'cortex', 'user', question);
  memory.addMessage(jid, 'cortex', 'assistant', reply);
  return reply;
}

async function mera(jid, question) {
  const history = memory.getHistory(jid, 'mera');
  const messages = [
    { role: 'system', content: config.meraSystemPrompt },
    ...history,
    { role: 'user', content: question },
  ];
  const reply = await textGenerate(messages);
  memory.addMessage(jid, 'mera', 'user', question);
  memory.addMessage(jid, 'mera', 'assistant', reply);
  return reply;
}

async function codeAI(question) {
  return textGenerate([
    { role: 'system', content: config.codeAISystemPrompt },
    { role: 'user', content: question },
  ]);
}

async function roast(name) {
  return textGenerate([
    { role: 'system', content: 'You are a savage comedian. Write brutal, funny roasts in 2-3 sentences. Use *bold* for punchlines. WhatsApp formatting only — no tables or HTML.' },
    { role: 'user', content: `Roast "${name}" savagely and hilariously.` },
  ]);
}

async function complimentAI(name) {
  return textGenerate([
    { role: 'system', content: 'You give heartfelt, creative, personalized compliments. Use *bold* for key phrases. WhatsApp formatting only — no tables or HTML.' },
    { role: 'user', content: `Give "${name}" a beautiful and unique compliment.` },
  ]);
}

async function getWeather(city) {
  const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 12000 });
  if (!res.ok) throw new Error('City not found or weather service unavailable');
  return (await res.text()).trim();
}

async function translate(text) {
  return textGenerate([
    {
      role: 'system',
      content: 'You are a professional translator. Detect the language and translate to English. If already English, translate to French. Reply using WhatsApp formatting:\n*Detected:* [language]\n*Translated:* [result]',
    },
    { role: 'user', content: text },
  ]);
}

function getImageUrl(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 99999)}`;
}

// ── Auto-Reply AI (human-like, concise, WhatsApp-formatted) ───────────────
async function autoReplyAI(jid, text) {
  const history = memory.getHistory(jid, 'autoreply');
  const messages = [
    { role: 'system', content: config.autoReplySystemPrompt },
    ...history.slice(-10),
    { role: 'user', content: text },
  ];

  let responseText = '';
  try {
    responseText = await textGenerate(messages);
  } catch (err) {
    console.log('[AutoReply] AI failed, using fallback');
    responseText = 'Yeah, for sure!';
  }

  memory.addMessage(jid, 'autoreply', 'user', text);
  memory.addMessage(jid, 'autoreply', 'assistant', responseText);
  return responseText;
}

// ── Search with AI fallback ───────────────────────────────────────────────
async function searchWithAI(query) {
  return textGenerate([
    {
      role: 'system',
      content: 'You are a knowledgeable search assistant. Answer the query with accurate, up-to-date information. Format using WhatsApp markdown: *bold* for key facts, numbered lists for multiple points. Keep it concise and clear. No tables, no HTML, no # headers.',
    },
    { role: 'user', content: `Search query: ${query}` },
  ]);
}

// ── TTS (Text-to-Speech) ──────────────────────────────────────────────────
// Primary: Groq Orpheus TTS (using Ejiro API key and austin voice)
// Fallback 1: ResponsiveVoice open endpoint
// Fallback 2: Google Translate TTS
async function tts(text) {
  const clean = text.slice(0, 300).replace(/[*_~`]/g, ''); // strip WA markdown

  // Primary: Groq Orpheus TTS
  try {
    const ejiroKey = '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';
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ejiroKey}`,
      },
      body: JSON.stringify({
        model: 'canopylabs/orpheus-v1-english',
        input: clean.slice(0, 200),
        voice: 'austin',
        response_format: 'wav',
      }),
      timeout: 25000,
    });

    if (response.ok) {
      const buffer = await response.buffer();
      if (buffer.length > 500) {
        return { buffer, mime: 'audio/mp4' };
      }
    } else {
      const errText = await response.text();
      console.log('[TTS] Groq Orpheus failed HTTP:', response.status, errText);
    }
  } catch (err) {
    console.log('[TTS] Groq Orpheus failed:', err.message);
  }

  // Fallback 1: ResponsiveVoice (free, no key, reliable)
  try {
    const encoded = encodeURIComponent(clean);
    const url = `https://responsivevoice.org/responsivevoice/getvoice.php?tl=en-US&t=${encoded}&sv=g1&vn=&pitch=0.5&rate=0.5&vol=1&f=8khz_8bit_mono&c=ogg`;
    const res = await fetch(url, { timeout: 25000 });
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('audio') || ct.includes('ogg') || ct.includes('octet')) {
        const buffer = await res.buffer();
        if (buffer.length > 1000) return { buffer, mime: 'audio/ogg; codecs=opus' };
      }
    }
  } catch (err) {
    console.log('[TTS] ResponsiveVoice failed:', err.message);
  }

  // Fallback: Google Translate TTS (works for short text)
  try {
    const encoded2 = encodeURIComponent(clean.slice(0, 200));
    const url2 = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded2}&tl=en&client=tw-ob&total=1&idx=0&textlen=${clean.length}`;
    const res2 = await fetch(url2, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    });
    if (res2.ok) {
      const buffer = await res2.buffer();
      if (buffer.length > 500) return { buffer, mime: 'audio/mpeg' };
    }
  } catch (err) {
    console.log('[TTS] Google TTS failed:', err.message);
  }

  // Last resort: Pollinations TTS endpoint
  try {
    const encoded3 = encodeURIComponent(clean.slice(0, 200));
    const res3 = await fetch(`https://audio.api.speechify.com/generateAudioFiles?audioFormat=mp3&language=en-US&text=${encoded3}&voice=george`, {
      timeout: 20000,
    });
    if (res3.ok) {
      const buffer = await res3.buffer();
      if (buffer.length > 500) return { buffer, mime: 'audio/mpeg' };
    }
  } catch (err) {
    console.log('[TTS] Speechify failed:', err.message);
  }

  throw new Error('All TTS services are currently unavailable. Please try again later.');
}

module.exports = {
  cortex, mera, codeAI, roast, complimentAI,
  getWeather, translate, getImageUrl, tts,
  textGenerate, autoReplyAI, searchWithAI,
};
