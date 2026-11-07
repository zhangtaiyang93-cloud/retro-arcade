// One licensed, human-composed recording; Web Audio is used only for short SFX.
import { SOUNDTRACK } from './music';
export type MusicCue = 'intro' | 'hall' | 'game' | 'complete' | 'closing' | 'owner';
export type SoundCue = 'ui' | 'door' | 'ticket' | 'prize' | 'deny' | 'clock' | 'shutter' | 'key';
export const SOUND_KEY = 'retro_arcade_sound_v1';
export function effectsEnabled() {
  if (typeof window === 'undefined') return false;
  try { return JSON.parse(localStorage.getItem(SOUND_KEY) || '{}').effects !== false; } catch { return true; }
}
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const musicLevels: Record<MusicCue, number> = { intro: .20, hall: .22, game: .13, complete: .18, closing: .12, owner: .18 };
class ChipAudio {
  private ctx: AudioContext | null = null;
  private effectsBus: GainNode | null = null;
  private recording: HTMLAudioElement | null = null;
  private cue: MusicCue = 'intro';
  private music = true;
  private effects = true;
  private active = false;
  private pendingPlay = false;
  private fade: ReturnType<typeof setInterval> | null = null;
  private fadeTarget = -1;
  private voices = new Set<AudioScheduledSourceNode>();

  attachMusic(element: HTMLAudioElement | null) {
    if (element === this.recording) return;
    this.clearFade(); this.recording?.pause();
    this.recording = element;
    if (element) { element.volume = 0; element.loop = true; this.syncMusic(); }
  }
  async unlock() {
    if (typeof window === 'undefined') return;
    this.active = true;
    // Call HTMLMediaElement.play within the gesture, before awaiting AudioContext.
    this.syncMusic();
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.effectsBus = this.ctx.createGain();
        this.effectsBus.gain.value = this.effects ? .065 : 0;
        this.effectsBus.connect(this.ctx.destination);
      }
      await this.ctx.resume();
      if (!this.active) await this.ctx.suspend();
    } catch { /* A blocked SFX context never interrupts the recording or game. */ }
  }
  settings(music: boolean, effects: boolean) {
    this.music = music; this.effects = effects;
    if (this.effectsBus && this.ctx) this.effectsBus.gain.setTargetAtTime(effects ? .065 : 0, this.ctx.currentTime, .025);
    if (!effects) this.stopVoices();
    this.syncMusic();
  }
  play(cue: MusicCue) {
    this.cue = cue;
    // Route/scene changes adjust the mix, never restart or layer recordings.
    this.syncMusic();
  }
  private allowed() { return this.active && this.music && !document.hidden; }
  private syncMusic() {
    const element = this.recording;
    if (!element) return;
    const allowed = this.allowed();
    element.muted = !allowed;
    if (!allowed) { this.clearFade(); element.pause(); return; }
    this.fadeTo(musicLevels[this.cue]);
    if (element.paused && !this.pendingPlay) {
      this.pendingPlay = true;
      try {
        void element.play().catch(() => { /* The next gesture can retry. */ }).finally(() => {
          this.pendingPlay = false;
          if (this.recording !== element || !this.allowed()) element.pause();
        });
      } catch { this.pendingPlay = false; }
    }
  }
  private clearFade() { if (this.fade !== null) clearInterval(this.fade); this.fade = null; this.fadeTarget = -1; }
  private fadeTo(target: number) {
    const element = this.recording!;
    if (this.fadeTarget === target || Math.abs(element.volume - target) < .001) return;
    this.clearFade(); this.fadeTarget = target;
    const start = element.volume; let step = 0;
    this.fade = setInterval(() => {
      if (this.recording !== element) { this.clearFade(); return; }
      step++; element.volume = start + (target - start) * Math.min(1, step / 12);
      if (step >= 12) this.clearFade();
    }, 40);
  }
  private stopVoices() { this.voices.forEach(v => { try { v.stop(); } catch { /* Already ended. */ } }); this.voices.clear(); }
  private tone(note: number, at: number, duration: number, type: OscillatorType, volume: number, bus: GainNode) {
    const ctx = this.ctx!; const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(hz(note), at);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .005); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain); gain.connect(bus);
    this.voices.add(osc); osc.onended = () => { osc.disconnect(); gain.disconnect(); this.voices.delete(osc); };
    osc.start(at); osc.stop(at + duration + .01);
  }
  effect(cue: SoundCue) {
    if (!this.active || !this.ctx || this.ctx.state !== 'running' || !this.effects || !effectsEnabled() || !this.effectsBus) return;
    const patterns: Record<SoundCue, number[]> = { ui: [76], door: [48,55,60], ticket: [84,91], prize: [72,76,79,84], deny: [43,39], clock: [88,76], shutter: [55,48,40,28], key: [79,84,88,91,96] };
    patterns[cue].forEach((note,i) => this.tone(note,this.ctx!.currentTime + i*.075,.09,cue === 'shutter' ? 'triangle' : 'square',.24,this.effectsBus!));
  }
  suspend() {
    this.active = false; this.syncMusic(); this.stopVoices();
    void this.ctx?.suspend().catch(()=>{});
  }
}
export const chipAudio = new ChipAudio();
export { SOUNDTRACK };
