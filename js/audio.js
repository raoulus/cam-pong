let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
}

function createNode(setupFn) {
  ensureAudio();
  return setupFn(audioCtx);
}

export function playTone(freq, duration, type = 'square', volume = 0.15, pan = 0) {
  createNode((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    panner.pan.value = pan;
    osc.connect(gain).connect(panner).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  });
}

export function playNoise(duration, volume = 0.08, pan = 0) {
  createNode((ctx) => {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    panner.pan.value = pan;
    source.connect(gain).connect(panner).connect(ctx.destination);
    source.start();
  });
}

export function playRiserTone(startFreq, endFreq, duration, type = 'sawtooth', volume = 0.06) {
  createNode((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  });
}

export function sfxPaddleHit(intensity, side) {
  const pan = side === 'left' ? -0.6 : 0.6;
  const freq = 350 + intensity * 40;
  playTone(freq, 0.1, 'square', 0.1, pan);
  playTone(freq * 1.5, 0.06, 'sine', 0.06, pan);
  playTone(freq * 2, 0.03, 'sine', 0.03, pan);
  playNoise(0.04, 0.05, pan);
}

export function sfxWallBounce(y, canvasH) {
  const freq = 200 + (1 - y / canvasH) * 200;
  playTone(freq, 0.06, 'triangle', 0.05);
  playNoise(0.02, 0.02);
}

export function sfxScore(side) {
  const pan = side === 'left' ? -0.8 : 0.8;
  playTone(400, 0.15, 'sawtooth', 0.15, pan);
  setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.18, pan), 80);
  setTimeout(() => playTone(80, 0.5, 'sawtooth', 0.15, pan), 180);
  setTimeout(() => playTone(40, 0.6, 'sine', 0.12), 300);
  playNoise(0.6, 0.08, pan);
}

export function sfxCountdown(num) {
  if (num > 0) {
    playTone(660, 0.12, 'square', 0.1);
    playTone(660, 0.08, 'sine', 0.05);
  } else {
    playTone(880, 0.1, 'square', 0.14);
    playTone(1320, 0.2, 'sine', 0.1);
    playTone(1760, 0.15, 'sine', 0.06);
    playNoise(0.1, 0.04);
  }
}

export function sfxWin(side) {
  const pan = side === 'left' ? -0.4 : 0.4;
  const melody = [523, 659, 784, 880, 1047, 1319, 1568, 2093];
  melody.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.35, 'square', 0.08, pan * (1 - i / melody.length));
      playTone(freq * 0.5, 0.35, 'sine', 0.05);
      playTone(freq * 0.25, 0.2, 'triangle', 0.03);
    }, i * 90);
  });
  setTimeout(() => {
    playTone(523, 1.0, 'sine', 0.06);
    playTone(659, 1.0, 'sine', 0.06);
    playTone(784, 1.0, 'sine', 0.06);
    playTone(1047, 1.0, 'sine', 0.04);
    playNoise(0.8, 0.03);
  }, melody.length * 90);
}

export function sfxRally(hitCount) {
  if (hitCount > 3) {
    const freq = 80 + hitCount * 20;
    playTone(freq, 0.2, 'sine', Math.min(0.06, hitCount * 0.006));
    if (hitCount % 5 === 0) {
      playTone(880, 0.1, 'square', 0.08);
      setTimeout(() => playTone(1100, 0.15, 'square', 0.08), 60);
      playNoise(0.1, 0.04);
    }
  }
}

export function sfxPowerUp() {
  playRiserTone(200, 1200, 0.4, 'sawtooth', 0.08);
  setTimeout(() => playTone(1200, 0.2, 'square', 0.1), 350);
  setTimeout(() => playNoise(0.15, 0.05), 400);
}

export function sfxComboBreaker() {
  playTone(150, 0.5, 'sawtooth', 0.12);
  playTone(100, 0.3, 'square', 0.08);
  playNoise(0.3, 0.08);
}

export function sfxFirework() {
  playTone(800 + Math.random() * 800, 0.15, 'sine', 0.04);
  playNoise(0.2, 0.03);
}

export function sfxMultiBall() {
  // Dramatic split sound
  playTone(600, 0.15, 'sawtooth', 0.12);
  setTimeout(() => {
    playTone(900, 0.1, 'square', 0.1);
    playTone(1200, 0.1, 'square', 0.08);
  }, 100);
  setTimeout(() => {
    playTone(1500, 0.15, 'sine', 0.08);
    playNoise(0.2, 0.06);
  }, 180);
}

export function sfxChaosEvent() {
  playTone(400, 0.1, 'sawtooth', 0.08);
  playTone(800, 0.08, 'square', 0.06);
  playNoise(0.08, 0.04);
}

export function sfxGravityShift() {
  playRiserTone(100, 400, 0.3, 'sine', 0.06);
  playTone(200, 0.2, 'triangle', 0.05);
}
