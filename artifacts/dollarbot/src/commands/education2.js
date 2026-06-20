'use strict';
const pollinations = require('../lib/pollinations');

async function ai(prompt) {
  return await pollinations.textGenerate([{ role: 'user', content: prompt }]);
}
async function reply(sock, msg, text) {
  await sock.sendMessage(msg.key.remoteJid, { text: text || '❌ Try again.' }, { quoted: msg });
}

const education2Commands = {
  async explain(sock, msg, args) {
    if (!args.length) return reply(sock, msg, '❌ Usage: .explain <concept>');
    const concept = args.join(' ');
    const r = await ai(`Explain "${concept}" as if you're talking to a smart 12-year-old. Use a simple analogy and real examples. Keep it under 150 words.`);
    await reply(sock, msg, `*📖 Explained: ${concept}*\n\n${r}`);
  },
  async define(sock, msg, args) {
    if (!args.length) return reply(sock, msg, '❌ Usage: .define <word>');
    const word = args.join(' ');
    const r = await ai(`Define "${word}" in a clear way. Include: 1) Simple definition, 2) Part of speech, 3) Example sentence, 4) Synonyms.`);
    await reply(sock, msg, `*📚 Definition: ${word}*\n\n${r}`);
  },
  async synonym(sock, msg, args) {
    if (!args.length) return reply(sock, msg, '❌ Usage: .synonym <word>');
    const word = args.join(' ');
    const r = await ai(`List 8 synonyms for "${word}" with nuances — explain when to use each one differently.`);
    await reply(sock, msg, `*📝 Synonyms: ${word}*\n\n${r}`);
  },
  async antonym(sock, msg, args) {
    if (!args.length) return reply(sock, msg, '❌ Usage: .antonym <word>');
    const word = args.join(' ');
    const r = await ai(`List 5 antonyms for "${word}" and explain the difference in meaning between each.`);
    await reply(sock, msg, `*🔄 Antonyms: ${word}*\n\n${r}`);
  },
  async etymology(sock, msg, args) {
    if (!args.length) return reply(sock, msg, '❌ Usage: .etymology <word>');
    const word = args.join(' ');
    const r = await ai(`Explain the etymology of "${word}" — its language of origin, root meaning, and how its usage evolved over time.`);
    await reply(sock, msg, `*🏛️ Etymology: ${word}*\n\n${r}`);
  },
  async grammar(sock, msg, args) {
    const topic = args.join(' ') || 'common grammar mistakes';
    const r = await ai(`Explain the grammar rule for: "${topic}". Give 3 correct examples and 3 incorrect examples. Keep it practical.`);
    await reply(sock, msg, `*✏️ Grammar Tip*\n\n${r}`);
  },
  async punctuation(sock, msg, args) {
    const mark = args.join(' ') || 'comma usage';
    const r = await ai(`Explain the rules for using ${mark} correctly. Give 5 examples showing correct vs incorrect usage.`);
    await reply(sock, msg, `*📌 Punctuation: ${mark}*\n\n${r}`);
  },
  async vocab(sock, msg, args) {
    const r = await ai(`Give me a "Word of the Day" — pick an advanced vocabulary word, define it clearly, show 3 usage examples, and explain origin.`);
    await reply(sock, msg, `*🔤 Vocabulary Word*\n\n${r}`);
  },
  async summarize2(sock, msg, args) {
    if (!args.length) return reply(sock, msg, '❌ Usage: .summarize2 <text to summarize>');
    const text = args.join(' ');
    const r = await ai(`Summarize the following text in 3 bullet points. Extract key ideas and most important information:\n\n"${text}"`);
    await reply(sock, msg, `*📋 Summary*\n\n${r}`);
  },
  async studytips(sock, msg, args) {
    const subject = args.join(' ') || 'any subject';
    const r = await ai(`Give 5 proven study techniques for ${subject}. Include active recall, spaced repetition, and focus strategies.`);
    await reply(sock, msg, `*📚 Study Tips*\n\n${r}`);
  },
  async memorytips(sock, msg, args) {
    const r = await ai(`Explain 5 powerful memory techniques — memory palace, chunking, association, repetition, and visualization. How to use each.`);
    await reply(sock, msg, `*🧠 Memory Techniques*\n\n${r}`);
  },
  async flashcard2(sock, msg, args) {
    if (!args.length) return reply(sock, msg, '❌ Usage: .flashcard2 <topic>');
    const topic = args.join(' ');
    const r = await ai(`Create 5 flashcard-style Q&A pairs for studying: ${topic}. Format as Q: [question] / A: [answer] for each.`);
    await reply(sock, msg, `*🃏 Flashcards: ${topic}*\n\n${r}`);
  },
  async mindmap(sock, msg, args) {
    const topic = args.join(' ') || 'learning';
    const r = await ai(`Create a text-based mind map for: "${topic}". Show the central idea, 4 main branches, and 2-3 sub-ideas per branch.`);
    await reply(sock, msg, `*🗺️ Mind Map: ${topic}*\n\n${r}`);
  },
  async debate3(sock, msg, args) {
    const topic = args.join(' ') || 'social media vs mental health';
    const r = await ai(`Give strong arguments FOR and AGAINST: "${topic}". Present 3 points per side with evidence. Stay balanced.`);
    await reply(sock, msg, `*⚖️ Debate: ${topic}*\n\n${r}`);
  },
  async essay(sock, msg, args) {
    const topic = args.join(' ') || 'technology and society';
    const r = await ai(`Write a brief 3-paragraph essay outline for: "${topic}". Include intro hook, 2 body arguments, and conclusion approach.`);
    await reply(sock, msg, `*📝 Essay Outline: ${topic}*\n\n${r}`);
  },
  async thesis(sock, msg, args) {
    const topic = args.join(' ') || 'climate change';
    const r = await ai(`Write 3 strong thesis statements for an essay about: "${topic}". Each should be arguable, specific, and clear.`);
    await reply(sock, msg, `*🎓 Thesis Statements*\n\n${r}`);
  },
  async citation(sock, msg, args) {
    const format = args.join(' ') || 'APA';
    const r = await ai(`Explain ${format} citation format with examples for: website, book, journal article, and YouTube video.`);
    await reply(sock, msg, `*📚 Citation Format: ${format}*\n\n${r}`);
  },
  async research(sock, msg, args) {
    const topic = args.join(' ') || 'academic research';
    const r = await ai(`Give a 5-step research strategy for: "${topic}". Cover finding sources, evaluating credibility, note-taking, and structuring findings.`);
    await reply(sock, msg, `*🔍 Research Tips*\n\n${r}`);
  },
  async criticalthink(sock, msg, args) {
    const r = await ai(`Give a critical thinking exercise — present a scenario with a logical fallacy or bias hidden in it. Ask the reader to find it.`);
    await reply(sock, msg, `*🧠 Critical Thinking*\n\n${r}`);
  },
  async problemsolve(sock, msg, args) {
    const problem = args.join(' ') || 'general problem';
    const r = await ai(`Apply the 5-step problem-solving framework to: "${problem}". (Define → Analyze → Generate solutions → Choose → Implement)`);
    await reply(sock, msg, `*🔧 Problem Solving*\n\n${r}`);
  },
  async creativity2(sock, msg, args) {
    const r = await ai(`Give 5 unconventional exercises to boost creativity — based on psychology research. Explain how each unlocks new thinking.`);
    await reply(sock, msg, `*✨ Creativity Boost*\n\n${r}`);
  },
  async leadership2(sock, msg, args) {
    const style = args.join(' ') || 'effective leadership';
    const r = await ai(`Explain ${style} with 5 key principles. Include real examples of leaders who demonstrated this style.`);
    await reply(sock, msg, `*👑 Leadership*\n\n${r}`);
  },
  async communication2(sock, msg, args) {
    const r = await ai(`Give 5 advanced communication skills that make people instantly more persuasive and likeable. Be specific and practical.`);
    await reply(sock, msg, `*💬 Communication Skills*\n\n${r}`);
  },
  async publicspeaking(sock, msg, args) {
    const r = await ai(`Give 5 public speaking tips that reduce anxiety and boost confidence. Include body language, pacing, and engagement techniques.`);
    await reply(sock, msg, `*🎤 Public Speaking*\n\n${r}`);
  },
  async timemanage(sock, msg, args) {
    const r = await ai(`Give 5 time management techniques backed by research. Cover Pomodoro, time blocking, priority matrix, and context batching.`);
    await reply(sock, msg, `*⏰ Time Management*\n\n${r}`);
  },
  async goalset(sock, msg, args) {
    const goal = args.join(' ') || 'personal development';
    const r = await ai(`Help set SMART goals for: "${goal}". Create a specific, measurable, achievable, relevant, time-bound goal with milestones.`);
    await reply(sock, msg, `*🎯 Goal Setting*\n\n${r}`);
  },
  async careeradvice(sock, msg, args) {
    const field = args.join(' ') || 'general career growth';
    const r = await ai(`Give career advice for someone in ${field}. Cover skills to develop, networking, salary negotiation, and long-term strategy.`);
    await reply(sock, msg, `*💼 Career Advice*\n\n${r}`);
  },
  async collegetips(sock, msg, args) {
    const r = await ai(`Give 5 college survival tips that professors won't tell you — time management, studying smarter, networking, and mental health.`);
    await reply(sock, msg, `*🎓 College Tips*\n\n${r}`);
  },
  async examprep(sock, msg, args) {
    const exam = args.join(' ') || 'a major exam';
    const r = await ai(`Create a 7-day exam preparation plan for ${exam}. Include daily study hours, topics, breaks, and final-day tips.`);
    await reply(sock, msg, `*📅 Exam Prep Plan*\n\n${r}`);
  },
  async homework(sock, msg, args) {
    const subject = args.join(' ') || 'homework';
    const r = await ai(`Give 5 tips for completing ${subject} faster and more efficiently. Include focus techniques and when to take breaks.`);
    await reply(sock, msg, `*📖 Homework Tips*\n\n${r}`);
  },
  async scholarship(sock, msg, args) {
    const r = await ai(`Give tips for finding and winning scholarships — where to search, essay writing, deadlines, and what selection committees want.`);
    await reply(sock, msg, `*🎓 Scholarship Tips*\n\n${r}`);
  },
  async internship(sock, msg, args) {
    const field = args.join(' ') || 'any field';
    const r = await ai(`Give tips for landing a great internship in ${field} — where to apply, resume tips, interview prep, and standing out.`);
    await reply(sock, msg, `*💼 Internship Tips*\n\n${r}`);
  },
  async networking(sock, msg, args) {
    const r = await ai(`Give 5 networking tips for introverts and beginners — how to start conversations, follow up, and build genuine professional relationships.`);
    await reply(sock, msg, `*🤝 Networking Tips*\n\n${r}`);
  },
  async resume3(sock, msg, args) {
    const role = args.join(' ') || 'any job';
    const r = await ai(`Give a resume checklist for applying to ${role}. Cover format, keywords, achievements vs duties, and common mistakes.`);
    await reply(sock, msg, `*📄 Resume Tips*\n\n${r}`);
  },
  async linkedin(sock, msg, args) {
    const r = await ai(`Give 5 tips for an optimized LinkedIn profile that attracts recruiters. Cover headline, summary, experience, and networking approach.`);
    await reply(sock, msg, `*💼 LinkedIn Tips*\n\n${r}`);
  },
  async interview2(sock, msg, args) {
    const role = args.join(' ') || 'any job';
    const r = await ai(`Give 5 interview tips for ${role}. Include STAR method, questions to ask back, body language, and post-interview follow-up.`);
    await reply(sock, msg, `*🗣️ Interview Tips*\n\n${r}`);
  },
  async codingpath(sock, msg, args) {
    const goal = args.join(' ') || 'software developer';
    const r = await ai(`Create a 6-month learning roadmap to become a ${goal}. List languages, tools, projects, and free resources for each month.`);
    await reply(sock, msg, `*💻 Coding Roadmap*\n\n${r}`);
  },
  async mathtutor(sock, msg, args) {
    const concept = args.join(' ') || 'algebra basics';
    const r = await ai(`Teach ${concept} step by step with a worked example. Make it super clear for someone who struggles with math.`);
    await reply(sock, msg, `*➗ Math Tutor*\n\n${r}`);
  },
  async scienceexplain(sock, msg, args) {
    const concept = args.join(' ') || 'quantum physics';
    const r = await ai(`Explain ${concept} in the simplest possible way. Use an everyday analogy. Keep it under 120 words.`);
    await reply(sock, msg, `*🔬 Science Explained*\n\n${r}`);
  },
  async historyexplain(sock, msg, args) {
    const event = args.join(' ') || 'World War II causes';
    const r = await ai(`Explain ${event} concisely — causes, key events, and lasting impact. Keep it under 150 words.`);
    await reply(sock, msg, `*📜 History: ${event}*\n\n${r}`);
  },
  async arthistory(sock, msg, args) {
    const period = args.join(' ') || 'Renaissance art';
    const r = await ai(`Explain ${period} — key artists, famous works, style characteristics, and cultural context.`);
    await reply(sock, msg, `*🎨 Art History*\n\n${r}`);
  },
  async language2(sock, msg, args) {
    const lang = args.join(' ') || 'Spanish';
    const r = await ai(`Give 5 proven tips for learning ${lang} fast. Include immersion, spaced repetition, common pitfalls, and apps to use.`);
    await reply(sock, msg, `*🌐 Language Learning: ${lang}*\n\n${r}`);
  },
  async philosophy3(sock, msg, args) {
    const concept = args.join(' ') || 'free will';
    const r = await ai(`Explain the philosophical concept of "${concept}" — main positions, key thinkers, and why it matters in daily life.`);
    await reply(sock, msg, `*💭 Philosophy: ${concept}*\n\n${r}`);
  },
  async ethics(sock, msg, args) {
    const scenario = args.join(' ') || 'trolley problem';
    const r = await ai(`Present the ethical dilemma: "${scenario}". Explain different ethical frameworks (utilitarian, deontological, virtue) and their conclusions.`);
    await reply(sock, msg, `*⚖️ Ethics: ${scenario}*\n\n${r}`);
  },
  async logic(sock, msg, args) {
    const r = await ai(`Present a logic puzzle of medium difficulty. Give the puzzle, wait for them to think, then reveal the answer with explanation.`);
    await reply(sock, msg, `*🧩 Logic Puzzle*\n\n${r}`);
  },
  async iq2(sock, msg, args) {
    const r = await ai(`Create an IQ-style challenge question — pattern recognition, spatial reasoning, or verbal analogy. Give 4 options and reveal the answer.`);
    await reply(sock, msg, `*🧠 IQ Challenge*\n\n${r}`);
  },
  async riddle(sock, msg, args) {
    const difficulty = args.join(' ') || 'medium';
    const r = await ai(`Give a clever ${difficulty} riddle. Present it first, then after a blank line reveal the answer with explanation.`);
    await reply(sock, msg, `*🤔 Riddle*\n\n${r}`);
  },
  async funfact2(sock, msg, args) {
    const topic = args.join(' ') || 'science';
    const r = await ai(`Share a mind-blowing educational fact about ${topic} that sounds impossible but is completely true. Explain why it's real.`);
    await reply(sock, msg, `*🤯 Mind-Blowing Fact*\n\n${r}`);
  },
};

module.exports = education2Commands;
