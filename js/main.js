/**
 * GALAGA ULTRA - MAIN ENTRY & UI CONTROLLER
 * Integrates Engine, Audio Synthesizer, Renderers, VFX, Entities, and Gameplay Systems.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const wrapper = document.getElementById('canvas-wrapper');

  // Modals & HUD Elements
  const startModal = document.getElementById('start-modal');
  const upgradeModal = document.getElementById('upgrade-modal');
  const gameoverModal = document.getElementById('gameover-modal');
  const pauseModal = document.getElementById('pause-modal');

  const startBtn = document.getElementById('start-btn');
  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  const restartBtn = document.getElementById('restart-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const nextWaveBtn = document.getElementById('next-wave-btn');

  const scoreVal = document.getElementById('score-val');
  const waveVal = document.getElementById('wave-val');
  const multiplierVal = document.getElementById('multiplier-val');
  const highScoreVal = document.getElementById('high-score-val');
  const healthBar = document.getElementById('health-bar');
  const shieldBar = document.getElementById('shield-bar');
  const energyBar = document.getElementById('energy-bar');
  const weaponTypeBadge = document.getElementById('weapon-type');
  const modeBadge = document.getElementById('mode-badge');

  let audioSynth = null;
  let gameEngine = null;
  let isAudioEnabled = true;

  // ==========================================
  // Audio
  // ==========================================

  function initAudio() {
    if (!audioSynth && (window.GalagaAudio || window.WebAudioSynthesizer)) {
      const AudioClass =
        (window.GalagaAudio &&
          window.GalagaAudio.AudioSynthesizer) ||
        window.WebAudioSynthesizer;

      if (AudioClass) {
        audioSynth = new AudioClass();
        audioSynth.init();
      }
    }

    if (audioSynth) {
      if (isAudioEnabled) {
        audioSynth.ensureContext();
        audioSynth.startMusic('NORMAL');
      } else {
        audioSynth.stopMusic();
      }
    }
  }

  // ==========================================
  // Canvas Resize
  // ==========================================

  function resizeCanvas() {
    if (!wrapper || !canvas) return;

    const rect = wrapper.getBoundingClientRect();

    const width = Math.max(
      1,
      Math.round(rect.width || window.innerWidth || 1024)
    );

    const height = Math.max(
      1,
      Math.round(rect.height || window.innerHeight || 768)
    );

    // ★ Device Pixel Ratio
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Canvas 實際繪圖像素
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    // Canvas CSS 顯示尺寸
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // ★★★ 重要 ★★★
    // 遊戲邏輯仍使用 CSS 尺寸，
    // 不使用 canvas.width / canvas.height 當遊戲座標。
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (gameEngine) {
      gameEngine.width = width;
      gameEngine.height = height;

      if (gameEngine.waveManager) {
        gameEngine.waveManager.canvasWidth = width;
        gameEngine.waveManager.canvasHeight = height;
      }
    }
  }

  window.addEventListener('resize', resizeCanvas);

  // ★ 手機旋轉
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      resizeCanvas();
    }, 150);
  });

  resizeCanvas();

  // ==========================================
  // Start Game
  // ==========================================

  startBtn.addEventListener('click', () => {

    startModal.classList.remove('active');
    startModal.style.display = 'none';

    resizeCanvas();
    initAudio();

    if (!gameEngine && window.GalagaGameplay) {

      gameEngine =
        new window.GalagaGameplay.GalagaGameEngine(canvas);

      gameEngine.audioSynth = audioSynth;
    }

    if (gameEngine) {

      window.gameEngine = gameEngine;

      // ★ 使用 CSS 顯示尺寸
      const rect = wrapper.getBoundingClientRect();

      gameEngine.width = Math.round(rect.width);
      gameEngine.height = Math.round(rect.height);

      // ★ 同步 WaveManager
      if (gameEngine.waveManager) {
        gameEngine.waveManager.canvasWidth =
          gameEngine.width;

        gameEngine.waveManager.canvasHeight =
          gameEngine.height;
      }

      gameEngine.start();
    }
  });

  // ==========================================
  // Audio Toggle
  // ==========================================

  audioToggleBtn.addEventListener('click', () => {

    isAudioEnabled = !isAudioEnabled;

    audioToggleBtn.textContent =
      `音效音樂: ${isAudioEnabled ? '開啟' : '關閉'}`;

    if (audioSynth) {
      audioSynth.setMute(!isAudioEnabled);
    }
  });

  // ==========================================
  // Restart
  // ==========================================

  restartBtn.addEventListener('click', () => {

    gameoverModal.classList.remove('active');
    gameoverModal.style.display = 'none';

    if (gameEngine) {
      resizeCanvas();
      gameEngine.restart();
    }
  });

  // ==========================================
  // Resume
  // ==========================================

  resumeBtn.addEventListener('click', () => {

    pauseModal.classList.remove('active');
    pauseModal.style.display = 'none';

    if (gameEngine) {
      gameEngine.isPaused = false;
    }
  });

  // ==========================================
  // Next Wave
  // ==========================================

  nextWaveBtn.addEventListener('click', () => {

    upgradeModal.classList.remove('active');
    upgradeModal.style.display = 'none';

    if (gameEngine && gameEngine.waveManager) {

      gameEngine.waveManager.startNextWave(
        gameEngine.enemies
      );

      gameEngine.isPaused = false;
    }
  });

  // ==========================================
  // HUD Update
  // ==========================================

  setInterval(() => {

    if (!gameEngine) return;

    try {

      if (gameEngine.scoreManager) {

        const mult =
          gameEngine.scoreManager.comboMultiplier ||
          gameEngine.scoreManager.multiplier ||
          1.0;

        if (scoreVal) {
          scoreVal.textContent =
            String(
              gameEngine.scoreManager.score || 0
            ).padStart(6, '0');
        }

        if (highScoreVal) {
          highScoreVal.textContent =
            String(
              gameEngine.scoreManager.highScore || 0
            ).padStart(6, '0');
        }

        if (multiplierVal) {
          multiplierVal.textContent =
            `MULTIPLIER x${mult.toFixed(1)}`;
        }
      }

      if (gameEngine.waveManager && waveVal) {

        waveVal.textContent =
          `WAVE ${
            gameEngine.waveManager.currentWave || 1
          }`;
      }

      if (gameEngine.player) {

        const p = gameEngine.player;

        const hpVal =
          p.health !== undefined
            ? p.health
            : (p.hp !== undefined ? p.hp : 100);

        const maxHpVal =
          p.maxHealth !== undefined
            ? p.maxHealth
            : (p.maxHp !== undefined ? p.maxHp : 100);

        const hpPct =
          Math.max(
            0,
            Math.min(
              100,
              (hpVal / maxHpVal) * 100
            )
          );

        const shVal =
          p.shieldHp !== undefined
            ? p.shieldHp
            : (p.shield !== undefined ? p.shield : 0);

        const maxShVal =
          p.shieldMaxHp !== undefined
            ? p.shieldMaxHp
            : (p.maxShield !== undefined ? p.maxShield : 50);

        const shieldPct =
          p.hasShield
            ? Math.max(
                0,
                Math.min(
                  100,
                  (shVal / maxShVal) * 100
                )
              )
            : 0;

        if (healthBar) {
          healthBar.style.width =
            `${hpPct}%`;
        }

        if (shieldBar) {
          shieldBar.style.width =
            `${shieldPct}%`;
        }

        const empPct =
          ((gameEngine.empNukesCount || 0) / 3) * 100;

        if (energyBar) {
          energyBar.style.width =
            `${empPct}%`;
        }

        if (weaponTypeBadge) {
          weaponTypeBadge.textContent =
            p.weaponType
              ? p.weaponType.toUpperCase()
              : 'LASER V1';
        }

        if (modeBadge) {
          modeBadge.textContent =
            p.isDualFighter
              ? '🔥 DUAL FIGHTERS'
              : 'SINGLE JET';
        }
      }

      // Game Over Modal
      if (
        gameEngine.isGameOver &&
        !gameoverModal.classList.contains('active')
      ) {

        const finalScoreEl =
          document.getElementById('final-score');

        if (finalScoreEl) {
          finalScoreEl.textContent =
            gameEngine.scoreManager
              ? gameEngine.scoreManager.score
              : 0;
        }

        gameoverModal.classList.add('active');
        gameoverModal.style.display = 'flex';
      }

    } catch (err) {

      console.error(
        'HUD interval update error:',
        err
      );

    }

  }, 100);

  // ==========================================
  // Keyboard Shortcuts
  // ==========================================

  window.addEventListener('keydown', (e) => {

    if (
      e.key.toLowerCase() === 'p' &&
      gameEngine
    ) {

      gameEngine.isPaused =
        !gameEngine.isPaused;

      if (gameEngine.isPaused) {

        pauseModal.classList.add('active');
        pauseModal.style.display = 'flex';

      } else {

        pauseModal.classList.remove('active');
        pauseModal.style.display = 'none';

      }
    }
  });

});
