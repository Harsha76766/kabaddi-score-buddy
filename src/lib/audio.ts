class MatchAudio {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    setMuted(muted: boolean) {
        this.isMuted = muted;
    }

    private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
        if (!this.ctx || this.isMuted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playTick() {
        this.playTone(880, 0.1, 'sine', 0.05);
    }

    playWarning() {
        this.playTone(440, 0.2, 'square', 0.05);
    }

    playBuzzer() {
        this.playTone(100, 1.0, 'sawtooth', 0.1);
    }

    playSuccess() {
        this.playTone(1200, 0.1, 'sine', 0.1);
        setTimeout(() => this.playTone(1500, 0.2, 'sine', 0.1), 100);
    }

    playRaidStart() {
        this.playTone(660, 0.1, 'sine', 0.1);
        setTimeout(() => this.playTone(880, 0.15, 'sine', 0.1), 50);
    }

    playDODBuzzer() {
        // Sharp multiple tones for DOD alert
        this.playTone(150, 0.3, 'sawtooth', 0.15);
        setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.15), 400);
        setTimeout(() => this.playTone(150, 0.6, 'sawtooth', 0.2), 800);
    }
}

export const matchAudio = new MatchAudio();
