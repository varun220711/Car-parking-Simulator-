import { GearMode } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private engineEnabled = true;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineActive = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public setConfig(sfxEnabled: boolean, engineEnabled: boolean) {
    this.sfxEnabled = sfxEnabled;
    this.engineEnabled = engineEnabled;
    if (!engineEnabled && this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public startEngine() {
    const ctx = this.ensureContext();
    if (!ctx || this.engineActive) return;

    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 54;

    subOsc.type = 'triangle';
    subOsc.frequency.value = 27;

    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 1.5;

    gain.gain.value = 0;

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    subOsc.start();

    this.engineOsc = osc;
    this.engineSubOsc = subOsc;
    this.engineFilter = filter;
    this.engineGain = gain;
    this.engineActive = true;
  }

  public updateEngine(speedRatio: number, throttle: number, active: boolean) {
    if (!this.engineActive || !this.ctx || !this.engineGain || !this.engineOsc || !this.engineSubOsc || !this.engineFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || !this.engineEnabled) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
      return;
    }
    const clampedSpeed = Math.min(1, Math.max(0, speedRatio));
    const baseFreq = 48 + clampedSpeed * 68 + throttle * 16;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(170 + clampedSpeed * 260 + throttle * 120, now, 0.06);
    this.engineGain.gain.setTargetAtTime(0.028 + clampedSpeed * 0.025 + throttle * 0.015, now, 0.08);
  }

  public stopEngine() {
    if (!this.engineActive) return;
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.engineOsc?.disconnect();
      this.engineSubOsc?.disconnect();
      this.engineFilter?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // Ignore already stopped oscillators
    }
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.engineActive = false;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delay = 0
  ) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  public playUiClick() {
    this.playTone(540, 740, 0.065, 'triangle', 0.12);
  }

  public playUiBack() {
    this.playTone(440, 300, 0.075, 'triangle', 0.11);
  }

  public playGearShift(gear: GearMode) {
    if (gear === 'D') {
      this.playTone(280, 420, 0.07, 'square', 0.08);
    } else {
      this.playTone(360, 240, 0.08, 'square', 0.08);
      this.playTone(880, 880, 0.06, 'sine', 0.05, 0.06);
    }
  }

  public playCoinPickup() {
    this.playTone(987.77, 987.77, 0.07, 'sine', 0.14, 0);
    this.playTone(1318.51, 1318.51, 0.16, 'sine', 0.15, 0.065);
  }

  public playBump(intensity = 1) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const vol = Math.min(0.24, 0.12 + intensity * 0.1);
    this.playTone(140, 46, 0.16, 'triangle', vol);
    this.playTone(95, 38, 0.19, 'sawtooth', vol * 0.45);
  }

  public playPurchaseSuccess() {
    this.playTone(523.25, 523.25, 0.08, 'triangle', 0.14, 0);
    this.playTone(659.25, 659.25, 0.08, 'triangle', 0.14, 0.08);
    this.playTone(783.99, 783.99, 0.09, 'triangle', 0.15, 0.16);
    this.playTone(1046.5, 1046.5, 0.22, 'triangle', 0.16, 0.24);
  }

  public playErrorBuzz() {
    this.playTone(190, 145, 0.14, 'sawtooth', 0.09);
  }

  public playBayLockTick() {
    this.playTone(620, 680, 0.05, 'sine', 0.06);
  }

  public playLevelWin(stars: number) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.18, 'triangle', 0.14, idx * 0.085);
    });
    for (let s = 0; s < stars; s++) {
      this.playTone(880 + s * 160, 1040 + s * 160, 0.12, 'sine', 0.1, 0.42 + s * 0.13);
    }
  }

  public playLevelFail() {
    this.playTone(330, 260, 0.16, 'sawtooth', 0.1, 0);
    this.playTone(240, 160, 0.24, 'sawtooth', 0.1, 0.14);
  }
}

export const soundEngine = new SoundEngine();
