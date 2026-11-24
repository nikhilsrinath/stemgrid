'use client';

/* The problem, told in one scroll-scrubbed 3D scene.
     1. A robotics-kit box rises in while the price comes up.
     2. The box breaks into thousands of coloured dots that fly, in a staggered arc, into the plate
        holes of a globe rising from below. Each dot IS a hole: the morph is one point cloud
        moving between two layouts, so nothing pops.
     3. The globe tells the rest: holes light red (like the Quark's LED) where kids can build,
        India gets outlined, the lights sputter out, then a red wave from India lights the world.
     4. The globe dives at the camera and a red swirl (Swirl.tsx) opens from its centre into the
        next section.
   One progress value p (0..1, how far the pinned track has scrolled) drives all of it.
   three.js loads only when the section gets close, and renders only while it is on screen.
   The canvas covers the whole stage, so the globe is never cut off by a column edge; the camera
   is offset so the ball sits over the .globe placeholder. */

import { useEffect, useRef } from 'react';
import { MASK, MASK_H, MASK_W } from './worldMask';
import s from './problem.module.css';

const BOX_IMG = '/assets/landing/spike-box.webp';
const BOX_ASPECT = 1400 / 958;

type Beat = { at: [number, number]; stat?: { to: number; count: [number, number]; fmt: (v: number, done: boolean) => string } };

/* The copy lives in the JSX below; this only holds what the scroll needs. */
const BEATS: Beat[] = [
  { at: [0, 0.1] },
  { at: [0.1, 0.34], stat: { to: 400, count: [0.1, 0.19], fmt: v => `$${Math.round(v)}` } },
  { at: [0.34, 0.47], stat: { to: 36, count: [0.36, 0.45], fmt: v => `${Math.round(v)}%` } },
  { at: [0.47, 0.61], stat: { to: 147, count: [0.48, 0.55], fmt: v => `1 in ${Math.max(1, Math.round(v))}` } },
  { at: [0.61, 0.74] },
  { at: [0.74, 0.9], stat: { to: 6, count: [0.76, 0.84], fmt: (v, done) => (done ? '6 billion' : `${v.toFixed(1)} billion`) } },
];

/* Timeline of the 3D scene, in p */
const BOX_IN: [number, number] = [0.02, 0.1];      // the box rises in
const MORPH: [number, number] = [0.25, 0.41];      // box -> dots -> globe holes
const RISE: [number, number] = [0.25, 0.39];       // the globe comes up from below
const BALL: [number, number] = [0.3, 0.4];         // the white ball itself fades/grows in
const FADE: [number, number] = [0.955, 0.995];     // canvas fades out under the swirl

/* Globe keyframes: where it faces (lon/lat, degrees), the share of holes lit, how much India is
   outlined, how much the lit holes sputter, the radius of the final wave (radians from India),
   and the zoom. */
type Key = [p: number, lon: number, lat: number, frac: number, india: number, flicker: number, wave: number, zoom: number];
const KEYS: Key[] = [
  [0.0, 8, 18, 0, 0, 0, 0, 1],
  [0.3, 8, 18, 0, 0, 0, 0, 1],
  [0.4, 26, 18, 0, 0, 0, 0, 1],
  [0.45, 40, 16, 0.36, 0, 0, 0, 1],
  [0.48, 48, 16, 0.36, 0, 0, 0, 1],
  [0.54, 79, 22, 0.0068, 1, 0, 0, 1.1],
  [0.59, 81, 22, 0.0068, 1, 0, 0, 1.1],
  [0.65, 96, 16, 0.14, 0, 1, 0, 1],
  [0.72, 104, 16, 0.025, 0, 1, 0, 1],
  [0.77, 80, 20, 0, 0, 0, 0, 1.04],
  [0.87, -12, 14, 0, 0, 0, 3.4, 1],
  [0.9, -14, 14, 0, 0, 0, 3.4, 1],
  [1.0, -26, 14, 0, 0, 0, 3.4, 2.7],
];
const INDIA: [number, number] = [22, 79];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const span = (p: number, [a, b]: [number, number]) => clamp((p - a) / (b - a));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function keyAt(p: number): Key {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smooth(clamp((p - a[0]) / (b[0] - a[0])));
  return a.map((v, j) => v + (b[j] - v) * t) as Key;
}

/* lat/lon (degrees) to a point on the unit sphere, lon 0 facing +z */
function onSphere(lat: number, lon: number): [number, number, number] {
  const f = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180;
  return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)];
}

const rand = (i: number, k: number) => { const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return h - Math.floor(h); };

/* Land holes: a Fibonacci sphere, kept where the baked mask says land. */
function landHoles(n: number) {
  const bytes = Uint8Array.from(atob(MASK), c => c.charCodeAt(0));
  const cell = (lat: number, lon: number) => {
    const r = Math.min(MASK_H - 1, Math.floor(90 - lat)), c = Math.min(MASK_W - 1, Math.floor(lon + 180));
    const i = r * MASK_W + c;
    return (bytes[i >> 2] >> ((i & 3) * 2)) & 3;
  };
  const out: { x: number; y: number; z: number; lon: number; seed: number; india: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const lat = (Math.asin(y) * 180) / Math.PI;
    let lon = ((i * golden * 180) / Math.PI) % 360;
    if (lon > 180) lon -= 360;
    const v = cell(lat, lon);
    if (!v) continue;
    const [x, yy, z] = onSphere(lat, lon);
    out.push({ x: x * 1.004, y: yy * 1.004, z: z * 1.004, lon, seed: rand(i, 1), india: v === 2 ? 1 : 0 });
  }
  return out;
}

/* Where each hole starts: a mosaic of the box art on the front face, the rest on the box's top and
   side. Rows of the picture go to bands of latitude, top to top, so the flight reads as one flow. */
function boxStarts(holes: ReturnType<typeof landHoles>, img: HTMLImageElement, BW: number, BH: number, BD: number) {
  const H = holes.length;
  const rows = Math.floor(Math.sqrt((H * 0.9) / BOX_ASPECT)), cols = Math.floor(rows * BOX_ASPECT);
  const cv = document.createElement('canvas');
  cv.width = cols; cv.height = rows;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, 0, 0, cols, rows);
  const px = cx.getImageData(0, 0, cols, rows).data;

  // pick which holes start on the front (sorted) and which on the box's other faces (scattered)
  const nFront = rows * cols;
  const all = holes.map((_, i) => i).sort((a, b) => rand(a, 7) - rand(b, 7));
  const front = all.slice(0, nFront), rest = all.slice(nFront);
  front.sort((a, b) => holes[b].y - holes[a].y);
  // within each picture row, order by longitude so left-right roughly carries over too
  for (let r = 0; r < rows; r++) {
    const seg = front.slice(r * cols, (r + 1) * cols).sort((a, b) => holes[a].lon - holes[b].lon);
    seg.forEach((v, k) => (front[r * cols + k] = v));
  }

  const box = new Float32Array(H * 3), col = new Float32Array(H * 3), delay = new Float32Array(H), bulge = new Float32Array(H * 3);
  const put = (i: number, x: number, y: number, z: number, c: [number, number, number], yN: number) => {
    box.set([x, y, z], i * 3); col.set(c, i * 3);
    delay[i] = 0.18 * (1 - yN) + 0.26 * rand(i, 3);               // the top of the box leaves first
    const a = rand(i, 4) * Math.PI * 2, u = rand(i, 5) * 2 - 1, m = 0.35 + 0.35 * rand(i, 6);
    bulge.set([Math.cos(a) * Math.sqrt(1 - u * u) * m, u * m * 0.6, 0.55 + 0.4 * rand(i, 8)], i * 3);
  };
  front.forEach((hi, k) => {
    const r = Math.floor(k / cols), c = k % cols, q = (r * cols + c) * 4;
    put(hi, -BW / 2 + ((c + 0.5) * BW) / cols, BH / 2 - ((r + 0.5) * BH) / rows, BD / 2 + 0.004,
      [px[q] / 255, px[q + 1] / 255, px[q + 2] / 255], 1 - r / rows);
  });
  const YEL: [number, number, number] = [1, 0.84, 0.05], BLK: [number, number, number] = [0.07, 0.07, 0.08];
  rest.forEach((hi, k) => {
    const u = rand(hi, 9), v = rand(hi, 10);
    if (k % 2) put(hi, -BW / 2 + u * BW, BH / 2 + 0.004, -BD / 2 + v * BD, u < 0.34 ? BLK : YEL, 1);      // top
    else put(hi, BW / 2 + 0.004, -BH / 2 + u * BH, -BD / 2 + v * BD, YEL, u);                          // right side
  });
  return { box, col, delay, bulge };
}

const VERT = /* glsl */ `
  attribute float aSeed, aIndia, aDelay;
  attribute vec3 aBox, aCol, aBulge;
  uniform float uFrac, uIndia, uFlicker, uWave, uTime, uSize, uScale, uMorph;
  uniform vec3 uOrigin;
  uniform mat4 uBoxM, uGlobeM;
  varying float vLit, vFront, vFace, vIndia, vE;
  varying vec3 vCol;
  float hash(float a, float b) { return fract(sin(a * 91.7 + b * 47.3) * 43758.5453); }
  void main() {
    // this dot's own moment in the morph
    float e = clamp((uMorph - aDelay) / 0.56, 0.0, 1.0);
    e = e * e * (3.0 - 2.0 * e);
    vec3 A = (uBoxM * vec4(aBox, 1.0)).xyz;
    vec3 B = (uGlobeM * vec4(position, 1.0)).xyz;
    vec3 P = mix(A, B, e) + aBulge * sin(3.14159 * e);
    vec4 mv = viewMatrix * vec4(P, 1.0);

    vec3 n = normalize(position);
    vec3 nv = normalize(mat3(viewMatrix) * normalize(mat3(uGlobeM) * n));
    vFace = mix(1.0, dot(nv, normalize(-mv.xyz)), e);
    vE = e;
    vCol = aCol;

    float lit = step(aSeed, uFrac);
    float on = step(0.45, hash(aSeed, floor(uTime * 9.0 + aSeed * 7.0)));   // sputtering
    lit *= mix(1.0, on, uFlicker);
    float ang = acos(clamp(dot(n, uOrigin), -1.0, 1.0));
    float wave = 1.0 - smoothstep(uWave - 0.22, uWave, ang);
    vFront = uWave > 0.001 ? exp(-pow((ang - uWave + 0.08) / 0.07, 2.0)) : 0.0;
    vLit = max(lit, wave);
    vIndia = aIndia * uIndia;

    gl_PointSize = uSize * uScale / -mv.z * mix(1.15, 1.0, e);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uShow;
  varying float vLit, vFront, vFace, vIndia, vE;
  varying vec3 vCol;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float face = smoothstep(0.0, 0.28, vFace);
    if (face <= 0.0) discard;

    // an empty plate hole: grey with a darker inner edge; India's holes go ink to outline it
    vec3 empty = mix(vec3(0.80, 0.80, 0.83), vec3(0.62, 0.62, 0.67), smoothstep(0.1, 0.4, r));
    empty = mix(empty, vec3(0.16, 0.16, 0.2), vIndia);
    // a lit hole: hot centre, red body, soft glow spilling onto the plate
    vec3 led = mix(vec3(1.0, 0.86, 0.8), vec3(0.98, 0.12, 0.16), smoothstep(0.0, 0.34, r));
    led = mix(led, vec3(1.0, 0.95, 0.85), vFront * 0.8);
    float glow = exp(-r * r * 5.0) * (0.55 + vFront * 0.4);

    // while it flies, a dot keeps the colour of the bit of box it came from
    float landed = smoothstep(0.55, 1.0, vE);
    vec3 hole = mix(empty, led, vLit);
    vec3 col = mix(vCol, hole, landed);
    float dotR = mix(0.48, 0.42, landed);
    float body = 1.0 - smoothstep(dotR - 0.06, dotR, r);
    float a = max(body, glow * vLit * landed);
    vec3 outCol = body > 0.5 ? col : vec3(1.0, 0.16, 0.2);
    gl_FragColor = vec4(outCol, a * face * uShow);
  }
`;

type Globe = { render: (p: number, t: number) => void; dispose: () => void };

export default function Problem() {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const place = useRef<HTMLDivElement>(null);
  const beats = useRef<(HTMLDivElement | null)[]>([]);
  const stats = useRef<(HTMLElement | null)[]>([]);
  const rail = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const tr = track.current!, st = stage.current!, pl = place.current!;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = -1, raf = 0, last = 0, on = false, dead = false;
    let globe: Globe | null = null;

    const target = () => {
      const r = tr.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight));
    };

    const paint = (p: number) => {
      tr.style.setProperty('--p', p.toFixed(4));
      const F = 0.03;
      let active = 0;
      BEATS.forEach((b, i) => {
        const [a, z] = b.at;
        const v = Math.min(i === 0 ? 1 : clamp((p - a) / F), clamp((z - p) / F));
        const el = beats.current[i];
        if (el) {
          el.style.setProperty('--v', v.toFixed(3));
          el.style.setProperty('--dir', p < (a + z) / 2 ? '1' : '-1');
          el.style.visibility = v > 0.002 ? 'visible' : 'hidden';
        }
        if (p >= a) active = i;
        const sv = b.stat, out = stats.current[i];
        if (sv && out) {
          const t = span(p, sv.count);
          const txt = sv.fmt(sv.to * easeOut(t), t >= 1);
          if (out.textContent !== txt) out.textContent = txt;
        }
      });
      rail.current?.querySelectorAll('li').forEach((li, i) => li.toggleAttribute('data-on', i <= active));
    };

    const loop = (now: number) => {
      raf = on ? requestAnimationFrame(loop) : 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      const t = target();
      cur = cur < 0 || still ? t : cur + (t - cur) * (1 - Math.exp(-dt * 14));
      paint(cur);
      globe?.render(cur, still ? 0 : now / 1000);
    };

    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    }, { rootMargin: '300px 0px' });
    io.observe(tr);
    paint(target());

    /* the 3D scene, built once the section is close */
    const loadIo = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      loadIo.disconnect();
      const img = new Image();
      img.src = BOX_IMG;
      const [THREE] = await Promise.all([
        // @ts-expect-error three ships no types here (the engine is plain JS); keep it pinned at 0.160
        import('three'),
        img.decode(),
      ]);
      if (dead) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = s.canvas;
      st.prepend(renderer.domElement);
      const scene = new THREE.Scene();
      const FOV = 30, TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xcfcfd8, 1.9));
      const sun = new THREE.DirectionalLight(0xffffff, 1.5);
      sun.position.set(-3, 4, 5);
      scene.add(sun);

      /* the kit box */
      const BW = 1.7, BH = BW / BOX_ASPECT, BD = 0.5;
      const art = new THREE.Texture(img);
      art.colorSpace = THREE.SRGBColorSpace;
      art.anisotropy = 8;
      art.needsUpdate = true;
      const side = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, transparent: true });
      const boxMats = [
        side(0xffd20a), side(0x111114), side(0xffd20a), side(0x19b5d6),       // +x, -x, +y, -y
        new THREE.MeshStandardMaterial({ map: art, roughness: 0.42, transparent: true }),   // front
        side(0x111114),
      ];
      const boxG = new THREE.Group();
      const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), boxMats);
      boxG.add(boxMesh);
      scene.add(boxG);

      /* the globe: a white ball, and the holes (which start life as the box) */
      const world = new THREE.Group();
      world.rotation.order = 'XYZ';      // yaw (Y) first, then tilt (X)
      scene.add(world);
      const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0, transparent: true });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), ballMat);
      world.add(ball);

      const holes = landHoles(36000);
      const starts = boxStarts(holes, img, BW, BH, BD);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(holes.flatMap(h => [h.x, h.y, h.z])), 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(holes.map(h => h.seed)), 1));
      geo.setAttribute('aIndia', new THREE.BufferAttribute(new Float32Array(holes.map(h => h.india)), 1));
      geo.setAttribute('aBox', new THREE.BufferAttribute(starts.box, 3));
      geo.setAttribute('aCol', new THREE.BufferAttribute(starts.col, 3));
      geo.setAttribute('aDelay', new THREE.BufferAttribute(starts.delay, 1));
      geo.setAttribute('aBulge', new THREE.BufferAttribute(starts.bulge, 3));
      const uniforms = {
        uFrac: { value: 0 }, uIndia: { value: 0 }, uFlicker: { value: 0 }, uWave: { value: 0 },
        uTime: { value: 0 }, uSize: { value: 0.03 }, uScale: { value: 800 }, uMorph: { value: 0 }, uShow: { value: 0 },
        uOrigin: { value: new THREE.Vector3(...onSphere(...INDIA)) },
        uBoxM: { value: new THREE.Matrix4() }, uGlobeM: { value: new THREE.Matrix4() },
      };
      const dots = new THREE.Points(geo, new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false,
      }));
      dots.frustumCulled = false;      // positions are worked out in the shader
      dots.renderOrder = 1;
      scene.add(dots);

      /* size: on desktop the ball fills 76% of the placeholder's smaller side; the canvas is the whole stage */
      let dist = 4.6;
      const resize = () => {
        const W = st.clientWidth, H = st.clientHeight;
        if (!W || !H) return;
        const sr = st.getBoundingClientRect(), pr = pl.getBoundingClientRect();
        const gx = pr.left - sr.left + pr.width / 2, gy = pr.top - sr.top + pr.height / 2;
        // desktop: 76% of the placeholder's smaller side. Stacked (phones, tablets): fill the screen's
        // width and let the ball run to the slot's edges; the canvas covers the stage, so nothing clips
        const stacked = matchMedia('(max-width: 1056px)').matches;
        const R = stacked ? Math.min(0.47 * W, 0.53 * pr.height) : 0.38 * Math.min(pr.width, pr.height);
        const dpr = Math.min(devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.setViewOffset(W, H, W / 2 - gx, H / 2 - gy, W, H);
        dist = H / (2 * TAN * R);
        camera.updateProjectionMatrix();
        uniforms.uScale.value = (H * dpr) / (2 * TAN);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(st); ro.observe(pl);
      resize();

      const D = Math.PI / 180;
      globe = {
        render: (p, t) => {
          const [, lon, lat, frac, india, flicker, wave, zoom] = keyAt(p);

          // the box: rises in turning, then holds still while it breaks apart
          const bp = Math.min(p, MORPH[0]);
          const bin = smooth(span(bp, BOX_IN));
          boxG.position.set(0, mix(-2.6, 0, bin), 0);
          boxG.rotation.set(mix(0.6, 0.2, bin), mix(-1.5, -0.5, bin) + 0.22 * span(bp, [BOX_IN[1], MORPH[0]]), mix(0.12, 0.03, bin));
          boxG.updateMatrixWorld();
          uniforms.uBoxM.value.copy(boxG.matrixWorld);

          const m = span(p, MORPH);
          const show = smooth(clamp(m / 0.08));
          uniforms.uMorph.value = m;
          uniforms.uShow.value = show;
          boxG.visible = show < 1 && bin > 0;
          boxMats.forEach(mt => (mt.opacity = 1 - show));

          // the globe comes up from below while the dots fly in
          world.position.y = mix(-2.5, 0, smooth(span(p, RISE)));
          world.rotation.y = -lon * D;
          world.rotation.x = lat * D;
          world.updateMatrixWorld();
          uniforms.uGlobeM.value.copy(world.matrixWorld);
          const b = smooth(span(p, BALL));
          ball.visible = b > 0;
          ball.scale.setScalar(mix(0.55, 1, b));
          ballMat.opacity = b;
          ballMat.depthWrite = b > 0.98;
          dots.visible = show > 0;

          camera.position.set(0, 0, dist / zoom);
          camera.lookAt(0, 0, 0);
          uniforms.uFrac.value = frac;
          uniforms.uIndia.value = india;
          uniforms.uFlicker.value = still ? 0 : flicker;
          uniforms.uWave.value = wave;
          uniforms.uTime.value = t;
          renderer.domElement.style.opacity = String(1 - smooth(span(p, FADE)));
          renderer.render(scene, camera);
        },
        dispose: () => {
          ro.disconnect();
          geo.dispose(); dots.material.dispose();
          ball.geometry.dispose(); ballMat.dispose();
          boxMesh.geometry.dispose(); boxMats.forEach(mt => mt.dispose()); art.dispose();
          renderer.dispose(); renderer.domElement.remove();
        },
      };
      globe.render(cur < 0 ? target() : cur, 0);
    }, { rootMargin: '800px 0px' });
    loadIo.observe(tr);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      io.disconnect(); loadIo.disconnect();
      globe?.dispose();
    };
  }, []);

  const beat = (i: number) => (el: HTMLDivElement | null) => { beats.current[i] = el; };
  const stat = (i: number) => (el: HTMLElement | null) => { stats.current[i] = el; };

  return (
    <section className={s.problem} id="problem" aria-labelledby="problem-h">
      <div className={s.track} ref={track}>
        <div className={s.stage} ref={stage}>
          <div className={s.story}>
            <div className={s.beat} ref={beat(0)}>
              <h2 id="problem-h" className={s.lead}>Most kids never get to build real electronics.</h2>
              <p className={s.body}>
                Not because they aren’t curious. Electronics and robotics kits are expensive, fragile, and
                stuck in a handful of labs. Here is how wide that gap is.
              </p>
            </div>

            <div className={s.beat} ref={beat(1)}>
              <p className={s.stat} ref={stat(1)} aria-label="$400">$0</p>
              <p className={s.body}>
                for one LEGO Education SPIKE Prime set, made to be shared by two students. Add-ons like the
                Expansion Set cost extra, and kitting out a class of 30 runs to about $6,800.
              </p>
              <p className={s.src}>LEGO Education US list prices, 2025</p>
            </div>

            <div className={s.beat} ref={beat(2)}>
              <p className={s.stat} ref={stat(2)} aria-label="36%">0%</p>
              <p className={s.body}>
                of fourth graders worldwide go to a school with a science lab. Nearly two in three learn
                circuits from a textbook, if at all.
              </p>
              <p className={s.src}>IEA TIMSS 2019, average across participating countries</p>
            </div>

            <div className={s.beat} ref={beat(3)}>
              <p className={s.stat} ref={stat(3)} aria-label="1 in 147">1 in 1</p>
              <p className={s.body}>
                schools in India has an Atal Tinkering Lab, after nearly a decade of building them: about 10,000
                labs for 14.7 lakh schools.
              </p>
              <p className={s.src}>Atal Innovation Mission (Oct 2025) and UDISE+ 2024–25</p>
            </div>

            <div className={s.beat} ref={beat(4)}>
              <h3 className={s.lead}>And where kits do exist, they’re still a box of parts.</h3>
              <ul className={s.limits}>
                <li>Parts burn out, snap and go missing.</li>
                <li>One wrong wire can fry a board.</li>
                <li>The kit stays locked in the lab after the bell.</li>
                <li>Every refill is a new order and a long wait.</li>
              </ul>
            </div>

            <div className={`${s.beat} ${s.turn}`} ref={beat(5)}>
              <p className={s.stat} ref={stat(5)} aria-label="6 billion">0.0 billion</p>
              <p className={s.body}>
                people are online today. The screen is already there, so we’re putting the whole bench on it: the
                real modules, cables and code, free in any browser. Anyone can learn it, build it and ship it.
              </p>
              <p className={s.src}>ITU Facts and Figures 2025</p>
            </div>
          </div>

          <div className={s.globe} ref={place} data-globe aria-hidden="true" />

          <ol className={s.rail} ref={rail} aria-hidden="true">
            {BEATS.map((_, i) => <li key={i} />)}
          </ol>
        </div>
      </div>
    </section>
  );
}
