/**
 * PlayPlex HTML5 Ball Merge 2048 Game Engine
 * Physics-based Drop & Merge with Flutter WebView Bridge Integration
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIGURATION & ORB TIERS (2 to 2048)
  // ==========================================
  const TIERS = [
    { value: 2, radius: 20, color: '#00f5d4', grad: ['#00f5d4', '#00bbf9'], score: 2 },
    { value: 4, radius: 26, color: '#00bbf9', grad: ['#00bbf9', '#4361ee'], score: 4 },
    { value: 8, radius: 33, color: '#70e000', grad: ['#70e000', '#38b000'], score: 8 },
    { value: 16, radius: 41, color: '#ffd166', grad: ['#ffd166', '#f39c12'], score: 16 },
    { value: 32, radius: 50, color: '#ff9f1c', grad: ['#ff9f1c', '#e67e22'], score: 32 },
    { value: 64, radius: 60, color: '#ff007f', grad: ['#ff007f', '#d90429'], score: 64 },
    { value: 128, radius: 71, color: '#f72585', grad: ['#f72585', '#b5179e'], score: 128 },
    { value: 256, radius: 83, color: '#b5179e', grad: ['#b5179e', '#7209b7'], score: 256 },
    { value: 512, radius: 96, color: '#7209b7', grad: ['#7209b7', '#3f37c9'], score: 512 },
    { value: 1024, radius: 110, color: '#3a0ca3', grad: ['#4361ee', '#3a0ca3'], score: 1024 },
    { value: 2048, radius: 125, color: '#ffd700', grad: ['#ffe066', '#f39c12'], score: 2048 },
  ];

  // ==========================================
  // URL QUERY PARAMETERS & REWARD
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const rewardParam =
    urlParams.get('reward') ||
    urlParams.get('coins') ||
    urlParams.get('points') ||
    urlParams.get('value');
  const rewardValue =
    rewardParam !== null && !isNaN(parseInt(rewardParam, 10))
      ? parseInt(rewardParam, 10)
      : 0;
  const rewardUnit = urlParams.get('unit') || urlParams.get('units') || 'Coins';

  // Target Score Parameter (Default: 500)
  const targetParam =
    urlParams.get('target') ||
    urlParams.get('targetScore') ||
    urlParams.get('goal') ||
    urlParams.get('target_score');
  const targetScore =
    targetParam !== null && !isNaN(parseInt(targetParam, 10))
      ? parseInt(targetParam, 10)
      : 500;

  // ==========================================
  // DOM REFERENCES
  // ==========================================
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const arenaFrame = document.getElementById('arenaFrame');
  const currentScoreEl = document.getElementById('currentScore');
  const targetScoreEl = document.getElementById('targetScore');
  const nextBallPreviewEl = document.getElementById('nextBallPreview');
  const nextBallTextEl = document.getElementById('nextBallText');
  const dangerLineEl = document.getElementById('dangerLine');
  const comboPill = document.getElementById('comboPill');
  const comboText = document.getElementById('comboText');
  const resultModal = document.getElementById('resultModal');
  const modalGlow = document.getElementById('modalGlow');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const modalFinalScore = document.getElementById('modalFinalScore');
  const modalTargetScore = document.getElementById('modalTargetScore');
  const modalHighestOrb = document.getElementById('modalHighestOrb');
  const rewardBox = document.getElementById('rewardBox');
  const rewardText = document.getElementById('rewardText');
  const btnSavePoints = document.getElementById('btnSavePoints');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnExit = document.getElementById('btnExit');
  const btnTopQuit = document.getElementById('btnTopQuit');
  const btnRestartInGame = document.getElementById('btnRestartInGame');
  const confettiCanvas = document.getElementById('confettiCanvas');

  // ==========================================
  // SYNTHESIZED WEB AUDIO ENGINE
  // ==========================================
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
    },
    playTone(freq, type, duration, delay = 0, vol = 0.12) {
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + duration);
      } catch (_) {}
    },
    drop() {
      this.playTone(440, 'sine', 0.08, 0, 0.08);
    },
    bounce() {
      this.playTone(180, 'sine', 0.05, 0, 0.04);
    },
    merge(tierIndex) {
      const baseFreq = 320 + tierIndex * 75;
      this.playTone(baseFreq, 'triangle', 0.14, 0, 0.16);
      this.playTone(baseFreq * 1.25, 'sine', 0.16, 0.04, 0.12);
      this.playTone(baseFreq * 1.5, 'triangle', 0.22, 0.08, 0.14);
    },
    gameOver() {
      this.playTone(280, 'sawtooth', 0.2, 0, 0.15);
      this.playTone(220, 'sawtooth', 0.3, 0.12, 0.15);
      this.playTone(160, 'sawtooth', 0.45, 0.25, 0.18);
    },
    win2048() {
      [523, 659, 784, 1046, 1318].forEach((freq, idx) => {
        this.playTone(freq, 'triangle', 0.3, idx * 0.1, 0.15);
      });
    },
  };

  // ==========================================
  // CONFETTI CELEBRATION SYSTEM
  // ==========================================
  const Confetti = {
    particles: [],
    animId: null,
    start() {
      if (!confettiCanvas) return;
      const cctx = confettiCanvas.getContext('2d');
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
      this.particles = [];
      const colors = ['#00f5d4', '#ff007f', '#ffd166', '#a29bfe', '#ffffff'];

      for (let i = 0; i < 80; i++) {
        this.particles.push({
          x: confettiCanvas.width * Math.random(),
          y: confettiCanvas.height * Math.random() - confettiCanvas.height * 0.5,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 5 + 3,
          size: Math.random() * 7 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 8,
        });
      }

      const render = () => {
        cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        this.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotSpeed;
          cctx.save();
          cctx.translate(p.x, p.y);
          cctx.rotate((p.rotation * Math.PI) / 180);
          cctx.fillStyle = p.color;
          cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          cctx.restore();
        });
        this.animId = requestAnimationFrame(render);
      };
      if (this.animId) cancelAnimationFrame(this.animId);
      render();

      setTimeout(() => this.stop(), 3500);
    },
    stop() {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (!confettiCanvas) return;
      const cctx = confettiCanvas.getContext('2d');
      cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    },
  };

  // ==========================================
  // FLUTTER WEBVIEW BRIDGE DISPATCHER
  // ==========================================
  function notifyFlutterApp(result) {
    const payload = {
      event: 'onGameOver',
      game: 'ballmerge',
      winner: result.winner || (result.targetReached ? 'X' : 'O'),
      targetReached: Boolean(result.targetReached),
      score: result.score,
      targetScore: result.targetScore || targetScore,
      coins: result.coins,
      unit: rewardUnit,
      highestOrb: result.highestOrb,
      moves: result.drops,
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
  // GAME STATE & PHYSICS SYSTEM
  // ==========================================
  let width = 360;
  let height = 470;
  let balls = [];
  let particles = [];
  let score = 0;
  let highestOrbValue = 2;
  let isGameOver = false;
  let dropCooldown = false;
  let totalDrops = 0;
  let lastGameResult = null;

  // Aim dropper state
  let aimX = width / 2;
  let isAiming = false;
  let currentTier = 0;
  let nextTier = 0;

  // Danger line config
  const DANGER_Y = 75;
  let dangerTimer = 0;
  const DANGER_LIMIT_SECONDS = 2.5;

  // Combo system
  let comboCount = 0;
  let comboTimer = null;

  // Physics constants - snappy, responsive arcade feel
  const GRAVITY = 1.35;
  const RESTITUTION = 0.32; // Bounciness
  const FRICTION = 0.993; // Air and rolling friction
  const SUB_STEPS = 8; // Physics solver iterations for stability

  // ==========================================
  // BALL CLASS
  // ==========================================
  class Ball {
    constructor(x, y, tierIndex, vx = 0, vy = 0) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.tier = tierIndex;
      this.radius = TIERS[tierIndex].radius;
      this.mass = this.radius * this.radius;
      this.toRemove = false;
      this.spawnScale = 1.0;
      this.isMerging = false;
      this.settledTime = 0;
    }

    update(dt) {
      this.vy += GRAVITY * dt;
      this.vx *= FRICTION;
      this.vy *= FRICTION;

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Quick spawn pop
      if (this.spawnScale < 1.0) {
        this.spawnScale = Math.min(1.0, this.spawnScale + 0.25 * dt);
      }

      // Left Wall
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx = -this.vx * RESTITUTION;
        AudioEngine.bounce();
      }

      // Right Wall
      if (this.x + this.radius > width) {
        this.x = width - this.radius;
        this.vx = -this.vx * RESTITUTION;
        AudioEngine.bounce();
      }

      // Floor
      if (this.y + this.radius > height) {
        this.y = height - this.radius;
        this.vy = -this.vy * RESTITUTION;
        if (Math.abs(this.vy) < 0.2) this.vy = 0;
        this.vx *= 0.95;
      }
    }

    draw(c) {
      const tierInfo = TIERS[this.tier];
      const r = this.radius * this.spawnScale;

      c.save();
      c.translate(this.x, this.y);

      // Radial Glowing Gradient Orb
      const grad = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, tierInfo.grad[0]);
      grad.addColorStop(1, tierInfo.grad[1]);

      // Subtle Outer Glow
      c.shadowColor = tierInfo.color;
      c.shadowBlur = Math.min(18, r * 0.4);

      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fillStyle = grad;
      c.fill();

      // Inner Reflection Arc
      c.shadowBlur = 0;
      c.beginPath();
      c.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      c.lineWidth = Math.max(1, r * 0.07);
      c.stroke();

      // Number Label
      c.fillStyle = (this.tier === 0 || this.tier === 3 || this.tier === 10) ? '#1e202e' : '#ffffff';
      c.font = `900 ${Math.max(10, Math.round(r * 0.65))}px 'Outfit', sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`${tierInfo.value}`, 0, 1);

      c.restore();
    }
  }

  // ==========================================
  // PARTICLE SYSTEM (Shockwaves & Sparks)
  // ==========================================
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.color = color;
      this.life = 1.0;
      this.decay = Math.random() * 0.04 + 0.03;
      this.size = Math.random() * 5 + 3;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.1; // gravity
      this.life -= this.decay;
    }

    draw(c) {
      if (this.life <= 0) return;
      c.save();
      c.globalAlpha = Math.max(0, this.life);
      c.fillStyle = this.color;
      c.beginPath();
      c.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  class Shockwave {
    constructor(x, y, color, maxRadius) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.radius = 5;
      this.maxRadius = maxRadius;
      this.life = 1.0;
    }

    update() {
      this.radius += (this.maxRadius - this.radius) * 0.2;
      this.life -= 0.06;
    }

    draw(c) {
      if (this.life <= 0) return;
      c.save();
      c.globalAlpha = Math.max(0, this.life * 0.8);
      c.strokeStyle = this.color;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  // ==========================================
  // CANVAS RESIZE & SETUP
  // ==========================================
  function resizeCanvas() {
    if (!arenaFrame || !canvas) return;
    const rect = arenaFrame.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    // Handle high DPI displays crispness
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    aimX = Math.max(TIERS[currentTier].radius + 5, Math.min(width - TIERS[currentTier].radius - 5, aimX));
  }

  // ==========================================
  // GAME INITIALIZATION
  // ==========================================
  function initGame() {
    balls = [];
    particles = [];
    score = 0;
    isGameOver = false;
    dropCooldown = false;
    totalDrops = 0;
    highestOrbValue = 2;
    dangerTimer = 0;

    currentTier = getRandomInitialTier();
    nextTier = getRandomInitialTier();
    aimX = width / 2;

    updateScoreDisplay();
    updateNextBallPreview();

    if (dangerLineEl) dangerLineEl.classList.remove('active-danger');
    if (resultModal) {
      resultModal.classList.remove('active');
      resultModal.classList.remove('card-hidden');
    }
    if (rewardBox) rewardBox.style.display = rewardValue > 0 ? 'flex' : 'none';
    if (btnSavePoints) {
      btnSavePoints.textContent = '💾 Save Points';
      btnSavePoints.disabled = false;
      btnSavePoints.style.display = rewardValue > 0 ? 'block' : 'none';
    }
    Confetti.stop();
  }

  function getRandomInitialTier() {
    // Only spawn lower tier orbs (2, 4, 8, or rarely 16)
    const rand = Math.random();
    if (rand < 0.55) return 0; // 2
    if (rand < 0.85) return 1; // 4
    if (rand < 0.96) return 2; // 8
    return 3; // 16
  }

  function updateScoreDisplay() {
    if (currentScoreEl) currentScoreEl.textContent = `${score}`;
    if (targetScoreEl) targetScoreEl.textContent = `${targetScore}`;
    if (modalTargetScore) modalTargetScore.textContent = `${targetScore}`;
  }

  function updateNextBallPreview() {
    const nextInfo = TIERS[nextTier];
    if (nextBallPreviewEl && nextBallTextEl) {
      nextBallPreviewEl.style.background = `radial-gradient(circle at 35% 35%, ${nextInfo.grad[0]}, ${nextInfo.grad[1]})`;
      nextBallPreviewEl.style.boxShadow = `0 0 12px ${nextInfo.color}`;
      nextBallTextEl.textContent = `${nextInfo.value}`;
    }
  }

  // ==========================================
  // DROP BALL ACTION
  // ==========================================
  function dropBall() {
    if (dropCooldown || isGameOver) return;

    const tierInfo = TIERS[currentTier];
    const clampedX = Math.max(tierInfo.radius + 6, Math.min(width - tierInfo.radius - 6, aimX));
    const dropY = Math.max(tierInfo.radius + 8, 40);

    const newBall = new Ball(clampedX, dropY, currentTier, 0, 3.5);
    balls.push(newBall);
    totalDrops++;

    AudioEngine.drop();

    // Advance tiers
    currentTier = nextTier;
    nextTier = getRandomInitialTier();
    updateNextBallPreview();

    // Trigger short cooldown for rapid, snappy gameplay
    dropCooldown = true;
    setTimeout(() => {
      dropCooldown = false;
    }, 180);
  }

  // ==========================================
  // PHYSICS COLLISION & MERGING ENGINE
  // ==========================================
  function updatePhysics() {
    const dt = 1.0 / SUB_STEPS;

    for (let step = 0; step < SUB_STEPS; step++) {
      // 1. Move all balls
      for (let i = 0; i < balls.length; i++) {
        balls[i].update(dt);
      }

      // 2. Resolve Ball vs Ball Collisions & Merging
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];

          if (b1.toRemove || b2.toRemove) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const distSq = dx * dx + dy * dy;
          const minDist = b1.radius + b2.radius;

          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const nx = dx / dist;
            const ny = dy / dist;

            // Check Merge Match
            if (b1.tier === b2.tier && b1.tier < TIERS.length - 1 && !b1.isMerging && !b2.isMerging) {
              b1.toRemove = true;
              b2.toRemove = true;
              mergeBalls(b1, b2);
              continue;
            }

            // Normal Elastic Collision Resolution
            const overlap = (minDist - dist) * 0.5;
            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / (b1.mass + b2.mass);

            b1.vx -= p * b2.mass * nx * (1 + RESTITUTION);
            b1.vy -= p * b2.mass * ny * (1 + RESTITUTION);
            b2.vx += p * b1.mass * nx * (1 + RESTITUTION);
            b2.vy += p * b1.mass * ny * (1 + RESTITUTION);
          }
        }
      }
    }

    // Remove merged balls
    balls = balls.filter((b) => !b.toRemove);

    // Check Danger Line Condition
    checkDangerStatus();
  }

  // ==========================================
  // MERGE HANDLER
  // ==========================================
  function mergeBalls(b1, b2) {
    const nextTierIdx = b1.tier + 1;
    const midX = (b1.x + b2.x) / 2;
    const midY = (b1.y + b2.y) / 2;

    const mergedBall = new Ball(midX, midY, nextTierIdx, (b1.vx + b2.vx) * 0.3, (b1.vy + b2.vy) * 0.3);
    balls.push(mergedBall);

    const mergedTier = TIERS[nextTierIdx];
    if (mergedTier.value > highestOrbValue) {
      highestOrbValue = mergedTier.value;
    }

    // Score Gain + Combo
    triggerComboGain(mergedTier.score);

    // Audio & Effects
    AudioEngine.merge(nextTierIdx);

    // Particle Burst
    for (let p = 0; p < 14; p++) {
      particles.push(new Particle(midX, midY, mergedTier.color));
    }
    particles.push(new Shockwave(midX, midY, mergedTier.color, mergedTier.radius * 2.2));

    // If 2048 reached, celebrate!
    if (mergedTier.value === 2048) {
      AudioEngine.win2048();
      Confetti.start();
    }
  }

  function triggerComboGain(pts) {
    comboCount++;
    const bonus = Math.floor(pts * (1 + (comboCount - 1) * 0.25));
    score += bonus;
    updateScoreDisplay();

    if (comboPill && comboText) {
      comboText.textContent = `COMBO x${comboCount}`;
      comboPill.classList.add('active');
    }

    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
      comboCount = 0;
      if (comboPill) comboPill.classList.remove('active');
    }, 1800);

    // Check if Target Score is reached
    if (score >= targetScore && !isGameOver) {
      triggerGameOver(true);
    }
  }

  // ==========================================
  // DANGER LIMIT CHECK
  // ==========================================
  function checkDangerStatus() {
    if (isGameOver) return;

    let isAnyBallAboveDanger = false;

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      // Only trigger if ball is settled/moving slowly above danger line
      if (b.y - b.radius < DANGER_Y && Math.abs(b.vy) < 0.6 && b.spawnScale >= 0.95) {
        isAnyBallAboveDanger = true;
        break;
      }
    }

    if (isAnyBallAboveDanger) {
      dangerTimer += 1 / 60;
      if (dangerLineEl) dangerLineEl.classList.add('active-danger');

      if (dangerTimer >= DANGER_LIMIT_SECONDS) {
        triggerGameOver(false);
      }
    } else {
      dangerTimer = Math.max(0, dangerTimer - 1 / 60);
      if (dangerTimer === 0 && dangerLineEl) {
        dangerLineEl.classList.remove('active-danger');
      }
    }
  }

  // ==========================================
  // GAME OVER / TARGET REACHED HANDLER
  // ==========================================
  function triggerGameOver(targetReached = false) {
    if (isGameOver) return;
    isGameOver = true;

    let earnedCoins = 0;

    if (targetReached) {
      earnedCoins = rewardValue;
      AudioEngine.win2048();
      Confetti.start();
      if (modalGlow) modalGlow.textContent = '🏆';
      if (modalTitle) modalTitle.textContent = 'TARGET REACHED!';
      if (modalSubtitle) modalSubtitle.textContent = `Awesome match! You reached the target score of ${targetScore}!`;
      if (rewardBox) rewardBox.style.display = earnedCoins > 0 ? 'flex' : 'none';
      if (rewardText) rewardText.textContent = `+${earnedCoins} ${rewardUnit} Earned`;
      if (btnSavePoints) {
        btnSavePoints.style.display = earnedCoins > 0 ? 'block' : 'none';
        btnSavePoints.textContent = '💾 Save Points';
        btnSavePoints.disabled = false;
      }
    } else {
      earnedCoins = 0;
      AudioEngine.gameOver();
      if (modalGlow) modalGlow.textContent = '⚠️';
      if (modalTitle) modalTitle.textContent = 'GAME OVER!';
      if (modalSubtitle) modalSubtitle.textContent = `Danger limit reached before achieving target score (${score}/${targetScore}).`;
      if (rewardBox) rewardBox.style.display = 'none';
      if (btnSavePoints) btnSavePoints.style.display = 'none';
    }

    lastGameResult = {
      score: score,
      targetScore: targetScore,
      targetReached: targetReached,
      winner: targetReached ? 'X' : 'O',
      coins: earnedCoins,
      highestOrb: highestOrbValue,
      drops: totalDrops,
    };

    if (modalFinalScore) modalFinalScore.textContent = `${score}`;
    if (modalTargetScore) modalTargetScore.textContent = `${targetScore}`;
    if (modalHighestOrb) modalHighestOrb.textContent = `${highestOrbValue}`;

    // Only notify Flutter if player reached target (victory)
    if (targetReached) {
      notifyFlutterApp(lastGameResult);
    }

    // Show modal overlay
    setTimeout(() => {
      if (resultModal) {
        resultModal.classList.remove('card-hidden');
        resultModal.classList.add('active');
      }
    }, 600);
  }

  // ==========================================
  // MAIN RENDER LOOP
  // ==========================================
  function gameLoop() {
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Aim Laser & Ghost Drop Preview if active
    if (!isGameOver && !dropCooldown) {
      const tierInfo = TIERS[currentTier];
      const clampedX = Math.max(tierInfo.radius + 6, Math.min(width - tierInfo.radius - 6, aimX));
      const previewY = Math.max(tierInfo.radius + 8, 40);

      ctx.save();
      // Dashed Aim Laser
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(112, 66, 244, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(clampedX, previewY);
      ctx.lineTo(clampedX, height);
      ctx.stroke();

      // Ghost Ball Preview at top (Full scale, zero shrinking)
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.95;
      const previewBall = new Ball(clampedX, previewY, currentTier);
      previewBall.spawnScale = 1.0;
      previewBall.draw(ctx);
      ctx.restore();
    }

    // 2. Update and Draw Physics Balls
    updatePhysics();
    for (let i = 0; i < balls.length; i++) {
      balls[i].draw(ctx);
    }

    // 3. Update and Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw(ctx);
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }

    requestAnimationFrame(gameLoop);
  }

  // ==========================================
  // POINTER & TOUCH CONTROLS
  // ==========================================
  function getCanvasRelativeX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return clientX - rect.left;
  }

  function handlePointerDown(e) {
    if (isGameOver) return;
    isAiming = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    aimX = getCanvasRelativeX(clientX);
  }

  function handlePointerMove(e) {
    if (isGameOver) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    aimX = getCanvasRelativeX(clientX);
  }

  function handlePointerUp() {
    if (isGameOver || !isAiming) return;
    isAiming = false;
    dropBall();
  }

  canvas.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
  window.addEventListener('touchmove', handlePointerMove, { passive: true });
  window.addEventListener('touchend', handlePointerUp);

  // ==========================================
  // BUTTON ACTIONS (Save, Play Again, Exit)
  // ==========================================
  function savePoints() {
    if (!lastGameResult || lastGameResult.coins <= 0) return;

    const payload = {
      event: 'savePoints',
      game: 'ballmerge',
      winner: lastGameResult.winner || (lastGameResult.targetReached ? 'X' : 'O'),
      targetReached: Boolean(lastGameResult.targetReached),
      score: lastGameResult.score,
      targetScore: lastGameResult.targetScore || targetScore,
      coins: lastGameResult.coins,
      unit: rewardUnit,
      highestOrb: lastGameResult.highestOrb,
      moves: lastGameResult.drops,
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

    // Close the dialog card while keeping the blurred backdrop active
    if (resultModal) {
      resultModal.classList.add('card-hidden');
    }
  }

  function exitGame() {
    const payload = {
      event: 'exitGame',
      game: 'ballmerge',
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

  if (btnSavePoints) btnSavePoints.addEventListener('click', savePoints);
  if (btnPlayAgain) btnPlayAgain.addEventListener('click', initGame);
  if (btnRestartInGame) btnRestartInGame.addEventListener('click', initGame);
  if (btnExit) btnExit.addEventListener('click', exitGame);
  if (btnTopQuit) btnTopQuit.addEventListener('click', exitGame);

  // Resize Listener
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  });

  // Start engine
  window.addEventListener('load', () => {
    resizeCanvas();
    initGame();
    requestAnimationFrame(gameLoop);
  });
})();
