const fetch = require('node-fetch');
const config = require('../config');
const memory = require('./memory');
const env = require('../env');

// Groq API keys rotation (from Render env)
const groqKeys = env.GROQ_KEYS || [];

// Safety: if env not provided, keep old behavior? (disabled)
if (!groqKeys.length) {
  console.warn('[AI] No GROQ_KEYS provided in env. Groq calls will fail and fallback will be used.');
}

let currentKeyIndex = 0;


function getNextGroqKey() {
  const key = groqKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % groqKeys.length;
  return key;
}

// ── Core text generation (Groq → Pollinations → Deepseek → HF → Mistral → Together) ──
async function textGenerate(messages, model = 'openai') {
  // Helper: normalize OpenAI-like responses
  function extractContent(data) {
    const c = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;
    if (typeof c === 'string') return c.trim();
    return '';
  }

  async function tryProvider(name, fn) {
    try {
      const result = await fn();
      if (result) return result;
      console.log(`[AI] ${name} returned empty output`);
    } catch (e) {
      const msg = e?.message || String(e);
      console.log(`[AI] ${name} failed: ${msg}`);
    }
    return '';
  }

  // 1) Groq (rotation)
  if (groqKeys.length) {
    let groqLastErr = '';
    for (let i = 0; i < groqKeys.length; i++) {
      const apiKey = getNextGroqKey();
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages,
            max_tokens: 700,
          }),
          timeout: 45000,
        });
        if (!res.ok) {
          groqLastErr = `HTTP ${res.status}: ${await res.text().catch(()=>'')}`;
          continue;
        }
        const data = await res.json();
        const content = extractContent(data);
        if (content) return content;
      } catch (e) {
        groqLastErr = e?.message || String(e);
      }
    }
    console.log(`[AI] Groq failed (${groqLastErr}).`);
  } else {
    console.log(`[AI] No GROQ_KEYS in env. Skipping Groq.`);
  }

  // 2) Pollinations fallback (no key)
  const pollinationsRes = await tryProvider('Pollinations', async () => {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: model || 'openai',
        seed: Math.floor(Math.random() * 99999),
        private: true,
      }),
      timeout: 45000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    return text || '';
  });
  if (pollinationsRes) return pollinationsRes;

  // 3) Deepseek (no key needed per your note, but API allows anonymous only for some tiers)
  const deepseek = await tryProvider('Deepseek', async () => {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 700,
      }),
      timeout: 45000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return extractContent(data);
  });
  if (deepseek) return deepseek;

  // 4) HuggingFace public text generation (gpt2)
  // IMPORTANT: Hugging Face public inference often needs an API token for reliability.
  // This tries without a token as requested; it may still rate-limit.
  const hf = await tryProvider('HF(gpt2)', async () => {
    const res = await fetch('https://api-inference.huggingface.co/models/gpt2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:',
        parameters: { max_new_tokens: 200, do_sample: true, temperature: 0.8 },
      }),
      timeout: 45000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // HF gpt2 returns an array with { generated_text }
    const text = Array.isArray(data) ? (data[0]?.generated_text || '') : (data?.generated_text || '');
    return String(text).trim();
  });
  if (hf) return hf;

  // 5) Mistral
  // Mistral API normally requires an Authorization header.
  // This fallback attempts anonymous use; if it fails, it will continue.
  const mistral = await tryProvider('Mistral', async () => {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages,
        max_tokens: 700,
        temperature: 0.7,
      }),
      timeout: 45000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return extractContent(data);
  });
  if (mistral) return mistral;

  // 6) Together
  const together = await tryProvider('Together', async () => {
    const res = await fetch('https://api.together.xyz/v1/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'togethercomputer/llama-3-70b-instruct',
        prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:',
        max_tokens: 300,
        temperature: 0.7,
      }),
      timeout: 45000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Together completions return { choices:[{ text }] }
    return extractContent(data);
  });
  if (together) return together;

  throw new Error("Nahh i didn't get that request, try later");
}

// ── AI Personas ───────────────────────────────────────────────────────────
async function cortex(jid, question) {
  const history = await memory.getHistory(jid, 'cortex');
  const messages = [
    { role: 'system', content: config.cortexSystemPrompt },
    ...history,
    { role: 'user', content: question },
  ];
  const reply = await textGenerate(messages);
  await memory.addMessage(jid, 'cortex', 'user', question);
  await memory.addMessage(jid, 'cortex', 'assistant', reply);
  return reply;
}

// Shared driver for all conversational personas (Mera, Brie, Jarvis, Alan,
// Kerrick, Beejay). Appends the internal command-bridge instructions to the
// persona's system prompt so callers can detect a [RUN:name] marker in the
// raw reply and trigger the matching real bot command. Returns the RAW
// (unstripped) reply — callers are responsible for stripping the marker
// before displaying text and for running the bridged command.
async function runPersona(jid, question, personaKey, systemPrompt) {
  const { buildBridgeInstructions } = require('./aiCommandBridge');
  const history = await memory.getHistory(jid, personaKey);
  const messages = [
    { role: 'system', content: systemPrompt + buildBridgeInstructions() },
    ...history,
    { role: 'user', content: question },
  ];
  const reply = await textGenerate(messages);
  await memory.addMessage(jid, personaKey, 'user', question);
  await memory.addMessage(jid, personaKey, 'assistant', reply);
  return reply;
}

async function mera(jid, question) {
  return runPersona(jid, question, 'mera', config.meraSystemPrompt);
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

function getImageUrl(prompt, opts = {}) {
  const { width = 1024, height = 1024, model = 'flux' } = opts;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&enhance=true&model=${model}&seed=${Math.floor(Math.random() * 999999)}`;
}

// Turn a short/lazy prompt ("a cat") into a detailed, well-composed prompt
// before handing it to the image model. Falls back to the raw prompt if the
// text model is unavailable — image generation should never hard-fail here.
async function enhanceImagePrompt(prompt) {
  try {
    const enhanced = await textGenerate([
      {
        role: 'system',
        content:
          'You rewrite short image prompts into a single, richly detailed prompt for an AI image generator. ' +
          'Add subject detail, composition, lighting, style, and quality descriptors (e.g. "highly detailed, sharp focus, cinematic lighting, 8k"). ' +
          'Output ONLY the rewritten prompt on one line — no quotes, no explanation, no markdown.',
      },
      { role: 'user', content: prompt },
    ]);
    const clean = (enhanced || '').replace(/^["']|["']$/g, '').split('\n')[0].trim();
    return clean && clean.length > 5 ? clean : prompt;
  } catch (_) {
    return prompt;
  }
}

// ── V7 AI Personas ────────────────────────────────────────────────────────

async function brie(jid, question) {
  return runPersona(jid, question, 'brie', config.brieSystemPrompt);
}

async function jarvis(jid, question) {
  return runPersona(jid, question, 'jarvis', config.jarvisSystemPrompt);
}

async function alan(jid, question) {
  return runPersona(jid, question, 'alan', config.alanSystemPrompt);
}

async function kerrick(jid, question) {
  return runPersona(jid, question, 'kerrick', config.kerrickSystemPrompt);
}

async function beejay(jid, question) {
  return runPersona(jid, question, 'beejay', config.beejaySystemPrompt);
}

// ── Auto-Reply AI (human-like, concise, WhatsApp-formatted) ───────────────
async function autoReplyAI(jid, text) {
  const history = await memory.getHistory(jid, 'autoreply');
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

  await memory.addMessage(jid, 'autoreply', 'user', text);
  await memory.addMessage(jid, 'autoreply', 'assistant', responseText);
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

  // Primary: Groq Orpheus TTS — rotate through ALL available keys, not just
  // the first one. A single exhausted/rate-limited key used to make TTS
  // "sometimes work, sometimes not"; now we retry with every key we have.
  const ttsKeys = [env.GROQ_TTS_KEY, ...groqKeys].filter(Boolean);
  let groqOk = false;
  for (const key of ttsKeys) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
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
          return { buffer, mime: 'audio/wav' };
        }
      } else if ([401, 429].includes(response.status)) {
        // Bad/rate-limited key — try the next one
        continue;
      } else {
        const errText = await response.text().catch(() => '');
        console.log('[TTS] Groq Orpheus failed HTTP:', response.status, errText);
        break; // non-key-related error, no point retrying other keys
      }
    } catch (err) {
      console.log('[TTS] Groq Orpheus failed:', err.message);
    }
  }
  if (!groqOk) console.log('[TTS] Falling back — Groq Orpheus unavailable on all keys.');

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
  getWeather, translate, getImageUrl, enhanceImagePrompt, tts,
  textGenerate, autoReplyAI, searchWithAI,
  brie, jarvis, alan, kerrick, beejay,
};
