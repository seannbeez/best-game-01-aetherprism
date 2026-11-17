// AETHER PRISM: TIDE OF SHADOWS — game loop, state machine, waves, economy.
// Screens: title -> play (nights 1-7) -> map (route + boon) -> ... -> victory/defeat.
// The beam network is live: placing or rotating a prism rewires it at once.

import { VIEW, CORE, LIGHTHOUSE, PRISM_TYPES, DOCK, ENEMIES, NIGHTS, START_ENERGY, ENERGY_REGEN, TORPEDO_DAMAGE, TORPEDO_SPLASH, NOVA_DAMAGE, NOVA_RADIUS, RELICS, ROUTES } from './config.js';
import { mulberry32, shuffle, clamp } from './random.js';
import { SoundBank } from './audio.js';
import { drawWorld, PADS } from './world.js';
import { traceBeams, applyBeamDamage, drawBeams } from './beam.js';
import { makeEnemy, nightQueue, spawnPoint, updateEnemies, drawEnemies } from './enemies.js';
import { padAt, prismAt, placePrism, rotatePrism, sellPrism, drawPads, drawPrisms } from './prisms.js';
import { spawnBurst, spawnFlash, addCallout, updateEffects, drawParticles, drawFlashes, drawCallouts } from './effects.js';
import { drawHud, drawLeftPanel, drawRightPanel, drawDock, drawRadar, roundRect } from './hud.js';
import { drawTitle, drawMap, drawVictory, drawDefeat, TITLE_PLAY, MAP_NODE_RECTS, MAP_BOON_RECTS, VICTORY_REPLAY, DEFEAT_RETRY, pointInRect } from './screens.js';
import { Input } from './input.js';

const KILL_CALLOUTS = ['SHATTER -68!', 'REFRACT x4!', 'PRISM SHATTER! -84', 'BEAM SUNDERED!', 'VOID CLEAVED!'];

function freshState() {
  return {
    screen: 'title',
    paused: false,
    time: 0,
    fps: 60,
    night: 1,
    score: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    energy: START_ENERGY,
    energyRegen: ENERGY_REGEN,
    core: CORE.max,
    coreMax: CORE.max,
    kills: 0,
    damageDealt: 0,
    torpedoesFired: 0,
    novasUsed: 0,
    prisms: [],
    enemies: [],
    projectiles: [],
    particles: [],
    flashes: [],
    callouts: [],
    spawnQueue: [],
    spawnTimer: 1,
    spawnInterval: 2.0,
    waveKills: 0,
    waveTotal: 0,
    relics: [],
    relicCounts: {},
    routeMod: { foes: 1, bounty: 1, energy: 0 },
    selectedRoute: -1,
    boonChoices: [],
    nightStats: [],
    selectedDock: -1,
    hoverPad: -1,
    cooldowns: { torpedo: 0, nova: 0 },
    victoryRank: 'S',
    bossSpawned: false,
    bossTimer: 0,
    attract: false,
  };
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.S = freshState();
    this.sound = new SoundBank();
    this.input = new Input(canvas, this);
    this.rng = mulberry32((Date.now() % 100000) + 7);
    this.lastTs = 0;
    this.shotParam = new URLSearchParams(window.location.search).get('shot');
    if (this.shotParam) this.setupStagedScene(this.shotParam);
    else this.setupAttract();
    const loop = (ts) => {
      const dt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0.016);
      this.lastTs = ts;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---------- run lifecycle ----------

  setupAttract() {
    const S = this.S;
    S.attract = true;
    // A living demo network behind the title crest: the beam chains
    // lighthouse -> pad6 -> pad0 so the web is visible, not a single ray.
    const ang = (a, b) => Math.atan2(PADS[b].y - PADS[a].y, PADS[b].x - PADS[a].x);
    const demo = [
      { type: 'prism', pad: 6, angle: ang(6, 0) },
      { type: 'prism', pad: 0, angle: ang(0, 2) },
      { type: 'splitter', pad: 1, angle: -0.6 },
      { type: 'mirror', pad: 7, angle: 0.9 },
    ];
    for (const d of demo) {
      const pad = PADS[d.pad];
      S.prisms.push({ id: 100 + d.pad, type: d.type, pad: d.pad, x: pad.x, y: pad.y, angle: d.angle, born: 0 });
    }
    const deco = [['skiff', 300, 500], ['wraith', 980, 420], ['skiff', 760, 180], ['galleon', 420, 620]];
    for (const [kind, x, y] of deco) {
      const e = makeEnemy(kind, x, y);
      e.speed = 0;
      S.enemies.push(e);
    }
  }

  startRun() {
    this.S = freshState();
    this.sound.ensure();
    this.sound.horn();
    this.startNight(1);
  }

  startNight(n) {
    const S = this.S;
    S.night = n;
    S.screen = 'play';
    S.bossSpawned = false;
    S.bossTimer = 0;
    const q = nightQueue(n, this.rng);
    const scaled = Math.max(1, Math.round(q.length * S.routeMod.foes));
    S.spawnQueue = q.slice(0, scaled);
    if (n === NIGHTS) {
      // The Leviathan leads the final night.
      S.spawnQueue.unshift('leviathan');
    }
    S.waveTotal = S.spawnQueue.length;
    S.waveKills = 0;
    S.spawnInterval = Math.max(0.7, 2.3 - n * 0.18);
    S.spawnTimer = 0.8;
    if (S.routeMod.energy) {
      S.energy += S.routeMod.energy;
      S.routeMod.energy = 0;
    }
  }

  onNightCleared() {
    const S = this.S;
    S.nightStats.push({ night: S.night, damage: Math.round(S.damageDealt), kills: S.kills, maxCombo: S.maxCombo });
    // Roll 3 distinct boons from the pool (stackable ones may repeat).
    const pool = RELICS.filter((r) => !S.relics.includes(r.id) || r.id === 'overcharge');
    S.boonChoices = shuffle(this.rng, pool).slice(0, 3);
    S.selectedRoute = -1;
    S.screen = 'map';
    S.selectedDock = -1;
    this.sound.horn();
  }

  pickBoon(i) {
    const S = this.S;
    const relic = S.boonChoices[i];
    if (!relic) return;
    S.relics.push(relic.id);
    S.relicCounts[relic.id] = (S.relicCounts[relic.id] || 0) + 1;
    if (relic.id === 'bulwark') {
      S.coreMax += 40;
      S.core = Math.min(S.coreMax, S.core + 40);
    }
    if (relic.id === 'dynamo') S.energyRegen += 2;
    // Route modifier from the selected node (default: first route).
    const route = ROUTES[S.selectedRoute >= 0 ? S.selectedRoute : 0];
    S.routeMod = { foes: route.foes, bounty: route.bounty, energy: route.energy || 0 };
    this.sound.place();
    this.startNight(S.night + 1);
  }

  reachVictory() {
    const S = this.S;
    S.nightStats.push({ night: NIGHTS, damage: Math.round(S.damageDealt), kills: S.kills, maxCombo: S.maxCombo });
    S.victoryRank = S.score >= 20000 ? 'S' : S.score >= 12000 ? 'A' : 'B';
    S.screen = 'victory';
    S.selectedDock = -1;
    this.sound.victory();
  }

  reachDefeat() {
    const S = this.S;
    S.screen = 'defeat';
    S.selectedDock = -1;
    this.sound.defeat();
  }

  restart() {
    this.startRun();
  }

  // ---------- combat ----------

  comboMult() {
    return 1 + Math.min(this.S.combo, 28) * 0.25;
  }

  damageEnemy(e, dmg, source) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    e.flash = 0.12;
    this.S.damageDealt += dmg;
    this.S.score += dmg * 0.5 * this.comboMult();
    if (e.hp <= 0) this.killEnemy(e, source);
  }

  killEnemy(e, source) {
    const S = this.S;
    if (e.counted) return;
    e.counted = true;
    // Dead foes leave the sea at once: the night-clear check, the threat
    // queue, and the beam trace all count live enemies only.
    S.enemies = S.enemies.filter((q) => q.id !== e.id);
    S.kills++;
    S.waveKills++;
    S.combo++;
    S.comboTimer = 3;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    const bounty = Math.round(e.bounty * S.routeMod.bounty);
    S.energy += bounty;
    S.score += e.score * this.comboMult();
    spawnBurst(S, e.x, e.y, e.kind === 'leviathan' ? '#ff5f8f' : '#5fe8ff', e.kind === 'leviathan' ? 40 : 14, 160);
    spawnFlash(S, e.x, e.y, '#ffffff');
    const callout = e.kind === 'leviathan'
      ? 'PRISM SHATTER! -84'
      : source === 'nova' ? 'CHAIN x12'
      : KILL_CALLOUTS[Math.floor(Math.random() * KILL_CALLOUTS.length)];
    addCallout(S, e.x, e.y - 10, callout, e.kind === 'leviathan' ? '#ff5f8f' : '#ffd34d');
    this.sound.shatter();
    // Nova chain: a nova kill bursts its neighbours (one level only).
    if (source === 'nova' && S.relicCounts.nova) {
      for (const other of S.enemies.slice()) {
        if (other === e || other.hp <= 0) continue;
        if (Math.hypot(other.x - e.x, other.y - e.y) < 90) {
          this.damageEnemy(other, 60, 'chain');
        }
      }
    }
    if (e.kind === 'leviathan') {
      addCallout(S, e.x, e.y - 70, 'TRI-BEAM OVERLOAD!', '#5fe8ff');
      this.reachVictory();
    }
  }

  fireTorpedo(x, y) {
    const S = this.S;
    if (S.cooldowns.torpedo > 0 || S.energy < 25) return false;
    S.energy -= 25;
    S.cooldowns.torpedo = S.relicCounts.rapid ? 3 : 6;
    S.torpedoesFired++;
    S.projectiles.push({
      x: LIGHTHOUSE.x, y: LIGHTHOUSE.y - 34,
      tx: x, ty: y,
      speed: 480,
      damage: TORPEDO_DAMAGE + (S.relicCounts.rapid ? 45 : 0),
    });
    this.sound.torpedo();
    return true;
  }

  detonateAt(x, y) {
    const S = this.S;
    if (S.cooldowns.nova > 0) return false;
    const p = prismAt(S, x, y);
    if (!p) return false;
    S.cooldowns.nova = 12;
    S.novasUsed++;
    const radius = NOVA_RADIUS + (S.relicCounts.nova ? 60 : 0);
    const dmg = NOVA_DAMAGE + (S.relicCounts.nova ? 80 : 0);
    spawnBurst(S, p.x, p.y, '#ff5f8f', 36, 260);
    spawnFlash(S, p.x, p.y, '#ff5f8f');
    addCallout(S, p.x, p.y - 20, 'CHAIN NOVA!', '#ff5f8f');
    this.sound.nova();
    S.prisms = S.prisms.filter((q) => q.id !== p.id);
    for (const e of S.enemies.slice()) {
      if (Math.hypot(e.x - p.x, e.y - p.y) < radius) this.damageEnemy(e, dmg, 'nova');
    }
    return true;
  }

  // ---------- update ----------

  update(dt) {
    const S = this.S;
    if (S.paused) return;
    S.time += dt;
    S.fps = S.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;

    // Cooldowns + combo decay always tick on the play screen.
    if (S.screen === 'play') {
      for (const k of Object.keys(S.cooldowns)) {
        if (S.cooldowns[k] > 0) S.cooldowns[k] -= dt;
      }
      if (S.comboTimer > 0) {
        S.comboTimer -= dt;
        if (S.comboTimer <= 0) S.combo = 0;
      }
      S.energy = Math.min(999, S.energy + S.energyRegen * dt);
    }

    if (S.screen === 'title') {
      // Attract mode: enemies drift, beams stay live, no combat.
      for (const e of S.enemies) {
        e.x += Math.cos(S.time * 0.4 + e.wobble) * 6 * dt;
        e.y += Math.sin(S.time * 0.3 + e.wobble) * 6 * dt;
      }
      updateEffects(S, dt);
      return;
    }
    if (S.screen !== 'play') {
      updateEffects(S, dt);
      return;
    }

    // Spawning.
    if (S.spawnQueue.length > 0) {
      S.spawnTimer -= dt;
      if (S.spawnTimer <= 0) {
        S.spawnTimer = S.spawnInterval;
        const kind = S.spawnQueue.shift();
        const pt = spawnPoint(this.rng);
        const e = makeEnemy(kind, pt.x, pt.y);
        S.enemies.push(e);
        if (kind === 'leviathan') {
          S.bossSpawned = true;
          S.bossTimer = 12;
          addCallout(S, e.x, e.y - 40, 'THE LEVIATHAN WAKES!', '#ff5f8f');
        }
      }
    }

    // Boss spawns a wraith escort every 12s while it lives.
    const boss = S.enemies.find((e) => e.kind === 'leviathan');
    if (boss) {
      S.bossTimer -= dt;
      if (S.bossTimer <= 0) {
        S.bossTimer = 12;
        const w = makeEnemy('wraith', boss.x + 80, boss.y + 40);
        S.enemies.push(w);
      }
    }

    // Beams: trace, damage, score.
    const segs = traceBeams(S);
    S.segments = segs;
    const dealt = applyBeamDamage(S, segs, dt);
    if (dealt > 0) {
      S.damageDealt += dealt;
      S.score += dealt * 0.5 * this.comboMult();
    }
    // Sweep beam/burn deaths.
    for (const e of S.enemies.slice()) {
      if (e.hp <= 0 && !e.counted) this.killEnemy(e, 'beam');
    }

    updateEnemies(S, dt, S.time);

    // Projectiles (torpedoes).
    for (const pr of S.projectiles) {
      const dx = pr.tx - pr.x, dy = pr.ty - pr.y;
      const d = Math.hypot(dx, dy);
      const step = pr.speed * dt;
      if (d <= step + 8) {
        pr.done = true;
        spawnBurst(S, pr.tx, pr.ty, '#8fd0ff', 22, 200);
        spawnFlash(S, pr.tx, pr.ty, '#8fd0ff');
        addCallout(S, pr.tx, pr.ty - 14, 'TORPEDO HIT!', '#8fd0ff');
        for (const e of S.enemies.slice()) {
          const ed = Math.hypot(e.x - pr.tx, e.y - pr.ty);
          if (ed < 46) this.damageEnemy(e, pr.damage, 'torpedo');
          else if (ed < 120) this.damageEnemy(e, TORPEDO_SPLASH, 'torpedo');
        }
        this.sound.hit();
      } else {
        pr.x += (dx / d) * step;
        pr.y += (dy / d) * step;
      }
    }
    S.projectiles = S.projectiles.filter((p) => !p.done);

    // Ram the Core.
    for (const e of S.enemies.slice()) {
      if (Math.hypot(e.x - CORE.x, e.y - CORE.y) < CORE.r + e.r - 8) {
        S.core -= e.dmg;
        S.combo = 0;
        spawnBurst(S, e.x, e.y, '#ff5f6d', 18, 180);
        addCallout(S, e.x, e.y - 16, `CORE HIT! -${e.dmg}`, '#ff5f6d');
        S.enemies = S.enemies.filter((q) => q.id !== e.id);
        this.sound.hit();
        if (S.core <= 0) {
          S.core = 0;
          this.reachDefeat();
          return;
        }
      }
    }

    updateEffects(S, dt);

    // Night cleared: queue empty and sea empty.
    if (S.spawnQueue.length === 0 && S.enemies.length === 0 && S.screen === 'play') {
      if (S.night >= NIGHTS) {
        // Boss was the last one; victory already fired in killEnemy.
        return;
      }
      this.onNightCleared();
    }
  }

  // ---------- render ----------

  render() {
    const S = this.S;
    const ctx = this.ctx;
    const t = S.time;
    drawWorld(ctx, S, t);
    drawPads(ctx, S, t);
    drawPrisms(ctx, S, t);
    const segs = S.segments || traceBeams(S);
    drawBeams(ctx, segs, t);
    drawEnemies(ctx, S, t);
    // Torpedoes.
    for (const pr of S.projectiles) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#8fd0ff';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(143, 208, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y);
      ctx.lineTo(pr.x - (pr.tx - pr.x) * 0.05, pr.y - (pr.ty - pr.y) * 0.05);
      ctx.stroke();
      ctx.restore();
    }
    drawParticles(ctx, S);
    drawFlashes(ctx, S);
    drawCallouts(ctx, S);

    if (S.screen === 'play') {
      drawHud(ctx, S, t);
      if (S.paused) {
        ctx.fillStyle = 'rgba(10, 18, 44, 0.66)';
        roundRect(ctx, 520, 330, 240, 52, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 211, 77, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED — press P', 640, 357);
      }
      // Armed-card hint.
      if (S.selectedDock >= 0) {
        const card = DOCK[S.selectedDock];
        ctx.fillStyle = 'rgba(10, 18, 44, 0.66)';
        roundRect(ctx, 440, 600, 400, 28, 14);
        ctx.fill();
        ctx.fillStyle = '#ffd34d';
        ctx.font = 'bold 12px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const hint = card.kind === 'build'
          ? `${card.label} armed — click a glowing pad to place it`
          : card.id === 'torpedo'
            ? 'TORPEDO armed — click the sea to fire'
            : 'CHAIN NOVA armed — click one of your prisms to detonate it';
        ctx.fillText(hint, 640, 615);
      }
    } else if (S.screen === 'title') {
      drawTitle(ctx, S, t);
    } else if (S.screen === 'map') {
      // No top bar on the map screen: the map title sits where it would be.
      drawLeftPanel(ctx, S);
      drawRightPanel(ctx, S);
      drawDock(ctx, S, t);
      drawRadar(ctx, S, t);
      drawMap(ctx, S, t);
    } else if (S.screen === 'victory') {
      drawVictory(ctx, S, t);
    } else if (S.screen === 'defeat') {
      drawDefeat(ctx, S, t);
    }
  }

  // ---------- input ----------

  dockRect(i) {
    const cardW = 92, cardH = 66, gap = 8;
    const total = DOCK.length * cardW + (DOCK.length - 1) * gap;
    const x0 = (VIEW.w - total) / 2;
    return { x: x0 + i * (cardW + gap), y: 640, w: cardW, h: cardH };
  }

  handlePointerDown(x, y, shift) {
    const S = this.S;
    this.sound.ensure();
    if (S.screen === 'title') {
      if (pointInRect(x, y, TITLE_PLAY)) this.startRun();
      return;
    }
    if (S.screen === 'victory') {
      if (pointInRect(x, y, VICTORY_REPLAY)) this.restart();
      return;
    }
    if (S.screen === 'defeat') {
      if (pointInRect(x, y, DEFEAT_RETRY)) this.restart();
      return;
    }
    if (S.screen === 'map') {
      for (let i = 0; i < MAP_NODE_RECTS.length; i++) {
        if (pointInRect(x, y, MAP_NODE_RECTS[i])) {
          S.selectedRoute = i;
          this.sound.rotate();
          return;
        }
      }
      for (let i = 0; i < MAP_BOON_RECTS.length; i++) {
        if (pointInRect(x, y, MAP_BOON_RECTS[i])) {
          this.pickBoon(i);
          return;
        }
      }
      return;
    }
    if (S.screen !== 'play' || S.paused) return;
    // Dock cards first.
    for (let i = 0; i < DOCK.length; i++) {
      if (pointInRect(x, y, this.dockRect(i))) {
        this.armDock(i);
        return;
      }
    }
    const dock = S.selectedDock;
    if (dock >= 0 && dock <= 3) {
      const pad = padAt(x, y);
      if (pad >= 0) {
        const placed = placePrism(S, DOCK[dock].id, pad);
        if (placed) {
          this.sound.place();
          spawnBurst(S, placed.x, placed.y, PRISM_TYPES[placed.type].color, 10, 90);
          S.selectedDock = -1;
        } else {
          addCallout(S, x, y - 20, S.energy < PRISM_TYPES[DOCK[dock].id].cost ? 'NOT ENOUGH ENERGY!' : 'PAD TAKEN!', '#ff9d9d');
        }
      } else {
        S.selectedDock = -1;
      }
      return;
    }
    if (dock === 4) {
      if (this.fireTorpedo(x, y)) S.selectedDock = -1;
      return;
    }
    if (dock === 5) {
      if (this.detonateAt(x, y)) S.selectedDock = -1;
      return;
    }
    // No card armed: click a prism to rotate, Shift-click to sell.
    const p = prismAt(S, x, y);
    if (p) {
      if (shift) {
        sellPrism(S, p);
        this.sound.rotate();
      } else {
        rotatePrism(p);
        this.sound.rotate();
        spawnFlash(S, p.x, p.y, PRISM_TYPES[p.type].color);
      }
    }
  }

  handlePointerMove(x, y) {
    const S = this.S;
    S.hoverPad = S.screen === 'play' ? padAt(x, y) : -1;
  }

  armDock(i) {
    const S = this.S;
    if (S.selectedDock === i) {
      S.selectedDock = -1;
      return;
    }
    const card = DOCK[i];
    if (card.kind === 'ability') {
      if (card.id === 'torpedo' && (S.cooldowns.torpedo > 0 || S.energy < 25)) return;
      if (card.id === 'nova' && S.cooldowns.nova > 0) return;
    } else if (S.energy < PRISM_TYPES[card.id].cost) {
      return;
    }
    S.selectedDock = i;
    this.sound.rotate();
  }

  handleKey(key) {
    const S = this.S;
    if (key >= '1' && key <= '6') {
      if (S.screen === 'play' && !S.paused) this.armDock(Number(key) - 1);
      return;
    }
    if (key === 'p') {
      if (S.screen === 'play') S.paused = !S.paused;
      return;
    }
    if (key === 'm') {
      this.sound.ensure();
      this.sound.toggleMute();
      return;
    }
    if (key === 'r') {
      if (S.screen !== 'title') this.restart();
      return;
    }
    if (key === 'escape') S.selectedDock = -1;
  }

  // ---------- staged scenes for screenshots ----------

  setupStagedScene(kind) {
    const S = this.S;
    S.attract = false;
    if (kind === 'title') {
      this.setupAttract();
      S.screen = 'title';
      return;
    }
    if (kind === 'battle') {
      S.screen = 'play';
      S.night = 6;
      S.score = 12480;
      S.combo = 32;
      S.comboTimer = 3;
      S.maxCombo = 32;
      S.energy = 140;
      S.core = 82;
      S.relics = ['dynamo', 'splitlens', 'burn', 'anchor'];
      for (const id of S.relics) S.relicCounts[id] = 1;
      S.energyRegen = 5; // dynamo held
      // Beam chain, angles computed pad-to-pad so the web crosses the board:
      // lighthouse -> pad6 -> pad0 -> pad2 -> pad8 (splitter) -> pad1 (splitter).
      const ang = (a, b) => Math.atan2(PADS[b].y - PADS[a].y, PADS[b].x - PADS[a].x);
      const staged = [
        { type: 'prism', pad: 6, angle: ang(6, 0) },
        { type: 'prism', pad: 0, angle: ang(0, 2) },
        { type: 'prism', pad: 2, angle: ang(2, 8) },
        { type: 'splitter', pad: 8, angle: 0.04 },
        { type: 'splitter', pad: 1, angle: 2.4 },
        { type: 'prism', pad: 9, angle: ang(9, 3) },
        { type: 'well', pad: 5, angle: 0 },
      ];
      for (const d of staged) {
        const pad = PADS[d.pad];
        S.prisms.push({ id: 200 + d.pad, type: d.type, pad: d.pad, x: pad.x, y: pad.y, angle: d.angle, born: 0 });
      }
      const boss = makeEnemy('leviathan', 700, 210);
      boss.hp = 1840;
      S.enemies.push(boss);
      const foes = [['galleon', 420, 520], ['wraith', 880, 480], ['skiff', 300, 340], ['wraith', 980, 300], ['skiff', 520, 180], ['galleon', 1080, 560], ['skiff', 180, 620], ['wraith', 760, 620]];
      for (const [k, x, y] of foes) S.enemies.push(makeEnemy(k, x, y));
      S.spawnQueue = ['skiff', 'wraith', 'galleon', 'skiff', 'wraith'];
      S.waveTotal = 18;
      S.waveKills = 13;
      S.segments = traceBeams(S);
      // Callouts sit clear of the boss's face (boss at 700, 210).
      addCallout(S, 420, 240, 'PRISM SHATTER! -84', '#ff5f8f');
      addCallout(S, 480, 470, 'TRI-BEAM OVERLOAD!', '#5fe8ff');
      addCallout(S, 900, 560, 'CHAIN x12', '#ffd34d');
      spawnFlash(S, 700, 330, '#ffffff');
      return;
    }
    if (kind === 'map') {
      S.screen = 'map';
      S.night = 3;
      S.score = 6840;
      S.combo = 0;
      S.energy = 96;
      S.core = 74;
      S.relics = ['dynamo', 'burn'];
      for (const id of S.relics) S.relicCounts[id] = 1;
      S.energyRegen = 5; // dynamo held
      S.waveKills = 15;
      S.waveTotal = 15;
      S.nightStats = [
        { night: 1, damage: 2400, kills: 9, maxCombo: 6 },
        { night: 2, damage: 5200, kills: 12, maxCombo: 11 },
        { night: 3, damage: 9100, kills: 15, maxCombo: 14 },
      ];
      const demo = [
        { type: 'prism', pad: 0, angle: 0.5 },
        { type: 'splitter', pad: 1, angle: -0.6 },
        { type: 'mirror', pad: 6, angle: 0.9 },
      ];
      for (const d of demo) {
        const pad = PADS[d.pad];
        S.prisms.push({ id: 300 + d.pad, type: d.type, pad: d.pad, x: pad.x, y: pad.y, angle: d.angle, born: 0 });
      }
      S.boonChoices = [RELICS[3], RELICS[5], RELICS[1]];
      S.selectedRoute = 0;
      S.segments = traceBeams(S);
      return;
    }
    if (kind === 'victory') {
      S.screen = 'victory';
      S.night = 7;
      S.score = 24860;
      S.kills = 142;
      S.damageDealt = 48200;
      S.torpedoesFired = 18;
      S.novasUsed = 6;
      S.core = 64;
      S.maxCombo = 32;
      S.relics = ['dynamo', 'splitlens', 'burn', 'anchor', 'overcharge'];
      for (const id of S.relics) S.relicCounts[id] = 1;
      S.nightStats = [
        { night: 1, damage: 2400, kills: 9, maxCombo: 6 },
        { night: 2, damage: 5200, kills: 12, maxCombo: 11 },
        { night: 3, damage: 9100, kills: 15, maxCombo: 14 },
        { night: 4, damage: 12400, kills: 19, maxCombo: 18 },
        { night: 5, damage: 16800, kills: 24, maxCombo: 22 },
        { night: 6, damage: 21300, kills: 27, maxCombo: 26 },
        { night: 7, damage: 48200, kills: 28, maxCombo: 32 },
      ];
      S.victoryRank = 'S';
      return;
    }
  }

  shotReady() {
    return true;
  }
}

// Boot.
const canvas = document.getElementById('game');
const game = new Game(canvas);
// NOTE: `state` is a getter, not a snapshot — startRun() replaces game.S, and
// the test handle must always read the live state object.
window.__game = {
  get state() { return game.S; },
  shotReady: () => game.shotReady(),
  start: () => game.startRun(),
  restart: () => game.restart(),
  arm: (i) => game.armDock(i),
  place: (type, pad) => placePrism(game.S, type, pad),
  rotateAt: (x, y) => { const p = prismAt(game.S, x, y); if (p) rotatePrism(p); },
  fireTorpedoAt: (x, y) => game.fireTorpedo(x, y),
  detonateAt: (x, y) => game.detonateAt(x, y),
  pickNode: (i) => { game.S.selectedRoute = i; },
  pickBoon: (i) => game.pickBoon(i),
  warp: (night) => game.startNight(night),
};
