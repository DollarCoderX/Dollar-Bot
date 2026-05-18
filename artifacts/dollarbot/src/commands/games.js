const gameState = {};

function getState(jid) {
  if (!gameState[jid]) gameState[jid] = {};
  return gameState[jid];
}

function renderTTT(board) {
  const sym = (v) => (v === 1 ? '❌' : v === 2 ? '⭕' : '⬜');
  return (
    `${sym(board[0])}${sym(board[1])}${sym(board[2])}\n` +
    `${sym(board[3])}${sym(board[4])}${sym(board[5])}\n` +
    `${sym(board[6])}${sym(board[7])}${sym(board[8])}`
  );
}

function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

const gameCommands = {
  async coin(sock, msg) {
    const result = Math.random() < 0.5 ? '🪙 HEADS' : '🪙 TAILS';
    await sock.sendMessage(msg.key.remoteJid, { text: `🪙 *Coin Flip!*\n\nResult: *${result}*` });
  },

  async dice(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sides = parseInt(args[0]) || 6;
    if (sides < 2 || sides > 100) {
      return sock.sendMessage(jid, { text: '❌ Dice sides must be between 2 and 100.' });
    }
    const result = Math.floor(Math.random() * sides) + 1;
    await sock.sendMessage(jid, { text: `🎲 *Dice Roll (d${sides})*\n\nYou rolled: *${result}*` });
  },

  async rps(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const choices = ['rock', 'paper', 'scissors'];
    const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
    if (!args[0] || !choices.includes(args[0].toLowerCase())) {
      return sock.sendMessage(jid, { text: '❌ Usage: .rps <rock/paper/scissors>' });
    }
    const player = args[0].toLowerCase();
    const bot = choices[Math.floor(Math.random() * 3)];
    let result = '';
    if (player === bot) result = "🤝 It's a tie!";
    else if (
      (player === 'rock' && bot === 'scissors') ||
      (player === 'paper' && bot === 'rock') ||
      (player === 'scissors' && bot === 'paper')
    ) result = '🎉 You win!';
    else result = '😈 Bot wins!';
    await sock.sendMessage(jid, {
      text: `✂️ *Rock Paper Scissors*\n\n🧍 You: ${emojis[player]} ${player}\n🤖 Bot: ${emojis[bot]} ${bot}\n\n${result}`,
    });
  },

  async math(sock, msg) {
    const jid = msg.key.remoteJid;
    const state = getState(jid);
    if (state.mathGame) {
      return sock.sendMessage(jid, { text: `❗ A math game is already active!\n\nQuestion: *${state.mathGame.question}*` });
    }
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const question = `${a} ${op} ${b}`;
    const answer = Function(`"use strict"; return (${question})`)();
    state.mathGame = { question, answer, timeout: setTimeout(() => {
      delete state.mathGame;
      sock.sendMessage(jid, { text: `⏰ Time's up! The answer was *${answer}*` });
    }, 30000) };
    await sock.sendMessage(jid, {
      text: `🧮 *Math Challenge!*\n\n❓ What is: *${question}*?\n\n⏱️ You have 30 seconds!\nType your answer to reply.`,
    });
  },

  async checkMathAnswer(sock, msg, text) {
    const jid = msg.key.remoteJid;
    const state = getState(jid);
    if (!state.mathGame) return false;
    const userAnswer = parseFloat(text.trim());
    if (isNaN(userAnswer)) return false;
    if (userAnswer === state.mathGame.answer) {
      clearTimeout(state.mathGame.timeout);
      const q = state.mathGame.question;
      const a = state.mathGame.answer;
      delete state.mathGame;
      await sock.sendMessage(jid, { text: `🎉 *Correct!*\n\n${q} = *${a}*\n\nYou're a math genius! 🧠` });
      return true;
    }
    return false;
  },

  async guess(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const state = getState(jid);
    if (args[0] && !isNaN(args[0]) && state.guessGame) {
      const guess = parseInt(args[0]);
      const { number, attempts } = state.guessGame;
      state.guessGame.attempts++;
      if (guess === number) {
        const tries = state.guessGame.attempts;
        delete state.guessGame;
        return sock.sendMessage(jid, { text: `🎉 *Correct!* The number was *${number}*!\n\n🏆 You got it in ${tries} attempt(s)!` });
      } else if (guess < number) {
        return sock.sendMessage(jid, { text: `📈 Too low! Try higher. (Attempt ${attempts + 1})` });
      } else {
        return sock.sendMessage(jid, { text: `📉 Too high! Try lower. (Attempt ${attempts + 1})` });
      }
    }
    if (state.guessGame) {
      return sock.sendMessage(jid, { text: `🎮 Game already active! Guess a number 1-100.\nType: .guess <number>` });
    }
    const number = Math.floor(Math.random() * 100) + 1;
    state.guessGame = { number, attempts: 0, timeout: setTimeout(() => {
      if (state.guessGame) {
        const n = state.guessGame.number;
        delete state.guessGame;
        sock.sendMessage(jid, { text: `⏰ Time's up! The number was *${n}*` });
      }
    }, 120000) };
    await sock.sendMessage(jid, {
      text: `🎮 *Number Guessing Game!*\n\n🔢 I'm thinking of a number between 1-100\n\n📝 Type: .guess <number>\n⏱️ You have 2 minutes!`,
    });
  },

  async slot(sock, msg) {
    const jid = msg.key.remoteJid;
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];
    const s = () => symbols[Math.floor(Math.random() * symbols.length)];
    const r1 = [s(), s(), s()];
    const r2 = [s(), s(), s()];
    const r3 = [s(), s(), s()];
    const win = r2[0] === r2[1] && r2[1] === r2[2];
    const twoMatch = r2[0] === r2[1] || r2[1] === r2[2] || r2[0] === r2[2];
    const result = win ? '🎉 JACKPOT! You win big!' : twoMatch ? '😎 Two matching! Small win!' : '❌ No match. Try again!';
    await sock.sendMessage(jid, {
      text:
        `🎰 *SLOT MACHINE*\n\n` +
        `╔═══════════╗\n` +
        `║ ${r1.join(' ')} ║\n` +
        `║ ${r2.join(' ')} ║ ◄\n` +
        `║ ${r3.join(' ')} ║\n` +
        `╚═══════════╝\n\n` +
        result,
    });
  },

  async tictactoe(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const state = getState(jid);

    if (args[0] === 'stop') {
      delete state.ttt;
      return sock.sendMessage(jid, { text: '🛑 TicTacToe game stopped.' });
    }

    if (!state.ttt) {
      state.ttt = { board: Array(9).fill(0), turn: 1 };
      return sock.sendMessage(jid, {
        text:
          `❌⭕ *TicTacToe Started!*\n\n` +
          `You are ❌ (X), Bot is ⭕ (O)\n\n` +
          `${renderTTT(state.ttt.board)}\n\n` +
          `📝 Positions (1-9):\n` +
          `1️⃣2️⃣3️⃣\n4️⃣5️⃣6️⃣\n7️⃣8️⃣9️⃣\n\n` +
          `Type: .tictactoe <1-9>`,
      });
    }

    const pos = parseInt(args[0]);
    if (!pos || pos < 1 || pos > 9) {
      return sock.sendMessage(jid, { text: '❌ Usage: .tictactoe <1-9>\nType .tictactoe stop to end game.' });
    }

    const idx = pos - 1;
    if (state.ttt.board[idx] !== 0) {
      return sock.sendMessage(jid, { text: '❌ That position is already taken! Choose another.' });
    }

    if (state.ttt.turn !== 1) {
      return sock.sendMessage(jid, { text: '⏳ Wait for the bot to play first!' });
    }

    state.ttt.board[idx] = 1;
    let winner = checkWinner(state.ttt.board);
    if (winner) {
      const board = state.ttt.board;
      delete state.ttt;
      return sock.sendMessage(jid, {
        text: `${renderTTT(board)}\n\n🎉 *You Win!* Congrats! 🏆`,
      });
    }
    if (!state.ttt.board.includes(0)) {
      const board = state.ttt.board;
      delete state.ttt;
      return sock.sendMessage(jid, { text: `${renderTTT(board)}\n\n🤝 *It's a draw!*` });
    }

    const empty = state.ttt.board.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);
    const botMove = empty[Math.floor(Math.random() * empty.length)];
    state.ttt.board[botMove] = 2;
    winner = checkWinner(state.ttt.board);
    if (winner) {
      const board = state.ttt.board;
      delete state.ttt;
      return sock.sendMessage(jid, {
        text: `${renderTTT(board)}\n\n😈 *Bot Wins!* Better luck next time!`,
      });
    }
    if (!state.ttt.board.includes(0)) {
      const board = state.ttt.board;
      delete state.ttt;
      return sock.sendMessage(jid, { text: `${renderTTT(board)}\n\n🤝 *It's a draw!*` });
    }

    await sock.sendMessage(jid, {
      text: `${renderTTT(state.ttt.board)}\n\n🤖 Bot played position ${botMove + 1}\n📝 Your turn! .tictactoe <1-9>`,
    });
  },
};

module.exports = gameCommands;
