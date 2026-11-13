/* Mayar's Adventure — 15-stage canvas platformer.
   All artwork is the supplied original art, loaded from ./game/*.png and drawn
   without recolouring, redrawing or regeneration.                                     */

const VIEW = { w: 1280, h: 720 };
const SAVE_KEY = "mayar.adventure.v2";
// older saves are migrated on first load so nobody loses progress
const LEGACY_KEYS = ["mayar.cosmic.adventure.v2", "mayar.cosmic.adventure.v1"];

/* ---------------------------------------------------------------- artwork -- */
const ISL = [
  { file: "island0.png",  w: 539, h: 308, surfY: 69, left: 58, right: 502 },
  { file: "island1.png",  w: 541, h: 358, surfY: 78, left: 54, right: 508 },
  { file: "island2.png",  w: 469, h: 353, surfY: 84, left: 80, right: 454 },
  { file: "island3.png",  w: 329, h: 257, surfY: 58, left: 46, right: 302 },
  { file: "island4.png",  w: 692, h: 241, surfY: 17, left: 74, right: 656 },
  { file: "island5.png",  w: 277, h: 229, surfY: 33, left: 31, right: 230 },
  { file: "island6.png",  w: 229, h: 196, surfY: 60, left: 22, right: 226 },
  { file: "island7.png",  w: 161, h: 250, surfY: 9,  left: 28, right: 148 },
  { file: "island8.png",  w: 442, h: 259, surfY: 37, left: 31, right: 413 },
  { file: "island9.png",  w: 373, h: 218, surfY: 3,  left: 30, right: 355 },
  { file: "island10.png", w: 488, h: 324, surfY: 92, left: 61, right: 426 },
];

const MAYAR = {
  idle:     { file: "mayar_idle.png", zoom: 0.52 },
  run1: { file: "mayar_run1.png" }, run2: { file: "mayar_run2.png" },
  run3: { file: "mayar_run3.png" }, run4: { file: "mayar_run4.png" },
  run5: { file: "mayar_run5.png" },
  jumpRise: { file: "mayar_jumpRise.png" },
  jumpPeak: { file: "mayar_jumpPeak.png" },
  jumpFall: { file: "mayar_jumpFall.png" },
  land1: { file: "mayar_land1.png" },
  land2: { file: "mayar_land2.png" },
};

const ART = {
  coin: "coin.png", robot: "robot.png", crawler: "crawler.png",
  ship: "ship.png", rocket: "rocket.png", star: "star.png",
  spacebg: "spacebg.jpg",   // the approved space backdrop, used as the sky layer
};

const IMG = {};
const CHAR_SCALE = 0.45;

/* ----------------------------------------------------------------- skills -- */
const SKILLS = [
  { id: "magnet",     name: "Star Magnet",   max: 3, cost: 70,  desc: "Coins fly to Mayar from much farther away." },
  { id: "doubleJump", name: "Double Jump",   max: 3, cost: 110, desc: "Extra jumps while in mid-air." },
  { id: "booster",    name: "Coin Booster",  max: 3, cost: 75,  desc: "Every star coin is worth more." },
  { id: "swift",      name: "Swift Boots",   max: 3, cost: 100, desc: "Mayar runs faster across the islands." },
  { id: "glide",      name: "Star Glider",   max: 3, cost: 130, desc: "Hold jump while falling to glide gently." },
  { id: "shield",     name: "Star Shield", max: 3, cost: 150, desc: "Absorbs hits at the start of every stage." },
];

function skillLevel(id) {
  const s = SKILLS.find((x) => x.id === id);
  const v = progress.skills[id];
  const n = typeof v === "number" ? v : (v ? 1 : 0);
  return clamp(n, 0, s ? s.max : 3);
}
function skillCost(s, nextLevel) {
  return Math.round(s.cost * (1 + 0.55 * (nextLevel - 1)));
}

/* ------------------------------------------------------------------ levels -- */
const THEMES = [
  { pool: [1, 5, 8],        name: "Starfall Bay" },
  { pool: [1, 8, 6],        name: "Cobalt Drift" },
  { pool: [8, 5, 1],        name: "Nebula Steps" },
  { pool: [0, 3, 6],        name: "Frostlight" },
  { pool: [3, 0, 8],        name: "Echo Canyons" },
  { pool: [4, 8, 3],        name: "Signal Ridge" },
  { pool: [9, 2, 6],        name: "Ember Shores" },
  { pool: [2, 9, 1],        name: "Dust and Comets" },
  { pool: [4, 0, 3],        name: "The Long Jump" },
  { pool: [0, 8, 5],        name: "Orbit Break" },
  { pool: [2, 9, 8],        name: "Solar Lattice" },
  { pool: [4, 3, 0],        name: "Void Windows" },
  { pool: [9, 4, 8, 1],     name: "Comet Gauntlet" },
  { pool: [0, 4, 3, 9],     name: "Ring Runner" },
  { pool: [9, 0, 4, 8, 2],  name: "Heart of the Galaxy" },
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function placePlatform(idx, walkWidth, solidX, surfaceY) {
  const m = ISL[idx];
  const s = walkWidth / (m.right - m.left);
  return {
    m, s, idx, walkWidth,
    solid: { x: solidX, y: surfaceY, w: walkWidth, h: 76 },
    drawX: solidX - m.left * s,
    drawY: surfaceY - m.surfY * s,
    drawW: m.w * s,
    drawH: m.h * s,
    surfaceY,
  };
}

function makeLevel(n) {
  const rng = mulberry32(9176 + n * 7919);
  const d = (n - 1) / 14;
  const theme = THEMES[n - 1];
  const pool = theme.pool;

  const platforms = [], coins = [], enemies = [], drones = [], ships = [];

  const first = placePlatform(pool[0], 430 + rng() * 90, 90, 520);
  platforms.push(first);
  let prev = first;

  const extra = 4 + Math.round(d * 7);
  for (let i = 0; i < extra; i++) {
    const idx = pool[Math.floor(rng() * pool.length)];
    const last = i === extra - 1;
    let walk = Math.max(250, 330 - d * 34 + rng() * 120);
    if (last) walk = 390 + rng() * 70;
    let rise = (rng() * 2 - 1) * (42 + d * 56);
    if (last) rise = (rng() * 2 - 1) * 40;
    const ny = clamp(prev.surfaceY - rise, 300, 520);
    const up = prev.surfaceY - ny;
    const reach = 128 + d * 62;
    const maxGap = up > 0 ? Math.max(112, reach - rise * 0.85) : Math.max(180, reach + 40 + rise * 0.4);
    const gap = 70 + rng() * (maxGap - 70);
    const solidX = prev.solid.x + prev.solid.w + gap;
    const plat = placePlatform(idx, walk, solidX, ny);
    platforms.push(plat);

    const gx0 = prev.solid.x + prev.solid.w, gx1 = plat.solid.x;
    const arcY = Math.min(prev.surfaceY, plat.surfaceY) - 118;
    coins.push({ x: lerp(gx0, gx1, 0.34), y: arcY - 14, ph: rng() * 6 });
    coins.push({ x: lerp(gx0, gx1, 0.66), y: arcY - 34, ph: rng() * 6 });

    const k = clamp(Math.round(plat.solid.w / 115), 1, 3);
    for (let c = 0; c < k; c++) {
      coins.push({ x: plat.solid.x + plat.solid.w * (0.24 + 0.26 * c), y: plat.surfaceY - 74, ph: rng() * 6 });
    }

    if (i >= 1 && plat.solid.w > 200 && rng() < 0.22 + d * 0.52) {
      enemies.push({
        type: "crawler",
        minX: plat.solid.x + 26,
        maxX: plat.solid.x + plat.solid.w - 26,
        x: plat.solid.x + plat.solid.w * 0.5,
        y: plat.surfaceY,
        dir: rng() < 0.5 ? 1 : -1,
        speed: 52 + rng() * 46 + d * 26,
        alive: true,
      });
    }
    if (i >= 1 && rng() < 0.15 + d * 0.5) {
      const cx = lerp(gx0, gx1, 0.5);
      drones.push({
        type: "drone", cx, cy: Math.min(prev.surfaceY, plat.surfaceY) - 165 - rng() * 40,
        x: cx, y: 0, range: 80 + rng() * 70, sp: 0.8 + rng() * 0.7, ph: rng() * 6,
        dir: 1, alive: true,
      });
    }
    prev = plat;
  }

  const shipCount = Math.round(d * 2.2);
  for (let s = 0; s < shipCount; s++) {
    const host = platforms[Math.min(platforms.length - 2, 2 + Math.floor(rng() * (platforms.length - 3)))];
    ships.push({
      type: "ship",
      x0: host.solid.x - 60, x1: host.solid.x + host.solid.w + 160,
      x: host.solid.x - 60, y: host.surfaceY - 52,
      speed: 82 + rng() * 60, dir: 1, ph: rng() * 6,
    });
  }
  if (n >= 9) {
    ships.push({ type: "ship", x0: 200, x1: 1600, x: 700, y: 250, speed: 120, dir: 1, ph: 0, high: true });
  }

  const goalPlat = platforms[platforms.length - 1];
  const portal = {
    x: goalPlat.solid.x + goalPlat.solid.w * 0.62,
    y: goalPlat.surfaceY - 176,
    w: 112, h: 176,
  };

  const width = goalPlat.solid.x + goalPlat.solid.w + 300;
  const level = {
    index: n, name: theme.name, d,
    platforms, coins, enemies, drones, ships, portal, width,
    spawn: { x: first.solid.x + Math.min(first.solid.w * 0.45, 210), y: first.surfaceY },
    deathY: 840,
  };
  level.missions = missionsFor(level);
  return level;
}

/* ---------------------------------------------------------------- missions -- */
function missionsFor(L) {
  const n = L.index;
  const total = L.coins.length;
  const sides = [{ id: "coins", need: Math.max(4, Math.round(total * 0.55)), reward: 8 }];
  const pool = [];
  if (L.enemies.length >= 2) {
    pool.push({ id: "defeat", need: Math.min(L.enemies.length, 2 + Math.floor(n / 3)), reward: 12 });
    pool.push({ id: "stomp", need: 2, reward: 12 });
  }
  pool.push({ id: "noDamage", need: 1, reward: 14 });
  pool.push({ id: "time", need: Math.round(42 + n * 1.6), reward: 10 });
  sides.push(pool[(n - 1) % pool.length]);
  return { main: { id: "portal", reward: 10 + n }, sides };
}

function missionText(m) {
  switch (m.id) {
    case "portal": return ["Reach the portal", "Finish the stage"];
    case "coins": return ["Collect " + m.need + " star coins", "Grab the glowing coins"];
    case "defeat": return ["Defeat " + m.need + " enemies", "Stomp or dodge past them"];
    case "stomp": return ["Stomp " + m.need + " enemies", "Land on top of them"];
    case "noDamage": return ["Finish without losing a heart", "Take no damage this stage"];
    case "time": return ["Finish in under " + m.need + "s", "Race to the portal"];
    default: return ["Mission", ""];
  }
}
function missionProgress(m, ms) {
  switch (m.id) {
    case "portal": return [ms.portal ? 1 : 0, 1];
    case "coins": return [Math.min(ms.coins, m.need), m.need];
    case "defeat": return [Math.min(ms.defeats, m.need), m.need];
    case "stomp": return [Math.min(ms.stomps, m.need), m.need];
    case "noDamage": return [ms.portal ? 1 : 0, 1];
    case "time": return [Math.min(Math.round(ms.time), m.need), m.need];
    default: return [0, 1];
  }
}
function missionDone(m, ms) {
  if (m.id === "noDamage") return ms.portal && ms.hurt === 0;
  if (m.id === "time") return ms.portal && ms.time <= m.need;
  const [cur, need] = missionProgress(m, ms);
  return cur >= need;
}
function missionRecord(n) {
  return progress.missions[n] || (progress.missions[n] = {});
}

const LEVELS = [];
for (let i = 1; i <= 15; i++) LEVELS.push(makeLevel(i));

/* --------------------------------------------------------------- progress -- */
function defaultProgress() {
  return { v: 2, unlocked: 1, completed: [], coins: 0, sound: true, best: {}, missions: {}, skills: {}, stars: 10 };
}
let progress = defaultProgress();

function loadProgress() {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      for (const k of LEGACY_KEYS) {
        const old = localStorage.getItem(k);
        if (old) { raw = old; break; }
      }
    }
    if (raw) {
      const p = JSON.parse(raw);
      progress = {
        v: 2,
        unlocked: clamp(parseInt(p.unlocked, 10) || 1, 1, 15),
        completed: Array.isArray(p.completed) ? p.completed.filter((x) => x >= 1 && x <= 15) : [],
        coins: Math.max(0, parseInt(p.coins, 10) || 0),
        sound: p.sound !== false,
        best: p.best && typeof p.best === "object" ? p.best : {},
        missions: p.missions && typeof p.missions === "object" ? p.missions : {},
        skills: p.skills && typeof p.skills === "object" ? p.skills : {},
        stars: Number.isFinite(p.stars) ? Math.max(0, Math.floor(p.stars)) : 10,
        // fields added after the first release default in gracefully
      
      };
      saveProgressNow();
    }
  } catch (e) { /* keep defaults */ }
}
let saveTimer = null;
function saveProgress() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveProgressNow, 140);
}
function saveProgressNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) { /* storage blocked */ }
}

/* ------------------------------------------------------------------ audio -- */
const Sound = {
  ctx: null,
  get on() { return progress.sound; },
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(freq, dur, type = "sine", gain = 0.16, slideTo = null, delay = 0) {
    if (!this.on) return;
    this.unlock();
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.04);
  },
  noise(dur, gain = 0.1) {
    if (!this.on) return;
    this.unlock();
    const c = this.ctx; if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = gain;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  },
  jump() { this.tone(430, 0.16, "triangle", 0.16, 780); },
  dbl() { this.tone(620, 0.18, "triangle", 0.14, 1040); },
  land() { this.noise(0.12, 0.07); this.tone(120, 0.1, "sine", 0.09, 80); },
  coin() { this.tone(1046, 0.08, "square", 0.09); this.tone(1568, 0.12, "square", 0.08, 1568, 0.06); },
  hurt() { this.tone(300, 0.32, "sawtooth", 0.14, 90); this.noise(0.18, 0.05); },
  shield() { this.tone(880, 0.3, "sine", 0.14, 300); this.noise(0.2, 0.06); },
  portal() { this.tone(520, 0.5, "sine", 0.14, 1400); this.tone(780, 0.5, "triangle", 0.08, 1800, 0.1); },
  complete() {[523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.26, "triangle", 0.13, null, i * 0.11)); },
  mission() {[784, 988, 1318].forEach((f, i) => this.tone(f, 0.2, "triangle", 0.12, null, i * 0.09)); },
  buy() {[523, 784, 1046].forEach((f, i) => this.tone(f, 0.18, "square", 0.1, null, i * 0.08)); },
  shoot() { this.tone(760, 0.12, "square", 0.10, 320); this.noise(0.08, 0.04); },
  hit() { this.tone(240, 0.16, "square", 0.12, 90); this.noise(0.12, 0.06); },
  ui() { this.tone(660, 0.07, "square", 0.07); },
  over() {[440, 349, 262, 196].forEach((f, i) => this.tone(f, 0.34, "sawtooth", 0.11, null, i * 0.16)); },
};

/* ------------------------------------------------------------------- input -- */
const input = { left: false, right: false, jump: false, fire: false };
let jumpBuffer = 0;
let throwBuffer = 0;

/* ------------------------------------------------------------------- state -- */
const state = {
  mode: "menu",
  level: 1,
  levelData: null,
  cam: { x: 0, y: 0 },
  t: 0,
  player: null,
  coinsTaken: 0,
  lives: 3,
  shields: 0,
  ms: { coins: 0, defeats: 0, stomps: 0, hurt: 0, time: 0, portal: false },
  shake: 0,
  effects: [],
  shots: [],
  throwCd: 0,
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let scaleX = 1, scaleY = 1;

const el = (id) => document.getElementById(id);
let throwBtnEl = null;
const overlay = el("overlay");

function showPanel(name) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  if (name) {
    const p = el("panel-" + name);
    if (p) p.classList.add("active");
    overlay.classList.add("on");
  } else {
    overlay.classList.remove("on");
  }
}

let toastTimer = null;
function toast(text) {
  const t = el("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), 2300);
}

function completedCount(n) {
  const L = LEVELS[n - 1];
  const rec = progress.missions[n] || {};
  let c = 0;
  if (rec.main) c++;
  L.missions.sides.forEach((m, i) => { if (rec["s" + i]) c++; });
  return c;
}

function setHud() {
  el("coinCount").textContent = String(progress.coins);
  el("stageLabel").textContent = "Stage " + state.level + " / 15";
  document.querySelectorAll("#hearts .heart").forEach((h, i) => h.classList.toggle("lost", i >= state.lives));
  const chip = el("missionChip");
  const total = 3, done = completedCount(state.level);
  el("missionChipText").textContent = "MISSIONS " + done + "/" + total;
  chip.classList.toggle("done", done >= total);
  const portrait = document.querySelector(".portrait");
  if (portrait) portrait.classList.toggle("shielded", state.shields > 0);
  el("hud").classList.toggle("on", state.mode !== "menu" && state.mode !== "levels" && state.mode !== "shop");
}
function syncSoundLabels() {
  const txt = "SOUND: " + (progress.sound ? "ON" : "OFF");
  el("btnSound").textContent = txt;
  el("btnPauseSound").textContent = txt;
}

/* -------------------------------------------------------------------- load -- */
function loadAssets() {
  const list = Object.entries(MAYAR).map(([k, v]) => [k, "game/" + v.file]);
  ISL.forEach((m, i) => list.push(["isl" + i, "game/" + m.file]));
  Object.entries(ART).forEach(([k, f]) => list.push([k, "game/" + f]));

  const total = list.length;
  let done = 0;
  const failed = [];

  return Promise.all(list.map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    const settle = () => { done++; bumpLoader(done, total); resolve(); };
    img.onload = () => { IMG[key] = img; settle(); };
    img.onerror = () => { failed.push(src); settle(); };
    img.src = src;
  }))).then(() => failed);
}

let loaderEl = null;
function bumpLoader(done, total) {
  if (loaderEl) loaderEl.textContent = "Loading " + Math.round((done / total) * 100) + "%";
}

/* ------------------------------------------------------------------ player -- */
function newPlayer(level) {
  return {
    x: level.spawn.x, y: level.spawn.y,
    vx: 0, vy: 0, halfW: 22, bodyH: 104,
    onGround: true, coyote: 0, facing: 1,
    invuln: 0, animT: 0, landT: 0, jumpCut: false, jumpAge: 0,
    airJumps: skillLevel("doubleJump"),
    maxSpeed: MAXRUN * (1 + 0.06 * skillLevel("swift")),
    glideL: skillLevel("glide"),
    cp: { x: level.spawn.x, y: level.spawn.y },
    cpSX: undefined,
  };
}

function startLevel(n) {
  state.level = n;
  const level = LEVELS[n - 1];
  state.levelData = level;
  state.player = newPlayer(level);
  state.lives = 3;
  state.coinsTaken = 0;
  state.shields = skillLevel("shield");
  state.ms = { coins: 0, defeats: 0, stomps: 0, hurt: 0, time: 0, portal: false };
  state.effects = [];
  state.shots = [];
  state.throwCd = 0;
  state.cam.x = clamp(state.player.x - VIEW.w * 0.38, -120, Math.max(-120, level.width - VIEW.w));
  state.mode = "playing";
  input.left = false; input.right = false; input.jump = false; input.fire = false;
  jumpBuffer = 0;
  showPanel(null);
  el("hud").classList.add("on");
  updateAmmo();
  el("hint").classList.add("on");
  setTimeout(() => el("hint").classList.remove("on"), 3600);
  setHud();
}

/* ------------------------------------------------------------------ update -- */
const GRAV = 2150, MAXRUN = 372, JUMP = 838;

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function burst(x, y, n, color, spread = 200, up = 160) {
  for (let i = 0; i < n; i++) {
    state.effects.push({
      x, y, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * up,
      life: 0.4 + Math.random() * 0.2, r: 2 + Math.random() * 3.5, c: color,
    });
  }
}

function awardMission(key, m) {
  const rec = missionRecord(state.level);
  if (rec[key]) return;
  rec[key] = true;
  progress.coins += m.reward;
  Sound.mission();
  toast("MISSION COMPLETE  +" + m.reward);
  setHud();
  saveProgress();
}

function checkMissions(includeFinal) {
  const L = state.levelData;
  if (!L) return;
  const ms = state.ms;
  const rec = missionRecord(state.level);
  L.missions.sides.forEach((m, i) => {
    const finalType = m.id === "noDamage" || m.id === "time";
    if (finalType && !includeFinal) return;
    if (!rec["s" + i] && missionDone(m, ms)) awardMission("s" + i, m);
  });
  if (includeFinal && !rec.main && missionDone(L.missions.main, ms)) awardMission("main", L.missions.main);
}

function updatePlayer(dt) {
  const L = state.levelData, p = state.player;
  state.ms.time += dt;
  state.throwCd = Math.max(0, state.throwCd - dt);
  throwBuffer = Math.max(0, throwBuffer - dt);
  if ((throwBuffer > 0 || input.fire) && state.throwCd <= 0) { throwOrb(p); throwBuffer = 0; }

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const accel = p.onGround ? 2500 : 1900;
  const cap = p.maxSpeed || MAXRUN;
  if (dir !== 0) {
    p.vx += dir * accel * dt;
    p.vx = clamp(p.vx, -cap, cap);
    p.facing = dir;
  } else {
    const fr = (p.onGround ? 2900 : 620) * dt;
    if (Math.abs(p.vx) <= fr) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * fr;
  }

  if (jumpBuffer > 0) {
    if (p.onGround || p.coyote > 0) {
      p.vy = -JUMP; p.onGround = false; p.coyote = 0; p.jumpCut = false; p.jumpAge = 0;
      p.airJumps = skillLevel("doubleJump");
      jumpBuffer = 0; Sound.jump();
      burst(p.x, p.y, 6, "rgba(200,170,255,");
    } else if (p.airJumps > 0) {
      p.airJumps--;
      p.vy = -JUMP * 0.94; p.jumpCut = false; p.jumpAge = 0;
      jumpBuffer = 0; Sound.dbl();
      state.effects.push({ x: p.x, y: p.y - 30, vx: 0, vy: 0, life: 0.45, r: 26, c: "rgba(150,220,255,", ring: true });
      burst(p.x, p.y - 20, 8, "rgba(180,220,255,");
    }
  }
  p.jumpAge = (p.jumpAge || 0) + dt;
  if (!input.jump && p.vy < -180 && !p.jumpCut && p.jumpAge > 0.1) { p.vy *= 0.62; p.jumpCut = true; }

  p.vy = Math.min(p.vy + GRAV * dt, 1450);
  if (!p.onGround && p.vy > 80 && input.jump && p.glideL > 0) {
    p.vy = Math.min(p.vy, 560 - 110 * p.glideL);
    if (Math.random() < 0.2) {
      state.effects.push({ x: p.x, y: p.y - 24, vx: 0, vy: -18, life: 0.3, r: 2.2, c: "rgba(180,222,255," });
    }
  }

  p.x += p.vx * dt;
  for (const pl of L.platforms) {
    const s = pl.solid;
    if (overlaps(p.x - p.halfW, p.y - p.bodyH, p.halfW * 2, p.bodyH, s.x, s.y, s.w, s.h)) {
      if (p.vx > 0) p.x = s.x - p.halfW;
      else if (p.vx < 0) p.x = s.x + s.w + p.halfW;
      p.vx = 0;
    }
  }
  p.x = clamp(p.x, 24, L.width - 24);

  const wasGround = p.onGround;
  p.y += p.vy * dt;
  p.onGround = false;
  for (const pl of L.platforms) {
    const s = pl.solid;
    if (overlaps(p.x - p.halfW, p.y - p.bodyH, p.halfW * 2, p.bodyH, s.x, s.y, s.w, s.h)) {
      if (p.vy >= 0) {
        p.y = s.y; p.vy = 0; p.onGround = true;
        if (p.cpSX === undefined || s.x >= p.cpSX) {
          p.cpSX = s.x;
          p.cp = { x: s.x + 46, y: s.y };
        }
      } else {
        p.y = s.y + s.h + p.bodyH; p.vy = 0.2;
      }
    }
  }
  if (p.onGround) {
    p.coyote = 0.1;
    p.airJumps = skillLevel("doubleJump");
  } else {
    p.coyote = Math.max(0, p.coyote - dt);
  }

  if (p.onGround && !wasGround) {
    p.landT = 0.16;
    Sound.land();
    burst(p.x, p.y, 8, "rgba(190,190,255,", 150, 60);
  }
  p.landT = Math.max(0, p.landT - dt);
  p.animT += dt;
  p.invuln = Math.max(0, p.invuln - dt);

  // coins
  const magL = skillLevel("magnet");
  const magnet = magL > 0;
  const reach = magnet ? 100 + 45 * magL : 46;
  for (const c of L.coins) {
    if (c.got) continue;
    const dx = c.x - p.x, dy = c.y - (p.y - p.bodyH * 0.48);
    if (magnet && Math.abs(dx) < 150 + 60 * magL && Math.abs(dy) < 150 + 30 * magL) {
      c.x -= dx * Math.min(1, dt * 5.5);
      c.y -= dy * Math.min(1, dt * 5.5);
    }
    if (Math.abs(dx) < reach && Math.abs(dy) < reach + 20) {
      c.got = true;
      const gain = 1 + skillLevel("booster");
      state.coinsTaken += 1;
      progress.coins += gain;
      state.ms.coins += 1;
      Sound.coin(); setHud(); saveProgress();
      state.effects.push({ x: c.x, y: c.y, vx: 0, vy: -60, life: 0.5, r: 12, c: "rgba(255,220,90,", ring: true });
      checkMissions(false);
    }
  }

  // enemies
  for (const e of L.enemies) {
    if (!e.alive) continue;
    if (overlaps(p.x - p.halfW, p.y - p.bodyH, p.halfW * 2, p.bodyH, e.x - 26, e.y - 52, 52, 52)) {
      const stomping = p.vy > 60 && p.y - 18 < e.y - 40;
      if (stomping) {
        e.alive = false;
        p.vy = -JUMP * 0.66;
        state.ms.defeats++; state.ms.stomps++;
        Sound.tone(220, 0.14, "square", 0.12, 520);
        burst(e.x, e.y - 30, 10, "rgba(255,140,220,", 220, 160);
        checkMissions(false);
      } else damage(p, e.x);
    }
  }
  for (const dr of L.drones) {
    if (!dr.alive) continue;
    if (overlaps(p.x - p.halfW, p.y - p.bodyH, p.halfW * 2, p.bodyH, dr.x - 40, dr.y - 34, 80, 68)) damage(p, dr.x);
  }
  for (const sh of L.ships) {
    if (sh.dead) continue;
    if (overlaps(p.x - p.halfW, p.y - p.bodyH, p.halfW * 2, p.bodyH, sh.x - 78, sh.y - 42, 156, 84)) damage(p, sh.x);
  }

  if (p.y > L.deathY) {
    state.ms.hurt++;
    state.lives--; setHud(); Sound.hurt();
    if (state.lives <= 0) return gameOver();
    p.x = p.cp.x; p.y = p.cp.y - 4; p.vx = 0; p.vy = 0; p.invuln = 1.4;
    state.cam.x = clamp(p.x - VIEW.w * 0.38, -120, Math.max(-120, L.width - VIEW.w));
  }

  const pr = L.portal;
  if (overlaps(p.x - p.halfW, p.y - p.bodyH, p.halfW * 2, p.bodyH, pr.x - pr.w / 2, pr.y, pr.w, pr.h)) {
    state.ms.portal = true;
    completeLevel();
  }
}
function damage(p, fromX) {
  if (p.invuln > 0) return;
  if (state.shields > 0) {
    state.shields--;
    p.invuln = 1.1;
    p.vx = (p.x < fromX ? -1 : 1) * 210; p.vy = -280;
    Sound.shield(); setHud();
    state.effects.push({ x: p.x, y: p.y - 50, vx: 0, vy: 0, life: 0.5, r: 70, c: "rgba(130,225,255,", ring: true });
    burst(p.x, p.y - 50, 14, "rgba(140,230,255,", 260, 200);
    return;
  }
  state.lives--; state.ms.hurt++; p.invuln = 1.35;
  p.vx = (p.x < fromX ? -1 : 1) * 300; p.vy = -340;
  state.shake = 0.34;
  Sound.hurt(); setHud();
  burst(p.x, p.y - 50, 12, "rgba(255,120,150,", 260, 240);
  if (state.lives <= 0) gameOver();
}

const THROW_CD = 0.42, SHOT_SPEED = 780, SHOT_LIFE = 1.15;

function throwOrb(p) {
  if ((progress.stars || 0) <= 0) {
    toast("NO STARS — BUY MORE IN THE SHOP");
    return;
  }
  if (state.shots.length >= 4) return;
  progress.stars -= 1;
  saveProgress();
  updateAmmo();
  const dir = p.facing >= 0 ? 1 : -1;
  state.throwCd = THROW_CD;
  state.shots.push({ x: p.x + dir * 30, y: p.y - 56, vx: dir * SHOT_SPEED, vy: -22, life: SHOT_LIFE, dir });
  Sound.shoot();
  state.effects.push({ x: p.x + dir * 34, y: p.y - 62, vx: 0, vy: 0, life: 0.28, r: 14, c: "rgba(255,214,130,", ring: true });
  burst(p.x + dir * 34, p.y - 62, 6, "rgba(255,196,96,", 170, 130);
}

function hitEnemy(x, y, n) { burst(x, y, n, "rgba(255,170,110,", 240, 190); }

function updateShots(dt) {
  const L = state.levelData;
  if (!L) return;
  for (const sh of state.shots) {
    sh.life -= dt;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    sh.vy += 220 * dt;
    if (sh.life <= 0) continue;

    for (const e of L.enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.x - sh.x) < 36 && sh.y > e.y - 76 && sh.y < e.y + 12) {
        sh.life = 0;
        e.hp = (e.hp === undefined ? 2 : e.hp) - 1;
        if (e.hp <= 0) {
          e.alive = false;
          state.ms.defeats++;
          Sound.hit(); hitEnemy(e.x, e.y - 28, 14);
          checkMissions(false);
        } else {
          Sound.hit(); hitEnemy(e.x, e.y - 30, 6);
        }
        break;
      }
    }
    if (sh.life <= 0) continue;

    for (const d of L.drones) {
      if (!d.alive) continue;
      if (Math.abs(d.x - sh.x) < 46 && Math.abs(d.y - sh.y) < 44) {
        sh.life = 0;
        d.hp = (d.hp === undefined ? 2 : d.hp) - 1;
        if (d.hp <= 0) {
          d.alive = false;
          state.ms.defeats++;
          Sound.hit(); hitEnemy(d.x, d.y, 16);
          checkMissions(false);
        } else {
          Sound.hit(); hitEnemy(d.x, d.y, 6);
        }
        break;
      }
    }
    if (sh.life <= 0) continue;

    for (const sp of L.ships) {
      if (sp.dead) continue;
      if (Math.abs(sp.x - sh.x) < 82 && Math.abs(sp.y - sh.y) < 48) {
        sp.hp = (sp.hp === undefined ? 4 : sp.hp) - 1;
        sh.life = 0;
        Sound.hit(); hitEnemy(sh.x, sh.y, 10);
        if (sp.hp <= 0) { sp.dead = true; state.ms.defeats++; burst(sp.x, sh.y, 22, "rgba(255,150,90,", 320, 240); checkMissions(false); }
        break;
      }
    }
  }
  state.shots = state.shots.filter((sh) => sh.life > 0 && sh.x > -200 && sh.x < L.width + 200);
}

function drawShots(camX) {
  for (const sh of state.shots) {
    const x = sh.x - camX, y = sh.y;
    if (x < -60 || x > VIEW.w + 60) continue;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 30);
    glow.addColorStop(0, "rgba(255,255,240,0.95)");
    glow.addColorStop(0.32, "rgba(255,206,110,0.8)");
    glow.addColorStop(1, "rgba(255,110,40,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,200,120,0.45)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - sh.dir * 30, y + 4);
    ctx.stroke();

    const img = IMG.star;
    if (img && img.width) {
      const size = 30, sc = size / img.width;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(state.t * 9);
      ctx.drawImage(img, -size / 2, -size / 2, img.width * sc, img.height * sc);
      ctx.restore();
    }
  }
}

function updateEnemies(dt) {
  const L = state.levelData;
  for (const e of L.enemies) {
    if (!e.alive) continue;
    e.x += e.dir * e.speed * dt;
    if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
    if (e.x > e.maxX) { e.x = e.maxX; e.dir = -1; }
  }
  for (const dr of L.drones) {
    dr.ph += dt * dr.sp;
    dr.x = dr.cx + Math.sin(dr.ph) * dr.range;
    dr.y = dr.cy + Math.sin(dr.ph * 2.3) * 14;
  }
  for (const sh of L.ships) {
    if (sh.dead) continue;
    sh.ph += dt;
    sh.x += sh.dir * sh.speed * dt;
    if (sh.x > sh.x1) { sh.x = sh.x1; sh.dir = -1; }
    if (sh.x < sh.x0) { sh.x = sh.x0; sh.dir = 1; }
  }
}

function updateEffects(dt) {
  for (const e of state.effects) {
    e.life -= dt;
    if (!e.ring) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 620 * dt; }
  }
  state.effects = state.effects.filter((e) => e.life > 0);
}

/* --------------------------------------------------------------- game flow -- */
function completeLevel() {
  if (state.mode !== "playing") return;
  state.mode = "complete";
  Sound.portal();
  toast("شطوره ميمي!");
  checkMissions(true);
  const n = state.level;
  if (!progress.completed.includes(n)) progress.completed.push(n);
  progress.unlocked = Math.max(progress.unlocked, Math.min(15, n + 1));
  progress.best[n] = Math.max(progress.best[n] || 0, state.coinsTaken);
  saveProgressNow();
  setHud();
  Sound.complete();
  renderCompleteMissions();
  if (n >= 15) {
    el("victoryCoins").textContent = String(progress.coins);
    el("hud").classList.remove("on");
    state.mode = "victory";
    showPanel("victory");
  } else {
    el("completeText").textContent = "Stage " + n + " complete — the portal is open.";
    el("completeCoins").textContent = String(state.coinsTaken);
    showPanel("complete");
  }
}

function renderCompleteMissions() {
  const L = state.levelData;
  const box = el("completeMissions");
  if (!L || !box) return;
  const parts = [];
  const push = (m, done) => {
    parts.push(
      '<div class="mission ' + (done ? "done" : "") + '" style="width:44em;max-width:100%">' +
      '<div class="badge">' + (done ? "✓" : "•") + "</div>" +
      '<div class="txt"><b>' + missionText(m)[0] + "</b><span>" +
      (done ? "Completed" : "Not completed this run") + "</span></div>" +
      '<div class="rw">+' + m.reward + "</div></div>"
    );
  };
  const rec = progress.missions[state.level] || {};
  push(L.missions.main, !!rec.main);
  L.missions.sides.forEach((m, i) => push(m, !!rec["s" + i]));
  box.innerHTML = parts.join("");
}

function gameOver() {
  state.mode = "gameover";
  Sound.over();
  setHud();
  el("hud").classList.remove("on");
  showPanel("gameover");
}

function pauseGame() {
  if (state.mode !== "playing") return;
  state.mode = "paused";
  Sound.ui();
  showPanel("pause");
}
function resumeGame() {
  if (state.mode !== "paused") return;
  state.mode = "playing";
  showPanel(null);
}

/* ------------------------------------------------------------------ render -- */
function drawBackground(camX) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, "#060320");
  g.addColorStop(0.45, "#150c3f");
  g.addColorStop(1, "#2b1157");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  const bg = IMG.spacebg;
  if (!bg || !bg.width) return;

  const cover = Math.max(VIEW.w / bg.width, VIEW.h / bg.height);
  const dw = bg.width * cover, dh = bg.height * cover;
  const pan = clamp(camX * 0.075, 0, Math.max(0, dw - VIEW.w));
  ctx.drawImage(bg, -pan, 0, dw, dh);

  // keep the play field readable over the artwork
  const fade = ctx.createLinearGradient(0, VIEW.h - 190, 0, VIEW.h);
  fade.addColorStop(0, "rgba(26,14,52,0)");
  fade.addColorStop(1, "rgba(26,14,52,0.9)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, VIEW.h - 190, VIEW.w, 190);

  const top = ctx.createLinearGradient(0, 0, 0, 130);
  top.addColorStop(0, "rgba(6,3,24,0.45)");
  top.addColorStop(1, "rgba(6,3,24,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, VIEW.w, 130);
}

function drawPlatforms(camX) {
  const L = state.levelData;
  if (!L) return;
  for (const p of L.platforms) {
    if (p.drawX + p.drawW < camX - 120 || p.drawX > camX + VIEW.w + 120) continue;
    const img = IMG["isl" + p.idx];
    if (!img || !img.width) continue;
    ctx.drawImage(img, p.drawX - camX, p.drawY, p.drawW, p.drawH);
  }
}

function drawPortal(camX) {
  const pr = state.levelData.portal;
  const cx = pr.x - camX, cy = pr.y + pr.h / 2;
  const t = state.t;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 6, cx, cy, pr.h * 0.85);
  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.16, "rgba(214,238,255,0.8)");
  glow.addColorStop(0.4, "rgba(172,112,255,0.6)");
  glow.addColorStop(0.72, "rgba(120,60,220,0.25)");
  glow.addColorStop(1, "rgba(90,40,180,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, pr.h * 0.68, pr.h * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(240,225,255," + (0.55 + pulse * 0.35) + ")";
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    const rr = pr.w * 0.5 - i * 12 + pulse * 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, pr.h * 0.5 - i * 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(150,220,255," + (0.35 + pulse * 0.3) + ")";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, pr.y + 6); ctx.lineTo(cx, pr.y + pr.h - 6);
  ctx.stroke();

  const star = IMG.star;
  if (star && star.width) {
    const ss = (44 + pulse * 8) / star.width;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(star, cx - (star.width * ss) / 2, pr.y - 48 - pulse * 8, star.width * ss, star.height * ss);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCoins(camX) {
  const L = state.levelData, coin = IMG.coin;
  if (!coin || !coin.width) return;
  const size = 42;
  for (const c of L.coins) {
    if (c.got) continue;
    const x = c.x - camX;
    if (x < -60 || x > VIEW.w + 60) continue;
    const bob = Math.sin(state.t * 2.4 + c.ph) * 6;
    const sq = Math.abs(Math.cos(state.t * 2.6 + c.ph));
    const w = Math.max(6, size * (0.35 + 0.65 * sq));
    const s = w / coin.width;
    ctx.drawImage(coin, x - w / 2, c.y + bob - (coin.height * s) / 2, w, coin.height * s);
  }
}

function drawEnemies(camX) {
  const L = state.levelData;
  for (const e of L.enemies) {
    if (!e.alive) continue;
    const img = IMG.crawler;
    if (!img || !img.width) continue;
    const s = 1.55, w = img.width * s, h = img.height * s;
    ctx.save();
    ctx.translate(e.x - camX, e.y + 2);
    if (e.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }
  for (const d of L.drones) {
    if (!d.alive) continue;
    const img = IMG.robot;
    if (!img || !img.width) continue;
    const s = 0.92;
    const w = img.width * s, h = img.height * s;
    ctx.save();
    ctx.translate(d.x - camX, d.y);
    ctx.rotate(Math.cos(state.t * 2.4 + d.ph) * 0.1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  for (const sh of L.ships) {
    if (sh.dead) continue;
    const img = IMG.ship;
    if (!img || !img.width) continue;
    const s = 0.66, w = img.width * s, h = img.height * s;
    const x = sh.x - camX;
    if (x < -200 || x > VIEW.w + 200) continue;
    ctx.save();
    ctx.translate(x, sh.y);
    if (sh.dir < 0) ctx.scale(-1, 1);
    ctx.globalAlpha = sh.high ? 0.75 : 1;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawPlayer(camX) {
  const p = state.player;
  if (!p) return;
  let key = "idle";
  if (!p.onGround) {
    key = p.vy < -110 ? "jumpRise" : p.vy > 130 ? "jumpFall" : "jumpPeak";
  } else if (p.landT > 0.02 && Math.abs(p.vx) < 140) {
    key = p.landT > 0.08 ? "land1" : "land2";
  } else if (Math.abs(p.vx) > 42) {
    const rate = 7.5 + (Math.abs(p.vx) / (p.maxSpeed || MAXRUN)) * 7.5;
    key = "run" + ((Math.floor(p.animT * rate) % 5) + 1);
  }
  const def = MAYAR[key] || MAYAR.idle;
  const img = IMG[key] || IMG.idle;
  if (!img || !img.width) return;
  const s = CHAR_SCALE * (def.zoom || 1);
  const w = img.width * s, h = img.height * s;
  ctx.save();
  ctx.translate(p.x - camX, p.y + 1);
  if (p.facing < 0) ctx.scale(-1, 1);
  if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) ctx.globalAlpha = 0.42;
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();

  if (state.shields > 0) {
    ctx.save();
    const pulse = 0.55 + 0.25 * Math.sin(state.t * 5);
    ctx.strokeStyle = "rgba(140,230,255," + pulse + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(p.x - camX, p.y - p.bodyH * 0.5, 38, 62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEffects(camX) {
  for (const e of state.effects) {
    const a = Math.max(0, e.life);
    if (e.ring) {
      ctx.strokeStyle = e.c + (a * 1.6).toFixed(2) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x - camX, e.y, (1 - e.life / 0.5) * 34 + (e.r || 8), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = e.c + (a * 2).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(e.x - camX, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function render() {
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  const camX = state.cam.x + (state.shake > 0 ? (Math.random() - 0.5) * 10 : 0);
  drawBackground(camX);
  if (!state.levelData || state.mode === "menu") return;
  drawPlatforms(camX);
  drawPortal(camX);
  drawCoins(camX);
  drawEnemies(camX);
  drawShots(camX);
  drawPlayer(camX);
  drawEffects(camX);
  const g = ctx.createLinearGradient(0, VIEW.h - 150, 0, VIEW.h);
  g.addColorStop(0, "rgba(6,3,20,0)");
  g.addColorStop(1, "rgba(6,3,20,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, VIEW.h - 150, VIEW.w, 150);
}

/* -------------------------------------------------------------------- loop -- */
let last = performance.now();
let acc = 0;
function frame(now) {
  const raw = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.t += raw;
  if (state.mode === "playing") {
    acc += raw;
    let guard = 0;
    while (acc >= 1 / 120 && guard++ < 8) {
      const dt = 1 / 120;
      jumpBuffer = Math.max(0, jumpBuffer - dt);
      updateEnemies(dt);
      updatePlayer(dt);
      updateShots(dt);
      updateEffects(dt);
      acc -= dt;
      if (state.mode !== "playing") break;
    }
    if (state.mode === "playing") {
      const L = state.levelData, p = state.player;
      const target = clamp(p.x - VIEW.w * 0.38, -120, Math.max(-120, L.width - VIEW.w));
      state.cam.x += (target - state.cam.x) * Math.min(1, raw * 9);
    }
    state.shake = Math.max(0, state.shake - raw);
    if (throwBtnEl) throwBtnEl.classList.toggle("cooling", state.throwCd > 0.06);
  } else {
    acc = 0;
    updateEffects(raw);
  }
  render();
  requestAnimationFrame(frame);
}

/* -------------------------------------------------------------------- boot -- */
function fit() {
  const stage = el("stage");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(stage.clientWidth * dpr);
  canvas.height = Math.round(stage.clientHeight * dpr);
  scaleX = canvas.width / VIEW.w;
  scaleY = canvas.height / VIEW.h;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

function buildLevelGrid() {
  const grid = el("levelGrid");
  grid.innerHTML = "";
  for (let i = 1; i <= 15; i++) {
    const b = document.createElement("button");
    const done = progress.completed.includes(i);
    const locked = i > progress.unlocked;
    b.className = "lvl" + (done ? " done" : "") + (locked ? " locked" : "");
    b.innerHTML = locked
      ? '<svg class="lock" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg>'
      : String(i);
    b.addEventListener("click", () => {
      if (locked) return;
      Sound.ui();
      startLevel(i);
    });
    grid.appendChild(b);
  }
}

function renderMissions() {
  const L = state.levelData || LEVELS[Math.min(progress.unlocked, 15) - 1];
  const wrap = el("missionList");
  if (!L || !wrap) return;
  const rec = progress.missions[L.index] || {};
  const ms = state.levelData && state.levelData.index === L.index && (state.mode === "playing" || state.mode === "paused")
    ? state.ms
    : null;
  const row = (m, key, label) => {
    const done = !!rec[key] || (ms && missionDone(m, ms));
    const [cur, need] = ms ? missionProgress(m, ms) : [done ? m.need || 1 : 0, m.need || 1];
    const pct = need ? Math.min(100, Math.round((cur / need) * 100)) : 0;
    const t = missionText(m);
    return '<div class="mission ' + (done ? "done" : "") + '">' +
      '<div class="badge">' + (done ? "✓" : label) + "</div>" +
      '<div class="txt"><b>' + t[0] + "</b><span>" + t[1] + "</span>" +
      '<div class="bar"><i style="width:' + (done ? 100 : pct) + '%"></i></div></div>' +
      '<div class="rw">+' + m.reward + "</div></div>";
  };
  const html = [row(L.missions.main, "main", "M")]
    .concat(L.missions.sides.map((m, i) => row(m, "s" + i, "S")))
    .join("");
  wrap.innerHTML = html;
}

const STAR_PRICE = 15;

function updateAmmo() {
  const n = progress.stars || 0;
  const badge = el("ammoBadge");
  if (badge) badge.textContent = String(n);
  const btn = el("padThrow");
  if (btn) btn.classList.toggle("empty", n <= 0);
  const owned = el("ammoOwned");
  if (owned) owned.textContent = n + " ★";
  const b1 = el("buyStar1"), b5 = el("buyStar5"), c = el("shopCoins");
  if (c) c.textContent = String(progress.coins);
  if (b1) b1.disabled = progress.coins < STAR_PRICE;
  if (b5) b5.disabled = progress.coins < STAR_PRICE * 5;
}

function buyStars(n) {
  const cost = STAR_PRICE * n;
  if (progress.coins < cost) return;
  progress.coins -= cost;
  progress.stars = (progress.stars || 0) + n;
  saveProgressNow();
  Sound.buy();
  toast("+" + n + " ★  STARS");
  updateAmmo();
  renderShop();
  setHud();
}

function renderShop() {
  el("shopCoins").textContent = String(progress.coins);
  const list = el("shopList");
  list.innerHTML = SKILLS.map((s) => {
    const lv = skillLevel(s.id);
    const maxed = lv >= s.max;
    const cost = maxed ? 0 : skillCost(s, lv + 1);
    const can = !maxed && progress.coins >= cost;
    const dots = Array.from({ length: s.max }, (_, i) => '<i class="' + (i < lv ? "on" : "") + '"></i>').join("");
    return '<div class="shop-card ' + (maxed ? "owned" : "") + '">' +
      "<h3>" + s.name + "</h3><p>" + s.desc + "</p>" +
      '<div class="lvlbadge"><span class="dots">' + dots + "</span>" +
      '<span class="maxed">LVL ' + lv + "/" + s.max + "</span></div>" +
      '<div class="buy">' +
      (maxed
        ? '<button class="own" disabled>MAXED</button>'
        : '<button data-skill="' + s.id + '" ' + (can ? "" : "disabled") + ">" + (lv ? "UPGRADE" : "BUY") + "</button>" +
          '<span class="cost"><img src="game/coin.png" alt="">' + cost + "</span>") +
      "</div></div>";
  }).join("");
  list.querySelectorAll("button[data-skill]").forEach((b) => {
    b.addEventListener("click", () => buySkill(b.getAttribute("data-skill")));
  });
}

function buySkill(id) {
  const s = SKILLS.find((x) => x.id === id);
  if (!s) return;
  const lv = skillLevel(id);
  if (lv >= s.max) return;
  const cost = skillCost(s, lv + 1);
  if (progress.coins < cost) return;
  progress.coins -= cost;
  progress.skills[id] = lv + 1;
  saveProgressNow();
  Sound.buy();
  toast(s.name.toUpperCase() + "  LVL " + (lv + 1));
  renderShop();
  setHud();
}

function openMissions() {
  const back = state.mode;
  if (state.mode === "playing") state.mode = "paused";
  renderMissions();
  showPanel("missions");
  el("missionChip").dataset.back = back;
}
function closeMissions() {
  const back = el("missionChip").dataset.back || "paused";
  if (back === "playing") { state.mode = "playing"; showPanel(null); }
  else if (back === "paused") { state.mode = "paused"; showPanel("pause"); }
  else { state.mode = "menu"; showPanel("menu"); }
}

function bindPads() {
  const bind = (id, name) => {
    const node = el(id);
    const press = (ev) => {
      if (ev && ev.cancelable) ev.preventDefault();
      node.classList.add("down");
      input[name] = true;
      if (name === "jump") jumpBuffer = 0.13;
      if (name === "fire") throwBuffer = 0.16;
      Sound.unlock();
      if (state.mode === "playing") el("hint").classList.remove("on");
      if (ev && ev.pointerId !== undefined && node.setPointerCapture) {
        try { node.setPointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
      }
    };
    const release = () => { node.classList.remove("down"); input[name] = false; };
    node.addEventListener("pointerdown", press);
    node.addEventListener("pointerup", release);
    node.addEventListener("pointercancel", release);
    node.addEventListener("lostpointercapture", release);
    node.addEventListener("contextmenu", (ev) => ev.preventDefault());
  };
  bind("padLeft", "left");
  bind("padRight", "right");
  bind("padJump", "jump");
  bind("padThrow", "fire");
}

document.addEventListener("keydown", (ev) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "a", "d", "w", "A", "D", "W"].includes(ev.key)) ev.preventDefault();
  if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") input.left = true;
  if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") input.right = true;
  if (ev.key === " " || ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") {
    if (!input.jump) jumpBuffer = 0.13;
    input.jump = true;
  }
  if (ev.key === "f" || ev.key === "F" || ev.key === "k" || ev.key === "K") {
    throwBuffer = 0.16; input.fire = true;
  }
  if (ev.key === "Escape") { state.mode === "paused" ? resumeGame() : pauseGame(); }
});
document.addEventListener("keyup", (ev) => {
  if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") input.left = false;
  if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") input.right = false;
  if (ev.key === " " || ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") input.jump = false;
  if (ev.key === "f" || ev.key === "F" || ev.key === "k" || ev.key === "K") input.fire = false;
});

function goFullscreen() {
  const target = document.documentElement;
  const req = target.requestFullscreen || target.webkitRequestFullscreen;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!req) {
    // iPhone Safari has no Fullscreen API — the home-screen app is the fullscreen route
    toast(isIOS ? "ADD TO HOME SCREEN FOR FULLSCREEN" : "FULLSCREEN IS NOT AVAILABLE HERE");
    return;
  }
  try {
    if (!document.fullscreenElement) {
      req.call(target);
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  } catch (e) { /* not supported */ }
}

function wireUi() {
  el("btnPlay").addEventListener("click", () => {
    Sound.unlock(); Sound.ui();
    startLevel(Math.min(progress.unlocked, 15));
  });
  el("btnLevels").addEventListener("click", () => { Sound.ui(); buildLevelGrid(); showPanel("levels"); state.mode = "levels"; });
  el("btnLevelsBack").addEventListener("click", () => { Sound.ui(); showPanel("menu"); state.mode = "menu"; });
  el("btnShop").addEventListener("click", () => { Sound.ui(); renderShop(); showPanel("shop"); state.mode = "shop"; });
  el("buyStar1").addEventListener("click", () => buyStars(1));
  el("buyStar5").addEventListener("click", () => buyStars(5));
  el("btnShopBack").addEventListener("click", () => { Sound.ui(); showPanel("menu"); state.mode = "menu"; setHud(); });
  el("missionChip").addEventListener("click", () => { Sound.ui(); openMissions(); });
  el("btnMissionsClose").addEventListener("click", () => { Sound.ui(); closeMissions(); });
  el("btnPauseMissions").addEventListener("click", () => { Sound.ui(); openMissions(); });
  el("btnSound").addEventListener("click", () => { progress.sound = !progress.sound; saveProgressNow(); syncSoundLabels(); Sound.ui(); });
  el("btnPauseSound").addEventListener("click", () => { progress.sound = !progress.sound; saveProgressNow(); syncSoundLabels(); Sound.ui(); });
  el("btnFull").addEventListener("click", () => { Sound.ui(); goFullscreen(); });
  el("pauseBtn").addEventListener("click", pauseGame);
  el("btnResume").addEventListener("click", resumeGame);
  el("btnRestart").addEventListener("click", () => { Sound.ui(); startLevel(state.level); });
  el("btnMenu").addEventListener("click", () => { Sound.ui(); toMenu(); });
  el("btnNext").addEventListener("click", () => { Sound.ui(); startLevel(Math.min(15, state.level + 1)); });
  el("btnReplay").addEventListener("click", () => { Sound.ui(); startLevel(state.level); });
  el("btnCompleteMenu").addEventListener("click", () => { Sound.ui(); toMenu(); });
  el("btnRetry").addEventListener("click", () => { Sound.ui(); startLevel(state.level); });
  el("btnGameoverLevels").addEventListener("click", () => { Sound.ui(); buildLevelGrid(); showPanel("levels"); state.mode = "levels"; });
  el("btnGameoverMenu").addEventListener("click", () => { Sound.ui(); toMenu(); });
  el("btnAgain").addEventListener("click", () => { Sound.ui(); startLevel(1); });
  el("btnVictoryMenu").addEventListener("click", () => { Sound.ui(); toMenu(); });
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", () => setTimeout(fit, 220));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.mode === "playing") pauseGame();
  });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
}

function toMenu() {
  state.mode = "menu";
  showPanel("menu");
  el("hud").classList.remove("on");
  buildLevelGrid();
}

async function boot() {
  loadProgress();
  syncSoundLabels();
  fit();
  wireUi();
  bindPads();
  throwBtnEl = el("padThrow");
  loaderEl = document.createElement("div");
  loaderEl.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:2.2em;color:#cbb8ff;font-weight:700;text-align:center;z-index:30";
  loaderEl.textContent = "Loading 0%";
  el("stage").appendChild(loaderEl);

  const failed = await loadAssets();
  loaderEl.remove();
  if (failed.length) {
    const errBox = el("err");
    errBox.style.display = "block";
    errBox.innerHTML = "Some artwork could not be loaded:<br><span style='font-size:0.7em;opacity:.8'>" +
      failed.join("<br>") + "</span>";
  }
  state.levelData = LEVELS[0];
  buildLevelGrid();
  renderShop();
  updateAmmo();
  showPanel("menu");
  window.__MAYAR__ = { state, progress, LEVELS, input, startLevel, completeLevel, saveProgressNow, SKILLS, buySkill, missionsFor };
  requestAnimationFrame(frame);
}

boot();
