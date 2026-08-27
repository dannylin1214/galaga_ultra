/**
 * GALAGA ULTRA - Core Game Engine, Physics, Collision System, State Management
 * Ultra High-DPI Responsive Canvas Loop with Delta-Time Smoothing & Fast Spatial Hashing.
 */

// ==========================================
// 1. GAME STATE ENUM & ENGINE CONSTANTS
// ==========================================
const GameStates = Object.freeze({
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    WAVE_TRANSITION: 'WAVE_TRANSITION',
    BOSS_ALERT: 'BOSS_ALERT',
    GAME_OVER: 'GAME_OVER',
    VICTORY: 'VICTORY'
});

// ==========================================
// 2. PRECISION COLLISION ENGINE
// ==========================================
class CollisionSystem {
    /** Bounding Box vs Bounding Box */
    static checkAABB(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    /** Bounding Circle vs Bounding Circle */
    static checkCircle(a, b) {
        const dx = (a.x + (a.width ? a.width / 2 : 0)) - (b.x + (b.width ? b.width / 2 : 0));
        const dy = (a.y + (a.height ? a.height / 2 : 0)) - (b.y + (b.height ? b.height / 2 : 0));
        const distanceSq = dx * dx + dy * dy;
        const radiusSum = (a.radius || a.width / 2 || 10) + (b.radius || b.width / 2 || 10);
        return distanceSq <= radiusSum * radiusSum;
    }

    /** Bounding Circle vs Bounding Box */
    static checkCircleAABB(circle, box) {
        const cx = circle.x + (circle.radius || circle.width / 2 || 0);
        const cy = circle.y + (circle.radius || circle.height / 2 || 0);
        const r = circle.radius || circle.width / 2 || 10;

        // Closest point on box
        const closestX = Math.max(box.x, Math.min(cx, box.x + box.width));
        const closestY = Math.max(box.y, Math.min(cy, box.y + box.height));

        const dx = cx - closestX;
        const dy = cy - closestY;

        return (dx * dx + dy * dy) <= (r * r);
    }
}

/** Fast Spatial Hash Grid for high entity count collision optimizations */
class SpatialHashGrid {
    constructor(width, height, cellSize = 64) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Map();
    }

    clear() {
        this.grid.clear();
    }

    _key(col, row) {
        return `${col},${row}`;
    }

    insert(entity) {
        const minCol = Math.max(0, Math.floor(entity.x / this.cellSize));
        const maxCol = Math.max(0, Math.floor((entity.x + (entity.width || 20)) / this.cellSize));
        const minRow = Math.max(0, Math.floor(entity.y / this.cellSize));
        const maxRow = Math.max(0, Math.floor((entity.y + (entity.height || 20)) / this.cellSize));

        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const key = this._key(c, r);
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                this.grid.get(key).push(entity);
            }
        }
    }

    getNearby(entity) {
        const minCol = Math.max(0, Math.floor(entity.x / this.cellSize));
        const maxCol = Math.max(0, Math.floor((entity.x + (entity.width || 20)) / this.cellSize));
        const minRow = Math.max(0, Math.floor(entity.y / this.cellSize));
        const maxRow = Math.max(0, Math.floor((entity.y + (entity.height || 20)) / this.cellSize));

        const nearby = new Set();
        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const list = this.grid.get(this._key(c, r));
                if (list) {
                    for (let i = 0; i < list.length; i++) {
                        if (list[i] !== entity) nearby.add(list[i]);
                    }
                }
            }
        }
        return Array.from(nearby);
    }
}

// ==========================================
// 3. MULTI-DEVICE INPUT MANAGER
// ==========================================
class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.touch = { active: false, x: 0, y: 0, dx: 0, dy: 0, isFiring: false };
        this.mouse = { x: 0, y: 0, isDown: false };
        this.gamepad = null;

        this._setupKeyboard();
        this._setupPointer();
        this._setupGamepad();
    }

    _setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key] = false;
        });
    }

    _setupPointer() {
        let lastTouchX = 0;
        let lastTouchY = 0;

        const updateCoords = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (this.canvas.width / rect.width),
                y: (clientY - rect.top) * (this.canvas.height / rect.height)
            };
        };

        this.canvas.addEventListener('pointerdown', (e) => {
            const coords = updateCoords(e);
            this.touch.active = true;
            this.touch.x = coords.x;
            this.touch.y = coords.y;
            this.touch.isFiring = true;
            lastTouchX = coords.x;
            lastTouchY = coords.y;
            this.mouse.isDown = true;
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.touch.active && !this.mouse.isDown) return;
            const coords = updateCoords(e);
            this.touch.dx = coords.x - lastTouchX;
            this.touch.dy = coords.y - lastTouchY;
            this.touch.x = coords.x;
            this.touch.y = coords.y;
            lastTouchX = coords.x;
            lastTouchY = coords.y;
        });

        window.addEventListener('pointerup', () => {
            this.touch.active = false;
            this.touch.isFiring = false;
            this.touch.dx = 0;
            this.touch.dy = 0;
            this.mouse.isDown = false;
        });
    }

    _setupGamepad() {
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepad = e.gamepad;
        });
        window.addEventListener('gamepaddisconnected', () => {
            this.gamepad = null;
        });
    }

    updateGamepadState() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let gp of gamepads) {
            if (gp) {
                this.gamepad = gp;
                break;
            }
        }
    }

    isMovingLeft() {
        this.updateGamepadState();
        const gpLeft = this.gamepad && (this.gamepad.axes[0] < -0.3 || this.gamepad.buttons[14]?.pressed);
        return this.keys['KeyA'] || this.keys['ArrowLeft'] || gpLeft;
    }

    isMovingRight() {
        this.updateGamepadState();
        const gpRight = this.gamepad && (this.gamepad.axes[0] > 0.3 || this.gamepad.buttons[15]?.pressed);
        return this.keys['KeyD'] || this.keys['ArrowRight'] || gpRight;
    }

    isMovingUp() {
        this.updateGamepadState();
        const gpUp = this.gamepad && (this.gamepad.axes[1] < -0.3 || this.gamepad.buttons[12]?.pressed);
        return this.keys['KeyW'] || this.keys['ArrowUp'] || gpUp;
    }

    isMovingDown() {
        this.updateGamepadState();
        const gpDown = this.gamepad && (this.gamepad.axes[1] > 0.3 || this.gamepad.buttons[13]?.pressed);
        return this.keys['KeyS'] || this.keys['ArrowDown'] || gpDown;
    }

    isFiring() {
        this.updateGamepadState();
        const gpFire = this.gamepad && (this.gamepad.buttons[0]?.pressed || this.gamepad.buttons[7]?.pressed);
        return this.keys['Space'] || this.keys['KeyZ'] || this.keys['KeyK'] || this.touch.isFiring || gpFire;
    }

    isBombTriggered() {
        this.updateGamepadState();
        const gpBomb = this.gamepad && (this.gamepad.buttons[1]?.pressed || this.gamepad.buttons[6]?.pressed);
        return this.keys['KeyX'] || this.keys['KeyL'] || this.keys['ShiftLeft'] || gpBomb;
    }
}

// ==========================================
// 4. PARTICLE ENGINE & STARFIELD PARALLAX
// ==========================================
class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.size = 2;
        this.color = '#ffffff';
        this.alpha = 1;
        this.life = 1;
        this.decay = 0.02;
        this.shape = 'circle'; // 'circle', 'square', 'line'
        this.active = false;
    }
}

class ParticleEngine {
    constructor(maxParticles = 600) {
        this.pool = Array.from({ length: maxParticles }, () => new Particle());
        this.starfield = [];
        this.warpFactor = 1;
    }

    initStarfield(width, height) {
        this.starfield = [];
        const layers = [
            { count: 120, speed: 0.5, size: 1, color: 'rgba(255,255,255,0.4)' },
            { count: 60,  speed: 1.5, size: 1.8, color: 'rgba(0,210,255,0.7)' },
            { count: 30,  speed: 3.0, size: 2.5, color: 'rgba(255,0,220,0.9)' }
        ];

        layers.forEach((layer) => {
            for (let i = 0; i < layer.count; i++) {
                this.starfield.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    baseSpeed: layer.speed,
                    size: layer.size,
                    color: layer.color,
                    twinkle: Math.random() * Math.PI * 2
                });
            }
        });
    }

    spawn(x, y, options = {}) {
        const p = this.pool.find(particle => !particle.active);
        if (!p) return;

        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = options.vx ?? (Math.random() - 0.5) * 6;
        p.vy = options.vy ?? (Math.random() - 0.5) * 6;
        p.size = options.size ?? (Math.random() * 3 + 1);
        p.color = options.color ?? '#00f0ff';
        p.alpha = options.alpha ?? 1;
        p.life = 1;
        p.decay = options.decay ?? (Math.random() * 0.03 + 0.015);
        p.shape = options.shape ?? 'circle';
    }

    spawnExplosion(x, y, count = 25, color = '#ff3366', speed = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (Math.random() * 0.8 + 0.2) * speed;
            this.spawn(x, y, {
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: color,
                size: Math.random() * 4 + 1.5,
                decay: Math.random() * 0.03 + 0.02,
                shape: Math.random() > 0.5 ? 'circle' : 'line'
            });
        }
    }

    update(dt, width, height) {
        // Update Stars
        for (let star of this.starfield) {
            star.y += star.baseSpeed * this.warpFactor * (dt * 60);
            star.twinkle += dt * 3;
            if (star.y > height) {
                star.y = 0;
                star.x = Math.random() * width;
            }
        }

        // Update Active Particles
        for (let p of this.pool) {
            if (!p.active) continue;
            p.x += p.vx * (dt * 60);
            p.y += p.vy * (dt * 60);
            p.life -= p.decay * (dt * 60);
            p.alpha = Math.max(0, p.life);

            if (p.life <= 0) {
                p.active = false;
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // 1. Draw Starfield
        for (let star of this.starfield) {
            const alpha = 0.5 + Math.sin(star.twinkle) * 0.3;
            ctx.fillStyle = star.color;
            ctx.globalAlpha = alpha;
            if (this.warpFactor > 2) {
                // Warp tail effect
                ctx.strokeStyle = star.color;
                ctx.lineWidth = star.size;
                ctx.beginPath();
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(star.x, star.y - star.baseSpeed * this.warpFactor * 4);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 2. Draw Active Particles
        for (let p of this.pool) {
            if (!p.active) continue;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;

            if (p.shape === 'line') {
                ctx.lineWidth = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

// ==========================================
// 5. BASE ENTITY & ENTITY MANAGER
// ==========================================
class BaseEntity {
    constructor(x = 0, y = 0, width = 32, height = 32) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.radius = Math.max(width, height) / 2;
        this.vx = 0;
        this.vy = 0;
        this.hp = 1;
        this.maxHp = 1;
        this.active = true;
        this.tag = 'entity';
    }

    update(dt) {
        this.x += this.vx * (dt * 60);
        this.y += this.vy * (dt * 60);
    }

    draw(ctx) {
        // Base placeholder draw
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// ==========================================
// 6. MAIN HIGH-DPI ENGINE & STATE MACHINE
// ==========================================
class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element #${canvasId} not found.`);
        }
        this.ctx = this.canvas.getContext('2d');

        // State Machine
        this.state = GameStates.START;
        this.stateTimer = 0;

        // Dynamic High-DPI Resolution
        this.dpr = window.devicePixelRatio || 1;
        this.width = 800;
        this.height = 900;
        this.resize();

        // Engine Subsystems
        this.input = new InputManager(this.canvas);
        this.particles = new ParticleEngine(800);
        this.spatialGrid = new SpatialHashGrid(this.width, this.height, 64);

        // Entities lists
        this.player = null;
        this.enemies = [];
        this.playerBullets = [];
        this.enemyBullets = [];
        this.powerups = [];
        this.floatingTexts = [];

        // Score & Game Stats
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('galaga_ultra_highscore') || '0', 10);
        this.multiplier = 1;
        this.comboTimer = 0;
        this.wave = 1;
        this.lives = 3;

        // Timing & RAF Loop
        this.lastTime = 0;
        this.fps = 60;
        this.screenShake = 0;

        // Callbacks
        this.onStateChange = null;

        // Event listeners
        window.addEventListener('resize', () => this.resize());
        this.particles.initStarfield(this.width, this.height);
    }

    resize() {
        const container = this.canvas.parentElement || document.body;
        const rect = container.getBoundingClientRect();

        // Maintain 800x900 aspect ratio inside container or fill screen smoothly
        this.width = rect.width > 0 ? rect.width : 800;
        this.height = rect.height > 0 ? rect.height : 900;

        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(this.dpr, this.dpr);
        if (this.particles) this.particles.initStarfield(this.width, this.height);
        this.spatialGrid = new SpatialHashGrid(this.width, this.height, 64);
    }

    setState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        this.stateTimer = 0;
        if (this.onStateChange) this.onStateChange(newState);
    }

    triggerScreenShake(intensity = 8) {
        this.screenShake = Math.max(this.screenShake, intensity);
    }

    addScore(points, x, y) {
        const gained = points * this.multiplier;
        this.score += gained;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('galaga_ultra_highscore', this.highScore.toString());
        }

        // Floating text
        if (x !== undefined && y !== undefined) {
            this.floatingTexts.push({
                text: `+${gained}${this.multiplier > 1 ? ` (${this.multiplier}x)` : ''}`,
                x, y,
                alpha: 1,
                life: 1,
                color: this.multiplier > 2 ? '#ff00ee' : '#00f0ff'
            });
        }

        // Combo increment
        this.multiplier = Math.min(8, this.multiplier + 1);
        this.comboTimer = 2.5; // 2.5s window to keep combo
    }

    start() {
        this.lastTime = performance.now();
        const loop = (currentTime) => {
            const rawDt = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;

            // Delta-time cap (prevent huge lag jumps)
            const dt = Math.min(rawDt, 0.08);
            this.fps = Math.round(1 / (rawDt || 0.016));

            this.update(dt);
            this.render();

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update(dt) {
        this.stateTimer += dt;

        // Combo timer decay
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.multiplier = 1;
            }
        }

        // Decay screen shake
        if (this.screenShake > 0) {
            this.screenShake -= dt * 30;
            if (this.screenShake < 0) this.screenShake = 0;
        }

        // Starfield & Particles update in all states
        this.particles.update(dt, this.width, this.height);

        // Update Floating Text
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= dt * 40;
            ft.life -= dt * 1.5;
            ft.alpha = Math.max(0, ft.life);
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // State Machine logic
        switch (this.state) {
            case GameStates.START:
                if (this.input.isFiring()) {
                    this.setState(GameStates.PLAYING);
                }
                break;

            case GameStates.PLAYING:
            case GameStates.BOSS_ALERT:
            case GameStates.WAVE_TRANSITION:
                this._updateGameplayEntities(dt);
                break;

            case GameStates.GAME_OVER:
            case GameStates.VICTORY:
                if (this.stateTimer > 1.5 && this.input.isFiring()) {
                    this.setState(GameStates.START);
                }
                break;
        }
    }

    _updateGameplayEntities(dt) {
        // Update Player
        if (this.player && this.player.active) {
            this.player.update(dt, this.input, this.width, this.height);
        }

        // Update Bullets
        this.playerBullets.forEach(b => b.update(dt));
        this.enemyBullets.forEach(b => b.update(dt));

        // Update Enemies
        this.enemies.forEach(e => e.update(dt, this.player));

        // Update Powerups
        this.powerups.forEach(p => p.update(dt));

        // Cleanup dead entities
        this.playerBullets = this.playerBullets.filter(b => b.active && b.y > -50 && b.y < this.height + 50);
        this.enemyBullets = this.enemyBullets.filter(b => b.active && b.y > -50 && b.y < this.height + 50);
        this.enemies = this.enemies.filter(e => e.active);
        this.powerups = this.powerups.filter(p => p.active && p.y < this.height + 50);

        // Spatial Grid Collision Resolution
        this.spatialGrid.clear();
        this.enemies.forEach(e => this.spatialGrid.insert(e));

        // Player Bullets vs Enemies
        for (let b of this.playerBullets) {
            if (!b.active) continue;
            const nearbyEnemies = this.spatialGrid.getNearby(b);
            for (let e of nearbyEnemies) {
                if (!e.active) continue;
                if (CollisionSystem.checkCircle(b, e)) {
                    b.active = false;
                    e.takeDamage(b.damage || 1);
                    this.particles.spawnExplosion(b.x, b.y, 8, '#00f0ff', 3);
                    if (!e.active) {
                        this.addScore(e.points || 100, e.x, e.y);
                        this.particles.spawnExplosion(e.x, e.y, e.isBoss ? 50 : 20, e.color || '#ff0055', e.isBoss ? 8 : 5);
                        this.triggerScreenShake(e.isBoss ? 15 : 5);
                    }
                    break;
                }
            }
        }

        // Enemy Bullets vs Player
        if (this.player && this.player.active) {
            for (let eb of this.enemyBullets) {
                if (!eb.active) continue;
                if (CollisionSystem.checkCircle(eb, this.player)) {
                    eb.active = false;
                    this.player.takeDamage(1);
                    this.particles.spawnExplosion(eb.x, eb.y, 10, '#ffaa00', 4);
                    this.triggerScreenShake(10);
                }
            }

            // Enemies vs Player Collision
            for (let e of this.enemies) {
                if (!e.active) continue;
                if (CollisionSystem.checkCircle(e, this.player)) {
                    e.takeDamage(5);
                    this.player.takeDamage(2);
                    this.particles.spawnExplosion(this.player.x, this.player.y, 25, '#ff0055', 6);
                    this.triggerScreenShake(12);
                }
            }

            // Powerups vs Player
            for (let p of this.powerups) {
                if (!p.active) continue;
                if (CollisionSystem.checkCircle(p, this.player)) {
                    p.active = false;
                    if (p.applyEffect) p.applyEffect(this.player, this);
                    this.addScore(500, p.x, p.y);
                    this.particles.spawnExplosion(p.x, p.y, 15, '#00ffcc', 4);
                }
            }
        }
    }

    render() {
        this.ctx.save();

        // Apply Screen Shake
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(shakeX, shakeY);
        }

        // Clear Canvas (Deep Space Dark Background)
        this.ctx.fillStyle = '#060612';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 1. Draw Starfield & Dynamic Background Particles
        this.particles.draw(this.ctx);

        // 2. Draw Entities
        this.powerups.forEach(p => p.draw(this.ctx));
        this.enemyBullets.forEach(b => b.draw(this.ctx));
        this.playerBullets.forEach(b => b.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));

        if (this.player && this.player.active) {
            this.player.draw(this.ctx);
        }

        // 3. Draw Floating Text Notifications
        this.floatingTexts.forEach(ft => {
            this.ctx.save();
            this.ctx.globalAlpha = ft.alpha;
            this.ctx.font = 'bold 16px "Outfit", sans-serif';
            this.ctx.fillStyle = ft.color;
            this.ctx.shadowColor = ft.color;
            this.ctx.shadowBlur = 8;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        });

        this.ctx.restore();
    }
}

// Global export for non-module compatibility
if (typeof window !== 'undefined') {
    window.GameStates = GameStates;
    window.CollisionSystem = CollisionSystem;
    window.SpatialHashGrid = SpatialHashGrid;
    window.InputManager = InputManager;
    window.ParticleEngine = ParticleEngine;
    window.BaseEntity = BaseEntity;
    window.GameEngine = GameEngine;
}
