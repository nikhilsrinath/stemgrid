// The simulator engine, copied verbatim from the original index.html (still in the project root).
// Generated once by the Next.js port; edit this file directly from now on.
// The original module script runs inside startSimulator(), so it can be started and
// stopped cleanly each time the /simulator page mounts and unmounts.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// opts.onChange(): called after any change to the build (parts, wiring, code, panel settings).
export function startSimulator(opts = {}) {
  // Window and document listeners are tracked so stop() can remove them.
  // The original script calls the global addEventListener (window) directly; this shadows it.
  const offs = [];
  const addEventListener = (type, fn, opts) => { window.addEventListener(type, fn, opts); offs.push(() => window.removeEventListener(type, fn, opts)); };
  const docOn = (type, fn, opts) => { document.addEventListener(type, fn, opts); offs.push(() => document.removeEventListener(type, fn, opts)); };
  // /simulator?demo: the landing page drives a scripted build (see DEMO DRIVER near the end)
  const DEMO = new URLSearchParams(location.search).has('demo');
  // /simulator?demo=parts: the Course page's part showcase, one real part at a time on a turntable,
  // no UI and a see-through background (see SHOWCASE DRIVER near the end). Everything DEMO does applies too.
  const SHOWCASE = new URLSearchParams(location.search).get('demo') === 'parts';
  document.body.classList.toggle('showcase', SHOWCASE);

  /* ======================= original script starts ======================= */

/* =====================================================================
   PARTS LIBRARY (the Parts dialog). Descriptions from the brochure, p.7.
   ===================================================================== */
const IMG = '/assets/';
// The RGB LED is not one of the 13 kit modules: a simulator-only part (no product photo), so it gets a drawn icon.
const RGB_ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="10" y="22" width="44" height="34" rx="6" fill="#FF8044"/><rect x="15" y="27" width="34" height="24" rx="3" fill="#1F7A55"/><circle cx="32" cy="30" r="13" fill="#E4121B" opacity=".25"/><path d="M24 40v-9a8 8 0 0 1 16 0v9z" fill="#ff5a5a"/><rect x="22" y="40" width="20" height="4" rx="1" fill="#eee"/></svg>');
const imgSrc = it => it.img.startsWith('data:') ? it.img : IMG + it.img;
const LIBRARY = [
  { cat: 'Base plates', items: [
    { id: 'plate', name: 'Base plate', desc: 'Snap-fit grid for every module', img: 'modules/module-12_base-plate.png', live: true } ] },
  { cat: 'Development boards', items: [
    { id: 'quark', name: 'Quark C3 controller', desc: 'The ESP32-C3 brain of every build', img: 'modules/module-01_quark-c3-controller.png', live: true },
    { id: 'x1', name: 'X1 console', desc: 'Electronics learning console by Qbitio', img: 'products/x1/x1-console_illustration-cover.png' } ] },
  { cat: 'Sensors', items: [
    { id: 'ultrasonic', name: 'Ultrasonic sensor', desc: 'Measures distance using sound', img: 'modules/module-02_ultrasonic-sensor.png', live: true },
    { id: 'dht11', name: 'Temp & humidity', desc: 'DHT11 live climate readings', img: 'modules/module-03_temp-humidity-dht11.png', live: true },
    { id: 'light', name: 'Light sensor', desc: 'Detects ambient light levels', img: 'modules/module-04_light-sensor.png', live: true },
    { id: 'ir', name: 'IR receiver', desc: 'Reads infrared remote signals', img: 'modules/module-05_ir-receiver.png', live: true },
    { id: 'rfid', name: 'RFID reader', desc: 'Reads RFID cards and tags', img: 'modules/module-07_rfid-reader.png', live: true } ] },
  { cat: 'Inputs', items: [
    { id: 'pot', name: 'Potentiometer', desc: 'Smooth analog rotary control', img: 'modules/module-10_potentiometer.png', live: true },
    { id: 'buttons', name: 'Dual push button', desc: 'Two independent digital inputs', img: 'modules/module-11_dual-push-button.png', live: true } ] },
  { cat: 'Outputs', items: [
    { id: 'oled', name: 'OLED display', desc: 'Text, graphics and live data', img: 'modules/module-06_oled-display.png', live: true },
    { id: 'rgb', name: 'RGB LED', desc: 'Simulator only · not in the kit yet', img: RGB_ICON, live: true },
    { id: 'servo', name: 'Servo motor', desc: 'Precise angles, arm included', img: 'modules/module-08_servo-motor.png', live: true },
    { id: 'buzzer', name: 'Buzzer', desc: 'Tones, alerts and audio feedback', img: 'modules/module-09_buzzer.png', live: true } ] },
  { cat: 'Connectors', items: [
    { id: 'zap', name: 'Zap connector', desc: 'Keyed 4-wire cable, one way in', img: 'modules/module-13_zap-connectors.png', live: true } ] },
];
const libEl = document.getElementById('lib'), palEl = document.getElementById('partsPal'), partsFab = document.getElementById('partsFab');
const catsEl = document.getElementById('palCats'), qEl = document.getElementById('q');
const CAT_SHORT = { 'Development boards': 'Boards' };
let libCat = '', palOpen = false, startHint = true;          // '' = every category; startHint: the table has no plate yet
let tutPart = null;                                          // TinkerAI: the part the tutorial wants next (see TUTOR HOOKS)
// Two layouts for the parts library. Desktop (a mouse, a wide window, and always the landing-page demo): a sidebar
// beside the table. Touch screens and narrow windows: a dialog over the table, opened from the corner button.
const deskMQ = matchMedia('(hover:hover) and (pointer:fine) and (min-width:761px)');
let DESK = DEMO || deskMQ.matches;
function renderCats() {
  catsEl.innerHTML = ['', ...LIBRARY.map(c => c.cat)].map(c =>
    `<button type="button" data-cat="${c}" class="${c === libCat ? 'on' : ''}" aria-pressed="${c === libCat}">${c ? CAT_SHORT[c] || c : 'All'}</button>`).join('');
}
function renderLibrary(filter = '') {
  const f = filter.trim().toLowerCase();
  libEl.innerHTML = '';
  for (const c of LIBRARY) {
    if (libCat && c.cat !== libCat) continue;
    const items = c.items.filter(i => !f || (i.name + ' ' + i.desc + ' ' + c.cat).toLowerCase().includes(f));
    if (!items.length) continue;
    const sec = document.createElement('section'); sec.className = 'cat' + (libCat ? ' solo' : '');
    sec.innerHTML = `${libCat ? '' : `<h4 class="cat-h">${c.cat}</h4>`}<div class="items"></div>`;
    const box = sec.querySelector('.items');
    for (const it of items) {
      const el = document.createElement('div');
      el.className = 'item' + (it.live ? '' : ' soon') + (it.id === tutPart ? ' tut' : it.id === 'plate' && startHint && !tutPart ? ' start' : '');
      el.dataset.id = it.id; el.title = it.desc; el.tabIndex = 0; el.setAttribute('role', 'button');
      el.innerHTML = `<div class="th"><img src="${imgSrc(it)}" alt="" draggable="false"></div><b>${it.name}</b>${it.live ? '' : '<span class="pill">Soon</span>'}`;
      if (it.live) {
        el.addEventListener('pointerdown', e => pickStart(e, it, el));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToTable(it); } });
      } else el.addEventListener('click', () => toast(`${it.name} is coming soon`));
      box.appendChild(el);
    }
    libEl.appendChild(sec);
  }
  if (!libEl.firstChild) {
    const none = document.createElement('div'); none.className = 'lib-none';
    none.textContent = f ? `No parts match “${filter.trim()}”.` : 'No parts here yet.';
    libEl.appendChild(none);
  }
}
catsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  libCat = b.dataset.cat; renderCats(); renderLibrary(qEl.value); libEl.scrollTop = 0;
  b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
});
// a search looks through every category
qEl.addEventListener('input', () => { if (libCat) { libCat = ''; renderCats(); } renderLibrary(qEl.value); libEl.scrollTop = 0; });
renderCats();
renderLibrary();

/* =====================================================================
   RENDERER / SCENE
   ===================================================================== */
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: SHOWCASE });
// the landing-page demo is always shown scaled down, so it needs fewer pixels (keeps scrolling smooth)
renderer.setPixelRatio(Math.min(devicePixelRatio, DEMO ? 1.25 : 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

const RED = 0xE4121B;
const scene = new THREE.Scene();
scene.background = new THREE.Color(RED);
scene.fog = new THREE.Fog(RED, 55, 110);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 300);
const CAM_HOME = new THREE.Vector3(16, 22, 28), TARGET_HOME = new THREE.Vector3(0, 0, 0);

// Lower, side-on sun so shadows fall out from under the parts and still read from a top-down view.
scene.add(new THREE.HemisphereLight(0xffffff, 0xFFD9CC, 0.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.9);
sun.position.set(-14, 18, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 90 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);

/* ---------- helpers ---------- */
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
const M = {
  orange: mat(0xFF8044, { roughness: 0.6 }),
  blue:   mat(0x1D5BB0, { roughness: 0.45 }),
  silver: mat(0xE4E7EB, { metalness: 0.55, roughness: 0.3 }),
  can:    mat(0xE4E7EB, { metalness: 0.55, roughness: 0.3, side: THREE.DoubleSide }),
  green:  mat(0x2F8F5B, { roughness: 0.45 }),
  white:  mat(0xF5F2EA, { roughness: 0.42 }),
  plate:  mat(0xF8F4EC, { roughness: 0.62, envMapIntensity: 0.45 }),   // less fill light, so shadows on the plate read
  gold:   mat(0xD9AA3C, { metalness: 1, roughness: 0.3 }),
  black:  mat(0x1C1C1C, { roughness: 0.6 }),
  hole:   mat(0x0A0A0A, { roughness: 0.9, side: THREE.DoubleSide }),
};
function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const rbox = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function frameGeo(w, h, t = 0.18, r = 0.4) {        // flat outline, lying on XZ
  const s = roundRectShape(w + t * 2, h + t * 2, r + t);
  const hole = roundRectShape(w, h, r); s.holes.push(new THREE.Path(hole.getPoints()));
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g;
}
const damp = (k, dt) => 1 - Math.exp(-dt * k);
// Soft contact shadow: a blurred dark pad under every module, so parts separate from the plate from any angle.
const contactTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.filter = 'blur(16px)'; g.fillStyle = '#000';
  g.beginPath(); g.roundRect(36, 36, 184, 184, 26); g.fill();
  return new THREE.CanvasTexture(c);
})();
function contactShadow(foot, pad = 1.0, opacity = 0.72) {
  const w = foot.x1 - foot.x0 + pad * 2, d = foot.z1 - foot.z0 + pad * 2;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: contactTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((foot.x0 + foot.x1) / 2, 0.012, (foot.z0 + foot.z1) / 2);
  m.raycast = () => {}; m.renderOrder = -1; return m;
}
const shortAngle = (from, to) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from));

/* ---------- table ---------- */
const dotTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#E4121B'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#C20C15'; g.beginPath(); g.arc(64, 64, 30, 0, Math.PI * 2); g.fill();
});
dotTex.wrapS = dotTex.wrapT = THREE.RepeatWrapping; dotTex.repeat.set(90, 90);
const table = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ map: dotTex, color: 0xD6D6D6, roughness: 0.9 }));
table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
const TABLE_LIMIT = 30;

/* =====================================================================
   PART MODELS
   ===================================================================== */
// ---- base plate (geometry shared by every plate) ----
const PLATE = { n: 16, holeR: 0.31, half: 8.35, top: 0.32 };
const PT = PLATE.top;
const plateGeo = (() => {
  const s = roundRectShape(PLATE.half * 2, PLATE.half * 2, 0.6);
  for (let i = 0; i < PLATE.n; i++) for (let j = 0; j < PLATE.n; j++) {
    const h = new THREE.Path(); h.absarc(i - 7.5, j - 7.5, PLATE.holeR, 0, Math.PI * 2, true); s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.26, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0.03, 0); return g;
})();

// ---- ultrasonic sensor ----
const pcbTex = canvasTex(1024, 444, (g, w, h) => {
  g.fillStyle = '#1D5BB0'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(420 + i * 30, 60); g.lineTo(420 + i * 30, 300); g.stroke(); }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 44px Arial'; g.fillText('HC-SR04', w / 2, 56);
  g.font = 'bold 60px Arial'; g.fillText('T', 92, 380); g.fillText('R', w - 92, 380);
  g.font = 'bold 26px Arial'; ['Vcc', 'Trig', 'Echo', 'Gnd'].forEach((s, i) => g.fillText(s, w / 2 + (i - 1.5) * 58, 330));
});
const grilleTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1b1e';
  for (let y = 4; y < h; y += 8) for (let x = 4 + ((y / 8) % 2) * 4; x < w; x += 8) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
});
const adTex = canvasTex(256, 368, (g, w, h) => {
  g.fillStyle = '#2F8F5B'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(22, 22, w - 44, 120);
  g.fillStyle = '#fff'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.fillText('ZAP', w / 2, 98);
  g.fillStyle = '#D9AA3C'; for (let i = 0; i < 4; i++) g.fillRect(48 + i * 46, 180, 26, 26);
});
const pcbMat = new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45 });
const grilleMat = new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.7, metalness: 0.3 });
const adMat = new THREE.MeshStandardMaterial({ map: adTex, roughness: 0.45 });
const PITCH = 0.22, PIN_X = [-1.5, -0.5, 0.5, 1.5].map(i => i * PITCH);

function buildUltrasonic(parts) {
  mesh(rbox(4.9, 1.1, 2.3, 0.12), M.orange, 0, 0.55, 0, parts);
  mesh(rbox(4.9, 0.32, 0.18, 0.06), M.orange, 0, 1.22, -1.06, parts);
  mesh(rbox(4.9, 0.32, 0.18, 0.06), M.orange, 0, 1.22, 1.06, parts);
  mesh(rbox(0.18, 0.32, 2.3, 0.06), M.orange, -2.36, 1.22, 0, parts);
  mesh(rbox(0.18, 0.32, 2.3, 0.06), M.orange, 2.36, 1.22, 0, parts);
  mesh(box(4.5, 0.1, 1.95), M.blue, 0, 1.15, 0, parts);
  const top = mesh(new THREE.PlaneGeometry(4.5, 1.95), pcbMat, 0, 1.201, 0, parts); top.rotation.x = -Math.PI / 2;
  mesh(rbox(0.5, 0.08, 0.36, 0.02), M.black, -0.35, 1.24, -0.55, parts);
  mesh(rbox(0.5, 0.08, 0.36, 0.02), M.black, 0.35, 1.24, -0.55, parts);
  mesh(rbox(0.62, 0.24, 0.26, 0.11), M.silver, 0, 1.33, -0.05, parts);
  const transducers = [];
  for (const x of [-1.3, 1.3]) {
    const t = new THREE.Group(); t.position.set(x, 1.2, -0.02); parts.add(t);
    mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.08, 48), M.black, 0, 0.04, 0, t);
    mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.15, 48, 1, true), M.can, 0, 0.655, 0, t);
    mesh(new THREE.RingGeometry(0.66, 0.8, 48), M.silver, 0, 1.23, 0, t).rotation.x = -Math.PI / 2;
    mesh(new THREE.CircleGeometry(0.66, 48), grilleMat, 0, 1.15, 0, t).rotation.x = -Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.08, 48, 1, true), M.hole, 0, 1.19, 0, t);
    transducers.push(t);
  }
  mesh(box(1.1, 0.22, 0.24), M.black, 0, 1.31, 0.82, parts);
  PIN_X.forEach(x => mesh(box(0.05, 0.05, 0.5), M.gold, x, 1.42, 1.0, parts));
  mesh(box(1.35, 0.1, 1.95), M.green, 0, 1.47, 1.82, parts);
  const ad = mesh(new THREE.PlaneGeometry(1.35, 1.95), adMat, 0, 1.521, 1.82, parts); ad.rotation.x = -Math.PI / 2;
  mesh(rbox(0.5, 1.42, 0.4, 0.08), M.orange, 0, 0.71, 2.3, parts);
  zapPort(parts, 1.81, 2.49, false);
  return { transducers };
}
// Module-side Zap socket (white keyed housing). Centre at (0, y, z); mouth faces +z, or -z when flipped.
function zapPort(parts, y, z, flip) {
  const port = new THREE.Group(); port.position.set(0, y, z); if (flip) port.rotation.y = Math.PI; parts.add(port);
  mesh(rbox(1.18, 0.56, 0.6, 0.05), M.white, 0, 0, 0, port);
  mesh(box(0.98, 0.36, 0.02), M.hole, 0, 0, 0.3, port);
  mesh(box(0.3, 0.1, 0.02), M.hole, 0, 0.21, 0.3, port);
  mesh(box(0.3, 0.012, 0.56), M.hole, 0, 0.281, 0.0, port);
  PIN_X.forEach(x => mesh(box(0.05, 0.05, 0.02), M.gold, x, -0.04, 0.305, port));
  return port;
}
// The "world" the ultrasonic measures: a block hovering above the transducers, dragged up and down.
// Distance (cm) <-> height above the sensor: square-root scale, so near readings get more room.
const US_MIN = 2, US_MAX = 200, US_H0 = 2.85, US_H1 = 11.5;
const usHeight = d => US_H0 + (US_H1 - US_H0) * Math.sqrt(THREE.MathUtils.clamp((d - US_MIN) / (US_MAX - US_MIN), 0, 1) || 0);
const usDist = h => US_MIN + (US_MAX - US_MIN) * ((h - US_H0) / (US_H1 - US_H0)) ** 2;
const usTopTex = canvasTex(512, 244, (g, w, h) => {
  g.fillStyle = '#FFF2DF'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111'; g.font = '800 54px Poppins, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('↕  DRAG ME', w / 2, h / 2);
});
const guideMat = new THREE.MeshBasicMaterial({ color: 0xFFF2DF, transparent: true, opacity: 0.55, depthWrite: false });
function buildUsTarget(m) {
  const T = new THREE.Group(); T.position.set(0, usHeight(m.state.distance), -0.02);
  mesh(rbox(4.4, 0.3, 2.1, 0.12), mat(0xFFF2DF, { roughness: 0.55 }), 0, 0, 0, T);
  const top = mesh(new THREE.PlaneGeometry(4.1, 1.95), new THREE.MeshStandardMaterial({ map: usTopTex, roughness: 0.55 }), 0, 0.152, 0, T);
  top.rotation.x = -Math.PI / 2; top.castShadow = false;
  const gg = new THREE.CylinderGeometry(0.035, 0.035, 1, 6); gg.translate(0, -0.5, 0);
  const guide = new THREE.Mesh(gg, guideMat); guide.position.y = -0.15; guide.raycast = () => {}; T.add(guide);
  T.userData.ref = { type: 'target', m };
  m.group.add(T); m.built.target = T; m.built.guide = guide;
}

// ---- Quark C3 controller (from the product photos: top, both long sides, terminal end) ----
// Polygon with rounded corners. pts: [x, z, r] in module space (z toward the viewer).
function roundPoly(pts) {
  const s = new THREE.Shape(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(p[2], da / 2), rb = Math.min(p[2], db / 2);
    const p1 = [p[0] + (a[0] - p[0]) / da * ra, -(p[1] + (a[1] - p[1]) / da * ra)];
    const p2 = [p[0] + (b[0] - p[0]) / db * rb, -(p[1] + (b[1] - p[1]) / db * rb)];
    if (i === 0) s.moveTo(...p1); else s.lineTo(...p1);
    s.quadraticCurveTo(p[0], -p[1], ...p2);
  }
  s.closePath(); return s;
}
const rectPts = (x0, x1, z0, z1, r) => [[x0, z0, r], [x1, z0, r], [x1, z1, r], [x0, z1, r]];
const QW = 3, QD = 2.15, QH = 1.3, QPCB = 0.32;          // half width, half depth, height, PCB top
const Q_WIN_A = [0.2, 1.95, -1.45, -1.0];                 // window over the far-edge sockets
const Q_WIN_B = [-0.45, 2.05, -0.2, 1.3];                 // window over the 3 × 8 header
const Q_SOCK_X = [0.55, 1.65];
const qShellGeo = (() => {
  const b = 0.05;                                          // bevel grows the outline, so inset by it
  const outline = roundPoly([
    [-QW + b, -QD + b, 0.42], [QW - b, -QD + b, 0.42], [QW - b, -0.7 - b, 0.1], [2.3 - b, -0.7 - b, 0.1],
    [2.3 - b, 0.72 + b, 0.1], [QW - b, 0.72 + b, 0.1], [QW - b, QD - b, 0.42], [-QW + b, QD - b, 0.42],
    [-QW + b, 1.33 + b, 0.1], [-1.95 + b, 1.33 + b, 0.1], [-1.95 + b, 0.43 - b, 0.1], [-QW + b, 0.43 - b, 0.1]]);
  for (const w of [Q_WIN_A, Q_WIN_B]) outline.holes.push(new THREE.Path(roundPoly(rectPts(w[0] - b, w[1] + b, w[2] - b, w[3] + b, 0.14)).getPoints()));
  const half = (y0, y1) => {                               // two printed halves with a seam groove between
    const g = new THREE.ExtrudeGeometry(outline, { depth: y1 - y0 - 0.08, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.04, bevelSize: b, bevelSegments: 3 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0 + 0.04, 0); return g;
  };
  return [half(0, 0.63), half(0.65, QH)];
})();
const qHeaderCols = i => 0.81 + (i - 3.5) * 0.24, qHeaderRows = j => 0.52 + (j - 1) * 0.24;
const qPcbB = canvasTex(1000, 600, (g, w, h) => {            // 400 px per unit; matches Q_WIN_B
  const px = x => (x - Q_WIN_B[0]) * 400, pz = z => (z - Q_WIN_B[2]) * 400;
  g.fillStyle = '#2B8A6B'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 6;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(px(qHeaderCols(i)) + 48, pz(0.9)); g.lineTo(px(qHeaderCols(i)) + 48, pz(1.25)); g.stroke(); }
  g.fillStyle = '#F2F2EA'; g.strokeStyle = '#F2F2EA'; g.lineWidth = 4; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 34px monospace';
  [['Port1', 0, 1], ['Port2', 2, 3], ['Motor', 4, 7]].forEach(([t, a, c]) => {
    const x0 = px(qHeaderCols(a)) - 44, x1 = px(qHeaderCols(c)) + 44;
    g.strokeRect(x0, 22, x1 - x0, 48); g.fillText(t, (x0 + x1) / 2, 47);
  });
  for (let i = 0; i < 8; i++) g.fillText(String(i + 1), px(qHeaderCols(i)), 110);
  g.font = '600 30px monospace'; g.textAlign = 'right';
  ['I/O', '5V', 'GND'].forEach((t, j) => g.fillText(t, px(qHeaderCols(0)) - 52, pz(qHeaderRows(j))));
  g.font = '600 40px monospace'; g.textAlign = 'center';
  g.fillText('Port 1', px(Q_SOCK_X[0]), pz(1.12)); g.fillText('Port 2', px(Q_SOCK_X[1]), pz(1.12));
});
const qPcbA = canvasTex(700, 180, (g, w, h) => {             // matches Q_WIN_A
  g.fillStyle = '#2B8A6B'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#F2F2EA'; g.font = '600 38px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('Port 3', (Q_SOCK_X[0] - Q_WIN_A[0]) * 400, 132); g.fillText('Port 4', (Q_SOCK_X[1] - Q_WIN_A[0]) * 400, 132);
});
const qMat = {
  shell: mat(0xF4F1EA, { roughness: 0.78 }),
  pcbA: new THREE.MeshStandardMaterial({ map: qPcbA, roughness: 0.5 }),
  pcbB: new THREE.MeshStandardMaterial({ map: qPcbB, roughness: 0.5 }),
  pcb: mat(0x2B8A6B, { roughness: 0.5 }),
  term: mat(0x3FAE78, { roughness: 0.45 }),
  recess: mat(0x55585C, { roughness: 0.8 }),
};
// Zap socket set into an edge wall. dir +1 = mouth faces +z, -1 = faces -z.
function zapSocket(parent, x, edgeZ, dir) {
  const g = new THREE.Group(); g.position.set(x, 0.61, edgeZ + dir * 0.012); g.rotation.y = dir > 0 ? 0 : Math.PI; parent.add(g);
  mesh(box(1.06, 0.58, 0.95), M.white, 0, 0, -0.475, g);
  mesh(box(0.96, 0.38, 0.02), M.hole, 0, -0.02, 0.0, g);
  mesh(box(0.3, 0.1, 0.02), M.hole, 0, 0.19, 0.0, g);                                   // key slot
  PIN_X.forEach(px => {
    mesh(box(0.05, 0.05, 0.02), M.gold, px, -0.06, 0.005, g);
    mesh(box(0.05, 0.05, 0.22), M.gold, px, -0.12, -1.04, g);                            // pin tails, seen through the window
  });
  return g;
}
function buildQuark(parts) {
  qShellGeo.forEach(geo => mesh(geo, qMat.shell, 0, 0, 0, parts));
  mesh(box(QW * 2 - 0.2, 0.08, QD * 2 - 0.2), qMat.pcb, 0, QPCB - 0.04, 0, parts);
  const plane = (w, matl) => { const p = mesh(new THREE.PlaneGeometry(w[1] - w[0], w[3] - w[2]), matl, (w[0] + w[1]) / 2, QPCB + 0.002, (w[2] + w[3]) / 2, parts); p.rotation.x = -Math.PI / 2; p.castShadow = false; };
  plane(Q_WIN_A, qMat.pcbA); plane(Q_WIN_B, qMat.pcbB);
  // 3 × 8 header (I/O, 5V, GND × Port1, Port2, Motor)
  for (let j = 0; j < 3; j++) {
    mesh(box(8 * 0.24, 0.2, 0.22), M.black, qHeaderCols(3.5), QPCB + 0.1, qHeaderRows(j), parts);
    for (let i = 0; i < 8; i++) mesh(box(0.055, 0.66, 0.055), M.gold, qHeaderCols(i), QPCB + 0.4, qHeaderRows(j), parts);
  }
  // Zap sockets: two on the near edge, two on the far edge, each in a grey recess
  for (const dir of [1, -1]) {
    mesh(box(2.34, 0.72, 0.02), qMat.recess, 1.1, 0.6, dir * (QD + 0.004), parts);
    Q_SOCK_X.forEach(x => zapSocket(parts, x, dir * QD, dir));
  }
  // power jack on the left edge
  mesh(rbox(1.25, 0.6, 0.86, 0.1), M.black, -QW + 0.4, QPCB + 0.3, 0.88, parts);
  const bore = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), M.hole, -QW - 0.23, QPCB + 0.3, 0.88, parts); bore.rotation.z = Math.PI / 2;
  const pin = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), M.silver, -QW - 0.23, QPCB + 0.3, 0.88, parts); pin.rotation.z = Math.PI / 2;
  // 4-way screw terminal in the right-hand notch (motor output)
  mesh(rbox(0.78, 0.88, 1.36, 0.05), qMat.term, 2.69, QPCB + 0.44, 0.01, parts);
  mesh(box(0.8, 0.9, 0.03), M.black, 2.69, QPCB + 0.44, 0.01, parts);          // split between the two 2-way blocks
  for (let k = 0; k < 4; k++) {
    const z = 0.01 + (k - 1.5) * 0.33;
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20), M.silver, 2.6, QPCB + 0.9, z, parts);
    mesh(box(0.2, 0.02, 0.035), M.hole, 2.6, QPCB + 0.935, z, parts).rotation.y = 0.6;
    mesh(box(0.02, 0.2, 0.2), M.hole, 3.085, QPCB + 0.32, z, parts);
  }
  // buttons, as in the brochure render: orange cross and orange round cap
  // In the simulator they drive the OLED menu: cross = next, round = select / back.
  const cross = [Math.PI / 4, -Math.PI / 4].map(a => {
    const b = mesh(rbox(0.66, 0.12, 0.17, 0.05), M.orange, -1.43, QH + 0.03, -1.6, parts); b.rotation.y = a; b.userData.btn = 'next'; return b;
  });
  const round = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 32), M.orange, -1.43, QH + 0.03, -0.86, parts); round.userData.btn = 'ok';
  // on-board RGB LED, just left of the buttons (founder, 2026-11-19): driven by code with led.color()
  mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 32), M.black, -2.2, QH + 0.005, -1.22, parts);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xE8E8E8, roughness: 0.3, emissive: 0x000000, emissiveIntensity: 1.4 });
  const dome = mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ledMat, -2.2, QH + 0.02, -1.22, parts);
  dome.scale.y = 0.6;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.set(-2.2, QH + 0.01, -1.22); halo.raycast = () => {}; halo.castShadow = false; parts.add(halo);
  return { buttons: { next: cross, ok: [round] }, rgb: { mat: ledMat, halo } };
}

// ---- OLED display (from the product photo: orange tray, blue PCB, dark glass, connector at the back) ----
const OLED_W = 128, OLED_H = 64, OLED_S = 4;                 // logical pixels, and the texture scale per pixel
const oledPcbTex = canvasTex(700, 630, (g, w, h) => {        // 200 px per unit; plane is 3.5 × 3.15
  g.fillStyle = '#1D5BB0'; g.fillRect(0, 0, w, h);
  for (const [x, y] of [[44, 44], [w - 44, 44], [44, h - 44], [w - 44, h - 44]]) {
    g.fillStyle = '#EDE6D6'; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill();
    g.fillStyle = '#C8302A'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill();
  }
  g.fillStyle = '#fff'; g.font = 'bold 24px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['VCC', 'GND', 'SCL', 'SDA'].forEach((s, i) => g.fillText(s, w / 2 + (i - 1.5) * 64, 30));
});
const oledGlassMat = mat(0x0B0F14, { roughness: 0.12, metalness: 0.3 });
const OLED_GRID = (() => {                                   // the unlit pixel grid, drawn once and shared
  const c = document.createElement('canvas'); c.width = OLED_W * OLED_S; c.height = OLED_H * OLED_S;
  const g = c.getContext('2d'); g.fillStyle = '#020305'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#0B1119';
  for (let y = 0; y < OLED_H; y++) for (let x = 0; x < OLED_W; x++) g.fillRect(x * OLED_S + 0.4, y * OLED_S + 0.4, 3.3, 3.3);
  return c;
})();
function buildOled(parts) {
  mesh(rbox(3.9, 1.1, 3.5, 0.12), M.orange, 0, 0.55, 0, parts);
  mesh(rbox(3.9, 0.32, 0.18, 0.06), M.orange, 0, 1.22, -1.66, parts);
  mesh(rbox(3.9, 0.32, 0.18, 0.06), M.orange, 0, 1.22, 1.66, parts);
  mesh(rbox(0.18, 0.32, 3.5, 0.06), M.orange, -1.86, 1.22, 0, parts);
  mesh(rbox(0.18, 0.32, 3.5, 0.06), M.orange, 1.86, 1.22, 0, parts);
  mesh(box(3.5, 0.1, 3.15), M.blue, 0, 1.15, 0, parts);
  const top = mesh(new THREE.PlaneGeometry(3.5, 3.15), new THREE.MeshStandardMaterial({ map: oledPcbTex, roughness: 0.45 }), 0, 1.201, 0, parts); top.rotation.x = -Math.PI / 2;
  // glass panel, the live screen, and the driver ribbon below it
  mesh(rbox(3.1, 0.14, 1.95, 0.03), oledGlassMat, 0, 1.27, -0.2, parts);
  const lc = document.createElement('canvas'); lc.width = OLED_W; lc.height = OLED_H;
  const lctx = lc.getContext('2d', { willReadFrequently: true });
  const oc = document.createElement('canvas'); oc.width = OLED_W * OLED_S; oc.height = OLED_H * OLED_S;
  const octx = oc.getContext('2d'); octx.fillStyle = '#020305'; octx.fillRect(0, 0, oc.width, oc.height);
  const tex = new THREE.CanvasTexture(oc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.35), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.position.set(0, 1.343, -0.22); scr.rotation.x = -Math.PI / 2; parts.add(scr);
  mesh(box(1.9, 0.08, 0.2), M.black, 0, 1.24, 0.9, parts);
  mesh(box(1.4, 0.05, 0.42), M.silver, 0, 1.22, 1.18, parts);
  // header at the back, Zap adapter and socket facing away from the viewer
  mesh(box(1.1, 0.22, 0.24), M.black, 0, 1.31, -1.42, parts);
  PIN_X.forEach(x => mesh(box(0.05, 0.05, 0.5), M.gold, x, 1.42, -1.6, parts));
  mesh(box(1.35, 0.1, 1.4), M.green, 0, 1.47, -2.1, parts);
  const ad = mesh(new THREE.PlaneGeometry(1.35, 1.4), adMat, 0, 1.521, -2.1, parts); ad.rotation.x = -Math.PI / 2; ad.rotation.z = Math.PI;
  mesh(rbox(0.5, 1.42, 0.4, 0.08), M.orange, 0, 0.71, -2.3, parts);
  zapPort(parts, 1.81, -2.49, true);
  return { screen: { lctx, octx, tex, hash: 0 } };
}

// ---- DHT11 temperature & humidity (from the product photo: narrow orange tray, green PCB,
//      blue grilled sensor at the back, white socket at the front end) ----
const DHT_W = 2.3, DHT_D = 3.6;
const DHT_T = [0, 50], DHT_H = [20, 90];                      // the DHT11's measuring range: °C and % relative humidity
const puffGeo = new THREE.SphereGeometry(0.35, 12, 8);
function breathe(m) {                                        // a warm, damp puff drifting onto the grille
  m.state.breath = 1;
  for (let i = 0; i < 8; i++) {
    const mt = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Mesh(puffGeo, mt), x0 = (Math.random() - 0.5) * 0.9, y0 = Math.random() * 0.4;
    s.raycast = () => {}; s.visible = false; m.group.add(s);
    m.fx.push({ obj: s, age: -i * 0.08, life: 1.2, update: a => {
      s.visible = true; s.position.set(x0 * (1 - a), 3.6 + y0 - 1.5 * a, 3.4 - 4 * a);
      s.scale.setScalar(0.5 + a * 1.5); mt.opacity = Math.sin(a * Math.PI) * 0.5;
    } });
  }
  kick();
}
const dhtPcbTex = canvasTex(388, 660, (g, w, h) => {          // 200 px per unit; plane is 1.94 × 3.3
  g.fillStyle = '#1F7A55'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 4;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(155 + i * 26, 360); g.lineTo(155 + i * 26, 470); g.lineTo(140 + i * 36, 540); g.stroke(); }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 34px Arial'; g.fillText('DHT11', w / 2, 420);
  g.font = 'bold 18px Arial'; g.fillText('VCC  DATA  NC  GND', w / 2, 470);
});
const dhtGrilleTex = canvasTex(250, 316, (g, w, h) => {      // matches the 1.15 × 1.45 top face
  g.fillStyle = '#35A7DC'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#0D4A6B';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.roundRect(30 + c * 50, 24 + r * 56, 36, 40, 6); g.fill(); }
});
function buildDht(parts) {
  mesh(rbox(DHT_W, 1.1, DHT_D, 0.12), M.orange, 0, 0.55, 0, parts);
  mesh(rbox(DHT_W, 0.32, 0.18, 0.06), M.orange, 0, 1.22, -DHT_D / 2 + 0.09, parts);           // back rim; the socket end stays open
  mesh(rbox(0.18, 0.32, DHT_D, 0.06), M.orange, -DHT_W / 2 + 0.09, 1.22, 0, parts);
  mesh(rbox(0.18, 0.32, DHT_D, 0.06), M.orange, DHT_W / 2 - 0.09, 1.22, 0, parts);
  mesh(box(DHT_W - 0.36, 0.1, DHT_D - 0.3), M.green, 0, 1.15, 0, parts);
  const top = mesh(new THREE.PlaneGeometry(DHT_W - 0.36, DHT_D - 0.3), new THREE.MeshStandardMaterial({ map: dhtPcbTex, roughness: 0.45 }), 0, 1.201, 0, parts);
  top.rotation.x = -Math.PI / 2;
  // the blue sensor body and its four legs
  mesh(rbox(1.3, 0.78, 1.6, 0.06), mat(0x35A7DC, { roughness: 0.55 }), 0, 1.59, -0.65, parts);
  const gr = mesh(new THREE.PlaneGeometry(1.15, 1.45), new THREE.MeshStandardMaterial({ map: dhtGrilleTex, roughness: 0.55 }), 0, 1.982, -0.65, parts);
  gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  [-0.39, -0.13, 0.13, 0.39].forEach(x => {
    mesh(box(0.05, 0.05, 0.36), M.gold, x, 1.42, 0.31, parts);
    mesh(box(0.05, 0.22, 0.05), M.gold, x, 1.32, 0.48, parts);
  });
  // small parts and the power LED (glows when the module has power)
  mesh(box(0.3, 0.07, 0.15), M.black, -0.55, 1.235, 0.85, parts);
  mesh(box(0.26, 0.07, 0.13), mat(0x2a2a2a), 0.05, 1.235, 0.85, parts);
  const led = mesh(box(0.16, 0.08, 0.11), new THREE.MeshStandardMaterial({ color: 0x5a1010, emissive: 0xff2a2a, emissiveIntensity: 0, roughness: 0.4 }), 0.6, 1.24, 0.85, parts);
  zapPort(parts, 1.48, 1.55, false);
  return { led };
}

// ---- Small Quark modules (light, IR, potentiometer, buttons): orange tray, green PCB, socket at the front (+z) ----
function trayPcbTex(w, d, draw) {                            // 200 px per unit; canvas top = back of the module
  return canvasTex(Math.round((w - 0.36) * 200), Math.round((d - 0.3) * 200), (g, W, H) => {
    g.fillStyle = '#1F7A55'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    draw(g, W, H);
  });
}
function pcbHole(g, x, y, ring) {
  if (ring) { g.fillStyle = '#C8302A'; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill(); }
  g.fillStyle = '#0B2419'; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill(); g.fillStyle = '#fff';
}
function smallTray(parts, w, d, tex) {
  mesh(rbox(w, 1.1, d, 0.12), M.orange, 0, 0.55, 0, parts);
  mesh(rbox(w, 0.32, 0.18, 0.06), M.orange, 0, 1.22, -d / 2 + 0.09, parts);
  mesh(rbox(0.18, 0.32, d, 0.06), M.orange, -w / 2 + 0.09, 1.22, 0, parts);
  mesh(rbox(0.18, 0.32, d, 0.06), M.orange, w / 2 - 0.09, 1.22, 0, parts);
  mesh(box(w - 0.36, 0.1, d - 0.3), M.green, 0, 1.15, 0, parts);
  const top = mesh(new THREE.PlaneGeometry(w - 0.36, d - 0.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }), 0, 1.201, 0, parts);
  top.rotation.x = -Math.PI / 2;
  zapPort(parts, 1.48, d / 2 - 0.25, false);
}
const trayFoot = (w, d) => ({ x0: -w / 2 - 0.05, x1: w / 2 + 0.05, z0: -d / 2 - 0.05, z1: d / 2 + 0.15 });
const trayPort = (d, pins) => [{ x: 0, y: 1.48, mouthZ: d / 2 + 0.05, rot: 0, label: 'Zap 4-pin', pins }];
const noRay = o => { o.traverse(c => { c.raycast = () => {}; }); return o; };
const setText = (id, s) => { const el = document.getElementById(id); if (el) el.textContent = s; };
const nowT = () => clock.elapsedTime;
// event sensors (buttons, IR, RFID) log what happened; apps on the OLED read the log since they last looked
function sensorEvent(m, e) {
  if (!powered(m)) { toast(`${m.name} has no power yet. Wire it to a Quark C3.`); return false; }
  const s = m.state; s.seq++;
  s.ev.push({ ...e, seq: s.seq, t: nowT(), ms: performance.now() }); if (s.ev.length > 24) s.ev.shift();
  kick(); return true;
}
const readRow = m => `<div class="row"><span>Reading</span><span id="liveRead">${liveText(m)}</span></div>`;

// ---- Light sensor (LDR) ----
const LS_W = 2.6, LS_D = 3.0, SMART_DARK = 30;               // below 30 % light, Smart lighting switches the lights on
const ldrFaceTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#E2A15C'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#7A2E14'; g.lineWidth = 7;
  for (let i = 0; i < 7; i++) { const y = 18 + i * 15.5; g.beginPath(); g.moveTo(i % 2 ? 0 : 26, y); g.lineTo(i % 2 ? 102 : 128, y); g.stroke(); }
});
function buildLight(parts) {
  smallTray(parts, LS_W, LS_D, trayPcbTex(LS_W, LS_D, (g, W, H) => {
    pcbHole(g, 340, 150); pcbHole(g, 110, 340);
    g.font = 'bold 24px Arial'; g.fillText('R1', 154, 70);
    g.font = 'bold 30px Arial'; g.fillText('LIGHT', W / 2, 400);
  }));
  // the LDR: a small ceramic disc on two legs
  [-0.12, 0.12].forEach(x => mesh(box(0.05, 0.26, 0.05), M.gold, -0.35 + x, 1.32, -0.45, parts));
  mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32), mat(0xC98A4E, { roughness: 0.6 }), -0.35, 1.53, -0.45, parts);
  const faceMat = new THREE.MeshStandardMaterial({ map: ldrFaceTex, roughness: 0.5, emissive: 0xFFC56B, emissiveIntensity: 0 });
  const face = mesh(new THREE.CircleGeometry(0.28, 32), faceMat, -0.35, 1.632, -0.45, parts); face.rotation.x = -Math.PI / 2;
  mesh(box(0.3, 0.07, 0.15), M.black, 0.45, 1.235, -0.35, parts);
  mesh(box(0.26, 0.07, 0.13), mat(0x2a2a2a), 0.45, 1.235, 0.0, parts);
  // the cover: lowered over the LDR to block the light
  const cover = new THREE.Group(); cover.position.set(-0.35, 4.8, -0.45); cover.visible = false; parts.add(cover);
  const cm = mat(0x2B2B2E, { roughness: 0.5, side: THREE.DoubleSide });
  mesh(new THREE.CylinderGeometry(0.6, 0.66, 0.6, 32, 1, true), cm, 0, 0, 0, cover);
  mesh(new THREE.CircleGeometry(0.6, 32), cm, 0, 0.3, 0, cover).rotation.x = -Math.PI / 2;
  noRay(cover);
  return { faceMat, cover };
}

// ---- IR receiver + a remote to point at it ----
const IR_W = 2.6, IR_D = 3.0;
// NEC codes of the common 17-key learning-kit remote (assumption: the kit's own remote may differ)
const IR_KEYS = [['1', 0xFFA25D], ['2', 0xFF629D], ['3', 0xFFE21D], ['4', 0xFF22DD], ['5', 0xFF02FD], ['6', 0xFFC23D],
  ['7', 0xFFE01F], ['8', 0xFFA857], ['9', 0xFF906F], ['*', 0xFF6897], ['0', 0xFF9867], ['#', 0xFFB04F],
  ['left', 0xFF10EF], ['up', 0xFF18E7], ['down', 0xFF4AB5], ['right', 0xFF5AA5], ['ok', 0xFF38C7]];
const IR_CODE = Object.fromEntries(IR_KEYS);
const irLabel = k => ({ up: '▲', down: '▼', left: '◀', right: '▶', ok: 'OK' })[k] || k;
const irHex = c => '0x' + c.toString(16).toUpperCase();
const remoteTex = canvasTex(230, 580, (g, w, h) => {
  g.fillStyle = '#2B2B2E'; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 22px Arial';
  const rows = [['', 'up', ''], ['left', 'ok', 'right'], ['', 'down', ''], ['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']];
  rows.forEach((r, j) => r.forEach((k, i) => {
    if (!k) return;
    const x = 50 + i * 65, y = 60 + j * 70;
    g.fillStyle = k === 'ok' ? '#E4121B' : '#4A4A50'; g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.fillText(irLabel(k), x, y + 1);
  }));
});
function buildIr(parts) {
  smallTray(parts, IR_W, IR_D, trayPcbTex(IR_W, IR_D, (g, W, H) => {
    pcbHole(g, 70, 300, true); pcbHole(g, 378, 300, true);
    g.font = 'bold 24px Arial'; g.fillText('U1', W / 2, 300);
    g.font = 'bold 30px Arial'; g.fillText('IR', W / 2, 395);
  }));
  // the receiver in its metal shield, dome up
  mesh(rbox(1.0, 0.5, 0.8, 0.06), M.silver, 0, 1.45, -0.55, parts);
  mesh(rbox(0.72, 0.3, 0.56, 0.1), M.black, 0, 1.75, -0.55, parts);
  mesh(new THREE.SphereGeometry(0.24, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x111111, { roughness: 0.2 }), 0, 1.88, -0.55, parts);
  [-0.2, 0, 0.2].forEach(x => mesh(box(0.05, 0.05, 0.4), M.gold, x, 1.3, 0.0, parts));
  const sig = mesh(box(0.16, 0.08, 0.11), new THREE.MeshStandardMaterial({ color: 0x5a1010, emissive: 0xff2a2a, emissiveIntensity: 0, roughness: 0.4 }), 0.75, 1.24, 0.55, parts);
  // the remote hovers in front, tilted so its tip points at the dome
  const rg = new THREE.Group(); rg.position.set(0, 4.3, 3.4); rg.rotation.x = -0.52; parts.add(rg);
  mesh(rbox(1.25, 0.24, 3.0, 0.1), mat(0x2B2B2E, { roughness: 0.5 }), 0, 0, 0, rg);
  const top = mesh(new THREE.PlaneGeometry(1.15, 2.9), new THREE.MeshStandardMaterial({ map: remoteTex, roughness: 0.5 }), 0, 0.121, 0, rg);
  top.rotation.x = -Math.PI / 2; top.castShadow = false;
  const led = mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3a0a0a, emissive: 0xff3030, emissiveIntensity: 0 }), 0, 0, -1.52, rg);
  rg.updateMatrix();
  const tip = V(0, 0, -1.6).applyMatrix4(rg.matrix);
  return { sig, remote: { led, tip, dome: V(0, 1.95, -0.55) } };
}
function irBeam(m) {                                          // IR is invisible: the red rings show it
  const { tip, dome } = m.built.remote;
  for (let i = 0; i < 4; i++) {
    const mt = new THREE.MeshBasicMaterial({ color: 0xFF3B3B, transparent: true, opacity: 0, depthWrite: false });
    const r = new THREE.Mesh(pingGeo, mt); r.raycast = () => {}; r.visible = false; r.rotation.x = -0.52; m.group.add(r);
    m.fx.push({ obj: r, age: -i * 0.06, life: 0.4, update: a => {
      r.visible = true; r.position.lerpVectors(tip, dome, a); r.scale.setScalar(0.18 + a * 0.35); mt.opacity = Math.sin(a * Math.PI) * 0.85;
    } });
  }
  kick();
}
function irPress(m, key) {
  const s = m.state, code = IR_CODE[key]; s.tx = nowT(); irBeam(m);
  if (sensorEvent(m, { type: 'ir', key, code })) { s.rx = nowT() + 0.2; s.last = { key, code }; }
  setTimeout(() => irFlash(key));                         // after any inspector re-render
}
function irFlash(key) {                                   // light the on-screen remote's IR LED and press its key
  const r = document.getElementById('irRemote'); if (!r) return;
  const b = r.querySelector(`[data-a="ir:${CSS.escape(key)}"]`);
  r.classList.add('tx'); b?.classList.add('hit');
  clearTimeout(irFlash.t); irFlash.t = setTimeout(() => { r.classList.remove('tx'); r.querySelectorAll('.hit').forEach(e => e.classList.remove('hit')); }, 160);
}

// ---- Potentiometer ----
const POT_W = 2.6, POT_D = 3.2, POT_SWEEP = 300 * Math.PI / 180;   // a typical rotary pot turns about 300°
function buildPot(parts) {
  smallTray(parts, POT_W, POT_D, trayPcbTex(POT_W, POT_D, (g, W, H) => { pcbHole(g, 40, 40); pcbHole(g, W - 40, 40); }));
  mesh(box(1.2, 0.22, 1.2), M.silver, 0, 1.31, -0.45, parts);
  [-0.3, 0, 0.3].forEach(x => mesh(box(0.08, 0.06, 0.35), M.gold, x, 1.24, 0.35, parts));
  const knob = new THREE.Group(); knob.position.set(0, 1.42, -0.45); parts.add(knob);
  const km = mat(0x1E1E1E, { roughness: 0.55, flatShading: true });
  mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.14, 40), km, 0, 0.07, 0, knob);
  mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.85, 24), km, 0, 0.56, 0, knob);
  const ym = mat(0xF2C230, { roughness: 0.45 });
  mesh(box(0.1, 0.05, 0.62), ym, 0, 1.0, -0.45, knob);                    // pointer line on top
  mesh(box(0.1, 0.42, 0.07), ym, 0, 0.78, -0.85, knob);                   // and down the side
  knob.userData.act = 'knob';
  return { knob };
}
function syncPot(m) {
  if (selected !== m) return;
  setText('pt-v', `${Math.round(m.state.v)} %`);
  const r = document.querySelector('#insp input[data-k="v"]'); if (r && document.activeElement !== r) r.value = Math.round(m.state.v);
}

// ---- Dual push button ----
const BT_W = 3.4, BT_D = 2.6, BT_CAP_Y = 1.73;
function buildButtons(parts) {
  smallTray(parts, BT_W, BT_D, trayPcbTex(BT_W, BT_D, (g, W, H) => {
    g.font = 'bold 30px Arial'; g.fillText('1', 134, 305); g.fillText('2', 474, 305);
    pcbHole(g, 40, 40); pcbHole(g, W - 40, H - 40);
  }));
  const capMats = [mat(0xF4F1EA, { roughness: 0.4 }), mat(0xE0262B, { roughness: 0.4 })];
  const caps = [-0.85, 0.85].map((x, i) => {
    const base = mesh(box(0.95, 0.3, 0.95), M.black, x, 1.35, -0.3, parts);
    mesh(box(0.85, 0.03, 0.85), M.silver, x, 1.51, -0.3, parts);
    const cap = mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.42, 32), capMats[i], x, BT_CAP_Y, -0.3, parts);
    cap.userData.act = base.userData.act = 'btn' + i;
    return cap;
  });
  return { caps };
}
function pressButton(m, i, down) {
  const s = m.state; if (s.down[i] === down) return;
  s.down[i] = down; click(down ? 1.2 : 0.9); kick();
  if (down && sensorEvent(m, { type: 'press', btn: i })) s.count[i]++;
}

// ---- RFID reader (RC522) with a card and a key fob ----
const RF_W = 3.4, RF_D = 4.6;
// UIDs are made up for the simulator. The Door lock app lets the white card in.
const RF_TAGS = [{ name: 'White card', uid: 'A3 5F 12 9C', ok: true }, { name: 'Blue key fob', uid: '7B 21 E4 05', ok: false }];
const rfidTex = canvasTex(510, 690, (g, w, h) => {            // 150 px per unit
  g.fillStyle = '#1D5BB0'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#7FA6E0'; g.lineWidth = 5;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.roundRect(40 + i * 14, 30 + i * 14, w - 80 - i * 28, 300 - i * 28, 28); g.stroke(); }
  g.strokeStyle = '#fff'; g.lineWidth = 6;
  for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(w / 2, 220, i * 28, -Math.PI * 0.8, -Math.PI * 0.2); g.stroke(); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, 220, 8, 0, 7); g.fill();
  g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillText('RFID-RC522', w / 2, 95);
  g.fillStyle = '#D9AA3C'; for (let i = 0; i < 8; i++) g.fillRect(118 + i * 38, 560, 20, 20);
});
function buildRfid(parts) {
  [-1.35, 1.35].forEach(x => mesh(rbox(0.4, 1.1, 4.0, 0.1), M.orange, x, 0.55, -0.1, parts));
  mesh(box(RF_W, 0.1, RF_D), M.blue, 0, 1.15, 0, parts);
  const top = mesh(new THREE.PlaneGeometry(RF_W, RF_D), new THREE.MeshStandardMaterial({ map: rfidTex, roughness: 0.45 }), 0, 1.201, 0, parts);
  top.rotation.x = -Math.PI / 2;
  mesh(box(0.5, 0.08, 0.5), M.black, 0.3, 1.24, 0.5, parts);
  mesh(rbox(0.55, 0.16, 0.22, 0.08), M.silver, -1.1, 1.28, 0.75, parts);
  const led = mesh(box(0.16, 0.08, 0.11), new THREE.MeshStandardMaterial({ color: 0x5a1010, emissive: 0xff2a2a, emissiveIntensity: 0, roughness: 0.4 }), 1.25, 1.24, 0.4, parts);
  mesh(box(1.5, 0.12, 0.8), M.green, 0, 1.12, 2.3, parts);
  zapPort(parts, 1.48, 2.25, false);
  const card = new THREE.Group(); parts.add(card);
  mesh(rbox(2.6, 0.05, 1.62, 0.02), mat(0xFBFBF8, { roughness: 0.35 }), 0, 0, 0, card);
  mesh(box(2.6, 0.01, 0.25), mat(0xE4121B), 0, 0.03, -0.55, card);
  const fob = new THREE.Group(); parts.add(fob);
  mesh(rbox(1.0, 0.22, 1.25, 0.1), mat(0x2E6FD8, { roughness: 0.4 }), 0, 0, 0, fob);
  mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 20), M.silver, 0, 0, -0.75, fob).rotation.x = Math.PI / 2;
  const tags = [card, fob].map(t => { t.visible = false; t.position.set(0, 5.5, -0.9); return noRay(t); });
  return { led, tags };
}
function tapTag(m, i) { if (!m.state.tap) { m.state.tap = { i, t: 0, fired: false }; kick(); } }

// ---- RGB LED: simulator-only output (not one of the 13 kit modules), driven by code ----
const LED_W = 2.3, LED_D = 2.6;
const haloTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
function buildRgb(parts) {
  smallTray(parts, LED_W, LED_D, trayPcbTex(LED_W, LED_D, (g, W, H) => {
    g.font = 'bold 22px Arial'; g.fillText('RGB', W / 2, 300); g.font = 'bold 15px Arial'; g.fillText('SIM ONLY', W / 2, 325);
  }));
  mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 32), M.white, 0, 1.26, -0.35, parts);
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xF4F4F4, roughness: 0.25, transparent: true, opacity: 0.92, emissive: 0x000000, emissiveIntensity: 1.6 });
  mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.45, 32), domeMat, 0, 1.54, -0.35, parts);
  mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, 0, 1.765, -0.35, parts);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2; halo.position.set(0, 1.23, -0.35); halo.raycast = () => {}; parts.add(halo);
  return { domeMat, halo };
}

// ---- Servo motor: an SG90 micro servo in the orange tray, long orange arm on the output shaft ----
// Angles like a protractor seen from the socket side: 0° points right, 90° points back, 180° points left.
// The SG90 turns about 60° in 0.1 s; the simulator runs a little slower so the move is easy to see.
const SV_W = 3.0, SV_D = 3.4, SV_PIV = V(0, 2.47, -0.35), SV_ARM = 1.9, SV_RATE = 450, SV_PX = 120;
const DEG = Math.PI / 180;
const svDialTex = canvasTex(512, 280, (g, w, h) => {           // a clear protractor under the arm (simulator aid)
  const cx = w / 2, cy = 262, R = 240, pt = (a, r) => [cx + Math.cos(a * DEG) * r, cy - Math.sin(a * DEG) * r];
  g.fillStyle = 'rgba(255,242,223,.72)'; g.beginPath(); g.moveTo(cx - R, cy); g.arc(cx, cy, R, Math.PI, 0); g.closePath(); g.fill();
  g.strokeStyle = '#111'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R - 3, Math.PI, 0); g.stroke();
  for (let a = 0; a <= 180; a += 15) {
    const [x0, y0] = pt(a, R - 3), [x1, y1] = pt(a, a % 45 ? R - 20 : R - 38);
    g.lineWidth = a % 45 ? 3 : 5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.fillStyle = '#C20C15'; g.font = 'bold 32px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const a of [0, 45, 90, 135, 180]) { const [x, y] = pt(a, R - 66); g.fillText(a + '°', x, Math.min(y, cy - 18)); }
});
function buildServo(parts) {
  smallTray(parts, SV_W, SV_D, trayPcbTex(SV_W, SV_D, (g, W, H) => {
    pcbHole(g, 40, 40); pcbHole(g, W - 40, 40);
    g.font = 'bold 30px Arial'; g.fillText('SERVO', W / 2, H - 170);
  }));
  const led = mesh(box(0.16, 0.08, 0.11), new THREE.MeshStandardMaterial({ color: 0x5a1010, emissive: 0xff2a2a, emissiveIntensity: 0, roughness: 0.4 }), 1.0, 1.24, 0.9, parts);
  // the SG90: smoky see-through case, mounting tabs, two gear bumps, white spline
  const sm = mat(0x2A2D33, { roughness: 0.22, transparent: true, opacity: 0.93 });
  mesh(rbox(2.0, 0.9, 1.15, 0.06), sm, 0.35, 1.65, SV_PIV.z, parts);
  mesh(rbox(2.4, 0.08, 1.15, 0.03), sm, 0.35, 1.86, SV_PIV.z, parts);
  mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 32), sm, 0, 2.19, SV_PIV.z, parts);
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 24), sm, 0.5, 2.15, SV_PIV.z, parts);
  mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 16), M.white, 0, 2.35, SV_PIV.z, parts);
  // the arm (servo horn): hub, long lever, holes, screw. Grab it to turn it.
  const arm = new THREE.Group(); arm.position.copy(SV_PIV); parts.add(arm);
  const am = mat(0xFF6A2B, { roughness: 0.5 });
  mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 28), am, 0, 0, 0, arm);
  mesh(rbox(SV_ARM, 0.13, 0.36, 0.05), am, SV_ARM / 2, 0, 0, arm);
  mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.13, 20), am, SV_ARM, 0, 0, arm);
  [0.75, 1.15, 1.55].forEach(x => mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), M.hole, x, 0.066, 0, arm));
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), M.silver, 0, 0.1, 0, arm);
  arm.userData.act = 'arm';
  // the protractor, centred on the shaft
  const dial = mesh(new THREE.PlaneGeometry(512 / SV_PX, 280 / SV_PX), new THREE.MeshBasicMaterial({ map: svDialTex, transparent: true, depthWrite: false }),
    0, 2.33, SV_PIV.z - (262 - 140) / SV_PX, parts);
  dial.rotation.x = -Math.PI / 2; dial.castShadow = dial.receiveShadow = false; noRay(dial);
  return { arm, led };
}
// what the servo follows when no program is running: one entry per sensor kind it understands
const SV_FOLLOW = {
  pot: ['Follow the knob', 'Turn the knob: 0 % is 0°, 100 % is 180°.'],
  light: ['Follow the light', 'Dark is 0°, full sunshine is 180°.'],
  dht11: ['Temperature dial', 'The arm points at the temperature: 0 °C is 0°, 50 °C is 180°.'],
  ultrasonic: ['Smart bin lid', 'The lid opens to 90° when something is closer than 20 cm, and shuts 2 seconds after it leaves.'],
  buttons: ['Step with buttons', 'Button 1 turns it 15° left, button 2 turns it 15° right.'],
  ir: ['Remote control', 'Number keys 0 to 9 jump from 0° to 180°. ◀ ▲ turn left 15°, ▶ ▼ turn right 15°, OK goes to 90°.'],
  rfid: ['Card door lock', 'The white card unlocks it (90°) for 3 seconds. The blue fob stays locked at 0°.'],
};
const svClamp = a => THREE.MathUtils.clamp(Math.round(a), 0, 180);
function servoModeLabel(m) {
  const s = m.state, b = boardOf(m);
  if (b?.prog) return 'your code';
  if (s.mode === 'sweep') return 'sweep';
  if (s.mode === 'follow') { const sen = modules.find(o => o.id === s.follow); return sen ? SV_FOLLOW[sen.kind]?.[0].toLowerCase() ?? 'follows ' + sen.def.short : 'by hand'; }
  return 'by hand';
}
// set the angle by hand (slider, 0/90/180 buttons, dragging the arm, the OLED ▲▼). Unpowered, the arm just turns freely.
function servoSet(m, a) {
  const s = m.state;
  if (boardOf(m)?.prog) { toast('Your code is turning the servo. Press Stop in the Code panel to turn it by hand.'); return false; }
  if (s.mode !== 'hand') {
    s.mode = 'hand';
    const sel = selected === m && document.querySelector('#insp select[data-k="mode"]'); if (sel) sel.value = 'hand';
    setText('sv-note', 'Drag the orange arm, or use the slider.');
  }
  s.target = svClamp(a); if (!powered(m)) s.ang = s.target;
  syncServo(m); kick(); return true;
}
function syncServo(m) {
  if (selected !== m) return;
  setText('sv-a', `${Math.round(m.state.ang)}°`);
  const r = document.querySelector('#insp input[data-k="angle"]'); if (r && document.activeElement !== r) r.value = Math.round(m.state.target);
}
function servoTick(m, ctx, time) {
  const s = m.state; syncServo(m);
  if (!ctx || ctx.board.prog) return;                       // no power: the arm stays put. A running program owns the servo.
  if (s.mode === 'sweep') { const p = (time / 5.4) % 1; s.target = svClamp(180 * (p < 0.5 ? p * 2 : 2 - p * 2)); return; }
  if (s.mode !== 'follow') return;
  const sen = ctx.sensors.find(o => o.id === s.follow);
  if (!sen) { s.mode = 'hand'; if (selected === m) renderInspector(); return; }   // its sensor was unplugged
  const st = sen.state, seen = s.seen[sen.id] ?? st.seq, evs = st.ev ? st.ev.filter(e => e.seq > seen) : [];
  if (st.ev) s.seen[sen.id] = st.seq;
  if (sen.kind === 'ultrasonic') { if (st.distance < 20) s.hold = time + 2; s.target = time < s.hold ? 90 : 0; }
  else if (sen.kind === 'buttons') { for (const e of evs) if (e.type === 'press') s.target = svClamp(s.target + (e.btn ? -15 : 15)); }
  else if (sen.kind === 'ir') {
    for (const e of evs) {
      if (/^\d$/.test(e.key)) s.target = +e.key * 20;
      else if (e.key === 'ok') s.target = 90;
      else if (e.key === 'left' || e.key === 'up') s.target = svClamp(s.target + 15);
      else if (e.key === 'right' || e.key === 'down') s.target = svClamp(s.target - 15);
    }
  }
  else if (sen.kind === 'rfid') { for (const e of evs) if (e.type === 'tag' && e.ok) s.hold = time + 3; s.target = time < s.hold ? 90 : 0; }
  else { const r = reading(sen); s.target = svClamp(THREE.MathUtils.clamp((r.value - r.min) / (r.max - r.min), 0, 1) * 180); }
}
function servoPanel(m) {
  const s = m.state, board = boardOf(m), code = !!board?.prog;
  const opts = [['hand', 'By hand'], ['sweep', 'Sweep back and forth']];
  if (board) for (const sen of sensorsOn(board)) if (!sen.state.ev || SV_FOLLOW[sen.kind]) opts.push(['f:' + sen.id, `${SV_FOLLOW[sen.kind]?.[0] ?? 'Follow ' + sen.def.short} · ${portTag(board, sen)}`]);
  const val = s.mode === 'follow' ? 'f:' + s.follow : s.mode;
  const sen = s.mode === 'follow' && modules.find(o => o.id === s.follow);
  const note = code ? 'Your code is turning the servo. Press Stop in the Code panel to use these controls.'
    : !board ? 'No power yet, so the motor is off. You can still turn the arm by hand, like a real servo.'
    : s.mode === 'sweep' ? 'Like the classic Sweep example: 0° to 180° and back, forever.'
    : sen ? SV_FOLLOW[sen.kind]?.[1] ?? `The arm follows the ${sen.def.short.toLowerCase()} reading from low (0°) to high (180°).`
    : opts.length > 2 ? 'Drag the orange arm, or use the slider. Or let a sensor on this board move it.' : 'Drag the orange arm, or use the slider. Wire a sensor to the same board to let it move the arm.';
  return [`${readRow(m)}<div class="ctl"><div class="ctl-h"><span>What moves it</span></div>
      <select data-k="mode"${code || !board ? ' disabled' : ''}>${opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="ctl"><div class="ctl-h"><span>Arm angle</span><b id="sv-a">${Math.round(s.ang)}°</b></div>
      <input type="range" data-k="angle" min="0" max="180" step="1" value="${Math.round(s.target)}"${code ? ' disabled' : ''}>
      <small id="sv-note">${note}</small></div>`,
    code ? '' : [0, 90, 180].map(a => `<button data-a="sv:${a}">${a}°</button>`).join('')];
}
// a soft motor whine while the arm is moving
function servoHum(m, on) {
  if (!actx || (!on && !m.hum)) return;
  if (!m.hum) {
    try {
      const o = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 150; f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.9; g.gain.value = 0;
      o.connect(f).connect(g).connect(actx.destination); o.start(); m.hum = { o, g, on: false };
    } catch { return; }
  }
  if (m.hum.on !== on) { m.hum.on = on; m.hum.g.gain.setTargetAtTime(on ? 0.03 : 0, actx.currentTime, 0.025); }
}

// ---- Buzzer: a passive piezo buzzer, so it can play any pitch (like Arduino's tone()) ----
const BZ_W = 2.6, BZ_D = 3.0, BZ_TOP = V(0, 1.86, -0.45);
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiHz = n => 440 * 2 ** ((n - 69) / 12);
const hzNote = f => { const n = Math.round(69 + 12 * Math.log2(f / 440)); return NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1); };
// "C4", "D#5", "Bb3", "c" (octave 4 if left out). Returns Hz, or null if it isn't a note.
function noteHz(s) {
  const m = /^\s*([A-Ga-g])\s*([#b]?)\s*(-?\d)?\s*$/.exec(s); if (!m) return null;
  return midiHz(12 * (+(m[3] ?? 4) + 1) + [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(m[1].toUpperCase())] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0));
}
// the on-screen piano: C4 to C5. Keys 1-8 on the keyboard play the white keys.
const BZ_WHITE = [60, 62, 64, 65, 67, 69, 71, 72], BZ_BLACK = [[61, 1], [63, 2], [66, 4], [68, 5], [70, 6]];
function buildBuzzer(parts) {
  smallTray(parts, BZ_W, BZ_D, trayPcbTex(BZ_W, BZ_D, (g, W, H) => {
    pcbHole(g, 40, 40); pcbHole(g, W - 40, 40);
    g.font = 'bold 26px Arial'; g.fillText('+', 330, 70); g.font = 'bold 30px Arial'; g.fillText('BUZZER', W / 2, 395);
  }));
  const led = mesh(box(0.16, 0.08, 0.11), new THREE.MeshStandardMaterial({ color: 0x5a1010, emissive: 0xff2a2a, emissiveIntensity: 0, roughness: 0.4 }), 0.85, 1.24, 0.55, parts);
  // the piezo: a black can with a sealed top and a small sound hole; the top shivers while it sounds
  const can = new THREE.Group(); can.position.set(0, 1.2, BZ_TOP.z); parts.add(can);
  const bm = mat(0x161616, { roughness: 0.35 });
  mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.56, 40), bm, 0, 0.28, 0, can);
  mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.06, 40), bm, 0, 0.59, 0, can);
  mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 20), M.hole, 0, 0.625, 0, can);
  [-0.18, 0.18].forEach(x => mesh(box(0.05, 0.05, 0.4), M.gold, x, 1.25, 0.15, parts));
  return { can, led };
}
// sound rings rising from the buzzer while it plays (higher notes = tighter, faster rings)
function buzzRing(m, f) {
  const mt = new THREE.MeshBasicMaterial({ color: 0x2B2B2E, transparent: true, opacity: 0, depthWrite: false });
  const r = new THREE.Mesh(pingGeo, mt); r.raycast = () => {}; r.rotation.x = Math.PI / 2; r.visible = false; m.group.add(r);
  const k = THREE.MathUtils.clamp(Math.log2(f / 200) / 4, 0, 1);
  m.fx.push({ obj: r, age: 0, life: 0.7 - k * 0.25, update: a => {
    r.visible = true; r.position.set(BZ_TOP.x, BZ_TOP.y + 0.1 + a * 1.6, BZ_TOP.z); r.scale.setScalar(0.5 + a * (1.4 - k * 0.5)); mt.opacity = (1 - a) * 0.9;
  } });
}
// what the buzzer plays when no program is running, one entry per sensor kind it understands
const BZ_FOLLOW = {
  ultrasonic: ['Parking beeper', 'Beeps faster as something gets closer than 50 cm, and holds one long tone under 5 cm.'],
  pot: ['Knob theremin', 'The knob sets the pitch, from a low hum to a high whistle.'],
  light: ['Light theremin', 'More light, higher pitch. Cover the sensor to bring it down.'],
  dht11: ['Heat alarm', 'Beeps twice a second when the temperature reaches 30 °C.'],
  buttons: ['Doorbell', 'Button 1 rings ding-dong. Hold button 2 for a long buzz.'],
  ir: ['Remote piano', 'Keys 1 to 8 play do re mi fa so la ti do, 0 plays a high note, OK plays a chime.'],
  rfid: ['Card beeps', 'The white card gets a happy chirp, the blue fob gets a low "denied" buzz.'],
};
// the tone right now: a held piano key wins, then a running program, then the firmware (chirps first)
function buzzTone(m, time) {
  const s = m.state, b = boardOf(m);
  if (!b) return 0;
  if (s.play) return s.play;
  if (b.prog) return b.prog.state === 'run' ? s.code : 0;     // finished or stopped by an error: go quiet
  const q = s.queue.find(n => time >= n.t0 && time < n.t1); if (q) return q.f;
  const p = s.pat; if (!p) return 0;
  return (time % p.period) < p.on ? p.f : 0;
}
function buzzChirp(m, notes, time) {                         // [[Hz, seconds], …] played one after another
  let t = time; m.state.queue = notes.map(([f, d]) => { const n = { f, t0: t, t1: t + d - 0.02 }; t += d; return n; });
}
function buzzerTick(m, ctx, time) {
  const s = m.state;
  s.queue = s.queue.filter(n => n.t1 > time);
  if (!ctx || ctx.board.prog) return;
  s.pat = null;
  if (s.mode !== 'follow') return;
  const sen = ctx.sensors.find(o => o.id === s.follow);
  if (!sen) { s.mode = 'off'; if (selected === m) renderInspector(); return; }
  const st = sen.state, seen = s.seen[sen.id] ?? st.seq, evs = st.ev ? st.ev.filter(e => e.seq > seen) : [];
  if (st.ev) s.seen[sen.id] = st.seq;
  const r = sen.def.sim.readings ? reading(sen) : null, frac = r ? THREE.MathUtils.clamp((r.value - r.min) / (r.max - r.min), 0, 1) : 0;
  if (sen.kind === 'ultrasonic') {
    const d = st.distance;
    if (d < 5) s.pat = { f: 1760, on: 1, period: 1 };
    else if (d < 50) { const period = 0.12 + (d - 5) / 45 * 0.75; s.pat = { f: 1760, on: Math.min(0.08, period / 2), period }; }
  }
  else if (sen.kind === 'dht11') { if (reading(sen, 'temp').value >= 30) s.pat = { f: 2093, on: 0.15, period: 0.5 }; }
  else if (sen.kind === 'buttons') {
    for (const e of evs) if (e.type === 'press' && e.btn === 0) buzzChirp(m, [[659, 0.35], [523, 0.55]], time);
    if (st.down[1]) s.pat = { f: 330, on: 1, period: 1 };
  }
  else if (sen.kind === 'ir') {
    for (const e of evs) {
      if (/^[1-8]$/.test(e.key)) buzzChirp(m, [[midiHz(BZ_WHITE[+e.key - 1]), 0.3]], time);
      else if (e.key === '0') buzzChirp(m, [[midiHz(76), 0.3]], time);
      else if (e.key === 'ok') buzzChirp(m, [[784, 0.12], [1047, 0.12], [1319, 0.25]], time);
      else buzzChirp(m, [[1200, 0.06]], time);
    }
  }
  else if (sen.kind === 'rfid') {
    for (const e of evs) if (e.type === 'tag') buzzChirp(m, e.ok ? [[1047, 0.1], [1568, 0.18]] : [[196, 0.6]], time);
  }
  else if (r) s.pat = { f: Math.round(150 * 2 ** (frac * 4)), on: 1, period: 1 };   // 150 Hz to 2400 Hz
}
function buzzerPanel(m) {
  const s = m.state, board = boardOf(m), code = !!board?.prog;
  const opts = [['off', 'Only the piano']];
  if (board) for (const sen of sensorsOn(board)) if (!sen.state.ev || BZ_FOLLOW[sen.kind]) opts.push(['f:' + sen.id, `${BZ_FOLLOW[sen.kind]?.[0] ?? 'Follow ' + sen.def.short} · ${portTag(board, sen)}`]);
  const val = s.mode === 'follow' ? 'f:' + s.follow : 'off';
  const sen = s.mode === 'follow' && modules.find(o => o.id === s.follow);
  const note = code ? 'Your code is playing the buzzer. The piano still works for testing.'
    : !board ? 'No power yet. Wire it to a Quark C3 to hear it.'
    : sen ? BZ_FOLLOW[sen.kind]?.[1] ?? `The pitch follows the ${sen.def.short.toLowerCase()} reading.`
    : opts.length > 1 ? 'Play the piano, or let a sensor on this board make the sound.' : 'Play the piano. Wire a sensor to the same board to make it beep by itself.';
  const keys = BZ_WHITE.map((n, i) => `<button data-note="${n}" title="${hzNote(midiHz(n))} · key ${i + 1}">${i + 1}</button>`).join('')
    + BZ_BLACK.map(([n, i]) => `<button class="blk" data-note="${n}" style="left:calc(${i} * 12.5% - 6px)" title="${hzNote(midiHz(n))}"></button>`).join('');
  return [`${readRow(m)}<div class="ctl"><div class="ctl-h"><span>Piano</span><b>Press and hold</b></div>
      <div class="piano" id="bzPiano">${keys}</div></div>
    <div class="ctl"><div class="ctl-h"><span>What makes it sound</span></div>
      <select data-k="mode"${code || !board ? ' disabled' : ''}>${opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="ctl"><div class="ctl-h"><span>Volume</span><b id="bz-v">${s.vol} %</b></div>
      <input type="range" data-k="vol" min="0" max="100" step="5" value="${s.vol}">
      <small>${note}</small></div>`, ''];
}
// the sound itself: one square-wave oscillator per buzzer, softened a little so it isn't harsh in headphones
function buzzSound(m, f) {
  if (!f && !m.snd) return;
  try { audio(); } catch { return; }
  if (!m.snd) {
    const o = actx.createOscillator(), lp = actx.createBiquadFilter(), g = actx.createGain();
    o.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 3500; g.gain.value = 0;
    o.connect(lp).connect(g).connect(actx.destination); o.start(); m.snd = { o, g, f: 0, v: -1 };
  }
  const v = f ? 0.05 * m.state.vol / 100 : 0;
  if (f && f !== m.snd.f) m.snd.o.frequency.setValueAtTime(f, actx.currentTime);
  if (v !== m.snd.v) m.snd.g.gain.setTargetAtTime(v, actx.currentTime, 0.008);
  m.snd.f = f; m.snd.v = v;
}
let bzHeld = null;                                           // the buzzer whose piano key is held down
function bzPress(m, n) {
  m.state.play = n ? midiHz(n) : 0; bzHeld = n ? m : null; kick();
  document.querySelectorAll('#bzPiano .hit').forEach(x => x.classList.remove('hit'));
  if (n && selected === m) document.querySelector(`#bzPiano [data-note="${n}"]`)?.classList.add('hit');
}

// Module definitions: one entry per draggable module type. Add the other 12 here later.
// Port: mouth centre (x, y, mouthZ) in module space; rot = which way it faces (0 = +z, π = -z).
const MODULES = {
  ultrasonic: {
    name: 'Ultrasonic sensor', short: 'Ultrasonic', sub: 'Quark module 02 · HC-SR04', pings: true,
    foot: { x0: -2.5, x1: 2.5, z0: -1.2, z1: 2.85 },
    ports: [{ x: 0, y: 1.81, mouthZ: 2.79, rot: 0, label: 'Zap 4-pin', pins: ['Vcc', 'Trig', 'Echo', 'Gnd'] }],
    build: buildUltrasonic,
    sim: {
      role: 'sensor',
      init: () => ({ distance: 30 }),
      attach: buildUsTarget,
      readings: m => [{ key: 'distance', label: 'Distance', value: m.state.distance, unit: 'cm', min: US_MIN, max: US_MAX }],
      apps: [['value', 'Distance meter'], ['graph', 'Distance graph'], ['bar', 'Proximity bar']],
    },
  },
  dht11: {
    name: 'Temp & humidity', short: 'DHT11', sub: 'Quark module 03 · DHT11',
    foot: { x0: -1.2, x1: 1.2, z0: -1.85, z1: 1.95 },
    ports: [{ x: 0, y: 1.48, mouthZ: 1.85, rot: 0, label: 'Zap 4-pin', pins: ['Vcc', 'Data', 'NC', 'Gnd'] }],
    build: buildDht,
    sim: {
      role: 'sensor',
      // temp / hum: the room (set by the student). st / sh: what the sensor element has caught up to.
      // read: what the DHT11 reports, whole numbers, refreshed once a second, like the real part.
      init: () => ({ temp: 24, hum: 55, st: 24, sh: 55, breath: 0, lastRead: -9, read: { t: 24, h: 55 } }),
      tick: (m, dt, time, on) => {
        const s = m.state;
        s.breath = Math.max(0, s.breath - dt / 4);
        const k = 1 - Math.exp(-dt / 1.6);                       // the element reacts over a couple of seconds
        s.st += (Math.min(DHT_T[1], s.temp + 4 * s.breath) - s.st) * k;
        s.sh += (Math.min(95, s.hum + 32 * s.breath) - s.sh) * k;
        if (on && time - s.lastRead >= 1) { s.lastRead = time; s.read = { t: Math.round(s.st), h: Math.round(s.sh) }; }
      },
      readings: m => [
        { key: 'temp', label: 'Temperature', value: m.state.read.t, unit: '°C', min: DHT_T[0], max: DHT_T[1] },
        { key: 'hum', label: 'Humidity', value: m.state.read.h, unit: '%', min: DHT_H[0], max: DHT_H[1] },
      ],
      apps: [['weather', 'Weather station'], ['value', 'Temperature', 'temp'], ['value', 'Humidity', 'hum'],
             ['graph', 'Temp graph', 'temp'], ['graph', 'Humidity graph', 'hum']],
    },
  },
  light: {
    name: 'Light sensor', short: 'Light', sub: 'Quark module 04 · LDR light sensor',
    foot: trayFoot(LS_W, LS_D), ports: trayPort(LS_D, ['Vcc', 'Signal', 'NC', 'Gnd']), build: buildLight,
    anim: (m, dt) => {
      const s = m.state, b = m.built;
      s.coverK += ((s.covered ? 1 : 0) - s.coverK) * damp(8, dt);
      b.cover.position.y = 1.62 + (1 - s.coverK) * 3.2; b.cover.visible = s.covered || s.coverK > 0.01;
      b.faceMat.emissiveIntensity = s.level / 100 * 0.6;
      return s.coverK + s.level * 0.001;
    },
    sim: {
      role: 'sensor',
      // room: the light in the room (set by the student). level: what reaches the LDR. read: what the board reports.
      init: () => ({ room: 70, covered: false, coverK: 0, level: 70, read: 70 }),
      tick: (m, dt, time, on) => {
        const s = m.state, target = s.room * (1 - 0.96 * s.coverK);
        s.level += (target - s.level) * (1 - Math.exp(-dt / 0.15));
        if (on) s.read = Math.round(s.level);
      },
      readings: m => [{ key: 'light', label: 'Light level', value: m.state.read, unit: '%', min: 0, max: 100 }],
      apps: [['smart', 'Smart lighting'], ['value', 'Light level'], ['graph', 'Light graph']],
      live: m => `${m.state.read} % light`,
      panel: m => [`${readRow(m)}<div class="ctl"><div class="ctl-h"><span>Room light</span><b id="lt-room">${m.state.room} %</b></div>
        <input type="range" data-k="room" min="0" max="100" step="1" value="${m.state.room}">
        <small>0 is pitch dark, 100 is bright sunshine. Cover the sensor to make it think it's night.</small></div>`,
        `<button data-a="cover">${m.state.covered ? 'Uncover' : 'Cover it'}</button>`],
      slide: (m, k, v) => { m.state.room = v; setText('lt-room', `${v} %`); },
      action: (m, a) => { if (a === 'cover') { m.state.covered = !m.state.covered; click(0.8); renderInspector(); kick(); } },
    },
  },
  ir: {
    name: 'IR receiver', short: 'IR', sub: 'Quark module 05 · IR receiver',
    foot: trayFoot(IR_W, IR_D), ports: trayPort(IR_D, ['Vcc', 'Signal', 'NC', 'Gnd']), build: buildIr,
    anim: m => {
      const s = m.state, t = nowT(), b = m.built;
      b.remote.led.material.emissiveIntensity = t - s.tx < 0.18 ? 4 : 0;
      b.sig.material.emissiveIntensity = t > s.rx && t - s.rx < 0.15 ? 3 : 0;
      return b.remote.led.material.emissiveIntensity + b.sig.material.emissiveIntensity;
    },
    sim: {
      role: 'sensor',
      init: () => ({ seq: 0, ev: [], tx: -9, rx: -9, last: null }),
      readings: m => [{ key: 'code', label: 'Last code', value: m.state.last?.code ?? 0, unit: '', min: 0, max: 0xFFFFFF }],
      apps: [['ir', 'Remote decoder'], ['channel', 'TV channel']],
      live: m => m.state.last ? `${irLabel(m.state.last.key)} · ${irHex(m.state.last.code)}` : 'Waiting for the remote',
      panel: m => [`${readRow(m)}<div class="ctl"><div class="ctl-h"><span>Remote control</span><b>Press a key</b></div>
        <div class="remote" id="irRemote"><div class="ir-led" title="IR LED"></div><div class="grille">${'<i></i>'.repeat(5)}</div>
          <div class="dpad">${['up', 'left', 'ok', 'right', 'down'].map(k => `<button class="${k}" data-a="ir:${k}" aria-label="${k}">${irLabel(k)}</button>`).join('')}</div>
          <div class="num">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => `<button data-a="ir:${k}"${'*#'.includes(k) ? ' class="sym"' : ''}>${k}</button>`).join('')}</div></div>
        <small>Infrared is invisible to our eyes. The red rings show the signal here. Number keys work too.</small></div>`, ''],
      action: (m, a) => { if (a.startsWith('ir:')) irPress(m, a.slice(3)); },
    },
  },
  rfid: {
    name: 'RFID reader', short: 'RFID', sub: 'Quark module 07 · RC522 RFID',
    foot: { x0: -1.75, x1: 1.75, z0: -2.35, z1: 2.65 },
    ports: [{ x: 0, y: 1.48, mouthZ: 2.55, rot: 0, label: 'Zap 4-pin', pins: ['Vcc', 'Gnd', 'SCL', 'SDA'] }],
    build: buildRfid,
    anim: (m, dt) => {
      const s = m.state, tp = s.tap; if (!tp) return 0;
      const tag = m.built.tags[tp.i]; tp.t += dt; tag.visible = true;
      let y;
      if (tp.t < 0.45) y = THREE.MathUtils.lerp(5.5, 1.62, ease(tp.t / 0.45));
      else if (tp.t < 1.3) y = 1.62;
      else y = THREE.MathUtils.lerp(1.62, 5.5, ease(Math.min(1, (tp.t - 1.3) / 0.45)));
      tag.position.y = y + (tp.i ? 0.1 : 0);
      if (!tp.fired && tp.t >= 0.45) {
        tp.fired = true; const g = RF_TAGS[tp.i];
        if (sensorEvent(m, { type: 'tag', ...g })) { s.last = g; s.n++; click(2.4); }
      }
      if (tp.t >= 1.75) { tag.visible = false; s.tap = null; }
      return y;
    },
    sim: {
      role: 'sensor',
      init: () => ({ seq: 0, ev: [], tap: null, last: null, n: 0 }),
      readings: m => [{ key: 'reads', label: 'Cards read', value: m.state.n, unit: '', min: 0, max: 99 }],
      apps: [['rfid', 'Card reader'], ['door', 'Door lock']],
      live: m => m.state.last ? `${m.state.last.name} · ${m.state.last.uid}` : 'Waiting for a card',
      panel: m => [`${readRow(m)}<div class="ctl"><small>Tap a tag on the reader. The Door lock app only lets the white card in. The ID numbers are made up for this simulator.</small></div>`,
        `<button data-a="tag0">Tap white card</button><button data-a="tag1">Tap blue fob</button>`],
      action: (m, a) => { if (a === 'tag0' || a === 'tag1') tapTag(m, +a[3]); },
    },
  },
  pot: {
    name: 'Potentiometer', short: 'Pot', sub: 'Quark module 10 · Potentiometer',
    foot: trayFoot(POT_W, POT_D), ports: trayPort(POT_D, ['Vcc', 'Signal', 'NC', 'Gnd']), build: buildPot,
    anim: (m, dt) => {
      const s = m.state, goal = (0.5 - s.v / 100) * POT_SWEEP;  // clockwise from above turns it up
      s.ang += (goal - s.ang) * damp(18, dt); m.built.knob.rotation.y = s.ang; return s.ang;
    },
    sim: {
      role: 'sensor',
      init: () => ({ v: 50, ang: 0, read: 50 }),
      tick: (m, dt, time, on) => { if (on) m.state.read = Math.round(m.state.v); },
      readings: m => [{ key: 'pos', label: 'Knob', value: m.state.read, unit: '%', min: 0, max: 100 }],
      apps: [['gauge', 'Dial'], ['value', 'Knob value'], ['graph', 'Knob graph']],
      // the Quark C3's ESP32-C3 reads analogue pins as 0-4095 (12-bit)
      live: m => `${m.state.read} % · raw ${Math.round(m.state.read * 40.95)}`,
      panel: m => [`${readRow(m)}<div class="ctl"><div class="ctl-h"><span>Knob</span><b id="pt-v">${Math.round(m.state.v)} %</b></div>
        <input type="range" data-k="v" min="0" max="100" step="1" value="${Math.round(m.state.v)}">
        <small>Or drag the knob left and right.</small></div>`, ''],
      slide: (m, k, v) => { m.state.v = v; setText('pt-v', `${v} %`); },
    },
  },
  buttons: {
    name: 'Dual push button', short: 'Buttons', sub: 'Quark module 11 · Dual push button',
    foot: trayFoot(BT_W, BT_D), ports: trayPort(BT_D, ['Vcc', 'Btn 1', 'Btn 2', 'Gnd']), build: buildButtons,
    anim: (m, dt) => {
      let sum = 0;
      m.built.caps.forEach((c, i) => { c.position.y += (BT_CAP_Y - (m.state.down[i] ? 0.12 : 0) - c.position.y) * damp(30, dt); sum += c.position.y; });
      return sum;
    },
    sim: {
      role: 'sensor',
      init: () => ({ seq: 0, ev: [], down: [false, false], count: [0, 0] }),
      readings: m => [
        { key: 'b1', label: 'Button 1', value: +m.state.down[0], unit: '', min: 0, max: 1 },
        { key: 'b2', label: 'Button 2', value: +m.state.down[1], unit: '', min: 0, max: 1 },
      ],
      apps: [['buttons', 'Button test'], ['counter', 'Click counter'], ['reaction', 'Reaction game']],
      live: m => m.state.down.map((d, i) => `${i + 1} ${d ? 'pressed' : 'up'}`).join(' · '),
      press: (m, act, down) => pressButton(m, +act[3], down),
      panel: m => [`${readRow(m)}<div class="ctl"><small>Click the white and red caps. Hold the mouse down to keep a button pressed.</small></div>`,
        `<button data-a="tap0">Press 1</button><button data-a="tap1">Press 2</button>`],
      action: (m, a) => { if (a === 'tap0' || a === 'tap1') { const i = +a[3]; pressButton(m, i, true); setTimeout(() => pressButton(m, i, false), 160); } },
    },
  },
  rgb: {
    name: 'RGB LED', short: 'RGB LED', sub: 'Simulator only · not in the Quark kit',
    foot: trayFoot(LED_W, LED_D), ports: trayPort(LED_D, ['Vcc', 'R', 'G', 'B']), build: buildRgb,
    anim: (m, dt) => {
      const s = m.state, on = powered(m), k = damp(25, dt);
      for (let i = 0; i < 3; i++) s.cur[i] += ((on ? s.rgb[i] : 0) - s.cur[i]) * k;
      const [r, g, b] = s.cur.map(v => v / 255), lvl = Math.max(r, g, b);
      m.built.domeMat.emissive.setRGB(r, g, b);
      m.built.halo.material.color.setRGB(r, g, b); m.built.halo.material.opacity = lvl * 0.9;
      return s.cur[0] * 0.001 + s.cur[1] * 0.01 + s.cur[2] * 0.1;
    },
    sim: {
      role: 'output',
      init: () => ({ rgb: [0, 0, 0], cur: [0, 0, 0] }),
      tick: () => {},
      live: m => { const c = m.state.rgb; return c.some(v => v > 0) ? `On · ${colourName(c)}` : 'Off'; },
      panel: m => [`${readRow(m)}<div class="ctl"><small>This light isn't in the Quark kit. It's here so you can try code. Open <b>Code</b> (bottom right) and use led.color("red").</small></div>`,
        '<button data-a="code">Open code</button>'],
      action: (m, a) => { if (a === 'code') toggleCode(true); },
    },
  },
  servo: {
    name: 'Servo motor', short: 'Servo', sub: 'Quark module 08 · SG90 micro servo',
    foot: trayFoot(SV_W, SV_D), ports: trayPort(SV_D, ['Vcc', 'Signal', 'NC', 'Gnd']), build: buildServo,
    anim: (m, dt) => {
      const s = m.state, d = s.target - s.ang;
      s.moving = powered(m) && Math.abs(d) > 0.05;               // the motor only drives with power
      if (s.moving) s.ang += Math.sign(d) * Math.min(Math.abs(d), Math.min(SV_RATE, 30 + Math.abs(d) * 14) * dt);
      m.built.arm.rotation.y = s.ang * DEG;
      servoHum(m, s.moving);
      return s.ang;
    },
    sim: {
      role: 'output',
      init: () => ({ target: 90, ang: 90, mode: 'hand', follow: 0, seen: {}, hold: 0, moving: false }),
      tick: servoTick,
      live: m => `${Math.round(m.state.ang)}°${m.state.moving ? ' · moving' : ''} · ${servoModeLabel(m)}`,
      panel: servoPanel,
      slide: (m, k, v) => {
        const s = m.state;
        if (k === 'angle') return servoSet(m, v);
        if (k !== 'mode') return;
        if (v.startsWith('f:')) Object.assign(s, { mode: 'follow', follow: +v.slice(2) }); else s.mode = v;
        s.seen = {}; s.hold = 0; renderInspector();
      },
      action: (m, a) => { if (a.startsWith('sv:')) servoSet(m, +a.slice(3)); },
    },
  },
  buzzer: {
    name: 'Buzzer', short: 'Buzzer', sub: 'Quark module 09 · Passive buzzer',
    foot: trayFoot(BZ_W, BZ_D), ports: trayPort(BZ_D, ['Vcc', 'Signal', 'NC', 'Gnd']), build: buildBuzzer,
    anim: (m, dt, time) => {
      const s = m.state, f = buzzTone(m, time);
      buzzSound(m, f); s.now = f;
      m.built.can.scale.y = f ? 1 + Math.sin(time * 90) * 0.012 : 1;
      if (f && time - s.ringT > 0.16) { s.ringT = time; buzzRing(m, f); }
      return f;
    },
    sim: {
      role: 'output',
      init: () => ({ mode: 'off', follow: 0, seen: {}, vol: 60, play: 0, code: 0, queue: [], pat: null, now: 0, ringT: -9 }),
      tick: buzzerTick,
      live: m => m.state.now ? `♪ ${Math.round(m.state.now)} Hz · ${hzNote(m.state.now)}` : 'Quiet',
      panel: buzzerPanel,
      slide: (m, k, v) => {
        const s = m.state;
        if (k === 'vol') { s.vol = v; setText('bz-v', `${v} %`); if (m.snd) m.snd.v = -1; return; }
        if (k !== 'mode') return;
        if (v.startsWith('f:')) Object.assign(s, { mode: 'follow', follow: +v.slice(2) }); else s.mode = 'off';
        Object.assign(s, { seen: {}, queue: [], pat: null }); renderInspector();
      },
    },
  },
  oled: {
    name: 'OLED display', short: 'OLED', sub: 'Quark module 06 · OLED display',
    foot: { x0: -2, x1: 2, z0: -2.85, z1: 1.8 },
    ports: [{ x: 0, y: 1.81, mouthZ: -2.79, rot: Math.PI, label: 'Zap 4-pin', pins: ['Vcc', 'Gnd', 'SCL', 'SDA'] }],
    build: buildOled,
    sim: { role: 'output', init: () => ({ mode: 'off', sel: 0, items: [], hist: [] }), tick: oledTick, input: oledInput },
  },
  quark: {
    name: 'Quark C3 controller', short: 'Quark C3', sub: 'Quark module 01 · ESP32-C3', board: true,
    foot: { x0: -3.3, x1: 3.15, z0: -2.2, z1: 2.2 },
    ports: [
      { x: Q_SOCK_X[0], y: 0.61, mouthZ: QD + 0.012, rot: 0, label: 'Port 1', glow: [1.1, 0.76] },
      { x: Q_SOCK_X[1], y: 0.61, mouthZ: QD + 0.012, rot: 0, label: 'Port 2', glow: [1.1, 0.76] },
      { x: Q_SOCK_X[0], y: 0.61, mouthZ: -QD - 0.012, rot: Math.PI, label: 'Port 3', glow: [1.1, 0.76] },
      { x: Q_SOCK_X[1], y: 0.61, mouthZ: -QD - 0.012, rot: Math.PI, label: 'Port 4', glow: [1.1, 0.76] },
    ],
    build: buildQuark,
    init: () => ({ rgb: [0, 0, 0], cur: [0, 0, 0] }),         // the on-board RGB LED
    anim: (m, dt) => {
      const s = m.state, k = damp(25, dt);
      for (let i = 0; i < 3; i++) s.cur[i] += (s.rgb[i] - s.cur[i]) * k;
      const [r, g, b] = s.cur.map(v => v / 255);
      const lit = Math.max(r, g, b), L = m.built.rgb;
      L.mat.emissive.setRGB(r, g, b);
      L.mat.color.setRGB(0.91 * (1 - lit) + r * 0.6 * lit, 0.91 * (1 - lit) + g * 0.6 * lit, 0.91 * (1 - lit) + b * 0.6 * lit);   // the dome takes the colour
      L.halo.material.color.setRGB(r, g, b); L.halo.material.opacity = lit * 0.7;       // tinted glow that shows on the white shell
      return s.cur[0] * 0.001 + s.cur[1] * 0.01 + s.cur[2] * 0.1;
    },
  },
};
// port space (u sideways, d outward from the mouth) -> module space
function portLocal(pt, u, y, d) {
  const c = Math.cos(pt.rot), s = Math.sin(pt.rot);
  return V(pt.x + u * c + d * s, y, pt.mouthZ - u * s + d * c);
}
// the plug on the far end of a cable, and whether a module is wired to a board
const otherPlug = p => p.cable.plugs[p.end === 'A' ? 1 : 0];
const linkOf = pt => {
  if (!pt.plug || pt.plug.state !== 'connected') return null;
  const o = otherPlug(pt.plug); return o.state === 'connected' ? o.port.module : null;
};
const powered = m => m.def.board || m.ports.some(pt => linkOf(pt)?.def.board);

/* =====================================================================
   BRAIN: the simulation layer.
   A board sees every module wired to its ports. Sensors publish readings
   (sim.readings), outputs get a tick with what their board sees (sim.tick)
   and take button presses (sim.input). New modules only add a `sim` entry.
   ===================================================================== */
const linkedTo = board => board.ports.map(linkOf).filter(Boolean);
const boardOf = m => m.ports.map(linkOf).find(l => l?.def.board) || null;
const sensorsOn = board => linkedTo(board).filter(s => s.def.sim?.role === 'sensor');
const outputsOn = board => linkedTo(board).filter(o => o.def.sim?.input);
const reading = (s, key) => { const rs = s.def.sim.readings(s); return rs.find(r => r.key === key) || rs[0]; };
const portTag = (board, m) => 'P' + (board.ports.findIndex(pt => linkOf(pt) === m) + 1);
let screenDirty = false, simAcc = 0;

function simTick(time) {
  for (const m of modules) {                                 // sensors first: the world, then what they read
    const on = powered(m);
    if (m.def.sim?.role === 'sensor') m.def.sim.tick?.(m, 0.1, time, on);
    if (m.built.led && m.ledOn !== on) { m.ledOn = on; m.built.led.material.emissiveIntensity = on ? 3 : 0; kick(); }
  }
  for (const m of modules) {
    const sim = m.def.sim; if (sim?.role !== 'output') continue;
    const board = boardOf(m);
    sim.tick(m, board ? { board, sensors: sensorsOn(board) } : null, time);
  }
  const live = document.getElementById('liveRead');           // inspector values that change every tick
  if (live && selected?.type === 'module') live.innerHTML = liveText(selected);
}
// a button on the board: every display wired to that board hears it
function boardInput(board, key, quiet) {
  const outs = outputsOn(board);
  if (!outs.length) { if (!quiet) toast('These buttons drive the OLED menu. Wire an OLED display to this board.'); return; }
  for (const btn of board.built.buttons[key === 'ok' || key === 'back' ? 'ok' : 'next']) {
    btn.position.y = QH + 0.03 - 0.07; setTimeout(() => { btn.position.y = QH + 0.03; kick(); }, 130);
  }
  outs.forEach(o => o.def.sim.input(o, key));
  click(1.6); simTick(clock.elapsedTime); kick();
}
function liveText(m) {
  if (m.kind === 'ultrasonic') return powered(m) ? `<span class="ok">● ${Math.round(m.state.distance)} cm</span>` : 'No power yet';
  if (m.kind === 'dht11') return powered(m) ? `<span class="ok">● ${m.state.read.t} °C · ${m.state.read.h} %</span>` : 'No power yet';
  if (m.kind === 'oled') {
    const st = m.state;
    if (st.mode === 'off') return 'Off · no power';
    if (st.mode === 'code') return `<span class="ok">● Showing your code</span>`;
    if (st.mode === 'boot') return 'Starting up…';
    if (st.mode === 'msg') return 'Sensor unplugged';
    if (st.mode === 'app') return `<span class="ok">● ${st.app.label}</span>`;
    return `Menu · ${st.items[st.sel]?.label ?? ''}`;
  }
  if (m.def.sim?.live) return powered(m) ? `<span class="ok">● ${m.def.sim.live(m)}</span>` : 'No power yet';
  return '';
}

/* ---------- OLED firmware: boot → menu → app ---------- */
function oledItems(ctx) {
  const items = [], count = {};
  ctx.sensors.forEach(s => count[s.kind] = (count[s.kind] || 0) + 1);
  for (const s of ctx.sensors) {
    const tag = count[s.kind] > 1 ? ' ' + portTag(ctx.board, s) : '';
    for (const [kind, label, key] of s.def.sim.apps) items.push({ kind, label: label + tag, key, sensor: s });
  }
  const servos = linkedTo(ctx.board).filter(o => o.kind === 'servo');
  for (const sv of servos) items.push({ kind: 'servo', label: 'Servo control' + (servos.length > 1 ? ' ' + portTag(ctx.board, sv) : ''), servo: sv });
  const bzs = linkedTo(ctx.board).filter(o => o.kind === 'buzzer');
  for (const bz of bzs) items.push({ kind: 'buzzer', label: 'Buzzer piano' + (bzs.length > 1 ? ' ' + portTag(ctx.board, bz) : ''), buzz: bz, idx: 0 });
  if (!items.length) items.push({ kind: 'hello', label: 'Hello screen' });
  items.push({ kind: 'info', label: 'Board info' });
  return items;
}
function oledTick(m, ctx, time) {
  const st = m.state;
  if (!ctx) {
    if (st.mode !== 'off') { Object.assign(st, { mode: 'off', app: null, items: [] }); oledDraw(m, null); }
    return;
  }
  if (st.mode === 'off') Object.assign(st, { mode: 'boot', t0: time, bootT: time, sel: 0 });
  // a running program owns the screen (like uploading code to the real board); Stop gives the menu back
  const prog = ctx.board.prog;
  if (prog) { st.mode = 'code'; oledDraw(m, g => OLED_SCREENS.code(g, prog, time)); return; }
  if (st.mode === 'code') Object.assign(st, { mode: 'menu', app: null });
  st.items = oledItems(ctx);
  st.sel = Math.min(st.sel, st.items.length - 1);
  if (st.mode === 'boot' && time - st.t0 > 1.6) st.mode = 'menu';
  if (st.mode === 'app' && st.app.sensor && !ctx.sensors.includes(st.app.sensor)) Object.assign(st, { mode: 'msg', t0: time, app: null, what: 'Sensor' });
  const out = st.mode === 'app' && (st.app.servo || st.app.buzz);
  if (out && !linkedTo(ctx.board).includes(out)) Object.assign(st, { mode: 'msg', t0: time, app: null, what: out.def.short });
  if (st.mode === 'msg' && time - st.t0 > 1.8) st.mode = 'menu';
  if (st.mode === 'app') OLED_STEP[st.app.kind]?.(st.app, newEvents(st.app), time);
  if (st.mode === 'app' && st.app.kind === 'graph') { st.hist.push(reading(st.app.sensor, st.app.key).value); if (st.hist.length > 124) st.hist.shift(); }
  oledDraw(m, g => OLED_SCREENS[st.mode === 'app' ? st.app.kind : st.mode](g, st, ctx, time));
}
function oledInput(m, key) {
  const st = m.state, n = st.items.length;
  if (st.mode === 'menu') {
    if (key === 'up') st.sel = (st.sel - 1 + n) % n;
    else if (key === 'down' || key === 'next') st.sel = (st.sel + 1) % n;
    else if (key === 'ok') { const it = st.items[st.sel]; Object.assign(st, { mode: 'app', app: { ...it, seen: it.sensor?.state.seq ?? 0 }, hist: [] }); }
  } else if (st.mode === 'app' && st.app.kind === 'servo' && (key === 'up' || key === 'down')) {
    servoSet(st.app.servo, st.app.servo.state.target + (key === 'up' ? 15 : -15));   // ▲ turns left, ▼ turns right
  } else if (st.mode === 'app' && st.app.kind === 'buzzer' && (key === 'up' || key === 'down')) {
    const a = st.app; a.idx = THREE.MathUtils.clamp(a.idx + (key === 'up' ? 1 : -1), 0, 7);   // ▲ ▼ walk up and down the scale
    buzzChirp(a.buzz, [[midiHz(BZ_WHITE[a.idx]), 0.3]], nowT());
  } else if (st.mode === 'app' && key !== 'up' && key !== 'down') Object.assign(st, { mode: 'menu', app: null });
}

// apps on event sensors read the sensor's log since they last looked
const newEvents = app => {
  const s = app.sensor?.state; if (!s?.ev) return [];
  const out = s.ev.filter(e => e.seq > app.seen); app.seen = s.seq; return out;
};
// per-app logic, run every tick while the app is open (a = the open app's own state)
const OLED_STEP = {
  counter(a, evs) { a.n ??= 0; for (const e of evs) if (e.type === 'press') a.n = e.btn ? 0 : a.n + 1; },
  reaction(a, evs, time) {
    a.phase ??= 'ready';
    for (const e of evs) {
      if (e.type !== 'press') continue;
      if (a.phase === 'go') { a.ms = Math.max(1, Math.round(e.ms - a.goMs)); a.best = Math.min(a.best ?? 1e9, a.ms); a.phase = 'done'; }
      else if (a.phase === 'wait') a.phase = 'early';
      else { a.phase = 'wait'; a.goAt = time + 1.5 + Math.random() * 2.5; }
    }
    if (a.phase === 'wait' && time >= a.goAt) { a.phase = 'go'; a.goMs = performance.now(); }
  },
  ir(a, evs, time) { a.n ??= 0; for (const e of evs) if (e.type === 'ir') { a.last = e; a.n++; a.t = time; } },
  channel(a, evs, time) {
    a.ch ??= 1;
    for (const e of evs) {
      if (e.type !== 'ir') continue;
      a.t = time;
      if (/^\d$/.test(e.key)) {                                // two digits in quick succession make a two-digit channel
        if (a.pend && time - a.dt < 1.5) { a.ch = a.ch * 10 + +e.key; a.pend = false; } else { a.ch = +e.key; a.pend = true; }
        a.dt = time;
      } else if (e.key === 'up') { a.ch = (a.ch + 1) % 100; a.pend = false; }
      else if (e.key === 'down') { a.ch = (a.ch + 99) % 100; a.pend = false; }
    }
  },
  rfid(a, evs, time) { a.n ??= 0; for (const e of evs) if (e.type === 'tag') { a.last = e; a.n++; a.t = time; } },
  door(a, evs, time) { for (const e of evs) if (e.type === 'tag') a.res = { ok: e.ok, t: time }; },
};

/* ---------- OLED drawing: draw on a 128 × 64 canvas, threshold to 1-bit, light up pixels ---------- */
function T(g, s, x, y, size = 9, o = {}) {
  g.font = `${o.thin ? '' : 'bold '}${size}px Arial, sans-serif`;
  g.textAlign = o.align || 'left'; g.textBaseline = 'top'; g.fillStyle = o.ink || '#fff'; g.fillText(s, x, y);
}
function head(g, title, right) {
  T(g, title, 1, 1); if (right) T(g, right, 127, 1, 9, { align: 'right' });
  g.fillStyle = '#fff'; g.fillRect(0, 11, OLED_W, 1);
}
// ---- what student code draws on the OLED (see the oled object in the Python runtime) ----
const oledFont = n => 8 * n + 2;                              // text size 1 = 10 px (the old look), 2 = 18 px, 3 = 26 px…
const OLED_HINT = { pixel: '10, 20', line: '0, 0, 127, 63', rect: '10, 10, 50, 30', fill_rect: '10, 10, 50, 30', circle: '64, 32, 20', fill_circle: '64, 32, 20' };
function oledPx(g, x, y) { if (x >= 0 && x < OLED_W && y >= 0 && y < OLED_H) g.fillRect(x, y, 1, 1); }
function oledLine(g, x0, y0, x1, y1) {                        // Bresenham, so lines stay crisp pixels
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, n = 0;
  while (n++ < 400) { oledPx(g, x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function oledCircle(g, cx, cy, r, fill) {                     // midpoint circle
  r = Math.max(0, Math.min(r, 200));
  let x = r, y = 0, e = 1 - r;
  while (x >= y) {
    if (fill) { g.fillRect(cx - x, cy + y, 2 * x + 1, 1); g.fillRect(cx - x, cy - y, 2 * x + 1, 1); g.fillRect(cx - y, cy + x, 2 * y + 1, 1); g.fillRect(cx - y, cy - x, 2 * y + 1, 1); }
    else [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]].forEach(([a, b]) => oledPx(g, cx + a, cy + b));
    y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
  }
}
function oledOp(g, o) {
  if (o.t === 'text') return T(g, o.s, o.x, o.y, oledFont(o.size));
  if (o.t === 'pixel') return oledPx(g, o.x, o.y);
  if (o.t === 'line') return oledLine(g, o.x, o.y, o.x2, o.y2);
  if (o.t === 'fill_rect') return g.fillRect(o.x, o.y, o.w, o.h);
  if (o.t === 'rect') { g.fillRect(o.x, o.y, o.w, 1); g.fillRect(o.x, o.y + o.h - 1, o.w, 1); g.fillRect(o.x, o.y, 1, o.h); g.fillRect(o.x + o.w - 1, o.y, 1, o.h); return; }
  if (o.t === 'circle' || o.t === 'fill_circle') oledCircle(g, o.x, o.y, o.r, o.t === 'fill_circle');
}
function oledDraw(m, fn) {
  const s = m.built.screen, g = s.lctx;
  g.fillStyle = '#000'; g.fillRect(0, 0, OLED_W, OLED_H);
  if (!fn) { s.hash = 0; s.octx.fillStyle = '#020305'; s.octx.fillRect(0, 0, OLED_W * OLED_S, OLED_H * OLED_S); s.tex.needsUpdate = true; screenDirty = true; return; }
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 1; fn(g);
  const d = g.getImageData(0, 0, OLED_W, OLED_H).data;
  let h = 7; for (let i = 0; i < OLED_W * OLED_H; i++) if (d[i * 4] > 100) h = (h * 31 + i) | 0;
  if (h === s.hash) return;                                 // nothing changed: skip the upload
  s.hash = h;
  const o = s.octx; o.drawImage(OLED_GRID, 0, 0); o.fillStyle = '#CFE6FF';
  for (let i = 0; i < OLED_W * OLED_H; i++) if (d[i * 4] > 100) o.fillRect((i % OLED_W) * OLED_S + 0.4, Math.floor(i / OLED_W) * OLED_S + 0.4, 3.3, 3.3);
  s.tex.needsUpdate = true; screenDirty = true;
}
const OLED_SCREENS = {
  boot(g, st, ctx, time) {
    T(g, 'StemGrid', 64, 10, 18, { align: 'center' });
    T(g, ctx.board.def.short, 64, 33, 9, { align: 'center', thin: true });
    g.strokeRect(14.5, 49.5, 99, 7); g.fillRect(16, 51, 96 * Math.min(1, (time - st.t0) / 1.4), 4);
  },
  menu(g, st) {
    head(g, 'MENU', `${st.sel + 1}/${st.items.length}`);
    const first = Math.max(0, Math.min(st.sel - 1, st.items.length - 4));
    st.items.slice(first, first + 4).forEach((it, k) => {
      const y = 14 + k * 12, on = first + k === st.sel;
      if (on) { g.fillStyle = '#fff'; g.fillRect(0, y - 1, 124, 12); }
      T(g, (on ? '> ' : '  ') + it.label, 2, y, 9, { ink: on ? '#000' : '#fff' });
    });
    if (st.items.length > 4) {                             // scroll bar
      const hh = 48 * 4 / st.items.length; g.fillStyle = '#fff'; g.fillRect(126, 13 + (48 - hh) * first / (st.items.length - 4), 2, hh);
    }
    if (st.items.length <= 2) { T(g, 'Plug a sensor into', 64, 41, 8, { align: 'center', thin: true }); T(g, 'the Quark C3', 64, 52, 8, { align: 'center', thin: true }); }
  },
  msg(g, st) {
    T(g, st.what || 'Sensor', 64, 14, 12, { align: 'center' }); T(g, 'unplugged', 64, 30, 12, { align: 'center' });
    T(g, 'Back to menu…', 64, 50, 8, { align: 'center', thin: true });
  },
  value(g, st, ctx) {
    const r = reading(st.app.sensor, st.app.key), v = String(Math.round(r.value));
    head(g, st.app.label, portTag(ctx.board, st.app.sensor));
    g.font = 'bold 30px Arial, sans-serif'; const w1 = g.measureText(v).width;
    g.font = 'bold 11px Arial, sans-serif'; const w2 = g.measureText(r.unit).width;
    const x = 64 - (w1 + 3 + w2) / 2;
    T(g, v, x, 18, 30); T(g, r.unit, x + w1 + 3, 36, 11);
    T(g, 'LIVE', 1, 55, 8, { thin: true }); T(g, `${r.min}-${r.max} ${r.unit}`, 127, 55, 8, { align: 'right', thin: true });
  },
  graph(g, st) {
    const r = reading(st.app.sensor, st.app.key);
    head(g, st.app.label, `${Math.round(r.value)} ${r.unit}`);
    for (let x = 0; x < OLED_W; x += 4) g.fillRect(x, 63, 2, 1);
    const yOf = v => 62 - THREE.MathUtils.clamp((v - r.min) / (r.max - r.min), 0, 1) * 47;
    g.beginPath(); st.hist.forEach((v, i) => { const x = 127 - (st.hist.length - 1 - i); i ? g.lineTo(x + 0.5, yOf(v) + 0.5) : g.moveTo(x + 0.5, yOf(v) + 0.5); });
    g.stroke();
  },
  bar(g, st, ctx, time) {
    const r = reading(st.app.sensor, st.app.key), near = 1 - (r.value - r.min) / (r.max - r.min);
    if (r.value < 10 && Math.floor(time * 3) % 2) { g.fillRect(0, 0, OLED_W, 11); T(g, 'TOO CLOSE!', 64, 1, 9, { align: 'center', ink: '#000' }); }
    else head(g, st.app.label);
    g.strokeRect(3.5, 19.5, 120, 16); g.fillRect(6, 22, Math.max(1, 116 * near), 12);
    T(g, 'NEAR', 3, 39, 8, { thin: true }); T(g, 'FAR', 124, 39, 8, { align: 'right', thin: true });
    T(g, `${Math.round(r.value)} ${r.unit}`, 64, 50, 11, { align: 'center' });
  },
  weather(g, st, ctx) {                                      // the brochure's "Weather station" project
    const s = st.app.sensor, t = reading(s, 'temp'), h = reading(s, 'hum');
    head(g, st.app.label, portTag(ctx.board, s));
    g.fillRect(63, 15, 1, 34);
    const col = (cx, label, v, unit) => {
      T(g, label, cx, 15, 8, { align: 'center', thin: true });
      g.font = 'bold 22px Arial, sans-serif'; const w1 = g.measureText(v).width;
      g.font = 'bold 10px Arial, sans-serif'; const w2 = g.measureText(unit).width;
      const x = cx - (w1 + 2 + w2) / 2; T(g, v, x, 26, 22); T(g, unit, x + w1 + 2, 28, 10);
    };
    col(32, 'TEMP', String(Math.round(t.value)), t.unit);
    col(96, 'HUMIDITY', String(Math.round(h.value)), h.unit);
    const feel = h.value >= 70 ? 'Humid' : t.value >= 30 ? 'Hot' : t.value <= 15 ? 'Cold' : 'Comfortable';
    g.fillRect(0, 51, OLED_W, 1); T(g, `Feels: ${feel}`, 64, 54, 8, { align: 'center', thin: true });
  },
  smart(g, st, ctx, time) {                                  // the brochure's "Smart lighting" project
    const r = reading(st.app.sensor, 'light'), dark = r.value < SMART_DARK, cx = 28, cy = 31;
    head(g, st.app.label, `${Math.round(r.value)} %`);
    g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 10, 0, 7); dark ? g.fill() : g.stroke(); g.lineWidth = 1;
    g.fillRect(cx - 5, cy + 12, 10, 3); g.fillRect(cx - 3, cy + 16, 6, 2);
    if (dark) for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.0 + i / 6) - Math.PI * 0.0, c = Math.cos(a), s = Math.sin(a);
      g.fillRect(Math.round(cx + c * 15) - 1, Math.round(cy + s * 15) - 1, 3, 3);
    }
    T(g, dark ? 'DARK' : 'BRIGHT', 88, 17, 13, { align: 'center' });
    T(g, dark ? 'Lights ON' : 'Lights OFF', 88, 35, 9, { align: 'center', thin: true });
    g.strokeRect(54.5, 52.5, 70, 7); g.fillRect(56, 54, 67 * r.value / 100, 4);
    g.fillRect(55 + 70 * SMART_DARK / 100, 49, 1, 3);
  },
  gauge(g, st) {
    const r = reading(st.app.sensor, st.app.key), f = THREE.MathUtils.clamp((r.value - r.min) / (r.max - r.min), 0, 1);
    head(g, st.app.label, `${Math.round(r.value)} ${r.unit}`);
    const cx = 64, cy = 60, R = 42;
    g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, Math.PI, 0); g.stroke(); g.lineWidth = 1.5;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + i / 10 * Math.PI, r1 = i % 5 ? R - 4 : R - 8;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
    }
    const a = Math.PI + f * Math.PI;
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (R - 11), cy + Math.sin(a) * (R - 11)); g.stroke(); g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
    T(g, String(r.min), 2, 54, 8, { thin: true }); T(g, String(r.max), 127, 54, 8, { align: 'right', thin: true });
  },
  buttons(g, st, ctx) {
    const s = st.app.sensor.state;
    head(g, st.app.label, portTag(ctx.board, st.app.sensor));
    [32, 96].forEach((x, i) => {
      g.lineWidth = 2; g.beginPath(); g.arc(x, 29, 11, 0, 7); s.down[i] ? g.fill() : g.stroke(); g.lineWidth = 1;
      T(g, `BUTTON ${i + 1}`, x, 43, 8, { align: 'center' });
      T(g, `${s.down[i] ? 'pressed' : 'up'} · ${s.count[i]}x`, x, 54, 8, { align: 'center', thin: true });
    });
  },
  counter(g, st) {
    head(g, st.app.label);
    T(g, String(st.app.n ?? 0), 64, 15, 30, { align: 'center' });
    T(g, '1: count up    2: reset', 64, 54, 8, { align: 'center', thin: true });
  },
  reaction(g, st) {
    const a = st.app;
    if (a.phase === 'go') { g.fillRect(0, 0, OLED_W, OLED_H); T(g, 'PRESS!', 64, 20, 24, { align: 'center', ink: '#000' }); return; }
    head(g, st.app.label);
    const L = { ready: ['Press a button', 'to start'], wait: ['Wait for it…', 'Press when it says PRESS!'],
      early: ['Too early!', 'Press to try again'], done: [`${a.ms} ms`, `Best ${a.best} ms · press again`] }[a.phase ?? 'ready'];
    T(g, L[0], 64, a.phase === 'done' ? 17 : 22, a.phase === 'done' ? 22 : 12, { align: 'center' });
    T(g, L[1], 64, 52, 8, { align: 'center', thin: true });
  },
  ir(g, st, ctx, time) {
    const a = st.app;
    if (a.last && time - a.t < 0.3) { g.fillRect(0, 0, OLED_W, 11); T(g, 'SIGNAL!', 64, 1, 9, { align: 'center', ink: '#000' }); }
    else head(g, st.app.label, String(a.n ?? 0));
    if (!a.last) { T(g, 'Point the remote', 64, 24, 10, { align: 'center' }); T(g, 'and press a key', 64, 38, 10, { align: 'center', thin: true }); return; }
    T(g, 'KEY', 2, 16, 8, { thin: true }); T(g, irLabel(a.last.key), 64, 15, 20, { align: 'center' });
    T(g, irHex(a.last.code), 64, 40, 11, { align: 'center' });
    T(g, 'NEC CODE', 64, 54, 8, { align: 'center', thin: true });
  },
  channel(g, st, ctx, time) {
    const a = st.app, typing = a.pend && time - a.dt < 1.5;
    head(g, st.app.label, typing ? 'CH _' : '');
    T(g, 'CH', 14, 30, 13);
    T(g, String(a.ch ?? 1).padStart(2, '0'), 80, 15, 32, { align: 'center' });
    T(g, '0-9 or ▲ ▼ on the remote', 64, 54, 8, { align: 'center', thin: true });
  },
  rfid(g, st, ctx, time) {
    const a = st.app;
    if (a.last && time - a.t < 0.4) { g.fillRect(0, 0, OLED_W, 11); T(g, 'TAG FOUND', 64, 1, 9, { align: 'center', ink: '#000' }); }
    else head(g, st.app.label, String(a.n ?? 0));
    if (!a.last) { T(g, 'Hold a card', 64, 22, 11, { align: 'center' }); T(g, 'over the reader', 64, 37, 10, { align: 'center', thin: true }); return; }
    T(g, 'UID', 64, 15, 8, { align: 'center', thin: true });
    T(g, a.last.uid, 64, 25, 13, { align: 'center' });
    T(g, a.last.name, 64, 46, 9, { align: 'center', thin: true });
  },
  door(g, st, ctx, time) {                                   // the brochure's "RFID door lock", shown on the screen
    const r = st.app.res, live = r && time - r.t < 3;
    head(g, st.app.label);
    const lock = open => {
      const x = 22, y = 34; g.fillRect(x - 10, y, 20, 16);
      g.lineWidth = 3; g.beginPath(); g.arc(x + (open ? 9 : 0), y - (open ? 4 : 0), 7, Math.PI, 0); g.stroke(); g.lineWidth = 1;
      if (!open) { g.fillRect(x - 8.5, y - 1, 3, 2); g.fillRect(x + 5.5, y - 1, 3, 2); }
      g.fillStyle = '#000'; g.fillRect(x - 1, y + 5, 2, 6); g.fillStyle = '#fff';
    };
    if (!live) { lock(false); T(g, 'LOCKED', 80, 20, 13, { align: 'center' }); T(g, 'Scan a card', 80, 38, 9, { align: 'center', thin: true }); return; }
    if (r.ok) { lock(true); T(g, 'ACCESS', 80, 16, 12, { align: 'center' }); T(g, 'GRANTED', 80, 30, 12, { align: 'center' }); T(g, 'Door open', 80, 50, 8, { align: 'center', thin: true }); return; }
    lock(false);
    if (Math.floor(time * 4) % 2) { g.fillRect(44, 14, 84, 30); T(g, 'ACCESS', 86, 16, 12, { align: 'center', ink: '#000' }); T(g, 'DENIED', 86, 30, 12, { align: 'center', ink: '#000' }); }
    else { T(g, 'ACCESS', 86, 16, 12, { align: 'center' }); T(g, 'DENIED', 86, 30, 12, { align: 'center' }); }
    T(g, 'Unknown card', 86, 50, 8, { align: 'center', thin: true });
  },
  code(g, prog, time) {                                     // what oled.print() wrote
    if (!prog.screen.length) {
      T(g, 'Your code', 64, 14, 12, { align: 'center' }); T(g, prog.state === 'run' ? 'is running' : prog.state === 'error' ? 'stopped: error' : 'has finished', 64, 30, 10, { align: 'center', thin: true });
      if (prog.state === 'run') g.fillRect(Math.round(4 + (Math.sin(time * 2.4) + 1) / 2 * 114), 52, 6, 6);
      return;
    }
    prog.screen.forEach(o => oledOp(g, o));
  },
  buzzer(g, st, ctx) {                                       // a one-octave keyboard; ▲ ▼ play up and down the scale
    const a = st.app, f = a.buzz.state.now;
    head(g, a.label, portTag(ctx.board, a.buzz));
    T(g, f ? hzNote(f) : hzNote(midiHz(BZ_WHITE[a.idx])), 4, 15, 18);
    T(g, f ? `${Math.round(f)} Hz` : 'quiet', 124, 20, 9, { align: 'right', thin: !f });
    for (let i = 0; i < 8; i++) {
      const x = 4 + i * 15, on = f && Math.abs(f - midiHz(BZ_WHITE[i])) < 1;
      g.strokeRect(x + 0.5, 37.5, 14, 20); if (on || (!f && i === a.idx)) g.fillRect(x + 2, 39, 11, 17);
    }
    [1, 2, 4, 5, 6].forEach(i => { g.fillStyle = '#000'; g.fillRect(4 + i * 15 - 3, 37, 7, 11); g.fillStyle = '#fff'; g.strokeRect(4 + i * 15 - 2.5, 37.5, 5, 10); });
  },
  servo(g, st, ctx) {                                        // a protractor with the arm's real angle
    const sv = st.app.servo, a = sv.state.ang * DEG, cx = 38, cy = 60, R = 34;
    head(g, st.app.label, portTag(ctx.board, sv));
    g.beginPath(); g.arc(cx, cy, R, Math.PI, 0); g.stroke(); g.fillRect(cx - R, cy, 2 * R + 1, 1);
    for (let k = 0; k <= 180; k += 45) {
      const c = Math.cos(k * DEG), s = Math.sin(k * DEG);
      g.beginPath(); g.moveTo(cx + c * R, cy - s * R); g.lineTo(cx + c * (R - 5), cy - s * (R - 5)); g.stroke();
    }
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (R - 7), cy - Math.sin(a) * (R - 7)); g.stroke(); g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
    T(g, `${Math.round(sv.state.ang)}°`, 101, 15, 20, { align: 'center' });
    T(g, servoModeLabel(sv), 101, 40, 8, { align: 'center', thin: true });
    T(g, '▲ ▼ turn it', 101, 53, 8, { align: 'center', thin: true });
  },
  hello(g, st, ctx, time) {
    T(g, 'Hello,', 64, 6, 10, { align: 'center', thin: true }); T(g, 'StemGrid!', 64, 20, 18, { align: 'center' });
    g.fillRect(Math.round(4 + (Math.sin(time * 2.4) + 1) / 2 * 114), 52, 6, 6);
  },
  info(g, st, ctx, time) {
    const up = Math.floor(time - st.bootT), mm = String(Math.floor(up / 60)).padStart(2, '0'), ss = String(up % 60).padStart(2, '0');
    head(g, ctx.board.def.short.toUpperCase(), `${mm}:${ss}`);
    ctx.board.ports.forEach((pt, i) => { const l = linkOf(pt); T(g, `P${i + 1}  ${l ? l.def.short : '-'}`, 2, 14 + i * 12, 9, { thin: !l }); });
  },
};

// ---- Zap plug ----
const WIRE_COLORS = [0x262626, 0x8C7A2E, 0xD3204A, 0xFF7A1A]; // black, olive, red, orange (brochure close-up)
const wireMats = WIRE_COLORS.map(c => mat(c, { roughness: 0.42 }));
const PLUG_LEN = 0.78, PLUG_H = 0.34, REST_Y = PLUG_H / 2 + 0.01, INSERT_DEPTH = 0.48, CABLE_MAX = 14;
const pulseGeo = new THREE.SphereGeometry(0.11, 12, 8), pulseMat = new THREE.MeshBasicMaterial({ color: 0xFFF2DF });
function buildPlug() {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  mesh(rbox(0.94, PLUG_H, PLUG_LEN, 0.05), M.white, 0, 0, PLUG_LEN / 2, inner);
  mesh(rbox(0.26, 0.09, PLUG_LEN - 0.12, 0.02), M.white, 0, PLUG_H / 2 + 0.03, PLUG_LEN / 2 + 0.06, inner); // key ridge
  mesh(rbox(0.5, 0.05, 0.16, 0.02), M.white, 0, PLUG_H / 2 + 0.02, PLUG_LEN - 0.14, inner);
  PIN_X.forEach((x, i) => {
    mesh(box(0.13, 0.15, 0.01), M.hole, x, -0.02, -0.006, inner);
    mesh(box(0.12, 0.12, 0.02), M.gold, x, 0, PLUG_LEN + 0.005, inner);
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), wireMats[i], x, 0, PLUG_LEN + 0.06, inner).rotation.x = Math.PI / 2;
  });
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) mesh(box(0.012, 0.22, 0.04), M.white, s * 0.475, 0, 0.32 + k * 0.12, inner);
  // invisible, larger hit box so the small plug is easy to grab
  const hit = new THREE.Mesh(box(1.4, 0.8, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.z = PLUG_LEN / 2; inner.add(hit);
  return { g, inner };
}

/* =====================================================================
   WORLD STATE
   ===================================================================== */
const plates = [], modules = [], cables = [];
let uid = 1, selected = null, lastPlug = null;
const counters = { plate: 0, module: 0, cable: 0 };

function makePlate() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(plateGeo, M.plate); m.castShadow = m.receiveShadow = true; g.add(m);
  scene.add(g);
  const p = { type: 'plate', id: uid++, name: `Base plate ${++counters.plate}`, group: g, target: V(), raw: V(), dragging: false, hitMesh: m };
  g.userData.ref = p; plates.push(p); return p;
}
function makeModule(kind) {
  const def = MODULES[kind];
  const g = new THREE.Group(), parts = new THREE.Group(); g.add(parts); scene.add(g);
  const built = def.build(parts);
  g.add(contactShadow(def.foot));
  const m = { type: 'module', kind, def, id: uid++, name: `${def.name} ${++counters.module}`, group: g, parts, built,
    plate: null, lx: 0, lz: 0, yaw: 0, dragging: false, raw: V(), settled: new THREE.Object3D(),
    ports: def.ports.map(p => ({ ...p, plug: null })), pings: [], pingT: 0, glows: [], fx: [] };
  // port glow frames
  for (const p of m.ports) {
    const [gw, gh] = p.glow || [1.5, 0.88], iw = gw / 2 - 0.1, ih = gh / 2 - 0.1;
    const s = roundRectShape(gw, gh, 0.16), inner = new THREE.Path(); inner.moveTo(-iw, -ih); inner.lineTo(iw, -ih); inner.lineTo(iw, ih); inner.lineTo(-iw, ih); inner.lineTo(-iw, -ih); s.holes.push(inner);
    const gl = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, depthWrite: false }));
    gl.position.copy(portLocal(p, 0, p.y, 0.02)); gl.rotation.y = p.rot; gl.visible = false; g.add(gl); m.glows.push(gl);
  }
  m.state = def.sim?.init ? def.sim.init() : def.init ? def.init() : {};
  def.sim?.attach?.(m);
  g.userData.ref = m; modules.push(m); return m;
}
function makePlug(cable, end) {
  const { g, inner } = buildPlug(); scene.add(g);
  const p = { type: 'plug', cable, end, group: g, inner, state: 'rest', target: V(), yawT: 0, flipped: false, port: null, insert: null, near: null };
  g.userData.ref = p; return p;
}
function makeCable() {
  const c = { type: 'cable', id: uid++, name: `Zap connector ${++counters.cable}`, plugs: [], wires: [], key: '' };
  c.plugs = [makePlug(c, 'A'), makePlug(c, 'B')];
  c.wires = WIRE_COLORS.map((_, i) => { const w = new THREE.Mesh(new THREE.BufferGeometry(), wireMats[i]); w.castShadow = true; w.userData.ref = c; scene.add(w); return w; });
  // data pulses that run along the cable once a module is wired to a board
  c.pulses = [0, 1, 2].map(() => { const s = new THREE.Mesh(pulseGeo, pulseMat); s.visible = false; scene.add(s); return s; });
  cables.push(c); return c;
}

/* ---------- geometry queries ---------- */
function plateAt(x, z, exclude) {
  return plates.find(p => p !== exclude && !p.dragging && Math.abs(x - p.target.x) < PLATE.half && Math.abs(z - p.target.z) < PLATE.half) || null;
}
const surfaceY = (x, z) => plateAt(x, z) ? PT : 0;
function footBounds(foot, cx, cz, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of [[foot.x0, foot.z0], [foot.x1, foot.z0], [foot.x0, foot.z1], [foot.x1, foot.z1]]) {
    const wx = cx + x * c + z * s, wz = cz - x * s + z * c;
    minX = Math.min(minX, wx); maxX = Math.max(maxX, wx); minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
  }
  return { minX, maxX, minZ, maxZ };
}
const LIM = PLATE.half - 0.1;
function clampOnPlate(m, lx, lz, yaw) {          // keep footprint on the plate, on hole centres
  for (let k = 0; k < 6; k++) {
    const b = footBounds(m.def.foot, lx, lz, yaw);
    if (b.minX < -LIM) lx += 1; else if (b.maxX > LIM) lx -= 1;
    if (b.minZ < -LIM) lz += 1; else if (b.maxZ > LIM) lz -= 1;
  }
  return [lx, lz];
}
function moduleFits(m, plate, lx, lz, yaw) {
  const b = footBounds(m.def.foot, lx, lz, yaw);
  if (b.minX < -LIM - 0.01 || b.maxX > LIM + 0.01 || b.minZ < -LIM - 0.01 || b.maxZ > LIM + 0.01) return false;
  return !modules.some(o => o !== m && o.plate === plate && !o.dragging && (() => {
    const q = footBounds(o.def.foot, o.lx, o.lz, o.yaw);
    return b.minX < q.maxX - 0.05 && b.maxX > q.minX + 0.05 && b.minZ < q.maxZ - 0.05 && b.maxZ > q.minZ + 0.05;
  })());
}
const plateOverlaps = (p, x, z) => plates.some(o => o !== p && !o.dragging && Math.abs(o.target.x - x) < PLATE.half * 2 + 0.2 && Math.abs(o.target.z - z) < PLATE.half * 2 + 0.2);
function settle(m) {
  if (!m.plate) return;
  m.settled.position.set(m.plate.target.x + m.lx, PT, m.plate.target.z + m.lz);
  m.settled.rotation.y = m.yaw; m.settled.updateMatrixWorld(true);
}
const settleAll = () => modules.forEach(settle);
const inFoot = (foot, l, pad = 0) => l.x > foot.x0 - pad && l.x < foot.x1 + pad && l.z > foot.z0 - pad && l.z < foot.z1 + pad;
function overModule(w, pad) { return modules.find(m => m.plate && !m.dragging && inFoot(m.def.foot, m.settled.worldToLocal(w.clone()), pad)); }
function nudgeOut(w) {                             // move a resting plug out from under a module
  for (let k = 0; k < 3; k++) {
    const m = overModule(w, 0.5); if (!m) break;
    const l = m.settled.worldToLocal(w.clone()); l.z = m.def.foot.z1 + 1.2; l.x = THREE.MathUtils.clamp(l.x, -1.5, 1.5);
    w.copy(m.settled.localToWorld(l));
  }
  return w;
}
const clampTable = p => { p.x = THREE.MathUtils.clamp(p.x, -TABLE_LIMIT, TABLE_LIMIT); p.z = THREE.MathUtils.clamp(p.z, -TABLE_LIMIT, TABLE_LIMIT); return p; };

/* ---------- removal ---------- */
function unplug(plug) {
  if (!plug.port) return;
  plug.port.module.ports[plug.port.idx].plug = null; plug.port = null; plug.state = 'rest';
}
function dropPlug(plug) {
  const w = nudgeOut(plug.group.position.clone()); w.y = surfaceY(w.x, w.z) + REST_Y; plug.target.copy(w); plug.state = 'rest';
}
function removeModule(m) {
  if (m.prog) stopCode(m, true);
  for (const p of m.ports) if (p.plug) { const pl = p.plug; unplug(pl); dropPlug(pl); }
  m.pings.forEach(r => r.material.dispose());
  m.fx.forEach(f => f.obj.material.dispose());
  m.built.screen?.tex.dispose(); m.hum?.o.stop(); m.snd?.o.stop(); if (bzHeld === m) bzHeld = null;
  scene.remove(m.group); modules.splice(modules.indexOf(m), 1);
  if (selected === m) select(null);
}
function removePlate(p) {
  modules.filter(m => m.plate === p).forEach(removeModule);
  scene.remove(p.group); plates.splice(plates.indexOf(p), 1);
  for (const c of cables) for (const pl of c.plugs) if (pl.state === 'rest') { pl.target.y = surfaceY(pl.target.x, pl.target.z) + REST_Y; }
  if (selected === p) select(null);
}
function removeCable(c) {
  c.plugs.forEach(p => { unplug(p); scene.remove(p.group); });
  c.wires.forEach(w => { w.geometry.dispose(); scene.remove(w); });
  c.pulses.forEach(s => scene.remove(s));
  cables.splice(cables.indexOf(c), 1);
  if (selected === c) select(null);
}

/* =====================================================================
   CABLE GEOMETRY
   ===================================================================== */
function plugPin(p, x, z) { return p.inner.localToWorld(V(x, 0, z)); }
function rebuildCable(c) {
  const [A, B] = c.plugs; A.group.updateMatrixWorld(true); B.group.updateMatrixWorld(true);
  PIN_X.forEach((x, i) => {
    const a0 = plugPin(A, x, PLUG_LEN + 0.1), a1 = plugPin(A, x, PLUG_LEN + 1.2);
    const b0 = plugPin(B, x, PLUG_LEN + 0.1), b1 = plugPin(B, x, PLUG_LEN + 1.2);
    const span = a1.distanceTo(b1), sag = span * 0.35 + 0.8;
    const pts = [a0, a1];
    for (const t of [0.25, 0.5, 0.75]) {
      const q = a1.clone().lerp(b1, t);
      q.y = Math.max(surfaceY(q.x, q.z) + 0.07, q.y - sag * Math.sin(Math.PI * t));
      pts.push(q);
    }
    pts.push(b1, b0);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    if (i === 1) c.curve = curve;                         // signal wire: pulses ride on it
    c.wires[i].geometry.dispose();
    c.wires[i].geometry = new THREE.TubeGeometry(curve, 72, 0.065, 6, false);
  });
}
// a plug just clicked home: say what happened, in plain words
function onConnect(p) {
  const m = p.port.module, pt = m.ports[p.port.idx], far = otherPlug(p);
  const where = m.ports.length > 1 ? `${m.name}, ${pt.label}` : m.name;
  if (far.state === 'connected') {
    const a = m, b = far.port.module;
    if (a.def.board && b.def.board) toast(`Two boards are linked. Wire a sensor to a board to see data flow.`);
    else if (a.def.board || b.def.board) {
      const s = a.def.board ? b : a, q = a.def.board ? a : b; s.pingT = 0;
      const role = s.def.sim?.role, screen = outputsOn(q).length > 0;
      if (s.kind === 'rgb') toast(`${s.name} is wired to ${q.name}. Open Code (bottom right) to light it up.`);
      else if (s.kind === 'buzzer') toast(`${s.name} is wired to ${q.name}. Play its piano in the panel, or pick a sensor to make it beep.`);
      else if (s.kind === 'servo') toast(`${s.name} is wired to ${q.name}. Drag its orange arm, or pick what moves it in the panel.`);
      else if (role === 'output') toast(`${s.name} is wired to ${q.name}. It's starting up.`);
      else if (role === 'sensor' && screen) toast(`${s.name} is wired to ${q.name}. New options on the OLED menu.`);
      else toast(`${s.name} is wired to ${q.name}. Data is flowing.`);
    }
    else toast(`Both ends are in modules. One end needs to go into a Quark C3.`);
  } else toast(`Click. ${p.cable.name} is plugged into ${where}.` + (m.def.board ? '' : ' Plug the other end into a Quark C3 to power it.'));
}

/* =====================================================================
   SELECTION + INSPECTOR
   ===================================================================== */
const selMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.9, depthWrite: false });
const selFrame = new THREE.Mesh(new THREE.BufferGeometry(), selMat); selFrame.visible = false; scene.add(selFrame);
const insp = document.getElementById('insp');
function select(obj) {
  selected = obj;
  selFrame.visible = false;
  if (obj?.type === 'plate') { selFrame.geometry.dispose(); selFrame.geometry = frameGeo(PLATE.half * 2 + 0.3, PLATE.half * 2 + 0.3, 0.22, 0.7); selFrame.visible = true; }
  if (obj?.type === 'module') {
    const f = obj.def.foot; selFrame.geometry.dispose();
    selFrame.geometry = frameGeo(f.x1 - f.x0 + 0.3, f.z1 - f.z0 + 0.3, 0.14, 0.3);
    selFrame.geometry.translate((f.x0 + f.x1) / 2, 0, (f.z0 + f.z1) / 2); selFrame.visible = true;
  }
  renderInspector(); kick();
}
const portStatus = m => m.ports.map(p => p.plug ? `<span class="ok">● ${p.plug.cable.name}</span>` : 'Free');
function endStatus(p) {
  if (!p.port) return 'Free';
  const m = p.port.module;
  return `<span class="ok">● ${m.name}${m.ports.length > 1 ? ' · ' + m.ports[p.port.idx].label : ''}</span>`;
}
function renderInspector() {
  const o = selected;
  if (!o || codeOpen) { insp.classList.add('hide'); return; }          // the code panel takes the right side
  let html = '';
  if (o.type === 'plate') {
    const n = modules.filter(m => m.plate === o).length;
    html = `<div class="k">Base plate</div><h3>${o.name}</h3>
      <div class="row"><span>Grid</span><span>16 × 16 holes</span></div>
      <div class="row"><span>Modules on it</span><span>${n}</span></div>
      <div class="btns"><button data-a="del" class="danger">Remove</button></div>`;
  } else if (o.type === 'module' && o.def.board) {
    const rows = o.ports.map(pt => {
      const l = linkOf(pt);
      const v = l ? `<span class="ok">● ${l.name}</span>` : pt.plug ? `${pt.plug.cable.name} (other end free)` : 'Free';
      return `<div class="row"><span>${pt.label}</span><span>${v}</span></div>`;
    }).join('');
    const btnRow = outputsOn(o).length ? `<div class="row"><span>Buttons</span><span>✚ next · ● select</span></div>` : '';
    const ledRow = `<div class="row"><span>RGB LED</span><span>${o.state.rgb?.some(v => v > 0) ? `<span class="ok">● ${colourName(o.state.rgb)}</span>` : 'Off · set it with code'}</span></div>`;
    html = `<div class="k">${o.def.sub}</div><h3>${o.name}</h3>${rows}${btnRow}${ledRow}
      <div class="row"><span>Sits on</span><span>${o.plate ? o.plate.name : '—'}</span></div>
      <div class="btns"><button data-a="rot">Rotate <kbd>E</kbd></button><button data-a="del" class="danger">Remove</button></div>`;
  } else if (o.type === 'module') {
    const p = o.ports[0], board = boardOf(o);
    let extra = '', extraBtn = '';
    if (o.kind === 'ultrasonic') {
      const d = Math.round(o.state.distance);
      extra = `<div class="row"><span>Reading</span><span id="liveRead">${liveText(o)}</span></div>
        <div class="ctl"><div class="ctl-h"><span>Object above sensor</span><b id="usVal">${d} cm</b></div>
        <input type="range" id="usRange" min="${US_MIN}" max="${US_MAX}" step="1" value="${d}">
        <small>Or drag the cream block up and down.</small></div>`;
    }
    if (o.kind === 'dht11') {
      const s = o.state;
      extra = `<div class="row"><span>Reading</span><span id="liveRead">${liveText(o)}</span></div>
        <div class="ctl"><div class="ctl-h"><span>Room temperature</span><b id="dh-temp">${s.temp} °C</b></div>
        <input type="range" data-k="temp" min="${DHT_T[0]}" max="${DHT_T[1]}" step="1" value="${s.temp}"></div>
        <div class="ctl"><div class="ctl-h"><span>Room humidity</span><b id="dh-hum">${s.hum} %</b></div>
        <input type="range" data-k="hum" min="${DHT_H[0]}" max="${DHT_H[1]}" step="1" value="${s.hum}">
        <small>The DHT11 takes a few seconds to catch up, and reads once a second.</small></div>`;
      extraBtn = '<button data-a="breathe">Breathe on it</button>';
    }
    if (o.kind === 'oled') {
      extra = `<div class="row"><span>Screen</span><span id="liveRead">${liveText(o)}</span></div>
        <div class="pad"><button data-a="up">▲</button><button data-a="down">▼</button><button data-a="ok">Select</button><button data-a="back">Back</button></div>`;
      extraBtn = '<button data-a="look">Look at screen</button>';
    }
    if (o.def.sim?.panel) [extra, extraBtn] = o.def.sim.panel(o);
    html = `<div class="k">${o.def.sub}</div><h3>${o.name}</h3>
      <div class="row"><span>Port</span><span>${p.label}</span></div>
      <div class="row"><span>Pins</span><span>${p.pins.join(' · ')}</span></div>
      <div class="row"><span>Connection</span><span>${portStatus(o)[0]}</span></div>
      <div class="row"><span>Controller</span><span>${board ? `<span class="ok">● ${board.name}</span>` : 'Not wired'}</span></div>
      <div class="row"><span>Sits on</span><span>${o.plate ? o.plate.name : '—'}</span></div>${extra}
      <div class="btns">${extraBtn}<button data-a="rot">Rotate <kbd>E</kbd></button><button data-a="del" class="danger">Remove</button></div>`;
  } else if (o.type === 'cable') {
    html = `<div class="k">Connector · keyed 4-wire</div><h3>${o.name}</h3>
      <div class="row"><span>End A</span><span>${endStatus(o.plugs[0])}</span></div>
      <div class="row"><span>End B</span><span>${endStatus(o.plugs[1])}</span></div>
      <div class="row"><span>Max reach</span><span>${CABLE_MAX} holes</span></div>
      <div class="btns"><button data-a="flipA">Flip A</button><button data-a="flipB">Flip B</button><button data-a="del" class="danger">Remove</button></div>`;
  }
  insp.innerHTML = html; insp.classList.remove('hide');
}
insp.addEventListener('click', e => {
  const a = e.target.closest('button')?.dataset.a; if (!a || !selected) return;
  if (a === 'del') removeSelected();
  if (a === 'rot') rotateModule(selected);
  if (a === 'flipA') flipPlug(selected.plugs[0]);
  if (a === 'flipB') flipPlug(selected.plugs[1]);
  if (['up', 'down', 'ok', 'back'].includes(a)) {
    const b = boardOf(selected);
    if (b) boardInput(b, a); else toast('Wire the OLED to a Quark C3 first.');
  }
  if (a === 'look') lookAtScreen(selected);
  if (a === 'breathe') breathe(selected);
  if (selected?.def) selected.def.sim?.action?.(selected, a);
});
insp.addEventListener('input', () => opts.onChange?.());
insp.addEventListener('click', () => opts.onChange?.());
insp.addEventListener('input', e => {
  const o = selected; if (o?.type !== 'module') return;
  if (e.target.id === 'usRange' && o.kind === 'ultrasonic') { o.state.distance = +e.target.value; syncUs(o); kick(); }
  const k = e.target.dataset.k;
  if (k && o.kind === 'dht11') {
    o.state[k] = +e.target.value;
    document.getElementById('dh-' + k).textContent = `${o.state[k]} ${k === 'temp' ? '°C' : '%'}`;
  } else if (k && o.def.sim?.slide) { o.def.sim.slide(o, k, e.target.tagName === 'SELECT' ? e.target.value : +e.target.value); kick(); }
});
function syncUs(m) {
  if (selected !== m) return;
  const d = Math.round(m.state.distance), v = document.getElementById('usVal'), r = document.getElementById('usRange');
  if (v) v.textContent = `${d} cm`;
  if (r && document.activeElement !== r) r.value = d;
}
let camTween = null;
/* ---------- port close-up ----------
   As soon as a free Zap plug is picked up (portCamStart), the camera glides in close and then follows
   the plug wherever it's dragged, keeping it in the middle of the screen at the same angle; when it
   snaps to a port the camera follows it in. Once it clicks in (or is dropped short) the camera glides
   back to where it was. While the plug is held the grab is re-anchored every frame (stepPortCam), so the
   camera following the plug never moves the plug itself: only the pointer does. Any camera move of the
   student's own (wheel, orbit, zoom buttons, Reset view) cancels it. Picking up a plugged-in plug (to
   unplug it) doesn't zoom. */
const PORT_CAM = { dist: 11, follow: 7, in: 0.5, out: 0.6, hold: 0.35 };
const calmMotion = matchMedia('(prefers-reduced-motion: reduce)');
let portCam = null;   // { home, from, dir, dist, focus, plug, phase: 'in' | 'hold' | 'out', t, wait }
const camView = () => ({ pos: camera.position.clone(), target: controls.target.clone() });
// the horizontal middle (canvas pixels) of what's left of the view once floating panels on the right are taken
// away: the inspector, the code panel, and anything marked [data-stage-overlay] (TinkerAI's progress panel)
function clearCentreX() {
  const r = canvas.getBoundingClientRect();
  let right = r.right;
  for (const el of [insp, codePanel, ...stage.querySelectorAll('[data-stage-overlay]')]) {
    if (!el || el.classList.contains('hide')) continue;
    const b = el.getBoundingClientRect();
    if (b.width && b.left > r.left + r.width / 2 && getComputedStyle(el).visibility !== 'hidden' && +getComputedStyle(el).opacity > 0.5)
      right = Math.min(right, b.left);
  }
  return (r.left + right) / 2 - r.left;
}
function portCamStart(o) {
  if (DEMO || calmMotion.matches) return;
  const home = portCam?.phase === 'out' ? portCam.home : camView();     // picked up again while gliding back
  const off = home.pos.clone().sub(home.target);
  portCam = { home, from: camView(), dir: off.clone().normalize(), dist: Math.min(PORT_CAM.dist, off.length()),
    focus: o.group.position.clone(), plug: o, phase: 'in', t: 0, wait: 0 };
  kick();
}
function portCamEnd(o, inserting) {
  if (!portCam || portCam.plug !== o || portCam.phase === 'out') return;
  if (inserting) { portCam.phase = 'hold'; portCam.wait = 0; }       // follow it in, wait for the click, then back out
  else portCamOut();
}
function portCamOut() {
  if (!portCam) return;
  portCam.from = camView(); portCam.phase = 'out'; portCam.t = 0; kick();
}
function stepPortCam(dt) {
  const P = portCam; if (!P) return false;
  P.t += dt;
  if (P.phase === 'out') {
    const k = ease(Math.min(1, P.t / PORT_CAM.out));
    camera.position.lerpVectors(P.from.pos, P.home.pos, k); controls.target.lerpVectors(P.from.target, P.home.target, k);
    if (k >= 1) portCam = null;
  } else {
    // follow the plug: same viewing angle as before, closer, centred on it (smoothed so it glides)
    P.focus.lerp(P.plug.group.position, damp(PORT_CAM.follow, dt));
    const target = P.focus.clone(), pos = P.focus.clone().addScaledVector(P.dir, P.dist);
    // centre it in the part of the view that isn't covered by panels on the right (inspector, code, TinkerAI)
    const dx = clearCentreX() - canvas.clientWidth / 2;
    if (dx) {
      const perPx = 2 * P.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / canvas.clientHeight;
      const side = V().crossVectors(P.dir, camera.up).normalize().multiplyScalar(dx * perPx);   // P.dir points back at the camera
      target.add(side); pos.add(side);
    }
    const k = ease(Math.min(1, P.t / PORT_CAM.in));                   // glide in from where the view was
    camera.position.lerpVectors(P.from.pos, pos, k); controls.target.lerpVectors(P.from.target, target, k);
    if (P.phase === 'hold') {
      if (P.plug.state === 'connected' && (P.wait += dt) > PORT_CAM.hold) portCamOut();
      else if (P.plug.state !== 'insert' && P.plug.state !== 'connected') portCamOut();
    }
  }
  zoomDist = camera.position.distanceTo(controls.target);
  // the plug is still held: re-anchor the grab so the moving view never moves the plug, only the pointer does
  if (drag?.ref === P.plug && drag.p && lastEvent) {
    camera.updateMatrixWorld(); setRay(lastEvent);
    if (ray.ray.intersectPlane(drag.plane, hitP)) drag.offset = V(drag.p.x - hitP.x, 0, drag.p.z - hitP.z);
  }
  return true;
}
function lookAtScreen(m) {
  const c = m.group.localToWorld(V(0, 1.35, -0.22));
  const off = V(0, 10, 6.5).applyAxisAngle(V(0, 1, 0), m.group.rotation.y);
  camTween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: c.clone().add(off), t1: c };
  kick();
}
function removeSelected() {
  const o = selected; if (!o) return;
  if (o.type === 'plate') removePlate(o); else if (o.type === 'module') removeModule(o); else if (o.type === 'cable') removeCable(o);
  changed(); toast('Removed');
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
function rotateModule(m) {
  if (!m || m.type !== 'module') return;
  const ny = m.yaw - Math.PI / 2;
  if (m.dragging) { m.yaw = ny; if (lastEvent) updateDrag(lastEvent); return; }
  const [lx, lz] = clampOnPlate(m, m.lx, m.lz, ny);
  if (!moduleFits(m, m.plate, lx, lz, ny)) { toast('No room to rotate here. Move it first.'); return; }
  m.yaw = ny; m.lx = lx; m.lz = lz; settle(m);
  for (const p of cables.flatMap(c => c.plugs)) if (p.state === 'rest') { const w = nudgeOut(p.target.clone()); p.target.x = w.x; p.target.z = w.z; }
  click(1.3); changed();
}
function flipPlug(p) {
  if (!p) return;
  if (p.state === 'connected' || p.state === 'insert') { toast('Unplug it first: drag the plug out of the port.'); return; }
  p.flipped = !p.flipped; kick();
  toast(p.flipped ? 'Plug flipped: key ridge underneath' : 'Plug flipped: key ridge on top');
}

/* =====================================================================
   POINTER / DRAG ENGINE
   ===================================================================== */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitP = V();
let drag = null, lastEvent = null, sideDrag = null;
const planeAt = y => new THREE.Plane(V(0, 1, 0), -y);
const PLUG_PLANE_Y = PT + 1.81;

function setRay(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
const overCanvas = e => { const r = canvas.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
function refOf(o) { while (o) { if (o.userData.ref) return o.userData.ref; o = o.parent; } return null; }
let pickedObj = null;                                // the exact mesh under the cursor (board buttons)
function pick() {
  const targets = [...cables.flatMap(c => [...c.plugs.map(p => p.group), ...c.wires]), ...modules.map(m => m.parts),
    ...modules.filter(m => m.built.target).map(m => m.built.target), ...plates.map(p => p.hitMesh)];
  const hits = ray.intersectObjects(targets, true);
  pickedObj = hits[0]?.object ?? null;
  if (!hits.length) return null;
  const plugHit = hits.find(h => refOf(h.object)?.type === 'plug');
  if (plugHit && plugHit.distance <= hits[0].distance + 0.6) { pickedObj = plugHit.object; return refOf(plugHit.object); }
  return refOf(hits[0].object);
}
const boardBtnHit = hit => hit?.type === 'module' && hit.def.board && pickedObj?.userData.btn;
// a hands-on part of a sensor under the cursor: 'knob', 'btn0', 'btn1'
function actOf(hit) {
  if (hit?.type !== 'module') return null;
  for (let o = pickedObj; o && !o.userData.ref; o = o.parent) if (o.userData.act) return o.userData.act;
  return null;
}
let held = null;                                     // a sensor button held down with the mouse

// ---- ghost footprint for placement ----
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x18A058, transparent: true, opacity: 0.42, depthWrite: false });
const ghost = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat); ghost.visible = false; scene.add(ghost);
let ghostFor = null;
function showGhost(kind, foot, x, y, z, yaw, ok) {
  if (ghostFor !== kind) {
    ghost.geometry.dispose();
    if (kind === 'plate') { const g = new THREE.ShapeGeometry(roundRectShape(PLATE.half * 2 + 0.3, PLATE.half * 2 + 0.3, 0.7)); g.rotateX(-Math.PI / 2); ghost.geometry = g; }
    else { const g = new THREE.ShapeGeometry(roundRectShape(foot.x1 - foot.x0 + 0.2, foot.z1 - foot.z0 + 0.2, 0.25)); g.rotateX(-Math.PI / 2); g.translate((foot.x0 + foot.x1) / 2, 0, (foot.z0 + foot.z1) / 2); ghost.geometry = g; }
    ghostFor = kind;
  }
  ghost.position.set(x, y + 0.015, z); ghost.rotation.y = yaw; ghost.visible = true;
  ghostMat.color.set(ok ? 0x18A058 : 0x111111);
}
const hideGhost = () => { ghost.visible = false; };

// ---- start a drag on an existing object ----
canvas.addEventListener('pointerdown', e => {
  // fingers are handled by the touch layer below (tap to select, pinch, twist); OrbitControls never sees them
  if (e.pointerType === 'touch') { e.stopImmediatePropagation(); touchDown(e); return; }
  if (e.button !== 0) return;
  pressAt(e);
});
// a press on the table at e's position: grab, press or select whatever is there (mouse down, or a touch once it's clearly meant)
function pressAt(e) {
  camTween = null;
  setRay(e);
  const hit = pick();
  if (!hit) { select(null); return; }               // empty space: OrbitControls handles it
  if (boardBtnHit(hit)) { if (selected !== hit && !codeOpen) select(hit); boardInput(hit, pickedObj.userData.btn); return; }
  const act = actOf(hit);
  if (act) {
    if (selected !== hit && !codeOpen) select(hit);              // while coding, a tap is just a tap
    if (act === 'knob') {
      controls.enabled = false;
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      drag = { ref: { type: 'knob', m: hit }, active: true, sx: e.clientX, sy: e.clientY, v0: hit.state.v };
      canvas.style.cursor = 'ew-resize';
    } else if (act === 'arm') {                                  // the servo arm follows the pointer round the shaft
      if (boardOf(hit)?.prog) { toast('Your code is turning the servo. Press Stop in the Code panel to turn it by hand.'); return; }
      controls.enabled = false;
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      drag = { ref: { type: 'arm', m: hit }, active: true, plane: new THREE.Plane(V(0, 1, 0), -hit.group.localToWorld(SV_PIV.clone()).y) };
      canvas.style.cursor = 'grabbing';
    } else { hit.def.sim.press?.(hit, act, true); held = { m: hit, act }; }
    return;
  }
  controls.enabled = false;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  // selected only if this turns out to be a click (let go without moving, see pointerEnd): moving a part
  // around shouldn't open the inspector over the table
  drag = { ref: hit, pending: true, sx: e.clientX, sy: e.clientY, sel: hit.type === 'plug' ? hit.cable : hit.type === 'target' ? hit.m : hit };
  if (hit.type === 'plug') lastPlug = hit;
}

/* ---------- touch (iPad, tablets, phones) ----------
   A finger that lands on a part does nothing until it's clearly meant: lifting it is a tap (select,
   press a button), moving it drags the part, holding it still grabs it. If a second finger comes
   down first, it was never a touch on the part: it's a pinch, so nothing gets selected.
   One finger on empty table ...... orbit        Tap on empty table ... deselect
   Two fingers ................... pinch to zoom, drag to pan, twist to turn the table          */
const touches = new Map();                           // pointerId -> {x, y}
let tPend = null;                                    // finger on a part, not yet a tap or a drag
let tHold = null;                                    // a hold grabbed a part: what was selected before, to undo if it turns into a pinch
let tNav = null;                                     // 'orbit' | 'pinch' | 'done' (fingers left over after a pinch do nothing)
let tGest = null, tStart = null, tMoved = false, tFirst = null;   // tFirst: the finger that can move a part
const TAP_SLOP = 10, HOLD_MS = 350;
function gestOf() {
  const [a, b] = [...touches.values()];
  return { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}
function commitTouch() {
  const p = tPend; if (!p) return;
  tPend = null; clearTimeout(p.timer);
  pressAt({ clientX: p.x, clientY: p.y, pointerId: p.id, button: 0 });
}
function touchDown(e) {
  camTween = null;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  if (touches.size === 1) {
    tMoved = false; tStart = { x: e.clientX, y: e.clientY }; tHold = null; tFirst = e.pointerId;
    setRay(e);
    if (pick()) {
      tNav = null;
      tPend = { id: e.pointerId, x: e.clientX, y: e.clientY };
      tPend.timer = setTimeout(() => { tHold = { prev: selected }; commitTouch(); }, HOLD_MS);
    } else { tPend = null; tNav = 'orbit'; }
    return;
  }
  // another finger: navigation. Leave a part that's already being moved alone.
  if (drag?.active && drag.ref.type !== 'knob' && drag.ref.type !== 'arm') return;
  cancelTouchPress();
  tNav = 'pinch'; tGest = gestOf();
}
function cancelTouchPress() {
  if (tPend) { clearTimeout(tPend.timer); tPend = null; }
  if (held) { held.m.def.sim.press?.(held.m, held.act, false); held = null; }
  if (drag) {
    if (drag.ref.type === 'knob') { drag.ref.m.state.v = drag.v0; syncPot(drag.ref.m); }
    drag = null; canvas.style.cursor = ''; controls.enabled = true;
  }
  if (tHold) { if (selected !== tHold.prev) select(tHold.prev); tHold = null; }
  kick();
}
// returns true when the move was used up here (navigation), false to let the drag code see it
function touchMove(e) {
  const t = touches.get(e.pointerId), px = t.x, py = t.y;
  t.x = e.clientX; t.y = e.clientY;
  if (tPend) {
    if (Math.hypot(e.clientX - tPend.x, e.clientY - tPend.y) <= TAP_SLOP) return true;
    commitTouch();                                   // it's a drag: grab the part where the finger landed
    return false;
  }
  if (drag) return e.pointerId !== tFirst;          // only the first finger moves a part
  if (tNav === 'orbit' && touches.size === 1) {
    if (!tMoved && Math.hypot(e.clientX - tStart.x, e.clientY - tStart.y) > TAP_SLOP) tMoved = true;
    if (tMoved) { orbitBy((e.clientX - px) * 1.1, (e.clientY - py) * 1.1); kick(); }
    return true;
  }
  if (tNav === 'pinch' && touches.size >= 2) {
    const g = gestOf();
    if (g.d > 20 && tGest.d > 20) zoomBy(Math.log(tGest.d / g.d), { clientX: g.mx, clientY: g.my });
    panBy(-(g.mx - tGest.mx), -(g.my - tGest.my));
    let da = g.a - tGest.a;
    if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
    if (Math.abs(da) < 0.5) orbitBy(-da / 0.005, 0);   // twist turns the table with the fingers
    tGest = g; kick();
    return true;
  }
  return true;
}
// returns true when the drag code should not see this lift (a spare finger while a part is moving)
function touchUp(e) {
  touches.delete(e.pointerId);
  if (e.pointerId !== tFirst && drag?.active) { if (!touches.size) { tNav = null; tGest = null; } return true; }
  if (tPend && tPend.id === e.pointerId) {
    if (e.type === 'pointercancel') { clearTimeout(tPend.timer); tPend = null; }
    else {
      commitTouch();                                 // a tap on a part: select it, press what it hit
      if (held) { const h = held; held = null; setTimeout(() => h.m.def.sim.press?.(h.m, h.act, false), 150); }
    }
  } else if (tNav === 'orbit' && !tMoved && !touches.size && !drag && e.type !== 'pointercancel') select(null);
  tHold = null;
  if (!touches.size) { tNav = null; tGest = null; }
  else if (tNav === 'pinch') { if (touches.size >= 2) tGest = gestOf(); else tNav = 'done'; }
  return false;
}

function beginDrag(e) {
  const o = drag.ref; drag.pending = false; drag.active = true;
  setRay(e);
  if (o.type === 'plate') {
    drag.plane = planeAt(0); ray.ray.intersectPlane(drag.plane, hitP);
    drag.offset = V(o.target.x - hitP.x, 0, o.target.z - hitP.z);
    o.raw.copy(o.target); o.dragging = true;
    // free plugs resting on this plate travel with it
    drag.carry = cables.flatMap(c => c.plugs).filter(p => p.state === 'rest' && Math.abs(p.target.x - o.target.x) < PLATE.half && Math.abs(p.target.z - o.target.z) < PLATE.half)
      .map(p => ({ p, dx: p.target.x - o.target.x, dz: p.target.z - o.target.z }));
  } else if (o.type === 'module') {
    drag.plane = planeAt(PT); ray.ray.intersectPlane(drag.plane, hitP);
    drag.offset = V(o.group.position.x - hitP.x, 0, o.group.position.z - hitP.z);
    drag.from = { plate: o.plate, lx: o.lx, lz: o.lz, yaw: o.yaw };
    o.dragging = true; o.raw.copy(o.group.position);
  } else if (o.type === 'plug') {
    if (o.state !== 'connected' && o.state !== 'insert') portCamStart(o);   // picking up a free plug: close in on where it's going
    if (o.state === 'connected') { unplug(o); click(0.6); }
    if (o.state === 'insert') { o.insert.m.ports[o.insert.idx].plug = null; o.insert = null; }
    drag.plane = planeAt(PLUG_PLANE_Y); ray.ray.intersectPlane(drag.plane, hitP);
    drag.offset = V(o.group.position.x - hitP.x, 0, o.group.position.z - hitP.z);
    o.state = 'drag';
  } else if (o.type === 'target') {                  // the block above an ultrasonic: vertical only
    drag.h0 = o.m.built.target.position.y;
  } else if (o.type === 'cable') {                   // grabbed the wire: move both free ends together
    drag.plane = planeAt(0); ray.ray.intersectPlane(drag.plane, hitP);
    drag.last = hitP.clone();
    if (o.plugs.some(p => p.state === 'connected')) { drag.active = false; toast('Unplug the ends to move this cable.'); }
  }
  canvas.style.cursor = 'grabbing';
  updateDrag(e);
}

function updateDrag(e) {
  lastEvent = e;
  const o = drag.ref; setRay(e);
  if (o.type === 'knob') {                           // turn the pot: right (or up) turns it up
    o.m.state.v = THREE.MathUtils.clamp(drag.v0 + (e.clientX - drag.sx - (e.clientY - drag.sy)) * 0.35, 0, 100);
    syncPot(o.m); kick();
    return;
  }
  if (o.type === 'arm') {
    if (!ray.ray.intersectPlane(drag.plane, hitP)) return;
    const l = o.m.group.worldToLocal(hitP.clone());
    let a = Math.atan2(-(l.z - SV_PIV.z), l.x - SV_PIV.x) / DEG;   // 0 = right, 90 = back, 180 = left
    if (a < 0) a = a < -90 ? 180 : 0;                             // pointer in front of the shaft: stop at the nearer end
    servoSet(o.m, a);
    return;
  }
  if (o.type === 'target') {
    const k = camera.position.distanceTo(controls.target) / canvas.clientHeight * 0.9;   // world units per pixel, roughly
    const h = THREE.MathUtils.clamp(drag.h0 - (e.clientY - drag.sy) * k, US_H0, US_H1);
    o.m.state.distance = usDist(h); syncUs(o.m); kick();
    return;
  }
  if (!ray.ray.intersectPlane(drag.plane, hitP)) return;
  const p = clampTable(hitP.clone().add(drag.offset || V()));

  if (o.type === 'plate') {
    o.raw.set(p.x, 0, p.z);
    const sx = Math.round(p.x), sz = Math.round(p.z);
    drag.snap = V(sx, 0, sz); drag.ok = !plateOverlaps(o, sx, sz);
    showGhost('plate', null, sx, 0, sz, 0, drag.ok);
    for (const c of drag.carry) c.p.target.set(p.x + c.dx, PT + REST_Y + 0.6, p.z + c.dz);
  }
  else if (o.type === 'module') {
    const plate = plateAt(p.x, p.z);
    o.raw.set(p.x, (plate ? PT : 0) + 0.9, p.z);
    if (plate) {
      let [lx, lz] = clampOnPlate(o, Math.floor(p.x - plate.target.x) + 0.5, Math.floor(p.z - plate.target.z) + 0.5, o.yaw);
      drag.snap = { plate, lx, lz }; drag.ok = moduleFits(o, plate, lx, lz, o.yaw);
      showGhost('m:' + o.kind, o.def.foot, plate.target.x + lx, PT, plate.target.z + lz, o.yaw, drag.ok);
    } else { drag.snap = null; drag.ok = false; hideGhost(); }
  }
  else if (o.type === 'plug') { drag.p = p.clone(); dragPlug(o, p); }
  else if (o.type === 'cable' && drag.active) {
    const d = hitP.clone().sub(drag.last); drag.last.copy(hitP);
    for (const pl of o.plugs) { pl.target.add(d); clampTable(pl.target); pl.target.y = surfaceY(pl.target.x, pl.target.z) + REST_Y + 0.4; }
  }
  kick();
}

function dragPlug(o, p) {
  // cable reach: stay within CABLE_MAX of the other end
  const other = o.cable.plugs[o.end === 'A' ? 1 : 0].group.position;
  const d = V(p.x - other.x, 0, p.z - other.z);
  if (d.length() > CABLE_MAX) { d.setLength(CABLE_MAX); p.x = other.x + d.x; p.z = other.z + d.z; }
  // nearest free port in range
  let best = null;
  for (const m of modules) {
    if (!m.plate || m.dragging) continue;
    const l = m.settled.worldToLocal(V(p.x, PLUG_PLANE_Y, p.z));
    m.ports.forEach((pt, idx) => {
      if (pt.plug && pt.plug !== o) return;
      const dx = l.x - pt.x, dz = l.z - pt.mouthZ, c = Math.cos(pt.rot), s = Math.sin(pt.rot);
      const u = dx * c - dz * s, d = dx * s + dz * c;          // into port space
      if (Math.abs(u) < (m.ports.length > 1 ? 0.55 : 0.95) && d > -0.3 && d < 1.6) {
        const dist = Math.hypot(u, d);
        if (!best || dist < best.dist) best = { m, idx, u, d, dist };
      }
    });
  }
  o.near = best;
  if (best) {
    const pt = best.m.ports[best.idx];
    o.yawT = shortAngle(o.group.rotation.y, best.m.yaw + pt.rot);
    const lt = o.flipped ? portLocal(pt, best.u, pt.y, Math.max(best.d, 0.12))
                         : portLocal(pt, THREE.MathUtils.lerp(best.u, 0, 0.6), pt.y, Math.max(best.d, 0.05));
    o.target.copy(best.m.settled.localToWorld(lt));
  } else {
    const w = V(p.x, PLUG_PLANE_Y, p.z);
    if (overModule(w, 0.4)) w.y = PT + 2.95;            // hop over modules
    o.target.copy(w);
  }
}

function endDrag() {
  const o = drag.ref;
  if (o.type === 'plate') {
    o.dragging = false;
    if (drag.ok) { o.target.copy(drag.snap); click(1.1); }
    else if (drag.spawn) { removePlate(o); toast('Plates can’t overlap. Try an empty spot.'); }
    else toast('Plates can’t overlap.');
    for (const c of drag.carry || []) c.p.target.set(o.target.x + c.dx, PT + REST_Y, o.target.z + c.dz);
    settleAll();
  }
  else if (o.type === 'module') {
    o.dragging = false;
    if (drag.ok) { o.plate = drag.snap.plate; o.lx = drag.snap.lx; o.lz = drag.snap.lz; settle(o); click(1.4); }
    else if (drag.spawn) { removeModule(o); toast(plates.length ? 'Modules go on a base plate with room to spare.' : 'Add a base plate first, then drop modules on it.'); }
    else { Object.assign(o, drag.from); settle(o); toast('No room there. It went back.'); }
    for (const p of cables.flatMap(c => c.plugs)) if (p.state === 'rest') { const w = nudgeOut(p.target.clone()); p.target.x = w.x; p.target.z = w.z; }
  }
  else if (o.type === 'plug') {
    const n = o.near; o.near = null;
    if (n && !o.flipped) {
      const pt = n.m.ports[n.idx];
      o.state = 'insert';
      o.insert = { t: 0, m: n.m, idx: n.idx,
        keys: [o.group.position.clone(), n.m.settled.localToWorld(portLocal(pt, 0, pt.y, 0.05)), n.m.settled.localToWorld(portLocal(pt, 0, pt.y, -INSERT_DEPTH))] };
      pt.plug = o;
      portCamEnd(o, true);
    } else {
      if (n && o.flipped) toast('Wrong way up. Zap plugs are keyed, so press R to flip it.');
      dropPlug(o);
      portCamEnd(o, false);
    }
  }
  else if (o.type === 'cable') {
    for (const pl of o.plugs) { const w = nudgeOut(pl.target.clone()); w.y = surfaceY(w.x, w.z) + REST_Y; pl.target.copy(w); }
    if (drag.spawn) click(1.2);
  }
  hideGhost(); changed();
}

addEventListener('pointermove', e => {
  if (sidePend && e.pointerId === sidePend.id) return moveSidePend(e);
  if (e.pointerType === 'touch' && touches.has(e.pointerId) && touchMove(e)) return;
  if (sideDrag) return moveSideDrag(e);
  if (drag) {
    if (drag.pending && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) beginDrag(e);
    else if (drag.active) updateDrag(e);
    return;
  }
  if (e.target === canvas && e.pointerType !== 'touch') {
    setRay(e); const h = pick(), act = actOf(h);
    canvas.style.cursor = h?.type === 'target' ? 'ns-resize' : act === 'knob' ? 'ew-resize' : act === 'arm' ? 'grab' : boardBtnHit(h) || act ? 'pointer' : h ? 'grab' : '';
  }
});
function pointerEnd(e) {
  if (sidePend && e.pointerId === sidePend.id) { const p = endPend(); if (e.type === 'pointerup') addToTable(p.item); return; }
  if (e.pointerType === 'touch' && touches.has(e.pointerId) && touchUp(e)) return;
  if (e.type === 'pointercancel' && !drag && !sideDrag) return;
  if (held) { held.m.def.sim.press?.(held.m, held.act, false); held = null; }
  if (sideDrag) return endSideDrag(e);
  if (!drag) return;
  if (drag.active) endDrag();
  else if (drag.pending && drag.sel && e.type === 'pointerup') select(drag.sel);   // a click, not a drag
  drag = null; controls.enabled = true; canvas.style.cursor = '';
  changed();
}
addEventListener('pointerup', pointerEnd);
addEventListener('pointercancel', pointerEnd);

/* ---------- drag from the parts library ---------- */
// A press on a card turns into a drag once it moves; one that never moves is a tap, which drops the part in
// the middle of the table. On touch the grid has to scroll too, so a finger picks a part up by moving
// sideways or by holding still for a moment; moving up or down scrolls instead.
let sidePend = null;
const LIFT_MS = 280;
function pickStart(e, item, el) {
  if (e.button > 0 || sideDrag || sidePend || drag) return;
  if (e.pointerType !== 'touch') e.preventDefault();          // no text selection, no native image drag
  const p = sidePend = { id: e.pointerId, x: e.clientX, y: e.clientY, item, el, touch: e.pointerType === 'touch' };
  el.classList.add('press');
  if (p.touch) p.hold = setTimeout(() => { if (sidePend === p) liftPend({ clientX: p.x, clientY: p.y, preventDefault() {} }); }, LIFT_MS);
}
function endPend() {
  const p = sidePend; if (!p) return null;
  clearTimeout(p.hold); p.el.classList.remove('press'); sidePend = null;
  return p;
}
function liftPend(e) { const p = endPend(); if (p) startSideDrag(e, p.item); }
function moveSidePend(e) {
  const p = sidePend, dx = e.clientX - p.x, dy = e.clientY - p.y;
  if (!p.touch) { if (Math.hypot(dx, dy) > 4) liftPend(e); return; }
  if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) liftPend(e);
  else if (Math.hypot(dx, dy) > 12) endPend();                // scrolling the grid
}
function startSideDrag(e, item) {
  e.preventDefault();
  const chip = document.createElement('div'); chip.className = 'dragchip';
  chip.innerHTML = `<img src="${imgSrc(item)}" alt="">${item.name}`;
  document.body.appendChild(chip);
  sideDrag = { item, chip, spawned: null };
  if (!DESK) { palEl.classList.add('lifting'); partsFab.classList.add('cancel'); }
  select(null);
  moveSideDrag(e);
}
// while a part is held, the corner button is where you let go to change your mind
const overFab = e => { if (!partsFab.offsetParent) return false; const r = partsFab.getBoundingClientRect(); return e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8; };
const dropOK = e => overCanvas(e) && !overFab(e);
// a tap (or Enter) on a card: drop the part in the middle of the table, with the dialog out of the way
function addToTable(item) {
  if (sideDrag || drag) return;
  if (!DESK) setPal(false);
  const r = canvas.getBoundingClientRect();
  const e = { clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.5, preventDefault() {} };
  startSideDrag(e, item); endSideDrag(e);
}
function spawnFor(item) {
  if (item.id === 'plate') { const p = makePlate(); p.dragging = true; return { ref: p, offset: V() }; }
  if (item.id === 'zap') {
    const c = makeCable(); return { ref: c, offset: V(), cable: true };
  }
  const m = makeModule(item.id); m.dragging = true; return { ref: m, offset: V() };
}
function moveSideDrag(e) {
  const s = sideDrag, inside = dropOK(e);
  partsFab.classList.toggle('hot', overFab(e));
  s.chip.style.left = e.clientX + 'px'; s.chip.style.top = e.clientY + 'px';
  s.chip.style.display = inside ? 'none' : 'flex';
  stage.classList.toggle('drop-target', !inside);
  if (inside && !s.spawned) {
    s.spawned = spawnFor(s.item);
    const o = s.spawned.ref;
    setRay(e);
    if (o.type === 'cable') {
      drag = { ref: o, spawn: true, active: true, plane: planeAt(0) };
      ray.ray.intersectPlane(drag.plane, hitP);
      o.plugs[0].target.set(hitP.x - 1.2, REST_Y + 0.4, hitP.z); o.plugs[1].target.set(hitP.x + 1.2, REST_Y + 0.4, hitP.z);
      o.plugs.forEach(p => p.group.position.copy(p.target));
      drag.last = hitP.clone();
    } else {
      drag = { ref: o, spawn: true, active: true, plane: planeAt(o.type === 'plate' ? 0 : PT), offset: V() };
      if (o.type === 'plate') drag.carry = [];
      if (o.type === 'module') drag.from = null;
    }
  }
  if (s.spawned) {
    const o = s.spawned.ref;
    const vis = inside;
    if (o.type === 'cable') { o.plugs.forEach(p => p.group.visible = vis); o.wires.forEach(w => w.visible = vis); }
    else o.group.visible = vis;
    if (inside) {
      updateDrag(e);
      if (o.type !== 'cable' && !s.placedOnce) { o.group.position.copy(o.raw); s.placedOnce = true; }
    } else hideGhost();
  }
}
function endSideDrag(e) {
  const s = sideDrag; sideDrag = null;
  s.chip.remove(); stage.classList.remove('drop-target');
  palEl.classList.remove('lifting'); partsFab.classList.remove('cancel', 'hot');
  if (!s.spawned) return;
  const o = s.spawned.ref;
  if (!dropOK(e)) {                                   // let go off the table or on the corner button: cancel
    if (o.type === 'plate') removePlate(o); else if (o.type === 'module') removeModule(o); else removeCable(o);
    drag = null; hideGhost(); changed(); return;
  }
  endDrag();
  drag = null;                                        // not selected: a new part shouldn't open the inspector
  changed();
}

/* ---------- keyboard ---------- */
addEventListener('keydown', e => {
  if (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'e') rotateModule(drag?.ref?.type === 'module' ? drag.ref : selected);
  if (k === 'r') flipPlug(drag?.ref?.type === 'plug' ? drag.ref : lastPlug);
  if ((k === 'delete' || k === 'backspace') && !drag) removeSelected();
  if (k === 'escape') { if (palOpen && !DESK) setPal(false); else select(null); }
  if (k === 'p' && !DEMO && !e.ctrlKey && !e.metaKey && !e.altKey) setPal(!palOpen);
  if ((k === '+' || k === '=' || k === '-' || k === '_') && !e.ctrlKey && !e.metaKey && !DEMO) zoomStep(k === '+' || k === '=' ? 1 : -1);
  if (selected?.kind === 'ir' && /^[0-9*#]$/.test(e.key)) irPress(selected, e.key);
  if (selected?.kind === 'buzzer' && /^[1-8]$/.test(e.key) && !e.repeat) bzPress(selected, BZ_WHITE[+e.key - 1]);
  // OLED menu: the selected board, the board of the selected OLED, or the first board driving a screen
  const nav = { arrowup: 'up', arrowdown: 'down', enter: 'ok', arrowright: 'ok', arrowleft: 'back' }[k];
  if (nav && !drag) {
    const b = selected?.type === 'module' && selected.def.board ? selected
      : selected?.type === 'module' && selected.def.sim?.input ? boardOf(selected)
      : modules.find(m => m.def.board && outputsOn(m).length);
    if (b && outputsOn(b).length) { e.preventDefault(); boardInput(b, nav, true); }
  }
});

// buzzer piano: press and hold a key (mouse, touch or keys 1-8); slide across keys to change note
insp.addEventListener('pointerdown', e => {
  const k = e.target.closest('[data-note]'); if (!k || selected?.kind !== 'buzzer') return;
  e.preventDefault(); bzPress(selected, +k.dataset.note);
});
insp.addEventListener('pointerover', e => {
  const k = e.target.closest('[data-note]'); if (!k || !bzHeld || bzHeld !== selected) return;
  bzPress(bzHeld, +k.dataset.note);
});
const bzRelease = () => { if (bzHeld) bzPress(bzHeld, 0); };
addEventListener('pointerup', bzRelease); addEventListener('pointercancel', bzRelease); addEventListener('blur', bzRelease);
addEventListener('keyup', e => { if (bzHeld && /^[1-8]$/.test(e.key)) bzRelease(); });
docOn('visibilitychange', () => { if (document.hidden) { bzRelease(); modules.forEach(m => m.snd && buzzSound(m, 0)); } });

/* ---------- the parts library: open / close ---------- */
// Desktop: a sidebar, open unless it was hidden last time (remembered on this device); hidden, the corner
// button brings it back. Touch: a dialog over the stage that closes with its X, the corner button, P, Esc or a
// plain tap on the table (not a drag, pinch or orbit), and opens by itself on an empty new build.
const emptyBox = document.getElementById('empty'), closeBtn = document.getElementById('palClose');
function setPal(open, remember) {
  if (open === palOpen) return;
  palOpen = open;
  palEl.classList.toggle('open', open); palEl.setAttribute('aria-hidden', String(!open)); palEl.inert = !open;
  partsFab.classList.toggle('on', open); partsFab.setAttribute('aria-expanded', String(open));
  partsFab.title = open ? 'Close the parts library (P)' : 'Open the parts library (P)';
  emptyBox.classList.toggle('hide', plates.length > 0 || (palOpen && !DESK));
  partsFab.classList.toggle('hint', startHint && !open && !DEMO);
  if (remember && DESK) try { localStorage.setItem('sg:side', open ? '1' : '0'); } catch {}
  if (open && tutPart) requestAnimationFrame(scrollToTut);
}
function applyLayout() {
  appEl.classList.toggle('desk', DESK);
  palEl.setAttribute('role', DESK ? 'complementary' : 'dialog');
  closeBtn.title = DESK ? 'Hide the parts list (P)' : 'Close (P)';
  closeBtn.setAttribute('aria-label', DESK ? 'Hide the parts list' : 'Close the parts library');
  document.getElementById('palHint').textContent = DESK ? '' : 'Drag onto the table, or tap to add';
  document.getElementById('emptyArrow').textContent = DESK ? '←' : '↘';
  document.getElementById('emptyText').innerHTML = DESK
    ? 'Drag a <strong>Base plate</strong> from the parts list onto the table. Then add modules and wire them up with Zap connectors.'
    : 'Open <strong>Parts</strong> in the corner and drag a <strong>Base plate</strong> onto the table. Then add modules and wire them up with Zap connectors.';
  if (DESK && libCat) { libCat = ''; renderCats(); renderLibrary(qEl.value); }    // the sidebar shows every category
  let saved = null; try { saved = localStorage.getItem('sg:side'); } catch {}
  if (DESK) setPal(DEMO || saved !== '0');
  else setPal(!plates.length && !modules.length && !cables.length);
  emptyBox.classList.toggle('hide', plates.length > 0 || (palOpen && !DESK));
}
const appEl = document.querySelector('.app');
partsFab.onclick = () => { if (!sideDrag) setPal(!palOpen, true); };
closeBtn.onclick = () => setPal(false, true);
qEl.addEventListener('keydown', e => { if (e.key === 'Escape') { qEl.blur(); if (!DESK) setPal(false); } });
let palTap = null;
stage.addEventListener('pointerdown', e => { palTap = palOpen && !DESK && e.target === canvas && !palTap ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null; }, true);
addEventListener('pointerup', e => {
  const t = palTap; if (!t || e.pointerId !== t.id) return; palTap = null;
  if (Math.hypot(e.clientX - t.x, e.clientY - t.y) < 8 && performance.now() - t.t < 500) setPal(false);
});
addEventListener('pointercancel', () => { palTap = null; });
// while a part is held on a touch screen, the page must not scroll under the finger
docOn('touchmove', e => { if (sideDrag) e.preventDefault(); }, { passive: false });
const onLayout = () => { const d = DEMO || deskMQ.matches; if (d !== DESK && !sideDrag) { DESK = d; applyLayout(); } };
deskMQ.addEventListener('change', onLayout);
applyLayout();
// Safari's own pinch-zoom of the whole page would fight the table's pinch: the simulator handles pinches itself
if (!DEMO) for (const t of ['gesturestart', 'gesturechange']) docOn(t, e => e.preventDefault(), { passive: false });

/* ---------- top bar ---------- */
document.getElementById('viewBtn').onclick = () => { camTween = null; portCam = null; camera.position.copy(CAM_HOME); controls.target.copy(TARGET_HOME); zoomDist = CAM_HOME.distanceTo(TARGET_HOME); kick(); };
const clearBtn = document.getElementById('clearBtn'); let clearArmed = 0;
clearBtn.onclick = () => {
  if (!clearArmed) { clearArmed = setTimeout(() => { clearArmed = 0; clearBtn.classList.remove('armed'); clearBtn.textContent = 'Clear all'; }, 2500); clearBtn.classList.add('armed'); clearBtn.textContent = 'Click again to clear'; return; }
  clearTimeout(clearArmed); clearArmed = 0; clearBtn.classList.remove('armed'); clearBtn.textContent = 'Clear all';
  clearScene(); changed();
};
function clearScene() {
  [...cables].forEach(removeCable); [...modules].forEach(removeModule); [...plates].forEach(removePlate);
  Object.keys(counters).forEach(k => counters[k] = 0);
  select(null);
}

/* =====================================================================
   UI STATE
   ===================================================================== */
const statusEl = document.getElementById('status'), emptyEl = document.getElementById('empty');
function changed() {
  const links = modules.reduce((n, m) => n + m.ports.filter(p => p.plug && p.plug.state === 'connected').length, 0);
  statusEl.innerHTML =
    `<span class="chip">${plates.length} plate${plates.length === 1 ? '' : 's'}</span>` +
    `<span class="chip">${modules.length} module${modules.length === 1 ? '' : 's'}</span>` +
    `<span class="chip">${cables.length} connector${cables.length === 1 ? '' : 's'}</span>` +
    `<span class="chip ${links ? 'on' : ''}"><i></i>${links} plugged in</span>`;
  emptyEl.classList.toggle('hide', plates.length > 0 || !!sideDrag || !!drag || (palOpen && !DESK));
  if (startHint !== !plates.length) { startHint = !plates.length; libEl.querySelector('[data-id="plate"]')?.classList.toggle('start', startHint && !tutPart); }
  partsFab.classList.toggle('hint', startHint && !palOpen && !DEMO);   // (on desktop the button only shows while the sidebar is hidden)
  renderInspector(); renderCode(); kick();
  if (!DEMO) opts.onChange?.();
}
const toastEl = document.getElementById('toast'); let toastT;
function toast(s) { toastEl.textContent = s; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200); }
let actx, muted = false;
// the one audio context for every sound; created on first use, and born paused while muted (demo off screen)
function audio() {
  if (!actx) { actx = new AudioContext(); if (muted) actx.suspend(); }
  return actx;
}
function click(pitch = 1) {
  try {
    audio();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = 'square'; o.frequency.setValueAtTime(1800 * pitch, t); o.frequency.exponentialRampToValueAtTime(400 * pitch, t + 0.05);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.08);
  } catch {}
}

/* =====================================================================
   CONTROLS + LOOP
   ===================================================================== */
/* =====================================================================
   CODE: a small Python-style language that runs on a board.
   Lexer -> parser -> tree of statements -> generator-based interpreter.
   Every statement is a step, so a program can sleep, show its current
   line, and an endless loop never freezes the page.
   Supported: if/elif/else, while, for…in, break/continue/pass, variables,
   + - * / // % **, comparisons, and/or/not, lists, text, and the commands
   in pyApi(). Not supported (friendly error): def, import, f-strings.
   ===================================================================== */
class PyErr extends Error { constructor(msg, line) { super(msg); this.line = line; } }
const PY_KW = new Set(['if', 'elif', 'else', 'while', 'for', 'in', 'and', 'or', 'not', 'True', 'False', 'None', 'break', 'continue', 'pass',
  'def', 'return', 'import', 'from', 'class', 'global', 'lambda', 'with', 'try', 'except', 'is']);
function pyLex(src) {
  const toks = [], lines = src.replace(/\r/g, '').replace(/\t/g, '    ').split('\n'), indents = [0];
  let depth = 0;
  const push = (t, v, line) => toks.push({ t, v, line });
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li], line = li + 1; let i = 0;
    if (depth === 0) {
      while (raw[i] === ' ') i++;
      if (i === raw.length || raw[i] === '#') continue;
      const top = indents[indents.length - 1];
      if (i > top) { indents.push(i); push('INDENT', null, line); }
      else if (i < top) {
        while (i < indents[indents.length - 1]) { indents.pop(); push('DEDENT', null, line); }
        if (i !== indents[indents.length - 1]) throw new PyErr("The spaces at the start of this line don't line up with the lines above it.", line);
      }
    }
    while (i < raw.length) {
      const c = raw[i], rest = raw.slice(i); let m;
      if (c === ' ') { i++; continue; }
      if (c === '#') break;
      if ((m = rest.match(/^(\d+\.\d*|\.\d+|\d+)/))) { push('num', parseFloat(m[1]), line); i += m[1].length; continue; }
      if (c === '"' || c === "'") {
        let j = i + 1, s = '';
        while (j < raw.length && raw[j] !== c) {
          if (raw[j] === '\\' && j + 1 < raw.length) { const e = raw[++j]; s += e === 'n' ? '\n' : e === 't' ? '\t' : e; } else s += raw[j];
          j++;
        }
        if (j >= raw.length) throw new PyErr(`This text is missing its closing quote mark ${c}`, line);
        push('str', s, line); i = j + 1; continue;
      }
      if ((m = rest.match(/^[A-Za-z_]\w*/))) {
        const w = m[0];
        if ((w === 'f' || w === 'F') && (raw[i + 1] === '"' || raw[i + 1] === "'")) throw new PyErr('f-strings aren\'t supported yet. Use commas instead, like: print("Temp:", t)', line);
        push(PY_KW.has(w) ? 'kw' : 'name', w, line); i += w.length; continue;
      }
      if ((m = rest.match(/^(\*\*|\/\/|==|!=|<=|>=|\+=|-=|\*=|\/=|[-+*\/%<>=()\[\],:.])/))) {
        const o = m[1];
        if (o === '(' || o === '[') depth++;
        if (o === ')' || o === ']') depth = Math.max(0, depth - 1);
        push('op', o, line); i += o.length; continue;
      }
      throw new PyErr(`I don't understand the symbol "${c}" here.`, line);
    }
    const last = toks[toks.length - 1];
    if (depth === 0 && last && last.t !== 'NL' && last.t !== 'INDENT' && last.t !== 'DEDENT') push('NL', null, line);
  }
  while (indents.length > 1) { indents.pop(); push('DEDENT', null, lines.length); }
  push('EOF', null, lines.length);
  return toks;
}
function pyParse(src) {
  const T = pyLex(src); let p = 0;
  const peek = () => T[p], next = () => T[p++];
  const is = (t, v) => T[p].t === t && (v === undefined || T[p].v === v);
  const eat = (t, v) => is(t, v) ? T[p++] : null;
  const want = (t, v, msg) => { if (is(t, v)) return T[p++]; throw new PyErr(msg, T[p].line); };
  const desc = tk => tk.t === 'NL' ? 'the end of the line' : tk.t === 'EOF' ? 'the end of the code' : tk.t === 'INDENT' ? 'extra spaces' : tk.t === 'str' ? 'this text' : `"${tk.v}"`;

  function block(kind) {
    if (is('op', '=')) throw new PyErr('To compare, use == (two equals signs). One = stores a value.', peek().line);
    want('op', ':', `Add a colon ":" at the end of the ${kind} line.`);
    if (!eat('NL')) return [simple()];                   // one-liner: if x: led.off()
    if (!eat('INDENT')) throw new PyErr(`The lines inside this ${kind} need to be indented. Start them with 4 spaces.`, peek().line);
    const body = [];
    while (!eat('DEDENT')) { if (is('EOF')) break; body.push(stmt()); }
    return body;
  }
  function stmt() {
    const tk = peek(), line = tk.line;
    if (tk.t === 'INDENT') throw new PyErr('This line has extra spaces at the start. Line it up with the line above.', line);
    if (tk.t === 'kw') switch (tk.v) {
      case 'if': {
        next(); const branches = [[expr(), block('if')]]; let other = null;
        while (is('kw', 'elif')) { next(); branches.push([expr(), block('elif')]); }
        if (eat('kw', 'else')) other = block('else');
        return { k: 'if', line, branches, other };
      }
      case 'while': { next(); const cond = expr(); return { k: 'while', line, cond, body: block('while') }; }
      case 'for': {
        next(); const v = want('name', undefined, 'Write a name after "for", like: for i in range(5):').v;
        want('kw', 'in', 'Write "in" after the name, like: for i in range(5):');
        const it = expr(); return { k: 'for', line, v, it, body: block('for') };
      }
      case 'elif': case 'else': throw new PyErr(`"${tk.v}" needs an "if" above it, starting at the same spaces.`, line);
      case 'def': case 'return': case 'import': case 'from': case 'class': case 'global': case 'lambda': case 'with': case 'try': case 'except':
        throw new PyErr(`"${tk.v}" isn't supported in StemGrid yet.`, line);
    }
    return simple();
  }
  function simple() {
    const line = peek().line; let s;
    if (eat('kw', 'pass')) s = { k: 'pass', line };
    else if (eat('kw', 'break')) s = { k: 'break', line };
    else if (eat('kw', 'continue')) s = { k: 'continue', line };
    else {
      const e = expr(), op = ['=', '+=', '-=', '*=', '/='].find(o => is('op', o));
      if (op) {
        next();
        if (e.k !== 'name' && e.k !== 'index') throw new PyErr('You can only store a value in a name, like: count = 0', line);
        s = { k: 'set', line, target: e, op, val: expr() };
      } else s = { k: 'expr', line, e };
    }
    if (!eat('NL') && !is('EOF') && !is('DEDENT')) {
      if (is('op', ':')) throw new PyErr('This line has a ":" it doesn\'t need, or it is missing "if", "while" or "for" at the start.', peek().line);
      throw new PyErr(`I didn't expect ${desc(peek())} here. Is a comma or bracket missing?`, peek().line);
    }
    return s;
  }
  const expr = () => orE();
  function orE() { let a = andE(); while (is('kw', 'or')) { const line = next().line; a = { k: 'or', line, a, b: andE() }; } return a; }
  function andE() { let a = notE(); while (is('kw', 'and')) { const line = next().line; a = { k: 'and', line, a, b: notE() }; } return a; }
  function notE() { if (is('kw', 'not')) { const line = next().line; return { k: 'not', line, a: notE() }; } return cmpE(); }
  const CMP = ['==', '!=', '<', '>', '<=', '>='];
  function cmpE() {
    const a = addE(), ops = [], rest = [];
    for (;;) {
      if (is('op') && CMP.includes(peek().v)) ops.push(next().v);
      else if (is('kw', 'in')) { next(); ops.push('in'); }
      else if (is('kw', 'not') && T[p + 1].t === 'kw' && T[p + 1].v === 'in') { p += 2; ops.push('not in'); }
      else if (is('kw', 'is')) throw new PyErr('Use == instead of "is" to compare.', peek().line);
      else break;
      rest.push(addE());
    }
    return ops.length ? { k: 'cmp', line: a.line, a, ops, rest } : a;
  }
  function addE() { let a = mulE(); while (is('op', '+') || is('op', '-')) { const o = next(); a = { k: 'bin', line: o.line, op: o.v, a, b: mulE() }; } return a; }
  function mulE() { let a = unE(); while (['*', '/', '//', '%'].some(o => is('op', o))) { const o = next(); a = { k: 'bin', line: o.line, op: o.v, a, b: unE() }; } return a; }
  function unE() { if (is('op', '-') || is('op', '+')) { const o = next(); return { k: 'neg', line: o.line, neg: o.v === '-', a: unE() }; } return powE(); }
  function powE() { const a = postE(); if (is('op', '**')) { const o = next(); return { k: 'bin', line: o.line, op: '**', a, b: unE() }; } return a; }
  function postE() {
    let a = atom();
    for (;;) {
      if (is('op', '(')) {
        const line = next().line, args = [];
        if (!is('op', ')')) do {
          if (is('op', ')')) break;
          args.push(expr());
          if (is('op', '=')) throw new PyErr('Named settings like times=3 aren\'t supported. Just give the value, like: led.blink("red", 3)', line);
        } while (eat('op', ','));
        want('op', ')', 'This "(" is missing its closing ")".');
        a = { k: 'call', line, f: a, args };
      } else if (is('op', '.')) { next(); a = { k: 'attr', line: a.line, o: a, n: want('name', undefined, 'Write a name after the dot, like: led.color').v }; }
      else if (is('op', '[')) { const line = next().line, i = expr(); want('op', ']', 'This "[" is missing its closing "]".'); a = { k: 'index', line, o: a, i }; }
      else return a;
    }
  }
  function atom() {
    const tk = next();
    if (tk.t === 'num' || tk.t === 'str') return { k: 'lit', line: tk.line, v: tk.v };
    if (tk.t === 'name') return { k: 'name', line: tk.line, n: tk.v };
    if (tk.t === 'kw' && ['True', 'False', 'None'].includes(tk.v)) return { k: 'lit', line: tk.line, v: tk.v === 'True' ? true : tk.v === 'False' ? false : null };
    if (tk.t === 'op' && tk.v === '(') { const e = expr(); want('op', ')', 'This "(" is missing its closing ")".'); return e; }
    if (tk.t === 'op' && tk.v === '[') {
      const items = [];
      if (!is('op', ']')) do { if (is('op', ']')) break; items.push(expr()); } while (eat('op', ','));
      want('op', ']', 'This "[" is missing its closing "]".');
      return { k: 'list', line: tk.line, items };
    }
    if (tk.t === 'NL' || tk.t === 'EOF') throw new PyErr('This line stops too early. Something is missing at the end.', tk.line);
    throw new PyErr(`I didn't expect ${desc(tk)} here.`, tk.line);
  }
  const body = [];
  while (!is('EOF')) { if (eat('NL') || eat('DEDENT')) continue; body.push(stmt()); }
  return body;
}

// ---- values ----
const BRK = { brk: 1 }, CNT = { cnt: 1 };
const pyType = v => v === null ? 'None (nothing)' : typeof v === 'string' ? 'text' : typeof v === 'boolean' ? 'True/False' : typeof v === 'number' ? 'a number' : Array.isArray(v) ? 'a list' : 'a command';
const truthy = v => !(v === null || v === false || v === 0 || v === '' || (Array.isArray(v) && !v.length));
function pyStr(v) {
  if (v === null) return 'None'; if (v === true) return 'True'; if (v === false) return 'False';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  if (Array.isArray(v)) return '[' + v.map(x => typeof x === 'string' ? `'${x}'` : pyStr(x)).join(', ') + ']';
  if (typeof v === 'function' || (v && typeof v === 'object')) return '<command>';
  return String(v);
}
const pyEq = (a, b) => Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, i) => pyEq(x, b[i]))
  : a === b || (typeof a !== 'string' && typeof b !== 'string' && a != null && b != null && !Array.isArray(a) && !Array.isArray(b) && +a === +b);
function pyBin(op, a, b) {
  if (typeof a === 'boolean') a = +a; if (typeof b === 'boolean') b = +b;
  const num = typeof a === 'number' && typeof b === 'number', zero = () => { throw new PyErr("You can't divide by zero."); };
  switch (op) {
    case '+':
      if (num || (typeof a === 'string' && typeof b === 'string')) return a + b;
      if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
      if (typeof a === 'string' || typeof b === 'string') throw new PyErr('You can\'t add text and a number together. Turn the number into text with str(), like: "Count: " + str(count)');
      break;
    case '-': if (num) return a - b; break;
    case '*':
      if (num) return a * b;
      if (typeof a === 'string' && typeof b === 'number') return a.repeat(Math.max(0, b | 0));
      if (typeof b === 'string' && typeof a === 'number') return b.repeat(Math.max(0, a | 0));
      break;
    case '/': if (num) return b === 0 ? zero() : a / b; break;
    case '//': if (num) return b === 0 ? zero() : Math.floor(a / b); break;
    case '%': if (num) return b === 0 ? zero() : ((a % b) + b) % b; break;
    case '**': if (num) return a ** b; break;
  }
  throw new PyErr(`You can't use ${op} with ${pyType(a)} and ${pyType(b)}.`);
}
function pyCmp(op, a, b) {
  if (op === '==') return pyEq(a, b);
  if (op === '!=') return !pyEq(a, b);
  if (op === 'in' || op === 'not in') {
    let r;
    if (typeof b === 'string' && typeof a === 'string') r = b.includes(a);
    else if (Array.isArray(b)) r = b.some(x => pyEq(x, a));
    else throw new PyErr('"in" needs text or a list on its right, like: if key in ["1", "2"]:');
    return op === 'in' ? r : !r;
  }
  const isN = v => typeof v === 'number' || typeof v === 'boolean';
  if (!((isN(a) && isN(b)) || (typeof a === 'string' && typeof b === 'string')))
    throw new PyErr(`You can't compare ${pyType(a)} with ${pyType(b)} using ${op}.` + (a === null || b === null ? ' Check it isn\'t None first, like: if key:' : ''));
  return op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function didYouMean(w, list) {
  let best = null, bd = w.length <= 2 ? 1 : w.length < 7 ? 2 : 3;          // swapped letters count as 2
  for (const c of list) { const d = lev(w.toLowerCase(), c.toLowerCase()); if (d <= bd && (best === null || d < bd)) { bd = d; best = c; } }
  return best;
}

// ---- interpreter (generators: `yield` = one step; `yield {sleep}` = wait) ----
function* pyEval(n, P) {
  switch (n.k) {
    case 'lit': return n.v;
    case 'list': { const out = []; for (const it of n.items) out.push(yield* pyEval(it, P)); return out; }
    case 'name': {
      if (Object.hasOwn(P.vars, n.n)) return P.vars[n.n];
      if (Object.hasOwn(P.api, n.n)) return P.api[n.n];
      const g = didYouMean(n.n, [...Object.keys(P.vars), ...Object.keys(P.api), 'True', 'False', 'None']);
      throw new PyErr(g ? `I don't know "${n.n}". Did you mean "${g}"?` : `I don't know "${n.n}" yet. If it's your own value, give it one first, like: ${n.n} = 0`, n.line);
    }
    case 'attr': {
      const o = yield* pyEval(n.o, P);
      if (o && typeof o === 'object' && !Array.isArray(o) && Object.hasOwn(o, n.n) && !n.n.startsWith('_')) return o[n.n];
      if (o && o.__name) {
        const g = didYouMean(n.n, Object.keys(o).filter(k => !k.startsWith('_')));
        throw new PyErr(`${o.__name} doesn't have "${n.n}".${g ? ` Did you mean ${o.__name}.${g}?` : ''}`, n.line);
      }
      throw new PyErr(`${pyType(o)} doesn't have "${n.n}".`, n.line);
    }
    case 'index': {
      const o = yield* pyEval(n.o, P), i = yield* pyEval(n.i, P);
      if ((Array.isArray(o) || typeof o === 'string') && Number.isInteger(i)) {
        const j = i < 0 ? o.length + i : i;
        if (j < 0 || j >= o.length) throw new PyErr(`Position ${i} is outside (there are ${o.length} items, counted from 0).`, n.line);
        return o[j];
      }
      throw new PyErr('Use a whole number inside [ ] to pick an item from a list or text.', n.line);
    }
    case 'neg': {
      const v = yield* pyEval(n.a, P);
      if (typeof v !== 'number' && typeof v !== 'boolean') throw new PyErr(`You can't put a minus sign in front of ${pyType(v)}.`, n.line);
      return n.neg ? -v : +v;
    }
    case 'not': return !truthy(yield* pyEval(n.a, P));
    case 'and': { const a = yield* pyEval(n.a, P); return truthy(a) ? yield* pyEval(n.b, P) : a; }
    case 'or': { const a = yield* pyEval(n.a, P); return truthy(a) ? a : yield* pyEval(n.b, P); }
    case 'bin': { const a = yield* pyEval(n.a, P), b = yield* pyEval(n.b, P); try { return pyBin(n.op, a, b); } catch (e) { e.line ??= n.line; throw e; } }
    case 'cmp': {
      let a = yield* pyEval(n.a, P);
      for (let i = 0; i < n.ops.length; i++) {
        const b = yield* pyEval(n.rest[i], P); let r;
        try { r = pyCmp(n.ops[i], a, b); } catch (e) { e.line ??= n.line; throw e; }
        if (!r) return false; a = b;
      }
      return true;
    }
    case 'call': {
      const f = yield* pyEval(n.f, P);
      if (typeof f !== 'function') throw new PyErr(`${pyType(f)} can't be used like a command with ( ).`, n.line);
      const args = []; for (const a of n.args) args.push(yield* pyEval(a, P));
      let r; try { r = f(...args); } catch (e) { if (e instanceof PyErr) e.line ??= n.line; throw e; }
      if (r && r.__wait) return yield* r.__wait;              // commands that take time (sleep, blink)
      return r === undefined ? null : r;
    }
  }
}
function* pyExec(body, P) {
  for (const s of body) {
    P.line = s.line; yield null;
    switch (s.k) {
      case 'expr': yield* pyEval(s.e, P); break;
      case 'pass': break;
      case 'break': throw BRK;
      case 'continue': throw CNT;
      case 'set': {
        let v = yield* pyEval(s.val, P);
        if (s.op !== '=') v = pyBin(s.op[0], yield* pyEval(s.target, P), v);
        if (s.target.k === 'name') {
          if (Object.hasOwn(P.api, s.target.n)) throw new PyErr(`"${s.target.n}" is a built-in command. Pick a different name for your value.`, s.line);
          P.vars[s.target.n] = v;
        } else {
          const o = yield* pyEval(s.target.o, P), i = yield* pyEval(s.target.i, P);
          if (!Array.isArray(o) || !Number.isInteger(i)) throw new PyErr('You can only change items in a list, like: nums[0] = 5', s.line);
          const j = i < 0 ? o.length + i : i;
          if (j < 0 || j >= o.length) throw new PyErr(`Position ${i} is outside the list.`, s.line);
          o[j] = v;
        }
        break;
      }
      case 'if': {
        let done = false;
        for (const [c, b] of s.branches) if (truthy(yield* pyEval(c, P))) { yield* pyExec(b, P); done = true; break; }
        if (!done && s.other) yield* pyExec(s.other, P);
        break;
      }
      case 'while':
        while (truthy(yield* pyEval(s.cond, P))) {
          try { yield* pyExec(s.body, P); } catch (e) { if (e === BRK) break; if (e !== CNT) throw e; }
          P.line = s.line; yield null;
        }
        break;
      case 'for': {
        const it = yield* pyEval(s.it, P);
        const items = Array.isArray(it) ? it.slice() : typeof it === 'string' ? [...it] : null;
        if (!items) throw new PyErr('"for" needs something to go through, like range(5) or a list.', s.line);
        for (const v of items) {
          P.vars[s.v] = v;
          try { yield* pyExec(s.body, P); } catch (e) { if (e === BRK) break; if (e !== CNT) throw e; }
        }
        break;
      }
    }
  }
}

// ---- the commands a program can use, bound to its board ----
const COLOURS = { red: [255, 0, 0], green: [0, 210, 70], blue: [0, 90, 255], yellow: [255, 200, 0], orange: [255, 110, 0],
  purple: [160, 40, 255], pink: [255, 80, 170], cyan: [0, 220, 255], white: [255, 255, 255] };
const colourName = c => Object.entries(COLOURS).find(([, v]) => v.every((x, i) => x === c[i]))?.[0] ?? `(${c.map(Math.round).join(', ')})`;
function pyApi(board, P) {
  const need = kind => {
    const l = linkedTo(board).filter(m => m.kind === kind);
    if (!l.length) throw new PyErr(`This needs a ${MODULES[kind].name} wired to ${board.name}. Plug one in with a Zap connector.`);
    return l;
  };
  const num = (v, what) => { if (typeof v !== 'number' && typeof v !== 'boolean') throw new PyErr(`${what} needs a number here, not ${pyType(v)}.`); return +v; };
  const colour = args => {
    if (args.length === 1 && typeof args[0] === 'string') {
      const c = COLOURS[args[0].toLowerCase().trim()];
      if (!c) throw new PyErr(`I don't know the colour "${args[0]}". Try ${Object.keys(COLOURS).join(', ')}, or three numbers like led.color(255, 0, 100).`);
      return c;
    }
    if (args.length === 3) return args.map(v => THREE.MathUtils.clamp(num(v, 'led.color'), 0, 255));
    throw new PyErr('Give led.color a colour name like "red", or three numbers (red, green, blue) from 0 to 255.');
  };
  // led = the RGB LED on the board itself; an add-on RGB LED module, if wired, follows it
  const setLed = rgb => { board.state.rgb = rgb.slice(); for (const m of linkedTo(board)) if (m.kind === 'rgb') m.state.rgb = rgb.slice(); kick(); };
  const btn = n => { n = num(n, 'button'); if (n !== 1 && n !== 2) throw new PyErr('The Dual push button has button 1 and button 2.'); return n - 1; };
  // events since this program last asked (presses, remote keys, cards)
  const fresh = (m, key, keep) => {
    const s = m.state, seen = P.seen[key] ?? s.seq;
    P.seen[key] = s.seq;
    return s.ev.filter(e => e.seq > seen && keep(e));
  };
  const wait = s => ({ __wait: (function* () { yield { sleep: s }; })() });
  const led = { __name: 'led',
    color: (...a) => setLed(colour(a)), colour: (...a) => setLed(colour(a)),
    on: () => setLed([255, 255, 255]), off: () => setLed([0, 0, 0]),
    blink: (c = 'red', times = 1) => {
      const rgb = colour([c]), n = Math.max(1, num(times, 'led.blink') | 0);
      return { __wait: (function* () { for (let i = 0; i < n; i++) { setLed(rgb); yield { sleep: 0.3 }; setLed([0, 0, 0]); yield { sleep: 0.3 }; } })() };
    },
  };
  // oled: a 128 × 64 display list. Text uses a cursor and a size (1 = small, like before); print() moves to the next line
  // and scrolls up when it runs off the bottom. Shapes are drawn in screen pixels: x 0–127 from the left, y 0–63 from the top.
  const cur = P.cur;
  const lineH = () => oledFont(cur.size) + 2;
  const draw = (fn, args, n, op) => {
    need('oled');
    if (args.length !== n) throw new PyErr(`oled.${fn} needs ${n} numbers, like oled.${fn}(${OLED_HINT[fn]}).`);
    const v = args.map(x => Math.round(num(x, 'oled.' + fn)));
    P.screen.push(op(...v)); if (P.screen.length > 400) P.screen.shift();
  };
  const oled = { __name: 'oled',
    print: (...a) => {
      need('oled');
      while (cur.y > 0 && cur.y + lineH() > OLED_H + 2) {             // off the bottom: scroll everything up a line
        const d = lineH(); cur.y -= d;
        P.screen.forEach(o => { o.y -= d; if (o.y2 !== undefined) o.y2 -= d; });
        P.screen = P.screen.filter(o => Math.max(o.y, o.y2 ?? o.y) + (o.h ?? o.r ?? oledFont(o.size ?? 1)) >= 0);
      }
      P.screen.push({ t: 'text', s: a.map(pyStr).join(' '), x: cur.x, y: cur.y, size: cur.size });
      if (P.screen.length > 400) P.screen.shift();
      cur.y += lineH();
    },
    clear: () => { need('oled'); P.screen.length = 0; cur.x = 0; cur.y = 0; },
    set_text_size: (...a) => {
      need('oled');
      const n = a.length === 1 ? num(a[0], 'oled.set_text_size') : NaN;
      if (!Number.isInteger(n) || n < 1 || n > 6) throw new PyErr('oled.set_text_size needs a whole number from 1 (small) to 6 (huge), like oled.set_text_size(2).');
      cur.size = n;
    },
    set_cursor: (...a) => {
      need('oled');
      if (a.length !== 2) throw new PyErr('oled.set_cursor needs x and y, like oled.set_cursor(0, 20). x goes 0 to 127, y goes 0 to 63.');
      cur.x = Math.round(num(a[0], 'oled.set_cursor')); cur.y = Math.round(num(a[1], 'oled.set_cursor'));
    },
    pixel: (...a) => draw('pixel', a, 2, (x, y) => ({ t: 'pixel', x, y })),
    line: (...a) => draw('line', a, 4, (x, y, x2, y2) => ({ t: 'line', x, y, x2, y2 })),
    rect: (...a) => draw('rect', a, 4, (x, y, w, h) => ({ t: 'rect', x, y, w, h })),
    fill_rect: (...a) => draw('fill_rect', a, 4, (x, y, w, h) => ({ t: 'fill_rect', x, y, w, h })),
    circle: (...a) => draw('circle', a, 3, (x, y, r) => ({ t: 'circle', x, y, r })),
    fill_circle: (...a) => draw('fill_circle', a, 3, (x, y, r) => ({ t: 'fill_circle', x, y, r })),
  };
  // servo: servo.angle(90) turns every servo on the board (like Arduino's write: it returns at once, the arm then travels).
  // servo.angle(90, 2) picks one, counted by port. servo.angle() gives back the last angle it was told.
  const servo = { __name: 'servo',
    angle: (...a) => {
      const l = need('servo');
      if (!a.length) return Math.round(l[0].state.target);
      if (a.length > 2) throw new PyErr('servo.angle needs one angle from 0 to 180, like servo.angle(90).');
      let d = num(a[0], 'servo.angle'), pick = l;
      if (!Number.isFinite(d)) throw new PyErr('servo.angle needs a real number of degrees, from 0 to 180.');
      if (a.length === 2) {
        const n = num(a[1], 'servo.angle');
        if (!Number.isInteger(n) || n < 1 || n > l.length) throw new PyErr(l.length === 1
          ? 'Only one servo is wired, so leave out the second number: servo.angle(90).'
          : `Pick servo 1 to ${l.length}, like servo.angle(90, 2). They're counted by port, lowest port first.`);
        pick = [l[n - 1]];
      }
      if ((d < 0 || d > 180) && !P.seen.svWarn) {
        P.seen.svWarn = true;
        codeLog(board, `servo.angle(${pyStr(a[0])}): a servo only turns from 0 to 180°, so it stops at ${d < 0 ? 0 : 180}°.`);
      }
      d = svClamp(d); pick.forEach(m => { m.state.target = d; }); kick();
    },
  };
  // buzzer: tone(Hz) keeps sounding until off(); tone(Hz, seconds), note("C4", seconds) and beep() play, then carry on.
  // Every buzzer wired to the board plays the same sound.
  const setTone = f => { need('buzzer').forEach(m => { m.state.code = f; }); kick(); };
  const hz = (v, fn) => {
    const f = num(v, fn);
    if (!Number.isFinite(f) || f < 31 || f > 20000) throw new PyErr(`${fn} plays pitches from 31 to 20000 Hz. Try ${fn}(440), the note A.`);
    return f;
  };
  const secs = (v, fn) => { const d = num(v, fn); if (!Number.isFinite(d) || d < 0) throw new PyErr(`${fn} needs a number of seconds, 0 or more.`); return d; };
  const sound = (f, d, gap = 0) => ({ __wait: (function* () { setTone(f); yield { sleep: d * (1 - gap) }; setTone(0); if (gap) yield { sleep: d * gap }; })() });
  const buzzer = { __name: 'buzzer',
    tone: (...a) => {
      need('buzzer');
      if (!a.length || a.length > 2) throw new PyErr('buzzer.tone needs a pitch in Hz, like buzzer.tone(440). Add seconds to stop by itself: buzzer.tone(440, 0.5).');
      const f = hz(a[0], 'buzzer.tone');
      if (a.length === 1) return setTone(f);
      return sound(f, secs(a[1], 'buzzer.tone'));
    },
    note: (...a) => {
      need('buzzer');
      if (!a.length || a.length > 2 || typeof a[0] !== 'string') throw new PyErr('buzzer.note needs a note in quotes and how long, like buzzer.note("C4", 0.5).');
      const d = a.length > 1 ? secs(a[1], 'buzzer.note') : 0.5;
      if (/^\s*(r|rest)\s*$/i.test(a[0])) return sound(0, d);
      const f = noteHz(a[0]);
      if (!f) throw new PyErr(`I don't know the note "${a[0]}". Use C D E F G A B, with # or b and an octave if you like: "C4", "F#5", "Bb3". "rest" is a pause.`);
      return sound(f, d, 0.1);                                    // a tiny gap, so two of the same note sound separate
    },
    beep: (...a) => { need('buzzer'); return sound(2000, a.length ? secs(a[0], 'buzzer.beep') : 0.1); },
    off: () => setTone(0),
  };
  const many = (a, what) => (a.length === 1 && Array.isArray(a[0]) ? a[0] : a).map(x => num(x, what));
  return {
    sleep: s => { s = num(s, 'sleep'); if (s < 0) throw new PyErr('sleep needs a number of seconds, 0 or more.'); return wait(s); },
    print: (...a) => { codeLog(board, a.map(pyStr).join(' ')); },
    button: n => { const i = btn(n); return need('buttons').some(m => m.state.down[i]); },
    was_pressed: n => { const i = btn(n); return need('buttons').map(m => fresh(m, `b${i}:${m.id}`, e => e.type === 'press' && e.btn === i).length > 0).some(Boolean); },
    light: () => reading(need('light')[0], 'light').value,
    knob: () => reading(need('pot')[0]).value,
    distance: () => Math.round(need('ultrasonic')[0].state.distance),
    temperature: () => reading(need('dht11')[0], 'temp').value,
    humidity: () => reading(need('dht11')[0], 'hum').value,
    remote: () => { const e = fresh(need('ir')[0], 'ir', e => e.type === 'ir').pop(); return e ? e.key : null; },
    card: () => { const e = fresh(need('rfid')[0], 'rf', e => e.type === 'tag').pop(); return e ? e.uid : null; },
    led, oled, servo, buzzer,
    range: (a, b, c = 1) => {
      if (b === undefined) { b = a; a = 0; }
      a = num(a, 'range'); b = num(b, 'range'); c = num(c, 'range');
      if (!c) throw new PyErr('range() can\'t count in steps of 0.');
      const out = []; for (let i = a; c > 0 ? i < b : i > b; i += c) { out.push(i); if (out.length > 100000) throw new PyErr('That range is too big.'); }
      return out;
    },
    str: v => pyStr(v),
    int: v => {
      if (typeof v === 'string') { const n = Number(v.trim()); if (v.trim() === '' || !Number.isFinite(n)) throw new PyErr(`int() can't turn "${v}" into a number.`); return Math.trunc(n); }
      return Math.trunc(num(v, 'int'));
    },
    float: v => { const n = Number(v); if (!Number.isFinite(n)) throw new PyErr(`float() can't turn ${pyStr(v)} into a number.`); return n; },
    round: (v, d = 0) => { const k = 10 ** num(d, 'round'); return Math.round(num(v, 'round') * k) / k; },
    abs: v => Math.abs(num(v, 'abs')),
    len: v => { if (typeof v === 'string' || Array.isArray(v)) return v.length; throw new PyErr('len() needs text or a list.'); },
    min: (...a) => Math.min(...many(a, 'min')), max: (...a) => Math.max(...many(a, 'max')),
    randint: (a, b) => { a = num(a, 'randint') | 0; b = num(b, 'randint') | 0; return a + Math.floor(Math.random() * (b - a + 1)); },
  };
}

// ---- running programs: one per board ----
const PY_BUDGET = 3000;                                   // steps per frame, so an endless loop never freezes the page
function runCode(board) {
  stopCode(board, true);
  board.out = []; board.codeErr = null;
  let ast;
  try { ast = pyParse(board.code); }
  catch (e) {
    if (!(e instanceof PyErr)) throw e;
    board.codeErr = { line: e.line, msg: e.message }; codeLog(board, `Line ${e.line}: ${e.message}`, true);
    renderCodeOut(); updateCodeUI(true); return;
  }
  const P = { state: 'run', vars: {}, seen: {}, screen: [], cur: { x: 0, y: 0, size: 1 }, line: 0, wake: 0 };
  P.api = pyApi(board, P); P.it = pyExec(ast, P);
  board.prog = P;
  codeLog(board, '▶ Running on ' + board.name, false, true);
  renderCodeOut(); updateCodeUI(true); renderInspector(); kick();
}
function stopCode(board, quiet) {
  if (!board.prog) return;
  board.prog = null; board.state.rgb = [0, 0, 0];
  for (const m of linkedTo(board)) { if (m.kind === 'rgb') m.state.rgb = [0, 0, 0]; if (m.kind === 'buzzer') m.state.code = 0; }
  if (!quiet) { codeLog(board, '■ Stopped', false, true); renderCodeOut(); }
  updateCodeUI(true); renderInspector(); kick();
}
function runPrograms() {
  const now = performance.now() / 1000;
  for (const b of modules) {
    const P = b.prog; if (!P || P.state !== 'run' || now < P.wake) continue;
    try {
      for (let n = PY_BUDGET; n > 0; n--) {
        const r = P.it.next();
        if (r.done) { P.state = 'done'; codeLog(b, '✓ Finished', false, true); break; }
        if (r.value && r.value.sleep != null) { P.wake = now + r.value.sleep; break; }
      }
    } catch (e) {
      if (e === BRK || e === CNT) e = new PyErr(`"${e === BRK ? 'break' : 'continue'}" only works inside a loop.`);
      if (!(e instanceof PyErr)) { console.error(e); e = new PyErr('Something went wrong inside the simulator: ' + e.message); }
      P.state = 'error'; b.codeErr = { line: e.line ?? P.line, msg: e.message };
      codeLog(b, `Line ${b.codeErr.line}: ${e.message}`, true);
    }
  }
  updateCodeUI();
}

// ---- the panel ----
const $ = id => document.getElementById(id);
const codePanel = $('codePanel'), codeFab = $('codeFab'), ceTa = $('ceTa'), cePre = $('cePre'), ceGut = $('ceGut'), ceLine = $('ceLine');
const CODE_EXAMPLES = [
  { name: 'Button colours', needs: 'Dual push button', code:
`# Button 1 blinks the board's light red, button 2 blinks it blue
while True:
    if button(1):
        led.blink("red")
    elif button(2):
        led.blink("blue")
    else:
        led.off()
` },
  { name: 'Night light', needs: 'Light sensor', code:
`# The light turns on by itself when the room gets dark
while True:
    level = light()
    if level < 30:
        led.color("yellow")
    else:
        led.off()
    sleep(0.2)
` },
  { name: 'Parking sensor', needs: 'Ultrasonic sensor', code:
`# Green when far away, orange when close, red when too close
while True:
    d = distance()
    if d < 10:
        led.color("red")
    elif d < 30:
        led.color("orange")
    else:
        led.color("green")
    sleep(0.2)
` },
  { name: 'Thermometer', needs: 'DHT11 + OLED display', code:
`# Show the temperature and humidity on the screen
while True:
    oled.clear()
    oled.print("Temperature:", temperature(), "C")
    oled.print("Humidity:", humidity(), "%")
    if temperature() > 30:
        oled.print("It's hot!")
    sleep(1)
` },
  { name: 'Click counter', needs: 'Dual push button + OLED display', code:
`# Button 1 counts up, button 2 resets
count = 0
oled.print("Clicks: 0")
while True:
    if was_pressed(1):
        count = count + 1
        oled.clear()
        oled.print("Clicks:", count)
    if was_pressed(2):
        count = 0
        oled.clear()
        oled.print("Reset!")
    sleep(0.05)
` },
  { name: 'Remote control light', needs: 'IR receiver', code:
`# Press 1, 2 or 3 on the remote to pick a colour, 0 for off
while True:
    key = remote()
    if key == "1":
        led.color("red")
    elif key == "2":
        led.color("green")
    elif key == "3":
        led.color("blue")
    elif key == "0":
        led.off()
    sleep(0.1)
` },
  { name: 'Card check', needs: 'RFID reader', code:
`# Only the white card gets a green light
while True:
    tag = card()
    if tag == "A3 5F 12 9C":
        print("Welcome!")
        led.color("green")
        sleep(2)
        led.off()
    elif tag:
        print("Unknown card:", tag)
        led.blink("red", 3)
    sleep(0.1)
` },
  { name: 'Colour knob', needs: 'Potentiometer', code:
`# Turn the knob to fade from blue to red
while True:
    k = knob()
    red = k * 255 / 100
    led.color(red, 0, 255 - red)
    sleep(0.05)
` },
  { name: 'Servo sweep', needs: 'Servo motor', code:
`# Swing the arm from 0 to 180 degrees and back
while True:
    for a in range(0, 181, 5):
        servo.angle(a)
        sleep(0.03)
    for a in range(180, -1, -5):
        servo.angle(a)
        sleep(0.03)
` },
  { name: 'Knob steering', needs: 'Potentiometer + Servo motor', code:
`# Turn the knob to steer the servo arm (100 % = 180 degrees)
while True:
    servo.angle(knob() * 1.8)
    sleep(0.05)
` },
  { name: 'Smart bin lid', needs: 'Ultrasonic sensor + Servo motor', code:
`# The lid opens when your hand comes close
servo.angle(0)
while True:
    if distance() < 20:
        servo.angle(90)
        led.color("green")
        sleep(2)
    else:
        servo.angle(0)
        led.off()
    sleep(0.1)
` },
  { name: 'Door lock', needs: 'RFID reader + Servo motor', code:
`# The white card unlocks the door for 3 seconds
servo.angle(0)
while True:
    tag = card()
    if tag == "A3 5F 12 9C":
        print("Door open")
        led.color("green")
        servo.angle(90)
        sleep(3)
        servo.angle(0)
        led.off()
    elif tag:
        print("Locked out:", tag)
        led.blink("red", 3)
    sleep(0.1)
` },
  { name: 'Servo meter', needs: 'Potentiometer + Servo motor + OLED display', code:
`# The knob sets the angle and the OLED shows it big
while True:
    a = round(knob() * 1.8)
    servo.angle(a)
    oled.clear()
    oled.set_text_size(1)
    oled.print("Servo angle")
    oled.set_text_size(3)
    oled.set_cursor(30, 24)
    oled.print(a)
    sleep(0.1)
` },
  { name: 'Twinkle twinkle', needs: 'Buzzer', code:
`# Play a tune: each note has a name and a length in seconds
tune = ["C4", "C4", "G4", "G4", "A4", "A4", "G4"]
for n in tune:
    buzzer.note(n, 0.4)
buzzer.note("rest", 0.4)
for n in ["F4", "F4", "E4", "E4", "D4", "D4", "C4"]:
    buzzer.note(n, 0.4)
` },
  { name: 'Parking beeper', needs: 'Ultrasonic sensor + Buzzer', code:
`# Beeps get faster as you get closer, like a car
while True:
    d = distance()
    if d < 5:
        buzzer.tone(1760)
        sleep(0.1)
    elif d < 50:
        buzzer.tone(1760, 0.08)
        sleep(d / 50)
    else:
        buzzer.off()
        sleep(0.1)
` },
  { name: 'Doorbell', needs: 'Dual push button + Buzzer', code:
`# Press button 1 to ring the bell
while True:
    if was_pressed(1):
        led.color("yellow")
        buzzer.note("E5", 0.35)
        buzzer.note("C5", 0.6)
        led.off()
    sleep(0.05)
` },
  { name: 'Remote piano', needs: 'IR receiver + Buzzer', code:
`# Keys 1 to 8 on the remote play do re mi fa so la ti do
notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]
while True:
    key = remote()
    if key in ["1", "2", "3", "4", "5", "6", "7", "8"]:
        buzzer.note(notes[int(key) - 1], 0.3)
    sleep(0.02)
` },
  { name: 'Knob theremin', needs: 'Potentiometer + Buzzer', code:
`# Turn the knob to slide the pitch up and down. Button-free music!
while True:
    buzzer.tone(200 + knob() * 18)
    sleep(0.03)
` },
  { name: 'Heat alarm', needs: 'DHT11 + Buzzer + OLED display', code:
`# Shows the temperature, and sounds the alarm at 30 C or more
while True:
    t = temperature()
    oled.clear()
    oled.set_text_size(3)
    oled.set_cursor(10, 20)
    oled.print(t, "C")
    if t >= 30:
        led.color("red")
        buzzer.beep(0.15)
    else:
        led.off()
    sleep(0.5)
` },
];
// [snippet, module kind it needs (null = always), what it does]
const CODE_REF = [
  ['sleep(1)', null, 'Wait 1 second'], ['print("Hi")', null, 'Write in the Output box'],
  ['led.color("red")', null, 'Light the RGB LED on the board'], ['led.blink("blue")', null, 'Blink the board LED once (add a number for more)'], ['led.off()', null, 'Turn the board LED off'],
  ['button(1)', 'buttons', 'True while button 1 is held down'], ['was_pressed(1)', 'buttons', 'True once for each new press'],
  ['light()', 'light', 'Light level, 0 to 100'], ['knob()', 'pot', 'Knob position, 0 to 100'], ['distance()', 'ultrasonic', 'Distance in cm'],
  ['temperature()', 'dht11', 'Temperature in °C'], ['humidity()', 'dht11', 'Humidity in %'],
  ['remote()', 'ir', 'Last remote key ("1", "up", "ok"…) or None'], ['card()', 'rfid', 'ID of a tapped card, or None'],
  ['servo.angle(90)', 'servo', 'Turn the servo arm: 0 right, 90 back, 180 left'], ['servo.angle()', 'servo', 'The angle the servo was last told'],
  ['buzzer.beep()', 'buzzer', 'A short beep'], ['buzzer.note("C4", 0.5)', 'buzzer', 'Play a note for 0.5 seconds ("rest" is a pause)'],
  ['buzzer.tone(440)', 'buzzer', 'Keep playing 440 Hz until buzzer.off()'], ['buzzer.tone(440, 0.5)', 'buzzer', 'Play 440 Hz for 0.5 seconds'], ['buzzer.off()', 'buzzer', 'Stop the sound'],
  ['oled.print("Hi")', 'oled', 'Write a line on the OLED'], ['oled.clear()', 'oled', 'Clear the OLED'],
  ['oled.set_text_size(2)', 'oled', 'Text size: 1 small to 6 huge'], ['oled.set_cursor(0, 20)', 'oled', 'Where the next text goes: x 0–127, y 0–63'],
  ['oled.line(0, 0, 127, 63)', 'oled', 'Draw a line from (x1, y1) to (x2, y2)'], ['oled.rect(10, 10, 50, 30)', 'oled', 'Box outline: x, y, width, height'],
  ['oled.fill_rect(10, 10, 50, 30)', 'oled', 'Filled box: x, y, width, height'], ['oled.circle(64, 32, 20)', 'oled', 'Circle: centre x, centre y, radius'],
];
const ceEx = $('ceEx');
CODE_EXAMPLES.forEach((x, i) => ceEx.insertAdjacentHTML('beforeend', `<option value="${i}">${x.name} · ${x.needs}</option>`));
let codeOpen = false, codeBoard = null, codeUIKey = '';
const boardsOnTable = () => modules.filter(m => m.def.board);
function toggleCode(open = !codeOpen) {
  codeOpen = open;
  if (open && !DESK) setPal(false);                  // on a tablet the two would sit on top of each other
  codePanel.classList.toggle('hide', !open); codeFab.classList.toggle('on', open);
  document.body.classList.toggle('coding', open); renderInspector();
  // no focus in the landing-page demo: focusing inside the iframe scrolls the parent page to it
  if (open) { codeBoard = null; renderCode(); if (codeBoard && !DEMO) ceTa.focus(); }
}
function renderCode() {
  if (!codeOpen) return;
  const bs = boardsOnTable();
  if (!bs.includes(codeBoard)) codeBoard = (selected?.def?.board && selected) || bs[0] || null;
  $('ceEmpty').hidden = !!codeBoard; $('ceMain').hidden = !codeBoard;
  $('ceBoard').innerHTML = !codeBoard ? '' : bs.length === 1 ? `on ${codeBoard.name}`
    : `<select id="ceBoardSel">${bs.map(b => `<option value="${b.id}"${b === codeBoard ? ' selected' : ''}>${b.name}${b.prog?.state === 'run' ? ' ●' : ''}</option>`).join('')}</select>`;
  if (!codeBoard) return;
  codeBoard.code ??= CODE_EXAMPLES[0].code;
  if (ceTa.dataset.board !== String(codeBoard.id)) { ceTa.value = codeBoard.code; ceTa.dataset.board = codeBoard.id; ceTa.scrollTop = 0; paintCode(); renderCodeOut(); }
  const kinds = new Set(linkedTo(codeBoard).map(m => m.kind));
  $('ceRef').innerHTML = CODE_REF.map(([s, k, d], i) => {
    const on = !k || kinds.has(k);
    return `<button data-i="${i}" class="${on ? '' : 'off'}" title="${on ? d : `Wire a ${MODULES[k].name} to use this. ${d}`}">${s.replace(/</g, '&lt;')}</button>`;
  }).join('');
  updateCodeUI(true);
}
$('ceBoard').addEventListener('change', e => { codeBoard = modules.find(m => m.id === +e.target.value) || codeBoard; renderCode(); });
codeFab.onclick = () => toggleCode();
$('ceClose').onclick = () => toggleCode(false);
$('ceShowBoard').onclick = () => {
  qEl.value = ''; libCat = ''; renderCats(); renderLibrary(); if (!DESK) toggleCode(false); setPal(true, true);
  const el = libEl.querySelector('[data-id="quark"]'); if (!el) return;
  libEl.scrollTo({ top: el.offsetTop - (libEl.clientHeight - el.offsetHeight) / 2, behavior: 'smooth' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  toast(plates.length ? 'Drag the Quark C3 onto your base plate.' : 'Add a base plate first, then drag the Quark C3 onto it.');
};
$('ceRun').onclick = () => { if (codeBoard) { codeBoard.code = ceTa.value; runCode(codeBoard); } };
$('ceStop').onclick = () => { if (codeBoard) stopCode(codeBoard); };
ceEx.onchange = () => {
  const x = CODE_EXAMPLES[+ceEx.value]; ceEx.value = ''; if (!x || !codeBoard) return;
  ceTa.focus(); ceTa.select();
  if (!document.execCommand('insertText', false, x.code)) ceTa.value = x.code;   // keeps Ctrl+Z working
  codeBoard.code = ceTa.value; paintCode(); ceTa.scrollTop = 0; ceTa.setSelectionRange(0, 0);
  toast(`Example loaded: ${x.name}. It needs: ${x.needs}.`);
};
$('ceRef').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const [snip, k] = CODE_REF[+b.dataset.i];
  if (k && b.classList.contains('off')) toast(`Wire a ${MODULES[k].name} to the board to use ${snip.split('(')[0]}.`);
  ceTa.focus(); document.execCommand('insertText', false, snip);
});
// syntax colouring: the textarea is transparent, a <pre> behind it shows the colours
const HL = /(#.*$)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|\b(if|elif|else|while|for|in|and|or|not|True|False|None|break|continue|pass)\b|\b(\d+(?:\.\d+)?)\b|\b(led|oled|sleep|print|button|was_pressed|light|knob|distance|temperature|humidity|remote|card|servo|buzzer|range|str|int|float|round|abs|len|min|max|randint)\b/gm;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function paintCode() {
  const src = ceTa.value; let html = '', last = 0;
  src.replace(HL, (m, com, str, kw, nm, api, at) => {
    html += esc(src.slice(last, at));
    html += `<span class="${com ? 'c-com' : str ? 'c-str' : kw ? 'c-kw' : nm ? 'c-num' : 'c-api'}">${esc(m)}</span>`;
    last = at + m.length; return m;
  });
  cePre.innerHTML = html + esc(src.slice(last)) + '\n ';
  const n = src.split('\n').length; ceGut.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n') + '\n ';
  syncCodeScroll();
}
function syncCodeScroll() { cePre.scrollTop = ceGut.scrollTop = ceTa.scrollTop; cePre.scrollLeft = ceTa.scrollLeft; placeCodeLine(); }
function placeCodeLine() {
  const P = codeBoard?.prog, err = codeBoard?.codeErr;
  const line = err ? err.line : P?.state === 'run' ? P.line : 0;
  ceLine.style.display = line ? 'block' : 'none'; ceLine.classList.toggle('err', !!err);
  if (line) ceLine.style.top = (10 + (line - 1) * 20 - ceTa.scrollTop) + 'px';
}
ceTa.addEventListener('input', () => { if (!DEMO) opts.onChange?.(); });
ceTa.addEventListener('input', () => { if (codeBoard) { codeBoard.code = ceTa.value; if (codeBoard.codeErr && !codeBoard.prog) { codeBoard.codeErr = null; updateCodeUI(true); } } paintCode(); });
ceTa.addEventListener('scroll', syncCodeScroll);
ceTa.addEventListener('keydown', e => {
  const v = ceTa.value, a = ceTa.selectionStart, b = ceTa.selectionEnd, ls = v.lastIndexOf('\n', a - 1) + 1;
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('ceRun').click(); return; }
  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); document.execCommand('insertText', false, '    '); return; }
  if (e.key === 'Tab' && e.shiftKey) {                      // un-indent the line
    e.preventDefault(); const sp = v.slice(ls).match(/^ {1,4}/)?.[0].length || 0; if (!sp) return;
    ceTa.setSelectionRange(ls, ls + sp); document.execCommand('delete'); ceTa.setSelectionRange(Math.max(ls, a - sp), Math.max(ls, b - sp)); return;
  }
  if (e.key === 'Enter') {                                  // keep the indent, and add one after a ":"
    e.preventDefault(); const cur = v.slice(ls, a), ind = cur.match(/^ */)[0];
    document.execCommand('insertText', false, '\n' + ind + (/:\s*(#.*)?$/.test(cur) ? '    ' : '')); return;
  }
  if (e.key === 'Backspace' && a === b && a > ls && /^ +$/.test(v.slice(ls, a))) {   // delete a whole indent step
    e.preventDefault(); const n = ((a - ls) % 4) || 4; ceTa.setSelectionRange(a - n, a); document.execCommand('delete');
  }
});
function codeLog(board, text, err, dim) {
  (board.out ??= []).push({ text, err, dim }); if (board.out.length > 300) board.out.shift();
  if (codeOpen && board === codeBoard) {
    const o = $('ceOut'), d = document.createElement('div'); d.textContent = text; if (err) d.className = 'err'; else if (dim) d.className = 'dim';
    o.appendChild(d); while (o.childElementCount > 300) o.firstChild.remove(); o.scrollTop = o.scrollHeight;
  }
}
function renderCodeOut() {
  if (!codeOpen || !codeBoard) return;
  const o = $('ceOut'); o.innerHTML = '';
  for (const l of codeBoard.out ?? []) { const d = document.createElement('div'); d.textContent = l.text; if (l.err) d.className = 'err'; else if (l.dim) d.className = 'dim'; o.appendChild(d); }
  if (!o.childElementCount) o.innerHTML = '<div class="dim">Output from print() shows up here. Press ▶ Run to start.</div>';
  o.scrollTop = o.scrollHeight;
}
function updateCodeUI(force) {
  if (!codeOpen || !codeBoard) return;
  const P = codeBoard.prog, err = codeBoard.codeErr;
  const key = `${codeBoard.id}|${P?.state}|${P?.line}|${err?.line}|${err?.msg}`;
  if (!force && key === codeUIKey) return; codeUIKey = key;
  $('ceStatus').innerHTML = err ? `<span class="bad">✗ Stopped on line ${err.line}.</span> Fix it and press Run again.`
    : P?.state === 'run' ? `<span class="ok">● Running</span> · line ${P.line}`
    : P?.state === 'done' ? '✓ Finished. Press Stop to give the OLED its menu back.' : 'Ready · press ▶ Run (Ctrl + Enter)';
  $('ceStop').disabled = !P; placeCodeLine();
}

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minDistance = 6; controls.maxDistance = 80;
controls.screenSpacePanning = false;
controls.dampingFactor = 0.08;
controls.addEventListener('start', () => { portCam = null; });   // orbiting by hand cancels the port close-up
controls.enableZoom = false;                 // replaced by the smooth zoom below
camera.position.copy(CAM_HOME); controls.target.copy(TARGET_HOME);

/* ---------- wheel + trackpad navigation ----------
   Mouse wheel ............ zoom toward the cursor
   Trackpad pinch ......... zoom toward the cursor (browsers send it as wheel + ctrlKey)
   Trackpad two-finger .... pan across the table
   Shift + two-finger ..... orbit around the view
   Left-drag empty space .. orbit · Right-drag .. pan (OrbitControls)                       */
let zoomDist = CAM_HOME.distanceTo(TARGET_HOME);
const zoomAnchor = TARGET_HOME.clone();
let padUntil = 0;                                // recent trackpad gesture: keep treating the stream as trackpad
const isTrackpad = e => {
  if (e.deltaMode !== 0) return false;           // line / page deltas only come from wheels
  const now = performance.now();
  // wheels send big round steps on one axis; trackpads send small, frequent, often two-axis deltas
  const pad = e.deltaX !== 0 || Math.abs(e.deltaY) < 40 || (now < padUntil && Math.abs(e.deltaY) < 160);
  if (pad) padUntil = now + 250;
  return pad;
};
function zoomBy(dy, e) {
  portCam = null;                                // the student's own camera move wins over the port close-up
  zoomDist = THREE.MathUtils.clamp(zoomDist * Math.exp(dy), controls.minDistance, controls.maxDistance);
  setRay(e);
  if (!ray.ray.intersectPlane(planeAt(0), zoomAnchor)) zoomAnchor.copy(controls.target);
  clampTable(zoomAnchor);
}
const _fw = V(), _rt = V(), _sph = new THREE.Spherical();
function panBy(dx, dy) {                         // screen pixels -> ground plane, scaled by how far away we are
  portCam = null;
  camera.getWorldDirection(_fw); _fw.y = 0; _fw.normalize();
  _rt.crossVectors(_fw, camera.up).normalize();
  const k = camera.position.distanceTo(controls.target) * 0.0016;
  const move = _rt.multiplyScalar(dx * k).addScaledVector(_fw, -dy * k);
  const t = clampTable(controls.target.clone().add(move));
  move.subVectors(t, controls.target);
  controls.target.add(move); camera.position.add(move);
}
function orbitBy(dx, dy) {
  portCam = null;
  const off = camera.position.clone().sub(controls.target);
  _sph.setFromVector3(off);
  _sph.theta -= dx * 0.005;
  _sph.phi = THREE.MathUtils.clamp(_sph.phi - dy * 0.005, 0.15, controls.maxPolarAngle);
  camera.position.copy(controls.target).add(off.setFromSpherical(_sph));
}
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camTween = null;
  if (e.ctrlKey) {                                // pinch
    zoomBy(THREE.MathUtils.clamp(e.deltaY, -60, 60) * 0.012, e);
  } else if (isTrackpad(e)) {
    if (e.shiftKey) orbitBy(e.deltaX || 0, e.deltaY);
    else panBy(e.deltaX, e.deltaY);
  } else {                                        // mouse wheel
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    zoomBy(THREE.MathUtils.clamp(dy, -250, 250) * 0.0011, e);
  }
  kick();
}, { passive: false });
// the + / − buttons in the bottom-left corner (and the + / − keys): a step toward the middle of the view
function zoomStep(dir) {
  const r = canvas.getBoundingClientRect();
  camTween = null;
  zoomBy(-dir * 0.28, { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
  kick();
}
document.getElementById('zoomIn').onclick = () => zoomStep(1);
document.getElementById('zoomOut').onclick = () => zoomStep(-1);
// stop the browser's own pinch-zoom / swipe-back from fighting the canvas
canvas.addEventListener('gesturestart', e => e.preventDefault());
canvas.style.overscrollBehavior = 'none';
function updateZoom(dt) {
  const cur = camera.position.distanceTo(controls.target);
  if (Math.abs(zoomDist - cur) < 0.002) return false;
  const f = THREE.MathUtils.lerp(cur, zoomDist, damp(10, dt)) / cur;
  // scale camera + target about the anchor: the point under the cursor stays put
  camera.position.sub(zoomAnchor).multiplyScalar(f).add(zoomAnchor);
  controls.target.sub(zoomAnchor).multiplyScalar(f).add(zoomAnchor);
  return true;
}

let forceFrames = 4; const kick = () => { forceFrames = Math.max(forceFrames, 3); };
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); kick();
}
const resizeObs = new ResizeObserver(resize); resizeObs.observe(stage); resize();

const pingGeo = new THREE.TorusGeometry(0.6, 0.03, 8, 48);
function spawnPing(m, fromT) {
  const r = new THREE.Mesh(pingGeo, new THREE.MeshBasicMaterial({ color: fromT ? 0xFFF2DF : 0x18A058, transparent: true, depthWrite: false }));
  r.rotation.x = Math.PI / 2;
  const t = m.built.transducers[fromT ? 0 : 1];
  r.position.set(t.position.x, fromT ? 2.45 : m.built.target.position.y - 0.17, t.position.z);
  r.userData = { age: 0, up: fromT }; m.group.add(r); m.pings.push(r);
}
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clock = new THREE.Clock();
let lastKey = '';

renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), time = clock.elapsedTime;
  const keyParts = [];

  // plates
  for (const p of plates) {
    const goal = p.dragging ? V(p.raw.x, 0.5, p.raw.z) : p.target;
    p.group.position.lerp(goal, damp(p.dragging ? 20 : 14, dt));
    keyParts.push(p.group.position.x, p.group.position.y, p.group.position.z);
  }
  // modules (ride along with their plate)
  for (const m of modules) {
    let goal;
    if (m.dragging || !m.plate) goal = m.raw;
    else goal = V(m.plate.group.position.x + m.lx, m.plate.group.position.y + PT, m.plate.group.position.z + m.lz);
    m.group.position.lerp(goal, damp(m.dragging ? 18 : 22, dt));
    m.group.rotation.y += (m.yaw - m.group.rotation.y) * damp(12, dt);
    m.group.updateMatrixWorld(true);
    keyParts.push(m.group.position.x, m.group.position.y, m.group.position.z, m.group.rotation.y);

    // port glows while a plug is being carried
    m.ports.forEach((pt, i) => {
      const gl = m.glows[i], dp = drag?.active && drag.ref.type === 'plug' ? drag.ref : null;
      let op = 0;
      if (dp && (!pt.plug || pt.plug === dp) && m.plate) {
        const near = dp.near && dp.near.m === m && dp.near.idx === i;
        let jx = 0;
        if (near && dp.flipped) { gl.material.color.set(0x111111); op = 0.9; jx = Math.sin(time * 60) * 0.03; }
        else if (near) { gl.material.color.set(0x18A058); op = 0.95; }
        else { gl.material.color.set(0xFFF2DF); op = 0.45 + 0.4 * Math.sin(time * 6); }
        gl.position.copy(portLocal(pt, jx, pt.y, 0.02));
      }
      gl.material.opacity += (op - gl.material.opacity) * damp(12, dt);
      gl.visible = gl.material.opacity > 0.01;
    });

    // the block above an ultrasonic follows its distance
    if (m.built.target) {
      const T = m.built.target;
      T.position.y += (usHeight(m.state.distance) - T.position.y) * damp(16, dt);
      m.built.guide.scale.y = Math.max(0.01, T.position.y - 0.15 - 2.45);
      keyParts.push(T.position.y);
    }
    // one-shot effects (breath puffs, and later buzzer waves etc.): each has a life and an update(a), a = 0..1
    for (let i = m.fx.length - 1; i >= 0; i--) {
      const f = m.fx[i]; f.age += dt; if (f.age < 0) continue;
      const a = f.age / f.life;
      if (a >= 1) { m.group.remove(f.obj); f.obj.material.dispose(); m.fx.splice(i, 1); continue; }
      f.update(a);
    }
    // per-module moving parts (knob, button caps, cover, RFID tags, IR lights)
    if (m.def.anim) keyParts.push(m.def.anim(m, dt, time));
    // pings when plugged in
    if (m.def.pings && powered(m)) {
      m.pingT -= dt;
      if (m.pingT <= 0) { spawnPing(m, true); setTimeout(() => modules.includes(m) && spawnPing(m, false), 650); m.pingT = 1.5; }
    }
    for (let i = m.pings.length - 1; i >= 0; i--) {
      const r = m.pings[i]; r.userData.age += dt; const a = r.userData.age / 1.1;
      if (a >= 1) { m.group.remove(r); r.material.dispose(); m.pings.splice(i, 1); continue; }
      const top = m.built.target.position.y - 0.17;      // sound goes up to the block and echoes back
      if (r.userData.up) { r.position.y = 2.45 + a * (top - 2.45); r.scale.setScalar(1 + a * 1.4); }
      else { r.position.y = top - a * (top - 2.45); r.scale.setScalar(2.4 - a * 1.4); }
      r.material.opacity = Math.sin(a * Math.PI) * 0.9;
    }
  }
  // plugs
  for (const c of cables) for (const p of c.plugs) {
    if (p.state === 'insert') {
      const I = p.insert; I.t += dt;
      if (I.t < 0.16) p.group.position.lerpVectors(I.keys[0], I.keys[1], ease(I.t / 0.16));
      else if (I.t < 0.36) p.group.position.lerpVectors(I.keys[1], I.keys[2], ease((I.t - 0.16) / 0.2));
      else { p.state = 'connected'; p.port = { module: I.m, idx: I.idx }; p.insert = null; click(); onConnect(p); changed(); }
      if (p.insert) p.group.rotation.y = shortAngle(p.group.rotation.y, I.m.group.rotation.y + I.m.ports[I.idx].rot);
    } else if (p.state === 'connected') {
      const m = p.port.module, pt = m.ports[p.port.idx];
      p.group.position.copy(m.group.localToWorld(portLocal(pt, 0, pt.y, -INSERT_DEPTH)));
      p.group.rotation.y = m.group.rotation.y + pt.rot;
    } else {
      p.group.position.lerp(p.target, damp(16, dt));
      p.group.rotation.y += (p.yawT - p.group.rotation.y) * damp(10, dt);
    }
    p.inner.rotation.z += ((p.flipped ? Math.PI : 0) - p.inner.rotation.z) * damp(14, dt);
    p.group.rotation.x = THREE.MathUtils.lerp(p.group.rotation.x, p.state === 'drag' && !p.near ? -0.12 : 0, damp(10, dt));
  }
  // cables: rebuild only when an end moved
  let moved = false;
  for (const c of cables) {
    const k = c.plugs.map(p => [p.group.position.x, p.group.position.y, p.group.position.z, p.group.rotation.y, p.group.rotation.x, p.inner.rotation.z].map(n => n.toFixed(3)).join()).join('|');
    if (k !== c.key) { c.key = k; rebuildCable(c); moved = true; }
  }
  // data pulses along the signal wire: sensor -> board, board -> output
  let anyPulse = false;
  for (const c of cables) {
    const [A, B] = c.plugs;
    const live = !!c.curve && A.state === 'connected' && B.state === 'connected' && !!A.port.module.def.board !== !!B.port.module.def.board;
    const aIsBoard = live && !!A.port.module.def.board, mod = live && (aIsBoard ? B : A).port.module;
    const fromA = live && (mod.def.sim?.role === 'output' ? aIsBoard : !aIsBoard);
    c.pulses.forEach((s, k) => {
      s.visible = live; if (!live) return;
      const t = (time * 0.6 + k / 3) % 1;
      s.position.copy(c.curve.getPointAt(fromA ? t : 1 - t));
      s.scale.setScalar(0.6 + 0.6 * Math.sin(t * Math.PI));
    });
    anyPulse ||= live;
  }
  // selection outline follows its object
  if (selFrame.visible && selected) {
    const g = selected.group;
    selFrame.position.set(g.position.x, g.position.y + (selected.type === 'plate' ? 0.01 : 0.02), g.position.z);
    selFrame.rotation.y = selected.type === 'module' ? g.rotation.y : 0;
  }

  // brain: 10 ticks a second
  // brain runs on real time, not frame time, so slow laptops still see sensors react at the right speed
  runPrograms();                                     // student code, on every board that is running some
  simAcc = Math.min(simAcc + rawDt, 1);
  while (simAcc >= 0.1) { simAcc -= 0.1; simTick(time); }
  // port close-up while a plug goes in (see PORT CLOSE-UP)
  if (stepPortCam(dt)) { camTween = null; moved = true; }
  // "Look at screen" camera move
  if (camTween) {
    camTween.t = Math.min(1, camTween.t + dt / 0.9);
    const k = ease(camTween.t);
    camera.position.lerpVectors(camTween.p0, camTween.p1, k); controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    zoomDist = camera.position.distanceTo(controls.target);
    if (camTween.t >= 1) camTween = null;
    moved = true;
  }

  const key = keyParts.map(n => n.toFixed(3)).join();
  if (key !== lastKey) { lastKey = key; moved = true; }
  if (moved) renderer.shadowMap.needsUpdate = true;
  const zooming = updateZoom(dt);
  const camMoved = controls.update() || zooming;
  const anyPings = modules.some(m => m.pings.length || m.fx.length);
  const anyGlow = modules.some(m => m.glows.some(g => g.visible));
  if (!(moved || camMoved || forceFrames > 0 || anyPings || anyGlow || anyPulse || screenDirty || drag || sideDrag)) return;
  if (forceFrames > 0) forceFrames--;
  renderer.render(scene, camera);
  screenDirty = false;
});

/* =====================================================================
   DEMO DRIVER (only with /simulator?demo)
   The landing page shows this page in an iframe and scrubs a scripted build
   with window.__sgDemo.set(p), p = 0..1 (its scroll progress). set() works
   both ways: each step is added or undone so the scene always matches p.
   It returns where the landing page should draw its pointer, in this
   page's pixels. Real engine objects throughout: makeModule, makeCable,
   plug insertion, the Code panel, runCode, the ultrasonic's target block.
   ===================================================================== */
if (DEMO && !SHOWCASE) {
  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const sm = t => t * t * (3 - 2 * t);
  const DEMO_CODE = `# Parking sensor: beep when you get close
while True:
    d = distance()
    print(d, "cm")
    if d < 10:
        led.color("red")
        buzzer.beep()
    elif d < 30:
        led.color("orange")
    else:
        led.color("green")
    sleep(0.2)`;
  const S = {
    mods: [
      { kind: 'quark', lx: -1.5, lz: 2.5, t: [0.04, 0.16] },
      { kind: 'ultrasonic', lx: -0.5, lz: -4.5, t: [0.2, 0.32] },
      { kind: 'buzzer', lx: 4.5, lz: -3.5, t: [0.36, 0.48] },
    ],
    cables: [{ from: 1, idx: 2, t: [0.53, 0.6] }, { from: 2, idx: 3, t: [0.64, 0.71] }],   // into Quark ports 3 and 4
    fab: 0.745, type: [0.765, 0.86], run: 0.885, hand: [0.91, 0.975],
  };
  const plate = makePlate();
  const live = S.mods.map(() => null), wires = S.cables.map(() => null);
  let typed = -1, lastP = -1;

  // camera: a little closer than home, and it slides over when the Code panel opens
  const CAM0 = V(13, 18.5, 23), TGT0 = V(0.6, 0, -0.6);
  camera.position.copy(CAM0); controls.target.copy(TGT0); zoomDist = CAM0.distanceTo(TGT0); controls.update();

  const cr = () => canvas.getBoundingClientRect();
  const scr = v => { const q = v.clone().project(camera), r = cr(); return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height]; };
  const rcast = new THREE.Raycaster();
  const worldAt = (x, y, h) => {
    const r = cr(); rcast.setFromCamera(new THREE.Vector2((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1), camera);
    return rcast.ray.intersectPlane(new THREE.Plane(V(0, 1, 0), -h), V()) || V();
  };
  const mid = el => { const r = el?.getBoundingClientRect(); return r ? [r.left + r.width / 2, r.top + r.height / 2] : [0, 0]; };
  const libOf = kind => libEl.querySelector(`[data-id="${kind}"]`);
  const entryS = i => { const r = cr(), y = mid(libOf(S.mods[i].kind))[1]; return [r.left + 60, Math.min(Math.max(y, r.top + r.height * 0.45), r.bottom - 140)]; };
  const entryW = i => worldAt(...entryS(i), PT + 0.9);
  const mouth = (m, idx, d) => { const pt = m.ports[idx]; return m.settled.localToWorld(portLocal(pt, 0, pt.y, d)); };

  function stepModule(i, p) {
    const d = S.mods[i], D = d.t[1] - d.t[0], u = seg(p, d.t[0], d.t[1]);
    let m = live[i];
    if (p < d.t[0] + D * 0.3) { if (m) { removeModule(m); live[i] = null; } return; }   // still over the parts list: only the card shows
    if (!m) {
      m = live[i] = makeModule(d.kind); m.dragging = true;
      m.raw.copy(entryW(i)); m.group.position.copy(m.raw);
      if (d.kind === 'ultrasonic') m.state.distance = 45;
    }
    if (u < 1) {
      if (!m.dragging) { m.dragging = true; m.plate = null; }
      const k = sm(seg(u, 0.3, 1));
      m.raw.copy(entryW(i)).lerp(V(d.lx, PT + 0.9, d.lz), k);
      if (k > 0.55) showGhost('m:' + d.kind, m.def.foot, d.lx, PT, d.lz, 0, true);
    } else if (m.dragging) {
      m.dragging = false; m.plate = plate; m.lx = d.lx; m.lz = d.lz; settle(m); changed();
    }
  }
  function stepCable(j, p) {
    const c = S.cables[j], src = live[c.from], q = live[0];
    let w = wires[j];
    if (p < c.t[0] || !src || !q || src.dragging || q.dragging) {
      if (w) {
        const B = w.plugs[1]; if (B.state === 'insert') { B.insert.m.ports[B.insert.idx].plug = null; B.insert = null; }
        removeCable(w); wires[j] = null; changed();
      }
      return;
    }
    const [A, B] = (w ||= wires[j] = makeCable()).plugs, qpt = q.ports[c.idx];
    if (A.state !== 'connected') {                      // one end starts plugged into the sensor
      const pt = src.ports[0];
      A.state = 'connected'; A.port = { module: src, idx: 0 }; pt.plug = A;
      A.group.position.copy(src.group.localToWorld(portLocal(pt, 0, pt.y, -INSERT_DEPTH))); A.group.rotation.y = pt.rot;
      B.group.position.copy(mouth(src, 0, 1.2)); B.target.copy(B.group.position);
      B.group.rotation.y = pt.rot; B.yawT = qpt.rot;
      changed();
    }
    const u = seg(p, c.t[0], c.t[1]);
    if (u < 1) {
      if (B.state === 'connected') unplug(B);
      if (B.state === 'insert') { qpt.plug = null; B.insert = null; }
      B.state = 'rest';
      const k = sm(u), a = mouth(src, 0, 1.2), b = mouth(q, c.idx, 0.05);
      B.target.copy(a).lerp(b, k); B.target.y += Math.sin(Math.PI * k) * 2.2;
    } else if (B.state === 'rest') {                   // let go over the port: the real click-in
      B.state = 'insert'; qpt.plug = B;
      B.insert = { t: 0, m: q, idx: c.idx, keys: [B.group.position.clone(), mouth(q, c.idx, 0.05), mouth(q, c.idx, -INSERT_DEPTH)] };
    }
  }
  function stepCode(p) {
    const q = live[0], ready = q && !q.dragging;
    const open = p >= S.fab && ready;
    if (open !== codeOpen) {
      if (open) { q.code = ''; ceTa.dataset.board = ''; typed = -1; }
      toggleCode(open);
    }
    if (codeOpen) {
      const n = Math.floor(DEMO_CODE.length * seg(p, S.type[0], S.type[1]));
      if (n !== typed && !q.prog) { typed = n; q.code = ceTa.value = DEMO_CODE.slice(0, n); paintCode(); }
    }
    const run = codeOpen && p >= S.run && wires.every(w => w && w.plugs[1].state !== 'rest');
    if (run && !q.prog) { q.code = ceTa.value = DEMO_CODE; typed = DEMO_CODE.length; paintCode(); runCode(q); }
    if (!run && q?.prog) { stopCode(q, true); q.out = []; renderCodeOut(); }
    const us = live[1];
    if (us) { const d = Math.round(45 - 41 * sm(seg(p, S.hand[0], S.hand[1]))); if (us.state.distance !== d) { us.state.distance = d; kick(); } }
    // slide the view left while the Code panel is open, so the build stays in sight
    const o = sm(seg(p, S.fab, S.fab + 0.03)) * (codeOpen ? 1 : 0);
    const right = V().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize().multiplyScalar(o * 6.5);
    camera.position.copy(CAM0).add(right); controls.target.copy(TGT0).add(right);
  }

  // pointer path: [p, where]. Same `where` at both ends = follow a moving thing.
  const centre = () => { const r = cr(); return [r.left + r.width * 0.55, r.top + r.height * 0.5]; };
  const PATH = [[0, centre], [0.02, centre]];
  S.mods.forEach((d, i) => {
    const D = d.t[1] - d.t[0], lib = () => mid(libOf(d.kind)), raw = () => live[i] ? scr(live[i].raw) : entryS(i);
    PATH.push([d.t[0] - 0.035, lib], [d.t[0], lib], [d.t[0] + D * 0.3, () => entryS(i)], [d.t[0] + D * 0.3 + 0.0001, raw], [d.t[1], raw], [d.t[1] + 0.012, raw]);
  });
  S.cables.forEach((c, j) => {
    const port = () => live[c.from] ? scr(mouth(live[c.from], 0, 1.2)) : centre();
    const plug = () => wires[j] ? scr(wires[j].plugs[1].group.position) : port();
    PATH.push([c.t[0] - 0.03, port], [c.t[0], plug], [c.t[1], plug], [c.t[1] + 0.012, plug]);
  });
  const fab = () => mid(codeFab), runB = () => mid($('ceRun'));
  const textEnd = () => { const r = ceTa.getBoundingClientRect(); return [r.right - 60, r.top + 250]; };
  const block = () => live[1] ? scr(live[1].group.localToWorld(live[1].built.target.position.clone())) : centre();
  PATH.push([S.fab - 0.025, fab], [S.fab + 0.006, fab], [S.type[0], textEnd], [S.type[1], textEnd],
    [S.run - 0.02, runB], [S.run + 0.006, runB], [S.hand[0], block], [1, block]);

  function pointer(p) {
    let i = 0; while (i < PATH.length - 2 && p >= PATH[i + 1][0]) i++;
    const [t0, f0] = PATH[i], [t1, f1] = PATH[i + 1], a = f0(), b = f1();
    const k = f0 === f1 ? 1 : sm(seg(p, t0, t1));
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }

  window.__sgDemo = {
    // the landing page switches sound off whenever the demo is off screen, so the buzzer can't
    // keep beeping after you scroll past it
    sound(on) {
      muted = !on;
      if (actx) (on ? actx.resume() : actx.suspend()).catch(() => {});
    },
    set(p) {
      // bring the next part into view in the parts list, like scrolling to it by hand
      const next = S.mods.find(d => p < d.t[0] + (d.t[1] - d.t[0]) * 0.3);
      const it = next && libOf(next.kind);
      if (it) {
        const want = Math.max(0, libEl.scrollTop + it.getBoundingClientRect().top - libEl.getBoundingClientRect().top - 60);
        libEl.scrollTop += (want - libEl.scrollTop) * 0.25;
      }
      S.mods.forEach((_, i) => stepModule(i, p));
      if (!modules.some(m => m.dragging)) hideGhost();
      S.cables.forEach((_, j) => stepCable(j, p));
      stepCode(p);
      if (p !== lastP) { lastP = p; kick(); }
      const drag = S.mods.find(d => p >= d.t[0] && p < d.t[1]);
      const held = drag || S.cables.some(c => p >= c.t[0] && p < c.t[1]) || (p >= S.hand[0] && p < S.hand[1]);
      const clickAt = [S.fab, S.run, ...S.cables.map(c => c.t[1]), ...S.mods.map(d => d.t[0])].find(t => p >= t && p < t + 0.012);
      const card = drag && p < drag.t[0] + (drag.t[1] - drag.t[0]) * 0.3 ? LIBRARY.flatMap(c => c.items).find(it => it.id === drag.kind) : null;
      return {
        pointer: pointer(p), held: !!held, click: clickAt == null ? null : seg(p, clickAt, clickAt + 0.012),
        card: card && { name: card.name, img: imgSrc(card) },
      };
    },
  };
}

/* =====================================================================
   SHOWCASE DRIVER (only with /simulator?demo=parts)
   The Course page shows this page in an iframe as a turntable: one real
   part at a time, sitting on a base plate, the camera slowly circling it.
   The page picks the part with window.__sgShow.show(id), id = a parts-library
   id ('plate', 'zap' or a module kind). No table, no UI, no sound.
   ===================================================================== */
if (SHOWCASE) {
  scene.background = null; scene.fog = null; table.visible = false; muted = true;
  const plate = makePlate();
  let mod = null, wire = null;
  const DIR = V(1, 0.95, 1.3).normalize();
  controls.enabled = false;                                 // the page drives it; the iframe takes no input
  controls.autoRotate = !calmMotion.matches; controls.autoRotateSpeed = 1.6;
  function frame(size, y) {                                 // glide to a view that fits something `size` wide
    const t = V(0, y, 0), dist = 7 + size * 2.3;
    camTween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: t.clone().addScaledVector(DIR, dist), t1: t };
    kick();
  }
  function show(id) {
    if (mod) { removeModule(mod); mod = null; }
    if (wire) { removeCable(wire); wire = null; }
    if (id === 'zap') {
      wire = makeCable();
      wire.plugs.forEach((p, i) => {
        p.state = 'rest'; p.yawT = p.group.rotation.y = i ? -0.5 : 0.4;
        p.target.set(i ? 2.6 : -2.6, PT + REST_Y, i ? 1.2 : -1.2); p.group.position.copy(p.target).setY(PT + 4);
      });
      frame(5, PT + 0.6);
    } else if (MODULES[id]) {
      const m = mod = makeModule(id), f = m.def.foot;
      m.plate = plate; m.lx = -(f.x0 + f.x1) / 2; m.lz = -(f.z0 + f.z1) / 2;
      m.yaw = m.group.rotation.y = 0; settle(m);
      m.group.position.set(m.lx, PT + 5, m.lz);            // drops into place
      if (m.def.board) m.state.rgb = [228, 18, 27];         // the Quark's LED glows red
      if (m.built.target) m.built.target.visible = false;   // the ultrasonic's drag-me block
      frame(Math.max(f.x1 - f.x0, f.z1 - f.z0), PT + 1);
    } else frame(PLATE.half * 2, 0);                         // the base plate on its own
    plate.group.visible = id === 'plate';                    // a part floats on its own; the plate is still there to hold it
    kick();
  }
  camera.position.copy(DIR.clone().multiplyScalar(40)); controls.target.set(0, 0, 0); controls.update();
  window.__sgShow = { show };
}

/* =====================================================================
   SAVE + LOAD
   serialize() turns the build into plain JSON (the page saves it to Supabase);
   load(data) rebuilds it, snapping everything into place with no fly-in.
   Format v1:
     { v, camera: { pos, target },
       plates:  [{ id, name, x, z }],
       modules: [{ id, kind, name, plate (plate id | null), lx, lz, yaw, pos?, code?, state? }],
       cables:  [{ id, name, plugs: [ { port: [moduleId, portIdx], flipped } | { rest: [x, y, z], yaw, flipped } ] x2 }] }
   Only what the student set is saved: each kind's knobs are listed in PERSIST. Running
   programs are not saved (projects reopen stopped). New engine state worth keeping
   must be added here.
   ===================================================================== */
const SAVE_V = 1;
const PERSIST = {
  ultrasonic: ['distance'], dht11: ['temp', 'hum'], light: ['room', 'covered'], pot: ['v'],
  servo: ['target', 'mode', 'follow'], buzzer: ['vol', 'mode', 'follow'],
};
const r3 = n => Math.round(n * 1000) / 1000;
const xyz = v => [r3(v.x), r3(v.y), r3(v.z)];
function serialize() {
  const plugOut = p => {
    const at = p.state === 'connected' ? p.port : p.state === 'insert' ? { module: p.insert.m, idx: p.insert.idx } : null;
    if (at) return { port: [at.module.id, at.idx], flipped: p.flipped };
    const w = p.state === 'rest' ? p.target : p.group.position;
    return { rest: xyz(w), yaw: r3(p.yawT), flipped: p.flipped };
  };
  return {
    v: SAVE_V,
    camera: { pos: xyz(camera.position), target: xyz(controls.target) },
    plates: plates.map(p => ({ id: p.id, name: p.name, x: r3(p.target.x), z: r3(p.target.z) })),
    modules: modules.map(m => {
      const o = { id: m.id, kind: m.kind, name: m.name, plate: m.plate?.id ?? null, lx: r3(m.lx), lz: r3(m.lz), yaw: r3(m.yaw) };
      if (!m.plate) o.pos = xyz(m.dragging ? m.group.position : m.raw);
      if (m.def.board && m.code != null) o.code = m.code;
      const keys = PERSIST[m.kind];
      if (keys) o.state = Object.fromEntries(keys.map(k => [k, m.state[k]]));
      return o;
    }),
    cables: cables.map(c => ({ id: c.id, name: c.name, plugs: c.plugs.map(plugOut) })),
  };
}
function load(data) {
  modules.forEach(m => m.prog && stopCode(m, true));
  clearScene();
  if (codeOpen) toggleCode(false);
  ceTa.dataset.board = '';
  if (!data || !Array.isArray(data.plates)) { changed(); return; }
  if (data.plates.length && !DESK) setPal(false);     // an opened build on a tablet: show it, not the parts
  const byId = new Map();
  let maxId = 0, skipped = 0;
  const seen = id => { maxId = Math.max(maxId, id | 0); return id; };
  for (const d of data.plates) {
    const p = makePlate(); p.id = seen(d.id); if (d.name) p.name = d.name;
    p.target.set(+d.x || 0, 0, +d.z || 0); p.group.position.copy(p.target);
    byId.set('p' + p.id, p);
  }
  for (const d of data.modules || []) {
    if (!MODULES[d.kind]) { skipped++; continue; }
    const m = makeModule(d.kind); m.id = seen(d.id); if (d.name) m.name = d.name;
    m.yaw = +d.yaw || 0; m.group.rotation.y = m.yaw;
    const plate = d.plate != null ? byId.get('p' + d.plate) : null;
    if (plate) {
      m.plate = plate; m.lx = +d.lx || 0; m.lz = +d.lz || 0;
      m.group.position.set(plate.target.x + m.lx, PT, plate.target.z + m.lz); settle(m);
    } else {
      m.plate = null; m.raw.set(...(d.pos || [0, PT, 0])); m.group.position.copy(m.raw);
    }
    m.group.updateMatrixWorld(true);
    if (m.def.board && typeof d.code === 'string') m.code = d.code;
    const keys = PERSIST[m.kind];
    if (keys && d.state) for (const k of keys) if (k in d.state && typeof d.state[k] === typeof m.state[k]) m.state[k] = d.state[k];
    // jump the smoothed values straight to the saved settings
    const s = m.state;
    if (m.kind === 'dht11') { s.st = s.temp; s.sh = s.hum; s.read = { t: s.temp, h: s.hum }; }
    if (m.kind === 'light') { s.coverK = s.covered ? 1 : 0; s.level = s.read = s.room; }
    if (m.kind === 'pot') s.read = Math.round(s.v);
    if (m.kind === 'servo') s.ang = s.target;
    byId.set('m' + m.id, m);
  }
  for (const d of data.cables || []) {
    const c = makeCable(); c.id = seen(d.id); if (d.name) c.name = d.name;
    (d.plugs || []).slice(0, 2).forEach((pd, i) => {
      const p = c.plugs[i]; p.flipped = !!pd.flipped; p.inner.rotation.z = p.flipped ? Math.PI : 0;
      const m = pd.port && byId.get('m' + pd.port[0]), pt = m?.ports[pd.port[1]];
      if (pt && !pt.plug) {
        p.state = 'connected'; p.port = { module: m, idx: pd.port[1] }; pt.plug = p;
        p.group.position.copy(m.group.localToWorld(portLocal(pt, 0, pt.y, -INSERT_DEPTH)));
        p.group.rotation.y = p.yawT = m.group.rotation.y + pt.rot;
      } else {
        const w = pd.rest ? V(...pd.rest) : m ? m.group.localToWorld(V(0, 0, m.def.foot.z1 + 1.2)) : V(0, 0, 0);
        p.state = 'rest'; p.target.copy(w); p.target.y = surfaceY(w.x, w.z) + REST_Y; p.group.position.copy(p.target);
        p.group.rotation.y = p.yawT = +pd.yaw || 0;
      }
    });
  }
  uid = maxId + 1;
  for (const [k, list] of [['plate', plates], ['module', modules], ['cable', cables]]) {
    counters[k] = list.reduce((n, o) => Math.max(n, +(/(\d+)$/.exec(o.name)?.[1] ?? 0)), 0);
  }
  const cam = data.camera;
  if (cam?.pos && cam?.target) {
    camTween = null; portCam = null; camera.position.set(...cam.pos); controls.target.set(...cam.target);
    zoomDist = camera.position.distanceTo(controls.target); controls.update();
  }
  if (skipped) toast(`${skipped} part${skipped > 1 ? 's' : ''} in this build aren't in the simulator any more, so they were left out.`);
  changed();
}
// a picture of the table (webp Blob): 480 x 300 for the projects page. A bigger size (W x H, e.g. TinkerAI's
// card covers) renders at that size and shape, so it stays sharp, then puts the canvas back.
function snapshot(W = 480, H = 300) {
  return new Promise(resolve => {
    const was = selFrame.visible; selFrame.visible = false;
    const big = W > 480;
    if (big) { renderer.setPixelRatio(1); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const sw = canvas.width, sh = canvas.height, k = Math.max(W / sw, H / sh);
    const cw = W / k, ch = H / k;
    out.getContext('2d').drawImage(canvas, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, W, H);
    if (big) { renderer.setPixelRatio(Math.min(devicePixelRatio, DEMO ? 1.25 : 1.5)); resize(); }
    selFrame.visible = was; kick();
    out.toBlob(b => resolve(b), 'image/webp', big ? 0.88 : 0.82);
  });
}

/* =====================================================================
   TUTOR HOOKS (TinkerAI)
   SimulatorHost runs a tutorial (src/simulator/Tutor.tsx). The engine only
   reports what's on the table (inspect), lights up the part to use next
   (highlightPart), says where something is on screen (pointAt), fills in a
   read-only program (setCode) and marks the lines a note talks about.
   ===================================================================== */
let codeLocked = false, markRange = null;
const ceMark = document.createElement('div'); ceMark.className = 'ce-mark'; ceLine.after(ceMark);
function inspect() {
  return {
    plates: plates.filter(p => !p.dragging).length,
    cables: cables.length,
    codeOpen,
    modules: modules.filter(m => m.plate && !m.dragging).map(m => ({
      id: m.id, kind: m.kind,
      plugged: m.ports.some(pt => pt.plug?.state === 'connected'),
      links: m.ports.map(linkOf).filter(Boolean).map(o => o.kind),
      running: m.prog?.state === 'run',
      ran: !!m.prog && m.prog.state !== 'error',          // running, or ran to the end without an error
      led: !!m.def.board && (m.state.rgb || []).some(v => v > 0),
      distance: m.kind === 'ultrasonic' ? Math.round(m.state.distance) : null,
      // a sensor's main reading (the first in sim.readings): distance, light, knob, temperature, button 1…
      reading: m.def.sim?.role === 'sensor' ? (({ label, value, unit }) => ({ label, value, unit }))(m.def.sim.readings(m)[0]) : null,
      sound: m.kind === 'buzzer' && m.state.now > 0,
    })),
  };
}
function highlightPart(id) {
  tutPart = id || null;
  libEl.querySelectorAll('.item.tut, .item.start').forEach(el => el.classList.remove('tut', 'start'));
  partsFab.classList.toggle('tut', !!tutPart);
  if (!tutPart) return;
  if (qEl.value || (libCat && !LIBRARY.find(c => c.cat === libCat)?.items.some(i => i.id === tutPart))) {   // make sure it's listed
    qEl.value = ''; libCat = ''; renderCats(); renderLibrary();
  }
  const el = libEl.querySelector(`[data-id="${tutPart}"]`); if (!el) return;
  el.classList.add('tut');
  if (palOpen) scrollToTut();
}
// bring the part the tutorial wants into view in the library (on highlight, and whenever the library opens)
function scrollToTut() {
  const el = tutPart && libEl.querySelector('.item.tut'); if (!el) return;
  libEl.scrollTo({ top: el.offsetTop - (libEl.clientHeight - el.offsetHeight) / 2, behavior: 'smooth' });
}
// where a thing is on screen (client pixels), or null. spec: { kind, at: 'body' | 'port' | 'free-port' | 'target' } or { cable: 'loose' }
function pointAt(spec) {
  let w = null;
  if (spec?.cable) {
    const p = cables.flatMap(c => c.plugs).find(p => p.state !== 'connected' && p.state !== 'insert' && !p.dragging);
    w = p?.group.position.clone();
  } else if (spec?.kind) {
    const m = modules.find(m => m.kind === spec.kind && m.plate && !m.dragging); if (!m) return null;
    if (spec.at === 'target' && m.built.target) w = m.group.localToWorld(m.built.target.position.clone());
    else if (spec.at === 'port' || spec.at === 'free-port') {
      const pt = m.ports.find(pt => !pt.plug) || (spec.at === 'port' ? m.ports[0] : null); if (!pt) return null;
      w = m.settled.localToWorld(portLocal(pt, 0, pt.y, 0.6)).setY(PLUG_PLANE_Y);   // where to drop the plug: the plane the pointer drives it on
    } else w = m.group.position.clone().setY(PT + 1);
  }
  if (!w) return null;
  const q = w.project(camera), r = canvas.getBoundingClientRect();
  if (q.z > 1) return null;
  return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height];
}
// put a program on the (first) board and open the Code panel; lock = read-only, no examples or snippets
function setCode(code, lock) {
  const b = boardsOnTable()[0]; if (!b) return false;
  if (b.prog) stopCode(b, true);
  b.code = code; lockCode(lock);
  if (!codeOpen) toggleCode(true);
  codeBoard = b; ceTa.dataset.board = ''; renderCode();
  if (!DEMO) opts.onChange?.();
  return true;
}
function lockCode(lock) {
  codeLocked = !!lock; ceTa.readOnly = codeLocked; ceEx.disabled = codeLocked;
  codePanel.classList.toggle('locked', codeLocked);
}
// shade code lines [from, to] (1-based) in the editor, or clear with null
function markLines(range) { markRange = range && range.length ? [Math.min(...range), Math.max(...range)] : null; placeMark(); }
function placeMark() {
  ceMark.style.display = markRange ? 'block' : 'none'; if (!markRange) return;
  ceMark.style.top = (10 + (markRange[0] - 1) * 20 - ceTa.scrollTop) + 'px';
  ceMark.style.height = ((markRange[1] - markRange[0] + 1) * 20) + 'px';
}
ceTa.addEventListener('scroll', placeMark);
function openCode(open = true) { if (codeOpen !== open) toggleCode(open); }

changed();
  /* ======================== original script ends ======================== */

  return {
    stop, serialize, load, snapshot, toast, isEmpty: () => !plates.length && !modules.length && !cables.length,
    tutor: { inspect, highlightPart, pointAt, setCode, lockCode, markLines, openCode },
  };

  function stop() {
    renderer.setAnimationLoop(null);
    resizeObs.disconnect();
    offs.forEach(off => off());
    controls.dispose();
    for (const m of modules) {
      try { m.hum?.o.stop(); } catch {}
      try { m.snd?.o.stop(); } catch {}
    }
    try { actx?.close(); } catch {}
    document.body.classList.remove('coding');
    delete window.__sgDemo; delete window.__sgShow;
    document.body.classList.remove('showcase');
    document.querySelectorAll('.dragchip').forEach(c => c.remove());
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
