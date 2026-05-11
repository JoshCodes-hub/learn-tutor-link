// Synthesized ambient soundscapes via Web Audio API.
// No external files, no APIs — just math + noise. Plays softly under TTS.

export type AmbientPreset = "off" | "lofi" | "rain" | "ocean" | "white" | "forest";

const labels: Record<AmbientPreset, string> = {
  off: "Off",
  lofi: "Lo-Fi",
  rain: "Rain",
  ocean: "Ocean",
  white: "Focus",
  forest: "Forest",
};

export const AMBIENT_LIST: { id: AmbientPreset; label: string; emoji: string }[] = [
  { id: "off", label: labels.off, emoji: "🔇" },
  { id: "lofi", label: labels.lofi, emoji: "🎧" },
  { id: "rain", label: labels.rain, emoji: "🌧️" },
  { id: "ocean", label: labels.ocean, emoji: "🌊" },
  { id: "white", label: labels.white, emoji: "🧘" },
  { id: "forest", label: labels.forest, emoji: "🌿" },
];

function makeNoiseBuffer(ctx: AudioContext, type: "white" | "brown" | "pink", seconds = 2) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let lastOut = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    if (type === "white") data[i] = w;
    else if (type === "brown") {
      data[i] = (lastOut + 0.02 * w) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    } else { // pink
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    }
  }
  return buf;
}

export class AmbientPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private current: AmbientPreset = "off";
  private volume = 0.25;

  private ensureCtx() {
    if (!this.ctx) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private cleanup() {
    this.nodes.forEach((n) => { try { (n as any).stop?.(0); } catch {} try { n.disconnect(); } catch {} });
    this.nodes = [];
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.linearRampToValueAtTime(this.volume, (this.ctx!.currentTime) + 0.2);
  }

  getVolume() { return this.volume; }
  getPreset() { return this.current; }

  play(preset: AmbientPreset) {
    if (preset === this.current && preset !== "off") return;
    this.current = preset;
    this.cleanup();
    if (preset === "off") return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;

    // Common: noise source
    const noiseType: "white" | "brown" | "pink" =
      preset === "white" ? "white" : preset === "lofi" ? "pink" : "brown";
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, noiseType, 3);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2); // gentle fade-in

    if (preset === "rain") {
      filter.type = "highpass"; filter.frequency.value = 600; filter.Q.value = 0.4;
      const shelf = ctx.createBiquadFilter();
      shelf.type = "lowpass"; shelf.frequency.value = 4500;
      src.connect(filter); filter.connect(shelf); shelf.connect(gain);
      this.nodes.push(src, filter, shelf, gain);
    } else if (preset === "ocean") {
      filter.type = "lowpass"; filter.frequency.value = 900;
      // Slow LFO for "wave" volume swell
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.6;
      const swell = ctx.createGain(); swell.gain.value = 0.4;
      lfo.connect(lfoGain); lfoGain.connect(swell.gain);
      src.connect(filter); filter.connect(swell); swell.connect(gain);
      lfo.start();
      this.nodes.push(src, filter, swell, gain, lfo, lfoGain);
    } else if (preset === "forest") {
      filter.type = "bandpass"; filter.frequency.value = 1800; filter.Q.value = 0.6;
      const shelf = ctx.createBiquadFilter();
      shelf.type = "highpass"; shelf.frequency.value = 400;
      src.connect(shelf); shelf.connect(filter); filter.connect(gain);
      this.nodes.push(src, filter, shelf, gain);
    } else if (preset === "white") {
      filter.type = "lowpass"; filter.frequency.value = 5000;
      src.connect(filter); filter.connect(gain);
      this.nodes.push(src, filter, gain);
    } else if (preset === "lofi") {
      // Pink noise vinyl bed + slow chord pad
      filter.type = "lowpass"; filter.frequency.value = 1200;
      const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.45;
      src.connect(filter); filter.connect(noiseGain); noiseGain.connect(gain);
      this.nodes.push(src, filter, noiseGain);

      // Soft 3-note pad (Cmaj7-ish): C3, E3, G3 sine waves
      const pad = ctx.createGain(); pad.gain.value = 0.18;
      pad.connect(gain);
      const freqs = [130.81, 164.81, 196.0, 246.94];
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.1;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain); lfoGain.connect(pad.gain);
      lfo.start();
      freqs.forEach((f) => {
        const o = ctx.createOscillator();
        o.type = "sine"; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = 0.25;
        o.connect(g); g.connect(pad);
        o.start();
        this.nodes.push(o, g);
      });
      this.nodes.push(pad, lfo, lfoGain);
    }

    src.start();
    gain.connect(this.master);
  }

  stop() {
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      setTimeout(() => { this.cleanup(); if (this.master && this.ctx) this.master.gain.value = this.volume; }, 350);
    } else this.cleanup();
    this.current = "off";
  }

  destroy() {
    this.cleanup();
    try { this.ctx?.close(); } catch {}
    this.ctx = null; this.master = null;
  }
}
