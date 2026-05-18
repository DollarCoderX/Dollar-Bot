const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../../data/store.json');

function ensureDir() {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  ensureDir();
  if (!fs.existsSync(storePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  } catch {
    return {};
  }
}

function save(data) {
  ensureDir();
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
}

const store = {
  get(key) {
    const data = load();
    return data[key];
  },
  set(key, value) {
    const data = load();
    data[key] = value;
    save(data);
  },
  delete(key) {
    const data = load();
    delete data[key];
    save(data);
  },
  getAll() {
    return load();
  },
};

module.exports = store;
