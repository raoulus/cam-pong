import * as C from './config.js';
import * as Audio from './audio.js';
import * as FX from './effects.js';
import { spawnParticles, spawnConfetti, spawnFirework, updateParticles, clearParticles } from './particles.js';
import { spawnFloatingText, updateFloatingTexts, clearFloatingTexts } from './floating-text.js';
import { setupCamera, setupHandTracking, processHands } from './hand-tracking.js';
import { drawFrame } from './renderer.js';

// =============================================
// GAME STATE
// =============================================
let controlMode = 'free'; // 'free' or 'fingers'
let state = 'waiting';
let rallyCount = 0;
let maxRally = 0;
let countdownValue = 0;
let countdownTimer = 0;
let gameTime = 0;
let lastTimestamp = 0;
let chaosTimer = 0;

const p1 = { y: 0, targetY: 0, score: 0, detected: false, lastHitTime: 0, paddleH: C.PADDLE_H, fingerCount: 0 };
const p2 = { y: 0, targetY: 0, score: 0, detected: false, lastHitTime: 0, paddleH: C.PADDLE_H, fingerCount: 0 };

// Multi-ball support
const balls = [];
const trails = []; // one trail array per ball
let gravity = { x: 0, y: 0, duration: 0 }; // gravity chaos effect

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('camera-feed');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const statusEl = document.getElementById('status');

function createBall(x, y, vx, vy) {
  const b = { x, y, vx, vy, active: true };
  balls.push(b);
  trails.push([]);
  return b;
}

function initPositions() {
  p1.y = p1.targetY = C.CANVAS_H / 2;
  p2.y = p2.targetY = C.CANVAS_H / 2;
  p1.paddleH = C.PADDLE_H;
  p2.paddleH = C.PADDLE_H;
}

function resetBall(direction) {
  balls.length = 0;
  trails.length = 0;
  const speed = C.baseSpeed();
  const angle = (Math.random() - 0.5) * Math.PI / 3;
  const dir = direction || (Math.random() > 0.5 ? 1 : -1);
  createBall(C.CANVAS_W / 2, C.CANVAS_H / 2, speed * dir, speed * Math.sin(angle));
  rallyCount = 0;
  gravity = { x: 0, y: 0, duration: 0 };
}

function splitBall(sourceBall) {
  // Create a second ball going at a different angle
  const speed = Math.sqrt(sourceBall.vx * sourceBall.vx + sourceBall.vy * sourceBall.vy);
  const angle = Math.atan2(sourceBall.vy, sourceBall.vx);
  const newAngle = angle + (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4 + Math.random() * Math.PI / 4);
  createBall(sourceBall.x, sourceBall.y, Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);

  Audio.sfxMultiBall();
  spawnFloatingText(sourceBall.x, sourceBall.y - 30, 'SPLIT!', '#00ffff', 32, { bold: true, outline: true });
  FX.triggerFlash('#00ffff', 0.3);
  FX.triggerShake(12);
  FX.triggerChromatic(8);
  spawnParticles(sourceBall.x, sourceBall.y, '#00ffff', 30,
    { speed: 5, life: 30, size: 3, spread: Math.PI * 2 });
}

// =============================================
// CHAOS EVENTS (triggered during high rallies)
// =============================================
function triggerChaosEvent() {
  const events = ['gravity', 'bigpaddle', 'smallpaddle', 'speedboost', 'wobble'];
  const event = events[Math.floor(Math.random() * events.length)];

  switch (event) {
    case 'gravity': {
      const dir = Math.random() > 0.5 ? 1 : -1;
      gravity = { x: 0, y: dir * 0.3, duration: 180 };
      const label = dir > 0 ? 'GRAVITY DOWN!' : 'GRAVITY UP!';
      spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2, label, '#ff44ff', 30,
        { bold: true, outline: true, life: 60 });
      Audio.sfxGravityShift();
      FX.triggerFlash('#ff44ff', 0.15);
      break;
    }
    case 'bigpaddle': {
      const target = Math.random() > 0.5 ? p1 : p2;
      const name = target === p1 ? 'P1' : 'P2';
      target.paddleH = C.PADDLE_H * 1.8;
      setTimeout(() => { target.paddleH = C.PADDLE_H; }, 5000);
      spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2, `${name} BIG PADDLE!`, '#44ff44', 28,
        { bold: true, life: 50 });
      Audio.sfxChaosEvent();
      FX.triggerFlash('#44ff44', 0.1);
      break;
    }
    case 'smallpaddle': {
      const target = Math.random() > 0.5 ? p1 : p2;
      const name = target === p1 ? 'P1' : 'P2';
      target.paddleH = C.PADDLE_H * 0.5;
      setTimeout(() => { target.paddleH = C.PADDLE_H; }, 4000);
      spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2, `${name} TINY PADDLE!`, '#ff4444', 28,
        { bold: true, life: 50 });
      Audio.sfxChaosEvent();
      FX.triggerFlash('#ff4444', 0.1);
      break;
    }
    case 'speedboost': {
      for (const b of balls) {
        b.vx *= 1.4;
        b.vy *= 1.4;
      }
      spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2, 'SPEED BOOST!', '#ffaa00', 32,
        { bold: true, outline: true, life: 50 });
      Audio.sfxChaosEvent();
      FX.triggerFlash('#ffaa00', 0.15);
      FX.triggerChromatic(6);
      break;
    }
    case 'wobble': {
      FX.triggerWarp(0.04);
      spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2, 'WOBBLE!', '#ff88ff', 28,
        { bold: true, life: 50 });
      Audio.sfxChaosEvent();
      break;
    }
  }
}

// =============================================
// PADDLE HIT HANDLER
// =============================================
function onPaddleHit(side, ball, ballSpeed, offset) {
  const isLeft = side === 'left';
  const px = isLeft ? C.PADDLE_MARGIN + C.PADDLE_W / 2 : C.CANVAS_W - C.PADDLE_MARGIN - C.PADDLE_W / 2;
  const player = isLeft ? p1 : p2;
  const color = isLeft ? '#ff6666' : '#6666ff';

  Audio.sfxPaddleHit(ballSpeed, side);
  Audio.sfxRally(rallyCount);
  player.lastHitTime = performance.now();

  const pCount = 15 + rallyCount * 2 + ballSpeed * 1.5;
  spawnParticles(px, ball.y, color, pCount, {
    speed: 3 + ballSpeed * 0.4, life: 30, size: 3, spread: Math.PI * 0.7,
    angle: isLeft ? 0 : Math.PI, gravity: 0.02
  });

  FX.triggerPulseRing(px, ball.y, 80 + ballSpeed * 5, color);
  FX.triggerShake(3 + Math.min(ballSpeed * 0.6, 12));
  FX.triggerFlash(color, 0.06 + Math.min(ballSpeed * 0.01, 0.15));
  FX.triggerChromatic(2 + ballSpeed * 0.3);
  FX.triggerZoomPunch(1.02 + Math.min(ballSpeed * 0.002, 0.04));

  // Edge hits
  if (Math.abs(offset) > 0.8) {
    spawnFloatingText(ball.x + (isLeft ? 60 : -60), ball.y, 'EDGE!', '#ffff00', 22, { bold: true });
    FX.triggerShake(8);
    Audio.playTone(1200, 0.08, 'sine', 0.08);
  }

  // Combo messages
  for (const msg of C.COMBO_MESSAGES) {
    if (rallyCount === msg.at) {
      spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2 - 50, msg.text, msg.color, msg.size,
        { bold: true, outline: true, life: 80 });
      FX.triggerFlash(msg.color, 0.25);
      FX.triggerShake(12);
      FX.triggerChromatic(8);
      FX.triggerWarp(0.02);
      Audio.sfxPowerUp();
      spawnConfetti(C.CANVAS_W / 2, C.CANVAS_H / 2, rallyCount * 3);
      FX.setBackgroundPulse(0.4);
      break;
    }
  }

  // Multi-ball at threshold (only if we have a single ball)
  if (rallyCount === C.MULTIBALL_RALLY && balls.length === 1) {
    splitBall(ball);
  }

  // Chaos events during high rallies
  if (rallyCount >= C.CHAOS_RALLY && chaosTimer <= 0) {
    triggerChaosEvent();
    chaosTimer = 120 + Math.random() * 120; // 2-4 seconds between chaos events
  }
}

// =============================================
// SCORE HANDLER
// =============================================
function onScore(side) {
  const isLeft = side === 'left';
  const scorer = isLeft ? p1 : p2;
  const wallX = isLeft ? C.CANVAS_W : 0;
  const scorerColor = isLeft ? '#ff6666' : '#6666ff';

  scorer.score++;
  Audio.sfxScore(isLeft ? 'right' : 'left');

  // Wall explosion
  for (let y = 0; y < C.CANVAS_H; y += 30) {
    spawnParticles(wallX, y, scorerColor, 3, {
      speed: 4 + Math.random() * 4, life: 50, size: 3,
      spread: Math.PI * 0.6, angle: isLeft ? Math.PI : 0, gravity: 0.05
    });
  }
  // Extra center explosion for the ball that scored
  spawnParticles(wallX, C.CANVAS_H / 2, '#fff', 80, {
    speed: 10, life: 60, size: 5, spread: Math.PI, angle: isLeft ? Math.PI : 0, gravity: 0.08
  });

  FX.triggerShake(25);
  FX.triggerFlash(scorerColor, 0.6);
  FX.triggerSlowMo(0.05, 25);
  FX.triggerChromatic(15);
  FX.triggerPulseRing(wallX, C.CANVAS_H / 2, C.CANVAS_W * 0.7, scorerColor);
  FX.triggerZoomPunch(1.08);
  FX.setBackgroundPulse(0.6);

  spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2 - 80,
    `PLAYER ${isLeft ? '1' : '2'} SCORES!`, scorerColor, 42,
    { bold: true, outline: true, life: 80, vy: -0.8 });
  spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2 - 30,
    `${scorer.score} - ${isLeft ? p2.score : p1.score}`, '#fff', 32,
    { life: 60, vy: -0.5 });

  if (rallyCount >= 5) {
    Audio.sfxComboBreaker();
    spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2 + 30,
      `${rallyCount} hit rally broken!`, '#ff0', 24, { life: 70 });
  }

  // Match point
  if (scorer.score === C.WIN_SCORE - 1) {
    setTimeout(() => {
      spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2, 'MATCH POINT!', '#ff4444', 48,
        { bold: true, outline: true, life: 90, vy: -0.5 });
      Audio.playRiserTone(200, 800, 0.8, 'sawtooth', 0.06);
      FX.triggerWarp(0.015);
    }, 500);
  }

  // Win check
  if (scorer.score >= C.WIN_SCORE) {
    state = 'ended';
    Audio.sfxWin(side);
    spawnConfetti(C.CANVAS_W / 2, C.CANVAS_H * 0.3, 150);
    setTimeout(() => spawnConfetti(C.CANVAS_W * 0.3, C.CANVAS_H * 0.4, 80), 300);
    setTimeout(() => spawnConfetti(C.CANVAS_W * 0.7, C.CANVAS_H * 0.4, 80), 500);
    setTimeout(() => spawnFirework(C.CANVAS_W * 0.3, C.CANVAS_H * 0.25), 200);
    setTimeout(() => spawnFirework(C.CANVAS_W * 0.7, C.CANVAS_H * 0.25), 400);
    return;
  }

  // Reset paddles to normal
  p1.paddleH = C.PADDLE_H;
  p2.paddleH = C.PADDLE_H;

  resetBall(isLeft ? -1 : 1);
  state = 'scored';
  setTimeout(() => { if (state === 'scored') startCountdown(); }, 800);
}

function startCountdown() {
  state = 'countdown';
  countdownValue = 3;
  countdownTimer = 1;
}

// =============================================
// BALL PHYSICS
// =============================================
function updateBall(ball, trailArr, sm) {
  // Trail
  trailArr.push({ x: ball.x, y: ball.y });
  if (trailArr.length > C.TRAIL_LENGTH) trailArr.shift();

  // Apply gravity chaos
  if (gravity.duration > 0) {
    ball.vx += gravity.x * sm;
    ball.vy += gravity.y * sm;
  }

  ball.x += ball.vx * sm;
  ball.y += ball.vy * sm;

  const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

  // Cap max speed to prevent teleporting
  const maxSpeed = C.baseSpeed() * 3;
  if (ballSpeed > maxSpeed) {
    const scale = maxSpeed / ballSpeed;
    ball.vx *= scale;
    ball.vy *= scale;
  }

  // Ball sparks at high speed
  if (ballSpeed > C.baseSpeed() * 1.5 && gameTime % 2 === 0) {
    const sparkColor = ballSpeed > C.baseSpeed() * 2.5 ? '#ff4400' : '#ffaa44';
    spawnParticles(ball.x, ball.y, sparkColor, 1,
      { speed: 1, life: 10, size: 2, spread: Math.PI * 2, drag: 0.95 });
  }

  // Wall bounce (top/bottom)
  if (ball.y - C.BALL_R <= 0 || ball.y + C.BALL_R >= C.CANVAS_H) {
    ball.vy *= -1;
    ball.y = Math.max(C.BALL_R, Math.min(C.CANVAS_H - C.BALL_R, ball.y));
    Audio.sfxWallBounce(ball.y, C.CANVAS_H);
    const wallY = ball.y < C.CANVAS_H / 2 ? 0 : C.CANVAS_H;
    spawnParticles(ball.x, wallY, '#fff', 8 + ballSpeed,
      { speed: 2 + ballSpeed * 0.2, life: 20, size: 2, spread: Math.PI, angle: wallY === 0 ? Math.PI / 2 : -Math.PI / 2 });
    FX.triggerShake(2 + ballSpeed * 0.2);
    for (let i = -30; i <= 30; i += 5) {
      spawnParticles(ball.x + i, wallY, 'rgba(255,255,255,0.5)', 1,
        { speed: 0.5, life: 8, size: 1.5, spread: 0.5, angle: wallY === 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
  }

  // Paddle collision — P1 (left)
  const p1x = C.PADDLE_MARGIN;
  const p1h = p1.paddleH;
  if (ball.x - C.BALL_R <= p1x + C.PADDLE_W / 2 && ball.x + C.BALL_R >= p1x - C.PADDLE_W / 2) {
    if (ball.y >= p1.y - p1h / 2 && ball.y <= p1.y + p1h / 2 && ball.vx < 0) {
      ball.vx = Math.abs(ball.vx) * 1.04;
      const offset = (ball.y - p1.y) / (p1h / 2);
      ball.vy += offset * 3;
      ball.x = p1x + C.PADDLE_W / 2 + C.BALL_R;
      rallyCount++;
      maxRally = Math.max(maxRally, rallyCount);
      onPaddleHit('left', ball, ballSpeed, offset);
    }
  }

  // Paddle collision — P2 (right)
  const p2x = C.CANVAS_W - C.PADDLE_MARGIN;
  const p2h = p2.paddleH;
  if (ball.x + C.BALL_R >= p2x - C.PADDLE_W / 2 && ball.x - C.BALL_R <= p2x + C.PADDLE_W / 2) {
    if (ball.y >= p2.y - p2h / 2 && ball.y <= p2.y + p2h / 2 && ball.vx > 0) {
      ball.vx = -Math.abs(ball.vx) * 1.04;
      const offset = (ball.y - p2.y) / (p2h / 2);
      ball.vy += offset * 3;
      ball.x = p2x - C.PADDLE_W / 2 - C.BALL_R;
      rallyCount++;
      maxRally = Math.max(maxRally, rallyCount);
      onPaddleHit('right', ball, ballSpeed, offset);
    }
  }

  // Scoring — only the first ball to exit scores
  if (ball.x < -C.BALL_R * 3) {
    ball.active = false;
    if (balls.filter(b => b.active).length === 0) {
      onScore('right');
    }
  }
  if (ball.x > C.CANVAS_W + C.BALL_R * 3) {
    ball.active = false;
    if (balls.filter(b => b.active).length === 0) {
      onScore('left');
    }
  }
}

// =============================================
// UPDATE
// =============================================
function update() {
  // In finger mode, map finger count to zone target position
  if (controlMode === 'fingers') {
    if (p1.fingerCount > 0) {
      p1.targetY = p1.paddleH / 2 + (p1.fingerCount - 1) / (C.FINGER_ZONES - 1) * (C.CANVAS_H - p1.paddleH);
    }
    if (p2.fingerCount > 0) {
      p2.targetY = p2.paddleH / 2 + (p2.fingerCount - 1) / (C.FINGER_ZONES - 1) * (C.CANVAS_H - p2.paddleH);
    }
  }

  // Paddle smoothing
  p1.y += (p1.targetY - p1.y) * C.SMOOTHING;
  p2.y += (p2.targetY - p2.y) * C.SMOOTHING;
  p1.y = Math.max(p1.paddleH / 2, Math.min(C.CANVAS_H - p1.paddleH / 2, p1.y));
  p2.y = Math.max(p2.paddleH / 2, Math.min(C.CANVAS_H - p2.paddleH / 2, p2.y));

  updateParticles();
  updateFloatingTexts();
  FX.updateEffects();
  gameTime++;
  if (chaosTimer > 0) chaosTimer--;
  if (gravity.duration > 0) gravity.duration--;

  // Ambient paddle particles
  if (p1.detected && gameTime % 3 === 0) {
    spawnParticles(C.PADDLE_MARGIN + C.PADDLE_W / 2, p1.y + (Math.random() - 0.5) * p1.paddleH,
      '#ff666644', 1, { speed: 0.5, life: 20, size: 2, spread: Math.PI, angle: 0 });
  }
  if (p2.detected && gameTime % 3 === 0) {
    spawnParticles(C.CANVAS_W - C.PADDLE_MARGIN - C.PADDLE_W / 2, p2.y + (Math.random() - 0.5) * p2.paddleH,
      '#6666ff44', 1, { speed: 0.5, life: 20, size: 2, spread: Math.PI, angle: Math.PI });
  }

  // Gravity visual indicator
  if (gravity.duration > 0 && gameTime % 6 === 0) {
    const gx = Math.random() * C.CANVAS_W;
    const gy = gravity.y > 0 ? 0 : C.CANVAS_H;
    spawnParticles(gx, gy, '#ff44ff', 1, {
      speed: 1.5, life: 40, size: 2, spread: 0.5,
      angle: gravity.y > 0 ? Math.PI / 2 : -Math.PI / 2, drag: 0.99
    });
  }

  // Countdown
  if (state === 'countdown') {
    countdownTimer--;
    if (countdownTimer <= 0) {
      countdownValue--;
      if (countdownValue < 0) {
        state = 'playing';
      } else {
        countdownTimer = 40;
        Audio.sfxCountdown(countdownValue);
        if (countdownValue === 0) {
          spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2, 'GO!', '#44ff44', 64, { bold: true, outline: true, life: 50 });
          FX.triggerFlash('#44ff44', 0.15);
          FX.triggerShake(5);
        } else {
          spawnFloatingText(C.CANVAS_W / 2, C.CANVAS_H / 2, String(countdownValue), '#fff', 56, { bold: true, life: 35 });
        }
      }
    }
    return;
  }

  if (state !== 'playing') {
    if (state === 'ended') {
      if (Math.random() < 0.1) {
        spawnFirework(
          C.CANVAS_W * 0.15 + Math.random() * C.CANVAS_W * 0.7,
          C.CANVAS_H * 0.1 + Math.random() * C.CANVAS_H * 0.35
        );
        Audio.sfxFirework();
      }
      if (Math.random() < 0.5) {
        spawnConfetti(Math.random() * C.CANVAS_W, -10, 3);
      }
    }
    return;
  }

  const sm = FX.slowMotion.factor;

  // Update all active balls
  for (let i = 0; i < balls.length; i++) {
    if (balls[i].active) {
      updateBall(balls[i], trails[i], sm);
    }
  }

  // Remove dead extra balls (keep at least the trail visible briefly)
  for (let i = balls.length - 1; i >= 0; i--) {
    if (!balls[i].active && trails[i].length === 0) {
      balls.splice(i, 1);
      trails.splice(i, 1);
    } else if (!balls[i].active) {
      // Fade out trail
      if (trails[i].length > 0) trails[i].shift();
    }
  }
}

// =============================================
// GAME LOOP
// =============================================
function gameLoop(timestamp) {
  // Run hand detection every frame for best responsiveness
  if (timestamp - lastTimestamp > 16) {
    processHands(video, timestamp, p1, p2, C.CANVAS_H, controlMode);
    lastTimestamp = timestamp;
  }
  update();
  drawFrame(ctx, canvas, state, p1, p2, balls, trails, rallyCount, maxRally, gameTime, gravity, controlMode);
  requestAnimationFrame(gameLoop);
}

function startGame() {
  const modeInput = document.querySelector('input[name="control-mode"]:checked');
  controlMode = modeInput ? modeInput.value : 'free';
  p1.score = 0;
  p2.score = 0;
  clearParticles();
  clearFloatingTexts();
  maxRally = 0;
  gameTime = 0;
  chaosTimer = 0;
  initPositions();
  resetBall();
  overlay.classList.add('hidden');
  startCountdown();
}

// =============================================
// INIT
// =============================================
function resizeCanvas() {
  C.updateCanvasSize();
  canvas.width = C.CANVAS_W;
  canvas.height = C.CANVAS_H;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startBtn.textContent = 'LOADING...';
  try {
    await setupCamera(video, statusEl);
    await setupHandTracking(statusEl);
    statusEl.textContent = 'Move your hands to control the paddles!';
    startGame();
    gameLoop(performance.now());
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    console.error(err);
    startBtn.disabled = false;
    startBtn.textContent = 'RETRY';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === 'ended') startGame();
  }
  if (e.code === 'KeyW') p1.targetY -= 30;
  if (e.code === 'KeyS') p1.targetY += 30;
  if (e.code === 'ArrowUp') { e.preventDefault(); p2.targetY -= 30; }
  if (e.code === 'ArrowDown') { e.preventDefault(); p2.targetY += 30; }
});
