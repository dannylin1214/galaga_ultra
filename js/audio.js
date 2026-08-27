/**
 * GALAGA ULTRA - Web Audio API Sound Synthesizer & Procedural Synthwave Music Generator
 * High-performance, modular audio engine with zero external audio assets.
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;

        this.isMuted = false;
        this.masterVolume = 0.8;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;

        // Music state
        this.isMusicPlaying = false;
        this.musicInterval = null;
        this.currentStep = 0;
        this.bpm = 124;
        this.musicTempoMs = (60 / this.bpm / 4) * 1000; // 16th note step
        this.musicMode = 'NORMAL'; // 'NORMAL', 'BOSS', 'VICTORY'

        // Scale notes (A minor / Synthwave vibes: A, C, D, E, G, A)
        this.scales = {
            bass: [55.00, 65.41, 73.42, 82.41, 98.00, 110.00], // A1, C2, D2, E2, G2, A2
            lead: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99], // A3 to G5
            bossBass: [41.20, 43.65, 49.00, 55.00], // E1, F1, G1, A1 low dark rumble
        };

        this.isInitialized = false;
    }

    /**
     * Initialize AudioContext on user interaction
     */
    init() {
        if (this.isInitialized && this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            console.warn('Web Audio API is not supported in this browser.');
            return;
        }

        this.ctx = new AudioCtx();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // SFX Gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // Music Gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        this.isInitialized = true;
    }

    ensureContext() {
        if (!this.isInitialized) {
            this.init();
        } else if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMasterVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
        }
    }

    setSFXVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
        }
    }

    setMusicVolume(val) {
        this.musicVolume = Math.max(0, Math.min(1, val));
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.02);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
        }
        return this.isMuted;
    }

    // ==========================================
    // PROCEDURAL RETRO SFX SYNTHESIZERS
    // ==========================================

    /** 1. Player Laser - 經典街機雷射「啾！」Player Laser Shot - Pitch FM Sweep */
    playPlayerLaser() {
        //console.log("playPlayerLaser 被呼叫了");
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        // 高音快速下降，產生街機雷射感
        osc.frequency.setValueAtTime(1100, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.10);

        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.10);
    }

    /** 2. Heavy Plasma Shot - 厚重電漿「嗡咻！」 Heavy Plasma Shot - Sub-bass FM slide + low-pass thump */
    playPlasmaShot() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        // 主體
        const osc = this.ctx.createOscillator();
        //const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.28);

        //filter.type = 'lowpass';
        //filter.frequency.setValueAtTime(1200, t);
        //filter.frequency.exponentialRampToValueAtTime(200, t + 0.25);

        gain.gain.setValueAtTime(0.38, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        //osc.connect(filter);
        //filter.connect(gain);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(t);
        osc.stop(t + 0.28);

        // 第二層低頻，增加厚度
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();

        sub.type = 'square';
        sub.frequency.setValueAtTime(100, t);
        sub.frequency.exponentialRampToValueAtTime(35, t + 0.28);

        subGain.gain.setValueAtTime(0.22, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);

        sub.start(t);
        sub.stop(t + 0.28);
    }

    /** 3. Enemy Explosion - 街機爆炸「啪！轟！」Enemy Explosion - Filtered Noise Sweep + Sub-Rumble */
    playEnemyExplosion(isBoss = false) {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const duration = isBoss ? 0.75 : 0.32;

        // Noise buffer 爆炸主體
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isBoss ? 2200 : 1600, t);
        filter.frequency.exponentialRampToValueAtTime(80, t + duration);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(isBoss ? 0.65 : 0.42, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(t);

        // Extra sub-bass oscillator for heavy rumble
        if (isBoss) {
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'triangle';
            sub.frequency.setValueAtTime(120, t);
            sub.frequency.exponentialRampToValueAtTime(30, t + duration);

            subGain.gain.setValueAtTime(0.7, t);
            subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            sub.connect(subGain);
            subGain.connect(this.sfxGain);

            sub.start(t);
            sub.stop(t + duration);
        }
        // ==================================
        // 低頻爆炸「轟」
        // ==================================

        const boom = this.ctx.createOscillator();
        const boomGain = this.ctx.createGain();

        boom.type = 'sine';

        boom.frequency.setValueAtTime(
            isBoss ? 130 : 180,
            t
        );

        boom.frequency.exponentialRampToValueAtTime(
            35,
            t + duration
        );

        boomGain.gain.setValueAtTime(
            isBoss ? 0.65 : 0.38,
            t
        );

        boomGain.gain.exponentialRampToValueAtTime(
            0.001,
            t + duration
        );

        boom.connect(boomGain);
        boomGain.connect(this.sfxGain);

        boom.start(t);
        boom.stop(t + duration);
    }
    // ==========================================
    // BOSS 專用音效
    // ==========================================

    // Cyber Dreadnought：巨大機械戰艦爆炸
    playCyberDreadnoughtExplosion() {
        if (!this.isInitialized || this.isMuted) return;

        this.ensureContext();
        const t = this.ctx.currentTime;

        // 第一層：低沉機械轟鳴
        const boom = this.ctx.createOscillator();
        const boomGain = this.ctx.createGain();

        boom.type = 'sawtooth';
        boom.frequency.setValueAtTime(180, t);
        boom.frequency.exponentialRampToValueAtTime(28, t + 1.2);

        boomGain.gain.setValueAtTime(0.75, t);
        boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        boom.connect(boomGain);
        boomGain.connect(this.sfxGain);

        boom.start(t);
        boom.stop(t + 1.2);

        // 第二層：巨大爆炸噪音
        const bufferSize = Math.floor(this.ctx.sampleRate * 1.0);
        const buffer = this.ctx.createBuffer(
            1,
            bufferSize,
            this.ctx.sampleRate
        );

        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, t);
        filter.frequency.exponentialRampToValueAtTime(70, t + 1.0);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.9, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(t);

        // 第三層：機械核心爆裂
        const core = this.ctx.createOscillator();
        const coreGain = this.ctx.createGain();

        core.type = 'square';
        core.frequency.setValueAtTime(420, t);
        core.frequency.exponentialRampToValueAtTime(45, t + 0.55);

        coreGain.gain.setValueAtTime(0.55, t);
        coreGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

        core.connect(coreGain);
        coreGain.connect(this.sfxGain);

        core.start(t);
        core.stop(t + 0.55);

        console.log("★★★ Cyber Dreadnought BIG Explosion Sound");
    }


    // Hive Empress：生物母艦爆炸
    playHiveEmpressExplosion() {
        if (!this.isInitialized || this.isMuted) return;

        this.ensureContext();
        const t = this.ctx.currentTime;

        // 第一層：尖銳能量爆裂
        const scream = this.ctx.createOscillator();
        const screamGain = this.ctx.createGain();

        scream.type = 'sawtooth';
        scream.frequency.setValueAtTime(950, t);
        scream.frequency.exponentialRampToValueAtTime(120, t + 0.8);

        screamGain.gain.setValueAtTime(0.5, t);
        screamGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        scream.connect(screamGain);
        screamGain.connect(this.sfxGain);

        scream.start(t);
        scream.stop(t + 0.8);

        // 第二層：生物爆炸噪音
        const bufferSize = Math.floor(this.ctx.sampleRate * 1.3);
        const buffer = this.ctx.createBuffer(
            1,
            bufferSize,
            this.ctx.sampleRate
        );

        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] =
                (Math.random() * 2 - 1) *
                Math.pow(1 - i / bufferSize, 0.7);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, t);
        filter.frequency.exponentialRampToValueAtTime(120, t + 1.2);
        filter.Q.value = 0.7;

        const noiseGain = this.ctx.createGain();

        noiseGain.gain.setValueAtTime(0.85, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(t);

        // 第三層：低頻生物核心爆裂
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();

        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, t);
        sub.frequency.exponentialRampToValueAtTime(25, t + 1.3);

        subGain.gain.setValueAtTime(0.8, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);

        sub.start(t);
        sub.stop(t + 1.3);

        console.log("★★★ Hive Empress BIG Explosion Sound");
    }
    /** Cyber Dreadnought 被擊中：機械低沉金屬撞擊 */
    playCyberDreadnoughtHit() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;

        // 低頻主體
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(65, t + 0.16);

        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.18);

        // 金屬高頻撞擊
        const metal = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();

        metal.type = 'square';
        metal.frequency.setValueAtTime(900, t);
        metal.frequency.exponentialRampToValueAtTime(300, t + 0.08);

        metalGain.gain.setValueAtTime(0.18, t);
        metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

        metal.connect(metalGain);
        metalGain.connect(this.sfxGain);

        metal.start(t);
        metal.stop(t + 0.10);
    }


    /** Cyber Dreadnought 死亡：大型機械爆炸 */
    playCyberDreadnoughtExplosion() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;

        // 第一層：巨大低頻爆炸
        const boom = this.ctx.createOscillator();
        const boomGain = this.ctx.createGain();

        boom.type = 'sine';
        boom.frequency.setValueAtTime(140, t);
        boom.frequency.exponentialRampToValueAtTime(28, t + 1.2);

        boomGain.gain.setValueAtTime(0.9, t);
        boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        boom.connect(boomGain);
        boomGain.connect(this.sfxGain);

        boom.start(t);
        boom.stop(t + 1.2);

        // 第二層：機械爆裂聲
        const metal = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();

        metal.type = 'sawtooth';
        metal.frequency.setValueAtTime(420, t);
        metal.frequency.exponentialRampToValueAtTime(45, t + 0.65);

        metalGain.gain.setValueAtTime(0.55, t);
        metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

        metal.connect(metalGain);
        metalGain.connect(this.sfxGain);

        metal.start(t);
        metal.stop(t + 0.65);

        // 第三層：短促高頻爆裂
        const crack = this.ctx.createOscillator();
        const crackGain = this.ctx.createGain();

        crack.type = 'square';
        crack.frequency.setValueAtTime(1100, t);
        crack.frequency.exponentialRampToValueAtTime(100, t + 0.25);

        crackGain.gain.setValueAtTime(0.30, t);
        crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        crack.connect(crackGain);
        crackGain.connect(this.sfxGain);

        crack.start(t);
        crack.stop(t + 0.25);
    }


    /** Hive Empress 被擊中：生物能量脈衝 */
    playHiveEmpressHit() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);

        gain.gain.setValueAtTime(0.38, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.25);

        // 高頻生物能量脈衝
        const pulse = this.ctx.createOscillator();
        const pulseGain = this.ctx.createGain();

        pulse.type = 'sine';
        pulse.frequency.setValueAtTime(1200, t);
        pulse.frequency.exponentialRampToValueAtTime(350, t + 0.18);

        pulseGain.gain.setValueAtTime(0.22, t);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        pulse.connect(pulseGain);
        pulseGain.connect(this.sfxGain);

        pulse.start(t);
        pulse.stop(t + 0.18);
    }


    /** Hive Empress 死亡：巨大生物能量爆炸 */
    playHiveEmpressExplosion() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;

        // 第一層：巨大低頻能量爆炸
        const boom = this.ctx.createOscillator();
        const boomGain = this.ctx.createGain();

        boom.type = 'sine';
        boom.frequency.setValueAtTime(180, t);
        boom.frequency.exponentialRampToValueAtTime(25, t + 1.4);

        boomGain.gain.setValueAtTime(0.85, t);
        boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

        boom.connect(boomGain);
        boomGain.connect(this.sfxGain);

        boom.start(t);
        boom.stop(t + 1.4);

        // 第二層：能量爆裂
        const energy = this.ctx.createOscillator();
        const energyGain = this.ctx.createGain();

        energy.type = 'sawtooth';
        energy.frequency.setValueAtTime(700, t);
        energy.frequency.exponentialRampToValueAtTime(60, t + 0.8);

        energyGain.gain.setValueAtTime(0.45, t);
        energyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        energy.connect(energyGain);
        energyGain.connect(this.sfxGain);

        energy.start(t);
        energy.stop(t + 0.8);

        // 第三層：高頻能量脈衝
        const pulse = this.ctx.createOscillator();
        const pulseGain = this.ctx.createGain();

        pulse.type = 'triangle';
        pulse.frequency.setValueAtTime(1500, t);
        pulse.frequency.exponentialRampToValueAtTime(180, t + 0.45);

        pulseGain.gain.setValueAtTime(0.35, t);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        pulse.connect(pulseGain);
        pulseGain.connect(this.sfxGain);

        pulse.start(t);
        pulse.stop(t + 0.45);
    }
    /** 4. Boss Laser - 危險的低沉雷射Boss Laser - Aggressive FM Phase Sweep */
    playBossLaser() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;

        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const mainGain = this.ctx.createGain();

        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(520, t);
        carrier.frequency.exponentialRampToValueAtTime(100, t + 0.38);
        // FM 調變
        modulator.type = 'square';
        modulator.frequency.setValueAtTime(55, t);

        modGain.gain.setValueAtTime(180, t);
        modGain.gain.linearRampToValueAtTime(10, t + 0.38);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        mainGain.gain.setValueAtTime(0.35, t);
        mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

        carrier.connect(mainGain);
        mainGain.connect(this.sfxGain);

        modulator.start(t);
        carrier.start(t);
        modulator.stop(t + 0.38);
        carrier.stop(t + 0.38);
    }

    /** 5-1.電子護盾「叮！」Shield Hit - Resonant Bandpass Chirp */
    playShieldHit() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        // 第一個高頻音
        const osc = this.ctx.createOscillator();
        //const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(700, t + 0.08);
        //filter.type = 'bandpass';
        //filter.frequency.setValueAtTime(1000, t);
        //filter.Q.setValueAtTime(8, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        //osc.connect(filter);
        //filter.connect(gain);
        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.16);
        // 第二個金屬回音
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(2200, t + 0.025);
        osc2.frequency.exponentialRampToValueAtTime(900, t + 0.12);

        gain2.gain.setValueAtTime(0.16, t + 0.025);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc2.connect(gain);
        gain2.connect(this.sfxGain);

        osc2.start(t+ 0.025);
        osc2.stop(t + 0.18);
    }

    /** 5-2. 玩家被敵人擊中：短促強烈受擊音 */
    playPlayerHit() {
        if (!this.isInitialized || this.isMuted) return;

        this.ensureContext();
        const t = this.ctx.currentTime;

        // 第一層：低沉撞擊
        const impact = this.ctx.createOscillator();
        const impactGain = this.ctx.createGain();

        impact.type = 'sawtooth';
        impact.frequency.setValueAtTime(220, t);
        impact.frequency.exponentialRampToValueAtTime(55, t + 0.22);

        impactGain.gain.setValueAtTime(0.65, t);
        impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        impact.connect(impactGain);
        impactGain.connect(this.sfxGain);

        impact.start(t);
        impact.stop(t + 0.22);

        // 第二層：短促電子衝擊
        const hit = this.ctx.createOscillator();
        const hitGain = this.ctx.createGain();

        hit.type = 'square';
        hit.frequency.setValueAtTime(900, t);
        hit.frequency.exponentialRampToValueAtTime(180, t + 0.12);

        hitGain.gain.setValueAtTime(0.38, t);
        hitGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        hit.connect(hitGain);
        hitGain.connect(this.sfxGain);

        hit.start(t);
        hit.stop(t + 0.12);

        console.log("★★★ Player HIT Sound");
    }

    /** 6. Powerup - 街機道具上升音階Powerup Pickup - Rapid Ascending Arpeggio */
    playPowerup() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5 → E5 → G5 → C6 → E6 → G6

        notes.forEach((freq, idx) => {
            const noteTime = t + idx * 0.055;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, noteTime);

            gain.gain.setValueAtTime(0.2, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.14);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(noteTime);
            osc.stop(noteTime + 0.14);
        });
    }

    /** 7. EMP Bomb - 巨大低頻脈衝Bomb Pulse - Deep Space Compression Sub-Boom */
    playBombPulse() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        // 第一層：低頻爆發
        const osc = this.ctx.createOscillator();
        //const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(28, t + 0.9);

        //filter.type = 'lowpass';
        //filter.frequency.setValueAtTime(800, t);
        //filter.frequency.exponentialRampToValueAtTime(40, t + 0.8);

        gain.gain.setValueAtTime(0.65, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

        //osc.connect(filter);
        //filter.connect(gain);
        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.9);
        // 第二層：電子脈衝
        const pulse = this.ctx.createOscillator();
        const pulseGain = this.ctx.createGain();

        pulse.type = 'square';
        pulse.frequency.setValueAtTime(700, t);
        pulse.frequency.exponentialRampToValueAtTime(80, t + 0.45);

        pulseGain.gain.setValueAtTime(0.18, t);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        pulse.connect(pulseGain);
        pulseGain.connect(this.sfxGain);

        pulse.start(t);
        pulse.stop(t + 0.45);
    }

    /** 8. Level Win - 經典街機過關旋律Level Win Chime - Fanfare Chords */
    playLevelWin() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;
        const notes = [
            { freq: 523.25, time: 0.00 },
            { freq: 659.25, time: 0.10 },
            { freq: 783.99, time: 0.20 },
            { freq: 1046.50, time: 0.32 },
            { freq: 783.99, time: 0.48 },
            { freq: 1046.50, time: 0.62 }
        ]; // A Major chord: C5 E5 G5 C6

        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, t + note.time);

            gain.gain.setValueAtTime(0.22, t + note.time);
            gain.gain.exponentialRampToValueAtTime(0.001, t + note.time + 0.18);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t + note.time);
            osc.stop(t + note.time + 0.18);
        });
    }

    /** UI Click - Subtle Crisp Tick */
    playButtonClick() {
        if (!this.isInitialized || this.isMuted) return;
        this.ensureContext();
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.045);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.045);
    }

    // ==========================================
    // PROCEDURAL SYNTHWAVE MUSIC GENERATOR
    // ==========================================

    startMusic(mode = 'NORMAL') {
        this.musicMode = mode;
        if (this.isMusicPlaying) return;

        this.ensureContext();
        this.isMusicPlaying = true;
        this.currentStep = 0;

        // Step loop
        this.musicInterval = setInterval(() => {
            this.tickMusicStep();
        }, this.musicTempoMs);
    }

    stopMusic() {
        this.isMusicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    setMusicMode(mode) {
        this.musicMode = mode;
    }

    tickMusicStep() {
        if (!this.isInitialized || this.isMuted || !this.ctx || this.ctx.state !== 'running') return;

        const step = this.currentStep % 16;
        const bar = Math.floor(this.currentStep / 16) % 4;
        const t = this.ctx.currentTime;

        // 1. Synth Kick & Snare Drums
        if (step === 0 || step === 8 || step === 10 || (this.musicMode === 'BOSS' && step === 14)) {
            // Kick drum
            const kick = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kick.type = 'sine';
            kick.frequency.setValueAtTime(130, t);
            kick.frequency.exponentialRampToValueAtTime(35, t + 0.08);

            kickGain.gain.setValueAtTime(0.4, t);
            kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

            kick.connect(kickGain);
            kickGain.connect(this.musicGain);

            kick.start(t);
            kick.stop(t + 0.09);
        }

        if (step === 4 || step === 12) {
            // Snare drum (noise + body)
            const bufSize = this.ctx.sampleRate * 0.1;
            const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

            const snareNoise = this.ctx.createBufferSource();
            snareNoise.buffer = buf;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(800, t);

            const snareGain = this.ctx.createGain();
            snareGain.gain.setValueAtTime(0.2, t);
            snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            snareNoise.connect(filter);
            filter.connect(snareGain);
            snareGain.connect(this.musicGain);

            snareNoise.start(t);
        }

        // Hi-Hat on offbeats
        if (step % 2 === 1) {
            const bufSize = this.ctx.sampleRate * 0.03;
            const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

            const hat = this.ctx.createBufferSource();
            hat.buffer = buf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(5000, t);

            const hatGain = this.ctx.createGain();
            hatGain.gain.setValueAtTime(0.08, t);
            hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

            hat.connect(filter);
            filter.connect(hatGain);
            hatGain.connect(this.musicGain);

            hat.start(t);
        }

        // 2. Bassline (Synthwave Octave Arp)
        if (step % 2 === 0) {
            let scaleIndex = 0;
            if (bar === 1) scaleIndex = 1;
            if (bar === 2) scaleIndex = 2;
            if (bar === 3) scaleIndex = 3;

            let rootFreq = this.scales.bass[scaleIndex % this.scales.bass.length];
            if (this.musicMode === 'BOSS') {
                rootFreq = this.scales.bossBass[step % 4];
            }

            const isOctaveUp = (step % 4 === 2);
            const bassFreq = isOctaveUp ? rootFreq * 2 : rootFreq;

            const bass = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const bassGain = this.ctx.createGain();

            bass.type = this.musicMode === 'BOSS' ? 'sawtooth' : 'square';
            bass.frequency.setValueAtTime(bassFreq, t);

            filter.type = 'lowpass';
            const filterCutoff = this.musicMode === 'BOSS' ? 800 : 500;
            filter.frequency.setValueAtTime(filterCutoff, t);
            filter.frequency.exponentialRampToValueAtTime(100, t + 0.12);

            bassGain.gain.setValueAtTime(0.2, t);
            bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            bass.connect(filter);
            filter.connect(bassGain);
            bassGain.connect(this.musicGain);

            bass.start(t);
            bass.stop(t + 0.12);
        }

        // 3. Synth Arpeggiator Lead
        if (step % 2 === 1 || this.musicMode === 'BOSS') {
            const leadNotes = this.scales.lead;
            const noteIdx = (step * 3 + bar * 2) % leadNotes.length;
            const leadFreq = leadNotes[noteIdx];

            const lead = this.ctx.createOscillator();
            const leadGain = this.ctx.createGain();

            lead.type = 'sawtooth';
            lead.frequency.setValueAtTime(leadFreq, t);

            leadGain.gain.setValueAtTime(0.08, t);
            leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            lead.connect(leadGain);
            leadGain.connect(this.musicGain);

            lead.start(t);
            lead.stop(t + 0.1);
        }

        this.currentStep++;
    }
}

// Global export for non-module compatibility
if (typeof window !== 'undefined') {
    window.AudioEngine = AudioEngine;
    window.GalagaAudio = { AudioSynthesizer: AudioEngine };
    // 建立獨立的音效實體給遊戲使用
    window.GalagaAudioInstance = new AudioEngine();
}
