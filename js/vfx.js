/**
 * GALAGA ULTRA - Visual Effects (VFX) System
 * High-performance, modular particle emitters, screen shake, and floating combat text.
 */

(function (global) {
    'use strict';

    // Helper utilities for color & math
    const VFXUtils = {
        lerp(start, end, amt) {
            return (1 - amt) * start + amt * end;
        },

        clamp(val, min, max) {
            return Math.min(Math.max(val, min), max);
        },

        // Fast color hex/hsl parser to RGBA
        hexToRgb(hex) {
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            const num = parseInt(c, 16);
            return {
                r: (num >> 16) & 255,
                g: (num >> 8) & 255,
                b: num & 255
            };
        },

        // Color palette presets
        PALETTE: {
            cyan: '#00f3ff',
            magenta: '#ff0055',
            electricGold: '#ffb700',
            plasmaPurple: '#9d00ff',
            neonGreen: '#00ff66',
            white: '#ffffff',
            hyperBlue: '#0066ff'
        }
    };

    /**
     * Particle Object definition for Object Pool
     */
    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.active = false;
            this.x = 0;
            this.y = 0;
            this.vx = 0;
            this.vy = 0;
            this.drag = 0.98;
            this.turbulence = 0;
            this.size = 2;
            this.startSize = 2;
            this.endSize = 0;
            this.life = 0;
            this.maxLife = 1;
            this.alpha = 1;
            this.colorStart = { r: 255, g: 255, b: 255 };
            this.colorEnd = { r: 0, g: 243, b: 255 };
            this.shape = 'circle'; // 'circle', 'spark', 'ring', 'line'
            this.angle = 0;
            this.rotationSpeed = 0;
            this.length = 10;
        }
    }

    /**
     * High-Performance Particle Emitter System
     * Supports pool up to 2000 active particles with additive blending ('lighter')
     */
    class ParticleSystem {
        constructor(maxParticles = 2000) {
            this.maxParticles = maxParticles;
            this.pool = new Array(maxParticles);
            for (let i = 0; i < maxParticles; i++) {
                this.pool[i] = new Particle();
            }
            this.shockwaves = [];
            this.ripples = [];
        }

        // Fetch inactive particle from pool
        getParticle() {
            for (let i = 0; i < this.maxParticles; i++) {
                if (!this.pool[i].active) {
                    this.pool[i].reset();
                    this.pool[i].active = true;
                    return this.pool[i];
                }
            }
            return null; // Pool exhausted
        }

        /**
         * Update physics, life decay, drag, turbulence
         */
        update(dt = 0.016) {
            const timeSeconds = performance.now() * 0.001;

            for (let i = 0; i < this.maxParticles; i++) {
                const p = this.pool[i];
                if (!p.active) continue;

                p.life -= dt;
                if (p.life <= 0) {
                    p.active = false;
                    continue;
                }

                // Drag calculation
                p.vx *= Math.pow(p.drag, dt * 60);
                p.vy *= Math.pow(p.drag, dt * 60);

                // Turbulence (sine/cosine pertubations)
                if (p.turbulence > 0) {
                    p.vx += Math.sin(timeSeconds * 10 + p.y * 0.05) * p.turbulence * dt * 50;
                    p.vy += Math.cos(timeSeconds * 10 + p.x * 0.05) * p.turbulence * dt * 50;
                }

                p.x += p.vx * dt * 60;
                p.y += p.vy * dt * 60;
                p.angle += p.rotationSpeed * dt;

                // Lifecycle interpolation (0 = start, 1 = dead)
                const progress = 1 - (p.life / p.maxLife);
                p.size = VFXUtils.lerp(p.startSize, p.endSize, progress);
                p.alpha = VFXUtils.clamp(1 - progress * progress, 0, 1);
            }

            // Update Shockwaves
            for (let i = this.shockwaves.length - 1; i >= 0; i--) {
                const sw = this.shockwaves[i];
                sw.radius += sw.expansionSpeed * dt * 60;
                sw.alpha -= sw.decay * dt * 60;
                if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
                    this.shockwaves.splice(i, 1);
                }
            }

            // Update Shield Ripples
            for (let i = this.ripples.length - 1; i >= 0; i--) {
                const r = this.ripples[i];
                r.currentRadius += r.speed * dt * 60;
                r.alpha -= r.decay * dt * 60;
                if (r.alpha <= 0) {
                    this.ripples.splice(i, 1);
                }
            }
        }

        /**
         * Render active glowing particles using additive blending
         */
        draw(ctx) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Render Particles
            for (let i = 0; i < this.maxParticles; i++) {
                const p = this.pool[i];
                if (!p.active) continue;

                const progress = 1 - (p.life / p.maxLife);
                const r = Math.round(VFXUtils.lerp(p.colorStart.r, p.colorEnd.r, progress));
                const g = Math.round(VFXUtils.lerp(p.colorStart.g, p.colorEnd.g, progress));
                const b = Math.round(VFXUtils.lerp(p.colorStart.b, p.colorEnd.b, progress));
                const colorStr = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;

                ctx.fillStyle = colorStr;
                ctx.strokeStyle = colorStr;

                if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.shape === 'spark') {
                    ctx.lineWidth = Math.max(1, p.size * 0.5);
                    ctx.beginPath();
                    const endX = p.x - p.vx * 0.15;
                    const endY = p.y - p.vy * 0.15;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                } else if (p.shape === 'line') {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle);
                    ctx.lineWidth = Math.max(0.5, p.size);
                    ctx.beginPath();
                    ctx.moveTo(-p.length * 0.5, 0);
                    ctx.lineTo(p.length * 0.5, 0);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // Render Shockwave Rings
            for (const sw of this.shockwaves) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(sw.x, sw.y, Math.max(0.1, sw.radius), 0, Math.PI * 2);
                ctx.lineWidth = sw.lineWidth;
                ctx.strokeStyle = `rgba(${sw.color.r}, ${sw.color.g}, ${sw.color.b}, ${sw.alpha})`;
                ctx.shadowColor = `rgb(${sw.color.r}, ${sw.color.g}, ${sw.color.b})`;
                ctx.shadowBlur = 15;
                ctx.stroke();
                ctx.restore();
            }

            // Render Shield Impact Ripples
            for (const r of this.ripples) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(r.x, r.y, Math.max(0.1, r.currentRadius), r.startAngle, r.endAngle);
                ctx.lineWidth = 3;
                ctx.strokeStyle = `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, ${r.alpha})`;
                ctx.shadowColor = `rgb(${r.color.r}, ${r.color.g}, ${r.color.b})`;
                ctx.shadowBlur = 20;
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
        }

        // --- EMITTER METHODS ---

        /**
         * Explosion with sparks, glowing embers, and expanding shockwave ring
         */
        spawnExplosion(x, y, mainColorHex = VFXUtils.PALETTE.magenta, particleCount = 40, speedMult = 1.0) {
            const rgbStart = VFXUtils.hexToRgb(mainColorHex);
            const rgbEnd = VFXUtils.hexToRgb(VFXUtils.PALETTE.electricGold);

            for (let i = 0; i < particleCount; i++) {
                const p = this.getParticle();
                if (!p) break;

                const angle = Math.random() * Math.PI * 2;
                const speed = ( Math.random() * 8 + 3 ) * speedMult;
                p.x = x;
                p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.drag = 0.94 + Math.random() * 0.04;
                p.turbulence = Math.random() * 1.5;
                p.startSize = Math.random() * 5 + 3;
                p.endSize = 0;
                p.maxLife = Math.random() * 0.6 + 0.4;
                p.life = p.maxLife;
                p.colorStart = rgbStart;
                p.colorEnd = rgbEnd;
                p.shape = Math.random() > 0.4 ? 'spark' : 'circle';
            }

            // Spawn Shockwave Ring
            this.shockwaves.push({
                x,
                y,
                radius: 5,
                maxRadius: 60 * speedMult,
                expansionSpeed: 7 * speedMult,
                alpha: 1.0,
                decay: 0.035,
                lineWidth: 4,
                color: rgbStart
            });
        }

        /**
         * Thruster Engine Plasma Trail
         */
        spawnThrusterTrail(x, y, angle = Math.PI / 2, colorHex = VFXUtils.PALETTE.cyan, lengthMult = 1.0) {
            const count = Math.floor(3 * lengthMult);
            const rgbStart = VFXUtils.hexToRgb(colorHex);
            const rgbEnd = VFXUtils.hexToRgb(VFXUtils.PALETTE.plasmaPurple);

            for (let i = 0; i < count; i++) {
                const p = this.getParticle();
                if (!p) break;

                const spreadAngle = angle + (Math.random() - 0.5) * 0.35;
                const speed = (Math.random() * 4 + 4) * lengthMult;
                p.x = x + (Math.random() - 0.5) * 4;
                p.y = y + (Math.random() - 0.5) * 4;
                p.vx = Math.cos(spreadAngle) * speed;
                p.vy = Math.sin(spreadAngle) * speed;
                p.drag = 0.92;
                p.startSize = Math.random() * 4 + 2;
                p.endSize = 0.5;
                p.maxLife = Math.random() * 0.25 + 0.15;
                p.life = p.maxLife;
                p.colorStart = rgbStart;
                p.colorEnd = rgbEnd;
                p.shape = 'circle';
            }
        }

        /**
         * Shield Impact Ripples and Micro Sparkles
         */
        spawnShieldImpact(x, y, radius = 25, colorHex = VFXUtils.PALETTE.cyan, hitAngle = Math.PI / 2) {
            const rgb = VFXUtils.hexToRgb(colorHex);

            // Shield arc ripple
            this.ripples.push({
                x,
                y,
                currentRadius: radius * 0.8,
                speed: 2.5,
                alpha: 1.0,
                decay: 0.05,
                startAngle: hitAngle - Math.PI * 0.4,
                endAngle: hitAngle + Math.PI * 0.4,
                color: rgb
            });

            // Arc Sparks
            for (let i = 0; i < 15; i++) {
                const p = this.getParticle();
                if (!p) break;

                const a = hitAngle + (Math.random() - 0.5) * Math.PI * 0.6;
                const speed = Math.random() * 5 + 2;
                p.x = x + Math.cos(a) * radius;
                p.y = y + Math.sin(a) * radius;
                p.vx = Math.cos(a) * speed;
                p.vy = Math.sin(a) * speed;
                p.drag = 0.90;
                p.startSize = Math.random() * 3 + 2;
                p.endSize = 0;
                p.maxLife = Math.random() * 0.3 + 0.1;
                p.life = p.maxLife;
                p.colorStart = rgb;
                p.colorEnd = VFXUtils.hexToRgb(VFXUtils.PALETTE.white);
                p.shape = 'spark';
            }
        }

        /**
         * Directional explosion sparks (e.g. hit impacts / ricochets)
         */
        spawnSparks(x, y, dirAngle, spread = Math.PI / 3, colorHex = VFXUtils.PALETTE.electricGold, count = 12) {
            const rgbStart = VFXUtils.hexToRgb(colorHex);
            const rgbEnd = VFXUtils.hexToRgb(VFXUtils.PALETTE.magenta);

            for (let i = 0; i < count; i++) {
                const p = this.getParticle();
                if (!p) break;

                const a = dirAngle + (Math.random() - 0.5) * spread;
                const speed = Math.random() * 7 + 3;
                p.x = x;
                p.y = y;
                p.vx = Math.cos(a) * speed;
                p.vy = Math.sin(a) * speed;
                p.drag = 0.93;
                p.startSize = Math.random() * 3.5 + 1.5;
                p.endSize = 0;
                p.maxLife = Math.random() * 0.35 + 0.15;
                p.life = p.maxLife;
                p.colorStart = rgbStart;
                p.colorEnd = rgbEnd;
                p.shape = 'spark';
            }
        }

        /**
         * Clear all particles and active effects
         */
        clear() {
            for (let i = 0; i < this.maxParticles; i++) {
                this.pool[i].active = false;
            }
            this.shockwaves.length = 0;
            this.ripples.length = 0;
        }
    }

    /**
     * Screen Shake System using Trauma Decay
     */
    class ScreenShake {
        constructor() {
            this.trauma = 0;
            this.maxAngle = 0.05; // radians
            this.maxOffset = 18; // pixels
            this.decay = 1.2; // trauma decay rate per sec
            this.offsetX = 0;
            this.offsetY = 0;
            this.angle = 0;
        }

        addTrauma(amount) {
            this.trauma = VFXUtils.clamp(this.trauma + amount, 0, 1.0);
        }

        update(dt = 0.016) {
            if (this.trauma <= 0) {
                this.offsetX = 0;
                this.offsetY = 0;
                this.angle = 0;
                return;
            }

            const shake = this.trauma * this.trauma; // quadratic falloff feel
            this.angle = (Math.random() * 2 - 1) * this.maxAngle * shake;
            this.offsetX = (Math.random() * 2 - 1) * this.maxOffset * shake;
            this.offsetY = (Math.random() * 2 - 1) * this.maxOffset * shake;

            this.trauma = Math.max(0, this.trauma - this.decay * dt);
        }

        apply(ctx) {
            if (this.trauma > 0) {
                ctx.save();
                ctx.translate(this.offsetX, this.offsetY);
                ctx.rotate(this.angle);
            }
        }

        restore(ctx) {
            if (this.trauma > 0) {
                ctx.restore();
            }
        }
    }

    /**
     * Floating Combat Popups (+100, CRITICAL, DOUBLE KILL!)
     */
    class FloatingTextSystem {
        constructor() {
            this.popups = [];
        }

        spawnText(x, y, text, colorHex = VFXUtils.PALETTE.electricGold, style = 'score') {
            let scale = 1.0;
            let vy = -1.8;
            let maxLife = 0.8;

            if (style === 'critical') {
                scale = 1.4;
                vy = -2.4;
                maxLife = 1.0;
            } else if (style === 'combo') {
                scale = 1.2;
                vy = -2.0;
                maxLife = 1.1;
            }

            this.popups.push({
                x,
                y,
                vy,
                text,
                color: colorHex,
                style,
                scale,
                life: maxLife,
                maxLife,
                alpha: 1.0
            });
        }

        update(dt = 0.016) {
            for (let i = this.popups.length - 1; i >= 0; i--) {
                const pop = this.popups[i];
                pop.life -= dt;
                if (pop.life <= 0) {
                    this.popups.splice(i, 1);
                    continue;
                }
                pop.y += pop.vy * dt * 60;
                pop.vy *= 0.96; // deceleration
                const progress = 1 - (pop.life / pop.maxLife);
                pop.alpha = VFXUtils.clamp(1 - progress * progress, 0, 1);
            }
        }

        draw(ctx) {
            ctx.save();
            for (const pop of this.popups) {
                ctx.save();
                ctx.translate(pop.x, pop.y);

                const popScale = pop.scale * (1 + (1 - pop.life / pop.maxLife) * 0.2);
                ctx.scale(popScale, popScale);

                ctx.font = pop.style === 'critical' ? '900 18px "Press Start 2P", "Orbitron", sans-serif' : '700 14px "Orbitron", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Neon Outline Glow
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.globalAlpha = pop.alpha * 0.8;
                ctx.strokeText(pop.text, 0, 0);

                ctx.shadowColor = pop.color;
                ctx.shadowBlur = 12;
                ctx.fillStyle = pop.color;
                ctx.globalAlpha = pop.alpha;
                ctx.fillText(pop.text, 0, 0);

                ctx.restore();
            }
            ctx.restore();
        }

        clear() {
            this.popups.length = 0;
        }
    }

    // Export module
    const GalagaVFX = {
        VFXUtils,
        ParticleSystem,
        ScreenShake,
        FloatingTextSystem
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GalagaVFX;
    } else {
        global.GalagaVFX = GalagaVFX;
    }

})(typeof window !== 'undefined' ? window : this);
