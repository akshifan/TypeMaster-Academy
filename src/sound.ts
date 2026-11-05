let context: AudioContext | undefined;
export function playKey(profile: string, volume: number, key: string) {
  if (profile === "Silent Keyboard" || volume <= 0) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime,
      deep = key === "Space" || key === "Enter" || key === " ";
    const master = context.createGain();
    master.gain.setValueAtTime(Math.min(1, volume * 1.8), now);
    master.connect(context.destination);
    const osc = context.createOscillator(),
      tone = context.createGain();
    osc.type =
      profile === "Typewriter"
        ? "sawtooth"
        : profile === "Blue Switch"
          ? "square"
          : "triangle";
    const base =
      profile === "Blue Switch"
        ? deep
          ? 210
          : 1080
        : profile === "Typewriter"
          ? deep
            ? 130
            : 620
          : profile === "Red Switch"
            ? deep
              ? 150
              : 390
            : deep
              ? 170
              : 570;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(70, base * 0.72),
      now + 0.035,
    );
    tone.gain.setValueAtTime(profile === "Blue Switch" ? 0.18 : 0.24, now);
    tone.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(tone);
    tone.connect(master);
    osc.start(now);
    osc.stop(now + 0.1);
    if (profile === "Brown Switch" || profile === "Blue Switch") {
      const click = context.createBufferSource(),
        buffer = context.createBuffer(
          1,
          Math.ceil(context.sampleRate * 0.018),
          context.sampleRate,
        ),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const filter = context.createBiquadFilter(),
        noiseGain = context.createGain();
      click.buffer = buffer;
      filter.type = "highpass";
      filter.frequency.value = profile === "Blue Switch" ? 1400 : 850;
      noiseGain.gain.setValueAtTime(
        profile === "Blue Switch" ? 0.13 : 0.08,
        now,
      );
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
      click.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      click.start(now);
    }
  } catch {
    /* Web Audio unavailable */
  }
}
