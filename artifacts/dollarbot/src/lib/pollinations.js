const fetch = require('node-fetch');
const config = require('../config');
const memory = require('./memory');

async function textGenerate(messages, model = 'openai') {
  const response = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model,
      seed: Math.floor(Math.random() * 99999),
      private: true,
    }),
    timeout: 45000,
  });
  if (!response.ok) throw new Error(`AI service returned ${response.status}`);
  const text = await response.text();
  return text.trim();
}

async function cortex(jid, question) {
  const history = memory.getHistory(jid, 'cortex');
  const messages = [{ role: 'system', content: config.cortexSystemPrompt }, ...history, { role: 'user', content: question }];
  const reply = await textGenerate(messages, 'openai');
  memory.addMessage(jid, 'cortex', 'user', question);
  memory.addMessage(jid, 'cortex', 'assistant', reply);
  return reply;
}

async function mera(jid, question) {
  const history = memory.getHistory(jid, 'mera');
  const messages = [{ role: 'system', content: config.meraSystemPrompt }, ...history, { role: 'user', content: question }];
  const reply = await textGenerate(messages, 'openai');
  memory.addMessage(jid, 'mera', 'user', question);
  memory.addMessage(jid, 'mera', 'assistant', reply);
  return reply;
}

async function codeAI(question) {
  const messages = [{ role: 'system', content: config.codeAISystemPrompt }, { role: 'user', content: question }];
  return textGenerate(messages, 'openai');
}

async function roast(name) {
  const messages = [
    { role: 'system', content: 'You are a savage comedian who writes brutal, hilarious roasts. Keep it under 3 sentences.' },
    { role: 'user', content: `Roast "${name}" in the most savage, funny, creative way possible.` },
  ];
  return textGenerate(messages, 'openai');
}

async function complimentAI(name) {
  const messages = [
    { role: 'system', content: 'You are kind and creative. Give heartfelt, unique, personalized compliments.' },
    { role: 'user', content: `Give "${name}" a beautiful, heartfelt, creative compliment.` },
  ];
  return textGenerate(messages, 'openai');
}

async function getWeather(city) {
  const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 10000 });
  if (!res.ok) throw new Error('City not found or weather service unavailable');
  return (await res.text()).trim();
}

async function translate(text) {
  const messages = [
    { role: 'system', content: 'You are a professional translator. Detect the source language and translate. Format your reply as:\nDetected: [language]\nTranslated: [translation]' },
    { role: 'user', content: `Translate: "${text}"` },
  ];
  return textGenerate(messages, 'openai');
}

function getImageUrl(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 99999)}`;
}

module.exports = { cortex, mera, codeAI, roast, complimentAI, getWeather, translate, getImageUrl, textGenerate };
