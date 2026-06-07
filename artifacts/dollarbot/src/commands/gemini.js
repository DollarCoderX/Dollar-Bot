'use strict';

const fetch = require('node-fetch');
const env = require('../env');
const { getContextInfo, getMessageContent } = require('../lib/messages');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Download image either from quoted/replied message or current message
async function downloadImageFromMessage(sock, msg) {
  const ctx = getContextInfo(msg);

  // Quoted message image
  if (ctx?.quotedMessage) {
    const quotedContent = getMessageContent({ message: ctx.quotedMessage, key: ctx.key || msg.key });
    if (quotedContent?.imageMessage) {
      const quotedMsg = {
        message: ctx.quotedMessage,
        key: {
          remoteJid: msg.key.remoteJid,
          id: ctx.stanzaId || msg.key.id,
          participant: ctx.participant,
        },
      };
      const buf = await downloadMediaMessage(quotedMsg, 'buffer', {});
      return buf;
    }
  }

  // Current message image
  const content = getMessageContent(msg);
  if (content?.imageMessage) {
    const buf = await downloadMediaMessage(msg, 'buffer', {});
    return buf;
  }

  return null;
}

function getPromptFromMessage(msg, args) {
  // Prefer caption/body if present
  const content = getMessageContent(msg);
  const caption = content?.imageMessage?.caption || content?.videoMessage?.caption || content?.documentMessage?.caption || '';
  const fromText = (args || []).join(' ').trim();
  return (caption || fromText).trim();
}

async function geminiVisionEdit({ apiKey, model, imageBase64, prompt }) {
  // Use Google Gemini API.
  // We send inline data as base64 and request text+image generation.
  // Note: Gemini may return a textual description of the edit depending on model.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeout: 60000,
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${t}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';

  return { text, raw: data };
}

const geminiCommands = {
  // .gemini <prompt>
  // - Reply to an image with caption/prompt OR
  // - Send image with caption/prompt
  async gemini(sock, msg, args) {
    const jid = msg.key.remoteJid;

    const apiKey = env.GEMINI_API_KEY || '';
    const model = env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (!apiKey) {
      return msg.reply('❌ Missing GEMINI_API_KEY in env.');
    }

    const prompt = getPromptFromMessage(msg, args);
    if (!prompt) {
      return msg.reply('Usage: .gemini <prompt> (reply to an image OR send image with caption)');
    }

    await msg.reply('_🧠 Processing your image with Gemini..._');

    const imgBuf = await downloadImageFromMessage(sock, msg);
    if (!imgBuf) {
      return msg.reply('❌ No image found. Reply to an image or send an image with caption + prompt.');
    }

    // Convert to base64; try to be safe on mime type. We assume jpeg.
    const base64 = imgBuf.toString('base64');

    try {
      const result = await geminiVisionEdit({
        apiKey,
        model,
        imageBase64: base64,
        prompt: `You are an image editor. The user wants the following edit request:\n${prompt}\n\nReturn ONLY a short confirmation text plus, if supported by the API response, any image generation output. If you cannot directly return an edited image, describe the exact edited result concisely.`,
      });

      // If Gemini returns just text, we still respond with that text.
      // (Some Gemini endpoints may not return editable images in this wrapper.)
      const out = result.text?.trim();
      if (!out) {
        return msg.reply('❌ Gemini returned no output. Try a different prompt.');
      }

      return msg.reply(`📸 *Gemini Edit Result*\n\n${out}`);
    } catch (e) {
      return msg.reply(`❌ Gemini error: ${e.message}`);
    }
  },
};

module.exports = geminiCommands;

