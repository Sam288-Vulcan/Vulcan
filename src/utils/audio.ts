/**
 * Web Audio API synthesizer for the rest timer audio polish:
 * 1. Subtle, continuous 'tick' sound on each second countdown.
 * 2. 'Whoosh' sound when the timer is paused or stopped.
 * 3. Distinct, loud 'beep' sound when the timer reaches zero.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    return null;
  }
}

/**
 * 1. Subtle, continuous 'tick' sound played while timer is actively counting down
 */
export function playTimerTick() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // High crisp frequency with fast exponential drop
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

    // Subtle gain (non-intrusive tick)
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {
    // Audio context may not be allowed before first user gesture
  }
}

/**
 * 2. 'Whoosh' sound when user manually pauses or stops the timer
 */
export function playTimerWhoosh() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // Create a burst of white noise filtered with a downward sweeping bandpass filter
    const bufferSize = ctx.sampleRate * 0.28; // ~280ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to sweep from high to low to create the classic 'whoosh'
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.5, now);
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.28);
  } catch (e) {
    // Graceful fallback: sweep oscillator if buffer creation errors
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch (_) {}
  }
}

/**
 * 3. Distinct, loud 'beep' sound when timer reaches zero (00:00)
 */
export function playTimerBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Play two punchy high-gain alert chimes in rapid succession
    const tones = [
      { freq: 880, start: 0, duration: 0.18 },
      { freq: 1175, start: 0.22, duration: 0.38 },
    ];

    tones.forEach((tone) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square'; // Richer harmonics for piercing gym clarity
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);

      gain.gain.setValueAtTime(0, now + tone.start);
      gain.gain.linearRampToValueAtTime(0.35, now + tone.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.start + tone.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.duration);
    });
  } catch (err) {
    console.warn('Audio context error on beep', err);
  }
}
