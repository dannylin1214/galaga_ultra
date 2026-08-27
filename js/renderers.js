/**
 * GALAGA ULTRA - Visual Renderers & Canvas Effects
 * Ultra-gorgeous multi-layer starfield with warp effect, procedural neon player ship,
 * enemy vector sprites, dynamic HUD, and CRT overlay renderer.
 */

(function (global) {
    'use strict';

    /**
     * Multi-Layer Parallax Cosmic Starfield with Dynamic Hyperspace Warp
     */
    class StarfieldRenderer {
        constructor(width = 800, height = 600, starCount = 200) {
            this.width = width;
            this.height = height;
            this.starCount = starCount;
            this.stars = [];
            this.warpFactor = 0; // 0 = normal, 1 = maximum warp speed
            this.nebulaNodes = [];
            this.init();
        }

        init() {
            this.stars = [];
            const colors = ['#ffffff', '#00f3ff', '#ff0055', '#ffb700', '#9d00ff', '#88ccff'];

            for (let i = 0; i < this.starCount; i++) {
                this.stars.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    z: Math.random() * 3 + 1, // Layer depth (1 = far, 4 = near)
                    size: Math.random() * 1.8 + 0.5,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    alpha: Math.random() * 0.7 + 0.3,
                    twinkleSpeed: Math.random() * 3 + 1
                });
            }

            // Create background nebula ambient nodes
            this.nebulaNodes = [
                { x: this.width * 0.2, y: this.height * 0.3, radius: 250, color: 'rgba(157, 0, 255, 0.12)' },
                { x: this.width * 0.8, y: this.height * 0.7, radius: 300, color: 'rgba(0, 243, 255, 0.10)' },
                { x: this.width * 0.5, y: this.height * 0.5, radius: 200, color: 'rgba(255, 0, 85, 0.08)' }
            ];
        }

        resize(w, h) {
            this.width = w;
            this.height = h;
            this.init();
        }

        update(dt = 0.016, targetWarpFactor = 0) {
            // Smoothly lerp warpFactor
            this.warpFactor += (targetWarpFactor - this.warpFactor) * dt * 4;

            const baseSpeed = 40;
            const warpSpeedMult = 1 + this.warpFactor * 35;

            for (const s of this.stars) {
                const speed = baseSpeed * s.z * warpSpeedMult;
                s.y += speed * dt;

                // Wrap around edges
                if (s.y > this.height) {
                    s.y = 0;
                    s.x = Math.random() * this.width;
                }
            }
        }

        draw(ctx) {
            ctx.save();

            // Background Deep Space Gradient
            const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
            bgGrad.addColorStop(0, '#03030c');
            bgGrad.addColorStop(0.5, '#070719');
            bgGrad.addColorStop(1, '#020208');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, this.width, this.height);

            // Draw Nebula Ambient Glows
            for (const n of this.nebulaNodes) {
                const grad = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, n.radius);
                grad.addColorStop(0, n.color);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Stars / Warp Streaks
            const isWarping = this.warpFactor > 0.05;
            if (isWarping) {
                ctx.globalCompositeOperation = 'lighter';
            }

            const time = performance.now() * 0.001;

            for (const s of this.stars) {
                const twinkle = Math.sin(time * s.twinkleSpeed + s.x) * 0.2 + 0.8;
                const alpha = s.alpha * twinkle;

                if (isWarping) {
                    // Hyperspace Streaks
                    const streakLength = s.z * this.warpFactor * 60;
                    const grad = ctx.createLinearGradient(s.x, s.y - streakLength, s.x, s.y);
                    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
                    grad.addColorStop(1, s.color);

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = Math.max(1, s.size * (1 + this.warpFactor));
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y - streakLength);
                    ctx.lineTo(s.x, s.y);
                    ctx.stroke();
                } else {
                    // Normal glowing star
                    ctx.fillStyle = s.color;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
    }

    /**
     * Procedural Cyberpunk Player Ship Renderer
     */
    class PlayerShipRenderer {
        static drawPlayer(ctx, x, y, width = 48, height = 52, options = {}) {
            const {
                bankAngle = 0,         // -0.3 to 0.3 radians (banking left/right)
                thrusterLevel = 1.0,   // Thruster flame intensity
                shieldActive = false,
                shieldHitTime = 0,
                weaponUpgrade = 1,
                invulnerable = false,
                time = performance.now() * 0.001
            } = options;

            if (invulnerable && Math.floor(time * 20) % 2 === 0) {
                return; // Flicker effect
            }

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(bankAngle);

            const hw = width * 0.5;
            const hh = height * 0.5;

            // 1. Thruster Plasma Glow
            if (thrusterLevel > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';

                const flameLen = (20 + Math.sin(time * 35) * 6) * thrusterLevel;
                const flameGrad = ctx.createLinearGradient(0, hh - 4, 0, hh + flameLen);
                flameGrad.addColorStop(0, '#00f3ff');
                flameGrad.addColorStop(0.4, '#9d00ff');
                flameGrad.addColorStop(1, 'rgba(255, 0, 85, 0)');

                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.moveTo(-hw * 0.3, hh - 6);
                ctx.lineTo(0, hh + flameLen);
                ctx.lineTo(hw * 0.3, hh - 6);
                ctx.closePath();
                ctx.fill();

                // Inner core flame
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(-hw * 0.15, hh - 6);
                ctx.lineTo(0, hh + flameLen * 0.6);
                ctx.lineTo(hw * 0.15, hh - 6);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }

            // 2. Metallic Cyber Hull Base
            ctx.save();
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 12;

            // Ship Outer Outline Gradient
            const hullGrad = ctx.createLinearGradient(0, -hh, 0, hh);
            hullGrad.addColorStop(0, '#1a1d36');
            hullGrad.addColorStop(0.5, '#0d1024');
            hullGrad.addColorStop(1, '#050714');

            ctx.fillStyle = hullGrad;
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 2;

            ctx.beginPath();
            // Nose tip
            ctx.moveTo(0, -hh);
            // Right Wing top notch
            ctx.lineTo(hw * 0.25, -hh * 0.3);
            ctx.lineTo(hw * 0.5, -hh * 0.1);
            // Right Wingtip
            ctx.lineTo(hw, hh * 0.4);
            ctx.lineTo(hw * 0.7, hh * 0.6);
            ctx.lineTo(hw * 0.35, hh * 0.45);
            // Tail Engine bay
            ctx.lineTo(hw * 0.25, hh);
            ctx.lineTo(-hw * 0.25, hh);
            // Left Wing base
            ctx.lineTo(-hw * 0.35, hh * 0.45);
            ctx.lineTo(-hw * 0.7, hh * 0.6);
            // Left Wingtip
            ctx.lineTo(-hw, hh * 0.4);
            ctx.lineTo(-hw * 0.5, -hh * 0.1);
            ctx.lineTo(-hw * 0.25, -hh * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Wing Cannons (If upgraded)
            if (weaponUpgrade > 1) {
                ctx.strokeStyle = '#ffb700';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#ffb700';

                // Left Cannon
                ctx.beginPath();
                ctx.moveTo(-hw * 0.85, hh * 0.4);
                ctx.lineTo(-hw * 0.85, -hh * 0.4);
                ctx.stroke();

                // Right Cannon
                ctx.beginPath();
                ctx.moveTo(hw * 0.85, hh * 0.4);
                ctx.lineTo(hw * 0.85, -hh * 0.4);
                ctx.stroke();
            }

            // Cockpit Canopy (Neon Glass)
            const cockpitGrad = ctx.createLinearGradient(0, -hh * 0.4, 0, hh * 0.1);
            cockpitGrad.addColorStop(0, '#ff0055');
            cockpitGrad.addColorStop(1, '#ffb700');

            ctx.fillStyle = cockpitGrad;
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(0, -hh * 0.5);
            ctx.lineTo(hw * 0.2, -hh * 0.1);
            ctx.lineTo(0, hh * 0.15);
            ctx.lineTo(-hw * 0.2, -hh * 0.1);
            ctx.closePath();
            ctx.fill();

            // Vector Trim Highlights
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(0, -hh * 0.8);
            ctx.lineTo(0, -hh * 0.5);
            ctx.moveTo(-hw * 0.4, 0);
            ctx.lineTo(-hw * 0.2, -hh * 0.15);
            ctx.moveTo(hw * 0.4, 0);
            ctx.lineTo(hw * 0.2, -hh * 0.15);
            ctx.stroke();

            ctx.restore(); // end hull

            // 3. Forcefield Shield Overlay
            if (shieldActive || shieldHitTime > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const shieldPulse = Math.sin(time * 12) * 0.15 + 0.85;
                const hitFlash = Math.max(0, 1 - (time - shieldHitTime) * 4);

                ctx.strokeStyle = hitFlash > 0 ? '#ffffff' : '#00f3ff';
                ctx.fillStyle = hitFlash > 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 243, 255, 0.12)';
                ctx.lineWidth = 2.5 + hitFlash * 2;
                ctx.shadowColor = '#00f3ff';
                ctx.shadowBlur = 20;

                ctx.beginPath();
                ctx.ellipse(0, 0, hw * 1.35 * shieldPulse, hh * 1.25 * shieldPulse, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore(); // end ship translate
        }
    }

    /**
     * Procedural Glowing Enemy Vector Sprites Renderer
     */
    class EnemyRenderer {
        static drawEnemy(ctx, type = 'drone', x = 0, y = 0, width = 36, height = 36, time = 0, options = {}) {
            const { hitFlash = 0, phase = 0 } = options;
            ctx.save();
            ctx.translate(x, y);

            const hw = width * 0.5;
            const hh = height * 0.5;

            // Hit Flash Color Override
            if (hitFlash > 0) {
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 20;
                ctx.strokeStyle = '#ffffff';
                ctx.fillStyle = '#ffffff';
            }

            switch (type) {
                case 'drone': // Bee Enemy (Cyan / Green Winged Drone)
                    ctx.save();
                    if (!hitFlash) {
                        ctx.shadowColor = '#00ff66';
                        ctx.shadowBlur = 12;
                        ctx.strokeStyle = '#00ff66';
                        ctx.fillStyle = '#052b14';
                    }

                    // Pulsing wings
                    const wingFlap = Math.sin(time * 15 + phase) * 0.3;

                    // Left Wing
                    ctx.save();
                    ctx.rotate(wingFlap);
                    ctx.beginPath();
                    ctx.moveTo(-hw * 0.2, 0);
                    ctx.lineTo(-hw * 1.1, -hh * 0.5);
                    ctx.lineTo(-hw * 0.8, hh * 0.4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();

                    // Right Wing
                    ctx.save();
                    ctx.rotate(-wingFlap);
                    ctx.beginPath();
                    ctx.moveTo(hw * 0.2, 0);
                    ctx.lineTo(hw * 1.1, -hh * 0.5);
                    ctx.lineTo(hw * 0.8, hh * 0.4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();

                    // Core Body
                    ctx.beginPath();
                    ctx.moveTo(0, -hh * 0.8);
                    ctx.lineTo(hw * 0.4, 0);
                    ctx.lineTo(0, hh * 0.8);
                    ctx.lineTo(-hw * 0.4, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Glowing Red Eye
                    ctx.fillStyle = hitFlash ? '#ffffff' : '#ff0055';
                    ctx.beginPath();
                    ctx.arc(0, -hh * 0.2, 3.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                    break;

                case 'butterfly': // Agility Destroyer (Magenta / Gold)
                    ctx.save();
                    if (!hitFlash) {
                        ctx.shadowColor = '#ff0055';
                        ctx.shadowBlur = 14;
                        ctx.strokeStyle = '#ff0055';
                        ctx.fillStyle = '#2b0213';
                    }

                    const wingAngle = Math.sin(time * 10 + phase) * 0.25;

                    ctx.beginPath();
                    // Diamond Body
                    ctx.moveTo(0, -hh * 0.9);
                    ctx.lineTo(hw * 0.35, -hh * 0.2);
                    ctx.lineTo(hw * 0.2, hh * 0.7);
                    ctx.lineTo(0, hh * 0.9);
                    ctx.lineTo(-hw * 0.2, hh * 0.7);
                    ctx.lineTo(-hw * 0.35, -hh * 0.2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Outer Curved Antenna Wings
                    ctx.strokeStyle = hitFlash ? '#ffffff' : '#ffb700';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, -hh * 0.4);
                    ctx.quadraticCurveTo(-hw * 1.2 + wingAngle * 10, -hh * 0.8, -hw * 0.9, hh * 0.5);
                    ctx.moveTo(0, -hh * 0.4);
                    ctx.quadraticCurveTo(hw * 1.2 - wingAngle * 10, -hh * 0.8, hw * 0.9, hh * 0.5);
                    ctx.stroke();

                    ctx.restore();
                    break;

                case 'boss': // Galaga Commander (Plasma Purple / Electric Gold)
                    ctx.save();
                    if (!hitFlash) {
                        ctx.shadowColor = '#9d00ff';
                        ctx.shadowBlur = 18;
                        ctx.strokeStyle = '#9d00ff';
                        ctx.fillStyle = '#1c0330';
                    }

                    ctx.lineWidth = 2.5;

                    // Large Hexagon Commander Base Hull
                    ctx.beginPath();
                    ctx.moveTo(0, -hh);
                    ctx.lineTo(hw * 0.7, -hh * 0.5);
                    ctx.lineTo(hw, hh * 0.3);
                    ctx.lineTo(hw * 0.5, hh);
                    ctx.lineTo(-hw * 0.5, hh);
                    ctx.lineTo(-hw, hh * 0.3);
                    ctx.lineTo(-hw * 0.7, -hh * 0.5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Tractor Beam Core Emitter (Glowing Gold Pulse)
                    const coreGlow = Math.sin(time * 8) * 0.3 + 0.7;
                    ctx.fillStyle = hitFlash ? '#ffffff' : '#ffb700';
                    ctx.shadowColor = '#ffb700';
                    ctx.shadowBlur = 15 * coreGlow;
                    ctx.beginPath();
                    ctx.arc(0, hh * 0.1, hw * 0.35 * coreGlow, 0, Math.PI * 2);
                    ctx.fill();

                    // Twin Mandible Horns
                    ctx.strokeStyle = hitFlash ? '#ffffff' : '#00f3ff';
                    ctx.beginPath();
                    ctx.moveTo(-hw * 0.5, -hh * 0.5);
                    ctx.lineTo(-hw * 0.6, -hh * 1.15);
                    ctx.moveTo(hw * 0.5, -hh * 0.5);
                    ctx.lineTo(hw * 0.6, -hh * 1.15);
                    ctx.stroke();

                    ctx.restore();
                    break;

                case 'interceptor': // Stealth Interceptor (Neon Cyan / Sharp Lines)
                default:
                    ctx.save();
                    if (!hitFlash) {
                        ctx.shadowColor = '#00f3ff';
                        ctx.shadowBlur = 12;
                        ctx.strokeStyle = '#00f3ff';
                        ctx.fillStyle = '#031f2b';
                    }

                    ctx.beginPath();
                    ctx.moveTo(0, hh);
                    ctx.lineTo(hw, -hh * 0.7);
                    ctx.lineTo(0, -hh * 0.3);
                    ctx.lineTo(-hw, -hh * 0.7);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    ctx.restore();
                    break;
            }

            ctx.restore(); // end enemy translate
        }
    }

    /**
     * Dynamic Futuristic HUD Renderer (Health, Shield, Score, Multiplier)
     */
    class HUDRenderer {
        static drawHUD(ctx, width, height, gameState = {}) {
            const {
                score = 0,
                highScore = 100000,
                lives = 3,
                health = 100,
                maxHealth = 100,
                shield = 100,
                maxShield = 100,
                combo = 1,
                wave = 1,
                overdrive = 0 // 0 to 100
            } = gameState;

            ctx.save();

            // 1. Top Bar - Score & Wave Stats
            ctx.font = '900 13px "Press Start 2P", "Orbitron", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // 1UP Score
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#00f3ff';
            ctx.fillText('SCORE', 20, 18);

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 20px "Orbitron", sans-serif';
            ctx.fillText(score.toString().padStart(6, '0'), 20, 36);

            // HIGH SCORE Center
            ctx.textAlign = 'center';
            ctx.font = '900 11px "Press Start 2P", "Orbitron", monospace';
            ctx.shadowColor = '#ffb700';
            ctx.fillStyle = '#ffb700';
            ctx.fillText('HIGH SCORE', width * 0.5, 18);

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 18px "Orbitron", sans-serif';
            ctx.fillText(Math.max(score, highScore).toString().padStart(6, '0'), width * 0.5, 36);

            // WAVE / STAGE Right
            ctx.textAlign = 'right';
            ctx.font = '900 13px "Press Start 2P", "Orbitron", monospace';
            ctx.shadowColor = '#ff0055';
            ctx.fillStyle = '#ff0055';
            ctx.fillText(`STAGE ${wave}`, width - 20, 18);

            if (combo > 1) {
                ctx.shadowColor = '#ffb700';
                ctx.fillStyle = '#ffb700';
                ctx.font = '700 15px "Orbitron", sans-serif';
                ctx.fillText(`${combo}x COMBO!`, width - 20, 38);
            }

            // 2. Bottom Left - Energy Meters (Health & Shield)
            const meterX = 20;
            const meterY = height - 45;
            const meterW = 160;
            const meterH = 10;

            // Health Bar Background
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 1;
            ctx.strokeRect(meterX, meterY, meterW, meterH);
            ctx.fillRect(meterX, meterY, meterW, meterH);

            // Health Fill
            const healthPct = Math.max(0, health / maxHealth);
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 8;
            const hpGrad = ctx.createLinearGradient(meterX, 0, meterX + meterW, 0);
            hpGrad.addColorStop(0, '#ff0055');
            hpGrad.addColorStop(1, '#ffb700');
            ctx.fillStyle = hpGrad;
            ctx.fillRect(meterX + 1, meterY + 1, (meterW - 2) * healthPct, meterH - 2);

            // Shield Bar Arc (above health)
            const shieldY = meterY - 14;
            ctx.strokeRect(meterX, shieldY, meterW, meterH - 2);
            ctx.fillRect(meterX, shieldY, meterW, meterH - 2);

            const shieldPct = Math.max(0, shield / maxShield);
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(meterX + 1, shieldY + 1, (meterW - 2) * shieldPct, meterH - 4);

            // Meters Label
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
            ctx.font = '700 10px "Orbitron", sans-serif';
            ctx.fillStyle = '#00f3ff';
            ctx.fillText('SHD', meterX + meterW + 8, shieldY + 6);
            ctx.fillStyle = '#ff0055';
            ctx.fillText('HULL', meterX + meterW + 8, meterY + 8);

            // 3. Bottom Right - Lives Icons
            const shipWidth = 18;
            for (let i = 0; i < lives; i++) {
                const lx = width - 30 - (i * (shipWidth + 8));
                const ly = height - 30;
                PlayerShipRenderer.drawPlayer(ctx, lx, ly, shipWidth, shipWidth * 1.1, { thrusterLevel: 0 });
            }

            // 4. Overdrive Super Gauge (Center Bottom)
            if (overdrive > 0) {
                const odW = 200;
                const odH = 6;
                const odX = (width - odW) * 0.5;
                const odY = height - 25;

                ctx.strokeStyle = '#9d00ff';
                ctx.strokeRect(odX, odY, odW, odH);

                const odPct = Math.min(100, overdrive) / 100;
                ctx.shadowColor = '#9d00ff';
                ctx.shadowBlur = 12;
                ctx.fillStyle = odPct >= 1.0 ? '#ffffff' : '#9d00ff';
                ctx.fillRect(odX, odY, odW * odPct, odH);
            }

            ctx.restore();
        }
    }

    /**
     * CRT Scanline & Screen Curvature Overlay Renderer
     */
    class CRTOverlayRenderer {
        constructor() {
            this.scanlineCanvas = null;
        }

        initScanlinePattern(width, height) {
            if (typeof document === 'undefined') return;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Subtle horizontal scanlines
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            for (let y = 0; y < height; y += 4) {
                ctx.fillRect(0, y, width, 2);
            }

            // Vignette Corners
            const grad = ctx.createRadialGradient(
                width * 0.5, height * 0.5, Math.min(width, height) * 0.4,
                width * 0.5, height * 0.5, Math.max(width, height) * 0.75
            );
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            this.scanlineCanvas = canvas;
        }

        drawCRT(ctx, width, height) {
            if (!this.scanlineCanvas || this.scanlineCanvas.width !== width || this.scanlineCanvas.height !== height) {
                this.initScanlinePattern(width, height);
            }

            if (this.scanlineCanvas) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(this.scanlineCanvas, 0, 0);
                ctx.restore();
            }
        }
    }

    // Sprite Asset Manager for 5 Generated AI Artworks
    class SpriteAssetManager {
        constructor() {
            this.images = {};
            this.processedCanvases = {};
            this.flashCanvases = {};
            this.loaded = false;
            this.preload();
        }

        preload() {
            const sources = {
                player: 'assets/player_ship.jpg',
                drone: 'assets/enemy_drone.jpg',
                destroyer: 'assets/enemy_destroyer.jpg',
                interceptor: 'assets/enemy_interceptor.jpg',
                boss: 'assets/boss_mothership.jpg'
            };

            let count = 0;
            const keys = Object.keys(sources);
            keys.forEach(key => {
                const img = new Image();
                img.onload = () => {
                    this.processedCanvases[key] = this.processTransparentSprite(img, key, false);
                    this.flashCanvases[key] = this.processTransparentSprite(img, key, true);
                    count++;
                    if (count === keys.length) this.loaded = true;
                };
                img.onerror = () => {
                    console.warn('Could not load image asset:', sources[key]);
                };
                img.src = sources[key];
                this.images[key] = img;
            });
        }

        processTransparentSprite(img, type, isFlash = false) {
            const canvas = document.createElement('canvas');
            const w = img.naturalWidth || img.width || 512;
            const h = img.naturalHeight || img.height || 512;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0, w, h);

            try {
                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;

                // Smart background removal: JPG images have dark space background
                // Key out dark pixels (low RGB) to make background transparent
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const maxColor = Math.max(r, g, b);
                    const avgColor = (r + g + b) / 3;

                    if (isFlash) {
                        // Create white-hot flash sprite for hit effects
                        if (maxColor > 30) {
                            data[i] = 255;
                            data[i + 1] = 255;
                            data[i + 2] = 255;
                            data[i + 3] = 255;
                        } else {
                            data[i + 3] = 0;
                        }
                    } else {
                        // Smooth alpha falloff for dark background
                        if (maxColor < 35) {
                            data[i + 3] = Math.floor((maxColor / 35) * 180);
                        } else if (avgColor < 25) {
                            data[i + 3] = Math.floor((avgColor / 25) * 255);
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0);
            } catch (e) {
                // Fallback if cross-origin canvas security blocks getImageData
            }

            return canvas;
        }

        drawSprite(ctx, type, x, y, width, height, angle = 0, hitFlash = false) {
            const rawImg = this.images[type];
            const processed = hitFlash ? this.flashCanvases[type] : this.processedCanvases[type];
            const drawable = (processed && processed.width > 0) ? processed : rawImg;

            if (drawable && ((drawable.naturalWidth && drawable.naturalWidth > 0) || drawable.width > 0)) {
                ctx.save();
                ctx.translate(x, y);
                if (angle !== 0) ctx.rotate(angle);

                // Use screen composite operation so JPG black space background dissolves seamlessly
                ctx.globalCompositeOperation = 'screen';

                // Neon Aura Glow
                if (type === 'player') {
                    ctx.shadowColor = '#00f3ff';
                    ctx.shadowBlur = 18;
                } else if (type === 'boss') {
                    ctx.shadowColor = hitFlash ? '#ffffff' : '#ff0055';
                    ctx.shadowBlur = 30;
                } else {
                    ctx.shadowColor = hitFlash ? '#ffffff' : '#ff9900';
                    ctx.shadowBlur = 14;
                }

                ctx.drawImage(drawable, -width / 2, -height / 2, width, height);

                if (hitFlash) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.beginPath();
                    ctx.arc(0, 0, width * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
                return true;
            }
            return false;
        }
    }

    const spriteManager = new SpriteAssetManager();

    // Export module
    const GalagaRenderers = {
        StarfieldRenderer,
        PlayerShipRenderer,
        EnemyRenderer,
        HUDRenderer,
        CRTOverlayRenderer,
        SpriteAssetManager,
        spriteManager
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GalagaRenderers;
    } else {
        global.GalagaRenderers = GalagaRenderers;
    }

})(typeof window !== 'undefined' ? window : this);

