'use strict';

const pollinations = require('../lib/pollinations');

async function aiGen(system, user) {
  return pollinations.textGenerate([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}

function send(sock, jid, msg, text) {
  return sock.sendMessage(jid, { text }, { quoted: msg });
}

function box(title, content, footer = '') {
  return `╭━━━〔 ${title} 〕━━━⬣\n\n${content}\n\n╰━━━━━━━━━━━━━━━━━━⬣${footer ? '\n\n' + footer : ''}`;
}

const lifestyleCommands = {

  async recipe2(sock, msg, args) {
    const ingredients = args.join(' ') || 'chicken, rice, garlic';
    await send(sock, msg.key.remoteJid, msg, '🍳 _Finding the perfect recipe..._');
    const r = await aiGen('You are a professional chef. Create a detailed recipe using these ingredients. Include: Dish name, Prep time, Cook time, Servings, Ingredients list (with measurements), Step-by-step instructions, and a Pro tip. WhatsApp formatting, *bold* headers.', `Ingredients: ${ingredients}`);
    await send(sock, msg.key.remoteJid, msg, box('🍳 RECIPE', r));
  },

  async cocktail(sock, msg, args) {
    const vibe = args.join(' ') || 'something refreshing';
    await send(sock, msg.key.remoteJid, msg, '🍹 _Mixing your cocktail..._');
    const r = await aiGen('You are a world-class bartender. Create a cocktail recipe. Include: Cocktail name, Difficulty, Ingredients (with measurements), Method, Glass type, Garnish, and a fun backstory. WhatsApp formatting, *bold* headers.', `Vibe: ${vibe}`);
    await send(sock, msg.key.remoteJid, msg, box('🍹 COCKTAIL', r));
  },

  async coffee(sock, msg, args) {
    const style = args.join(' ') || 'strong and sweet';
    await send(sock, msg.key.remoteJid, msg, '☕ _Brewing your perfect coffee..._');
    const r = await aiGen('You are a master barista. Create a coffee drink recipe. Include: Drink name, Ingredients, Method, Tips for perfect extraction, and pairing suggestion. WhatsApp formatting.', `Style preference: ${style}`);
    await send(sock, msg.key.remoteJid, msg, box('☕ COFFEE RECIPE', r));
  },

  async snack(sock, msg, args) {
    const craving = args.join(' ') || 'something quick and healthy';
    await send(sock, msg.key.remoteJid, msg, '🍿 _Finding the perfect snack..._');
    const r = await aiGen('Suggest 3 snack ideas with quick recipes. For each: Name, 3-4 ingredients, 3-step preparation, nutrition benefit. WhatsApp formatting, *bold* snack names.', `Craving: ${craving}`);
    await send(sock, msg.key.remoteJid, msg, box('🍿 SNACK IDEAS', r));
  },

  async mealplan(sock, msg, args) {
    const goal = args.join(' ') || 'balanced and healthy';
    await send(sock, msg.key.remoteJid, msg, '🥗 _Creating your meal plan..._');
    const r = await aiGen('Create a 3-day meal plan. For each day show: Breakfast, Lunch, Dinner, and one Snack. Include estimated calories for each meal. Keep it practical and realistic. WhatsApp formatting, *bold* day headers.', `Goal: ${goal}`);
    await send(sock, msg.key.remoteJid, msg, box('🥗 3-DAY MEAL PLAN', r));
  },

  async meditation(sock, msg, args) {
    const duration = args[0] || '5';
    const focus = args.slice(1).join(' ') || 'calm and clarity';
    await send(sock, msg.key.remoteJid, msg, '🧘 _Preparing your meditation..._');
    const r = await aiGen(`Write a guided ${duration}-minute meditation script for ${focus}. Include: Opening breathing exercise, body scan or visualization, main practice, and gentle close. Use calming language. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg, box('🧘 GUIDED MEDITATION', r, '_Find a quiet, comfortable space 🕯️_'));
  },

  async affirmation(sock, msg, args) {
    const area = args.join(' ') || 'self-confidence and success';
    await send(sock, msg.key.remoteJid, msg, '✨ _Crafting your affirmations..._');
    const r = await aiGen('Write 7 powerful, specific daily affirmations for this area. Each should be in present tense, positive, personal, and believable. Number them. Add a brief instruction on how to use them. WhatsApp formatting.', `Area: ${area}`);
    await send(sock, msg.key.remoteJid, msg, box('✨ DAILY AFFIRMATIONS', r));
  },

  async breathing(sock, msg, args) {
    const type = args.join(' ') || '4-7-8 breathing';
    await send(sock, msg.key.remoteJid, msg, '🌬️ _Preparing breathing exercise..._');
    const r = await aiGen('Explain a breathing technique in detail. Include: Name, Pattern (inhale/hold/exhale counts), How to do it step-by-step, Benefits, Best time to use it, and duration. WhatsApp formatting.', `Technique: ${type}`);
    await send(sock, msg.key.remoteJid, msg, box('🌬️ BREATHING EXERCISE', r));
  },

  async workout(sock, msg, args) {
    const goal = args.join(' ') || 'full body beginner workout';
    await send(sock, msg.key.remoteJid, msg, '💪 _Building your workout..._');
    const r = await aiGen('Design a workout routine. Include: Warm-up (5 min), Main workout (list exercises with sets/reps/rest), Cool-down (5 min), total time, equipment needed, and a progression tip. WhatsApp formatting, *bold* sections.', `Goal: ${goal}`);
    await send(sock, msg.key.remoteJid, msg, box('💪 WORKOUT ROUTINE', r));
  },

  async diet2(sock, msg, args) {
    const goal = args.join(' ') || 'lose weight healthily';
    await send(sock, msg.key.remoteJid, msg, '🥦 _Creating diet advice..._');
    const r = await aiGen('Provide evidence-based dietary advice for this goal. Include: Key principles, Foods to prioritize, Foods to minimize, Simple rule of thumb, Common mistakes to avoid, and a realistic timeline. WhatsApp formatting.', `Goal: ${goal}`);
    await send(sock, msg.key.remoteJid, msg, box('🥦 DIET ADVICE', r));
  },

  async sleeptips(sock, msg, args) {
    const issue = args.join(' ') || 'trouble falling asleep';
    await send(sock, msg.key.remoteJid, msg, '😴 _Preparing sleep tips..._');
    const r = await aiGen('Provide practical, science-backed sleep improvement advice for this issue. Include: Root causes, Evening routine (3 steps), Sleep environment tips, What to avoid, and a quick technique to try tonight. WhatsApp formatting.', `Issue: ${issue}`);
    await send(sock, msg.key.remoteJid, msg, box('😴 SLEEP TIPS', r));
  },

  async anxietyhelp(sock, msg, args) {
    const situation = args.join(' ') || 'general anxiety';
    await send(sock, msg.key.remoteJid, msg, '🫁 _Preparing anxiety relief..._');
    const r = await aiGen('Provide compassionate, practical anxiety management techniques for this situation. Include: Immediate grounding technique (5-4-3-2-1 or similar), Breathing exercise, Cognitive reframe, Long-term habits, and a reminder that seeking professional help is okay. WhatsApp formatting.', `Situation: ${situation}`);
    await send(sock, msg.key.remoteJid, msg, box('💙 ANXIETY RELIEF', r, '_You are stronger than you feel 💙_'));
  },

  async focus(sock, msg, args) {
    const context = args.join(' ') || 'studying or deep work';
    await send(sock, msg.key.remoteJid, msg, '🎯 _Building your focus plan..._');
    const r = await aiGen('Provide a practical focus enhancement guide for this context. Include: Environment setup, Technique (Pomodoro or similar), Digital distraction control, Mental warm-up routine, and what to do when focus breaks. WhatsApp formatting.', `Context: ${context}`);
    await send(sock, msg.key.remoteJid, msg, box('🎯 FOCUS GUIDE', r));
  },

  async productivity(sock, msg, args) {
    const challenge = args.join(' ') || 'general productivity';
    await send(sock, msg.key.remoteJid, msg, '⚡ _Creating productivity system..._');
    const r = await aiGen('Design a practical productivity system for this challenge. Include: Morning routine (15 min), Priority framework, Time-blocking approach, Energy management tips, and an evening review habit. WhatsApp formatting, *bold* sections.', `Challenge: ${challenge}`);
    await send(sock, msg.key.remoteJid, msg, box('⚡ PRODUCTIVITY SYSTEM', r));
  },

  async mindfulness(sock, msg, args) {
    const duration = parseInt(args[0]) || 3;
    await send(sock, msg.key.remoteJid, msg, '🧠 _Preparing mindfulness exercise..._');
    const r = await aiGen(`Write a ${duration}-minute mindfulness exercise. Include grounding, present-moment awareness, body sensation noticing, and gentle return. Use calming, clear instructions. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg, box('🧠 MINDFULNESS', r));
  },

  async gratitude(sock, msg, args) {
    const theme = args.join(' ') || 'today and my life';
    await send(sock, msg.key.remoteJid, msg, '🙏 _Creating gratitude prompts..._');
    const r = await aiGen('Generate 5 deep, thoughtful gratitude journal prompts for this theme. Each should encourage genuine reflection, not surface-level responses. Include a "why it matters" for each. WhatsApp formatting, number each prompt.', `Theme: ${theme}`);
    await send(sock, msg.key.remoteJid, msg, box('🙏 GRATITUDE PROMPTS', r));
  },

  async birthday2(sock, msg, args) {
    const name = args.join(' ') || 'someone special';
    await send(sock, msg.key.remoteJid, msg, '🎂 _Writing birthday message..._');
    const r = await aiGen('Write a warm, heartfelt birthday message that feels personal and genuine. Include a reflection on who they are, what they mean, a wish for their year ahead, and a closing. Not too long. WhatsApp formatting.', `For: ${name}`);
    await send(sock, msg.key.remoteJid, msg, box('🎂 BIRTHDAY MESSAGE', r));
  },

  async anniversary(sock, msg, args) {
    const milestone = args.join(' ') || 'first anniversary';
    await send(sock, msg.key.remoteJid, msg, '💞 _Writing anniversary message..._');
    const r = await aiGen('Write a romantic, heartfelt anniversary message. Reflect on the journey, celebrate growth together, and express excitement for what lies ahead. Make it personal and touching. WhatsApp formatting.', `Milestone: ${milestone}`);
    await send(sock, msg.key.remoteJid, msg, box('💞 ANNIVERSARY MESSAGE', r));
  },

  async congratz(sock, msg, args) {
    const achievement = args.join(' ') || 'a major achievement';
    await send(sock, msg.key.remoteJid, msg, '🎉 _Writing congratulations..._');
    const r = await aiGen('Write a genuine, enthusiastic congratulations message. Acknowledge the specific achievement, recognize the effort behind it, express pride/joy, and wish them continued success. WhatsApp formatting.', `Achievement: ${achievement}`);
    await send(sock, msg.key.remoteJid, msg, box('🎉 CONGRATULATIONS', r));
  },

  async condolences(sock, msg, args) {
    const situation = args.join(' ') || 'loss of a loved one';
    await send(sock, msg.key.remoteJid, msg, '🕊️ _Writing condolences..._');
    const r = await aiGen('Write a compassionate, sensitive condolences message. Acknowledge the pain, offer genuine empathy (not clichés), share a comforting thought, and offer support. Keep it gentle and heartfelt. WhatsApp formatting.', `Situation: ${situation}`);
    await send(sock, msg.key.remoteJid, msg, box('🕊️ CONDOLENCES', r));
  },

  async selfcare(sock, msg, args) {
    const timeframe = args.join(' ') || 'this evening';
    await send(sock, msg.key.remoteJid, msg, '🛁 _Building self-care routine..._');
    const r = await aiGen('Create a practical self-care routine for this timeframe. Include: Physical care, Mental care, Emotional care, and optional Digital detox element. Keep it realistic and accessible. WhatsApp formatting, *bold* categories.', `Timeframe: ${timeframe}`);
    await send(sock, msg.key.remoteJid, msg, box('🛁 SELF-CARE ROUTINE', r, '_You deserve this time 🌸_'));
  },

  async fitness(sock, msg, args) {
    const level = args.join(' ') || 'beginner fitness tip';
    await send(sock, msg.key.remoteJid, msg, '🏋️ _Getting fitness advice..._');
    const r = await aiGen('Give one powerful, science-backed fitness tip for this level. Explain why it works, how to implement it today, common mistakes to avoid, and expected results timeline. WhatsApp formatting.', `For: ${level}`);
    await send(sock, msg.key.remoteJid, msg, box('🏋️ FITNESS TIP', r));
  },

  async journal(sock, msg, args) {
    const mood = args.join(' ') || 'today\'s reflections';
    await send(sock, msg.key.remoteJid, msg, '📓 _Creating journal prompts..._');
    const r = await aiGen('Generate 5 meaningful journal prompts for this mood/theme. Each should encourage deep self-reflection. Include prompts about feelings, actions, learnings, and future intentions. WhatsApp formatting, number each.', `Mood/Theme: ${mood}`);
    await send(sock, msg.key.remoteJid, msg, box('📓 JOURNAL PROMPTS', r));
  },

  async bucket(sock, msg, args) {
    const theme = args.join(' ') || 'adventure and experiences';
    await send(sock, msg.key.remoteJid, msg, '🪣 _Creating bucket list..._');
    const r = await aiGen('Generate a creative bucket list of 15 items for this theme. Include a mix of: Easy (do this week), Medium (this year), and Epic (lifetime goal). Make them specific and inspiring. WhatsApp formatting, use ☐ for each item.', `Theme: ${theme}`);
    await send(sock, msg.key.remoteJid, msg, box('🪣 BUCKET LIST', r));
  },

  async resolutions(sock, msg, args) {
    const focus = args.join(' ') || 'health, career, and relationships';
    await send(sock, msg.key.remoteJid, msg, '📋 _Creating resolutions..._');
    const r = await aiGen('Create 9 SMART resolutions (3 for each area mentioned). For each: State the goal, why it matters, first action step, and how to track it. Make them achievable and specific. WhatsApp formatting, *bold* category headers.', `Focus areas: ${focus}`);
    await send(sock, msg.key.remoteJid, msg, box('📋 RESOLUTIONS', r));
  },

  async posture(sock, msg, args) {
    await send(sock, msg.key.remoteJid, msg, '🧍 _Getting posture tips..._');
    const r = await aiGen('Provide practical posture improvement advice for someone who sits at a desk/phone a lot. Include: Quick posture check, 3 exercises (with how-to), workstation tips, and a posture reminder habit. WhatsApp formatting.', '');
    await send(sock, msg.key.remoteJid, msg, box('🧍 POSTURE GUIDE', r));
  },

  async eyeexercise(sock, msg, args) {
    await send(sock, msg.key.remoteJid, msg, '👁️ _Preparing eye exercises..._');
    const r = await aiGen('Provide a 5-minute eye exercise routine for screen users. Include: 20-20-20 rule, eye rolling, focusing exercises, palming technique, and anti-eye-strain tips. WhatsApp formatting, number each exercise.', '');
    await send(sock, msg.key.remoteJid, msg, box('👁️ EYE EXERCISES', r, '_Take care of your eyes 👁️_'));
  },

  async stretch(sock, msg, args) {
    const area = args.join(' ') || 'full body';
    await send(sock, msg.key.remoteJid, msg, '🤸 _Creating stretch routine..._');
    const r = await aiGen('Create a 10-minute stretching routine for this area. List 6-8 stretches with: name, duration, which muscles targeted, and how to do it correctly. Include safety notes. WhatsApp formatting.', `Area: ${area}`);
    await send(sock, msg.key.remoteJid, msg, box('🤸 STRETCH ROUTINE', r));
  },

  async skincare(sock, msg, args) {
    const skintype = args.join(' ') || 'normal skin';
    await send(sock, msg.key.remoteJid, msg, '✨ _Building skincare routine..._');
    const r = await aiGen('Create a skincare routine for this skin type. Include: Morning routine (5 steps), Evening routine (5 steps), Weekly treatments, Key ingredients to look for, Ingredients to avoid, and lifestyle tips. WhatsApp formatting, *bold* sections.', `Skin type: ${skintype}`);
    await send(sock, msg.key.remoteJid, msg, box('✨ SKINCARE ROUTINE', r));
  },

  async hydration(sock, msg, args) {
    await send(sock, msg.key.remoteJid, msg, '💧 _Hydration check..._');
    const weight = args[0] ? `${args[0]}kg` : 'average person';
    const r = await aiGen(`Calculate optimal daily water intake for ${weight} and create a hydration schedule. Include: Daily target, hourly breakdown, signs of dehydration, hydration hacks, and best drinks for hydration. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg, box('💧 HYDRATION GUIDE', r));
  },

  async stressrelief(sock, msg, args) {
    const level = args.join(' ') || 'moderate stress';
    await send(sock, msg.key.remoteJid, msg, '🌊 _Creating stress relief plan..._');
    const r = await aiGen('Provide an immediate stress relief plan for this level. Include: Instant relief technique (do right now), Short-term strategies (next hour), Daily habits, and when to seek help. WhatsApp formatting.', `Stress level: ${level}`);
    await send(sock, msg.key.remoteJid, msg, box('🌊 STRESS RELIEF', r));
  },

  async morningroutine(sock, msg, args) {
    const duration = args.join(' ') || '30 minutes';
    await send(sock, msg.key.remoteJid, msg, '☀️ _Designing morning routine..._');
    const r = await aiGen(`Design an optimal ${duration} morning routine. Include: Wake-up ritual, Body movement, Mental priming, Nutrition, and Preparation for the day. Time-block each activity. WhatsApp formatting, *bold* sections.`, '');
    await send(sock, msg.key.remoteJid, msg, box('☀️ MORNING ROUTINE', r));
  },

  async eveningroutine(sock, msg, args) {
    const goal = args.join(' ') || 'wind down and sleep well';
    await send(sock, msg.key.remoteJid, msg, '🌙 _Designing evening routine..._');
    const r = await aiGen(`Design an optimal evening routine to ${goal}. Include: Digital wind-down, Reflection practice, Body care, Sleep preparation, and mindset close. Time each step. WhatsApp formatting.`, '');
    await send(sock, msg.key.remoteJid, msg, box('🌙 EVENING ROUTINE', r));
  },
};

module.exports = lifestyleCommands;
