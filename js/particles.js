const particles = [];

export function spawnParticles(x, y, color, count, opts = {}) {
  const { speed = 4, life = 40, size = 3, spread = Math.PI * 2, angle = 0, gravity = 0, type = 'circle', drag = 0.98 } = opts;
  for (let i = 0; i < count; i++) {
    const a = angle - spread / 2 + Math.random() * spread;
    const s = (0.3 + Math.random() * 0.7) * speed;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life, maxLife: life,
      size: size * (0.4 + Math.random() * 0.6),
      color, gravity, type, drag,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    });
  }
}

export function spawnConfetti(x, y, count) {
  const colors = ['#ff6666', '#6666ff', '#ffff44', '#44ff44', '#ff44ff', '#44ffff', '#ff8800', '#ff44aa'];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
    const s = 3 + Math.random() * 6;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 2,
      life: 90 + Math.random() * 60,
      maxLife: 150,
      size: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.08, type: 'rect', drag: 0.99,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.4,
    });
  }
}

export function spawnFirework(x, y) {
  const colors = ['#ff3333', '#ffaa00', '#ffff00', '#33ff33', '#3333ff', '#ff33ff', '#33ffff'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  spawnParticles(x, y, color, 50, {
    speed: 6, life: 50, size: 3, spread: Math.PI * 2, gravity: 0.04, drag: 0.97
  });
  spawnParticles(x, y, '#fff', 15, {
    speed: 2, life: 30, size: 2, spread: Math.PI * 2, drag: 0.96
  });
}

export function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.rotation += p.rotSpeed;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = Math.pow(p.life / p.maxLife, 0.6);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;

    if (p.type === 'rect') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      const s = p.size * alpha;
      ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export function clearParticles() {
  particles.length = 0;
}
