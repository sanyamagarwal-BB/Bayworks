/* ============================================================================
   BAYWORKS — Live Commercial Hub
   Cinematic daytime 3D city for the hero. Towers rise on load, traffic flows,
   the camera drifts. Built on Three.js + GSAP (already in package.json).

   Safe by design:
   • Everything wrapped in try/catch — on any failure the CSS gradient shows.
   • Honors prefers-reduced-motion (renders a single still frame).
   • Pauses when the hero scrolls off-screen or the tab is hidden.
   • Auto-scales density / pixel ratio on small or low-power devices.
   ========================================================================== */

import * as THREE from 'three';
import { gsap } from 'gsap';

// ── Theme palette ──────────────────────────────────────────────
const SKY_TOP    = new THREE.Color('#9fd0ff'); // upper sky
const SKY_BOTTOM = new THREE.Color('#eaf4ff'); // hazy horizon
const FOG_COLOR  = new THREE.Color('#dcebf7');
const GROUND     = new THREE.Color('#e8eef3');
const EMERALD    = new THREE.Color('#059669');
const EMERALD_LT = new THREE.Color('#4ade80');

// Tower facade tints (white / glass / occasional emerald accent)
const FACADE_TINTS = [
  new THREE.Color('#ffffff'),
  new THREE.Color('#eef4f8'),
  new THREE.Color('#dfeaf2'),
  new THREE.Color('#cfe0ec'),
  new THREE.Color('#bcd6e6'),
];

export function initCity(canvas) {
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile     = window.matchMedia('(max-width: 768px)').matches;

  // Fidelity: Max Cinematic on desktop, auto-scaled down on phones.
  const GRID   = isMobile ? 14 : 24;   // towers per side  (14²≈196 / 24²≈576)
  const PITCH  = 105;                   // cell spacing (incl. street)
  const CARS   = isMobile ? 90 : 420;   // traffic count
  const USE_BLOOM = !isMobile && !reduceMotion;

  let renderer, scene, camera, composer, raf = 0, running = false;
  let buildings, cars, carData = [], buildAt = [], buildDur = [], targetY = [];
  const clock = new THREE.Clock();
  const span = GRID * PITCH;           // full city width

  try {
    // ── Renderer ──────────────────────────────────────────────
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(FOG_COLOR, span * 0.55, span * 1.7);

    camera = new THREE.PerspectiveCamera(46, (canvas.clientWidth || 1) / (canvas.clientHeight || 1), 1, span * 4);

    // ── Gradient sky dome ─────────────────────────────────────
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(span * 2.4, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { top: { value: SKY_TOP }, bottom: { value: SKY_BOTTOM } },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom;
          void main(){ float h = clamp((normalize(vP).y + 0.15) / 0.9, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }`,
      })
    );
    scene.add(sky);

    // ── Environment reflections (glass sheen) ─────────────────
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(sky.clone());
    scene.environment = pmrem.fromScene(envScene).texture;

    // ── Lighting ──────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcdd8e2, 1.05));
    const sun = new THREE.DirectionalLight(0xfff6e8, 1.5);
    sun.position.set(span * 0.5, span * 0.7, span * 0.35);
    scene.add(sun);

    // ── Ground ────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(span * 3, span * 3),
      new THREE.MeshStandardMaterial({ color: GROUND, roughness: 0.95, metalness: 0.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // ── Window facade texture (procedural) ────────────────────
    const tex = makeWindowTexture();

    // ── Buildings (one InstancedMesh, per-instance color + scale)
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0); // pivot at base so scaling grows upward
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.32, metalness: 0.55,
      envMapIntensity: 1.15, color: 0xffffff,
    });
    const count = GRID * GRID;
    buildings = new THREE.InstancedMesh(box, mat, count);
    buildings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const half = (GRID - 1) / 2;
    let i = 0;
    for (let gx = 0; gx < GRID; gx++) {
      for (let gz = 0; gz < GRID; gz++) {
        const x = (gx - half) * PITCH;
        const z = (gz - half) * PITCH;
        // distance 0..1 from downtown core (taller in the middle)
        const d = Math.hypot(gx - half, gz - half) / half;
        const core = 1 - Math.min(d, 1);
        const footprint = PITCH * (0.42 + Math.random() * 0.18);
        const h = 30 + Math.pow(Math.random(), 1.6) * 90 + core * core * 360;

        targetY[i] = h;
        pos.set(x, 0, z);
        scl.set(footprint, 0.001, footprint); // start flat → animate up
        m.compose(pos, q, scl);
        buildings.setMatrixAt(i, m);

        // mostly cool glass; ~7% emerald accent towers
        const c = Math.random() < 0.07
          ? EMERALD.clone().lerp(EMERALD_LT, Math.random())
          : FACADE_TINTS[(Math.random() * FACADE_TINTS.length) | 0].clone();
        buildings.setColorAt(i, c);

        // staggered "construction" ripple outward from the core
        buildAt[i]  = (reduceMotion ? 0 : d * 1.4 + Math.random() * 0.5);
        buildDur[i] = 1.1 + Math.random() * 0.9;
        i++;
      }
    }
    buildings.instanceColor.needsUpdate = true;
    scene.add(buildings);
    // keep footprint for the rise animation
    buildings.userData.footprints = [];
    for (let k = 0; k < count; k++) {
      buildings.getMatrixAt(k, m); m.decompose(pos, q, scl);
      buildings.userData.footprints[k] = scl.x;
    }

    // ── Traffic (instanced cars flowing along the avenues) ────
    const carGeo = new THREE.BoxGeometry(6, 3, 12);
    const carMat = new THREE.MeshStandardMaterial({ vertexColors: false, roughness: 0.4, metalness: 0.3, emissive: 0x000000 });
    cars = new THREE.InstancedMesh(carGeo, carMat, CARS);
    const CAR_COLORS = [0xffffff, 0xdfe6ec, 0x222831, 0x059669, 0xcc3344, 0x3b7dd8];
    for (let c = 0; c < CARS; c++) {
      const onX = Math.random() < 0.5;            // travels along X or Z street
      const lane = (Math.floor(Math.random() * GRID) - half) * PITCH + (Math.random() < 0.5 ? -22 : 22);
      const dir = Math.random() < 0.5 ? 1 : -1;
      carData.push({
        onX, lane, dir,
        t: (Math.random() - 0.5) * span * 1.1,
        speed: 60 + Math.random() * 90,
      });
      cars.setColorAt(c, new THREE.Color(CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0]));
    }
    cars.instanceColor && (cars.instanceColor.needsUpdate = true);
    scene.add(cars);

    // ── Camera framing ────────────────────────────────────────
    camera.position.set(span * 0.42, span * 0.30, span * 0.52);
    camera.lookAt(0, 80, 0);

    // ── Build-up animation timeline ──────────────────────────
    const state = { t: 0 };
    if (!reduceMotion) {
      gsap.to(state, { t: 1, duration: 1, ease: 'none',
        onUpdate: () => updateBuildings(state.t * 4.2) });
      gsap.fromTo(camera.position,
        { x: span * 0.62, y: span * 0.16, z: span * 0.72 },
        { x: span * 0.42, y: span * 0.30, z: span * 0.52, duration: 4.5, ease: 'power2.out' });
    } else {
      updateBuildings(999); // fully built, single frame
    }

    function updateBuildings(now) {
      for (let k = 0; k < count; k++) {
        const p = THREE.MathUtils.clamp((now - buildAt[k]) / buildDur[k], 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const fp = buildings.userData.footprints[k];
        buildings.getMatrixAt(k, m); m.decompose(pos, q, scl);
        scl.set(fp, Math.max(0.001, targetY[k] * eased), fp);
        m.compose(pos, q, scl);
        buildings.setMatrixAt(k, m);
      }
      buildings.instanceMatrix.needsUpdate = true;
    }

    // ── Per-frame loop ────────────────────────────────────────
    const cm = new THREE.Matrix4();
    const cq = new THREE.Quaternion();
    const cscl = new THREE.Vector3(1, 1, 1);
    const cpos = new THREE.Vector3();
    function frame() {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // gentle drone drift
      const r = span * 0.66, a = t * 0.025;
      camera.position.x = Math.sin(a) * r;
      camera.position.z = Math.cos(a) * r;
      camera.position.y = span * 0.30 + Math.sin(t * 0.18) * span * 0.02;
      camera.lookAt(0, 90, 0);

      // traffic
      const limit = span * 0.55;
      for (let c = 0; c < CARS; c++) {
        const d = carData[c];
        d.t += d.speed * d.dir * dt;
        if (d.t > limit) d.t = -limit; else if (d.t < -limit) d.t = limit;
        if (d.onX) { cpos.set(d.t, 2, d.lane); cq.setFromAxisAngle(Y, Math.PI / 2); }
        else       { cpos.set(d.lane, 2, d.t); cq.identity(); }
        cm.compose(cpos, cq, cscl);
        cars.setMatrixAt(c, cm);
      }
      cars.instanceMatrix.needsUpdate = true;

      render();
    }

    function render() { composer ? composer.render() : renderer.render(scene, camera); }

    const Y = new THREE.Vector3(0, 1, 0);

    // ── Bloom (loaded async so a failure never blocks the city)
    if (USE_BLOOM) {
      Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
      ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }]) => {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloom = new UnrealBloomPass(
          new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), 0.55, 0.7, 0.9);
        composer.addPass(bloom);
        composer.setSize(canvas.clientWidth, canvas.clientHeight);
      }).catch(() => { composer = null; });
    }

    // ── Resize ────────────────────────────────────────────────
    function resize() {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer && composer.setSize(w, h);
    }
    window.addEventListener('resize', resize, { passive: true });

    // ── Lifecycle: pause when off-screen / tab hidden ─────────
    function start() { if (!running && !reduceMotion) { running = true; clock.start(); frame(); } }
    function stop()  { if (running) { running = false; cancelAnimationFrame(raf); } }

    if (reduceMotion) {
      render(); // one still frame, no loop
    } else {
      const io = new IntersectionObserver(
        (e) => (e[0].isIntersecting ? start() : stop()), { threshold: 0.02 });
      io.observe(canvas);
      document.addEventListener('visibilitychange',
        () => (document.hidden ? stop() : start()));
      start();
    }

    // reveal canvas once the first frame is painted
    requestAnimationFrame(() => canvas.classList.add('is-ready'));

  } catch (err) {
    console.warn('[city] 3D scene unavailable, falling back to gradient:', err);
    canvas.style.display = 'none';
  }
}

/* Procedural window-grid facade texture (white wall + cool glass windows) */
function makeWindowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f8fb'; x.fillRect(0, 0, c.width, c.height);
  const cols = 5, rows = 12, pad = 4;
  const gw = (c.width - pad * (cols + 1)) / cols;
  const gh = (c.height - pad * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const shade = 150 + Math.floor(Math.random() * 80);
      x.fillStyle = `rgb(${shade - 30}, ${shade - 5}, ${shade + 20})`;
      x.fillRect(pad + col * (gw + pad), pad + r * (gh + pad), gw, gh);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
