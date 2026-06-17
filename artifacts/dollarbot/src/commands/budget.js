'use strict';
const store = require('../lib/store');

function getKey(jid) { return `budget_${jid}`; }

async function getData(jid) {
  return (await store.get(getKey(jid))) || { limit: 0, income: [], expenses: [], month: new Date().getMonth() };
}
async function saveData(jid, data) { return store.set(getKey(jid), data); }

function fmtNum(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

module.exports = {

  // .budget [set <amount>] — show or set monthly budget
  async budget(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const data = await getData(jid);

    if (args[0] === 'set') {
      const amount = parseFloat(args[1]);
      if (isNaN(amount) || amount <= 0)
        return sock.sendMessage(jid, { text: '❌ Usage: .budget set <amount>\nExample: .budget set 5000' }, { quoted: msg });
      data.limit = amount;
      await saveData(jid, data);
      return sock.sendMessage(jid, { text: `✅ Monthly budget set to *$${fmtNum(amount)}*` }, { quoted: msg });
    }

    const totalIncome   = data.income.reduce((s, e) => s + e.amount, 0);
    const totalExpense  = data.expenses.reduce((s, e) => s + e.amount, 0);
    const balance       = totalIncome - totalExpense;
    const remaining     = data.limit ? data.limit - totalExpense : null;
    const usedPct       = data.limit ? Math.min(100, Math.round(totalExpense / data.limit * 100)) : 0;
    const bar           = data.limit ? ('▓'.repeat(Math.round(usedPct/10)) + '░'.repeat(10 - Math.round(usedPct/10))) : '──────────';

    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💰 BUDGET TRACKER 〕━━━⬣\n` +
        `┃\n` +
        `┃ 📅 *Month Budget:* $${fmtNum(data.limit || 0)}\n` +
        `┃ 💵 *Total Income:* $${fmtNum(totalIncome)}\n` +
        `┃ 💸 *Total Spent:*  $${fmtNum(totalExpense)}\n` +
        `┃ 💚 *Balance:*      $${fmtNum(balance)}\n` +
        (remaining !== null ? `┃ 🎯 *Remaining:*    $${fmtNum(remaining)}\n` : '') +
        (data.limit ? `┃ 📊 *Used:*         ${usedPct}%\n┃ [${bar}]\n` : '') +
        `┃\n` +
        `┃ _Tip: .expense <amount> [label] | .income <amount> [label]_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .expense <amount> [label] — log an expense
  async expense(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const amount = parseFloat(args[0]);
    if (isNaN(amount) || amount <= 0)
      return sock.sendMessage(jid, { text: '❌ Usage: .expense <amount> [label]\nExample: .expense 25 lunch' }, { quoted: msg });
    const label = args.slice(1).join(' ') || 'Misc';
    const data = await getData(jid);
    data.expenses.push({ amount, label, date: new Date().toLocaleDateString('en-CA'), ts: Date.now() });
    await saveData(jid, data);
    const total = data.expenses.reduce((s, e) => s + e.amount, 0);
    const remaining = data.limit ? data.limit - total : null;
    await sock.sendMessage(jid, {
      text:
        `💸 *Expense logged!*\n\n` +
        `• *Amount:* $${fmtNum(amount)}\n` +
        `• *Label:* ${label}\n` +
        `• *Total spent:* $${fmtNum(total)}\n` +
        (remaining !== null ? `• *Remaining budget:* $${fmtNum(remaining)}${remaining < 0 ? ' ⚠️ OVER BUDGET!' : ''}` : ''),
    }, { quoted: msg });
  },

  // .income <amount> [label] — log income
  async income(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const amount = parseFloat(args[0]);
    if (isNaN(amount) || amount <= 0)
      return sock.sendMessage(jid, { text: '❌ Usage: .income <amount> [label]\nExample: .income 1000 salary' }, { quoted: msg });
    const label = args.slice(1).join(' ') || 'Income';
    const data = await getData(jid);
    data.income.push({ amount, label, date: new Date().toLocaleDateString('en-CA'), ts: Date.now() });
    await saveData(jid, data);
    const total = data.income.reduce((s, e) => s + e.amount, 0);
    await sock.sendMessage(jid, {
      text:
        `💵 *Income logged!*\n\n` +
        `• *Amount:* $${fmtNum(amount)}\n` +
        `• *Label:* ${label}\n` +
        `• *Total income:* $${fmtNum(total)}`,
    }, { quoted: msg });
  },

  // .budgetsummary — detailed breakdown
  async budgetsummary(sock, msg) {
    const jid = msg.key.remoteJid;
    const data = await getData(jid);
    const totalIncome  = data.income.reduce((s, e) => s + e.amount, 0);
    const totalExpense = data.expenses.reduce((s, e) => s + e.amount, 0);

    let text = `╭━━━〔 📊 BUDGET SUMMARY 〕━━━⬣\n┃\n`;

    if (data.income.length) {
      text += `┃ 💵 *Income:*\n`;
      data.income.slice(-5).forEach(e => { text += `┃  +$${fmtNum(e.amount)} — ${e.label} (${e.date})\n`; });
      text += `┃ _Total: $${fmtNum(totalIncome)}_\n┃\n`;
    }
    if (data.expenses.length) {
      text += `┃ 💸 *Expenses:*\n`;
      data.expenses.slice(-5).forEach(e => { text += `┃  -$${fmtNum(e.amount)} — ${e.label} (${e.date})\n`; });
      text += `┃ _Total: $${fmtNum(totalExpense)}_\n┃\n`;
    }
    if (!data.income.length && !data.expenses.length) {
      text += `┃ No data yet. Log with *.expense* or *.income*\n`;
    }
    text += `┃ 💚 *Net Balance:* $${fmtNum(totalIncome - totalExpense)}\n╰━━━━━━━━━━━━━━━━━━⬣`;
    await sock.sendMessage(jid, { text }, { quoted: msg });
  },

  // .delbudget — reset all budget data
  async delbudget(sock, msg) {
    const jid = msg.key.remoteJid;
    await saveData(jid, { limit: 0, income: [], expenses: [], month: new Date().getMonth() });
    await sock.sendMessage(jid, { text: '🗑️ Budget data has been reset.' }, { quoted: msg });
  },
};
