// ===== 3D SAMURAI SCENE =====
// A low-poly ink samurai stands at the center of the world. A drone-style
// camera flies a smooth spline path around it as the visitor scrolls the
// (perfectly normal, readable) HTML content in front of the canvas.
// Falling sakura petals and a distant torii gate set the scene; everything
// fogs out into the page's own paper color at the edges, like an ink wash
// painting fading into blank paper.

import * as THREE from 'three';

const canvas = document.getElementById('bg-canvas');

function supportsWebGL() {
  try {
    const testCanvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

if (!canvas || !supportsWebGL()) {
  document.body.classList.add('no-webgl');
} else {
  runScene();
}

function runScene() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallScreen = window.innerWidth < 700;

  const PAPER_FOG = 0xe9dcc0;
  const INK = 0x231d18;
  const INK_SOFT = 0x453a30;
  const PINK = 0xd9709a;
  const PINK_DEEP = 0xb2456f;
  const SEAL_RED = 0x9c3232;

  // Drone flight path: one waypoint per section, sweeping around the
  // samurai at varying angle/height/radius instead of jumping section to
  // section in a straight line.
  const SECTION_IDS = ['home', 'about', 'experience', 'projects', 'skills', 'education', 'contact'];
  const FLIGHT_WAYPOINTS = [
    { angle: 0, radius: 7.5, height: 0.3 },
    { angle: 55, radius: 7, height: 2.6 },
    { angle: 120, radius: 8, height: 0.6 },
    { angle: 175, radius: 6.5, height: 3.2 },
    { angle: 230, radius: 7.5, height: 1.2 },
    { angle: 290, radius: 6.5, height: 2.2 },
    { angle: 345, radius: 9, height: 1.6 },
  ];
  const LOOK_TARGET_WAYPOINTS = [
    [0, 2.3, 0], [0, 1.9, 0], [0, 1.2, 0], [0, 2.1, 0],
    [0, 1.5, 0], [0, 1.8, 0], [0, 1.6, 0],
  ];

  function waypointToVec3(wp) {
    const rad = (wp.angle * Math.PI) / 180;
    return new THREE.Vector3(Math.sin(rad) * wp.radius, wp.height, Math.cos(rad) * wp.radius);
  }

  let scene, camera, renderer, clock;
  let samuraiGroup, cape, katanaGlow;
  let petals, petalVelocities;
  let flightCurve, lookCurve;
  let anchors = [];
  let prevCamPos = new THREE.Vector3(0, 1.4, 8.5);
  const mouse = { x: 0, y: 0 };
  let smoothedT = 0;

  init();

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(PAPER_FOG, 9, 26);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.copy(waypointToVec3(FLIGHT_WAYPOINTS[0]));

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    scene.add(new THREE.AmbientLight(0xfff3e0, 0.18));

    const keyLight = new THREE.DirectionalLight(0xfff0dd, 0.22);
    keyLight.position.set(4, 8, 5);
    scene.add(keyLight);

    // Rim light from behind, tinted pink, to separate the ink-dark
    // samurai silhouette from the paper-colored fog.
    const rimLight = new THREE.PointLight(PINK, 2.4, 20);
    rimLight.position.set(-3, 3, -4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(SEAL_RED, 0.6, 15);
    fillLight.position.set(3, 1, 4);
    scene.add(fillLight);

    buildGround();
    buildSamurai();
    buildToriiGate();
    buildPetals();

    flightCurve = new THREE.CatmullRomCurve3(
      FLIGHT_WAYPOINTS.map(waypointToVec3),
      false,
      'catmullrom',
      0.5
    );
    lookCurve = new THREE.CatmullRomCurve3(
      LOOK_TARGET_WAYPOINTS.map((p) => new THREE.Vector3(...p)),
      false,
      'catmullrom',
      0.5
    );

    clock = new THREE.Clock();
    refreshAnchors();

    window.addEventListener('resize', onResize);
    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', onMouseMove);
    }
    window.addEventListener('load', () => setTimeout(refreshAnchors, 300));

    canvas.classList.add('is-ready');
    animate();
  }

  function inkMaterial(extra) {
    return new THREE.MeshStandardMaterial(
      Object.assign(
        { color: INK, roughness: 0.55, metalness: 0.25, flatShading: true },
        extra || {}
      )
    );
  }

  function buildGround() {
    const groundGeo = new THREE.CircleGeometry(9, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xdccBA0,
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    scene.add(ground);

    // Faint concentric ink ripples, like a raked zen garden.
    for (let i = 1; i <= 4; i++) {
      const ringGeo = new THREE.RingGeometry(i * 1.6, i * 1.6 + 0.04, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: INK_SOFT,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -1.49;
      scene.add(ring);
    }
  }

  function buildSamurai() {
    samuraiGroup = new THREE.Group();

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.14, 0.18, 1.1, 6);
    [-0.22, 0.22].forEach((x) => {
      const leg = new THREE.Mesh(legGeo, inkMaterial());
      leg.position.set(x, -0.95, 0);
      samuraiGroup.add(leg);
    });

    // Torso armor (do-maru): hex-plate cylinder tapering slightly.
    const torsoGeo = new THREE.CylinderGeometry(0.55, 0.42, 1.15, 8);
    const torso = new THREE.Mesh(torsoGeo, inkMaterial({ metalness: 0.4, roughness: 0.4 }));
    torso.position.set(0, -0.05, 0);
    samuraiGroup.add(torso);

    // Waist guard (kusazuri) — flared skirt plates.
    const waistGeo = new THREE.CylinderGeometry(0.62, 0.75, 0.4, 8, 1, true);
    const waist = new THREE.Mesh(waistGeo, inkMaterial({ side: THREE.DoubleSide }));
    waist.position.set(0, -0.55, 0);
    samuraiGroup.add(waist);

    // Shoulder armor (sode) — flattened boxes.
    const sodeGeo = new THREE.BoxGeometry(0.4, 0.55, 0.15);
    [-0.62, 0.62].forEach((x) => {
      const sode = new THREE.Mesh(sodeGeo, inkMaterial());
      sode.position.set(x, 0.55, 0);
      sode.rotation.z = x > 0 ? -0.15 : 0.15;
      samuraiGroup.add(sode);
    });

    // Neck + head base
    const headGeo = new THREE.SphereGeometry(0.26, 10, 8);
    const head = new THREE.Mesh(headGeo, inkMaterial({ roughness: 0.6 }));
    head.position.set(0, 0.98, 0);
    samuraiGroup.add(head);

    // Kabuto helmet dome
    const helmetGeo = new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const helmet = new THREE.Mesh(helmetGeo, inkMaterial({ metalness: 0.5, roughness: 0.3 }));
    helmet.position.set(0, 1.12, 0);
    samuraiGroup.add(helmet);

    // Maedate crescent (the classic kabuto crescent ornament), glowing pink.
    const crescentGeo = new THREE.TorusGeometry(0.26, 0.035, 8, 24, Math.PI * 1.3);
    const crescentMat = new THREE.MeshStandardMaterial({
      color: PINK_DEEP,
      emissive: PINK,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });
    const crescent = new THREE.Mesh(crescentGeo, crescentMat);
    crescent.position.set(0, 1.3, 0.08);
    crescent.rotation.set(Math.PI / 2.4, 0, Math.PI / 2);
    samuraiGroup.add(crescent);

    // Katana, angled across the back, with a thin glowing edge.
    const bladeGeo = new THREE.BoxGeometry(0.05, 1.5, 0.02);
    const blade = new THREE.Mesh(bladeGeo, inkMaterial({ metalness: 0.7, roughness: 0.2 }));
    const hiltGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
    const hilt = new THREE.Mesh(hiltGeo, inkMaterial());
    hilt.position.y = -0.9;
    blade.add(hilt);

    const edgeGeo = new THREE.BoxGeometry(0.01, 1.45, 0.01);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: PINK,
      emissive: PINK,
      emissiveIntensity: 1.1,
    });
    katanaGlow = new THREE.Mesh(edgeGeo, edgeMat);
    katanaGlow.position.x = 0.028;
    blade.add(katanaGlow);

    blade.position.set(-0.5, 0.5, -0.25);
    blade.rotation.set(0, 0, Math.PI / 5.5);
    samuraiGroup.add(blade);

    // Cape — a simple plane behind the figure that gets a wind-flutter
    // animation via vertex displacement each frame.
    const capeGeo = new THREE.PlaneGeometry(1.1, 1.8, 10, 14);
    const capeMat = new THREE.MeshStandardMaterial({
      color: SEAL_RED,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 0, -0.35);
    cape.geometry.userData.basePositions = cape.geometry.attributes.position.array.slice();
    samuraiGroup.add(cape);

    samuraiGroup.position.y = 0.4;
    samuraiGroup.scale.setScalar(1.7);
    scene.add(samuraiGroup);
  }

  function buildToriiGate() {
    const toriiGroup = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: SEAL_RED, roughness: 0.8 });

    const pillarGeo = new THREE.CylinderGeometry(0.16, 0.19, 4.2, 8);
    [-2.1, 2.1].forEach((x) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 0.6, 0);
      toriiGroup.add(pillar);
    });

    const topBeamGeo = new THREE.BoxGeometry(5.2, 0.22, 0.3);
    const topBeam = new THREE.Mesh(topBeamGeo, pillarMat);
    topBeam.position.set(0, 2.55, 0);
    toriiGroup.add(topBeam);

    const secondBeamGeo = new THREE.BoxGeometry(4.6, 0.16, 0.22);
    const secondBeam = new THREE.Mesh(secondBeamGeo, pillarMat);
    secondBeam.position.set(0, 2.15, 0);
    toriiGroup.add(secondBeam);

    const plaqueGeo = new THREE.BoxGeometry(0.5, 0.5, 0.08);
    const plaqueMat = new THREE.MeshStandardMaterial({ color: INK });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 2.3, 0.16);
    toriiGroup.add(plaque);

    toriiGroup.position.set(0, -1.5, -7);
    toriiGroup.scale.setScalar(1.3);
    scene.add(toriiGroup);
  }

  function buildPetals() {
    const count = isSmallScreen ? 120 : 260;
    const petalGeo = new THREE.PlaneGeometry(0.09, 0.09);
    const petalMat = new THREE.MeshBasicMaterial({
      color: PINK,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    petals = new THREE.InstancedMesh(petalGeo, petalMat, count);
    petalVelocities = [];

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = Math.random() * 14 - 2;
      const z = (Math.random() - 0.5) * 20;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
      petalVelocities.push({
        fall: 0.25 + Math.random() * 0.35,
        swaySpeed: 0.4 + Math.random() * 0.6,
        swayAmount: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 1.5,
      });
    }
    scene.add(petals);
  }

  function refreshAnchors() {
    anchors = SECTION_IDS.map((id, i) => {
      const el = document.getElementById(id);
      if (!el) return { anchor: 0, index: i };
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return { anchor: top + el.offsetHeight / 2, index: i };
    }).sort((a, b) => a.anchor - b.anchor);
  }

  // Maps scroll position to a continuous [0, 1] parameter across the whole
  // flight path (not just the nearest two waypoints), so the camera eases
  // smoothly through the entire spline rather than jumping section to
  // section.
  function computeFlightT() {
    const scrollY = window.scrollY;
    if (!anchors.length) return 0;
    const n = anchors.length - 1;
    if (scrollY <= anchors[0].anchor) return 0;
    const last = anchors[anchors.length - 1];
    if (scrollY >= last.anchor) return 1;

    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      if (scrollY >= a.anchor && scrollY <= b.anchor) {
        const span = b.anchor - a.anchor || 1;
        const localT = (scrollY - a.anchor) / span;
        const eased = localT * localT * (3 - 2 * localT);
        return (a.index + eased) / n;
      }
    }
    return 1;
  }

  function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    refreshAnchors();
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    const targetT = computeFlightT();
    const damp = 1 - Math.exp(-4 * dt);
    smoothedT = THREE.MathUtils.lerp(smoothedT, targetT, damp);

    const flightPos = flightCurve.getPointAt(THREE.MathUtils.clamp(smoothedT, 0, 1));
    const lookPos = lookCurve.getPointAt(THREE.MathUtils.clamp(smoothedT, 0, 1));

    const parallaxX = prefersReducedMotion ? 0 : mouse.x * 0.3;
    const parallaxY = prefersReducedMotion ? 0 : mouse.y * 0.18;

    camera.position.set(flightPos.x + parallaxX, flightPos.y + parallaxY, flightPos.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookPos.x, lookPos.y, lookPos.z);

    // Drone-style banking: roll into the turn based on lateral velocity.
    if (!prefersReducedMotion) {
      const lateral = flightPos.x - prevCamPos.x;
      const forward = flightPos.z - prevCamPos.z;
      const turnRate = lateral * forward >= 0 ? lateral - forward * 0.0001 : lateral;
      const bank = THREE.MathUtils.clamp(-turnRate * 6, -0.18, 0.18);
      camera.rotateZ(bank);
    }
    prevCamPos.copy(flightPos);

    // Samurai idle motion.
    if (samuraiGroup) {
      samuraiGroup.rotation.y = Math.sin(elapsed * 0.15) * 0.25 + smoothedT * Math.PI * 0.4;
      samuraiGroup.position.y = 0.4 + Math.sin(elapsed * 0.7) * 0.04;
    }

    // Cape flutter via vertex displacement.
    if (cape && !prefersReducedMotion) {
      const posAttr = cape.geometry.attributes.position;
      const base = cape.geometry.userData.basePositions;
      for (let i = 0; i < posAttr.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];
        const wave = Math.sin(elapsed * 2 + by * 2.5) * 0.06 * (1 - (by + 0.9) / 1.8);
        posAttr.setXYZ(i, bx, by, bz + wave);
      }
      posAttr.needsUpdate = true;
    }

    // Falling sakura petals, looping endlessly regardless of scroll.
    if (petals) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < petalVelocities.length; i++) {
        petals.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        const v = petalVelocities[i];
        dummy.position.y -= v.fall * dt;
        dummy.position.x += Math.sin(elapsed * v.swaySpeed + v.phase) * v.swayAmount * dt;
        if (dummy.position.y < -2) {
          dummy.position.y = 12;
          dummy.position.x = (Math.random() - 0.5) * 20;
          dummy.position.z = (Math.random() - 0.5) * 20;
        }
        dummy.rotation.z += v.spin * dt;
        dummy.updateMatrix();
        petals.setMatrixAt(i, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
}
