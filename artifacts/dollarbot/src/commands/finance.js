'use strict';
const pollinations = require('../lib/pollinations');

async function ai(prompt) {
  return await pollinations.textGenerate([{ role: 'user', content: prompt }]);
}
async function reply(sock, msg, text) {
  await sock.sendMessage(msg.key.remoteJid, { text: text || '❌ Try again.' }, { quoted: msg });
}

const financeCommands = {
  async crypto(sock, msg, args) {
    const coin = args.join(' ') || 'cryptocurrency market';
    const r = await ai(`Explain the current state of ${coin} in simple terms. Cover what drives its price and key factors to watch.`);
    await reply(sock, msg, `*₿ Crypto Overview*\n\n${r}`);
  },
  async bitcoin(sock, msg, args) {
    const r = await ai(`Share 3 fascinating Bitcoin facts — history, technology, or milestones. Keep it educational and exciting.`);
    await reply(sock, msg, `*₿ Bitcoin Facts*\n\n${r}`);
  },
  async ethereum(sock, msg, args) {
    const r = await ai(`Explain what Ethereum is and why it matters. Cover smart contracts, DeFi, and its future potential.`);
    await reply(sock, msg, `*⟠ Ethereum Explained*\n\n${r}`);
  },
  async nft(sock, msg, args) {
    const r = await ai(`Explain NFTs in simple terms. What are they, why do people buy them, and are they still relevant?`);
    await reply(sock, msg, `*🖼️ NFT Explained*\n\n${r}`);
  },
  async defi(sock, msg, args) {
    const r = await ai(`Explain DeFi (Decentralized Finance) in simple terms. What are the benefits and risks?`);
    await reply(sock, msg, `*🏦 DeFi Explained*\n\n${r}`);
  },
  async stockmarket(sock, msg, args) {
    const r = await ai(`Explain how the stock market works for a complete beginner. Cover stocks, exchanges, and how prices move.`);
    await reply(sock, msg, `*📈 Stock Market Basics*\n\n${r}`);
  },
  async invest(sock, msg, args) {
    const amount = args.join(' ') || 'any budget';
    const r = await ai(`Give investment tips for someone with ${amount}. Cover diversification, risk, and long-term strategy.`);
    await reply(sock, msg, `*💰 Investment Tips*\n\n${r}`);
  },
  async savings(sock, msg, args) {
    const r = await ai(`Give 5 powerful savings strategies that actually work. Include specific percentages and timeframes.`);
    await reply(sock, msg, `*💳 Savings Strategies*\n\n${r}`);
  },
  async budget2(sock, msg, args) {
    const income = args.join(' ') || 'any income';
    const r = await ai(`Create a monthly budget plan for someone earning ${income}. Use the 50/30/20 rule and explain each category.`);
    await reply(sock, msg, `*📊 Budget Plan*\n\n${r}`);
  },
  async debt(sock, msg, args) {
    const r = await ai(`Give the best strategies for paying off debt fast. Compare avalanche vs snowball method and which works better.`);
    await reply(sock, msg, `*💸 Debt Management*\n\n${r}`);
  },
  async retirement(sock, msg, args) {
    const age = args.join(' ') || 'any age';
    const r = await ai(`Give retirement planning advice for someone aged ${age}. Cover savings rate, investment types, and retirement accounts.`);
    await reply(sock, msg, `*🏖️ Retirement Planning*\n\n${r}`);
  },
  async taxidea(sock, msg, args) {
    const r = await ai(`Give 5 legal tax-saving strategies for individuals. Explain each briefly and who benefits most.`);
    await reply(sock, msg, `*📋 Tax Saving Ideas*\n\n${r}`);
  },
  async moneytip(sock, msg, args) {
    const r = await ai(`Give 5 underrated money saving tips that most people overlook. Make them practical and specific.`);
    await reply(sock, msg, `*💡 Money Tips*\n\n${r}`);
  },
  async frugal(sock, msg, args) {
    const r = await ai(`Share 5 frugal living tips for cutting expenses without sacrificing quality of life.`);
    await reply(sock, msg, `*🛒 Frugal Living*\n\n${r}`);
  },
  async sidehustle(sock, msg, args) {
    const skill = args.join(' ') || 'general';
    const r = await ai(`Suggest 5 profitable side hustles for someone with ${skill} skills. Include earning potential and how to start.`);
    await reply(sock, msg, `*💼 Side Hustle Ideas*\n\n${r}`);
  },
  async passiveincome(sock, msg, args) {
    const r = await ai(`List 5 realistic passive income ideas with startup costs and expected returns. Be honest about time and effort required.`);
    await reply(sock, msg, `*💤 Passive Income*\n\n${r}`);
  },
  async creditcard(sock, msg, args) {
    const r = await ai(`Give 5 smart credit card tips — how to maximize rewards, avoid fees, and build credit score.`);
    await reply(sock, msg, `*💳 Credit Card Tips*\n\n${r}`);
  },
  async loan(sock, msg, args) {
    const type = args.join(' ') || 'personal loan';
    const r = await ai(`Explain ${type} — how it works, interest rates, and tips for getting approved. What to avoid?`);
    await reply(sock, msg, `*🏦 Loan Advice*\n\n${r}`);
  },
  async insurance(sock, msg, args) {
    const type = args.join(' ') || 'general insurance';
    const r = await ai(`Explain ${type} in simple terms. What coverage is essential and what's a waste of money?`);
    await reply(sock, msg, `*🛡️ Insurance Basics*\n\n${r}`);
  },
  async compound(sock, msg, args) {
    const r = await ai(`Explain compound interest with a real example showing how $1,000 grows over 10, 20, and 30 years at 8% annual return.`);
    await reply(sock, msg, `*📈 Compound Interest*\n\n${r}`);
  },
  async dividends(sock, msg, args) {
    const r = await ai(`Explain dividend investing — what dividends are, how to find good dividend stocks, and realistic income expectations.`);
    await reply(sock, msg, `*💰 Dividend Investing*\n\n${r}`);
  },
  async realestate(sock, msg, args) {
    const r = await ai(`Give real estate investment tips for beginners. Cover REITs, rental properties, and house flipping pros and cons.`);
    await reply(sock, msg, `*🏠 Real Estate Tips*\n\n${r}`);
  },
  async portfolio(sock, msg, args) {
    const risk = args.join(' ') || 'moderate risk';
    const r = await ai(`Design a ${risk} investment portfolio. Include asset allocation percentages and explain each component.`);
    await reply(sock, msg, `*📊 Portfolio Design*\n\n${r}`);
  },
  async tradingterms(sock, msg, args) {
    const term = args.join(' ') || 'trading basics';
    const r = await ai(`Explain these trading concepts: ${term}. Use simple language and real examples.`);
    await reply(sock, msg, `*📖 Trading Terms*\n\n${r}`);
  },
  async inflation(sock, msg, args) {
    const r = await ai(`Explain inflation in simple terms — what causes it, how it affects daily life, and how to protect your money from it.`);
    await reply(sock, msg, `*📉 Inflation Explained*\n\n${r}`);
  },
  async interestrate(sock, msg, args) {
    const r = await ai(`Explain how interest rate changes by central banks affect the economy, investments, and everyday people.`);
    await reply(sock, msg, `*🏛️ Interest Rates*\n\n${r}`);
  },
  async gdp(sock, msg, args) {
    const country = args.join(' ') || 'the world';
    const r = await ai(`Explain GDP and its importance for ${country}. What makes a country's economy grow?`);
    await reply(sock, msg, `*📊 GDP Explained*\n\n${r}`);
  },
  async forex(sock, msg, args) {
    const pair = args.join(' ') || 'currency trading';
    const r = await ai(`Explain forex trading basics for beginners. Cover ${pair}, how currency pairs work, and key risks.`);
    await reply(sock, msg, `*💱 Forex Trading*\n\n${r}`);
  },
  async gold(sock, msg, args) {
    const r = await ai(`Explain gold as an investment — why people buy gold, different ways to invest, and historical performance vs stocks.`);
    await reply(sock, msg, `*🥇 Gold Investment*\n\n${r}`);
  },
  async etf(sock, msg, args) {
    const r = await ai(`Explain ETFs (Exchange-Traded Funds) — how they work, benefits over mutual funds, and popular ETF types for beginners.`);
    await reply(sock, msg, `*📦 ETF Explained*\n\n${r}`);
  },
  async mutualfund(sock, msg, args) {
    const r = await ai(`Explain mutual funds — how they work, types (growth/balanced/debt), and how to choose one for beginners.`);
    await reply(sock, msg, `*🏦 Mutual Funds*\n\n${r}`);
  },
  async emergency(sock, msg, args) {
    const r = await ai(`Explain the importance of an emergency fund. How much should you save, where to keep it, and how to build it fast?`);
    await reply(sock, msg, `*🆘 Emergency Fund*\n\n${r}`);
  },
  async networth(sock, msg, args) {
    const r = await ai(`Explain net worth — how to calculate it, what's considered good at different ages, and how to increase it over time.`);
    await reply(sock, msg, `*💎 Net Worth*\n\n${r}`);
  },
  async cashflow(sock, msg, args) {
    const r = await ai(`Explain cash flow management — the difference between income and wealth, and 5 ways to improve your monthly cash flow.`);
    await reply(sock, msg, `*💧 Cash Flow*\n\n${r}`);
  },
  async leverage(sock, msg, args) {
    const r = await ai(`Explain financial leverage — how businesses and investors use it, the risks involved, and real examples.`);
    await reply(sock, msg, `*⚖️ Financial Leverage*\n\n${r}`);
  },
  async bond(sock, msg, args) {
    const r = await ai(`Explain bonds for beginners — types (government/corporate/municipal), how they work, and when to invest in them.`);
    await reply(sock, msg, `*📜 Bond Market*\n\n${r}`);
  },
  async ipo(sock, msg, args) {
    const company = args.join(' ') || 'a company';
    const r = await ai(`Explain what an IPO is. Should retail investors buy ${company} at IPO? What are the risks and opportunities?`);
    await reply(sock, msg, `*🚀 IPO Basics*\n\n${r}`);
  },
  async fintech(sock, msg, args) {
    const r = await ai(`Explain fintech — major innovations changing finance (digital payments, neobanks, robo-advisors, BNPL) and their impact.`);
    await reply(sock, msg, `*📱 Fintech Facts*\n\n${r}`);
  },
  async stablecoin(sock, msg, args) {
    const r = await ai(`Explain stablecoins — what they are, types (USDT, USDC, DAI), and why they matter in crypto.`);
    await reply(sock, msg, `*🪙 Stablecoins*\n\n${r}`);
  },
  async blockchain(sock, msg, args) {
    const r = await ai(`Explain blockchain technology simply — how it works, why it's secure, and real-world uses beyond crypto.`);
    await reply(sock, msg, `*⛓️ Blockchain*\n\n${r}`);
  },
  async cbdc(sock, msg, args) {
    const r = await ai(`Explain CBDCs (Central Bank Digital Currencies) — what they are, which countries are launching them, and why they matter.`);
    await reply(sock, msg, `*🏛️ CBDC Explained*\n\n${r}`);
  },
  async wallet(sock, msg, args) {
    const r = await ai(`Explain crypto wallet types — hot vs cold wallets, hardware wallets, and best practices for securing your crypto.`);
    await reply(sock, msg, `*👛 Crypto Wallets*\n\n${r}`);
  },
  async exchange(sock, msg, args) {
    const r = await ai(`Compare centralized vs decentralized crypto exchanges. What are the pros and cons of each? How to choose?`);
    await reply(sock, msg, `*🔄 Crypto Exchanges*\n\n${r}`);
  },
  async stocktip(sock, msg, args) {
    const r = await ai(`Give 5 tips for analyzing stocks before investing. Cover P/E ratio, earnings, debt, moat, and management quality.`);
    await reply(sock, msg, `*📊 Stock Analysis Tips*\n\n${r}`);
  },
  async moneygoal(sock, msg, args) {
    const goal = args.join(' ') || 'financial freedom';
    const r = await ai(`Create a realistic financial plan to achieve: ${goal}. Break it into monthly and yearly milestones.`);
    await reply(sock, msg, `*🎯 Money Goal Plan*\n\n${r}`);
  },
  async econofact(sock, msg, args) {
    const r = await ai(`Share a surprising economic fact that most people don't know. Make it interesting and educational.`);
    await reply(sock, msg, `*🌍 Economic Fact*\n\n${r}`);
  },
  async wealthmind(sock, msg, args) {
    const r = await ai(`Explain the wealth mindset — key mental shifts that separate wealthy people from everyone else. Be practical.`);
    await reply(sock, msg, `*🧠 Wealth Mindset*\n\n${r}`);
  },
  async moneyquiz(sock, msg, args) {
    const r = await ai(`Create a 3-question financial literacy quiz with A/B/C options. Reveal answers at the end. Medium difficulty.`);
    await reply(sock, msg, `*🧠 Money Quiz*\n\n${r}`);
  },
};

module.exports = financeCommands;
