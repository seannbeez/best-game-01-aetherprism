// Title, Expedition Map / Workshop, Victory and Defeat overlays.
// All overlays float over the live full-bleed world; geometry helpers are
// shared with input handling so clicks land exactly on what is drawn.

import { VIEW, RELICS, ROUTES, NIGHTS } from './config.js';
import { roundRect } from './hud.js';
import { clamp } from './random.js';

export const TITLE_PLAY = { x: 640 - 130, y: 512, w: 260, h: 58 };
export const MAP_NODE_RECTS = [
  { x: 330, y: 150, w: 190, h: 86 },
  { x: 545, y: 150, w: 190, h: 86 },
  { x: 760, y: 150, w: 190, h: 86 },
];
export const MAP_BOON_RECTS = [
  { x: 300, y: 330, w: 210, h: 240 },
  { x: 535, y: 330, w: 210, h: 240 },
  { x: 770, y: 330, w: 210, h: 240 },
];
export const VICTORY_REPLAY = { x: 640 - 130, y: 606, w: 260, h: 52 };
export const DEFEAT_RETRY = { x: 640 - 130, y: 560, w: 260, h: 52 };

function goldFrame(ctx, x, y, w, h, r) {
  ctx.fillStyle = 'rgba(10, 18, 44, 0.72)';
  roundRect(ctx, x, y, w, h, r || 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.25)';
  ctx.lineWidth = 5;
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, (r || 16) - 6);
  ctx.stroke();
}

function fitFont(ctx, text, maxWidth, startSize, weight) {
  let size = startSize;
  ctx.font = `${weight || 'bold'} ${size}px Georgia, serif`;
  while (size > 9 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${weight || 'bold'} ${size}px Georgia, serif`;
  }
  return size;
}

function goldButton(ctx, rect, label, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#c22f3d');
  g.addColorStop(0.5, '#a32734');
  g.addColorStop(1, '#7d1f28');
  ctx.fillStyle = g;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 211, 77, ${0.6 + 0.4 * pulse})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
}

export function drawTitle(ctx, S, t) {
  // Dim the world slightly behind the crest (keeps the live beams visible).
  ctx.fillStyle = 'rgba(5, 8, 24, 0.42)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  // Gilded crest.
  goldFrame(ctx, 330, 92, 620, 400, 20);
  // Crest emblem: prism + sun.
  ctx.save();
  ctx.translate(640, 168);
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(30, 18);
  ctx.lineTo(-30, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5fe8ff';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(16, 10);
  ctx.lineTo(-16, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, 'AETHER PRISM', 560, 52, 'bold');
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('AETHER PRISM', 640, 224);
  fitFont(ctx, '· TIDE OF SHADOWS ·', 560, 24, 'bold');
  ctx.fillStyle = '#5fe8ff';
  ctx.fillText('· TIDE OF SHADOWS ·', 640, 258);
  ctx.fillStyle = '#c9d6f2';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('Bend the lighthouse beam. Shatter the Void Leviathan.', 640, 292);
  ctx.fillText('Hold the Observatory through all 7 nights.', 640, 314);

  // Compact visual mechanics legend: 3 mini diagrams.
  const legends = [
    { icon: '◈', title: '1 · PLACE A PRISM', sub: 'Click a dock card, then a glowing pad' },
    { icon: '↻', title: '2 · ROTATE TO BEND', sub: 'Click a prism to turn the beam 45°' },
    { icon: '➤', title: '3 · TORPEDO & NOVA', sub: 'Blast fleets, detonate overloaded prisms' },
  ];
  legends.forEach((L, i) => {
    const x = 368 + i * 188;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, 336, 172, 96, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 190, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText(L.icon, x + 86, 362);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText(L.title, x + 86, 392);
    ctx.fillStyle = '#9db8e8';
    ctx.font = '10px Georgia, serif';
    const words = L.sub.split(' ');
    let line = '', ly = 410;
    for (const w of words) {
      if (ctx.measureText(line + w).width > 150) {
        ctx.fillText(line, x + 86, ly);
        line = '';
        ly += 12;
      }
      line += (line ? ' ' : '') + w;
    }
    ctx.fillText(line, x + 86, ly);
  });

  goldButton(ctx, TITLE_PLAY, '▶  PLAY', t);
  ctx.fillStyle = '#9db8e8';
  ctx.font = '12px Georgia, serif';
  ctx.fillText('Drag / click to build  ·  Keys 1–6 dock  ·  P pause  ·  M mute  ·  R restart', 640, 592);
  ctx.fillText('Win: shatter the Leviathan on Night 7.  Lose: the Core falls.', 640, 612);
}

export function drawMap(ctx, S, t) {
  ctx.fillStyle = 'rgba(5, 8, 24, 0.55)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffe9a8';
  fitFont(ctx, 'EXPEDITION MAP — NIGHT ' + S.night + ' CLEARED', 700, 30, 'bold');
  ctx.fillText('EXPEDITION MAP — NIGHT ' + S.night + ' CLEARED', 640, 52);
  ctx.fillStyle = '#9db8e8';
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Choose a route across the star-chart, then pick a boon for your network.', 640, 82);

  // Star-chart: route nodes with connecting constellation lines.
  ctx.strokeStyle = 'rgba(95, 232, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(640, 110);
  ctx.lineTo(425, 150);
  ctx.moveTo(640, 110);
  ctx.lineTo(640, 150);
  ctx.moveTo(640, 110);
  ctx.lineTo(855, 150);
  ctx.stroke();
  ctx.setLineDash([]);
  // Decorative stars.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 24; i++) {
    const sx = 180 + ((i * 197) % 920);
    const sy = 110 + ((i * 89) % 120);
    ctx.beginPath();
    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ROUTES.forEach((route, i) => {
    const r = MAP_NODE_RECTS[i];
    const selected = S.selectedRoute === i;
    ctx.fillStyle = selected ? 'rgba(255, 211, 77, 0.28)' : 'rgba(10, 18, 44, 0.72)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd34d' : route.color;
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = route.color;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(route.name, r.x + r.w / 2, r.y + 28);
    ctx.fillStyle = '#c9d6f2';
    ctx.font = '12px Georgia, serif';
    ctx.fillText(route.desc, r.x + r.w / 2, r.y + 52);
    if (selected) {
      ctx.fillStyle = '#ffd34d';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.fillText('◆ ROUTE SET ◆', r.x + r.w / 2, r.y + 72);
    }
  });

  // Boon cards: CHOOSE A BOON.
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('— CHOOSE A BOON —', 640, 296);
  S.boonChoices.forEach((relic, i) => {
    const r = MAP_BOON_RECTS[i];
    ctx.fillStyle = 'rgba(10, 18, 44, 0.78)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fill();
    ctx.strokeStyle = relic.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Emblem.
    ctx.fillStyle = relic.color;
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + 52, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#10182e';
    ctx.font = 'bold 26px Georgia, serif';
    const glyph = { dynamo: '☀', splitlens: '◈', burn: '♨', nova: '✦', bulwark: '⬢', overcharge: '⚡', rapid: '➤', anchor: '◎' }[relic.id] || '✦';
    ctx.fillText(glyph, r.x + r.w / 2, r.y + 53);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillText(relic.name, r.x + r.w / 2, r.y + 108);
    ctx.fillStyle = relic.color;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText(relic.tag, r.x + r.w / 2, r.y + 130);
    // Description, wrapped.
    ctx.fillStyle = '#c9d6f2';
    ctx.font = '12px Georgia, serif';
    const words = relic.desc.split(' ');
    let line = '', ly = r.y + 158;
    for (const w of words) {
      if (ctx.measureText(line + w).width > r.w - 32) {
        ctx.fillText(line, r.x + r.w / 2, ly);
        line = '';
        ly += 16;
      }
      line += (line ? ' ' : '') + w;
    }
    ctx.fillText(line, r.x + r.w / 2, ly);
    ctx.fillStyle = '#9db8e8';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('CLICK TO TAKE', r.x + r.w / 2, r.y + r.h - 20);
  });
  ctx.fillStyle = '#9db8e8';
  ctx.font = '12px Georgia, serif';
  ctx.fillText('The route modifier applies to the next night. Your boon joins the network at once.', 640, 596);
}

export function drawVictory(ctx, S, t) {
  ctx.fillStyle = 'rgba(255, 214, 130, 0.10)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = 'rgba(5, 8, 24, 0.55)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  goldFrame(ctx, 300, 56, 680, 530, 20);
  // Dawn rays behind the medal.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.28;
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.10)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(640, 150);
    ctx.lineTo(640 + Math.cos(a) * 260, 150 + Math.sin(a) * 260);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#ffe9a8';
  fitFont(ctx, 'DAWN BREAKS — VICTORY', 600, 34, 'bold');
  ctx.fillText('DAWN BREAKS — VICTORY', 640, 100);
  ctx.fillStyle = '#5fe8ff';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('The Void Leviathan is shattered. The archipelago wakes in sunlight.', 640, 128);

  // Rank S medal.
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.arc(640, 196, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#7d1f28';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(S.victoryRank, 640, 198);

  // Score breakdown table.
  const rows = [
    ['Final Score', Math.round(S.score).toLocaleString('en-US')],
    ['Nights survived', `${NIGHTS} / ${NIGHTS}`],
    ['Fleets sunk', `${S.kills}`],
    ['Beam damage dealt', `${Math.round(S.damageDealt).toLocaleString('en-US')}`],
    ['Torpedoes fired', `${S.torpedoesFired}`],
    ['Chain Novas', `${S.novasUsed}`],
    ['Boons held', `${S.relics.length}`],
    ['Core Integrity left', `${Math.ceil(S.core)} / ${S.coreMax}`],
  ];
  ctx.textAlign = 'left';
  let y = 268;
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(360, y - 13, 560, 24);
    }
    ctx.fillStyle = '#9db8e8';
    ctx.font = '13px Georgia, serif';
    ctx.fillText(k, 380, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(v, 900, y);
    ctx.textAlign = 'left';
    y += 24;
  });

  // Damage / combo timeline chart: bars per night + combo dots.
  const chartX = 380, chartY = 486, chartW = 540, chartH = 72;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, chartX - 10, chartY - 14, chartW + 20, chartH + 28, 8);
  ctx.fill();
  ctx.fillStyle = '#9db8e8';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('DAMAGE PER NIGHT', chartX, chartY - 4);
  const maxDmg = Math.max(1, ...S.nightStats.map((s) => s.damage));
  const bw = chartW / NIGHTS;
  S.nightStats.forEach((s, i) => {
    const h = clamp((s.damage / maxDmg) * (chartH - 8), 4, chartH - 8);
    ctx.fillStyle = i === NIGHTS - 1 ? '#ffd34d' : '#5fe8ff';
    ctx.fillRect(chartX + i * bw + 6, chartY + chartH - h, bw - 12, h);
    ctx.fillStyle = '#c9d6f2';
    ctx.font = '9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`N${i + 1}`, chartX + i * bw + bw / 2, chartY + chartH + 10);
  });
  // Combo line.
  ctx.strokeStyle = '#ff5f8f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const maxCombo = Math.max(1, ...S.nightStats.map((s) => s.maxCombo));
  S.nightStats.forEach((s, i) => {
    const px = chartX + i * bw + bw / 2;
    const py = chartY + chartH - clamp((s.maxCombo / maxCombo) * (chartH - 8), 4, chartH - 8);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.fillStyle = '#ff5f8f';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('— COMBO PEAK', chartX + chartW, chartY - 4);

  goldButton(ctx, VICTORY_REPLAY, '↻  PLAY AGAIN', t);
}

export function drawDefeat(ctx, S, t) {
  ctx.fillStyle = 'rgba(5, 8, 24, 0.62)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  goldFrame(ctx, 340, 150, 600, 380, 20);
  ctx.fillStyle = '#ff8fb0';
  fitFont(ctx, 'THE LIGHT GOES OUT', 520, 32, 'bold');
  ctx.fillText('THE LIGHT GOES OUT', 640, 208);
  ctx.fillStyle = '#c9d6f2';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('The Core has fallen. The Leviathan feasts in the dark.', 640, 244);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`SCORE  ${Math.round(S.score).toLocaleString('en-US')}`, 640, 300);
  ctx.fillStyle = '#9db8e8';
  ctx.font = '14px Georgia, serif';
  ctx.fillText(`Survived ${S.night - 1} of ${NIGHTS} nights  ·  ${S.kills} fleets sunk`, 640, 332);
  ctx.fillText(`Best combo x${(1 + Math.min(S.maxCombo, 28) * 0.25).toFixed(2)}  ·  ${S.relics.length} boons held`, 640, 356);
  goldButton(ctx, DEFEAT_RETRY, '↻  TRY AGAIN', t);
  ctx.fillStyle = '#9db8e8';
  ctx.font = '12px Georgia, serif';
  ctx.fillText('Press R to restart at once.', 640, 640 - 40);
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
