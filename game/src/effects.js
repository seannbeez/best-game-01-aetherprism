// Particles, impact flashes, and bold comic callouts.
// Callouts render with dark outlines + white drop shadows so they read at
// thumbnail size, and are pushed away from the boss's face.

import { clamp } from './random.js';

export function spawnBurst(S, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (speed || 120) * (0.4 + Math.random() * 0.8);
    S.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.5 + Math.random() * 0.5, max: 1,
      r: 1.5 + Math.random() * 3,
      color: color || '#ffd34d',
    });
  }
}

export function spawnFlash(S, x, y, color) {
  S.flashes.push({ x, y, life: 0.28, max: 0.28, color: color || '#ffffff' });
}

export function addCallout(S, x, y, text, color) {
  // Keep callouts off the boss's face: push radially out of its keep-out circle.
  const boss = S.enemies.find((e) => e.kind === 'leviathan');
  if (boss) {
    const dx = x - boss.x, dy = y - boss.y;
    const d = Math.hypot(dx, dy);
    const keep = boss.r + 64;
    if (d < keep && d > 0.01) {
      x = boss.x + (dx / d) * keep;
      y = boss.y + (dy / d) * keep;
    }
  }
  x = clamp(x, 130, 1150);
  y = clamp(y, 70, 600);
  S.callouts.push({ x, y, text, color: color || '#ffd34d', life: 1.6, max: 1.6 });
}

export function updateEffects(S, dt) {
  for (const p of S.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  S.particles = S.particles.filter((p) => p.life > 0);
  for (const f of S.flashes) f.life -= dt;
  S.flashes = S.flashes.filter((f) => f.life > 0);
  for (const c of S.callouts) c.life -= dt;
  S.callouts = S.callouts.filter((c) => c.life > 0);
}

export function drawParticles(ctx, S) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of S.particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawFlashes(ctx, S) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of S.flashes) {
    const k = f.life / f.max;
    ctx.strokeStyle = f.color;
    ctx.globalAlpha = k;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(f.x + Math.cos(a) * 6, f.y + Math.sin(a) * 6);
      ctx.lineTo(f.x + Math.cos(a) * (16 + 26 * k), f.y + Math.sin(a) * (16 + 26 * k));
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 4 + 8 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawCallouts(ctx, S) {
  for (const c of S.callouts) {
    const k = clamp(c.life / c.max, 0, 1);
    const alpha = k < 0.4 ? k / 0.4 : 1;
    const scale = 1 + (1 - k) * 0.06;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(c.x, c.y);
    ctx.scale(scale, scale);
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Radiating impact lines.
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 2;
    const w = ctx.measureText(c.text).width;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (w / 2 + 8), Math.sin(a) * 16);
      ctx.lineTo(Math.cos(a) * (w / 2 + 20), Math.sin(a) * 26);
      ctx.stroke();
    }
    // White drop shadow, then dark outline, then colored fill.
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(c.text, 2, 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1e293b';
    ctx.strokeText(c.text, 0, 0);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, 0, 0);
    ctx.restore();
  }
}
