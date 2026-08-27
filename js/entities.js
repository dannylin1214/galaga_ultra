/**
 * GALAGA ULTRA - ENTITIES SYSTEM
 * High-performance, modular ES6 Entity & Object Architecture for Galaga Ultra.
 * Includes Math Utilities, Player, Enemies, Bosses, Projectiles, Powerups & Particles.
 */

(function(window) {
  'use strict';

  // ==========================================
  // 1. MATH & VECTOR UTILITIES
  // ==========================================
  class Vector2D {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }

    set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }

    clone() {
      return new Vector2D(this.x, this.y);
    }

    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }

    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    }

    mult(n) {
      this.x *= n;
      this.y *= n;
      return this;
    }

    div(n) {
      if (n !== 0) {
        this.x /= n;
        this.y /= n;
      }
      return this;
    }

    mag() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    magSq() {
      return this.x * this.x + this.y * this.y;
    }

    normalize() {
      const m = this.mag();
      if (m > 0) this.div(m);
      return this;
    }

    heading() {
      return Math.atan2(this.y, this.x);
    }

    dist(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    static lerp(start, end, amt) {
      return start + (end - start) * amt;
    }

    static getBezierPoint(p0, p1, p2, p3, t) {
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;

      const p = new Vector2D(0, 0);
      p.x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
      p.y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
      return p;
    }

    static getLissajousPoint(cx, cy, rx, ry, freqX, freqY, phase, t) {
      const x = cx + rx * Math.sin(freqX * t + phase);
      const y = cy + ry * Math.sin(freqY * t);
      return new Vector2D(x, y);
    }
  }

  // ==========================================
  // 2. PROJECTILE SYSTEM
  // ==========================================
  class Projectile {
    constructor(config) {
      this.pos = new Vector2D(config.x, config.y);
      this.vel = new Vector2D(config.vx || 0, config.vy || 0);
      this.radius = config.radius || 4;
      this.isPlayer = config.isPlayer || false;
      this.damage = config.damage || 10;
      this.color = config.color || '#00f0ff';
      this.type = config.type || 'STANDARD'; // STANDARD, LASER, HOMING, PLASMA, TRACTOR
      this.target = config.target || null;
      this.turnRate = config.turnRate || 0.1;
      this.lifetime = config.lifetime || 300;
      this.age = 0;
      this.markedForDeletion = false;
      this.piercing = config.piercing || false;
      this.hitList = new Set();
    }

    update(dt, gameSpeed = 1) {
      this.age += dt;
      if (this.age >= this.lifetime) {
        this.markedForDeletion = true;
        return;
      }

      // Homing missile behavior
      if (this.type === 'HOMING' && this.target && !this.target.isDead) {
        const desired = new Vector2D(this.target.pos.x - this.pos.x, this.target.pos.y - this.pos.y).normalize();
        const currentHeading = this.vel.heading();
        const desiredHeading = desired.heading();
        
        let diff = desiredHeading - currentHeading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const newHeading = currentHeading + Math.sign(diff) * Math.min(Math.abs(diff), this.turnRate);
        const speed = this.vel.mag() || 400;
        this.vel.x = Math.cos(newHeading) * speed;
        this.vel.y = Math.sin(newHeading) * speed;
      }

      const effDt = dt * (this.isPlayer ? 1 : gameSpeed);
      this.pos.x += this.vel.x * effDt;
      this.pos.y += this.vel.y * effDt;

      // Screen boundary check
      if (this.pos.x < -50 || this.pos.x > 1500 || this.pos.y < -50 || this.pos.y > 1000) {
        this.markedForDeletion = true;
      }
    }

    draw(ctx) {
      ctx.save();
      if (this.type === 'LASER') {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.pos.x - this.radius, this.pos.y - 15, this.radius * 2, 30);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.pos.x - this.radius * 1.5, this.pos.y - 15, this.radius * 3, 30);
      } else if (this.type === 'HOMING') {
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff2a70';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Trail glow
        ctx.strokeStyle = 'rgba(255, 42, 112, 0.4)';
        ctx.lineWidth = this.radius;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x - this.vel.x * 0.05, this.pos.y - this.vel.y * 0.05);
        ctx.stroke();
      } else {
        // Standard projectile
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ==========================================
  // 3. POWERUP ITEM
  // ==========================================
  const POWERUP_TYPES = {
    VULCAN: { name: 'Spread Vulcan', color: '#ffaa00', icon: '3x' },
    LASER: { name: 'Mega Laser', color: '#00f0ff', icon: 'BEAM' },
    HOMING: { name: 'Homing Missiles', color: '#ff0055', icon: 'MISSILE' },
    SHIELD: { name: 'Energy Shield', color: '#00ff88', icon: 'SHIELD' },
    DRONE: { name: 'Drone Wingman', color: '#aa00ff', icon: 'DRONE' },
    TIME_SLOW: { name: 'Time Slow', color: '#ffff00', icon: 'SLOW' },
    EMP: { name: 'Tactical EMP', color: '#ffffff', icon: 'EMP' }
  };

  class Powerup {
    constructor(x, y, type) {
      this.pos = new Vector2D(x, y);
      this.vel = new Vector2D((Math.random() - 0.5) * 60, 100 + Math.random() * 40);
      this.type = type || this.getRandomType();
      this.info = POWERUP_TYPES[this.type];
      this.radius = 16;
      this.pulseTimer = 0;
      this.markedForDeletion = false;
    }

    getRandomType() {
      const keys = Object.keys(POWERUP_TYPES);
      return keys[Math.floor(Math.random() * keys.length)];
    }

    update(dt, playerPos) {
      this.pulseTimer += dt * 4;

      // Magnetic attraction to player when nearby
      if (playerPos) {
        const dist = this.pos.dist(playerPos);
        if (dist < 180) {
          const pull = new Vector2D(playerPos.x - this.pos.x, playerPos.y - this.pos.y).normalize().mult(350);
          this.vel.x = Vector2D.lerp(this.vel.x, pull.x, dt * 5);
          this.vel.y = Vector2D.lerp(this.vel.y, pull.y, dt * 5);
        }
      }

      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;

      if (this.pos.y > 1000 || this.pos.x < -20 || this.pos.x > 1500) {
        this.markedForDeletion = true;
      }
    }

    draw(ctx) {
      ctx.save();
      const scale = 1 + Math.sin(this.pulseTimer) * 0.15;
      ctx.translate(this.pos.x, this.pos.y);
      ctx.scale(scale, scale);

      ctx.shadowColor = this.info.color;
      ctx.shadowBlur = 15;

      // Hexagon base
      ctx.strokeStyle = this.info.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = Math.cos(angle) * this.radius;
        const hy = Math.sin(angle) * this.radius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Icon text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.info.icon, 0, 0);

      ctx.restore();
    }
  }

  // ==========================================
  // 4. DRONE WINGMAN ENTITY
  // ==========================================
  class DroneWingman {
    constructor(offsetAngle = 0) {
      this.offsetAngle = offsetAngle;
      this.pos = new Vector2D(0, 0);
      this.orbitRadius = 45;
      this.angle = offsetAngle;
      this.fireTimer = 0;
      this.fireRate = 0.18;
    }

    update(dt, playerPos) {
      this.angle += dt * 2.5;
      this.pos.x = playerPos.x + Math.cos(this.angle) * this.orbitRadius;
      this.pos.y = playerPos.y + Math.sin(this.angle) * this.orbitRadius * 0.5;
    }

    draw(ctx) {
      ctx.save();
      ctx.shadowColor = '#aa00ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#d880ff';
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Core glow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ==========================================
  // 5. PLAYER SHIP ENTITY
  // ==========================================
  class PlayerShip {
    constructor(canvasWidth, canvasHeight) {
      this.pos = new Vector2D(canvasWidth / 2, canvasHeight - 90);
      this.vel = new Vector2D(0, 0);
      this.speed = 420;
      this.radius = 18;
      this.width = 44;
      this.height = 48;
      this.bankTilt = 0; // Visual roll tilt on movement

      // Health & Lives
      this.maxHealth = 100;
      this.health = 100;
      this.lives = 3;
      this.isInvulnerable = false;
      this.invulnerableTimer = 0;
      this.isDead = false;

      // Weapons & Powerups
      this.weaponType = 'VULCAN'; // VULCAN, LASER, HOMING
      this.weaponLevel = 1;
      this.fireTimer = 0;
      this.fireRate = 0.12;

      // Shield System
      this.hasShield = false;
      this.shieldMaxHp = 50;
      this.shieldHp = 50;

      // Dual Fighter Mode (Rescue Galaga Mechanic)
      this.isDualFighter = false;

      // Drones
      this.drones = [];

      // Captured State (when hit by enemy tractor beam)
      this.isCaptured = false;
      this.captorEnemy = null;
    }

    get hp() { return this.health; }
    get maxHp() { return this.maxHealth; }
    get shield() { return this.shieldHp; }
    get maxShield() { return this.shieldMaxHp; }

    resetPosition(canvasWidth, canvasHeight) {
      this.pos.set(canvasWidth / 2, canvasHeight - 90);
      this.vel.set(0, 0);
      this.health = this.maxHealth;
      this.isDead = false;
      this.isCaptured = false;
      this.captorEnemy = null;
      this.makeInvulnerable(2.5);
    }

    makeInvulnerable(duration = 2.0) {
      this.isInvulnerable = true;
      this.invulnerableTimer = duration;
    }

    addShield() {
      this.hasShield = true;
      this.shieldHp = this.shieldMaxHp;
    }

    addDrone() {
      if (this.drones.length < 2) {
        const offset = this.drones.length === 0 ? 0 : Math.PI;
        this.drones.push(new DroneWingman(offset));
      }
    }

    takeDamage(amount) {
      console.log("★ Player takeDamage:", amount);
      if (this.isInvulnerable || this.isDead || this.isCaptured) return false;

      if (this.hasShield) {
        if (window.gameEngine?.audioSynth?.playShieldHit) {
          window.gameEngine.audioSynth.playShieldHit();
        }
        this.shieldHp -= amount;
        if (this.shieldHp <= 0) {
          this.hasShield = false;
          this.shieldHp = 0;
        }
        return false;
      }

      this.health -= amount;
      if (window.gameEngine?.audioSynth?.playPlayerHit) {
        window.gameEngine.audioSynth.playPlayerHit();
      }
      if (this.health <= 0) {
        this.health = 0;
        this.isDead = true;
        return true; // Ship destroyed
      }
      this.makeInvulnerable(1.2);
      return false;
    }

    update(dt, inputState, canvasWidth, canvasHeight) {
      if (this.isCaptured) {
        if (this.captorEnemy && !this.captorEnemy.isDead) {
          // Locked above captor enemy
          this.pos.x = this.captorEnemy.pos.x;
          this.pos.y = this.captorEnemy.pos.y - 35;
        }
        return;
      }

      if (this.isDead) return;

      // Update Invulnerability
      if (this.isInvulnerable) {
        this.invulnerableTimer -= dt;
        if (this.invulnerableTimer <= 0) {
          this.isInvulnerable = false;
        }
      }

      // Movement based on Input State
      let moveSpeed = this.speed;
      if (inputState.focus) moveSpeed *= 0.45; // Precision slow mode

      let targetVx = 0;
      let targetVy = 0;

      if (inputState.controlMode === 'MOUSE' || inputState.controlMode === 'TOUCH') {
        if (inputState.movePos) {
          const dx = inputState.movePos.x - this.pos.x;
          const dy = inputState.movePos.y - this.pos.y;
          targetVx = dx * 12;
          targetVy = dy * 12;
        }
      } else {
        // Keyboard controls
        if (inputState.left) targetVx -= moveSpeed;
        if (inputState.right) targetVx += moveSpeed;
        if (inputState.up) targetVy -= moveSpeed;
        if (inputState.down) targetVy += moveSpeed;
      }

      // Smooth velocity & bank tilt
      this.vel.x = Vector2D.lerp(this.vel.x, targetVx, dt * 15);
      this.vel.y = Vector2D.lerp(this.vel.y, targetVy, dt * 15);

      this.bankTilt = Vector2D.lerp(this.bankTilt, (this.vel.x / this.speed) * 0.35, dt * 10);

      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;

      // Screen boundaries clamp
      const margin = 24;
      this.pos.x = Math.max(margin, Math.min(canvasWidth - margin, this.pos.x));
      this.pos.y = Math.max(margin, Math.min(canvasHeight - margin, this.pos.y));

      // Update drones
      this.drones.forEach(drone => drone.update(dt, this.pos));

      // Fire timer
      this.fireTimer -= dt;
    }

    shoot(projectiles, targetEnemies = []) {
      if (this.isDead || this.isCaptured || this.fireTimer > 0) return;

      this.fireTimer = this.fireRate;
      // ★ 玩家射擊音效
      //if (
      //  window.GalagaAudio &&
      //  window.GalagaAudio.AudioSynthesizer &&
      //  typeof window.GalagaAudio.AudioSynthesizer.playPlayerLaser === 'function'
      //) {
      //  console.log("★ Player Laser Sound Called");
      //  window.GalagaAudio.AudioSynthesizer.playPlayerLaser();
      //}
      if (
        window.GalagaAudio &&
        window.GalagaAudio.AudioSynthesizer &&
        typeof window.GalagaAudio.AudioSynthesizer.prototype.playPlayerLaser === 'function'
      ) {
        //console.log("★ Player Laser Sound Called");

        if (!window.galagaAudioEngine) {
          window.galagaAudioEngine = new window.GalagaAudio.AudioSynthesizer();
        }

        window.galagaAudioEngine.playPlayerLaser();
      }
      // Dual Fighter spacing offset
      const origins = this.isDualFighter ? [-18, 18] : [0];

      origins.forEach(offset => {
        const originX = this.pos.x + offset;
        const originY = this.pos.y - 20;

        if (this.weaponType === 'VULCAN') {
          // Spread Vulcan shot
          const numShots = 1 + this.weaponLevel;
          const spreadAngle = 0.12;
          const startAngle = -Math.PI / 2 - (spreadAngle * (numShots - 1)) / 2;

          for (let i = 0; i < numShots; i++) {
            const angle = startAngle + i * spreadAngle;
            const speed = 750;
            projectiles.push(new Projectile({
              x: originX,
              y: originY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: 4,
              damage: 18 + this.weaponLevel * 4,
              color: '#ffaa00',
              isPlayer: true,
              type: 'STANDARD'
            }));
          }
        } else if (this.weaponType === 'LASER') {
          // Mega Beam Laser (piercing)
          projectiles.push(new Projectile({
            x: originX,
            y: originY - 15,
            vx: 0,
            vy: -950,
            radius: 5 + this.weaponLevel,
            damage: 32 + this.weaponLevel * 10,
            color: '#00f0ff',
            isPlayer: true,
            type: 'LASER',
            piercing: true
          }));
        } else if (this.weaponType === 'HOMING') {
          // Homing Missiles
          const targets = targetEnemies.filter(e => !e.isDead);
          let target = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : null;

          projectiles.push(new Projectile({
            x: originX - 10,
            y: originY,
            vx: -120,
            vy: -400,
            radius: 5,
            damage: 28,
            color: '#ff0055',
            isPlayer: true,
            type: 'HOMING',
            target: target,
            turnRate: 0.18
          }));

          projectiles.push(new Projectile({
            x: originX + 10,
            y: originY,
            vx: 120,
            vy: -400,
            radius: 5,
            damage: 28,
            color: '#ff0055',
            isPlayer: true,
            type: 'HOMING',
            target: target,
            turnRate: 0.18
          }));
        }
      });

      // Drone Wingmen firing
      this.drones.forEach(drone => {
        projectiles.push(new Projectile({
          x: drone.pos.x,
          y: drone.pos.y,
          vx: 0,
          vy: -700,
          radius: 3,
          damage: 14,
          color: '#d880ff',
          isPlayer: true,
          type: 'STANDARD'
        }));
      });
    }

    draw(ctx) {
      if (this.isDead || (this.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0)) return;

      const drawShipAt = (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.bankTilt);

        // Dynamic thruster flame based on actual movement velocity
        const currentSpeed = Math.sqrt(
          this.vel.x * this.vel.x +
          this.vel.y * this.vel.y
        );

        const speedRatio = Math.min(
          currentSpeed / this.speed,
          1
        );

        // 移動越快，尾焰越長
        const flameLength =
          18 + speedRatio * 25 + Math.random() * 8;

        ctx.save();

        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 14 + speedRatio * 12;

        const flameGradient = ctx.createLinearGradient(
          0, 20,
          0, 20 + flameLength
        );

        flameGradient.addColorStop(0, '#ffffff');
        flameGradient.addColorStop(0.25, '#00f0ff');
        flameGradient.addColorStop(0.65, '#008cff');
        flameGradient.addColorStop(1, 'rgba(0, 140, 255, 0)');

        ctx.fillStyle = flameGradient;

        ctx.beginPath();
        ctx.moveTo(-8, 22);
        ctx.lineTo(0, 22 + flameLength);
        ctx.lineTo(8, 22);
        ctx.closePath();

        ctx.fill();

        ctx.restore();

        let spriteDrawn = false;
        if (window.GalagaRenderers && window.GalagaRenderers.spriteManager) {
          spriteDrawn = window.GalagaRenderers.spriteManager.drawSprite(ctx, 'player', 0, 0, 56, 56, 0, false);
        }

        if (!spriteDrawn) {

        // Thruster glow
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(-8, 20);
        ctx.lineTo(0, 32 + Math.random() * 8);
        ctx.lineTo(8, 20);
        ctx.closePath();
        ctx.fill();

        // Main Fuselage
        ctx.shadowColor = '#00aeff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -24); // Nose
        ctx.lineTo(12, -8);
        ctx.lineTo(22, 12);
        ctx.lineTo(16, 22);
        ctx.lineTo(8, 18);
        ctx.lineTo(0, 22);
        ctx.lineTo(-8, 18);
        ctx.lineTo(-16, 22);
        ctx.lineTo(-22, 12);
        ctx.lineTo(-12, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wings detailing
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(12, -4);
        ctx.lineTo(20, 10);
        ctx.lineTo(12, 16);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-20, 10);
        ctx.lineTo(-12, 16);
        ctx.closePath();
        ctx.fill();

        // Cockpit canopy
        ctx.fillStyle = '#e0f2fe';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(0, -6, 5, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        }

        ctx.restore();
      };

      if (this.isDualFighter) {
        drawShipAt(this.pos.x - 18, this.pos.y);
        drawShipAt(this.pos.x + 18, this.pos.y);
      } else {
        drawShipAt(this.pos.x, this.pos.y);
      }

      // Draw Drones
      this.drones.forEach(drone => drone.draw(ctx));

      // Draw Shield Aura
      if (this.hasShield) {
        ctx.save();
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius + 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 255, 136, 0.12)';
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ==========================================
  // 6. ENEMY BASE & TYPES
  // ==========================================
  class Enemy {
    constructor(config) {
      this.id = Math.random().toString(36).substr(2, 9);
      this.pos = new Vector2D(config.x || 0, config.y || 0);
      this.gridPos = new Vector2D(config.gridX || config.x, config.gridY || config.y);
      this.vel = new Vector2D(0, 0);
      this.type = config.type || 'VANGUARD'; // VANGUARD, CRUISER, KAMIKAZE, PHANTOM
      this.radius = config.radius || 18;
      this.maxHealth = config.maxHealth || 30;
      this.health = this.maxHealth;
      this.scoreValue = config.scoreValue || 100;
      this.isDead = false;

      // State machine: ENTERING, GRID_HOVER, DIVING, TRACTOR_BEAM
      this.state = config.state || 'ENTERING';
      this.path = config.path || null; // Array of points or curve generator
      this.pathProgress = 0;
      this.pathSpeed = config.pathSpeed || 0.4;

      // Diving parameters
      this.diveCurve = null;
      this.diveProgress = 0;

      // Tractor beam parameters (Phantom / Boss)
      this.isEmittingTractor = false;
      this.tractorAngle = 0;
      this.capturedPlayerShip = null;

      // Hover animation time
      this.hoverTimer = Math.random() * 100;
      this.hitFlashTimer = 0;

      // Weapon firing
      this.fireTimer = Math.random() * 2;
      this.fireRate = config.fireRate || 2.5;

      // Color scheme
      this.colorMap = {
        VANGUARD: '#38bdf8',
        CRUISER: '#a855f7',
        KAMIKAZE: '#ef4444',
        PHANTOM: '#34d399'
      };
      this.color = this.colorMap[this.type] || '#38bdf8';
    }

    takeDamage(amount) {
      this.health -= amount;
      this.hitFlashTimer = 0.15;
      if (this.health <= 0) {
        this.health = 0;
        this.isDead = true;
        // ★ 敵人死亡爆炸音效
        if (window.galagaAudioEngine) {
          console.log("★ Enemy Explosion Sound Called");
          window.galagaAudioEngine.playEnemyExplosion(
            this.type === 'BOSS'
          );
        }
        if (this.isEmittingTractor && this.capturedPlayerShip) {
          // Rescued captured ship!
          this.capturedPlayerShip.isCaptured = false;
          this.capturedPlayerShip.captorEnemy = null;
        }
        return true;
      }
      return false;
    }

    startDive(playerPosition, canvasWidth, canvasHeight) {
      if (this.state === 'DIVING' || this.state === 'TRACTOR_BEAM') return;
      this.state = 'DIVING';
      this.diveProgress = 0;

      // Build Galaga Bézier dive-bomb curve targeting player
      const p0 = this.pos.clone();
      const p1 = new Vector2D(this.pos.x + (Math.random() < 0.5 ? -150 : 150), this.pos.y + 120);
      const p2 = new Vector2D(playerPosition.x + (Math.random() - 0.5) * 100, playerPosition.y - 100);
      const p3 = new Vector2D(playerPosition.x, canvasHeight + 80); // Swoop past bottom screen

      this.diveCurve = { p0, p1, p2, p3 };
    }

    startTractorBeam(canvasHeight) {
      if (this.type !== 'PHANTOM') return;
      this.state = 'TRACTOR_BEAM';
      this.isEmittingTractor = true;
    }

    update(dt, gameSpeed, playerPosition, canvasWidth, canvasHeight, enemyProjectiles) {
      if (this.isDead) return;

      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

      this.hoverTimer += dt * 2.5;
      const effDt = dt * gameSpeed;

      // State machine logic
      switch (this.state) {
        case 'ENTERING':
          if (this.path && this.pathProgress < 1) {
            this.pathProgress += this.pathSpeed * effDt;
            if (this.pathProgress >= 1) {
              this.pathProgress = 1;
              this.state = 'GRID_HOVER';
            }
            if (typeof this.path === 'function') {
              const p = this.path(this.pathProgress);
              this.pos.set(p.x, p.y);
            } else if (Array.isArray(this.path)) {
              // Standard curve
              const idx = Math.floor(this.pathProgress * (this.path.length - 1));
              this.pos.set(this.path[idx].x, this.path[idx].y);
            }
          } else {
            this.state = 'GRID_HOVER';
          }
          break;

        case 'GRID_HOVER':
          // Lissajous & sine wave floating formation
          const lissajousOffset = Vector2D.getLissajousPoint(0, 0, 14, 8, 1.2, 2.4, 0, this.hoverTimer);
          this.pos.x = Vector2D.lerp(this.pos.x, this.gridPos.x + lissajousOffset.x, effDt * 4);
          this.pos.y = Vector2D.lerp(this.pos.y, this.gridPos.y + lissajousOffset.y, effDt * 4);
          break;

        case 'DIVING':
          if (this.diveCurve) {
            this.diveProgress += effDt * 0.45;
            if (this.diveProgress >= 1) {
              // Wrap around from top back to grid formation
              this.pos.y = -60;
              this.pos.x = this.gridPos.x;
              this.state = 'GRID_HOVER';
            } else {
              const pt = Vector2D.getBezierPoint(
                this.diveCurve.p0,
                this.diveCurve.p1,
                this.diveCurve.p2,
                this.diveCurve.p3,
                this.diveProgress
              );
              this.pos.set(pt.x, pt.y);
            }
          }
          break;

        case 'TRACTOR_BEAM':
          // Hold position and emit beam
          this.isEmittingTractor = true;
          this.hoverTimer += dt;
          if (this.hoverTimer > 8.0) {
            this.isEmittingTractor = false;
            this.state = 'GRID_HOVER';
          }
          break;
      }

      // Firing Logic
      this.fireTimer -= effDt;
      if (this.fireTimer <= 0 && this.state !== 'ENTERING') {
        this.fireTimer = this.fireRate + Math.random() * 1.5;
        this.shoot(enemyProjectiles, playerPosition);
      }
    }

    shoot(projectiles, playerPos) {
      if (!playerPos) return;

      if (this.type === 'KAMIKAZE') {
        // Fast direct burst towards player
        const dir = new Vector2D(playerPos.x - this.pos.x, playerPos.y - this.pos.y).normalize();
        projectiles.push(new Projectile({
          x: this.pos.x,
          y: this.pos.y,
          vx: dir.x * 450,
          vy: dir.y * 450,
          radius: 5,
          damage: 15,
          color: '#ef4444',
          isPlayer: false
        }));
      } else if (this.type === 'CRUISER') {
        // 3-way spread shot
        [-0.2, 0, 0.2].forEach(angleOffset => {
          const baseAngle = Math.atan2(playerPos.y - this.pos.y, playerPos.x - this.pos.x);
          const angle = baseAngle + angleOffset;
          projectiles.push(new Projectile({
            x: this.pos.x,
            y: this.pos.y,
            vx: Math.cos(angle) * 320,
            vy: Math.sin(angle) * 320,
            radius: 4,
            damage: 12,
            color: '#a855f7',
            isPlayer: false
          }));
        });
      } else {
        // Standard downward projectile
        projectiles.push(new Projectile({
          x: this.pos.x,
          y: this.pos.y,
          vx: 0,
          vy: 380,
          radius: 4,
          damage: 10,
          color: this.color,
          isPlayer: false
        }));
      }
    }

    draw(ctx) {
      if (this.isDead) return;

      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);

      let spriteType = 'drone';
      if (this.type === 'CRUISER') spriteType = 'destroyer';
      if (this.type === 'PHANTOM') spriteType = 'interceptor';
      if (this.type === 'VANGUARD') spriteType = 'drone';
      if (this.type === 'KAMIKAZE') spriteType = 'drone';

      let spriteDrawn = false;
      if (window.GalagaRenderers && window.GalagaRenderers.spriteManager) {
        const size = this.radius * 2.8;
        const angle = this.state === 'DIVING' ? Math.PI : 0;
        spriteDrawn = window.GalagaRenderers.spriteManager.drawSprite(
          ctx, spriteType, 0, 0, size, size, angle, this.hitFlashTimer > 0
        );
      }

      if (!spriteDrawn) {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;

      if (this.type === 'VANGUARD') {
        // Diamond Fighter
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.lineTo(16, 0);
        ctx.lineTo(0, -14);
        ctx.lineTo(-16, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

      } else if (this.type === 'CRUISER') {
        // Heavy Cruiser
        ctx.fillStyle = '#2e1065';
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.lineTo(22, 8);
        ctx.lineTo(18, -16);
        ctx.lineTo(-18, -16);
        ctx.lineTo(-22, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d8b4fe';
        ctx.fillRect(-10, -6, 20, 8);

      } else if (this.type === 'KAMIKAZE') {
        // Arrow Striker
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.moveTo(0, 22);
        ctx.lineTo(14, -18);
        ctx.lineTo(0, -10);
        ctx.lineTo(-14, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      } else if (this.type === 'PHANTOM') {
        // Stealth Interceptor
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(18, 14);
        ctx.lineTo(8, 18);
        ctx.lineTo(0, 10);
        ctx.lineTo(-8, 18);
        ctx.lineTo(-18, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      }

      ctx.restore();

      // Render Galaga Tractor Beam Visual Effect
      if (this.isEmittingTractor) {
        ctx.save();
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 20;

        const gradient = ctx.createLinearGradient(this.pos.x, this.pos.y, this.pos.x, this.pos.y + 350);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.pos.x - 10, this.pos.y + 10);
        ctx.lineTo(this.pos.x - 70, this.pos.y + 350);
        ctx.lineTo(this.pos.x + 70, this.pos.y + 350);
        ctx.lineTo(this.pos.x + 10, this.pos.y + 10);
        ctx.closePath();
        ctx.fill();

        // Pulsing beam rings
        const pTime = Date.now() / 150;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        for (let r = 50; r <= 300; r += 50) {
          const currentR = (r + pTime * 30) % 300;
          const width = 10 + (currentR / 300) * 110;
          ctx.beginPath();
          ctx.ellipse(this.pos.x, this.pos.y + currentR, width / 2, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // ==========================================
  // 7. BOSS 1: CYBER DREADNOUGHT
  // ==========================================
  class CyberDreadnought {
    constructor(canvasWidth) {
      this.pos = new Vector2D(canvasWidth / 2, -180);
      this.targetY = 140;
      this.radius = 65;
      this.maxHealth = 1500;
      this.health = this.maxHealth;
      this.phase = 1; // Phase 1: Rotating Shields & Barrage, Phase 2: Hyper Beam
      this.isDead = false;
      this.scoreValue = 10000;

      // Shield Segments (Phase 1)
      this.shieldAngle = 0;
      this.shieldSegments = [
        { hp: 120, maxHp: 120, offset: 0 },
        { hp: 120, maxHp: 120, offset: Math.PI * 0.5 },
        { hp: 120, maxHp: 120, offset: Math.PI },
        { hp: 120, maxHp: 120, offset: Math.PI * 1.5 }
      ];

      // Attack Timers
      this.missileTimer = 0;
      this.plasmaBeamTimer = 0;
      this.isChargingBeam = false;
      this.beamCharge = 0;
      this.isFiringBeam = false;
      this.beamTimer = 0;
      this.hitFlashTimer = 0;
    }

    takeDamage(amount, hitPos) {
      console.log("★★ Cyber Dreadnought HIT");
      // Check if hitting rotating shield segments first
      if (this.phase === 1) {
        for (let seg of this.shieldSegments) {
          if (seg.hp <= 0) continue;
          const segAngle = this.shieldAngle + seg.offset;
          const sx = this.pos.x + Math.cos(segAngle) * 90;
          const sy = this.pos.y + Math.sin(segAngle) * 90;

          if (hitPos && hitPos.dist(new Vector2D(sx, sy)) < 28) {
            seg.hp -= amount;
            if (seg.hp <= 0) seg.hp = 0;
            return false; // Absorbed by shield segment
          }
        }
      }

      this.health -= amount;
      this.hitFlashTimer = 0.15;
      // ★ BOSS 被擊中音效
      if (window.gameEngine?.audioSynth &&
        typeof window.gameEngine.audioSynth.playCyberDreadnoughtHit === 'function') {
        window.gameEngine.audioSynth.playCyberDreadnoughtHit();
        console.log("★★★ Cyber Dreadnought HIT SOUND PLAY");
      }
      if (this.health <= this.maxHealth * 0.5 && this.phase === 1) {
        this.phase = 2; // Transition to Phase 2
      }

      if (this.health <= 0) { //BOSS 1 死亡
        this.health = 0;
        this.isDead = true;
        // ★ BOSS 1 爆炸音效
        console.log("★ Cyber Dreadnought Explosion Sound Called");
        if (window.gameEngine?.audioSynth &&
            typeof window.gameEngine.audioSynth.playCyberDreadnoughtExplosion === 'function') {
            window.gameEngine.audioSynth.playCyberDreadnoughtExplosion();
        }
        return true;
      }
      return false;
    }

    update(dt, gameSpeed, playerPos, projectiles) {
      if (this.isDead) return;

      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

      const effDt = dt * gameSpeed;

      // Entrance interpolation
      if (this.pos.y < this.targetY) {
        this.pos.y = Vector2D.lerp(this.pos.y, this.targetY, effDt * 2);
      } else {
        // Gentle side to side swaying
        this.pos.x += Math.sin(Date.now() / 800) * 80 * effDt;
      }

      // Rotate Shield Segments
      this.shieldAngle += effDt * 1.4;

      // Attack Pattern 1: Missile Barrage
      this.missileTimer += effDt;
      if (this.missileTimer >= (this.phase === 1 ? 2.2 : 1.4)) {
        this.missileTimer = 0;
        this.fireMissileBarrage(projectiles, playerPos);
      }

      // Attack Pattern 2: Plasma Beam Cannon (Phase 2 primary weapon)
      if (this.phase === 2) {
        this.plasmaBeamTimer += effDt;
        if (this.plasmaBeamTimer >= 6.0 && !this.isChargingBeam && !this.isFiringBeam) {
          this.isChargingBeam = true;
          this.beamCharge = 0;
        }

        if (this.isChargingBeam) {
          this.beamCharge += effDt;
          if (this.beamCharge >= 2.0) {
            this.isChargingBeam = false;
            this.isFiringBeam = true;
            this.beamTimer = 2.5;
          }
        }

        if (this.isFiringBeam) {
          this.beamTimer -= effDt;
          if (this.beamTimer <= 0) {
            this.isFiringBeam = false;
            this.plasmaBeamTimer = 0;
          }

          // Beam continuous collision check with player handled in gameplay loop
        }
      }
    }

    fireMissileBarrage(projectiles, playerPos) {
      const offsets = [-50, -25, 25, 50];
      offsets.forEach(offX => {
        projectiles.push(new Projectile({
          x: this.pos.x + offX,
          y: this.pos.y + 40,
          vx: (Math.random() - 0.5) * 160,
          vy: 240 + Math.random() * 80,
          radius: 6,
          damage: 20,
          color: '#ff2a70',
          isPlayer: false,
          type: 'HOMING',
          target: playerPos ? { pos: playerPos, isDead: false } : null,
          turnRate: 0.08
        }));
      });
    }

    draw(ctx) {
      if (this.isDead) return;

      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);

      let spriteDrawn = false;
      if (window.GalagaRenderers && window.GalagaRenderers.spriteManager) {
        spriteDrawn = window.GalagaRenderers.spriteManager.drawSprite(
          ctx, 'boss', 0, 0, 190, 190, 0, this.hitFlashTimer > 0
        );
      }

      if (!spriteDrawn) {
      // Dreadnought Main Body Fallback
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      ctx.moveTo(0, 70); // Nose cannon
      ctx.lineTo(55, 30);
      ctx.lineTo(85, -20);
      ctx.lineTo(60, -60);
      ctx.lineTo(-60, -60);
      ctx.lineTo(-85, -20);
      ctx.lineTo(-55, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Core Reactor Glow
      ctx.fillStyle = this.phase === 2 ? '#ff0055' : '#00f0ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      }

      ctx.restore();

      // Render Rotating Shield Segments (Phase 1)
      if (this.phase === 1) {
        this.shieldSegments.forEach(seg => {
          if (seg.hp <= 0) return;
          const segAngle = this.shieldAngle + seg.offset;
          const sx = this.pos.x + Math.cos(segAngle) * 90;
          const sy = this.pos.y + Math.sin(segAngle) * 90;

          ctx.save();
          ctx.translate(sx, sy);
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = '#00f0ff';
          ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }

      // Render Plasma Beam Charge & Cannon Blast
      if (this.isChargingBeam) {
        ctx.save();
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 30;
        ctx.fillStyle = 'rgba(255, 0, 85, ' + (this.beamCharge / 2.0) + ')';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y + 70, 15 + (this.beamCharge / 2.0) * 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (this.isFiringBeam) {
        ctx.save();
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 40;
        const beamWidth = 60 + Math.sin(Date.now() / 40) * 12;

        const grad = ctx.createLinearGradient(this.pos.x - beamWidth / 2, 0, this.pos.x + beamWidth / 2, 0);
        grad.addColorStop(0, 'rgba(255, 0, 85, 0.8)');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, 'rgba(255, 0, 85, 0.8)');

        ctx.fillStyle = grad;
        ctx.fillRect(this.pos.x - beamWidth / 2, this.pos.y + 70, beamWidth, 800);
        ctx.restore();
      }
    }
  }

  // ==========================================
  // 8. BOSS 2: HIVE EMPRESS
  // ==========================================
  class HiveEmpress {
    constructor(canvasWidth) {
      this.pos = new Vector2D(canvasWidth / 2, -180);
      this.targetY = 130;
      this.radius = 70;
      this.maxHealth = 2200;
      this.health = this.maxHealth;
      this.isDead = false;
      this.scoreValue = 18000;

      this.spawnDroneTimer = 0;
      this.orbTimer = 0;
      this.pulseAngle = 0;
      this.hitFlashTimer = 0;
    }

    takeDamage(amount) {
      console.log("★★ Hive Empress HIT");
      this.health -= amount;
      this.hitFlashTimer = 0.15;
      // ★ BOSS 2 被擊中音效
      if (window.gameEngine?.audioSynth &&
        typeof window.gameEngine.audioSynth.playHiveEmpressHit === 'function') {
        window.gameEngine.audioSynth.playHiveEmpressHit();
        console.log("★★★ Hive Empress HIT SOUND PLAY");
      }
      if (this.health <= 0) { //BOSS 2 死亡
        this.health = 0;
        this.isDead = true;
        // ★ BOSS 2 爆炸音效
        console.log("★ Hive Empress Explosion Sound Called");
        if (window.gameEngine?.audioSynth &&
            typeof window.gameEngine.audioSynth.playHiveEmpressExplosion === 'function') {
            window.gameEngine.audioSynth.playHiveEmpressExplosion();
        }
        return true;
      }
      return false;
    }

    update(dt, gameSpeed, playerPos, enemiesList, enemyProjectiles) {
      if (this.isDead) return;

      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

      const effDt = dt * gameSpeed;
      this.pulseAngle += effDt * 3;

      // Entrance interpolation
      if (this.pos.y < this.targetY) {
        this.pos.y = Vector2D.lerp(this.pos.y, this.targetY, effDt * 2);
      } else {
        // Infinity figure-8 Lissajous path
        const liss = Vector2D.getLissajousPoint(this.pos.x, this.targetY, 140, 30, 0.8, 1.6, 0, this.pulseAngle * 0.3);
        this.pos.x = Vector2D.lerp(this.pos.x, liss.x, effDt * 3);
      }

      // Drone Spawning Mechanism
      this.spawnDroneTimer += effDt;
      if (this.spawnDroneTimer >= 4.5 && enemiesList.length < 18) {
        this.spawnDroneTimer = 0;
        this.spawnKamikazeDrone(enemiesList);
      }

      // Homing Orb Attack Mechanism
      this.orbTimer += effDt;
      if (this.orbTimer >= 2.2) {
        this.orbTimer = 0;
        this.fireHomingOrbs(enemyProjectiles, playerPos);
      }
    }

    spawnKamikazeDrone(enemiesList) {
      for (let i = -1; i <= 1; i += 2) {
        enemiesList.push(new Enemy({
          x: this.pos.x + i * 40,
          y: this.pos.y + 50,
          type: 'KAMIKAZE',
          radius: 16,
          maxHealth: 25,
          scoreValue: 150,
          state: 'DIVING'
        }));
      }
    }

    fireHomingOrbs(projectiles, playerPos) {
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI / 4) * i + Math.PI / 4;
        projectiles.push(new Projectile({
          x: this.pos.x,
          y: this.pos.y + 40,
          vx: Math.cos(angle) * 260,
          vy: Math.sin(angle) * 260,
          radius: 7,
          damage: 18,
          color: '#34d399',
          isPlayer: false,
          type: 'HOMING',
          target: playerPos ? { pos: playerPos, isDead: false } : null,
          turnRate: 0.12
        }));
      }
    }

    draw(ctx) {
      if (this.isDead) return;

      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);

      let spriteDrawn = false;
      if (window.GalagaRenderers && window.GalagaRenderers.spriteManager) {
        spriteDrawn = window.GalagaRenderers.spriteManager.drawSprite(
          ctx, 'boss', 0, 0, 210, 210, 0, this.hitFlashTimer > 0
        );
      }

      if (!spriteDrawn) {
      // Organic Bio Wings Fallback
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#064e3b';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;

      const wingFlap = Math.sin(this.pulseAngle) * 12;

      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.bezierCurveTo(60 + wingFlap, -40, 110, 20, 120, -50);
      ctx.bezierCurveTo(80, -20, 40, -10, 0, -40);
      ctx.bezierCurveTo(-40, -10, -80, -20, -120, -50);
      ctx.bezierCurveTo(-110, 20, -60 + wingFlap, -40, 0, 40);
      ctx.fill();
      ctx.stroke();

      // Bio Empress Main Core
      ctx.fillStyle = '#022c22';
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulsing Empress Eye
      ctx.fillStyle = '#a7f3d0';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      }

      ctx.restore();
    }
  }

  // EXPORT TO GLOBAL SCOPE
  window.GalagaEntities = {
    Vector2D,
    Projectile,
    Powerup,
    POWERUP_TYPES,
    DroneWingman,
    PlayerShip,
    Enemy,
    CyberDreadnought,
    HiveEmpress
  };

})(window);
