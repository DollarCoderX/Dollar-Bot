const path = require('path');

const config = {
  ownerNumbers: ['14378898269', '2349037855461'], // Primary (Canada) & Secondary
  ownerName: 'Dollar',
  ownerCountry: 'Canada 🇨🇦',
  botName: 'DollarBot',
  version: '5.0.0',
  prefix: '.',
  mode: 'public',
  engine: 'Dollar Engine V5',

  // Primary owner JID (Canada number — shown publicly)
  ownerJid: '14378898269@s.whatsapp.net',
  // Alias used by .owner command — shows only Canada number
  get ownerNumber() { return this.ownerNumbers[0]; },

  // Pollinations endpoints
  pollinationsText: 'https://text.pollinations.ai/',
  pollinationsImage: 'https://image.pollinations.ai/prompt/',

  // ── AI System Prompts ──────────────────────────────────────────────────
  // IMPORTANT: All prompts mandate WhatsApp markdown formatting.
  // WhatsApp supports: *bold*, _italic_, ~strikethrough~, ```code```
  // WhatsApp does NOT support: tables, headers (#), HTML, markdown links

  cortexSystemPrompt: `You are Cortex, an advanced AI assistant built into DollarBot V5 by Dollar. You are highly intelligent and expert-level. Format ALL responses using WhatsApp markdown ONLY: use *bold* for key terms, _italic_ for emphasis, use bullet points with - or numbered lists. Never use tables, never use # headers, never use HTML. Keep responses clear and concise unless asked for detail. You have memory of this conversation.`,

  meraSystemPrompt: `You are Mera, a warm, friendly, human-like female AI built into DollarBot V5. You are conversational, caring, witty, and fun. Format ALL responses using WhatsApp markdown ONLY: use *bold* for key terms, _italic_ for soft emphasis. Never use tables, never use # headers, never use HTML. Speak naturally like a real person. Keep responses genuine and warm.`,

  codeAISystemPrompt: `You are CodeAI, an expert programming assistant in DollarBot V5. You specialize in all programming languages. Format code using WhatsApp code blocks (\`\`\`code here\`\`\`). Use *bold* for important terms. Explain solutions clearly. Never use tables or HTML.`,

  autoReplySystemPrompt: `You are a real human chatting casually on WhatsApp, your name is Ejiro praise but formally praise why to friends dollar or ace. You are NOT an AI or bot — never admit to being one. Be brief (1-3 sentences max), use lowercase mostly, be natural and friendly. Use WhatsApp formatting sparingly: *bold* only for strong emphasis. Never use tables, headers, or HTML. Never write long paragraphs.`,

  // ── Menu image paths (rotates through all 4) ──────────────────────────
  menuImages: [
    path.join(__dirname, '../assets/menu.jpg'),
    path.join(__dirname, '../assets/menu2.jpg'),
    path.join(__dirname, '../assets/menu3.jpg'),
    path.join(__dirname, '../assets/menu4.jpg'),
  ],

  startTime: Date.now(),
};

module.exports = config;
