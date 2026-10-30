// Original sound effects synthesized with the Web Audio API. Nothing plays until a user gesture calls unlock().

export type SoundName = 'particle' | 'core' | 'caught' | 'hit' | 'blink' | 'go' | 'levelClear' | 'victory' | 'gameOver';

export class SynthAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private particleStep = 0;
  private lastParticleAt = 0;

  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.context) {
      const Context = window.AudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  close() {
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  play(name: SoundName) {
    if (!this.context || this.muted) return;
    switch (name) {
      case 'particle': {
        const now = this.context.currentTime;
        if (now - this.lastParticleAt < 0.05) return;
        this.lastParticleAt = now;
        this.particleStep = (this.particleStep + 1) % 4;
        this.tone([520, 620, 780, 620][this.particleStep], 0, 0.05, 'triangle', 0.12);
        break;
      }
      case 'core':
        this.tone(160, 0, 0.45, 'sawtooth', 0.2, 1400);
        this.tone(320, 0.05, 0.4, 'square', 0.08, 2000);
        break;
      case 'caught':
        [520, 780, 1170].forEach((freq, i) => this.tone(freq, i * 0.05, 0.09, 'square', 0.13));
        break;
      case 'hit':
        this.tone(620, 0, 0.5, 'sawtooth', 0.22, 60);
        this.tone(90, 0.05, 0.4, 'square', 0.14, 40);
        break;
      case 'blink':
        this.tone(1800, 0, 0.1, 'square', 0.06, 300);
        break;
      case 'go':
        this.tone(440, 0, 0.1, 'square', 0.12);
        this.tone(880, 0.1, 0.18, 'square', 0.12);
        break;
      case 'levelClear':
        [392, 494, 587, 784].forEach((freq, i) => this.tone(freq, i * 0.09, 0.16, 'triangle', 0.2));
        break;
      case 'victory':
        [392, 494, 587, 784, 587, 784, 988, 1175].forEach((freq, i) => this.tone(freq, i * 0.1, 0.2, 'square', 0.13));
        break;
      case 'gameOver':
        [392, 330, 262, 196, 131].forEach((freq, i) => this.tone(freq, i * 0.16, 0.26, 'sawtooth', 0.15, freq * 0.8));
        break;
    }
  }

  private tone(freq: number, delay: number, duration: number, type: OscillatorType, volume: number, slideTo?: number) {
    if (!this.context || !this.master) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}
