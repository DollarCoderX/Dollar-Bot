'use strict';

/**
 * AI Tool-Calling (Agent Mode) for DollarBot V-Ultra
 * Real tools the AI can call: weather, Wikipedia, math, currency, news,
 * dictionary, GitHub repos, IP info, country info, web search (DDG).
 */

const fetch = require('node-fetch');
const env = require('../env');

const _groqKeys = env.GROQ_KEYS || [];
let _keyIdx = 0;
function getGroqKey() {
  if (!_groqKeys.length) return '';
  const k = _groqKeys[_keyIdx];
  _keyIdx = (_keyIdx + 1) % _groqKeys.length;
  return k;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(text) { return text?.trim() || 'No result'; }

async function groqChat(messages, model = 'llama-3.3-70b-versatile') {
  const key = getGroqKey();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
    timeout: 30000,
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No response';
}

// ── Real tool implementations ─────────────────────────────────────────────

async function toolWeather(location) {
  const r = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, { timeout: 10000 });
  if (!r.ok) throw new Error('Weather unavailable');
  const d = await r.json();
  const c = d.current_condition?.[0];
  const area = d.nearest_area?.[0];
  const city = area?.areaName?.[0]?.value || location;
  const country = area?.country?.[0]?.value || '';
  return `🌡️ ${c.temp_C}°C (${c.temp_F}°F) | ${c.weatherDesc?.[0]?.value} | Humidity: ${c.humidity}% | Wind: ${c.windspeedKmph}km/h | Location: ${city}, ${country}`;
}

async function toolWikipedia(query) {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { timeout: 10000 });
  if (!r.ok) throw new Error('Not found on Wikipedia');
  const d = await r.json();
  return d.extract ? d.extract.slice(0, 600) + (d.extract.length > 600 ? '...' : '') : 'No summary available';
}

async function toolMath(expr) {
  const r = await fetch(`https://api.mathjs.org/v4/?expr=${encodeURIComponent(expr)}`, { timeout: 8000 });
  if (!r.ok) throw new Error('Math error');
  return await r.text();
}

async function toolCurrency(amount, from, to) {
  const r = await fetch(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`, { timeout: 10000 });
  if (!r.ok) throw new Error('Currency data unavailable');
  const d = await r.json();
  const rate = d.rates?.[to.toUpperCase()];
  if (!rate) throw new Error(`Unknown currency: ${to}`);
  const result = (parseFloat(amount) * rate).toFixed(2);
  return `💱 ${amount} ${from.toUpperCase()} = *${result} ${to.toUpperCase()}* (rate: ${rate})`;
}

async function toolDDGSearch(query) {
  const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, { timeout: 10000 });
  if (!r.ok) throw new Error('Search failed');
  const d = await r.json();
  const abstract = d.AbstractText || d.Answer || d.Definition || '';
  const relatedTopics = (d.RelatedTopics || []).slice(0, 3).map(t => t.Text).filter(Boolean).join('\n• ');
  if (!abstract && !relatedTopics) return 'No instant result found — try .wiki for Wikipedia.';
  return [abstract, relatedTopics ? `\n\n*Related:*\n• ${relatedTopics}` : ''].join('');
}

async function toolGitHub(repo) {
  const clean = repo.replace(/^https?:\/\/github\.com\//, '');
  const r = await fetch(`https://api.github.com/repos/${clean}`, {
    headers: { 'User-Agent': 'DollarBot-VUltra' },
    timeout: 10000,
  });
  if (!r.ok) throw new Error('Repo not found');
  const d = await r.json();
  return `📦 *${d.full_name}*\n${d.description || 'No description'}\n⭐ ${d.stargazers_count} | 🍴 ${d.forks_count} | 👁️ ${d.watchers_count}\n🔤 ${d.language || 'N/A'} | 📄 License: ${d.license?.name || 'None'}\n🔗 ${d.html_url}`;
}

async function toolIPInfo(ip) {
  const endpoint = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
  const r = await fetch(endpoint, { timeout: 10000 });
  if (!r.ok) throw new Error('IP lookup failed');
  const d = await r.json();
  if (d.error) throw new Error(d.reason || 'Invalid IP');
  return `🌐 *IP:* ${d.ip}\n📍 ${d.city}, ${d.region}, ${d.country_name}\n🏢 ISP: ${d.org || 'Unknown'}\n🕐 Timezone: ${d.timezone}`;
}

async function toolCountry(name) {
  const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fullText=false`, { timeout: 10000 });
  if (!r.ok) throw new Error('Country not found');
  const [c] = await r.json();
  const capital = c.capital?.[0] || 'N/A';
  const pop = c.population?.toLocaleString() || 'N/A';
  const langs = Object.values(c.languages || {}).join(', ') || 'N/A';
  const currency = Object.values(c.currencies || {}).map(cu => `${cu.name} (${cu.symbol})`).join(', ') || 'N/A';
  return `🌍 *${c.name.common}* (${c.name.official})\n🏙️ Capital: ${capital}\n👥 Population: ${pop}\n🗣️ Languages: ${langs}\n💰 Currency: ${currency}\n🌐 Region: ${c.region} › ${c.subregion}`;
}

async function toolNews(topic) {
  // Use NewsAPI's free gnews endpoint
  const r = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&lang=en&max=5&apikey=demo`, { timeout: 12000 });
  // Fallback to Reddit search if gnews fails
  if (!r.ok || r.status === 403) {
    const r2 = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=new&limit=5`, {
      headers: { 'User-Agent': 'DollarBot-VUltra/1.0' },
      timeout: 12000,
    });
    if (!r2.ok) throw new Error('News unavailable');
    const d2 = await r2.json();
    const posts = d2.data?.children?.slice(0, 4) || [];
    if (!posts.length) throw new Error('No news found');
    return posts.map((p, i) => `${i + 1}. *${p.data.title}*\n   📍 r/${p.data.subreddit}`).join('\n\n');
  }
  const d = await r.json();
  const articles = d.articles?.slice(0, 4) || [];
  if (!articles.length) throw new Error('No news found');
  return articles.map((a, i) => `${i + 1}. *${a.title}*\n   📰 ${a.source.name}`).join('\n\n');
}

async function toolDefine(word) {
  const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 10000 });
  if (!r.ok) throw new Error(`No definition found for "${word}"`);
  const [entry] = await r.json();
  const meanings = entry.meanings?.slice(0, 2).map(m => {
    const defs = m.definitions.slice(0, 2).map((d, i) => `  ${i + 1}. ${d.definition}`).join('\n');
    return `*${m.partOfSpeech}*\n${defs}`;
  }).join('\n\n') || 'No definition';
  const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';
  return `📖 *${entry.word}* ${phonetic}\n\n${meanings}`;
}

// ── Tool definitions for Groq function calling ─────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for any city or location',
      parameters: {
        type: 'object',
        properties: { location: { type: 'string', description: 'City name, e.g. "Toronto" or "Lagos, Nigeria"' } },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_wikipedia',
      description: 'Look up factual information from Wikipedia about any topic, person, place, or thing',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'What to search for on Wikipedia' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_math',
      description: 'Evaluate any mathematical expression like "2^10", "sin(45)", "sqrt(144)", "150 * 1.13"',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string', description: 'Math expression to evaluate' } },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'convert_currency',
      description: 'Convert money between currencies using live rates',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount to convert' },
          from: { type: 'string', description: 'Source currency code, e.g. USD' },
          to: { type: 'string', description: 'Target currency code, e.g. NGN' },
        },
        required: ['amount', 'from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for any question or topic using DuckDuckGo',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'What to search for' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_country_info',
      description: 'Get detailed info about any country: capital, population, language, currency',
      parameters: {
        type: 'object',
        properties: { country: { type: 'string', description: 'Country name' } },
        required: ['country'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'define_word',
      description: 'Get the dictionary definition of any English word',
      parameters: {
        type: 'object',
        properties: { word: { type: 'string', description: 'Word to define' } },
        required: ['word'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_news',
      description: 'Get latest news headlines about any topic',
      parameters: {
        type: 'object',
        properties: { topic: { type: 'string', description: 'News topic to search' } },
        required: ['topic'],
      },
    },
  },
];

async function executeTool(name, args) {
  switch (name) {
    case 'get_weather':       return await toolWeather(args.location);
    case 'search_wikipedia':  return await toolWikipedia(args.query);
    case 'calculate_math':    return await toolMath(args.expression);
    case 'convert_currency':  return await toolCurrency(args.amount, args.from, args.to);
    case 'web_search':        return await toolDDGSearch(args.query);
    case 'get_country_info':  return await toolCountry(args.country);
    case 'define_word':       return await toolDefine(args.word);
    case 'get_news':          return await toolNews(args.topic);
    default: return 'Unknown tool';
  }
}

// ── .agent — full agentic AI with tool calling ─────────────────────────────

async function agent(sock, msg, args, jid) {
  if (!args.length) {
    return msg.reply(
      `🤖 *DollarBot Agent Mode*\n\n` +
      `Ask me anything — I can use real tools!\n\n` +
      `*Examples:*\n` +
      `• .agent What's the weather in Lagos?\n` +
      `• .agent Convert 500 USD to CAD\n` +
      `• .agent What is quantum computing?\n` +
      `• .agent Latest news about AI\n` +
      `• .agent Calculate sqrt(2) * pi\n` +
      `• .agent Define the word "ephemeral"\n\n` +
      `_Powered by Groq + Live APIs_ 🔧`
    );
  }

  const question = args.join(' ');
  await msg.reply('_🤖 Agent thinking... (using real tools)_');

  const key = getGroqKey();
  const messages = [
    {
      role: 'system',
      content: `You are DollarBot Agent, an AI assistant with access to real-world tools. 
Use tools whenever the user's question can benefit from live data (weather, facts, math, currency, news, definitions, country info). 
After getting tool results, give a friendly, well-formatted WhatsApp response using *bold*, _italic_, and bullet points. 
Never use HTML or markdown headers (#). Be concise but complete.`,
    },
    { role: 'user', content: question },
  ];

  try {
    // First call — let model decide which tools to use
    const res1 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 1024,
      }),
      timeout: 30000,
    });

    if (!res1.ok) throw new Error(`Groq error ${res1.status}`);
    const data1 = await res1.json();
    const assistantMsg = data1.choices?.[0]?.message;

    if (!assistantMsg) throw new Error('No response from AI');

    // If no tool calls, just return the text answer
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return sock.sendMessage(jid, { text: `🤖 *Agent*\n\n${assistantMsg.content}` }, { quoted: msg });
    }

    // Execute each tool call
    messages.push(assistantMsg);
    const toolResults = [];

    for (const tc of assistantMsg.tool_calls) {
      const toolName = tc.function.name;
      let toolArgs;
      try { toolArgs = JSON.parse(tc.function.arguments); } catch { toolArgs = {}; }

      let result;
      try {
        result = await executeTool(toolName, toolArgs);
      } catch (e) {
        result = `Error: ${e.message}`;
      }

      toolResults.push({ tool_call_id: tc.id, role: 'tool', name: toolName, content: result });
      messages.push({ tool_call_id: tc.id, role: 'tool', name: toolName, content: result });
    }

    // Second call — let model synthesize tool results into final answer
    const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      timeout: 30000,
    });

    if (!res2.ok) throw new Error(`Groq synthesis error ${res2.status}`);
    const data2 = await res2.json();
    const finalText = data2.choices?.[0]?.message?.content?.trim() || 'No response';

    const toolsUsed = assistantMsg.tool_calls.map(tc => `🔧 ${tc.function.name.replace(/_/g, ' ')}`).join(', ');
    await sock.sendMessage(jid, {
      text: `🤖 *Agent Answer*\n\n${finalText}\n\n_Tools used: ${toolsUsed}_`,
    }, { quoted: msg });

  } catch (e) {
    await msg.reply(`❌ Agent error: ${e.message}`);
  }
}

// ── Individual tool commands ───────────────────────────────────────────────

async function websearch(sock, msg, args, jid) {
  if (!args.length) return msg.reply('❌ Usage: .ws <query>\nExample: .ws best programming languages 2025');
  await msg.reply('_🔍 Searching..._');
  try {
    const result = await toolDDGSearch(args.join(' '));
    await sock.sendMessage(jid, { text: `🔍 *Web Search*\n_"${args.join(' ')}"_\n\n${fmt(result)}` }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

async function wikifact(sock, msg, args, jid) {
  if (!args.length) return msg.reply('❌ Usage: .wiki <topic>\nExample: .wiki Black holes');
  await msg.reply('_📖 Looking up Wikipedia..._');
  try {
    const result = await toolWikipedia(args.join(' '));
    await sock.sendMessage(jid, { text: `📖 *Wikipedia*\n_${args.join(' ')}_\n\n${fmt(result)}` }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

async function calc2(sock, msg, args, jid) {
  if (!args.length) return msg.reply('❌ Usage: .calc2 <expression>\nExample: .calc2 sqrt(144) + 2^8');
  try {
    const result = await toolMath(args.join(' '));
    await sock.sendMessage(jid, {
      text: `🧮 *Calculator*\n\n*Expression:* ${args.join(' ')}\n*Result:* ${result}`,
    }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ Math error: ${e.message}`);
  }
}

async function weather2(sock, msg, args, jid) {
  if (!args.length) return msg.reply('❌ Usage: .weather2 <city>\nExample: .weather2 Toronto');
  await msg.reply('_🌤️ Fetching weather..._');
  try {
    const result = await toolWeather(args.join(' '));
    await sock.sendMessage(jid, { text: `🌤️ *Live Weather*\n\n${result}` }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

async function currency(sock, msg, args, jid) {
  // Usage: .currency 100 USD NGN
  if (args.length < 3) return msg.reply('❌ Usage: .currency <amount> <from> <to>\nExample: .currency 100 USD NGN');
  await msg.reply('_💱 Fetching live rates..._');
  try {
    const result = await toolCurrency(args[0], args[1], args[2]);
    await sock.sendMessage(jid, { text: `💱 *Currency Converter*\n\n${result}` }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

async function news(sock, msg, args, jid) {
  if (!args.length) return msg.reply('❌ Usage: .news <topic>\nExample: .news Bitcoin');
  await msg.reply('_📰 Fetching latest news..._');
  try {
    const result = await toolNews(args.join(' '));
    await sock.sendMessage(jid, {
      text: `📰 *Latest News: ${args.join(' ')}*\n\n${result}`,
    }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

async function define(sock, msg, args, jid) {
  if (!args.length) return msg.reply('❌ Usage: .define <word>\nExample: .define ephemeral');
  await msg.reply('_📖 Looking up definition..._');
  try {
    const result = await toolDefine(args[0]);
    await sock.sendMessage(jid, { text: result }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

async function gitrepo(sock, msg, args, jid) {
  if (!args.length) return msg.reply('❌ Usage: .gitrepo <user/repo>\nExample: .gitrepo whiskeysockets/baileys');
  await msg.reply('_📦 Fetching GitHub repo..._');
  try {
    const result = await toolGitHub(args[0]);
    await sock.sendMessage(jid, { text: result }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

async function ipinfo(sock, msg, args, jid) {
  await msg.reply('_🌐 Looking up IP..._');
  try {
    const result = await toolIPInfo(args[0] || '');
    await sock.sendMessage(jid, { text: `🌐 *IP Info*\n\n${result}` }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

async function country3(sock, msg, args, jid) {
  if (!args.length) return msg.reply('❌ Usage: .country3 <name>\nExample: .country3 Canada');
  await msg.reply('_🌍 Fetching country info..._');
  try {
    const result = await toolCountry(args.join(' '));
    await sock.sendMessage(jid, { text: result }, { quoted: msg });
  } catch (e) {
    await msg.reply(`❌ ${e.message}`);
  }
}

module.exports = {
  agent,
  websearch,
  wikifact,
  calc2,
  weather2,
  currency,
  news,
  define,
  gitrepo,
  ipinfo,
  country3,
};
