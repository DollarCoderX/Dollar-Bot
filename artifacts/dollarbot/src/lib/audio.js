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

module.exports = { convertToOggOpus };
