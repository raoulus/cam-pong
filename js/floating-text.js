const floatingTexts = [];

export function spawnFloatingText(x, y, text, color = '#fff', size = 24, opts = {}) {
  const { vy = -1.5, life = 70, bold = false, outline = false } = opts;
  floatingTexts.push({ x, y, text, color, size, life, maxLife: life, vy, bold, outline });
}

export function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y += t.vy;
    t.life--;
    if (t.life <= 0) floatingTexts.splice(i, 1);
  }
}

export function drawFloatingTexts(ctx) {
  for (const t of floatingTexts) {
    const progress = 1 - t.life / t.maxLife;
    const alpha = progress < 0.2 ? progress / 0.2 : t.life / t.maxLife;
    const scale = progress < 0.15 ? 0.5 + progress / 0.15 * 0.5 : 1 + progress * 0.15;
    ctx.globalAlpha = alpha;
    const fontSize = Math.round(t.size * scale);
    ctx.font = `${t.bold ? 'bold ' : ''}${fontSize}px Courier New`;
    ctx.textAlign = 'center';

    if (t.outline) {
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 15;
      ctx.strokeText(t.text, t.x, t.y);
    }

    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 12;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export function clearFloatingTexts() {
  floatingTexts.length = 0;
}
