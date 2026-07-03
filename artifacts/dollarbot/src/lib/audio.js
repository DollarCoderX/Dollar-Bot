const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

async function convertToOggOpus(inputBuffer, inputExt = 'mp3') {
  const id = crypto.randomBytes(4).toString('hex');
  const tmpIn = path.join(os.tmpdir(), `db5_${id}_in.${inputExt}`);
  const tmpOut = path.join(os.tmpdir(), `db5_${id}_out.ogg`);

  fs.writeFileSync(tmpIn, inputBuffer);

  return new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      [
        '-y',
        '-i', tmpIn,
        '-c:a', 'libopus',
        '-b:a', '48k',
        '-vbr', 'on',
        '-compression_level', '10',
        '-ar', '48000',
        '-ac', '1',
        tmpOut,
      ],
      { timeout: 60000 },
      (err) => {
        try { fs.unlinkSync(tmpIn); } catch (_) {}
        if (err) {
          try { fs.unlinkSync(tmpOut); } catch (_) {}
          return reject(err);
        }
        const buf = fs.readFileSync(tmpOut);
        try { fs.unlinkSync(tmpOut); } catch (_) {}
        resolve(buf);
      }
    );
  });
}

function guessExt(mimeType) {
  return mimeType?.includes('ogg') ? 'ogg'
    : mimeType?.includes('mp4') ? 'mp4'
    : mimeType?.includes('mpeg') ? 'mp3'
    : mimeType?.includes('aac') ? 'aac'
    : mimeType?.includes('wav') ? 'wav'
    : 'ogg';
}

// Primary: Groq Whisper (fast, needs key). Fallback: free HuggingFace Whisper inference (no key needed).
async function transcribeAudio(audioBuffer, mimeType) {
  const nodeFetch = require('node-fetch');
  const groqKey = (
    process.env.GROQ_KEY ||
    process.env.GROQ_API_KEY ||
    (process.env.GROQ_KEYS || '').split(',')[0].trim()
  );

  if (groqKey) {
    try {
      const ext = guessExt(mimeType);
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType || 'audio/ogg' });
      form.append('model', 'whisper-large-v3-turbo');
      form.append('response_format', 'text');

      const res = await nodeFetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          ...form.getHeaders(),
        },
        body: form,
        timeout: 60000,
      });

      if (res.ok) {
        const text = await res.text();
        if (text.trim()) return text.trim();
      } else {
        const errText = await res.text().catch(() => '');
        console.log(`[STT] Groq Whisper failed HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
    } catch (err) {
      console.log('[STT] Groq Whisper failed:', err.message);
    }
  } else {
    console.log('[STT] No Groq key configured, skipping to free fallback.');
  }

  // Free fallback: HuggingFace Whisper inference API (no key required, may rate-limit)
  try {
    const res2 = await nodeFetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3', {
      method: 'POST',
      headers: { 'Content-Type': mimeType || 'audio/ogg' },
      body: audioBuffer,
      timeout: 45000,
    });
    if (res2.ok) {
      const data = await res2.json().catch(() => null);
      const text = data?.text;
      if (text && text.trim()) return text.trim();
    } else {
      console.log(`[STT] HF Whisper failed HTTP ${res2.status}`);
    }
  } catch (err) {
    console.log('[STT] HF Whisper failed:', err.message);
  }

  throw new Error('Transcription is currently unavailable. Please try again later.');
}

module.exports = { convertToOggOpus, transcribeAudio };
