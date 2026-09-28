// ===== 3D SAMURAI SCENE =====
// A real samurai model (assets/samurai.glb) stands inside an ink-wash
// mountain panorama. Each page section is a drone "shot" aimed at a part of
// the samurai (face, katana on the back, hands, armor...). Scrolling flies the
// camera between shots along an orbit around the figure, pulling out and
// swooping back in during each transition, banking into the turns.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL_URL = 'assets/samurai.glb';
const MODEL_HEIGHT = 3.2;
// Extra rotation (degrees) so the model faces +Z, if it doesn't out of the box.
const MODEL_YAW_DEG = 0;
// Add ?anchors to the URL to see a marker on each detected body part.
const DEBUG_ANCHORS = new URLSearchParams(window.location.search).has('anchors');

// One shot per section, in page order. `az` is the camera's angle around the
// samurai (0 = in front, 90 = its left side, 180 = behind), `el` its angle
// above the target, `dist` how far it hovers from the target. `side` places
// the subject on screen: positive = right half (content panel on the left),
// negative = left half.
const SHOTS = [
  { id: 'home', anchor: 'body', az: 18, el: -4, dist: 7.6, fov: 38, side: 0.24 },
  { id: 'about', anchor: 'head', az: 28, el: 4, dist: 2.1, fov: 34, side: 0.24 },
  { id: 'experience', anchor: 'back', az: 158, el: 14, dist: 2.6, fov: 38, side: -0.24 },
  { id: 'projects', anchor: 'rightHand', az: -58, el: 12, dist: 1.8, fov: 36, side: 0.24 },
  { id: 'skills', anchor: 'chest', az: 32, el: 2, dist: 2.4, fov: 36, side: -0.24 },
  { id: 'education', anchor: 'crest', az: 12, el: 58, dist: 2.4, fov: 38, side: 0.24 },
  { id: 'contact', anchor: 'body', az: -24, el: 8, dist: 10, fov: 40, side: -0.2 },
];

const PAPER = 0xefe4c9;
const PINK = 0xd9709a;

const canvas = document.getElementById('bg-canvas');

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function hideLoader() {
  if (window.__hideLoader) window.__hideLoader();
}

if (!canvas || !supportsWebGL()) {
  document.body.classList.add('no-webgl');
  hideLoader();
} else {
  runScene();
}

function runScene() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEG = Math.PI / 180;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PAPER, 18, 60);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 200);

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a7a66, 0.8));

  const keyLight = new THREE.DirectionalLight(0xfff0dd, 2.0);
  keyLight.position.set(4, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -3;
  keyLight.shadow.camera.right = 3;
  keyLight.shadow.camera.top = 4.5;
  keyLight.shadow.camera.bottom = -1;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 20;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  // Pink rim light from behind separates the figure from the pale backdrop.
  const rimLight = new THREE.DirectionalLight(PINK, 1.6);
  rimLight.position.set(-4, 4, -5);
  scene.add(rimLight);

  const texLoader = new THREE.TextureLoader();
  const samurai = new THREE.Group();
  scene.add(samurai);

  buildPanorama();
  buildGround();
  const petals = buildPetals();

  // ----- Anchors: named points on the samurai the camera can aim at -----
  const anchorFns = {};
  const modelSize = new THREE.Vector3(1.4, MODEL_HEIGHT, 0.9);
  setFallbackAnchors();

  function staticAnchor(x, y, z) {
    const local = new THREE.Vector3(x, y, z);
    return (out) => samurai.localToWorld(out.copy(local));
  }

  function boneAnchor(bone, x = 0, y = 0, z = 0) {
    const offset = new THREE.Vector3(x, y, z);
    return (out) => bone.getWorldPosition(out).add(offset);
  }

  // Reads the model's actual geometry to locate body parts, so any unrigged
  // mesh works (assumes it faces +Z, so its right hand is on -X).
  function setShapeAnchors(model) {
    const H = MODEL_HEIGHT;
    const pts = [];
    const v = new THREE.Vector3();
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      const pos = o.isMesh && o.geometry && o.geometry.attributes.position;
      if (!pos) return;
      const step = Math.max(1, Math.floor(pos.count / 4000));
      for (let k = 0; k < pos.count; k += step) {
        v.fromBufferAttribute(pos, k);
        if (o.isSkinnedMesh) o.applyBoneTransform(k, v);
        pts.push(v.clone().applyMatrix4(o.matrixWorld));
      }
    });
    if (pts.length < 50) return;

    const band = (lo, hi) => pts.filter((p) => p.y >= lo * H && p.y <= hi * H);
    const centroid = (arr) => arr.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(arr.length);
    const median = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];

    const top = band(0.84, 1.0);
    if (top.length) {
      const c = centroid(top);
      anchorFns.head = staticAnchor(c.x, median(top.map((p) => p.y)), c.z);
    }
    const peak = band(0.97, 1.0);
    if (peak.length) {
      const c = centroid(peak);
      anchorFns.crest = staticAnchor(c.x, c.y, c.z);
    }
    const chest = band(0.62, 0.76);
    if (chest.length) {
      const c = centroid(chest);
      const zs = chest.map((p) => p.z);
      const zMax = Math.max(...zs);
      const zMin = Math.min(...zs);
      anchorFns.chest = staticAnchor(c.x, c.y, c.z + (zMax - c.z) * 0.6);
      anchorFns.back = staticAnchor(c.x, c.y, zMin + (c.z - zMin) * 0.2);
    }
    const arms = band(0.15, 0.65).sort((a, b) => a.x - b.x);
    if (arms.length) {
      const hand = centroid(arms.slice(0, Math.max(8, Math.floor(arms.length * 0.02))));
      anchorFns.rightHand = staticAnchor(hand.x, hand.y, hand.z);
    }
  }

  // Rough proportions, used until a model has loaded.
  function setFallbackAnchors() {
    const { x: W, y: H, z: D } = modelSize;
    anchorFns.body = staticAnchor(0, 0.52 * H, 0);
    anchorFns.head = staticAnchor(0, 0.9 * H, 0.02 * H);
    anchorFns.crest = staticAnchor(0, 1.0 * H, 0);
    anchorFns.chest = staticAnchor(0, 0.7 * H, 0.15 * D);
    anchorFns.back = staticAnchor(0, 0.68 * H, -0.5 * D);
    anchorFns.rightHand = staticAnchor(-0.4 * W, 0.5 * H, 0.1 * D);
  }

  function useBoneAnchors(model) {
    const found = {};
    model.traverse((o) => {
      if (!o.isBone) return;
      const n = o.name.toLowerCase().replace(/mixamorig[:_]?/, '');
      if (/thumb|index|middle|ring|pinky|finger/.test(n)) return;
      if (!found.crest && /head.?(top|end)/.test(n)) found.crest = o;
      else if (!found.head && /(^|[^a-z])head([^a-z]|$)/.test(n)) found.head = o;
      else if (!found.rightHand && /(right.?hand|hand.?r(ight)?$|^r.?hand$)/.test(n)) found.rightHand = o;
      else if (!found.chest && /(spine.?2|upper.?chest|chest)/.test(n)) found.chest = o;
      else if (!found.spine && /spine/.test(n)) found.spine = o;
    });
    const H = MODEL_HEIGHT;
    const D = modelSize.z;
    const chest = found.chest || found.spine;
    if (found.head) anchorFns.head = boneAnchor(found.head, 0, 0.04 * H, 0);
    if (found.crest) anchorFns.crest = boneAnchor(found.crest);
    else if (found.head) anchorFns.crest = boneAnchor(found.head, 0, 0.1 * H, 0);
    if (chest) {
      anchorFns.chest = boneAnchor(chest, 0, 0, 0.1 * D);
      anchorFns.back = boneAnchor(chest, 0, 0, -0.45 * D);
    }
    if (found.rightHand) anchorFns.rightHand = boneAnchor(found.rightHand);
    return Object.keys(found);
  }

  const markers = [];
  function addAnchorMarkers() {
    for (const name of Object.keys(anchorFns)) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x00c2ff, depthTest: false })
      );
      m.renderOrder = 10;
      m.userData.anchor = name;
      scene.add(m);
      markers.push(m);
    }
  }

  // ----- Model -----
  let mixer = null;

  const gltfLoader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  gltfLoader.setDRACOLoader(draco);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  gltfLoader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      model.rotation.y = MODEL_YAW_DEG * DEG;

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      model.scale.setScalar(MODEL_HEIGHT / size.y);
      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      box.getSize(modelSize);

      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      samurai.add(model);
      setFallbackAnchors();
      setShapeAnchors(model);
      const bones = useBoneAnchors(model);
      if (DEBUG_ANCHORS) addAnchorMarkers();

      const idle = gltf.animations.find((c) => /idle|breath|stand/i.test(c.name));
      if (idle && !reducedMotion) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(idle).play();
      }

      console.info(
        `[samurai] loaded; bones used: ${bones.join(', ') || 'none (shape estimates)'}; ` +
          `clips: ${gltf.animations.map((c) => c.name).join(', ') || 'none'}`
      );
      hideLoader();
    },
    (e) => {
      if (e.lengthComputable && window.__setLoaderProgress) {
        window.__setLoaderProgress(e.loaded / e.total);
      }
    },
    (err) => {
      console.warn('[samurai] model failed to load; showing the scene without it.', err);
      hideLoader();
    }
  );

  // ----- Scene dressing -----
  function buildPanorama() {
    // The painting wraps the world on the inside of a cylinder. Mirrored
    // repeat makes the two halves meet seamlessly.
    const R = 38;
    const H = (Math.PI * R) / 3;
    const tex = texLoader.load('assets/mountains.webp');
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.MirroredRepeatWrapping;
    tex.repeat.x = 2;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const geo = new THREE.CylinderGeometry(R, R, H, 96, 1, true, 0.38 * Math.PI, Math.PI * 2);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      fog: false,
      toneMapped: false,
      depthWrite: false,
    });
    const pano = new THREE.Mesh(geo, mat);
    pano.renderOrder = -1;
    // The lake/mountain horizon (~30% up the painting) sits near eye level.
    pano.position.y = H / 2 - 0.3 * H + 1.2;
    scene.add(pano);
  }

  function buildGround() {
    // No visible floor: the samurai stands on the page's own paper, and only
    // its shadow is drawn.
    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ color: 0x3a2a1e, opacity: 0.22 })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);

    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g2d = c.getContext('2d');
    const grad = g2d.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(40,28,20,0.55)');
    grad.addColorStop(1, 'rgba(40,28,20,0)');
    g2d.fillStyle = grad;
    g2d.fillRect(0, 0, 128, 128);
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.005;
    scene.add(contact);
  }

  function buildPetals() {
    // Five petal shapes cut from the sakura painting, one instanced mesh each.
    const TYPES = 5;
    const perType = window.innerWidth < 700 ? 24 : 44;
    const atlas = texLoader.load('assets/petals.png');
    atlas.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(0.14, 0.14);
    const meshes = [];
    const state = [];

    for (let t = 0; t < TYPES; t++) {
      const tex = atlas.clone();
      tex.repeat.set(1 / TYPES, 1);
      tex.offset.set(t / TYPES, 0);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, perType);
      mesh.frustumCulled = false;
      scene.add(mesh);
      meshes.push(mesh);
      for (let i = 0; i < perType; i++) {
        state.push({
          mesh,
          index: i,
          pos: new THREE.Vector3((Math.random() - 0.5) * 24, Math.random() * 13 - 1, (Math.random() - 0.5) * 24),
          rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
          spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2),
          fall: 0.25 + Math.random() * 0.35,
          sway: 0.3 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          scale: 0.7 + Math.random() * 0.8,
        });
      }
    }
    return { meshes, state, dummy: new THREE.Object3D() };
  }

  function updatePetals(dt, elapsed) {
    const { state, dummy, meshes } = petals;
    const speed = reducedMotion ? 0.4 : 1;
    for (const p of state) {
      p.pos.y -= p.fall * dt * speed;
      p.pos.x += Math.sin(elapsed * 0.6 + p.phase) * p.sway * dt * speed;
      if (p.pos.y < -1) p.pos.set((Math.random() - 0.5) * 24, 12, (Math.random() - 0.5) * 24);
      p.rot.x += p.spin.x * dt * speed;
      p.rot.y += p.spin.y * dt * speed;
      p.rot.z += p.spin.z * dt * speed;
      dummy.position.copy(p.pos);
      dummy.rotation.copy(p.rot);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      p.mesh.setMatrixAt(p.index, dummy.matrix);
    }
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  }

  // ----- Scroll -> shot mapping -----
  // Each section holds its shot while its panel is on screen; the camera
  // flies to the next shot in the gap between panels.
  let keys = [];

  function refreshLayout() {
    const vh = window.innerHeight;
    keys = SHOTS.map((s) => {
      const el = document.getElementById(s.id);
      if (!el) return null;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const start = top - vh * 0.35;
      const end = Math.max(start, top + el.offsetHeight - vh * 0.65);
      return { start, end };
    });
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  // Continuous shot index: 2.0 = holding shot 2, 2.5 = halfway to shot 3.
  function scrollToShot(y) {
    const n = keys.length;
    if (!n || !keys[0]) return 0;
    if (y <= keys[0].end) return 0;
    for (let i = 0; i < n - 1; i++) {
      const a = keys[i];
      const b = keys[i + 1];
      if (!a || !b) continue;
      if (y <= a.end) return i;
      if (y < b.start) return i + smoothstep((y - a.end) / (b.start - a.end));
    }
    return n - 1;
  }

  function shortestAngle(from, to) {
    let d = (to - from) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  // ----- Input -----
  const mouse = { x: 0, y: 0 };
  if (!reducedMotion) {
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    refreshLayout();
  });
  window.addEventListener('load', () => setTimeout(refreshLayout, 300));
  refreshLayout();

  // ----- Frame loop -----
  const clock = new THREE.Clock();
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let g = scrollToShot(window.scrollY);
  let prevAz = null;
  let bank = 0;

  canvas.classList.add('is-ready');

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;

    const gTarget = scrollToShot(window.scrollY);
    g += (gTarget - g) * (1 - Math.exp(-3.5 * dt));

    const n = SHOTS.length;
    const i = Math.min(Math.floor(g), n - 1);
    const j = Math.min(i + 1, n - 1);
    const t = g - i;
    const A = SHOTS[i];
    const B = SHOTS[j];

    anchorFns[A.anchor](va);
    anchorFns[B.anchor](vb);
    target.lerpVectors(va, vb, t);

    // Drone swoop: rise and pull out mid-transition, then dive into the shot.
    const swoop = reducedMotion ? 0 : Math.sin(Math.PI * t);
    let az = A.az + shortestAngle(A.az, B.az) * t;
    let el = THREE.MathUtils.lerp(A.el, B.el, t) + swoop * 10;
    const dist = THREE.MathUtils.lerp(A.dist, B.dist, t) + swoop * (0.9 * Math.min(A.dist, B.dist) + 0.4);
    const fov = THREE.MathUtils.lerp(A.fov, B.fov, t);
    const side = window.innerWidth < 900 ? 0 : THREE.MathUtils.lerp(A.side, B.side, t);

    az += mouse.x * 3;
    el = THREE.MathUtils.clamp(el - mouse.y * 2, -20, 80);

    const azR = az * DEG;
    const elR = el * DEG;
    dir.set(Math.sin(azR) * Math.cos(elR), Math.sin(elR), Math.cos(azR) * Math.cos(elR));
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);

    // Bank into horizontal sweeps like a drone turning.
    if (prevAz !== null && dt > 0 && !reducedMotion) {
      const azVel = shortestAngle(prevAz, az) / dt;
      const bankTarget = THREE.MathUtils.clamp(-azVel * 0.0035, -0.22, 0.22);
      bank += (bankTarget - bank) * (1 - Math.exp(-4 * dt));
      camera.rotateZ(bank);
    }
    prevAz = az;

    // Shift the frame so the subject sits beside the content panel.
    camera.fov = fov;
    camera.filmOffset = -side * 2 * Math.tan((fov * DEG) / 2) * camera.aspect * camera.getFilmWidth();
    camera.updateProjectionMatrix();

    if (mixer) mixer.update(dt);
    for (const m of markers) anchorFns[m.userData.anchor](m.position);
    updatePetals(dt, elapsed);
    renderer.render(scene, camera);
  }
  animate();
}
