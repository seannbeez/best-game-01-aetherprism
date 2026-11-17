// The twilight archipelago: islands, bridges, build pads, fog, caustics, moon.
// The world is rendered full-bleed — no boxed rectangle, no thick border.

import { CORE, PALETTE } from './config.js';
import { mulberry32 } from './random.js';

// Islands: {x, y, rx, ry, kind}. Bridges connect them. Pads are build anchors.
export const ISLANDS = [
  { x: 640, y: 392, rx: 96, ry: 78, kind: 'core' },
  { x: 252, y: 178, rx: 74, ry: 58, kind: 'isle' },
  { x: 1012, y: 168, rx: 68, ry: 54, kind: 'isle' },
  { x: 176, y: 472, rx: 62, ry: 50, kind: 'isle' },
  { x: 1104, y: 472, rx: 64, ry: 52, kind: 'isle' },
  { x: 382, y: 592, rx: 56, ry: 44, kind: 'isle' },
  { x: 884, y: 592, rx: 56, ry: 44, kind: 'isle' },
];

export const BRIDGES = [
  { x1: 320, y1: 216, x2: 552, y2: 348 },
  { x1: 728, y1: 348, x2: 950, y2: 204 },
  { x1: 232, y1: 500, x2: 552, y2: 452 },
  { x1: 728, y1: 452, x2: 1048, y2: 500 },
  { x1: 428, y1: 556, x2: 566, y2: 452 },
  { x1: 714, y1: 452, x2: 852, y2: 556 },
];

export const PADS = [
  { x: 252, y: 178, island: 1 },
  { x: 1012, y: 168, island: 2 },
  { x: 176, y: 472, island: 3 },
  { x: 1104, y: 472, island: 4 },
  { x: 382, y: 592, island: 5 },
  { x: 884, y: 592, island: 6 },
  { x: 436, y: 282, bridge: 0 },
  { x: 844, y: 276, bridge: 1 },
  { x: 392, y: 476, bridge: 2 },
  { x: 888, y: 476, bridge: 3 },
];

const islandSpeckles = ISLANDS.map((isle, i) => {
  const rng = mulberry32(1000 + i * 77);
  const pts = [];
  for (let k = 0; k < 14; k++) {
    pts.push({ dx: (rng() - 0.5) * isle.rx * 1.5, dy: (rng() - 0.5) * isle.ry * 1.4, r: 1 + rng() * 2.4 });
  }
  return pts;
});

const stars = (() => {
  const rng = mulberry32(4242);
  const pts = [];
  for (let i = 0; i < 90; i++) {
    pts.push({ x: rng() * 1280, y: rng() * 300, r: 0.5 + rng() * 1.3, tw: rng() * Math.PI * 2 });
  }
  return pts;
})();

const fogBanks = [];
for (let i = 0; i < 9; i++) {
  fogBanks.push({ x: (i * 173) % 1280, y: 90 + (i * 97) % 520, rx: 150 + (i % 3) * 60, ry: 34 + (i % 4) * 10, speed: 4 + (i % 5) * 2, phase: i * 1.3 });
}

const caustics = [];
for (let i = 0; i < 26; i++) {
  caustics.push({ x: (i * 211) % 1280, y: 120 + (i * 139) % 560, r: 26 + (i % 5) * 12, speed: 6 + (i % 4) * 3, phase: i * 0.9 });
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

export function drawWorld(ctx, S, t) {
  // Twilight sea gradient, full-bleed.
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, PALETTE.seaTop);
  g.addColorStop(0.55, PALETTE.seaMid);
  g.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);

  // Stars in the upper sky.
  for (const s of stars) {
    const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.7 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon glow, top-right.
  const mg = ctx.createRadialGradient(1120, 84, 4, 1120, 84, 150);
  mg.addColorStop(0, 'rgba(255, 244, 200, 0.55)');
  mg.addColorStop(0.25, 'rgba(255, 230, 160, 0.18)');
  mg.addColorStop(1, 'rgba(255, 230, 160, 0)');
  ctx.fillStyle = mg;
  ctx.fillRect(940, -60, 360, 300);
  ctx.fillStyle = '#ffeec4';
  ctx.beginPath();
  ctx.arc(1120, 84, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(220, 190, 130, 0.7)';
  ctx.beginPath();
  ctx.arc(1112, 78, 5, 0, Math.PI * 2);
  ctx.arc(1128, 92, 4, 0, Math.PI * 2);
  ctx.fill();

  // God rays from the moon, additive.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const a = -2.2 + i * 0.22 + Math.sin(t * 0.15 + i) * 0.02;
    ctx.strokeStyle = 'rgba(255, 236, 170, 0.05)';
    ctx.lineWidth = 34 - i * 8;
    ctx.beginPath();
    ctx.moveTo(1120, 84);
    ctx.lineTo(1120 + Math.cos(a) * 900, 84 + Math.sin(a) * 900);
    ctx.stroke();
  }
  ctx.restore();

  // Glowing water caustics drifting on the sea.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const c of caustics) {
    const x = (c.x + t * c.speed) % 1340 - 30;
    const y = c.y + Math.sin(t * 0.5 + c.phase) * 10;
    const cg = ctx.createRadialGradient(x, y, 2, x, y, c.r);
    cg.addColorStop(0, 'rgba(95, 232, 255, 0.10)');
    cg.addColorStop(1, 'rgba(95, 232, 255, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Bridges (plank walkways between islands).
  for (const b of BRIDGES) {
    ctx.strokeStyle = '#5a4632';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.strokeStyle = '#7d6244';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.35)';
    ctx.lineWidth = 1.5;
    const steps = 7;
    for (let i = 1; i < steps; i++) {
      const px = b.x1 + ((b.x2 - b.x1) * i) / steps;
      const py = b.y1 + ((b.y2 - b.y1) * i) / steps;
      ctx.beginPath();
      ctx.moveTo(px - 4, py - 4);
      ctx.lineTo(px + 4, py + 4);
      ctx.stroke();
    }
  }

  // Islands: dark cliff base, stone top, speckles, tiny trees.
  ISLANDS.forEach((isle, i) => {
    // Cliff shadow in the water.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ellipse(ctx, isle.x + 6, isle.y + 10, isle.rx + 6, isle.ry + 5);
    ctx.fill();
    // Cliff rock.
    const rg = ctx.createRadialGradient(isle.x - isle.rx * 0.3, isle.y - isle.ry * 0.35, 4, isle.x, isle.y, isle.rx * 1.15);
    rg.addColorStop(0, '#4a3d33');
    rg.addColorStop(0.7, '#33291f');
    rg.addColorStop(1, '#241b13');
    ctx.fillStyle = rg;
    ellipse(ctx, isle.x, isle.y, isle.rx, isle.ry);
    ctx.fill();
    // Grassy stone top.
    const tg = ctx.createRadialGradient(isle.x - isle.rx * 0.25, isle.y - isle.ry * 0.3, 4, isle.x, isle.y, isle.rx * 0.95);
    tg.addColorStop(0, '#5d6b52');
    tg.addColorStop(0.6, '#46523f');
    tg.addColorStop(1, '#33402e');
    ctx.fillStyle = tg;
    ellipse(ctx, isle.x, isle.y, isle.rx * 0.86, isle.ry * 0.82);
    ctx.fill();
    // Speckles.
    ctx.fillStyle = 'rgba(255, 255, 220, 0.10)';
    for (const p of islandSpeckles[i]) {
      ctx.beginPath();
      ctx.arc(isle.x + p.dx, isle.y + p.dy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tiny trees / ruins on non-core islands.
    if (isle.kind === 'isle') {
      ctx.fillStyle = '#2c4a2e';
      ctx.beginPath();
      ctx.arc(isle.x - isle.rx * 0.4, isle.y - 6, 9, 0, Math.PI * 2);
      ctx.arc(isle.x + isle.rx * 0.35, isle.y + 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 211, 77, 0.5)';
      ctx.beginPath();
      ctx.arc(isle.x + isle.rx * 0.15, isle.y - isle.ry * 0.4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Core island: glowing rune ring + observatory domes.
  const core = ISLANDS[0];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ring = ctx.createRadialGradient(core.x, core.y, core.rx * 0.7, core.x, core.y, core.rx * 1.05);
  ring.addColorStop(0, 'rgba(255, 211, 77, 0)');
  ring.addColorStop(0.75, 'rgba(255, 211, 77, 0.10)');
  ring.addColorStop(1, 'rgba(255, 211, 77, 0)');
  ctx.fillStyle = ring;
  ellipse(ctx, core.x, core.y, core.rx * 1.05, core.ry * 1.05);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 7]);
  ctx.lineDashOffset = -t * 14;
  ellipse(ctx, core.x, core.y, core.rx * 0.92, core.ry * 0.9);
  ctx.stroke();
  ctx.setLineDash([]);
  // Observatory domes.
  ctx.fillStyle = '#8a7a5f';
  ctx.beginPath();
  ctx.arc(core.x - 34, core.y + 18, 13, 0, Math.PI * 2);
  ctx.arc(core.x + 36, core.y + 22, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9b489';
  ctx.beginPath();
  ctx.arc(core.x - 34, core.y + 14, 13, Math.PI, 0);
  ctx.arc(core.x + 36, core.y + 19, 10, Math.PI, 0);
  ctx.fill();

  // Lighthouse tower on the core island.
  drawLighthouse(ctx, t);

  // Drifting volumetric fog banks.
  for (const f of fogBanks) {
    const x = (f.x + t * f.speed) % 1500 - 110;
    const y = f.y + Math.sin(t * 0.3 + f.phase) * 8;
    const fg = ctx.createRadialGradient(x, y, 4, x, y, f.rx);
    fg.addColorStop(0, 'rgba(190, 210, 240, 0.075)');
    fg.addColorStop(1, 'rgba(190, 210, 240, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(x, y, f.rx, f.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLighthouse(ctx, t) {
  const x = CORE.x, y = CORE.y - 6;
  // Soft glow at the lamp.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(x, y - 34, 2, x, y - 34, 60);
  lg.addColorStop(0, 'rgba(255, 240, 180, 0.5)');
  lg.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(x, y - 34, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Tower: tapered, striped.
  ctx.fillStyle = '#d8c9a3';
  ctx.beginPath();
  ctx.moveTo(x - 13, y + 22);
  ctx.lineTo(x - 8, y - 28);
  ctx.lineTo(x + 8, y - 28);
  ctx.lineTo(x + 13, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b03a2e';
  ctx.fillRect(x - 11, y + 2, 22, 9);
  ctx.fillRect(x - 9.5, y - 18, 19, 8);
  // Lamp room + dome.
  ctx.fillStyle = '#2c3247';
  ctx.fillRect(x - 10, y - 40, 20, 13);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(x - 7, y - 38, 14, 9);
  ctx.fillStyle = '#8a7a5f';
  ctx.beginPath();
  ctx.arc(x, y - 40, 10, Math.PI, 0);
  ctx.fill();
  // Slow rotating searchlight sweep (faint, behind the beam).
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sweep = t * 0.25;
  const sx = x + Math.cos(sweep) * 300, sy = y - 34 + Math.sin(sweep) * 300;
  const sg = ctx.createLinearGradient(x, y - 34, sx, sy);
  sg.addColorStop(0, 'rgba(255, 240, 180, 0.10)');
  sg.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.strokeStyle = sg;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(x, y - 34);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  ctx.restore();
}
