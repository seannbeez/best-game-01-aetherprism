// Aether Prism: Tide of Shadows — all tuning constants in one place.
// Canvas is a fixed 1280x720 full-bleed world; the page scales it to the window.

export const VIEW = { w: 1280, h: 720 };
export const CORE = { x: 640, y: 392, r: 74, max: 100 };
export const LIGHTHOUSE = { x: 640, y: 392, beamAngle: -0.42, beamDps: 30, beamRange: 1500 };

export const PRISM_TYPES = {
  prism:    { name: 'Optical Prism',  cost: 40, key: '1', color: '#5fe8ff', desc: 'Bends the beam to its angle. Damage x1.5.' },
  splitter: { name: 'Prism Splitter', cost: 60, key: '2', color: '#ffd34d', desc: 'Forks the beam into two. Each x0.6 damage.' },
  mirror:   { name: 'Tesla Mirror',   cost: 50, key: '3', color: '#c9a7ff', desc: 'Reflects the beam 90 degrees. Damage x1.2.' },
  well:     { name: 'Gravity Well',   cost: 70, key: '4', color: '#7dffb0', desc: 'Curves the beam toward it. Slows foes nearby.' },
};

export const DOCK = [
  { id: 'prism',    label: 'PRISM',    kind: 'build' },
  { id: 'splitter', label: 'SPLITTER', kind: 'build' },
  { id: 'mirror',   label: 'MIRROR',   kind: 'build' },
  { id: 'well',     label: 'WELL',     kind: 'build' },
  { id: 'torpedo',  label: 'TORPEDO',  kind: 'ability', cost: 25, cooldown: 6 },
  { id: 'nova',     label: 'CHAIN NOVA', kind: 'ability', cooldown: 12 },
];

// Enemy kinds: hp, speed (px/s), radius, bounty (energy), core damage on ram.
export const ENEMIES = {
  skiff:     { name: 'Shadow Skiff',    hp: 30,   speed: 36, r: 14, bounty: 12, dmg: 6,  score: 50 },
  wraith:    { name: 'Void Wraith',     hp: 75,   speed: 25, r: 18, bounty: 18, dmg: 10, score: 120 },
  galleon:   { name: 'Ironclad Galleon',hp: 170,  speed: 16, r: 25, bounty: 30, dmg: 16, score: 250 },
  leviathan: { name: 'Void Leviathan',  hp: 2600, speed: 11, r: 58, bounty: 220, dmg: 25, score: 5000 },
};

export const NIGHTS = 7;
export const START_ENERGY = 120;
export const ENERGY_REGEN = 3; // per second
export const TORPEDO_DAMAGE = 95;
export const TORPEDO_SPLASH = 45;
export const NOVA_DAMAGE = 170;
export const NOVA_RADIUS = 155;

export const RELICS = [
  { id: 'dynamo',   name: 'Solar Dynamo',    tag: '+2 Energy/s',  desc: 'The observatory hums louder. Energy regenerates +2/s.', color: '#ffd34d' },
  { id: 'splitlens',name: 'Split Lens',      tag: '+1 Split',     desc: 'Splitters fork the beam into THREE beams.', color: '#5fe8ff' },
  { id: 'burn',     name: 'Arcane Burn',     tag: 'Arcane Burn',  desc: 'Beam hits ignite foes: 6 damage/s for 3s.', color: '#ff7a59' },
  { id: 'nova',     name: 'Chain Nova',      tag: 'Chain Nova',   desc: 'Nova radius +60, damage +80, kills chain to neighbours.', color: '#ff5f8f' },
  { id: 'bulwark',  name: 'Reinforced Core', tag: '+40 Integrity',desc: 'Core Integrity +40 max and healed by 40 now.', color: '#7dffb0' },
  { id: 'overcharge',name: 'Overcharge Coil',tag: '+35% Beam',    desc: 'All beam damage +35%. Stacks twice.', color: '#c9a7ff' },
  { id: 'rapid',    name: 'Rapid Torpedo',   tag: 'Rapid Fire',   desc: 'Torpedo cooldown 6s to 3s, damage +45.', color: '#8fd0ff' },
  { id: 'anchor',   name: 'Gravity Anchor',  tag: 'Deep Well',    desc: 'Wells slow foes 55% and reach +40px further.', color: '#9dffd9' },
];

export const ROUTES = [
  { id: 'storm', name: 'Storm Surge',  desc: '+25% foes, +35% bounty', foes: 1.25, bounty: 1.35, color: '#ff8a5c' },
  { id: 'calm',  name: 'Calm Seas',    desc: '-20% foes, -10% bounty', foes: 0.8, bounty: 0.9, color: '#7dffb0' },
  { id: 'wreck', name: 'Rich Wreck',   desc: '+70 energy now', foes: 1.0, bounty: 1.0, energy: 70, color: '#ffd34d' },
];

export const PALETTE = {
  seaTop: '#0d1538', seaMid: '#0a2438', seaDeep: '#071426',
  gold: '#ffd34d', cyan: '#5fe8ff', violet: '#c9a7ff', ember: '#ff7a59',
  ink: '#1e293b', panel: 'rgba(10, 18, 44, 0.62)', panelEdge: 'rgba(140, 190, 255, 0.28)',
};
