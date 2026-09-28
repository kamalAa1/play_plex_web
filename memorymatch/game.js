/**
 * PlayPlex | Memory Match Web Arena
 * Highly polished HTML5/JS memory matching game with Flutter WebView Bridge integration.
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIGURATION & SOUND ENGINE (Web Audio API)
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const rewardValue = parseInt(urlParams.get('coins') || '100', 10);
  const rewardUnit = urlParams.get('unit') || 'Coins';

  // 8 Unique Pairs with vibrant emojis
  const CARD_ITEMS = [
    { id: 'rocket', icon: '🚀', name: 'Rocket' },
    { id: 'diamond', icon: '💎', name: 'Diamond' },
    { id: 'lightning', icon: '⚡', name: 'Lightning' },
    { id: 'gamepad', icon: '🎮', name: 'Gamepad' },
    { id: 'crown', icon: '👑', name: 'Crown' },
    { id: 'planet', icon: '🪐', name: 'Planet' },
    { id: 'fire', icon: '🔥', name: 'Fire' },
    { id: 'clover', icon: '🍀', name: 'Clover' },
  ];

  // Web Audio Synth
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  const AudioEngine = {
    flip() {
      try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(560, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch (_) {}
    },

    match() {
      try {
        initAudio();
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.25, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.18);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.18);
        });
      } catch (_) {}
    },

    mismatch() {
      try {
        initAudio();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } catch (_) {}
    },

    victory() {
      try {
        initAudio();
        const now = audioCtx.currentTime;
        const chord = [
          { f: 523.25, t: 0 },
          { f: 659.25, t: 0.1 },
          { f: 783.99, t: 0.2 },
          { f: 1046.5, t: 0.3 },
          { f: 1318.5, t: 0.45 },
        ];
        chord.forEach((note) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, now + note.t);
          gain.gain.setValueAtTime(0.3, now + note.t);
          gain.gain.exponentialRampToValueAtTime(0.01, now + note.t + 0.4);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + note.t);
          osc.stop(now + note.t + 0.4);
        });
      } catch (_) {}
    },
  };

  // ==========================================
  // CONFETTI CELEBRATION ENGINE
  // ==========================================
  const confettiCanvas = document.getElementById('confettiCanvas');
  const Confetti = {
    particles: [],
    animId: null,
    start() {
      if (!confettiCanvas) return;
      const ctx = confettiCanvas.getContext('2d');
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;

      const colors = ['#7042f4', '#00d2d3', '#ffa502', '#10b981', '#ff4757', '#ff6b81'];
      this.particles = [];
      for (let i = 0; i < 90; i++) {
        this.particles.push({
          x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 80,
          y: confettiCanvas.height / 2 + (Math.random() - 0.5) * 80,
          vx: (Math.random() - 0.5) * 16,
          vy: (Math.random() - 0.8) * 18,
          size: Math.random() * 8 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          gravity: 0.45,
          opacity: 1,
        });
      }

      const animate = () => {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        let alive = false;
        this.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.rotation += p.rotSpeed;
          p.opacity -= 0.007;

          if (p.opacity > 0) {
            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
            ctx.restore();
          }
        });

        if (alive) {
          this.animId = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
      };

      if (this.animId) cancelAnimationFrame(this.animId);
      this.animId = requestAnimationFrame(animate);

      setTimeout(() => {
        this.stop();
      }, 3500);
    },
    stop() {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (!confettiCanvas) return;
      const ctx = confettiCanvas.getContext('2d');
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    },
  };

  // ==========================================
  // FLUTTER WEBVIEW BRIDGE DISPATCHER
  // ==========================================
  function notifyFlutterApp(result) {
    const payload = {
      event: 'onGameOver',
      game: 'memorymatch',
      score: result.score,
      coins: result.coins,
      unit: rewardUnit,
      moves: result.moves,
      timeSeconds: result.timeSeconds,
      accuracy: result.accuracy,
      timestamp: Date.now(),
    };

    const payloadJson = JSON.stringify(payload);
    console.log('[PlayPlex WebView Bridge] Dispatched Event to Flutter:', payload);

    if (window.FlutterChannel && typeof window.FlutterChannel.postMessage === 'function') {
      window.FlutterChannel.postMessage(payloadJson);
    } else if (window.FlutterGameBridge && typeof window.FlutterGameBridge.postMessage === 'function') {
      window.FlutterGameBridge.postMessage(payloadJson);
    } else if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
      window.flutter_inappwebview.callHandler('onGameOver', payload);
    } else if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function') {
      window.chrome.webview.postMessage(payloadJson);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'GAME_OVER', data: payload }, '*');
    }

    if (typeof window.onGameOver === 'function') {
      window.onGameOver(payload);
    }
  }

  // ==========================================
  // GAME STATE & DOM ELEMENTS
  // ==========================================
  const cardsGridEl = document.getElementById('cardsGrid');
  const timeDisplayEl = document.getElementById('timeDisplay');
  const movesDisplayEl = document.getElementById('movesDisplay');
  const pairsDisplayEl = document.getElementById('pairsDisplay');

  const resultModal = document.getElementById('resultModal');
  const modalFinalTime = document.getElementById('modalFinalTime');
  const modalFinalMoves = document.getElementById('modalFinalMoves');
  const modalAccuracy = document.getElementById('modalAccuracy');
  const rewardText = document.getElementById('rewardText');

  const btnTopQuit = document.getElementById('btnTopQuit');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnSavePoints = document.getElementById('btnSavePoints');
  const btnExit = document.getElementById('btnExit');

  let deck = [];
  let flippedCards = [];
  let matchedPairsCount = 0;
  let movesCount = 0;
  let timerSeconds = 0;
  let timerInterval = null;
  let isTimerRunning = false;
  let isLocked = false;
  let lastGameResult = null;

  // Format seconds to mm:ss
  function formatTime(totalSec) {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  // Shuffle array using Fisher-Yates
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Start Timer
  function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      timerSeconds++;
      if (timeDisplayEl) timeDisplayEl.textContent = formatTime(timerSeconds);
    }, 1000);
  }

  // Stop Timer
  function stopTimer() {
    isTimerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Reset & Initialize Game
  function initGame() {
    stopTimer();
    timerSeconds = 0;
    movesCount = 0;
    matchedPairsCount = 0;
    flippedCards = [];
    isLocked = false;

    if (timeDisplayEl) timeDisplayEl.textContent = '00:00';
    if (movesDisplayEl) movesDisplayEl.textContent = '0';
    if (pairsDisplayEl) pairsDisplayEl.textContent = `0/${CARD_ITEMS.length}`;

    if (resultModal) {
      resultModal.classList.remove('active');
      resultModal.classList.remove('card-hidden');
    }

    if (btnSavePoints) {
      btnSavePoints.textContent = 'Save Points';
      btnSavePoints.disabled = false;
      btnSavePoints.style.display = 'block';
    }

    Confetti.stop();

    // Create 16 cards (2 of each item)
    const cards = [];
    CARD_ITEMS.forEach((item) => {
      cards.push({ ...item, uid: `${item.id}-1` });
      cards.push({ ...item, uid: `${item.id}-2` });
    });

    deck = shuffle(cards);
    renderCards();
  }

  // Render Card Grid
  function renderCards() {
    if (!cardsGridEl) return;
    cardsGridEl.innerHTML = '';

    deck.forEach((card, index) => {
      const cardEl = document.createElement('button');
      cardEl.className = 'card';
      cardEl.dataset.index = index;
      cardEl.dataset.id = card.id;
      cardEl.setAttribute('aria-label', `Card ${index + 1}`);

      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-front">
            <div class="card-pattern">⚡</div>
          </div>
          <div class="card-back">${card.icon}</div>
        </div>
      `;

      cardEl.addEventListener('click', () => handleCardClick(cardEl, card, index));
      cardsGridEl.appendChild(cardEl);
    });
  }

  // Handle Card Tap/Click
  function handleCardClick(cardEl, card, index) {
    if (isLocked) return;
    if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;

    if (!isTimerRunning) {
      startTimer();
    }

    AudioEngine.flip();
    cardEl.classList.add('flipped');
    flippedCards.push({ el: cardEl, card: card, index: index });

    if (flippedCards.length === 2) {
      movesCount++;
      if (movesDisplayEl) movesDisplayEl.textContent = movesCount.toString();
      checkMatch();
    }
  }

  // Check Pair Match
  function checkMatch() {
    isLocked = true;
    const [first, second] = flippedCards;

    if (first.card.id === second.card.id) {
      // MATCH FOUND
      setTimeout(() => {
        first.el.classList.add('matched');
        second.el.classList.add('matched');
        matchedPairsCount++;

        if (pairsDisplayEl) {
          pairsDisplayEl.textContent = `${matchedPairsCount}/${CARD_ITEMS.length}`;
        }

        AudioEngine.match();
        flippedCards = [];
        isLocked = false;

        // Check Victory
        if (matchedPairsCount === CARD_ITEMS.length) {
          handleVictory();
        }
      }, 350);
    } else {
      // MISMATCH
      setTimeout(() => {
        first.el.classList.add('shake');
        second.el.classList.add('shake');
        AudioEngine.mismatch();
      }, 300);

      setTimeout(() => {
        first.el.classList.remove('flipped', 'shake');
        second.el.classList.remove('flipped', 'shake');
        flippedCards = [];
        isLocked = false;
      }, 850);
    }
  }

  // Handle Victory
  function handleVictory() {
    stopTimer();
    AudioEngine.victory();
    Confetti.start();

    const minPossibleMoves = CARD_ITEMS.length; // 8 moves
    const accuracy = Math.min(100, Math.round((minPossibleMoves / Math.max(minPossibleMoves, movesCount)) * 100));
    const finalScore = Math.max(100, 1000 - timerSeconds * 5 - (movesCount - minPossibleMoves) * 15);

    lastGameResult = {
      score: finalScore,
      coins: rewardValue,
      moves: movesCount,
      timeSeconds: timerSeconds,
      accuracy: accuracy,
    };

    if (modalFinalTime) modalFinalTime.textContent = formatTime(timerSeconds);
    if (modalFinalMoves) modalFinalMoves.textContent = movesCount.toString();
    if (modalAccuracy) modalAccuracy.textContent = `${accuracy}%`;
    if (rewardText) rewardText.textContent = `+${rewardValue} ${rewardUnit} Earned`;

    // Notify Flutter App
    notifyFlutterApp(lastGameResult);

    setTimeout(() => {
      if (resultModal) {
        resultModal.classList.remove('card-hidden');
        resultModal.classList.add('active');
      }
    }, 600);
  }

  // Save Points to Flutter App
  function savePoints() {
    if (!lastGameResult || lastGameResult.coins <= 0) return;

    const payload = {
      event: 'savePoints',
      game: 'memorymatch',
      score: lastGameResult.score,
      coins: lastGameResult.coins,
      unit: rewardUnit,
      moves: lastGameResult.moves,
      timeSeconds: lastGameResult.timeSeconds,
      timestamp: Date.now(),
    };

    const payloadJson = JSON.stringify(payload);
    console.log('[PlayPlex WebView Bridge] Dispatched savePoints to Flutter:', payload);

    if (window.FlutterChannel && typeof window.FlutterChannel.postMessage === 'function') {
      window.FlutterChannel.postMessage(payloadJson);
    } else if (window.FlutterGameBridge && typeof window.FlutterGameBridge.postMessage === 'function') {
      window.FlutterGameBridge.postMessage(payloadJson);
    } else if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
      window.flutter_inappwebview.callHandler('savePoints', payload);
    } else if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function') {
      window.chrome.webview.postMessage(payloadJson);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'SAVE_POINTS', data: payload }, '*');
    }

    if (btnSavePoints) {
      btnSavePoints.textContent = '✅ Points Saved!';
      btnSavePoints.disabled = true;
    }

    if (resultModal) {
      resultModal.classList.add('card-hidden');
    }
  }

  // Exit Game to Flutter App
  function exitGame() {
    stopTimer();
    const payload = {
      event: 'exitGame',
      game: 'memorymatch',
      timestamp: Date.now(),
    };

    const payloadJson = JSON.stringify(payload);
    console.log('[PlayPlex WebView Bridge] Dispatched exitGame to Flutter:', payload);

    if (window.FlutterChannel && typeof window.FlutterChannel.postMessage === 'function') {
      window.FlutterChannel.postMessage(payloadJson);
    } else if (window.FlutterGameBridge && typeof window.FlutterGameBridge.postMessage === 'function') {
      window.FlutterGameBridge.postMessage(payloadJson);
    } else if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
      window.flutter_inappwebview.callHandler('exitGame', payload);
    } else if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function') {
      window.chrome.webview.postMessage(payloadJson);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'EXIT_GAME', data: payload }, '*');
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  if (btnPlayAgain) {
    btnPlayAgain.addEventListener('click', initGame);
  }

  if (btnSavePoints) {
    btnSavePoints.addEventListener('click', savePoints);
  }

  if (btnExit) {
    btnExit.addEventListener('click', exitGame);
  }

  if (btnTopQuit) {
    btnTopQuit.addEventListener('click', exitGame);
  }

  window.addEventListener('resize', () => {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  });

  // Start game on load
  initGame();
})();
