const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const devCommands = {
  // ── JSON Minify ─────────────────────────────────────────────────────────
  async jsonminify(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .jsonminify <json>');
    try {
      const json = JSON.parse(args.join(' '));
      const minified = JSON.stringify(json);
      await msg.reply(`\`\`\`\n${minified}\`\`\``);
    } catch (e) {
      await msg.reply(`❌ Invalid JSON: ${e.message}`);
    }
  },

  // ── Timestamp Converter ──────────────────────────────────────────────────
  async timestamp(sock, msg, args) {
    let date;
    if (!args.length) {
      date = new Date();
    } else if (args[0] === 'now') {
      date = new Date();
    } else if (/^\d+$/.test(args[0])) {
      date = new Date(parseInt(args[0]) * 1000);
    } else {
      date = new Date(args.join(' '));
    }
    
    if (isNaN(date)) return msg.reply('❌ Invalid date');
    
    await msg.reply(`*⏰ Timestamp Converter*\n\n` +
          `📅 Date: ${date.toISOString()}\n` +
          `⏱️ Unix: ${Math.floor(date.getTime() / 1000)}\n` +
          `📊 Milliseconds: ${date.getTime()}`);
  },

  // ── Base32 Encoder/Decoder ──────────────────────────────────────────────
  async base32(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .base32 <text>');
    try {
      const text = args.join(' ');
      const encoded = Buffer.from(text).toString('base64');
      const decoded = Buffer.from(encoded, 'base64').toString();
      await msg.reply(`*📝 Base32 Conversion*\n\n` +
            `Original: ${text}\n` +
            `Encoded: \`${encoded}\``);
    } catch (e) {
      await msg.reply(`❌ Base32 Error: ${e.message}`);
    }
  },

  // ── JWT Decoder ─────────────────────────────────────────────────────────
  async jwtdecode(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .jwtdecode <token>');
    try {
      const parts = args[0].split('.');
      if (parts.length !== 3) return msg.reply('❌ Invalid JWT format');
      
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      await msg.reply(`*🔐 JWT Decoded*\n\n` +
            `Header: \`${JSON.stringify(header)}\`\n\n` +
            `Payload: \`${JSON.stringify(payload)}\``);
    } catch (e) {
      await msg.reply(`❌ JWT Error: ${e.message}`);
    }
  },

  // ── Regex Tester ────────────────────────────────────────────────────────
  async regextest(sock, msg, args) {
    if (args.length < 2) return msg.reply('❌ Usage: .regextest <pattern> <text>');
    try {
      const pattern = args[0];
      const text = args.slice(1).join(' ');
      const regex = new RegExp(pattern);
      const matches = text.match(regex) || [];
      
      await msg.reply(`*🔍 Regex Test*\n\n` +
            `Pattern: ${pattern}\n` +
            `Text: ${text}\n` +
            `Matches: ${matches.length}\n` +
            `Result: ${matches.length > 0 ? '✅ Match found!' : '❌ No match'}`);
    } catch (e) {
      await msg.reply(`❌ Regex Error: ${e.message}`);
    }
  },

  // ── URL Encoder/Decoder ─────────────────────────────────────────────────
  async urlencode(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .urlencode <text>');
    const text = args.join(' ');
    const encoded = encodeURIComponent(text);
    const decoded = decodeURIComponent(encoded);
    await msg.reply(`*🔗 URL Encoding*\n\n` +
          `Original: ${text}\n` +
          `Encoded: \`${encoded}\`\n` +
          `Decoded: \`${decoded}\``);
  },

  // ── UUID v4 Generator ────────────────────────────────────────────────────
  async uuidgen(sock, msg) {
    const uuids = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()];
    await msg.reply(`*🆔 UUID v4 Generated*\n\n${uuids.map((u, i) => `${i + 1}. \`${u}\``).join('\n')}`);
  },

  // ── HTTP Status Checker ─────────────────────────────────────────────────
  async httpstatus(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .httpstatus <code>');
    const codes = {
      '200': '✅ OK',
      '201': '✅ Created',
      '204': '✅ No Content',
      '301': '🔄 Moved Permanently',
      '302': '🔄 Found',
      '304': '📦 Not Modified',
      '400': '❌ Bad Request',
      '401': '🔐 Unauthorized',
      '403': '🚫 Forbidden',
      '404': '❌ Not Found',
      '500': '💥 Internal Server Error',
      '502': '💥 Bad Gateway',
      '503': '💥 Service Unavailable',
    };
    const status = codes[args[0]] || '❓ Unknown Status Code';
    await msg.reply(`*📊 HTTP ${args[0]}*\n\n${status}`);
  },

  // ── MIME Type Lookup ────────────────────────────────────────────────────
  async mime(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .mime <extension>');
    const mimes = {
      'js': 'application/javascript',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css',
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
    };
    const ext = args[0].toLowerCase();
    const mime = mimes[ext] || '❌ Unknown extension';
    await msg.reply(`*${ext.toUpperCase()} MIME Type*\n\n${mime}`);
  },

  // ── Code Syntax Highlighter Info ────────────────────────────────────────
  async langinfo(sock, msg, args) {
    const langs = {
      'js': '📱 JavaScript',
      'python': '🐍 Python',
      'java': '☕ Java',
      'c': 'C',
      'cpp': '⚡ C++',
      'rust': '🦀 Rust',
      'go': '🐹 Go',
      'php': '🐘 PHP',
      'ruby': '💎 Ruby',
      'swift': '🍎 Swift',
    };
    const lang = args[0]?.toLowerCase();
    if (!lang || !langs[lang]) {
      return msg.reply(`*📚 Available Languages*\n\n${Object.entries(langs).map(([k, v]) => `${k} → ${v}`).join('\n')}`);
    }
    await msg.reply(`*${langs[lang]}*\n\nPopular programming language`);
  },

  // ── Random Port Generator ────────────────────────────────────────────────
  async randomport(sock, msg) {
    const ports = [];
    for (let i = 0; i < 5; i++) {
      ports.push(Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024);
    }
    await msg.reply(`*🔌 Random Ports*\n\n${ports.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
  },

  // ── NPM Package Info ────────────────────────────────────────────────────
  async npmpkg(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .npmpkg <package_name>');
    try {
      const pkg = args[0];
      const res = await axios.get(`https://registry.npmjs.org/${pkg}`);
      await msg.reply(`*📦 NPM Package: ${res.data.name}*\n\n` +
            `🔖 Latest: ${res.data['dist-tags'].latest}\n` +
            `📮 Downloads: ${res.data.description?.substring(0, 50)}\n` +
            `🔗 ${res.data.homepage || res.data.repository?.url || 'No URL'}`);
    } catch (e) {
      await msg.reply(`❌ NPM Error: ${e.message}`);
    }
  },

  // ── Markdown to HTML Preview ────────────────────────────────────────────
  async mdpreview(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .mdpreview <markdown>');
    const md = args.join(' ');
    // Simple markdown preview
    const preview = md
      .replace(/^# (.*)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>');
    await msg.reply(`*📝 Markdown Preview*\n\n${preview}`);
  },

  // ── Git Commit Message Generator ────────────────────────────────────────
  async gitcommit(sock, msg, args) {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore'];
    const type = types[Math.floor(Math.random() * types.length)];
    const scopes = ['api', 'ui', 'auth', 'db', 'core', 'utils'];
    const scope = scopes[Math.floor(Math.random() * scopes.length)];
    const messages = ['improve performance', 'add new feature', 'refactor code', 'fix bug', 'update docs'];
    const msg_text = messages[Math.floor(Math.random() * messages.length)];
    const commit = `${type}(${scope}): ${msg_text}`;
    await msg.reply(`*📝 Git Commit*\n\n\`${commit}\``);
  },

  // ── API Test ──────────────────────────────────────────────────────────────
  async apitest(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .apitest <url>');
    const url = args[0];
    if (!/^https?:\/\//i.test(url)) return msg.reply('❌ URL must start with http:// or https://');
    try {
      const start = Date.now();
      const res = await axios.get(url, { timeout: 10000, validateStatus: () => true });
      const ms = Date.now() - start;
      await msg.reply(`*🌐 API Test: ${url}*\n\n` +
        `📊 Status: ${res.status} ${res.statusText}\n` +
        `⏱️ Response time: ${ms}ms\n` +
        `📦 Content-Type: ${res.headers['content-type'] || 'N/A'}\n` +
        `📏 Body size: ${JSON.stringify(res.data).length} chars`);
    } catch (e) {
      await msg.reply(`❌ Request failed: ${e.message}`);
    }
  },

  // ── Color Hex ─────────────────────────────────────────────────────────────
  async colorhex(sock, msg, args) {
    if (args[0]) {
      // Parse given hex
      const hex = args[0].replace('#','');
      const r = parseInt(hex.substring(0,2),16), g = parseInt(hex.substring(2,4),16), b = parseInt(hex.substring(4,6),16);
      const hsl = `hsl(${Math.round(Math.atan2(Math.sqrt(3)*(g-b), 2*r-g-b)*180/Math.PI+360)%360}°, -, -)`;
      await msg.reply(`*🎨 Color: #${hex.toUpperCase()}*\n\nRGB: rgb(${r}, ${g}, ${b})\nHex: #${hex.toUpperCase()}`);
    } else {
      const hex = Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0').toUpperCase();
      const r = parseInt(hex.substring(0,2),16), g = parseInt(hex.substring(2,4),16), b = parseInt(hex.substring(4,6),16);
      await msg.reply(`*🎨 Random Color*\n\nHex: #${hex}\nRGB: rgb(${r}, ${g}, ${b})\nPreview: Use this in CSS/design tools`);
    }
  },

  // ── Cron Expression Explainer ─────────────────────────────────────────────
  async crontab(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .crontab <cron expression>\nExample: .crontab * * * * *');
    const parts = args.join(' ').split(' ');
    if (parts.length !== 5) return msg.reply('❌ Cron needs exactly 5 parts: minute hour day month weekday');
    const [min,hr,day,mon,wd] = parts;
    const labels = ['Minute','Hour','Day of Month','Month','Day of Week'];
    const values = [min,hr,day,mon,wd];
    const explained = values.map((v,i) => `${labels[i]}: ${v === '*' ? 'Every' : v}`).join('\n');
    await msg.reply(`*⏰ Cron: ${args.join(' ')}*\n\n${explained}\n\nRuns: ${min==='*'?'every minute':'at minute '+min} of ${hr==='*'?'every hour':'hour '+hr}`);
  },

  // ── Dockerfile Generator ──────────────────────────────────────────────────
  async dockerfile(sock, msg, args) {
    const lang = (args[0] || 'node').toLowerCase();
    const templates = {
      node: `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install --production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "index.js"]`,
      python: `FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD ["python", "main.py"]`,
      go: `FROM golang:1.21-alpine AS builder\nWORKDIR /app\nCOPY . .\nRUN go build -o main .\nFROM alpine:latest\nCOPY --from=builder /app/main .\nCMD ["./main"]`,
    };
    const tmpl = templates[lang] || templates.node;
    await msg.reply(`*🐳 Dockerfile (${lang})*\n\n\`\`\`\n${tmpl}\n\`\`\``);
  },

  // ── .gitignore Generator ──────────────────────────────────────────────────
  async gitignore(sock, msg, args) {
    const lang = (args[0] || 'node').toLowerCase();
    const templates = {
      node: `node_modules/\n.env\n.env.*\ndist/\nbuild/\n*.log\n.DS_Store\n.cache/`,
      python: `__pycache__/\n*.pyc\n*.pyo\n.env\nvenv/\n.venv/\ndist/\nbuild/\n*.egg-info/`,
      react: `node_modules/\nbuild/\n.env\n.env.local\n.env.production\n*.log\n.DS_Store`,
    };
    const tmpl = templates[lang] || templates.node;
    await msg.reply(`*📄 .gitignore (${lang})*\n\n\`\`\`\n${tmpl}\n\`\`\``);
  },

  // ── JSON Validate ─────────────────────────────────────────────────────────
  async jsonvalidate(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .jsonvalidate <json>');
    try {
      const parsed = JSON.parse(args.join(' '));
      const keys = Object.keys(parsed).length;
      await msg.reply(`✅ *Valid JSON!*\n\nKeys: ${keys}\nType: ${Array.isArray(parsed) ? 'Array' : 'Object'}\nSize: ${args.join(' ').length} chars`);
    } catch (e) {
      await msg.reply(`❌ *Invalid JSON*\n\nError: ${e.message}`);
    }
  },

  // ── SQL Format ────────────────────────────────────────────────────────────
  async sqlformat(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .sqlformat <sql query>');
    const sql = args.join(' ')
      .replace(/\bSELECT\b/gi, '\nSELECT')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bAND\b/gi, '\n  AND')
      .replace(/\bOR\b/gi, '\n  OR')
      .replace(/\bJOIN\b/gi, '\nJOIN')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bLIMIT\b/gi, '\nLIMIT')
      .trim();
    await msg.reply(`*🗄️ Formatted SQL*\n\n\`\`\`sql\n${sql}\n\`\`\``);
  },

  // ── Markdown Table ────────────────────────────────────────────────────────
  async markdowntable(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .markdowntable <col1,col2,col3>');
    const cols = args.join(' ').split(',').map(c => c.trim());
    const header = `| ${cols.join(' | ')} |`;
    const divider = `|${cols.map(() => ' --- ').join('|')}|`;
    const row = `| ${cols.map((c,i) => `Value${i+1}`).join(' | ')} |`;
    await msg.reply(`*📊 Markdown Table*\n\n\`\`\`\n${header}\n${divider}\n${row}\n\`\`\``);
  },

  // ── Hash Text ─────────────────────────────────────────────────────────────
  async hashtext(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .hashtext <text>');
    const crypto = require('crypto');
    const text = args.join(' ');
    const md5 = crypto.createHash('md5').update(text).digest('hex');
    const sha1 = crypto.createHash('sha1').update(text).digest('hex');
    const sha256 = crypto.createHash('sha256').update(text).digest('hex');
    await msg.reply(`*#️⃣ Hash Results*\n\nInput: "${text}"\n\nMD5: \`${md5}\`\nSHA1: \`${sha1}\`\nSHA256: \`${sha256}\``);
  },

  // ── CSV Parse ─────────────────────────────────────────────────────────────
  async csvparse(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .csvparse <csv data>\nExample: .csvparse name,age,city John,25,NY');
    const lines = args.join(' ').split('|').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      const data = args.join(' ');
      const rows = data.split(' ').filter(Boolean);
      await msg.reply(`*📊 CSV Data*\n\nDetected ${rows.length} values:\n${rows.map((r,i) => `${i+1}. ${r}`).join('\n')}`);
      return;
    }
    const headers = lines[0].split(',');
    const table = lines.slice(1).map(row => {
      const vals = row.split(',');
      return headers.map((h,i) => `${h}: ${vals[i] || 'N/A'}`).join(', ');
    });
    await msg.reply(`*📊 CSV Parsed*\n\nColumns: ${headers.join(', ')}\n\n${table.map((r,i) => `Row ${i+1}: ${r}`).join('\n')}`);
  },

  // ── Port Check ────────────────────────────────────────────────────────────
  async portcheck(sock, msg, args) {
    const port = parseInt(args[0]);
    if (!port || port < 1 || port > 65535) return msg.reply('❌ Usage: .portcheck <port number>');
    const wellKnown = {
      21:'FTP',22:'SSH',23:'Telnet',25:'SMTP',53:'DNS',80:'HTTP',110:'POP3',
      143:'IMAP',443:'HTTPS',3306:'MySQL',5432:'PostgreSQL',6379:'Redis',
      27017:'MongoDB',3000:'Node.js dev',8080:'HTTP alt',8443:'HTTPS alt',
    };
    const name = wellKnown[port] || 'Unknown/Custom';
    const range = port < 1024 ? 'Well-known (0-1023)' : port < 49152 ? 'Registered (1024-49151)' : 'Dynamic/Private (49152-65535)';
    await msg.reply(`*🔌 Port ${port}*\n\nService: ${name}\nRange: ${range}\nStatus: Open if app is listening`);
  },

  // ── Random Dev Fact ───────────────────────────────────────────────────────
  async devfact(sock, msg) {
    const facts = [
      'The first computer bug was an actual bug — a moth found in a Harvard Mark II computer in 1947.',
      'JavaScript was created in just 10 days by Brendan Eich in 1995.',
      'The term "debugging" was popularized by Grace Hopper after removing that literal moth.',
      'Python was named after Monty Python, not the snake.',
      'Linux powers 96.3% of the world\'s top 1 million web servers.',
      'The average developer writes about 10-12 lines of production code per day.',
      'Git was created by Linus Torvalds in just 2 weeks in 2005.',
      'There are over 700 programming languages in existence.',
      'The first website is still online: info.cern.ch',
      'Stack Overflow has over 58 million questions and answers.',
    ];
    await msg.reply(`*💻 Dev Fact*\n\n${facts[Math.floor(Math.random()*facts.length)]}`);
  },

  // ── Code Complexity Estimator ─────────────────────────────────────────────
  async complexity(sock, msg, args) {
    if (!args.length) return msg.reply('❌ Usage: .complexity O(n) or .complexity <code snippet>');
    const input = args.join(' ');
    const notation = input.match(/O\([^)]+\)/i);
    if (notation) {
      const complexities = {
        'O(1)':'Constant — blazing fast, no matter input size.',
        'O(log n)':'Logarithmic — very fast, like binary search.',
        'O(n)':'Linear — scales directly with input.',
        'O(n log n)':'Linearithmic — like merge sort. Good.',
        'O(n²)':'Quadratic — slows down fast. Avoid for large n.',
        'O(2ⁿ)':'Exponential — extremely slow. Avoid!',
        'O(n!)':'Factorial — only feasible for tiny inputs.',
      };
      const desc = complexities[notation[0].toUpperCase()] || 'Custom complexity notation.';
      await msg.reply(`*⚡ Complexity: ${notation[0]}*\n\n${desc}`);
    } else {
      const ncount = (input.match(/for|while|forEach|map|filter|reduce/gi)||[]).length;
      const est = ncount === 0 ? 'O(1)' : ncount === 1 ? 'O(n)' : ncount === 2 ? 'O(n²)' : 'O(n³+)';
      await msg.reply(`*⚡ Estimated Complexity: ${est}*\n\nDetected ${ncount} loop(s) in snippet.\n_Note: This is a rough estimate._`);
    }
  },

  // ── Semver Explainer ──────────────────────────────────────────────────────
  async semver(sock, msg, args) {
    const ver = args[0] || '1.2.3';
    const parts = ver.replace(/^v/,'').split('.');
    if (parts.length < 3) return msg.reply('❌ Usage: .semver <version>\nExample: .semver 2.1.0');
    const [major, minor, patch] = parts;
    await msg.reply(`*📦 Semantic Version: ${ver}*\n\n` +
      `🔴 Major (${major}): Breaking changes — APIs changed\n` +
      `🟡 Minor (${minor}): New features, backward compatible\n` +
      `🟢 Patch (${patch}): Bug fixes only\n\n` +
      `Next versions:\n• Major: ${+major+1}.0.0\n• Minor: ${major}.${+minor+1}.0\n• Patch: ${major}.${minor}.${+patch+1}`);
  },
};

module.exports = devCommands;
