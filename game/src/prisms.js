// Prism placement: build pads, rotation, selling, and drawing the constructs.
// A prism's angle is what the beam bends to — rotating one rewires the network.

import { PADS } from './world.js';
import { PRISM_TYPES } from './config.js';

let nextPrismId = 1;

export function padAt(x, y) {
  for (let i = 0; i < PADS.length; i++) {
    const p = PADS[i];
    if (Math.hypot(p.x - x, p.y - y) < 34) return i;
  }
  return -1;
}

export function prismAt(S, x, y) {
  for (const p of S.prisms) {
    if (Math.hypot(p.x - x, p.y - y) < 30) return p;
  }
  return null;
}

export function placePrism(S, type, padIndex) {
  const pad = PADS[padIndex];
  if (!pad) return null;
  if (S.prisms.some((p) => p.pad === padIndex)) return null;
  const cost = PRISM_TYPES[type].cost;
  if (S.energy < cost) return null;
  S.energy -= cost;
  const prism = {
    id: nextPrismId++,
    type,
    pad: padIndex,
    x: pad.x,
    y: pad.y,
    // Default angle: face the Core, so a fresh prism immediately does something.
    angle: Math.atan2(392 - pad.y, 640 - pad.x),
    born: S.time,
  };
  S.prisms.push(prism);
  return prism;
}

export function rotatePrism(p) {
  p.angle += Math.PI / 4;
  if (p.angle > Math.PI) p.angle -= Math.PI * 2;
}

export function sellPrism(S, p) {
  S.prisms = S.prisms.filter((q) => q.id !== p.id);
  S.energy += Math.floor(PRISM_TYPES[p.type].cost * 0.5);
}

export function drawPads(ctx, S, t) {
  const armed = S.selectedDock >= 0 && S.selectedDock <= 3;
  PADS.forEach((pad, i) => {
    const occupied = S.prisms.some((p) => p.pad === i);
    const hovered = S.hoverPad === i;
    // Pad ring.
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, 24, 0, Math.PI * 2);
    ctx.fillStyle = occupied ? 'rgba(20, 30, 60, 0.55)' : 'rgba(140, 190, 255, 0.10)';
    ctx.fill();
    ctx.strokeStyle = hovered ? '#ffd34d' : armed ? 'rgba(95, 232, 255, 0.75)' : 'rgba(140, 190, 255, 0.35)';
    ctx.lineWidth = hovered ? 3 : 1.5;
    ctx.setLineDash(occupied ? [] : [5, 5]);
    ctx.lineDashOffset = -t * 8;
    ctx.stroke();
    ctx.setLineDash([]);
    if (!occupied && (armed || hovered)) {
      // Pulsing plus in the middle.
      const a = 0.5 + 0.3 * Math.sin(t * 4);
      ctx.strokeStyle = `rgba(255, 211, 77, ${a})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pad.x - 8, pad.y);
      ctx.lineTo(pad.x + 8, pad.y);
      ctx.moveTo(pad.x, pad.y - 8);
      ctx.lineTo(pad.x, pad.y + 8);
      ctx.stroke();
    }
  });
}

export function drawPrisms(ctx, S, t) {
  for (const p of S.prisms) {
    const def = PRISM_TYPES[p.type];
    // Ground shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x + 3, p.y + 8, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Base ring.
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#2c3552';
    ctx.fill();
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (p.type === 'prism') {
      // Triangular crystal.
      const g = ctx.createLinearGradient(-14, -14, 14, 14);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.5, def.color);
      g.addColorStop(1, 'rgba(40, 140, 255, 0.85)');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#0a0d1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(17, 0);
      ctx.lineTo(-11, 11);
      ctx.lineTo(-11, -11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Direction tick.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();
    } else if (p.type === 'splitter') {
      // Hexagonal splitter with three facets.
      ctx.fillStyle = def.color;
      ctx.strokeStyle = '#0a0d1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * 15, py = Math.sin(a) * 15;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff6c9';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(22, 0);
      ctx.stroke();
    } else if (p.type === 'mirror') {
      // Tesla mirror: twin arcs + coil.
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 13, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(0, 13);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      // Spark arcs.
      ctx.strokeStyle = 'rgba(201, 167, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-14, -16);
      ctx.moveTo(6, 8);
      ctx.lineTo(14, 16);
      ctx.stroke();
    } else {
      // Gravity well: swirling rings.
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.arc(0, 0, 7 + r * 5, t * 1.5 + r * 2, t * 1.5 + r * 2 + 4.2);
        ctx.stroke();
      }
      ctx.fillStyle = '#0a0d1a';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Well slow-field ring.
    if (p.type === 'well') {
      ctx.strokeStyle = 'rgba(125, 255, 176, 0.20)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 110, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
