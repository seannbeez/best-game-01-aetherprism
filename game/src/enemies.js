// Enemies: Shadow Fleets sailing in from the dark sea toward the Core.
// Kinds: Shadow Skiff (fast), Void Wraith (mid), Ironclad Galleon (tanky),
// Void Leviathan (Night 7 boss). All drawn as inked, glowing silhouettes.

import { ENEMIES, CORE } from './config.js';
import { dist, clamp } from './random.js';

let nextId = 1;

export function makeEnemy(kind, x, y) {
  const def = ENEMIES[kind];
  return {
    id: nextId++,
    kind,
    name: def.name,
    x, y,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed * (0.9 + Math.random() * 0.2),
    r: def.r,
    bounty: def.bounty,
    dmg: def.dmg,
    score: def.score,
    wobble: Math.random() * Math.PI * 2,
    flash: 0,
    burn: 0,
    beamHit: false,
    slowUntil: 0,
  };
}

// Night composition: how many of each kind, before the route modifier.
export function nightQueue(night, rng) {
  const q = [];
  const total = 6 + night * 3;
  for (let i = 0; i < total; i++) {
    const roll = rng();
    if (night >= 5 && roll < 0.16) q.push('galleon');
    else if (night >= 3 && roll < 0.45) q.push('wraith');
    else q.push('skiff');
  }
  // Heavier nights end with a galleon or two.
  if (night >= 4) q.push('galleon');
  if (night >= 6) q.push('galleon');
  return q;
}

export function spawnPoint(rng) {
  const edge = Math.floor(rng() * 4);
  const m = 30;
  if (edge === 0) return { x: -m, y: 60 + rng() * 600 };
  if (edge === 1) return { x: 1280 + m, y: 60 + rng() * 600 };
  if (edge === 2) return { x: 60 + rng() * 1160, y: -m };
  return { x: 60 + rng() * 1160, y: 720 + m };
}

export function updateEnemies(S, dt, t) {
  const slowed = (e) => t < e.slowUntil;
  for (const e of S.enemies) {
    // Burn damage-over-time from the Arcane Burn relic.
    if (e.burn > 0) {
      e.burn -= dt;
      e.hp -= 6 * dt;
      e.flash = Math.max(e.flash, 0.05);
    }
    if (e.flash > 0) e.flash -= dt;
    // Gravity wells slow foes nearby.
    for (const p of S.prisms) {
      if (p.type !== 'well') continue;
      const reach = (S.relicCounts.anchor ? 150 : 110);
      if (dist(e.x, e.y, p.x, p.y) < reach) {
        e.slowUntil = t + 0.4;
      }
    }
    const sp = e.speed * (slowed(e) ? (S.relicCounts.anchor ? 0.45 : 0.6) : 1);
    const ang = Math.atan2(CORE.y - e.y, CORE.x - e.x);
    const wob = Math.sin(t * 1.4 + e.wobble) * 0.25;
    e.x += Math.cos(ang + wob) * sp * dt;
    e.y += Math.sin(ang + wob) * sp * dt;
  }
}

function drawHull(ctx, e, t) {
  const ang = Math.atan2(CORE.y - e.y, CORE.x - e.x);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(ang);
  // Drop shadow on the water.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(3, 5, e.r + 3, e.r * 0.7 + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  const flash = e.flash > 0;
  // A hit lightens the hull briefly; it never whites the whole body out
  // (a boss under continuous beam fire would otherwise read as a white blob).
  const body = flash ? '#4a5a80' : '#1b2138';
  const trim = e.kind === 'leviathan' ? '#ff5f8f' : e.kind === 'galleon' ? '#c9a7ff' : '#5fe8ff';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0a0d1a';
  ctx.fillStyle = body;
  if (e.kind === 'skiff') {
    // Sleek dart.
    ctx.beginPath();
    ctx.moveTo(e.r + 6, 0);
    ctx.lineTo(-e.r * 0.6, e.r * 0.75);
    ctx.lineTo(-e.r * 0.3, 0);
    ctx.lineTo(-e.r * 0.6, -e.r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.kind === 'wraith') {
    // Ghostly manta.
    ctx.beginPath();
    ctx.moveTo(e.r + 4, 0);
    ctx.quadraticCurveTo(0, -e.r * 1.1, -e.r, -e.r * 0.5);
    ctx.quadraticCurveTo(-e.r * 0.4, 0, -e.r, e.r * 0.5);
    ctx.quadraticCurveTo(0, e.r * 1.1, e.r + 4, 0);
    ctx.fill();
    ctx.stroke();
  } else if (e.kind === 'galleon') {
    // Armoured hull with towers.
    ctx.beginPath();
    ctx.ellipse(0, 0, e.r + 4, e.r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2c3552';
    ctx.beginPath();
    ctx.arc(-e.r * 0.3, 0, e.r * 0.4, 0, Math.PI * 2);
    ctx.arc(e.r * 0.35, 0, e.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Leviathan: segmented serpent body is drawn in drawLeviathan; here the head.
    ctx.beginPath();
    ctx.ellipse(0, 0, e.r + 8, e.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Glowing void eyes.
  const eyeY = e.kind === 'skiff' ? 0 : e.r * 0.25;
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.arc(e.r * 0.45, -eyeY * 0.6, 2.6, 0, Math.PI * 2);
  ctx.arc(e.r * 0.45, eyeY * 0.6, 2.6, 0, Math.PI * 2);
  ctx.fill();
  if (e.kind === 'leviathan') {
    // Crown horns.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(e.r * 0.5, -e.r * 0.5);
    ctx.lineTo(e.r * 0.9, -e.r * 1.1);
    ctx.moveTo(e.r * 0.5, e.r * 0.5);
    ctx.lineTo(e.r * 0.9, e.r * 1.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLeviathanTail(ctx, e, t) {
  // Segmented tail trailing behind the head, toward the spawn edge.
  const ang = Math.atan2(CORE.y - e.y, CORE.x - e.x);
  const back = ang + Math.PI;
  for (let i = 1; i <= 4; i++) {
    const d = i * 34;
    const wob = Math.sin(t * 2 + i * 0.9 + e.wobble) * 12;
    const px = e.x + Math.cos(back) * d + Math.cos(back + Math.PI / 2) * wob;
    const py = e.y + Math.sin(back) * d + Math.sin(back + Math.PI / 2) * wob;
    const r = e.r * (1 - i * 0.16);
    ctx.fillStyle = i % 2 === 0 ? '#241a33' : '#1b2138';
    ctx.strokeStyle = '#0a0d1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 0.75, back, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff5f8f';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawEnemies(ctx, S, t) {
  for (const e of S.enemies) {
    if (e.kind === 'leviathan') drawLeviathanTail(ctx, e, t);
  }
  for (const e of S.enemies) drawHull(ctx, e, t);
  // HP bars for hurt enemies + boss bar handled by HUD.
  for (const e of S.enemies) {
    if (e.kind === 'leviathan') continue;
    if (e.hp >= e.maxHp) continue;
    const w = e.r * 2;
    const x = e.x - w / 2, y = e.y - e.r - 12;
    ctx.fillStyle = 'rgba(10, 13, 26, 0.8)';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = '#ff5f6d';
    ctx.fillRect(x, y, (w * clamp(e.hp / e.maxHp, 0, 1)), 4);
  }
}
