// Screen-level visual effects

export const screenShake = { x: 0, y: 0, intensity: 0, decay: 0.88 };
export const screenFlash = { alpha: 0, color: '#fff', decay: 0.9 };
export const slowMotion = { factor: 1, duration: 0 };
export const chromatic = { intensity: 0, decay: 0.92 };
export const pulseRing = { x: 0, y: 0, radius: 0, maxRadius: 0, alpha: 0, color: '#fff' };
export let backgroundPulse = 0;
export let hueShift = 0;
export const screenWarp = { angle: 0, intensity: 0, decay: 0.95 }; // rotation warp
export const screenZoom = { scale: 1, target: 1, speed: 0.08 };   // zoom punch

export function setBackgroundPulse(v) { backgroundPulse = v; }

export function triggerShake(intensity = 8) {
  screenShake.intensity = Math.max(screenShake.intensity, intensity);
}

export function triggerFlash(color = '#fff', alpha = 0.3) {
  screenFlash.alpha = alpha;
  screenFlash.color = color;
}

export function triggerSlowMo(factor = 0.3, frames = 15) {
  slowMotion.factor = factor;
  slowMotion.duration = frames;
}

export function triggerChromatic(intensity = 8) {
  chromatic.intensity = intensity;
}

export function triggerPulseRing(x, y, maxR, color) {
  Object.assign(pulseRing, { x, y, radius: 0, maxRadius: maxR, alpha: 1, color });
}

export function triggerWarp(intensity = 0.02) {
  screenWarp.intensity = intensity;
}

export function triggerZoomPunch(scale = 1.04) {
  screenZoom.scale = scale;
}

export function updateEffects() {
  // Shake
  if (screenShake.intensity > 0.3) {
    screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.intensity *= screenShake.decay;
  } else {
    screenShake.x = screenShake.y = screenShake.intensity = 0;
  }

  // Flash
  if (screenFlash.alpha > 0.005) {
    screenFlash.alpha *= screenFlash.decay;
  } else {
    screenFlash.alpha = 0;
  }

  // Slow motion
  if (slowMotion.duration > 0) {
    slowMotion.duration--;
  } else {
    slowMotion.factor += (1 - slowMotion.factor) * 0.15;
  }

  // Chromatic
  if (chromatic.intensity > 0.1) {
    chromatic.intensity *= chromatic.decay;
  } else {
    chromatic.intensity = 0;
  }

  // Pulse ring
  if (pulseRing.alpha > 0.01) {
    pulseRing.radius += (pulseRing.maxRadius - pulseRing.radius) * 0.15;
    pulseRing.alpha *= 0.93;
  }

  // Screen warp (wobble rotation)
  if (screenWarp.intensity > 0.001) {
    screenWarp.angle = Math.sin(hueShift * 0.15) * screenWarp.intensity;
    screenWarp.intensity *= screenWarp.decay;
  } else {
    screenWarp.angle = 0;
    screenWarp.intensity = 0;
  }

  // Zoom punch
  screenZoom.scale += (screenZoom.target - screenZoom.scale) * screenZoom.speed;

  backgroundPulse *= 0.95;
  hueShift += 0.5;
}
