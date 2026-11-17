// Sleek floating translucent HUD — zero boxed borders, soft panels with
// rounded corners and a faint glow edge. Top bar, left relics panel, right
// threat queue, bottom action dock, and a live circular radar minimap.

import { VIEW, CORE, DOCK, PRISM_TYPES, RELICS, ENEMIES, NIGHTS } from './config.js';
import { clamp } from './random.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function panel(ctx, x, y, w, h, r) {
  ctx.fillStyle = 'rgba(10, 18, 44, 0.62)';
  roundRect(ctx, x, y, w, h, r || 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 190, 255, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function fitFont(ctx, text, maxWidth, startSize, weight, family) {
  let size = startSize;
  ctx.font = `${weight || 'bold'} ${size}px ${family || 'Georgia, serif'}`;
  while (size > 9 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${weight || 'bold'} ${size}px ${family || 'Georgia, serif'}`;
  }
  return size;
}

export function drawTopBar(ctx, S) {
  // Left: Core Integrity.
  panel(ctx, 14, 10, 300, 48, 24);
  ctx.fillStyle = '#9db8e8';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CORE INTEGRITY', 28, 26);
  const bw = 180, bx = 28, by = 36;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, bx, by, bw, 10, 5);
  ctx.fill();
  const frac = clamp(S.core / S.coreMax, 0, 1);
  const cg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  cg.addColorStop(0, frac > 0.35 ? '#7dffb0' : '#ff5f6d');
  cg.addColorStop(1, frac > 0.35 ? '#2fbf71' : '#c22f3d');
  ctx.fillStyle = cg;
  if (frac > 0) {
    roundRect(ctx, bx, by, bw * frac, 10, 5);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(S.core)} / ${S.coreMax}`, 300, 41);

  // Center: night dots + win/lose pills.
  panel(ctx, 420, 10, 440, 48, 24);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`NIGHT ${Math.min(S.night, NIGHTS)} / ${NIGHTS}`, 436, 34);
  for (let i = 0; i < NIGHTS; i++) {
    const cx = 540 + i * 20;
    ctx.beginPath();
    ctx.arc(cx, 34, 6, 0, Math.PI * 2);
    ctx.fillStyle = i < S.night - 1 ? '#ffd34d' : i === S.night - 1 ? '#fff3c4' : 'rgba(255,255,255,0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = '#9db8e8';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText('WIN: SHATTER THE LEVIATHAN', 684, 26);
  ctx.fillStyle = '#ff9d9d';
  ctx.fillText('LOSE: CORE FALLS', 684, 44);

  // Right: score + combo badge.
  panel(ctx, 968, 10, 298, 48, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${Math.round(S.score).toLocaleString('en-US')}`, 984, 34);
  const mult = 1 + Math.min(S.combo, 28) * 0.25;
  ctx.fillStyle = mult >= 4 ? '#ffd34d' : '#9db8e8';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(`COMBO x${mult.toFixed(2)}`, 1250, 34);

  // Boss HP bar (when the Leviathan lives).
  const boss = S.enemies.find((e) => e.kind === 'leviathan');
  if (boss) {
    panel(ctx, 440, 64, 400, 26, 13);
    ctx.fillStyle = '#ff8fb0';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('THE VOID LEVIATHAN', 452, 77);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 590, 70, 180, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#ff5f8f';
    roundRect(ctx, 590, 70, 180 * clamp(boss.hp / boss.maxHp, 0, 1), 12, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(boss.hp)} HP`, 830, 77);
  }
}

function relicIcon(ctx, x, y, relic) {
  ctx.fillStyle = relic.color;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#10182e';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = { dynamo: '☀', splitlens: '◈', burn: '♨', nova: '✦', bulwark: '⬢', overcharge: '⚡', rapid: '➤', anchor: '◎' }[relic.id] || '✦';
  ctx.fillText(glyph, x, y + 0.5);
}

export function drawLeftPanel(ctx, S) {
  panel(ctx, 14, 76, 212, 252, 14);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('RELICS & PRISMS', 28, 94);
  ctx.fillStyle = '#9db8e8';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText(`${S.relics.length} BOONS HELD`, 28, 112);
  let y = 138;
  if (S.relics.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '11px Georgia, serif';
    ctx.fillText('No boons yet —', 28, y);
    ctx.fillText('clear a night to', 28, y + 16);
    ctx.fillText('choose one.', 28, y + 32);
    y += 56;
  } else {
    for (const id of S.relics.slice(0, 5)) {
      const relic = RELICS.find((r) => r.id === id);
      if (!relic) continue;
      relicIcon(ctx, 42, y, relic);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(relic.name, 62, y - 4);
      ctx.fillStyle = relic.color;
      ctx.font = '10px Georgia, serif';
      ctx.fillText(relic.tag, 62, y + 10);
      y += 30;
    }
  }
  // Prism network summary.
  ctx.strokeStyle = 'rgba(140, 190, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, y + 4);
  ctx.lineTo(212, y + 4);
  ctx.stroke();
  ctx.fillStyle = '#9db8e8';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText('PRISM NETWORK', 28, y + 20);
  const counts = {};
  for (const p of S.prisms) counts[p.type] = (counts[p.type] || 0) + 1;
  const shortName = { prism: 'Prism', splitter: 'Splitter', mirror: 'Mirror', well: 'Well' };
  const parts = Object.keys(counts).map((k) => `${counts[k]}× ${shortName[k]}`);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px Georgia, serif';
  ctx.fillText(parts.length ? parts.join('  ·  ') : 'No prisms placed yet', 28, y + 38);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText(`⚡ ENERGY ${Math.floor(S.energy)}  (+${S.energyRegen}/s)`, 28, y + 58);
}

export function drawRightPanel(ctx, S) {
  panel(ctx, 1054, 76, 212, 296, 14);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('INCOMING THREAT', 1068, 94);
  ctx.fillStyle = '#9db8e8';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText(`${S.spawnQueue.length + S.enemies.length} ON THE SEA`, 1068, 112);
  let y = 136;
  const upcoming = S.spawnQueue.slice(0, 5);
  if (upcoming.length === 0 && S.enemies.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '11px Georgia, serif';
    ctx.fillText('The sea is calm…', 1068, y);
    ctx.fillText('for now.', 1068, y + 16);
    y += 40;
  } else {
    for (const kind of upcoming) {
      const def = ENEMIES[kind];
      ctx.fillStyle = kind === 'galleon' ? '#c9a7ff' : kind === 'wraith' ? '#5fe8ff' : '#8fa8d8';
      ctx.beginPath();
      ctx.arc(1082, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(def.name, 1098, y - 3);
      ctx.fillStyle = '#9db8e8';
      ctx.font = '10px Georgia, serif';
      ctx.fillText(`${def.hp} HP  ·  rams ${def.dmg}`, 1098, y + 11);
      y += 32;
    }
  }
  // Boss preview.
  ctx.strokeStyle = 'rgba(140, 190, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(1068, y + 4);
  ctx.lineTo(1252, y + 4);
  ctx.stroke();
  const bossHere = S.enemies.some((e) => e.kind === 'leviathan');
  const bossNight = S.night >= NIGHTS;
  ctx.fillStyle = '#ff8fb0';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText(bossHere ? '⚠ BOSS ON THE FIELD' : bossNight ? '⚠ BOSS NEXT WAVE' : 'NEXT-WAVE BOSS', 1068, y + 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px Georgia, serif';
  ctx.fillText('Void Leviathan', 1068, y + 40);
  ctx.fillStyle = '#9db8e8';
  ctx.font = '10px Georgia, serif';
  ctx.fillText(bossHere ? 'Shatter it to win the dawn.' : 'Night 7 — 2600 HP, spawns wraiths.', 1068, y + 56);
  // Wave progress line.
  ctx.fillStyle = '#9db8e8';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText(`WAVE ${S.waveKills} / ${S.waveTotal} SUNK`, 1068, y + 80);
  const wfrac = S.waveTotal > 0 ? clamp(S.waveKills / S.waveTotal, 0, 1) : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 1068, y + 88, 184, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#5fe8ff';
  if (wfrac > 0) {
    roundRect(ctx, 1068, y + 88, 184 * wfrac, 8, 4);
    ctx.fill();
  }
}

export function drawDock(ctx, S, t) {
  const cardW = 92, cardH = 66, gap = 8;
  const total = DOCK.length * cardW + (DOCK.length - 1) * gap;
  const x0 = (VIEW.w - total) / 2;
  const y0 = 640;
  DOCK.forEach((card, i) => {
    const x = x0 + i * (cardW + gap);
    const selected = S.selectedDock === i;
    const onCooldown = card.kind === 'ability' && S.cooldowns[card.id] > 0;
    const afford = card.kind === 'build'
      ? S.energy >= PRISM_TYPES[card.id].cost
      : !(card.id === 'torpedo' && S.energy < 25);
    // Card body.
    ctx.fillStyle = selected ? 'rgba(255, 211, 77, 0.30)' : 'rgba(10, 18, 44, 0.66)';
    roundRect(ctx, x, y0, cardW, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd34d' : onCooldown ? 'rgba(140,190,255,0.15)' : 'rgba(140, 190, 255, 0.30)';
    ctx.lineWidth = selected ? 2.5 : 1.2;
    ctx.stroke();
    // Cooldown radial sweep.
    if (onCooldown) {
      const cdMax = card.id === 'torpedo' ? (S.relicCounts.rapid ? 3 : 6) : 12;
      const frac = clamp(S.cooldowns[card.id] / cdMax, 0, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.moveTo(x + cardW / 2, y0 + cardH / 2);
      ctx.arc(x + cardW / 2, y0 + cardH / 2, 40, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(S.cooldowns[card.id]), x + cardW / 2, y0 + cardH / 2);
    }
    // Icon glyph.
    const glyph = { prism: '◈', splitter: '⬡', mirror: '◐', well: '◎', torpedo: '➤', nova: '✦' }[card.id];
    const color = card.kind === 'build' ? PRISM_TYPES[card.id].color : card.id === 'torpedo' ? '#8fd0ff' : '#ff5f8f';
    ctx.globalAlpha = onCooldown ? 0.45 : 1;
    ctx.fillStyle = color;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x + cardW / 2, y0 + 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillText(card.label, x + cardW / 2, y0 + 42);
    // Cost / cooldown label.
    ctx.fillStyle = afford ? '#ffd34d' : '#ff9d9d';
    ctx.font = '10px Georgia, serif';
    const costText = card.kind === 'build' ? `⚡${PRISM_TYPES[card.id].cost}` : card.id === 'torpedo' ? '⚡25 · 6s' : '12s CD';
    ctx.fillText(costText, x + cardW / 2, y0 + 56);
    // Keybind badge.
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, x + cardW - 20, y0 + 4, 16, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillText(String(i + 1), x + cardW - 12, y0 + 11);
    ctx.globalAlpha = 1;
  });
}

export function drawRadar(ctx, S, t) {
  const cx = 1196, cy = 552, r = 62;
  // Radar disc.
  ctx.fillStyle = 'rgba(10, 18, 44, 0.66)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 190, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Sweep.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sweep = t * 0.8;
  const grad = ctx.createConicGradient ? null : null;
  ctx.strokeStyle = 'rgba(95, 232, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweep) * r, cy + Math.sin(sweep) * r);
  ctx.stroke();
  // Range rings.
  ctx.strokeStyle = 'rgba(140, 190, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  // Islands as dots.
  ctx.fillStyle = 'rgba(120, 160, 120, 0.9)';
  for (const isle of [{ x: 640, y: 392 }, { x: 252, y: 178 }, { x: 1012, y: 168 }, { x: 176, y: 472 }, { x: 1104, y: 472 }, { x: 382, y: 592 }, { x: 884, y: 592 }]) {
    ctx.beginPath();
    ctx.arc(cx + ((isle.x - 640) / 1280) * r * 1.9, cy + ((isle.y - 360) / 720) * r * 1.9, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Core.
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.arc(cx, cy + 8, 4, 0, Math.PI * 2);
  ctx.fill();
  // Prisms.
  ctx.fillStyle = '#5fe8ff';
  for (const p of S.prisms) {
    ctx.beginPath();
    ctx.arc(cx + ((p.x - 640) / 1280) * r * 1.9, cy + ((p.y - 360) / 720) * r * 1.9, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Enemies.
  for (const e of S.enemies) {
    ctx.fillStyle = e.kind === 'leviathan' ? '#ff5f8f' : '#ff6d5f';
    ctx.beginPath();
    ctx.arc(cx + ((e.x - 640) / 1280) * r * 1.9, cy + ((e.y - 360) / 720) * r * 1.9, e.kind === 'leviathan' ? 6 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#9db8e8';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RADAR', cx, cy + r + 10);
}

export function drawHud(ctx, S, t) {
  drawTopBar(ctx, S);
  drawLeftPanel(ctx, S);
  drawRightPanel(ctx, S);
  drawDock(ctx, S, t);
  drawRadar(ctx, S, t);
}
