const fetch = require('node-fetch');
const config = require('../config');

async function textGenerate(prompt, systemPrompt, model = 'openai') {
  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model,
        seed: Math.floor(Math.random() * 10000),
        private: true,
      }),
      timeout: 30000,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return text.trim();
  } catch (err) {
    throw new Error(`AI Error: ${err.message}`);
  }
}

async function cortex(question) {
  return textGenerate(question, config.cortexSystemPrompt, 'openai');
}

async function mera(question) {
  return textGenerate(question, config.meraSystemPrompt, 'openai');
}

async function codeAI(question) {
  return textGenerate(question, config.codeAISystemPrompt, 'openai');
}

async function roast(name) {
  const prompt = `Roast "${name}" in a savage, funny, creative way. Keep it under 3 sentences. Make it hilarious but not truly harmful.`;
  return textGenerate(prompt, 'You are a savage comedian who roasts people hilariously.', 'openai');
}

async function complimentAI(name) {
  const prompt = `Give "${name}" a heartfelt, creative, and unique compliment. Make it personal and genuine.`;
  return textGenerate(prompt, 'You are a kind, creative person who gives beautiful compliments.', 'openai');
}

async function getWeather(city) {
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 10000 });
    if (!response.ok) throw new Error('City not found');
    const text = await response.text();
    return text.trim();
  } catch (err) {
    throw new Error(`Weather Error: ${err.message}`);
  }
}

async function translate(text) {
  const prompt = `Detect the language of this text and translate it to English. If it's already English, translate to Spanish. Format: "Detected: [language]\nTranslated: [translation]"\n\nText: "${text}"`;
  return textGenerate(prompt, 'You are a professional translator.', 'openai');
}

function getImageUrl(prompt) {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 99999)}`;
}

module.exports = { cortex, mera, codeAI, roast, complimentAI, getWeather, translate, getImageUrl, textGenerate };
