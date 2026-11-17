import { GameSettings, WeaponId } from '../game/GameConfig';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private ambientStarted = false;
  private settings: GameSettings;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(settings: GameSettings) {
    this.settings = { ...settings };
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.applySettings(this.settings);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    if (this.ctx && !this.ambientStarted) {
      this.startAmbientAirport();
    }
  }

  public applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const master = settings.muted ? 0 : settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.03);
    this.musicGain.gain.setTargetAtTime(settings.musicVolume, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, now, 0.03);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private startAmbientAirport(): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    this.ambientStarted = true;

    // Low eerie terminal HVAC / wind bed
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 180;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.16;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start();

    // Subtle dark atmospheric drone
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;

    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 120;

    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.07;

    osc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.musicGain);
    osc.start();

    this.ambientNodes.push(noise, osc);
  }

  public playGunshot(weapon: WeaponId): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Noise burst
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';

    const gain = this.ctx.createGain();

    if (weapon === 'pistol') {
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.12);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.15);
      this.playPunchTone(180, 55, 0.08, 0.3);
    } else if (weapon === 'rifle') {
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.14);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.16);
      this.playPunchTone(220, 65, 0.07, 0.28);
    } else {
      // Shotgun heavy boom
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.34);
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.38);
      this.playPunchTone(130, 36, 0.22, 0.55);
    }
  }

  private playPunchTone(startFreq: number, endFreq: number, dur: number, vol: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  public playReload(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.scheduleClick(now, 540, 0.06, 0.18);
    this.scheduleClick(now + 0.24, 780, 0.05, 0.22);
  }

  public playDryFire(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.scheduleClick(this.ctx.currentTime, 980, 0.03, 0.14);
  }

  private scheduleClick(time: number, freq: number, dur: number, vol: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, time + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  public playHitMarker(crit: boolean): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(crit ? 1550 : 1080, now);
    osc.frequency.exponentialRampToValueAtTime(crit ? 920 : 620, now + 0.055);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(crit ? 0.28 : 0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playFootstep(sprint: boolean): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = sprint ? 420 : 280;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(sprint ? 0.13 : 0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.08);
  }

  public playZombieGrowl(isScreamer = false, isBrute = false): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = isScreamer ? 'sawtooth' : 'triangle';

    if (isScreamer) {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(860, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.55);
    } else if (isBrute) {
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.exponentialRampToValueAtTime(54, now + 0.45);
    } else {
      osc.frequency.setValueAtTime(145 + Math.random() * 35, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.32);
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isScreamer ? 1100 : 320;

    const g = this.ctx.createGain();
    const dur = isScreamer ? 0.58 : 0.36;
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(isScreamer ? 0.25 : 0.15, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  public playPlayerHurt(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playPunchTone(140, 42, 0.2, 0.45);
  }

  public playExplosion(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.75);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.9, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.82);

    this.playPunchTone(110, 28, 0.48, 0.7);
  }

  public playPickup(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.scheduleClick(now, 660, 0.06, 0.16);
    this.scheduleClick(now + 0.07, 990, 0.08, 0.18);
  }

  public playWaveStart(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [220, 277.18, 329.63];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      const t = now + idx * 0.11;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playWaveComplete(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [329.63, 440, 554.37];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      const t = now + idx * 0.09;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  public playGameOver(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [246.94, 220, 185, 146.83];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      const g = this.ctx.createGain();
      const t = now + idx * 0.18;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  public dispose(): void {
    this.ambientNodes.forEach((n) => {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch {
        // ignore
      }
    });
    this.ambientNodes = [];
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
