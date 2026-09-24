/**
 * PlayPlex HTML5 Tic-Tac-Toe Game Engine
 * Includes AI logic (Easy, Medium, Minimax), Sound Effects, Confetti, and Flutter WebView Bridge
 */

(function () {
  'use strict';

  // State
  let board = Array(9).fill(null);
  let currentPlayer = 'X'; // X starts
  let gameMode = 'ai'; // 'ai' or 'pvp'
  let difficulty = 'medium'; // 'easy', 'medium', 'unbeatable'
  let isGameOver = false;
  let moveCount = 0;
  let soundEnabled = true;

  // Scores
  let scores = {
    x: 0,
    o: 0,
    ties: 0,
  };

  // Winning Combos
  const WINNING_COMBOS = [
    [0, 1, 2], // Row 0
    [3, 4, 5], // Row 1
    [6, 7, 8], // Row 2
    [0, 3, 6], // Col 0
    [1, 4, 7], // Col 1
    [2, 5, 8], // Col 2
    [0, 4, 8], // Diag 1
    [2, 4, 6], // Diag 2
  ];

  // DOM Elements
  const cells = document.querySelectorAll('.cell');
  const boardEl = document.getElementById('board');
  const strikeLineEl = document.getElementById('strikeLine');
  const turnBannerEl = document.getElementById('turnBanner');
  const turnTextEl = document.getElementById('turnText');
  const cardXEl = document.getElementById('cardX');
  const cardOEl = document.getElementById('cardO');
  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const scoreTiesEl = document.getElementById('scoreTies');
  const nameXEl = document.getElementById('nameX');
  const nameOEl = document.getElementById('nameO');
  const modeSelector = document.getElementById('modeSelector');
  const difficultyBar = document.getElementById('difficultyBar');
  const resultModal = document.getElementById('resultModal');
  const modalGlow = document.getElementById('modalGlow');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const rewardText = document.getElementById('rewardText');
  const btnRestart = document.getElementById('btnRestart');
  const btnResetAll = document.getElementById('btnResetAll');
  const btnNextRound = document.getElementById('btnNextRound');
  const btnSound = document.getElementById('btnSound');
  const soundIcon = document.getElementById('soundIcon');
  const confettiCanvas = document.getElementById('confettiCanvas');

  // Web Audio Synthesizer
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
    },
    playTone(freq, type, duration, delay = 0) {
      if (!soundEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + duration);
      } catch (e) {
        console.warn('Audio play error:', e);
      }
    },
    tapX() {
      this.playTone(520, 'sine', 0.1);
    },
    tapO() {
      this.playTone(380, 'sine', 0.1);
    },
    win() {
      this.playTone(523.25, 'triangle', 0.15, 0); // C5
      this.playTone(659.25, 'triangle', 0.15, 0.12); // E5
      this.playTone(783.99, 'triangle', 0.25, 0.24); // G5
      this.playTone(1046.5, 'triangle', 0.45, 0.36); // C6
    },
    draw() {
      this.playTone(300, 'sawtooth', 0.2, 0);
      this.playTone(240, 'sawtooth', 0.3, 0.15);
    },
  };

  // Confetti Particle System
  const Confetti = {
    particles: [],
    animId: null,
    start() {
      const ctx = confettiCanvas.getContext('2d');
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
      this.particles = [];
      const colors = ['#00f5d4', '#ff007f', '#ffd166', '#a29bfe', '#ffffff'];

      for (let i = 0; i < 90; i++) {
        this.particles.push({
          x: confettiCanvas.width * Math.random(),
          y: confettiCanvas.height * Math.random() - confettiCanvas.height * 0.5,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 5 + 3,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10,
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        this.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotSpeed;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });
        this.animId = requestAnimationFrame(render);
      };
      if (this.animId) cancelAnimationFrame(this.animId);
      render();

      setTimeout(() => {
        this.stop();
      }, 3500);
    },
    stop() {
      if (this.animId) cancelAnimationFrame(this.animId);
      const ctx = confettiCanvas.getContext('2d');
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    },
  };

  // ==========================================
  // FLUTTER WEBVIEW BRIDGE CALLER
  // ==========================================
  function notifyFlutterApp(result) {
    const payload = {
      event: 'onGameOver',
      game: 'tictactoe',
      winner: result.winner, // 'X', 'O', or 'DRAW'
      score: result.score,
      coins: result.coins,
      moves: result.moves,
      mode: gameMode,
      difficulty: gameMode === 'ai' ? difficulty : 'pvp',
      timestamp: Date.now(),
    };

    const payloadJson = JSON.stringify(payload);
    console.log('[PlayPlex WebView Bridge] Dispatched Event to Flutter:', payload);

    let bridgeDetected = false;

    // 1. Standard webview_flutter JavaScript Channel: FlutterChannel
    if (window.FlutterChannel && typeof window.FlutterChannel.postMessage === 'function') {
      window.FlutterChannel.postMessage(payloadJson);
      bridgeDetected = true;
    }

    // 2. Alternative Flutter Channel name: FlutterGameBridge
    if (window.FlutterGameBridge && typeof window.FlutterGameBridge.postMessage === 'function') {
      window.FlutterGameBridge.postMessage(payloadJson);
      bridgeDetected = true;
    }

    // 3. flutter_inappwebview support
    if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
      window.flutter_inappwebview.callHandler('onGameOver', payload);
      bridgeDetected = true;
    }

    // 4. Windows WebView2 / Chrome PostMessage
    if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function') {
      window.chrome.webview.postMessage(payloadJson);
      bridgeDetected = true;
    }

    // 5. Parent window / Iframe postMessage
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'GAME_OVER', data: payload }, '*');
      bridgeDetected = true;
    }

    // Update status in result modal
    const statusText = document.getElementById('bridgeStatusText');
    if (statusText) {
      statusText.textContent = bridgeDetected
        ? 'Synced with Flutter App ✅'
        : 'Bridge Ready (Waiting for Flutter)';
    }

    // Global hook for direct evaluation or testing
    if (typeof window.onGameOver === 'function') {
      window.onGameOver(payload);
    }
  }

  // Expose global bridge test function
  window.sendGameOverToFlutter = notifyFlutterApp;

  // Initialize Game
  function initGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    isGameOver = false;
    moveCount = 0;

    cells.forEach((cell) => {
      cell.textContent = '';
      cell.className = 'cell';
      cell.disabled = false;
    });

    strikeLineEl.style.opacity = '0';
    resultModal.classList.remove('active');
    Confetti.stop();
    updateTurnIndicator();
  }

  // Cell Click Handler
  function handleCellClick(index) {
    if (board[index] !== null || isGameOver) return;

    makeMove(index, currentPlayer);

    if (isGameOver) return;

    if (gameMode === 'ai' && currentPlayer === 'O') {
      // Disable clicks during AI thinking
      cells.forEach((c) => (c.disabled = true));
      setTimeout(() => {
        if (!isGameOver) {
          const aiMove = getAiMove();
          makeMove(aiMove, 'O');
          if (!isGameOver) {
            cells.forEach((c) => {
              if (board[parseInt(c.dataset.index)] === null) {
                c.disabled = false;
              }
            });
          }
        }
      }, 380);
    }
  }

  // Execute a Move
  function makeMove(index, player) {
    board[index] = player;
    moveCount++;

    const cell = cells[index];
    cell.textContent = player === 'X' ? '✕' : '◯';
    cell.classList.add(player === 'X' ? 'x-mark' : 'o-mark', 'taken');

    if (player === 'X') {
      AudioEngine.tapX();
    } else {
      AudioEngine.tapO();
    }

    const winCombo = checkWin(board, player);
    if (winCombo) {
      handleGameOver(player, winCombo);
    } else if (board.every((c) => c !== null)) {
      handleGameOver('DRAW', null);
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      updateTurnIndicator();
    }
  }

  // Check Win Condition
  function checkWin(b, player) {
    for (const combo of WINNING_COMBOS) {
      if (b[combo[0]] === player && b[combo[1]] === player && b[combo[2]] === player) {
        return combo;
      }
    }
    return null;
  }

  // Draw Win Line
  function drawStrikeLine(combo) {
    combo.forEach((idx) => cells[idx].classList.add('winning-cell'));

    const isHorizontal =
      combo[0] === 0 && combo[1] === 1
        ? 0
        : combo[0] === 3 && combo[1] === 4
        ? 1
        : combo[0] === 6 && combo[1] === 7
        ? 2
        : -1;
    const isVertical =
      combo[0] === 0 && combo[1] === 3
        ? 0
        : combo[0] === 1 && combo[1] === 4
        ? 1
        : combo[0] === 2 && combo[1] === 5
        ? 2
        : -1;
    const isDiagonal1 = combo[0] === 0 && combo[1] === 4 && combo[2] === 8;
    const isDiagonal2 = combo[0] === 2 && combo[1] === 4 && combo[2] === 6;

    const bRect = boardEl.getBoundingClientRect();
    const size = bRect.width;

    strikeLineEl.style.transition = 'none';
    strikeLineEl.style.opacity = '0';

    if (isHorizontal !== -1) {
      const topPos = (isHorizontal * 2 + 1) * (size / 6);
      strikeLineEl.style.width = '88%';
      strikeLineEl.style.height = '6px';
      strikeLineEl.style.left = '6%';
      strikeLineEl.style.top = `${topPos - 3}px`;
      strikeLineEl.style.transform = 'scaleX(0)';
    } else if (isVertical !== -1) {
      const leftPos = (isVertical * 2 + 1) * (size / 6);
      strikeLineEl.style.width = '6px';
      strikeLineEl.style.height = '88%';
      strikeLineEl.style.top = '6%';
      strikeLineEl.style.left = `${leftPos - 3}px`;
      strikeLineEl.style.transform = 'scaleY(0)';
    } else if (isDiagonal1) {
      strikeLineEl.style.width = '120%';
      strikeLineEl.style.height = '6px';
      strikeLineEl.style.top = '50%';
      strikeLineEl.style.left = '-10%';
      strikeLineEl.style.transform = 'rotate(45deg) scaleX(0)';
    } else if (isDiagonal2) {
      strikeLineEl.style.width = '120%';
      strikeLineEl.style.height = '6px';
      strikeLineEl.style.top = '50%';
      strikeLineEl.style.left = '-10%';
      strikeLineEl.style.transform = 'rotate(-45deg) scaleX(0)';
    }

    setTimeout(() => {
      strikeLineEl.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      strikeLineEl.style.opacity = '1';
      if (isHorizontal !== -1 || isVertical !== -1) {
        strikeLineEl.style.transform = 'scale(1)';
      } else if (isDiagonal1) {
        strikeLineEl.style.transform = 'rotate(45deg) scaleX(1)';
      } else if (isDiagonal2) {
        strikeLineEl.style.transform = 'rotate(-45deg) scaleX(1)';
      }
    }, 50);
  }

  // Handle Game Over
  function handleGameOver(winner, winCombo) {
    isGameOver = true;
    let earnedCoins = 0;
    let score = 0;

    if (winner === 'X') {
      scores.x++;
      scoreXEl.textContent = scores.x;
      earnedCoins = 50;
      score = 500;
      modalGlow.textContent = '🏆';
      modalTitle.textContent = 'VICTORY!';
      modalSubtitle.textContent = gameMode === 'ai' ? 'You defeated the Bot!' : 'Player X wins the match!';
      AudioEngine.win();
      Confetti.start();
      if (winCombo) drawStrikeLine(winCombo);
    } else if (winner === 'O') {
      scores.o++;
      scoreOEl.textContent = scores.o;
      earnedCoins = 10;
      score = 100;
      modalGlow.textContent = '🤖';
      modalTitle.textContent = 'DEFEAT!';
      modalSubtitle.textContent = gameMode === 'ai' ? 'Bot outsmarted you this time!' : 'Player O wins the match!';
      AudioEngine.draw();
      if (winCombo) drawStrikeLine(winCombo);
    } else {
      scores.ties++;
      scoreTiesEl.textContent = scores.ties;
      earnedCoins = 20;
      score = 250;
      modalGlow.textContent = '🤝';
      modalTitle.textContent = "IT'S A DRAW!";
      modalSubtitle.textContent = 'Great defense from both sides!';
      AudioEngine.draw();
    }

    rewardText.textContent = `+${earnedCoins} Coins Earned`;

    // Notify Flutter App via WebView Bridge
    notifyFlutterApp({
      winner: winner,
      score: score,
      coins: earnedCoins,
      moves: moveCount,
    });

    // Show result modal after small delay
    setTimeout(() => {
      resultModal.classList.add('active');
    }, 700);
  }

  // Update Turn Indicator & active card glow
  function updateTurnIndicator() {
    if (currentPlayer === 'X') {
      turnBannerEl.classList.remove('o-turn');
      turnTextEl.textContent = gameMode === 'ai' ? "Your Turn (X)" : "Player X's Turn";
      cardXEl.classList.add('active');
      cardOEl.classList.remove('active');
    } else {
      turnBannerEl.classList.add('o-turn');
      turnTextEl.textContent = gameMode === 'ai' ? 'Bot is Thinking...' : "Player O's Turn";
      cardOEl.classList.add('active');
      cardXEl.classList.remove('active');
    }
  }

  // ==========================================
  // AI DECISION ENGINE
  // ==========================================
  function getAiMove() {
    const available = board
      .map((val, idx) => (val === null ? idx : null))
      .filter((v) => v !== null);

    if (difficulty === 'easy') {
      // Random move
      return available[Math.floor(Math.random() * available.length)];
    }

    if (difficulty === 'medium') {
      // 60% optimal / 40% random
      if (Math.random() < 0.4) {
        return available[Math.floor(Math.random() * available.length)];
      }
    }

    // Unbeatable Minimax
    return getBestMove();
  }

  function getBestMove() {
    // 1. Instant Win if possible
    for (let idx of getAvailableMoves(board)) {
      board[idx] = 'O';
      if (checkWin(board, 'O')) {
        board[idx] = null;
        return idx;
      }
      board[idx] = null;
    }

    // 2. Instant Block if X is about to win
    for (let idx of getAvailableMoves(board)) {
      board[idx] = 'X';
      if (checkWin(board, 'X')) {
        board[idx] = null;
        return idx;
      }
      board[idx] = null;
    }

    // 3. Take Center if open
    if (board[4] === null) return 4;

    // 4. Minimax Search
    let bestScore = -Infinity;
    let bestMove = getAvailableMoves(board)[0];

    for (let idx of getAvailableMoves(board)) {
      board[idx] = 'O';
      let score = minimax(board, 0, false, -Infinity, Infinity);
      board[idx] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = idx;
      }
    }
    return bestMove;
  }

  function getAvailableMoves(b) {
    return b.map((val, idx) => (val === null ? idx : null)).filter((v) => v !== null);
  }

  function minimax(b, depth, isMaximizing, alpha, beta) {
    if (checkWin(b, 'O')) return 10 - depth;
    if (checkWin(b, 'X')) return depth - 10;
    if (b.every((c) => c !== null)) return 0;
    if (depth >= 6) return 0; // Performance cutoff

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let idx of getAvailableMoves(b)) {
        b[idx] = 'O';
        let evalScore = minimax(b, depth + 1, false, alpha, beta);
        b[idx] = null;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let idx of getAvailableMoves(b)) {
        b[idx] = 'X';
        let evalScore = minimax(b, depth + 1, true, alpha, beta);
        b[idx] = null;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  cells.forEach((cell) => {
    cell.addEventListener('click', () => {
      const idx = parseInt(cell.dataset.index);
      handleCellClick(idx);
    });
  });

  btnRestart.addEventListener('click', initGame);
  btnNextRound.addEventListener('click', initGame);

  btnResetAll.addEventListener('click', () => {
    scores = { x: 0, o: 0, ties: 0 };
    scoreXEl.textContent = '0';
    scoreOEl.textContent = '0';
    scoreTiesEl.textContent = '0';
    initGame();
  });

  // Sound Toggle
  btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    btnSound.style.opacity = soundEnabled ? '1' : '0.5';
  });

  // Mode Selection (vs Bot / 2 Players)
  modeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    gameMode = btn.dataset.mode;

    if (gameMode === 'ai') {
      difficultyBar.style.display = 'flex';
      nameXEl.textContent = 'PLAYER (X)';
      nameOEl.textContent = 'BOT (O)';
    } else {
      difficultyBar.style.display = 'none';
      nameXEl.textContent = 'PLAYER 1 (X)';
      nameOEl.textContent = 'PLAYER 2 (O)';
    }
    initGame();
  });

  // Difficulty Selection
  difficultyBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.diff-chip');
    if (!chip) return;
    document.querySelectorAll('.diff-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    difficulty = chip.dataset.diff;
    initGame();
  });

  // Window resize confetti canvas adjustment
  window.addEventListener('resize', () => {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  });

  // Start initial game
  initGame();
})();
