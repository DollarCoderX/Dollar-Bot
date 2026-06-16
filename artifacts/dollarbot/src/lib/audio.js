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

async function transcribeAudio(audioBuffer, mimeType) {
  const groqKey = (
    process.env.GROQ_KEY ||
    process.env.GROQ_API_KEY ||
    (process.env.GROQ_KEYS || '').split(',')[0].trim()
  );
  if (!groqKey) throw new Error('No Groq API key. Add GROQ_KEY to your secrets to enable transcription.');

  const ext = mimeType?.includes('ogg') ? 'ogg'
    : mimeType?.includes('mp4') ? 'mp4'
    : mimeType?.includes('mpeg') ? 'mp3'
    : mimeType?.includes('aac') ? 'aac'
    : mimeType?.includes('wav') ? 'wav'
    : 'ogg';

  const FormData = require('form-data');
  const nodeFetch = require('node-fetch');

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

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Whisper API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const text = await res.text();
  return text.trim();
}

module.exports = { convertToOggOpus, transcribeAudio };
