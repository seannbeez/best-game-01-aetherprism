// Beam tracing: the Solar Lighthouse Beam refracts through placed prisms.
// One trace per frame returns the glowing segments; enemies intersecting a
// segment take damage. Splitter prisms fork the beam into branches.

import { LIGHTHOUSE, PRISM_TYPES } from './config.js';
import { distToSegment, clamp } from './random.js';

const MAX_SEGMENTS = 16;
const MAX_BOUNCES = 7;

// Find the nearest prism hit by a ray from (x,y) along angle, within maxLen.
// Returns {prism, hx, hy, dist} or null.
function nearestPrismHit(x, y, angle, maxLen, prisms) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = null;
  for (const p of prisms) {
    const rx = p.x - x, ry = p.y - y;
    const along = rx * dx + ry * dy;
    if (along <= 0 || along > maxLen) continue;
    const perp = Math.abs(rx * dy - ry * dx);
    if (perp > 26) continue;
    if (!best || along < best.dist) best = { prism: p, hx: x + dx * along, hy: y + dy * along, dist: along };
  }
  return best;
}

export function traceBeams(S) {
  const segs = [];
  const dmgMul = 1 + (S.relicCounts.overcharge || 0) * 0.35;
  const splitCount = (S.relicCounts.splitlens || 0) > 0 ? 3 : 2;

  // The lighthouse beam aims at the nearest placed prism, so the network
  // always engages; with no prisms it fires at its fixed bearing.
  let startAngle = LIGHTHOUSE.beamAngle;
  if (S.prisms.length > 0) {
    const ox = LIGHTHOUSE.x, oy = LIGHTHOUSE.y - 34;
    let best = null, bestD = Infinity;
    for (const p of S.prisms) {
      const d = Math.hypot(p.x - ox, p.y - oy);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best) startAngle = Math.atan2(best.y - oy, best.x - ox);
  }

  // Stack of rays to trace: {x, y, angle, dmg, depth}.
  const stack = [{ x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 34, angle: startAngle, dmg: LIGHTHOUSE.beamDps * dmgMul, depth: 0 }];
  let guard = 0;
  while (stack.length > 0 && segs.length < MAX_SEGMENTS && guard++ < 40) {
    const ray = stack.pop();
    const hit = nearestPrismHit(ray.x, ray.y, ray.angle, LIGHTHOUSE.beamRange, S.prisms);
    if (!hit) {
      const ex = ray.x + Math.cos(ray.angle) * LIGHTHOUSE.beamRange;
      const ey = ray.y + Math.sin(ray.angle) * LIGHTHOUSE.beamRange;
      segs.push({ x1: ray.x, y1: ray.y, x2: ex, y2: ey, dmg: ray.dmg, hue: ray.depth === 0 ? 'gold' : 'cyan' });
      continue;
    }
    const { prism, hx, hy } = hit;
    segs.push({ x1: ray.x, y1: ray.y, x2: hx, y2: hy, dmg: ray.dmg, hue: ray.depth === 0 ? 'gold' : 'cyan' });
    if (ray.depth >= MAX_BOUNCES) continue;
    const p = prism;
    if (p.type === 'prism') {
      stack.push({ x: hx, y: hy, angle: p.angle, dmg: ray.dmg * 1.5, depth: ray.depth + 1 });
    } else if (p.type === 'splitter') {
      for (let i = 0; i < splitCount; i++) {
        const spread = splitCount === 3 ? (i - 1) * 0.5 : (i === 0 ? -0.5 : 0.5);
        stack.push({ x: hx, y: hy, angle: p.angle + spread, dmg: ray.dmg * 0.6, depth: ray.depth + 1 });
      }
    } else if (p.type === 'mirror') {
      const exit = 2 * p.angle - ray.angle;
      stack.push({ x: hx, y: hy, angle: exit, dmg: ray.dmg * 1.2, depth: ray.depth + 1 });
    } else if (p.type === 'well') {
      // Bend toward the well's heart, then continue.
      const toWell = Math.atan2(p.y - hy, p.x - hx);
      let bend = toWell - ray.angle;
      while (bend > Math.PI) bend -= Math.PI * 2;
      while (bend < -Math.PI) bend += Math.PI * 2;
      stack.push({ x: hx, y: hy, angle: ray.angle + clamp(bend, -0.9, 0.9) * 0.85, dmg: ray.dmg, depth: ray.depth + 1 });
    }
  }
  return segs;
}

// Apply beam damage to enemies; returns total damage dealt this frame.
export function applyBeamDamage(S, segs, dt) {
  let total = 0;
  for (const e of S.enemies) {
    let hit = false;
    for (const s of segs) {
      if (distToSegment(e.x, e.y, s.x1, s.y1, s.x2, s.y2) < e.r + 4) {
        const dmg = s.dmg * dt;
        e.hp -= dmg;
        total += dmg;
        e.flash = 0.12;
        e.beamHit = true;
        hit = true;
        if (S.relicCounts.burn) {
          e.burn = 3; // 3s of burn
        }
        break;
      }
    }
    if (!hit) e.beamHit = false;
  }
  return total;
}

export function drawBeams(ctx, segs, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const s of segs) {
    const core = s.hue === 'gold' ? '255, 211, 77' : '95, 232, 255';
    // Wide halo.
    ctx.strokeStyle = `rgba(${core}, 0.10)`;
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    // Mid glow.
    ctx.strokeStyle = `rgba(${core}, 0.35)`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    // Hot core.
    ctx.strokeStyle = 'rgba(255, 255, 240, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    // Travelling sparkle along the beam.
    const f = (t * 0.9 + s.x1 * 0.01) % 1;
    const sx = s.x1 + (s.x2 - s.x1) * f;
    const sy = s.y1 + (s.y2 - s.y1) * f;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
