/**
 * GALAGA ULTRA - GAMEPLAY & ENGINE SYSTEM
 * High-performance, modular ES6 Gameplay Engine for Galaga Ultra.
 * Controls Manager, Formation & Wave Manager, Tractor Beam & Rescue Logic,
 * Score/Combo Multipliers, Powerup System, Collision Physics & Main Game Loop.
 */

(function(window) {
  'use strict';

  const { Vector2D, Projectile, Powerup, POWERUP_TYPES, PlayerShip, Enemy, CyberDreadnought, HiveEmpress } = window.GalagaEntities;
  // ==========================================
  // 1. CONTROLS MANAGER
  // ==========================================
  class ControlsManager {
    constructor(canvasElement) {
      this.canvas = canvasElement;
      // ★ 由 GalagaGameEngine 同步目前的 Player
      this.player = null;

      // ★ 手機相對拖曳控制
      this.touchActive = false;
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.touchPlayerStartX = 0;
      this.touchPlayerStartY = 0;
      this.inputState = {
        left: false,
        right: false,
        up: false,
        down: false,
        fire: false,
        emp: false,
        focus: false,
        controlMode: 'KEYBOARD', // 'KEYBOARD', 'MOUSE', 'TOUCH'
        movePos: null
      };

      this.setupKeyboardListeners();
      this.setupMouseListeners();
      this.setupTouchListeners();
    }

    setupKeyboardListeners() {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }

        const k = e.key.toLowerCase();
        if (k === 'w' || e.key === 'ArrowUp') this.inputState.up = true;
        if (k === 's' || e.key === 'ArrowDown') this.inputState.down = true;
        if (k === 'a' || e.key === 'ArrowLeft') this.inputState.left = true;
        if (k === 'd' || e.key === 'ArrowRight') this.inputState.right = true;
        if (k === ' ' || k === 'j') this.inputState.fire = true;
        if (k === 'k' || k === 'e') this.inputState.emp = true;
        if (e.key === 'Shift') this.inputState.focus = true;

        this.inputState.controlMode = 'KEYBOARD';
      });

      window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || e.key === 'ArrowUp') this.inputState.up = false;
        if (k === 's' || e.key === 'ArrowDown') this.inputState.down = false;
        if (k === 'a' || e.key === 'ArrowLeft') this.inputState.left = false;
        if (k === 'd' || e.key === 'ArrowRight') this.inputState.right = false;
        if (k === ' ' || k === 'j') this.inputState.fire = false;
        if (k === 'k' || k === 'e') this.inputState.emp = false;
        if (e.key === 'Shift') this.inputState.focus = false;
      });
    }

    setupMouseListeners() {
      if (!this.canvas) return;

      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.inputState.movePos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      });

      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.inputState.fire = true;
          this.inputState.controlMode = 'MOUSE';
        } else if (e.button === 2) {
          e.preventDefault();
          this.inputState.emp = true;
        }
      });

      this.canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.inputState.fire = false;
        if (e.button === 2) this.inputState.emp = false;
      });

      this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    setupTouchListeners() {
      if (!this.canvas) return;

      // ==========================================
      // ★ Mobile Relative Drag Control
      // ==========================================

      const getTouchPosition = (touch) => {

        const rect =
          this.canvas.getBoundingClientRect();

        // ★ 使用 Canvas CSS 顯示尺寸
        // 不使用 canvas.width / canvas.height
        // 避免 devicePixelRatio 造成座標放大。
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        };
      };

      // ==========================================
      // Touch Start
      // ==========================================

      this.canvas.addEventListener(
        'touchstart',
        (e) => {

          e.preventDefault();

          if (!e.touches.length) return;

          this.inputState.controlMode = 'TOUCH';
          this.inputState.fire = true;

          this.touchActive = true;

          const pos =
            getTouchPosition(e.touches[0]);

          // ★ 記住手指起始位置
          this.touchStartX = pos.x;
          this.touchStartY = pos.y;

          // ★ 記住戰機目前位置
          // 防止第一次觸碰時戰機瞬移
          if (
            this.player &&
            this.player.pos
          ) {

            this.touchPlayerStartX =
              this.player.pos.x;

            this.touchPlayerStartY =
              this.player.pos.y;

          } else {

            this.touchPlayerStartX =
              pos.x;

            this.touchPlayerStartY =
              pos.y;
          }

          // ★ 初始位置保持戰機原本的位置
          this.inputState.movePos = {
            x: this.touchPlayerStartX,
            y: this.touchPlayerStartY
          };

        },
        { passive: false }
      );

      // ==========================================
      // Touch Move
      // ==========================================

      this.canvas.addEventListener(
        'touchmove',
        (e) => {

          e.preventDefault();

          if (
            !e.touches.length ||
            !this.touchActive
          ) {
            return;
          }

          const pos =
            getTouchPosition(e.touches[0]);

          // ★ 手指移動多少，戰機就跟著移動多少
          const dx =
            pos.x - this.touchStartX;

          const dy =
            pos.y - this.touchStartY;

          this.inputState.movePos = {
            x: this.touchPlayerStartX + dx,
            y: this.touchPlayerStartY + dy
          };

        },
        { passive: false }
      );

      // ==========================================
      // Touch End
      // ==========================================

      this.canvas.addEventListener(
        'touchend',
        (e) => {

          e.preventDefault();

          this.touchActive = false;

          this.inputState.fire = false;

          this.inputState.movePos = null;

        },
        { passive: false }
      );

      // ==========================================
      // Touch Cancel
      // ==========================================

      this.canvas.addEventListener(
        'touchcancel',
        (e) => {
          e.preventDefault();
          this.touchActive = false;
          this.inputState.fire = false;
          this.inputState.movePos = null;
        },
        { passive: false }
      );
    }
  }

  // ==========================================
  // 2. SCORE & COMBO MANAGER
  // ==========================================
  class ScoreComboManager {
    constructor() {
      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('galaga_ultra_highscore') || '0', 10);
      this.comboCount = 0;
      this.comboMultiplier = 1.0;
      this.comboTimer = 0;
      this.comboMaxTime = 2.5; // Seconds before combo resets
      this.floatingTexts = [];
    }

    get multiplier() { return this.comboMultiplier; }

    reset() {
      this.score = 0;
      this.comboCount = 0;
      this.comboMultiplier = 1.0;
      this.comboTimer = 0;
      this.floatingTexts = [];
    }

    addKillScore(baseScore, x, y) {
      this.comboCount++;
      this.comboTimer = this.comboMaxTime;

      // Multiplier steps: 1x -> 1.5x -> 2x -> 3x -> 5x -> 10x
      if (this.comboCount >= 30) this.comboMultiplier = 10.0;
      else if (this.comboCount >= 20) this.comboMultiplier = 5.0;
      else if (this.comboCount >= 12) this.comboMultiplier = 3.0;
      else if (this.comboCount >= 6) this.comboMultiplier = 2.0;
      else if (this.comboCount >= 3) this.comboMultiplier = 1.5;
      else this.comboMultiplier = 1.0;

      const earnedScore = Math.floor(baseScore * this.comboMultiplier);
      this.score += earnedScore;

      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('galaga_ultra_highscore', this.highScore.toString());
      }

      // Add floating text
      this.floatingTexts.push({
        text: `+${earnedScore}` + (this.comboMultiplier > 1 ? ` (${this.comboMultiplier}x)` : ''),
        x: x,
        y: y,
        life: 1.0,
        color: this.comboMultiplier >= 5.0 ? '#ff0055' : (this.comboMultiplier >= 2.0 ? '#ffff00' : '#00f0ff')
      });
    }

    update(dt) {
      if (this.comboCount > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.comboCount = 0;
          this.comboMultiplier = 1.0;
          this.comboTimer = 0;
        }
      }

      // Update floating score texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= dt * 45;
        ft.life -= dt * 1.4;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    draw(ctx) {
      ctx.save();
      this.floatingTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.fillText(ft.text, ft.x, ft.y);
      });
      ctx.restore();
    }
  }

  // ==========================================
  // 3. WAVE & FORMATION MANAGER
  // ==========================================
  class WaveManager {
    constructor(canvasWidth, canvasHeight) {
      this.canvasWidth = canvasWidth;
      this.canvasHeight = canvasHeight;
      this.currentWave = 1;
      this.waveState = 'WAVE_START'; // WAVE_START, IN_PROGRESS, WAVE_CLEAR, BOSS_BATTLE
      this.stateTimer = 0;
      this.diveTimer = 0;
      this.activeBoss = null;
    }

    startNextWave(enemiesList) {
      this.currentWave++;
      this.activeBoss = null;

      if (this.currentWave % 3 === 0) {
        // Boss Wave!
        this.waveState = 'BOSS_BATTLE';
        if (this.currentWave % 6 === 0) {
          this.activeBoss = new HiveEmpress(this.canvasWidth);
        } else {
          this.activeBoss = new CyberDreadnought(this.canvasWidth);
        }
      } else {
        this.waveState = 'IN_PROGRESS';
        this.generateEnemyGrid(enemiesList);
      }
    }

    generateEnemyGrid(enemiesList) {
      enemiesList.length = 0; // Clear existing

      const rows = 4;
      const cols = 8;
      const spacingX = 65;
      const spacingY = 50;
      const startX = (this.canvasWidth - (cols - 1) * spacingX) / 2;
      const startY = 110;

      const typeMap = ['PHANTOM', 'CRUISER', 'KAMIKAZE', 'VANGUARD'];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const gridX = startX + c * spacingX;
          const gridY = startY + r * spacingY;
          const enemyType = typeMap[r % typeMap.length];

          // Entry Bézier Swooping Path
          const entrySide = (c + r) % 2 === 0 ? -100 : this.canvasWidth + 100;
          const pathPoint = (t) => {
            const p0 = new Vector2D(entrySide, -50);
            const p1 = new Vector2D(this.canvasWidth / 2, 200);
            const p2 = new Vector2D(gridX, gridY + 150);
            const p3 = new Vector2D(gridX, gridY);
            return Vector2D.getBezierPoint(p0, p1, p2, p3, t);
          };

          enemiesList.push(new Enemy({
            x: gridX,
            y: gridY,
            gridX: gridX,
            gridY: gridY,
            type: enemyType,
            path: pathPoint,
            pathSpeed: 0.5 + Math.random() * 0.2,
            maxHealth: enemyType === 'CRUISER' ? 60 : (enemyType === 'PHANTOM' ? 45 : 30),
            scoreValue: enemyType === 'PHANTOM' ? 300 : (enemyType === 'CRUISER' ? 200 : 100)
          }));
        }
      }
    }

    update(dt, gameSpeed, enemiesList, playerShip, enemyProjectiles) {
      // Dive-bomb dispatcher
      if (this.waveState === 'IN_PROGRESS' && enemiesList.length > 0) {
        this.diveTimer += dt * gameSpeed;
        if (this.diveTimer >= Math.max(1.5, 4.0 - this.currentWave * 0.3)) {
          this.diveTimer = 0;

          // Select random non-diving enemies to swoop dive
          const availableEnemies = enemiesList.filter(e => e.state === 'GRID_HOVER');
          if (availableEnemies.length > 0) {
            const numDiving = Math.min(availableEnemies.length, 1 + Math.floor(Math.random() * 2));
            for (let i = 0; i < numDiving; i++) {
              const enemy = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
              if (enemy.type === 'PHANTOM' && Math.random() < 0.4 && !playerShip.isCaptured) {
                enemy.startTractorBeam(this.canvasHeight);
              } else {
                enemy.startDive(playerShip.pos, this.canvasWidth, this.canvasHeight);
              }
            }
          }
        }
      }

      // Check Boss update
      if (this.waveState === 'BOSS_BATTLE' && this.activeBoss) {
        if (this.activeBoss instanceof CyberDreadnought) {
          this.activeBoss.update(dt, gameSpeed, playerShip.pos, enemyProjectiles);
        } else if (this.activeBoss instanceof HiveEmpress) {
          this.activeBoss.update(dt, gameSpeed, playerShip.pos, enemiesList, enemyProjectiles);
        }

        if (this.activeBoss.isDead) {
          this.waveState = 'WAVE_CLEAR';
          this.stateTimer = 3.0;
        }
      } else if (this.waveState === 'IN_PROGRESS' && enemiesList.length === 0) {
        this.waveState = 'WAVE_CLEAR';
        this.stateTimer = 2.5;
      } else if (this.waveState === 'WAVE_CLEAR') {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.startNextWave(enemiesList);
        }
      }
    }
  }

  // ==========================================
  // 4. MAIN GALAGA GAME ENGINE
  // ==========================================
  class GalagaGameEngine {
    constructor(canvasId) {
      this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
      if (!this.canvas) return;

      //this.ctx = this.canvas.getContext('2d');
      //this.width = (this.canvas.width && this.canvas.width > 0) ? this.canvas.width : (window.innerWidth || 1024);
      //this.height = (this.canvas.height && this.canvas.height > 0) ? this.canvas.height : (window.innerHeight || 768);
      this.ctx = this.canvas.getContext('2d');

      // ==========================================
      // ★ IMPORTANT
      // Game logical size = CSS display size
      //
      // 不使用 canvas.width / canvas.height
      // 因為手機 Retina / DPR 會讓實體像素變成
      // CSS 尺寸的 2 倍、3 倍甚至更高。
      // ==========================================

      const rect =
        this.canvas.getBoundingClientRect();

      this.width = Math.max(
        1,
        Math.round(
          rect.width ||
          this.canvas.clientWidth ||
          window.innerWidth ||
          1024
        )
      );

      this.height = Math.max(
        1,
        Math.round(
          rect.height ||
          this.canvas.clientHeight ||
          window.innerHeight ||
          768
        )
      );
      // Systems
      //this.controls = new ControlsManager(this.canvas);
      //this.scoreManager = new ScoreComboManager();
      //this.waveManager = new WaveManager(this.width, this.height);
      //this.player = new PlayerShip(this.width, this.height);
      this.controls =
        new ControlsManager(this.canvas);

      this.scoreManager =
        new ScoreComboManager();

      this.waveManager =
        new WaveManager(
          this.width,
          this.height
        );

      this.player =
        new PlayerShip(
          this.width,
          this.height
        );

      // ★ 讓 ControlsManager 知道目前戰機的位置
      this.controls.player =
        this.player;

      // Entity Collections
      this.enemies = [];
      this.playerProjectiles = [];
      this.enemyProjectiles = [];
      this.powerups = [];
      this.particles = [];

      // Time Slow & Tactical EMP States
      this.timeSlowTimer = 0;
      this.empFlashTimer = 0;
      this.empNukesCount = 2; // Starting EMP charges

      // Starfield Background
      this.stars = this.generateStarfield(120);

      // Engine state
      this.isRunning = false;
      this.isPaused = false;
      this.isGameOver = false;
      this.lastTime = 0;

      // Explicitly initialize player and enemies
      this.createPlayer();
      this.createEnemies();
    }

    createPlayer() {
      const w = this.width || (this.canvas ? this.canvas.width : 1024);
      const h = this.height || (this.canvas ? this.canvas.height : 768);
      if (!this.player) {
        this.player = new PlayerShip(w, h);
      } else {
        this.player.resetPosition(w, h);
      }
      //this.player.pos.set(w / 2, h - 90);
      //this.player.isDead = false;
      //this.player.isCaptured = false;
      this.player.pos.set(
        w / 2,
        h - 90
      );

      // ★ 戰機重新建立／重生後
      // 重新同步給手機觸控控制器
      if (this.controls) {
        this.controls.player =
          this.player;
      }

      this.player.isDead = false;
      this.player.isCaptured = false;
      return this.player;
    }

    createEnemies() {
      const w = this.width || (this.canvas ? this.canvas.width : 1024);
      const h = this.height || (this.canvas ? this.canvas.height : 768);
      if (!this.waveManager) {
        this.waveManager = new WaveManager(w, h);
      } else {
        this.waveManager.canvasWidth = w;
        this.waveManager.canvasHeight = h;
      }
      this.enemies = [];
      this.waveManager.currentWave = 1;
      this.waveManager.waveState = 'IN_PROGRESS';
      this.waveManager.generateEnemyGrid(this.enemies);
      return this.enemies;
    }

    generateStarfield(count) {
      const stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 80 + 30,
          color: Math.random() < 0.3 ? '#00f0ff' : (Math.random() < 0.5 ? '#ffaa00' : '#ffffff')
        });
      }
      return stars;
    }

    triggerEMP() {
      if (this.empNukesCount <= 0 || this.isGameOver) return;
      this.empNukesCount--;
      this.empFlashTimer = 0.6;

      // Clear all enemy projectiles
      this.enemyProjectiles.length = 0;

      // Damage all screen enemies
      this.enemies.forEach(enemy => {
        if (enemy.takeDamage(120)) {
          this.scoreManager.addKillScore(enemy.scoreValue, enemy.pos.x, enemy.pos.y);
          this.createExplosion(enemy.pos.x, enemy.pos.y, enemy.color, 18);
        }
      });

      // Damage Active Boss if present
      if (this.waveManager.activeBoss && !this.waveManager.activeBoss.isDead) {
        if (this.waveManager.activeBoss.takeDamage(250)) {
          this.scoreManager.addKillScore(this.waveManager.activeBoss.scoreValue, this.waveManager.activeBoss.pos.x, this.waveManager.activeBoss.pos.y);
          this.createExplosion(this.waveManager.activeBoss.pos.x, this.waveManager.activeBoss.pos.y, '#ff0055', 40);
        }
      }
    }

    activateTimeSlow(duration = 6.0) {
      this.timeSlowTimer = duration;
    }

    spawnPowerupDrop(x, y) {
      if (Math.random() < 0.35) { // 35% drop chance
        this.powerups.push(new Powerup(x, y));
      }
    }

    createExplosion(x, y, color = '#ffaa00', count = 16) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 180 + 40;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4 + 2,
          life: 1.0,
          color: color
        });
      }
    }

    checkCollisions() {
      const gameSpeed = this.timeSlowTimer > 0 ? 0.3 : 1.0;

      // 1. Player Projectiles vs Enemies
      this.playerProjectiles.forEach(proj => {
        if (proj.markedForDeletion) return;

        this.enemies.forEach(enemy => {
          if (enemy.isDead || proj.markedForDeletion) return;
          if (proj.hitList.has(enemy.id)) return;

          if (proj.pos.dist(enemy.pos) < proj.radius + enemy.radius) {
            if (!proj.piercing) proj.markedForDeletion = true;
            proj.hitList.add(enemy.id);

            if (enemy.takeDamage(proj.damage)) {
              this.scoreManager.addKillScore(enemy.scoreValue, enemy.pos.x, enemy.pos.y);
              this.createExplosion(enemy.pos.x, enemy.pos.y, enemy.color, 16);
              this.spawnPowerupDrop(enemy.pos.x, enemy.pos.y);
            }
          }
        });

        // Player Projectiles vs Boss
        const boss = this.waveManager.activeBoss;
        if (boss && !boss.isDead && !proj.markedForDeletion && !proj.hitList.has('BOSS')) {
          if (proj.pos.dist(boss.pos) < proj.radius + boss.radius) {
            if (!proj.piercing) proj.markedForDeletion = true;
            proj.hitList.add('BOSS');

            if (boss.takeDamage(proj.damage, proj.pos)) {
              this.scoreManager.addKillScore(boss.scoreValue, boss.pos.x, boss.pos.y);
              this.createExplosion(boss.pos.x, boss.pos.y, '#ff0055', 45);
              this.spawnPowerupDrop(boss.pos.x, boss.pos.y);
              this.spawnPowerupDrop(boss.pos.x + 30, boss.pos.y);
            }
          }
        }
      });

      // 2. Enemy Projectiles vs Player Ship
      if (!this.player.isDead && !this.player.isCaptured) {
        this.enemyProjectiles.forEach(proj => {
          if (proj.markedForDeletion) return;
          if (proj.pos.dist(this.player.pos) < proj.radius + this.player.radius) {
            proj.markedForDeletion = true;
            console.log("★ Enemy Projectile HIT PLAYER, damage =", proj.damage);
            const shipDestroyed = this.player.takeDamage(proj.damage);
            this.createExplosion(this.player.pos.x, this.player.pos.y, '#00f0ff', 12);

            if (shipDestroyed) {
              this.handlePlayerDeath();
            }
          }
        });

        // Dreadnought Plasma Beam Collision Check
        const boss = this.waveManager.activeBoss;
        if (boss && boss instanceof CyberDreadnought && boss.isFiringBeam) {
          if (Math.abs(this.player.pos.x - boss.pos.x) < 35 && this.player.pos.y > boss.pos.y + 70) {
            const shipDestroyed = this.player.takeDamage(40 * 0.016); // High DPS beam
            if (shipDestroyed) this.handlePlayerDeath();
          }
        }
      }

      // 2.5 Enemy Ships vs Player Ship
      this.enemies.forEach(enemy => {
        if (enemy.isDead || this.player.isDead || this.player.isCaptured) return;

        if (enemy.pos.dist(this.player.pos) < enemy.radius + this.player.radius) {

          // 敵機直接撞擊玩家
          console.log("★★ Enemy Ship COLLISION with PLAYER, damage = 30");
          const shipDestroyed = this.player.takeDamage(30);
          // 玩家撞敵機 → 播放普通敵機爆炸聲
          if (window.gameEngine?.audioSynth?.playEnemyExplosion) {
            window.gameEngine.audioSynth.playEnemyExplosion();
          }
          // 撞擊爆炸效果
          this.createExplosion(
            this.player.pos.x,
            this.player.pos.y,
            '#00f0ff',
            12
          );

          if (shipDestroyed) {
            this.handlePlayerDeath();
          }

          // 敵機撞到玩家後死亡
          enemy.isDead = true;
        }
      });

      // 2.8 Boss Ships vs Player Ship
      if (!this.player.isDead && !this.player.isCaptured) {
        const boss = this.waveManager.activeBoss;

        if (boss && !boss.isDead) {
          const collisionDistance = boss.radius + this.player.radius;

          if (boss.pos.dist(this.player.pos) < collisionDistance) {

            console.log("★★ BOSS COLLISION with PLAYER");

            // Boss 撞擊玩家造成 40 點傷害
            const shipDestroyed = this.player.takeDamage(40);

            // 撞擊視覺效果
            this.createExplosion(
              this.player.pos.x,
              this.player.pos.y,
              '#00f0ff',
              18
            );

            // Boss 撞擊音效
            if (window.gameEngine?.audioSynth?.playEnemyExplosion) {
              window.gameEngine.audioSynth.playEnemyExplosion();
            }

            // 防止 Boss 重疊時每一幀持續扣血
            this.player.makeInvulnerable(1.2);

            if (shipDestroyed) {
              this.handlePlayerDeath();
            }
          }
        }
      }

      // 3. Galaga Tractor Beam Capture Logic
      this.enemies.forEach(enemy => {
        if (enemy.isEmittingTractor && !this.player.isCaptured && !this.player.isDead) {
          const dx = Math.abs(this.player.pos.x - enemy.pos.x);
          if (dx < 45 && this.player.pos.y > enemy.pos.y && this.player.pos.y < enemy.pos.y + 350) {
            // Player caught in Galaga Tractor Beam!
            this.player.isCaptured = true;
            this.player.captorEnemy = enemy;
            enemy.capturedPlayerShip = this.player;

            // Respawn spare player ship if lives remaining
            if (this.player.lives > 1) {
              this.player.lives--;
              // Rescued captured ship logic prepares for Dual Fighter mode!
              setTimeout(() => {
                if (this.player.isCaptured) {
                  // Spawns secondary ship while primary is locked
                  this.player.isDualFighter = true;
                  this.player.resetPosition(this.width, this.height);
                }
              }, 1200);
            } else {
              this.handlePlayerDeath();
            }
          }
        }
      });

      // 4. Powerup Collection
      this.powerups.forEach(p => {
        if (p.markedForDeletion || this.player.isDead) return;
        if (p.pos.dist(this.player.pos) < p.radius + this.player.radius) {
          p.markedForDeletion = true;
          this.applyPowerup(p.type);
        }
      });
    }

    applyPowerup(type) {
      this.scoreManager.floatingTexts.push({
        text: POWERUP_TYPES[type].name.toUpperCase(),
        x: this.player.pos.x,
        y: this.player.pos.y - 30,
        life: 1.5,
        color: POWERUP_TYPES[type].color
      });

      switch (type) {
        case 'VULCAN':
          this.player.weaponType = 'VULCAN';
          this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
          break;
        case 'LASER':
          this.player.weaponType = 'LASER';
          this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
          break;
        case 'HOMING':
          this.player.weaponType = 'HOMING';
          this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
          break;
        case 'SHIELD':
          this.player.addShield();
          break;
        case 'DRONE':
          this.player.addDrone();
          break;
        case 'TIME_SLOW':
          this.activateTimeSlow(6.0);
          break;
        case 'EMP':
          this.empNukesCount = Math.min(5, this.empNukesCount + 1);
          break;
      }
    }

    handlePlayerDeath() {
      this.player.lives--;
      this.createExplosion(this.player.pos.x, this.player.pos.y, '#00f0ff', 35);

      if (this.player.lives <= 0) {
        this.isGameOver = true;
      } else {
        this.player.resetPosition(this.width, this.height);
      }
    }

    update(dt) {
      if (this.isPaused || this.isGameOver) return;

      // Handle EMP input trigger
      if (this.controls.inputState.emp) {
        this.controls.inputState.emp = false;
        this.triggerEMP();
      }

      // Update Time Slow
      if (this.timeSlowTimer > 0) {
        this.timeSlowTimer -= dt;
      }
      const gameSpeed = this.timeSlowTimer > 0 ? 0.3 : 1.0;

      // Update Starfield
      this.stars.forEach(star => {
        star.y += star.speed * dt * (this.timeSlowTimer > 0 ? 0.4 : 1.0);
        if (star.y > this.height) {
          star.y = 0;
          star.x = Math.random() * this.width;
        }
      });

      // Update Player
      this.player.update(dt, this.controls.inputState, this.width, this.height);
      if (this.controls.inputState.fire) {
        this.player.shoot(this.playerProjectiles, this.enemies);
      }

      // Update Wave Manager & Enemies
      this.waveManager.update(dt, gameSpeed, this.enemies, this.player, this.enemyProjectiles);
      this.enemies.forEach(enemy => enemy.update(dt, gameSpeed, this.player.pos, this.width, this.height, this.enemyProjectiles));
      this.enemies = this.enemies.filter(e => !e.isDead);

      // Update Projectiles
      this.playerProjectiles.forEach(p => p.update(dt, 1.0));
      this.playerProjectiles = this.playerProjectiles.filter(p => !p.markedForDeletion);

      this.enemyProjectiles.forEach(p => p.update(dt, gameSpeed));
      this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.markedForDeletion);

      // Update Powerups
      this.powerups.forEach(p => p.update(dt, this.player.pos));
      this.powerups = this.powerups.filter(p => !p.markedForDeletion);

      // Update Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt * 1.8;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      // Check Collisions
      this.checkCollisions();

      // Update Score & Combo
      this.scoreManager.update(dt);

      // EMP Flash Timer update
      if (this.empFlashTimer > 0) {
        this.empFlashTimer -= dt;
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 1. Starfield Background
      this.ctx.fillStyle = '#030712';
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.stars.forEach(star => {
        this.ctx.fillStyle = star.color;
        this.ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // Time Slow Matrix Overlay
      if (this.timeSlowTimer > 0) {
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.width, this.height);
      }

      // EMP Flash Shockwave Overlay
      if (this.empFlashTimer > 0) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.empFlashTimer * 1.5})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
      }

      // 2. Draw Projectiles
      this.playerProjectiles.forEach(p => p.draw(this.ctx));
      this.enemyProjectiles.forEach(p => p.draw(this.ctx));

      // 3. Draw Powerups
      this.powerups.forEach(p => p.draw(this.ctx));

      // 4. Draw Enemies & Boss
      this.enemies.forEach(enemy => enemy.draw(this.ctx));
      if (this.waveManager.activeBoss) {
        this.waveManager.activeBoss.draw(this.ctx);
      }

      // 5. Draw Player
      this.player.draw(this.ctx);

      // 6. Draw Explosion Particles
      this.particles.forEach(pt => {
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, pt.life);
        this.ctx.fillStyle = pt.color;
        this.ctx.shadowColor = pt.color;
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });

      // 7. Draw Floating Score Combo Texts
      this.scoreManager.draw(this.ctx);

      // 8. Draw HUD UI
      this.drawHUD();
    }

    drawHUD() {
      const ctx = this.ctx;
      ctx.save();

      // Top Bar: Score, High Score, Wave Level, EMPs
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.font = 'bold 16px "Segoe UI", sans-serif';

      ctx.fillText(`SCORE: ${this.scoreManager.score}`, 20, 30);
      ctx.fillText(`HIGH: ${this.scoreManager.highScore}`, 220, 30);
      ctx.fillText(`WAVE: ${this.waveManager.currentWave}`, this.width / 2 - 35, 30);
      ctx.fillText(`EMP NUKES: ${this.empNukesCount}`, this.width - 150, 30);

      // Combo Display
      if (this.scoreManager.comboCount > 1) {
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.fillText(`${this.scoreManager.comboCount}x COMBO! (${this.scoreManager.comboMultiplier}x)`, 20, 60);

        // Combo Bar
        ctx.fillStyle = 'rgba(255, 170, 0, 0.3)';
        ctx.fillRect(20, 70, 140, 6);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(20, 70, 140 * (this.scoreManager.comboTimer / this.scoreManager.comboMaxTime), 6);
      }

      // Player Health & Shield Bar
      const barX = 20;
      const barY = this.height - 35;
      const barW = 200;
      const barH = 14;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeRect(barX, barY, barW, barH);

      // Health Fill
      const hpRatio = this.player.health / this.player.maxHealth;
      ctx.fillStyle = hpRatio > 0.4 ? '#00ff88' : '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      // Lives counter icons
      ctx.fillStyle = '#00f0ff';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillText(`LIVES: ${this.player.lives}`, barX + barW + 15, barY + 12);

      // Dual Fighter Mode Indicator
      if (this.player.isDualFighter) {
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        ctx.fillText('DUAL FIGHTER MODE ACTIVE', this.width - 240, this.height - 20);
      }

      // Boss Health Bar (if active)
      const boss = this.waveManager.activeBoss;
      if (boss && !boss.isDead) {
        const bBarW = 400;
        const bBarH = 16;
        const bBarX = (this.width - bBarW) / 2;
        const bBarY = 55;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.fillRect(bBarX, bBarY, bBarW, bBarH);
        ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);

        const bHpRatio = boss.health / boss.maxHealth;
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(bBarX, bBarY, bBarW * bHpRatio, bBarH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(boss instanceof CyberDreadnought ? 'CYBER DREADNOUGHT' : 'HIVE EMPRESS', this.width / 2, bBarY - 6);
        ctx.textAlign = 'left';
      }

      // Game Over Screen Overlay
      if (this.isGameOver) {
        ctx.fillStyle = 'rgba(3, 7, 18, 0.85)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff0055';
        ctx.font = 'bold 48px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MISSION FAILED', this.width / 2, this.height / 2 - 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px "Segoe UI", sans-serif';
        ctx.fillText(`FINAL SCORE: ${this.scoreManager.score}`, this.width / 2, this.height / 2 + 10);
        ctx.fillText('PRESS R TO RESTART', this.width / 2, this.height / 2 + 50);
        ctx.textAlign = 'left';
      }

      ctx.restore();
    }

    start() {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }

      this.isRunning = true;
      this.isPaused = false;
      this.isGameOver = false;

      if (!this.player || this.player.isDead) {
        this.createPlayer();
      }
      if (!this.enemies || this.enemies.length === 0) {
        this.createEnemies();
      }

      this.lastTime = performance.now();

      const gameLoop = (now) => {
        if (!this.isRunning) return;
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animFrameId = requestAnimationFrame(gameLoop);
      };

      this.animFrameId = requestAnimationFrame(gameLoop);

      // Restart Key listener
      if (!this.hasRestartListener) {
        this.hasRestartListener = true;
        window.addEventListener('keydown', (e) => {
          if (this.isGameOver && e.key.toLowerCase() === 'r') {
            this.restart();
          }
        });
      }
    }

    restart() {
      this.scoreManager.reset();
      this.createPlayer();
      this.createEnemies();
      this.playerProjectiles.length = 0;
      this.enemyProjectiles.length = 0;
      this.powerups.length = 0;
      this.particles.length = 0;
      this.empNukesCount = 2;
      this.isGameOver = false;
      this.isPaused = false;
    }
  }

  // EXPORT TO GLOBAL SCOPE
  window.GalagaGameplay = {
    ControlsManager,
    ScoreComboManager,
    WaveManager,
    GalagaGameEngine
  };

})(window);
