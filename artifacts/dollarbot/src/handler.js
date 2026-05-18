const config = require('./config');
const store = require('./lib/store');
const userCommands = require('./commands/user');
const ownerCommands = require('./commands/owner');
const aiCommands = require('./commands/ai');
const funCommands = require('./commands/fun');
const utilityCommands = require('./commands/utility');
const gameCommands = require('./commands/games');
const groupCommands = require('./commands/group');

const LINK_REGEX = /(?:https?:\/\/|www\.|chat\.whatsapp\.com)[^\s]+/gi;

function getMenu() {
  return (
    `╭━━━〔 💵 𝐃𝐎𝐋𝐋𝐀𝐑𝐁𝐎𝐓 𝐕5 〕━━━⬣\n` +
    `┃ ✦ Owner : ${config.ownerName}\n` +
    `┃ ✦ Country : ${config.ownerCountry}\n` +
    `┃ ✦ Prefix : [ ${config.prefix} ]\n` +
    `┃ ✦ Mode : Public\n` +
    `┃ ✦ Platform : WhatsApp\n` +
    `┃ ✦ Engine : ${config.engine}\n` +
    `┃ ✦ Version : ${config.version}\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `«⚡ Developed By Dollar\n⚡ Powered By Cortex & Mera AI»\n\n` +
    `╭━━━〔 👤 USER COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .ping — Check bot speed\n` +
    `┃ ◇ .alive — Bot status & info\n` +
    `┃ ◇ .owner — Owner details\n` +
    `┃ ◇ .stats — Bot statistics\n` +
    `┃ ◇ .info — Bot information\n` +
    `┃ ◇ .details — Your user details\n` +
    `┃ ◇ .time — Current time/date\n` +
    `┃ ◇ .jid — Your JID\n` +
    `┃ ◇ .runtime — Bot runtime\n` +
    `┃ ◇ .uptime — Bot uptime\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `╭━━━〔 🔐 OWNER COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .say <text> — Bot speaks\n` +
    `┃ ◇ .sendto <number> <msg> — DM number\n` +
    `┃ ◇ .react <emoji> — React to msg\n` +
    `┃ ◇ .delete — Delete replied msg\n` +
    `┃ ◇ .autoreply on/off — Toggle auto reply\n` +
    `┃ ◇ .vv — View view-once media\n` +
    `┃ ◇ .broadcast <msg> — Msg all groups\n` +
    `┃ ◇ .shutdown — Stop bot\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `╭━━━〔 🧠 AI COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .cortex <q> — Expert AI chat\n` +
    `┃ ◇ .mera <q> — Friendly female AI\n` +
    `┃ ◇ .codeai <q> — Programming AI\n` +
    `┃ ◇ .roast <name> — Savage roast\n` +
    `┃ ◇ .complimentai <name> — AI compliment\n` +
    `┃ ◇ .weather <city> — Weather report\n` +
    `┃ ◇ .imagine <prompt> — AI image gen\n` +
    `┃ ◇ .translate <text> — Translate text\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `╭━━━〔 🎭 FUN COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .joke — Random joke\n` +
    `┃ ◇ .dadjoke — Dad joke\n` +
    `┃ ◇ .fact — Random fact\n` +
    `┃ ◇ .advice — Daily advice\n` +
    `┃ ◇ .compliment — Sweet compliment\n` +
    `┃ ◇ .8ball <q> — Magic 8 ball\n` +
    `┃ ◇ .truth — Truth question\n` +
    `┃ ◇ .dare — Dare challenge\n` +
    `┃ ◇ .reverse <text> — Reverse text\n` +
    `┃ ◇ .hotcheck [name] — Hot %\n` +
    `┃ ◇ .smartcheck [name] — Smart %\n` +
    `┃ ◇ .brainlevel [name] — Brain level\n` +
    `┃ ◇ .coolcheck [name] — Cool %\n` +
    `┃ ◇ .lovecheck [name] — Love %\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `╭━━━〔 🛠️ UTILITY COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .calculate <expr> — Calculator\n` +
    `┃ ◇ .genpass [len] — Generate password\n` +
    `┃ ◇ .encode <text> — Base64 encode\n` +
    `┃ ◇ .decode <base64> — Base64 decode\n` +
    `┃ ◇ .qr <text/url> — Generate QR code\n` +
    `┃ ◇ .tinyurl <url> — Shorten URL\n` +
    `┃ ◇ .pingweb <url> — Ping a website\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `╭━━━〔 🎮 GAME COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .coin — Flip a coin\n` +
    `┃ ◇ .dice [sides] — Roll dice\n` +
    `┃ ◇ .rps <choice> — Rock Paper Scissors\n` +
    `┃ ◇ .math — Math challenge\n` +
    `┃ ◇ .guess — Number guessing game\n` +
    `┃ ◇ .slot — Slot machine\n` +
    `┃ ◇ .tictactoe <1-9> — Tic Tac Toe\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `╭━━━〔 👥 GROUP COMMANDS 〕━━━⬣\n` +
    `┃ ◇ .kick @user — Kick member\n` +
    `┃ ◇ .promote @user — Make admin\n` +
    `┃ ◇ .demote @user — Remove admin\n` +
    `┃ ◇ .mute — Mute group\n` +
    `┃ ◇ .unmute — Unmute group\n` +
    `┃ ◇ .tagall — Tag everyone\n` +
    `┃ ◇ .everyone <msg> — Tag all + msg\n` +
    `┃ ◇ .hidetag <msg> — Silent tag all\n` +
    `┃ ◇ .grouplink — Get invite link\n` +
    `┃ ◇ .groupinfo — Group details\n` +
    `┃ ◇ .antilink on/off — Anti-link toggle\n` +
    `┃ ◇ .welcome on/off — Welcome toggle\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `╭━━━〔 🚀 STATUS 〕━━━⬣\n` +
    `┃ DollarBot Online & Stable ✅\n` +
    `┃ AI Systems Operational ⚡\n` +
    `┃ Security Level : High 🔒\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `«💵 DollarBot V5 — Smart • Fast • Limitless»`
  );
}

async function handleMessage(sock, msg) {
  try {
    const jid = msg.key.remoteJid;
    if (!jid) return;

    const isGroup = jid.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
    const isOwner = sender === config.ownerJid || sender?.split('@')[0] === config.ownerNumber;

    const body =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      '';

    if (!body) return;

    const prefix = config.prefix;
    const isCommand = body.startsWith(prefix);

    if (!isCommand) {
      await handleNonCommand(sock, msg, body, jid, sender, isGroup, isOwner);
      return;
    }

    const [rawCmd, ...args] = body.slice(prefix.length).trim().split(/\s+/);
    const cmd = rawCmd.toLowerCase();

    let isAdmin = false;
    if (isGroup) {
      try {
        const meta = await sock.groupMetadata(jid);
        const me = sock.user?.id?.replace(/:.*@/, '@') || '';
        isAdmin = meta.participants.some(p => (p.id === me || p.id.split(':')[0] + '@s.whatsapp.net' === me) && p.admin);
      } catch (_) {}
    }

    await sock.readMessages([msg.key]);

    switch (cmd) {
      case 'menu': case 'help': case 'start':
        await sock.sendMessage(jid, { text: getMenu() });
        break;

      case 'ping': await userCommands.ping(sock, msg); break;
      case 'alive': await userCommands.alive(sock, msg); break;
      case 'owner': await userCommands.owner(sock, msg); break;
      case 'stats': await userCommands.stats(sock, msg); break;
      case 'info': await userCommands.info(sock, msg); break;
      case 'details': await userCommands.details(sock, msg, sender); break;
      case 'time': await userCommands.time(sock, msg); break;
      case 'jid': await userCommands.jid(sock, msg, sender); break;
      case 'runtime': await userCommands.runtime(sock, msg); break;
      case 'uptime': await userCommands.uptime(sock, msg); break;

      case 'say':
        if (!isOwner) return sock.sendMessage(jid, { text: '❌ Owner only command.' });
        await ownerCommands.say(sock, msg, args); break;
      case 'sendto':
        if (!isOwner) return sock.sendMessage(jid, { text: '❌ Owner only command.' });
        await ownerCommands.sendto(sock, msg, args); break;
      case 'react':
        if (!isOwner) return sock.sendMessage(jid, { text: '❌ Owner only command.' });
        await ownerCommands.react(sock, msg, args); break;
      case 'delete':
        if (!isOwner) return sock.sendMessage(jid, { text: '❌ Owner only command.' });
        await ownerCommands.delete(sock, msg); break;
      case 'autoreply':
        if (!isOwner) return sock.sendMessage(jid, { text: '❌ Owner only command.' });
        await ownerCommands.autoreply(sock, msg, args); break;
      case 'vv':
        if (!isOwner) return sock.sendMessage(jid, { text: '❌ Owner only command.' });
        await ownerCommands.vv(sock, msg); break;
      case 'broadcast':
        if (!isOwner) return sock.sendMessage(jid, { text: '❌ Owner only command.' });
        await ownerCommands.broadcast(sock, msg, args); break;
      case 'shutdown':
        if (!isOwner) return sock.sendMessage(jid, { text: '❌ Owner only command.' });
        await ownerCommands.shutdown(sock, msg); break;

      case 'cortex': await aiCommands.cortex(sock, msg, args); break;
      case 'mera': await aiCommands.mera(sock, msg, args); break;
      case 'codeai': await aiCommands.codeai(sock, msg, args); break;
      case 'roast': await aiCommands.roast(sock, msg, args); break;
      case 'complimentai': await aiCommands.complimentai(sock, msg, args); break;
      case 'weather': await aiCommands.weather(sock, msg, args); break;
      case 'imagine': await aiCommands.imagine(sock, msg, args); break;
      case 'translate': await aiCommands.translate(sock, msg, args); break;

      case 'joke': await funCommands.joke(sock, msg); break;
      case 'dadjoke': await funCommands.dadjoke(sock, msg); break;
      case 'fact': await funCommands.fact(sock, msg); break;
      case 'advice': await funCommands.advice(sock, msg); break;
      case 'compliment': await funCommands.compliment(sock, msg); break;
      case '8ball': await funCommands.eightball(sock, msg, args); break;
      case 'truth': await funCommands.truth(sock, msg); break;
      case 'dare': await funCommands.dare(sock, msg); break;
      case 'reverse': await funCommands.reverse(sock, msg, args); break;
      case 'hotcheck': await funCommands.hotcheck(sock, msg, args); break;
      case 'smartcheck': await funCommands.smartcheck(sock, msg, args); break;
      case 'brainlevel': await funCommands.brainlevel(sock, msg, args); break;
      case 'coolcheck': await funCommands.coolcheck(sock, msg, args); break;
      case 'lovecheck': await funCommands.lovecheck(sock, msg, args); break;

      case 'calculate': await utilityCommands.calculate(sock, msg, args); break;
      case 'genpass': await utilityCommands.genpass(sock, msg, args); break;
      case 'encode': await utilityCommands.encode(sock, msg, args); break;
      case 'decode': await utilityCommands.decode(sock, msg, args); break;
      case 'qr': await utilityCommands.qr(sock, msg, args); break;
      case 'tinyurl': await utilityCommands.tinyurl(sock, msg, args); break;
      case 'pingweb': await utilityCommands.pingweb(sock, msg, args); break;

      case 'coin': await gameCommands.coin(sock, msg); break;
      case 'dice': await gameCommands.dice(sock, msg, args); break;
      case 'rps': await gameCommands.rps(sock, msg, args); break;
      case 'math': await gameCommands.math(sock, msg); break;
      case 'guess': await gameCommands.guess(sock, msg, args); break;
      case 'slot': await gameCommands.slot(sock, msg); break;
      case 'tictactoe': await gameCommands.tictactoe(sock, msg, args); break;

      case 'kick': await groupCommands.kick(sock, msg, args, isAdmin); break;
      case 'promote': await groupCommands.promote(sock, msg, args, isAdmin); break;
      case 'demote': await groupCommands.demote(sock, msg, args, isAdmin); break;
      case 'mute': await groupCommands.mute(sock, msg, isAdmin); break;
      case 'unmute': await groupCommands.unmute(sock, msg, isAdmin); break;
      case 'tagall': await groupCommands.tagall(sock, msg); break;
      case 'everyone': await groupCommands.everyone(sock, msg, args); break;
      case 'hidetag': await groupCommands.hidetag(sock, msg, args); break;
      case 'grouplink': await groupCommands.grouplink(sock, msg, isAdmin); break;
      case 'groupinfo': await groupCommands.groupinfo(sock, msg); break;
      case 'antilink': await groupCommands.antilink(sock, msg, args); break;
      case 'welcome': await groupCommands.welcome(sock, msg, args); break;

      default:
        await sock.sendMessage(jid, {
          text: `❌ Unknown command: *${cmd}*\n\nType *.menu* to see all available commands.`,
        });
    }
  } catch (err) {
    console.error('[Handler Error]', err.message);
  }
}

async function handleNonCommand(sock, msg, body, jid, sender, isGroup, isOwner) {
  try {
    const mathHandled = await require('./commands/games').checkMathAnswer(sock, msg, body);
    if (mathHandled) return;

    if (isGroup) {
      const antilinkGroups = store.get('antilinkGroups') || {};
      if (antilinkGroups[jid] && LINK_REGEX.test(body)) {
        if (!isOwner) {
          await sock.sendMessage(jid, { delete: msg.key });
          await sock.sendMessage(jid, {
            text: `🚫 @${sender?.split('@')[0]} sending links is not allowed in this group!`,
            mentions: [sender],
          });
          return;
        }
      }
    }

    const autoReply = store.get('autoreply');
    if (autoReply && !isGroup) {
      const responses = [
        `Hey! I'm DollarBot V5 🤖 Type *.menu* to see what I can do!`,
        `Hi there! DollarBot V5 here. Type *.help* for all commands!`,
        `Hello! I'm online and ready. Type *.menu* for commands!`,
      ];
      const reply = responses[Math.floor(Math.random() * responses.length)];
      await sock.sendMessage(jid, { text: reply });
    }
  } catch (_) {}
}

async function handleGroupParticipants(sock, update) {
  try {
    const { id, participants, action } = update;
    const welcomeGroups = store.get('welcomeGroups') || {};
    if (!welcomeGroups[id]) return;

    if (action === 'add') {
      for (const participant of participants) {
        const name = `@${participant.split('@')[0]}`;
        await sock.sendMessage(id, {
          text:
            `╭━━━〔 👋 WELCOME 〕━━━⬣\n` +
            `┃\n` +
            `┃ Welcome ${name} to the group! 🎉\n` +
            `┃ We're glad to have you here.\n` +
            `┃\n` +
            `┃ Type .menu to see bot commands\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣`,
          mentions: [participant],
        });
      }
    } else if (action === 'remove') {
      for (const participant of participants) {
        const name = `@${participant.split('@')[0]}`;
        await sock.sendMessage(id, {
          text: `👋 ${name} has left the group. Goodbye!`,
          mentions: [participant],
        });
      }
    }
  } catch (_) {}
}

module.exports = { handleMessage, handleGroupParticipants };
