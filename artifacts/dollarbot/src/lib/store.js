const fs = require('fs').promises;
const path = require('path');

const storePath = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'store.json')
  : path.join(__dirname, '../../data/store.json');
let cachedData = null;
let isWriting = false;
const writeQueue = [];

async function ensureDir() {
  const dir = path.dirname(storePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (_) {}
}

async function load() {
  await ensureDir();
  try {
    const data = await fs.readFile(storePath, 'utf-8');
    cachedData = JSON.parse(data);
    return cachedData;
  } catch {
    return cachedData || {};
  }
}

async function save(data) {
  await ensureDir();
  if (isWriting) {
    writeQueue.push(data);
    return;
  }
  isWriting = true;
  try {
    await fs.writeFile(storePath, JSON.stringify(data, null, 2));
    cachedData = data;
    if (writeQueue.length > 0) {
      const nextData = writeQueue.shift();
      isWriting = false;
      await save(nextData);
    }
  } catch {
  } finally {
    isWriting = false;
  }
}

const store = {
  async get(key) {
    const data = cachedData || (await load());
    return data[key];
  },
  async set(key, value) {
    const data = cachedData || (await load());
    data[key] = value;
    await save(data);
  },
  async delete(key) {
    const data = cachedData || (await load());
    delete data[key];
    await save(data);
  },
  async getAll() {
    return cachedData || (await load());
  },
};

module.exports = store;
