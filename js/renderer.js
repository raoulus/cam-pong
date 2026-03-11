import * as C from './config.js';
import { drawParticles } from './particles.js';
import { drawFloatingTexts } from './floating-text.js';
import {
  screenShake, screenFlash, chromatic, pulseRing,
  backgroundPulse, hueShift, screenWarp, screenZoom
} from './effects.js';

export function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();
}

export function drawScore(ctx, score, x, color) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.font = 'bold 80px Courier New';
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.7;
  ctx.fillText(score, x, 85);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export function drawPaddle(ctx, x, y, detected, color, flash, gameTime, paddleH) {
  const pw = C.PADDLE_W;
  const ph = paddleH;

  // Ghost trail on hit
  if (detected && flash > 0) {
    const px = x - pw / 2;
    const py = y - ph / 2;
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = flash * 0.1 / i;
      ctx.fillStyle = color;
      drawRoundRect(ctx, px - (x < C.CANVAS_W / 2 ? i * 3 : -i * 3), py, pw, ph, 5);
    }
    ctx.globalAlpha = 1;
  }

  // Size change glow (when paddle is non-standard)
  if (ph !== C.PADDLE_H) {
    const glowColor = ph > C.PADDLE_H ? '#44ff44' : '#ff4444';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = glowColor;
    ctx.globalAlpha = 0.3 + Math.sin(gameTime * 0.15) * 0.15;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - pw / 2 - 4, y - ph / 2);
    ctx.lineTo(x - pw / 2 - 4, y + ph / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + pw / 2 + 4, y - ph / 2);
    ctx.lineTo(x + pw / 2 + 4, y + ph / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Main paddle
  if (flash > 0) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    ctx.fillStyle = `rgb(${Math.round(r + (255 - r) * flash)},${Math.round(g + (255 - g) * flash)},${Math.round(b + (255 - b) * flash)})`;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 30 * flash;
  } else {
    ctx.fillStyle = detected ? color : color + '55';
    ctx.shadowColor = color;
    ctx.shadowBlur = detected ? 18 : 0;
  }

  drawRoundRect(ctx, x - pw / 2, y - ph / 2, pw, ph, 5);

  // Detected indicator dot
  if (detected) {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.6 + Math.sin(gameTime * 0.1) * 0.3;
    ctx.beginPath();
    ctx.arc(x, y - ph / 2 - 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;
}

export function drawBall(ctx, ball, trail, gameTime) {
  if (!ball.active && trail.length === 0) return;

  const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  const bs = C.baseSpeed();
  const isfast = ballSpeed > bs * 1.3;
  const isCrazy = ballSpeed > bs * 2;

  // Trail
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const p = i / trail.length;
    const alpha = p * 0.5 * (ball.active ? 1 : 0.5);
    const size = C.BALL_R * p * 0.9;

    if (isCrazy) {
      const trailHue = (hueShift * 5 + i * 25) % 360;
      ctx.fillStyle = `hsla(${trailHue}, 100%, 65%, ${alpha})`;
      ctx.shadowColor = `hsl(${trailHue}, 100%, 65%)`;
      ctx.shadowBlur = 8;
    } else if (isfast) {
      ctx.fillStyle = `hsla(${30 + p * 30}, 100%, 70%, ${alpha})`;
    } else {
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    }
    ctx.beginPath();
    ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  if (!ball.active) return;

  // Ball body
  let ballColor;
  if (isCrazy) {
    ballColor = `hsl(${(hueShift * 8) % 360}, 100%, 65%)`;
  } else if (isfast) {
    ballColor = `hsl(${Math.min(60, ballSpeed / bs * 20)}, 100%, 65%)`;
  } else {
    ballColor = '#fff';
  }

  // Pulsing size at crazy speed
  const sizeBonus = isCrazy ? Math.sin(gameTime * 0.3) * 3 : 0;

  ctx.fillStyle = ballColor;
  ctx.shadowColor = ballColor;
  ctx.shadowBlur = 15 + ballSpeed * 1.5;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, C.BALL_R + sizeBonus, 0, Math.PI * 2);
  ctx.fill();

  // Glow ring
  if (isfast) {
    ctx.strokeStyle = ballColor;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, C.BALL_R + 8 + Math.sin(gameTime * 0.2) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Second outer ring at crazy speed
  if (isCrazy) {
    const ringHue = (hueShift * 6 + 180) % 360;
    ctx.strokeStyle = `hsla(${ringHue}, 100%, 70%, 0.2)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, C.BALL_R + 16 + Math.sin(gameTime * 0.15) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Speed lines
  if (ballSpeed > bs * 1.2) {
    const lineCount = Math.min(10, Math.floor((ballSpeed / bs - 1) * 5));
    const lineAlpha = Math.min(0.5, (ballSpeed / bs - 1.2) * 0.15);
    ctx.strokeStyle = isCrazy
      ? `hsla(${(hueShift * 8) % 360}, 100%, 70%, ${lineAlpha})`
      : `rgba(255,255,255,${lineAlpha})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < lineCount; i++) {
      const offsetY = (Math.random() - 0.5) * C.BALL_R * 5;
      const len = ballSpeed * 2;
      ctx.beginPath();
      ctx.moveTo(ball.x - Math.sign(ball.vx) * len, ball.y + offsetY);
      ctx.lineTo(ball.x - Math.sign(ball.vx) * (len + 15 + Math.random() * 25), ball.y + offsetY);
      ctx.stroke();
    }
  }
}

export function drawHUD(ctx, state, p1, p2, rallyCount, gameTime) {
  // Zone glow
  if (state === 'playing' || state === 'countdown') {
    const zoneGrad1 = ctx.createLinearGradient(0, 0, C.PADDLE_MARGIN * 3, 0);
    zoneGrad1.addColorStop(0, `rgba(255,100,100,${p1.detected ? 0.08 : 0.02})`);
    zoneGrad1.addColorStop(1, 'rgba(255,100,100,0)');
    ctx.fillStyle = zoneGrad1;
    ctx.fillRect(0, 0, C.PADDLE_MARGIN * 3, C.CANVAS_H);

    const zoneGrad2 = ctx.createLinearGradient(C.CANVAS_W, 0, C.CANVAS_W - C.PADDLE_MARGIN * 3, 0);
    zoneGrad2.addColorStop(0, `rgba(100,100,255,${p2.detected ? 0.08 : 0.02})`);
    zoneGrad2.addColorStop(1, 'rgba(100,100,255,0)');
    ctx.fillStyle = zoneGrad2;
    ctx.fillRect(C.CANVAS_W - C.PADDLE_MARGIN * 3, 0, C.PADDLE_MARGIN * 3, C.CANVAS_H);
  }

  // No-hand messages
  if (!p1.detected && (state === 'playing' || state === 'countdown')) {
    ctx.fillStyle = 'rgba(255,100,100,0.4)';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('RAISE YOUR HAND', C.CANVAS_W * 0.15, C.CANVAS_H / 2);
  }
  if (!p2.detected && (state === 'playing' || state === 'countdown')) {
    ctx.fillStyle = 'rgba(100,100,255,0.4)';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('RAISE YOUR HAND', C.CANVAS_W * 0.85, C.CANVAS_H / 2);
  }

  // Scores
  drawScore(ctx, p1.score, C.CANVAS_W / 2 - 80, '#ff6666');
  drawScore(ctx, p2.score, C.CANVAS_W / 2 + 80, '#6666ff');

  // Rally counter
  if (rallyCount >= 3 && state === 'playing') {
    const rallyAlpha = Math.min(1, (rallyCount - 2) * 0.2);
    const rallyHue = (rallyCount * 20 + hueShift * 2) % 360;
    ctx.globalAlpha = rallyAlpha * 0.7;
    const fontSize = Math.min(60, 18 + rallyCount * 1.5);
    ctx.fillStyle = rallyCount >= 10 ? `hsl(${rallyHue}, 100%, 70%)` : '#ffff44';
    ctx.font = `bold ${fontSize}px Courier New`;
    ctx.textAlign = 'center';
    // Shake text at high rallies
    const shakeX = rallyCount >= 15 ? (Math.random() - 0.5) * rallyCount * 0.3 : 0;
    const shakeY = rallyCount >= 15 ? (Math.random() - 0.5) * rallyCount * 0.3 : 0;
    ctx.fillText(`RALLY: ${rallyCount}`, C.CANVAS_W / 2 + shakeX, C.CANVAS_H - 30 + shakeY);
    ctx.globalAlpha = 1;
  }
}

function drawCenterDivider(ctx) {
  const dividerAlpha = 0.1 + backgroundPulse * 0.3;
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = `rgba(255,255,255,${dividerAlpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.CANVAS_W / 2, 0);
  ctx.lineTo(C.CANVAS_W / 2, C.CANVAS_H);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPulseRing(ctx) {
  if (pulseRing.alpha > 0.01) {
    ctx.strokeStyle = pulseRing.color;
    ctx.globalAlpha = pulseRing.alpha * 0.6;
    ctx.lineWidth = 3;
    ctx.shadowColor = pulseRing.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(pulseRing.x, pulseRing.y, pulseRing.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}

function drawScreenFlash(ctx) {
  if (screenFlash.alpha > 0.005) {
    ctx.fillStyle = screenFlash.color;
    ctx.globalAlpha = screenFlash.alpha;
    ctx.fillRect(-50, -50, C.CANVAS_W + 100, C.CANVAS_H + 100);
    ctx.globalAlpha = 1;
  }
}

function drawChromaticAberration(ctx, canvas) {
  if (chromatic.intensity > 0.5) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.15;
    ctx.drawImage(canvas, chromatic.intensity, 0);
    ctx.drawImage(canvas, -chromatic.intensity, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

function drawBackgroundPulse(ctx) {
  if (backgroundPulse > 0.01) {
    const bgHue = (hueShift * 3) % 360;
    ctx.fillStyle = `hsla(${bgHue}, 100%, 50%, ${backgroundPulse * 0.15})`;
    ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
  }
}

function drawGravityIndicator(ctx, gravity, gameTime) {
  if (gravity.duration <= 0) return;
  // Arrow indicators showing gravity direction
  const alpha = Math.min(0.4, gravity.duration / 60);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff44ff';
  ctx.font = 'bold 24px Courier New';
  ctx.textAlign = 'center';

  const arrowCount = 5;
  for (let i = 0; i < arrowCount; i++) {
    const x = C.CANVAS_W * (i + 1) / (arrowCount + 1);
    const yOff = Math.sin(gameTime * 0.1 + i) * 5;
    const arrow = gravity.y > 0 ? 'v' : '^';
    const y = gravity.y > 0 ? C.CANVAS_H - 15 + yOff : 25 + yOff;
    ctx.fillText(arrow, x, y);
  }
  ctx.globalAlpha = 1;
}

function drawGameOver(ctx, p1, p2, maxRally, gameTime) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);

  const winner = p1.score >= C.WIN_SCORE ? 1 : 2;
  const winColor = winner === 1 ? '#ff6666' : '#6666ff';

  const pulse = 1 + Math.sin(gameTime * 0.08) * 0.05;
  ctx.save();
  ctx.translate(C.CANVAS_W / 2, C.CANVAS_H / 2 - 40);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = winColor;
  ctx.shadowColor = winColor;
  ctx.shadowBlur = 30 + Math.sin(gameTime * 0.1) * 10;
  ctx.font = 'bold 64px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(`PLAYER ${winner} WINS!`, 0, 0);
  ctx.restore();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#aaa';
  ctx.font = '20px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(`Final: ${p1.score} - ${p2.score}`, C.CANVAS_W / 2, C.CANVAS_H / 2 + 20);
  if (maxRally > 3) {
    ctx.fillStyle = '#ff0';
    ctx.fillText(`Best rally: ${maxRally} hits`, C.CANVAS_W / 2, C.CANVAS_H / 2 + 50);
  }

  ctx.fillStyle = '#888';
  ctx.font = '18px Courier New';
  ctx.fillText('Press SPACE to play again', C.CANVAS_W / 2, C.CANVAS_H / 2 + 90);
}

function drawFingerZones(ctx, p1, p2, gameTime) {
  // Draw horizontal dashed lines dividing screen into 5 zones
  ctx.save();
  ctx.setLineDash([8, 12]);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i < C.FINGER_ZONES; i++) {
    // Midpoint between zone i and zone i+1 paddle positions
    const ph = C.PADDLE_H;
    const y = ph / 2 + (i - 0.5) / (C.FINGER_ZONES - 1) * (C.CANVAS_H - ph);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.CANVAS_W, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Show finger count near each paddle
  ctx.font = 'bold 20px Courier New';
  ctx.textAlign = 'center';
  if (p1.detected && p1.fingerCount > 0) {
    ctx.fillStyle = 'rgba(255,100,100,0.5)';
    ctx.fillText(p1.fingerCount, C.PADDLE_MARGIN, p1.y - p1.paddleH / 2 - 16);
  }
  if (p2.detected && p2.fingerCount > 0) {
    ctx.fillStyle = 'rgba(100,100,255,0.5)';
    ctx.fillText(p2.fingerCount, C.CANVAS_W - C.PADDLE_MARGIN, p2.y - p2.paddleH / 2 - 16);
  }
  ctx.restore();
}

export function drawFrame(ctx, canvas, state, p1, p2, balls, trails, rallyCount, maxRally, gameTime, gravity, controlMode) {
  ctx.save();

  // Screen warp (rotation wobble) and zoom
  const cx = C.CANVAS_W / 2;
  const cy = C.CANVAS_H / 2;
  if (screenWarp.angle !== 0 || screenZoom.scale !== 1) {
    ctx.translate(cx, cy);
    if (screenWarp.angle) ctx.rotate(screenWarp.angle);
    if (screenZoom.scale !== 1) ctx.scale(screenZoom.scale, screenZoom.scale);
    ctx.translate(-cx, -cy);
  }

  ctx.translate(screenShake.x, screenShake.y);
  ctx.clearRect(-50, -50, C.CANVAS_W + 100, C.CANVAS_H + 100);

  drawBackgroundPulse(ctx);
  drawCenterDivider(ctx);
  if (controlMode === 'fingers') drawFingerZones(ctx, p1, p2, gameTime);
  drawGravityIndicator(ctx, gravity, gameTime);
  drawHUD(ctx, state, p1, p2, rallyCount, gameTime);

  // Paddles
  const now = performance.now();
  drawPaddle(ctx, C.PADDLE_MARGIN, p1.y, p1.detected, '#ff6666',
    Math.max(0, 1 - (now - p1.lastHitTime) / 250), gameTime, p1.paddleH);
  drawPaddle(ctx, C.CANVAS_W - C.PADDLE_MARGIN, p2.y, p2.detected, '#6666ff',
    Math.max(0, 1 - (now - p2.lastHitTime) / 250), gameTime, p2.paddleH);

  // All balls
  if (state === 'playing' || state === 'scored') {
    for (let i = 0; i < balls.length; i++) {
      drawBall(ctx, balls[i], trails[i], gameTime);
    }
  }

  drawPulseRing(ctx);
  drawParticles(ctx);
  drawFloatingTexts(ctx);
  drawScreenFlash(ctx);
  drawChromaticAberration(ctx, canvas);

  if (state === 'ended') {
    drawGameOver(ctx, p1, p2, maxRally, gameTime);
  }

  ctx.restore();
}
