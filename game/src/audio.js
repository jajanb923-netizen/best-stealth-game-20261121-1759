// Moonlit Archive — every sound is synthesised in the browser with WebAudio:
// soft footsteps, a warden's alert sting, pickup chimes and a quiet night pad.
// No audio files, no network.
export function createAudio() {
  const audio = {
    context: null,
    master: null,
    muted: false,
    padNodes: null,
    ensure() {
      if (audio.context) {
        if (audio.context.state === 'suspended') audio.context.resume().catch(() => {});
        return;
      }
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        audio.context = new Ctor();
        audio.master = audio.context.createGain();
        audio.master.gain.value = 0.5;
        audio.master.connect(audio.context.destination);
        audio.startPad();
      } catch {
        audio.context = null;
      }
    },
    setMuted(muted) {
      audio.muted = muted;
      if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
    },
    /** A very quiet detuned pad, the archive breathing at night. */
    startPad() {
      if (!audio.context || audio.padNodes) return;
      const gain = audio.context.createGain();
      gain.gain.value = 0.035;
      gain.connect(audio.master);
      const oscillators = [];
      for (const frequency of [110, 164.8, 220.5]) {
        const osc = audio.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        osc.connect(gain);
        osc.start();
        oscillators.push(osc);
      }
      audio.padNodes = { gain, oscillators };
    },
    tone(frequency, duration, type, volume, when = 0) {
      if (!audio.context || audio.muted) return;
      const now = audio.context.currentTime + when;
      const osc = audio.context.createOscillator();
      const gain = audio.context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    },
    noiseBurst(duration, volume, lowpass) {
      if (!audio.context || audio.muted) return;
      const now = audio.context.currentTime;
      const length = Math.max(1, Math.floor(audio.context.sampleRate * duration));
      const buffer = audio.context.createBuffer(1, length, audio.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
      const source = audio.context.createBufferSource();
      source.buffer = buffer;
      const filter = audio.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = audio.context.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      source.start(now);
    },
    /** One event name from stepWorld, one sound. */
    playEvent(event) {
      if (!audio.context || audio.muted) return;
      if (event === 'step') audio.noiseBurst(0.05, 0.10, 500);
      else if (event === 'step-loud') audio.noiseBurst(0.07, 0.22, 900);
      else if (event === 'pickup') {
        audio.tone(880, 0.16, 'sine', 0.22);
        audio.tone(1318, 0.2, 'sine', 0.16, 0.07);
      } else if (event === 'ledger') {
        audio.tone(523, 0.18, 'triangle', 0.25);
        audio.tone(659, 0.18, 'triangle', 0.25, 0.09);
        audio.tone(784, 0.3, 'triangle', 0.25, 0.18);
      } else if (event === 'alert') {
        audio.tone(196, 0.32, 'sawtooth', 0.2);
        audio.tone(185, 0.32, 'sawtooth', 0.2, 0.02);
        audio.noiseBurst(0.25, 0.12, 1200);
      } else if (event === 'caught') {
        audio.tone(98, 0.5, 'sawtooth', 0.3);
        audio.tone(65, 0.7, 'sine', 0.3, 0.1);
      } else if (event === 'exit') {
        audio.tone(523, 0.2, 'sine', 0.22);
        audio.tone(659, 0.2, 'sine', 0.22, 0.1);
        audio.tone(784, 0.2, 'sine', 0.22, 0.2);
        audio.tone(1046, 0.4, 'sine', 0.22, 0.3);
      } else if (event === 'throw') {
        audio.noiseBurst(0.08, 0.25, 2400);
        audio.tone(1400, 0.08, 'sine', 0.12, 0.12);
      } else if (event === 'win') {
        [523, 659, 784, 1046, 1318].forEach((freq, index) => audio.tone(freq, 0.35, 'triangle', 0.22, index * 0.12));
      }
    },
  };
  return audio;
}
