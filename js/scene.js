/* =============================================================
   3D SPACE SCENE
   Astronaut + rocket + cat + a star field made from your own
   meshes, with mouse parallax.

   👉 Almost everything you'd want to change is in SETTINGS below.
      You do not need to understand the rest of this file.
   ============================================================= */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
   SETTINGS — tweak these numbers, save, refresh the page
   ============================================================ */
const SETTINGS = {

  // --- Your model files. Put them in the models/ folder. ---
  // Leave a path as null and you get the built-in placeholder shape instead.
  astronautFile: 'models/astronaut.glb',
  rocketFile:    'models/rocket.glb',
  catFile:       'models/cat.glb',

  // --- Astronaut ---
  astronautScale: 1.9,    // bigger number = bigger astronaut
  floatHeight:    0.7,     // how far up and down it drifts
  floatSpeed:     0.5,     // how fast it bobs (lower = slower)
  tumbleSpeed:    -0.04,     // how fast it slowly turns

  // --- Rocket ---
  rocketScale: 1,
  rocketDrift: 0.4,

  /* ---------- THE CAT ------------------------------------------
     Drifts slowly across the screen from left to right, then
     reappears on the left and does it again.
     ------------------------------------------------------------ */
  catScale:   1.3,
  catSpeed:   1.0,   // units per second. Lower = slower crossing.
                     // As set, one crossing takes about 24 seconds.
  catFrom:   -10,    // x it enters from (off the left edge)
  catTo:      10,    // x it exits at (off the right edge)
  catY:      -2.3,   // height on screen. Negative = lower down.
  catZ:       -2.7,    // depth. More negative = further away = smaller.
  catBob:     1.3,  // how much it bobs up and down as it travels
  catSpin:    0.05,  // how fast it slowly turns as it goes (0 = no turning)

  // If your cat ends up facing backwards or sideways, spin it here.
  // Degrees: try 90, 180 or 270. Only affects which way it points,
  // not which way it travels.
  catFacing:  0,

  // --- Where things sit. Two layouts so nothing lands on top of
  //     your text when the window is narrow. ---
  layout: {
    wide: {
      cameraZ:   11,
      astronaut: { x:  3.1, y: -.4, z:  0 },
      rocket:    { x: -8.2, y:  3, z: -7 },
      sizeMul:   1.0
    },
    narrow: {
      cameraZ:   15,
      astronaut: { x:  1.5, y:  3.3, z: -1 },
      rocket:    { x: -1.7, y:  4.6, z: -7 },
      sizeMul:   0.62
    }
  },

  /* ---------- STARS -------------------------------------------
     Your own meshes, scattered at random. Every star picks one of
     these files at random, then gets its own size, angle and spin
     direction — so nothing looks copy-pasted.

     List as many or as few as you like. Set starMeshFiles to null
     to go back to the old plain glowing dots.
     ------------------------------------------------------------ */
  starMeshFiles: [
    //'models/star-01.glb',
    //'models/star-02.glb',
    'models/star-03.glb',
    //'models/star-04.glb'
  ],

  starCount:       150,   // ⚠️ READ THE NOTE BELOW BEFORE RAISING THIS
  starSpread:      40,    // how far the stars are scattered
  starSizeMin:     1.3,  // smallest a star can be
  starSizeMax:     1.6,  // largest a star can be

  starSpinSpeed:   0,     // the whole sky drifting. 0 = stays put.
  starTumbleSpeed: 0.25,  // each star turning on its own axis

  // null  → each star keeps the colours it was exported with
  // a hex → every star is forced to this glowing colour, e.g. 0xffb38a
  starColor: 0xffd47d,
  starGlow:  0,        // how much they glow on their own (0 = not at all)

  /* ⚠️ HOW MANY STARS YOU CAN AFFORD
     You had 3000, which was fine for dots — a dot is 1 point.
     A mesh is hundreds or thousands of triangles, so 3000 of them
     would crawl. All copies of one model are drawn in a single pass
     (this is called instancing), so what matters most is how
     detailed each model is:

        simple shape (under ~500 triangles)  →  1500 is fine
        medium shape (~2000 triangles)       →  ~600
        detailed shape (10,000+ triangles)   →  ~150, or simplify it

     If the site stutters, lower starCount first. Phones
     automatically get half of whatever you set here.
     The browser console warns you if your models are heavy.       */

  // --- Mouse ---
  parallaxStrength: 2, // how much the scene leans toward your cursor
  parallaxEase:     0.019 // lower = smoother, laggier follow
};

/* ============================================================
   From here down: the machinery. Safe to ignore.
   ============================================================ */

const canvas = document.getElementById('space-canvas');
const loadingEl = document.getElementById('loading');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// which of the two layouts we're currently using
let layout = SETTINGS.layout.wide;

// phones get half the stars
const starTotal = Math.round(
  SETTINGS.starCount * (window.innerWidth < 760 ? 0.5 : 1)
);

/* ---------- Renderer ---------- */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  // lets the page background show through the empty parts of space
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
// cap pixel ratio at 2 — keeps phones from melting
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearAlpha(0);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.42;

/* ---------- Scene + camera ---------- */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060d, 0.008);

const camera = new THREE.PerspectiveCamera(
  46, window.innerWidth / window.innerHeight, 0.1, 200
);
camera.position.set(0, 0, 11);

/* ---------- Lights ---------- */
scene.add(new THREE.AmbientLight(0x8fa4ff, 1.35));
scene.add(new THREE.HemisphereLight(0xffa98f, 0x204fc7, 1.55));

const keyLight = new THREE.DirectionalLight(0xfff3e2, 3.4);
keyLight.position.set(5, 6, 7);
scene.add(keyLight);

const rimBlue = new THREE.PointLight(0xffa98f, 85, 65);
rimBlue.position.set(-7, 2, 4);
scene.add(rimBlue);

const rimPurple = new THREE.PointLight(0x204fc7, 70, 65);
rimPurple.position.set(6, -4, -4);
scene.add(rimPurple);

const loader = new GLTFLoader();

/* ============================================================
   TURNING A LOADED MODEL INTO SOMETHING WE CAN COPY 1000 TIMES

   A .glb can hold several meshes in a little hierarchy. To draw
   hundreds of copies cheaply they all have to be ONE geometry, so
   we flatten it here, then recentre it and shrink it to fit a
   1×1×1 box. That means any model works no matter what scale it
   happened to be exported at.
   ============================================================ */

// 'color' is in here on purpose: models exported from Blender often
// carry their colour per-vertex rather than in a texture, and
// dropping it turns the model grey.
const USEFUL_ATTRIBUTES = ['position', 'normal', 'uv', 'color'];

function toTemplate(root, label) {
  const geometries = [];
  let material = null;

  root.updateMatrixWorld(true);
  root.traverse(child => {
    if (!child.isMesh || !child.geometry) return;
    const g = child.geometry.clone();
    g.applyMatrix4(child.matrixWorld);   // bake in its position/rotation
    for (const name of Object.keys(g.attributes)) {
      if (!USEFUL_ATTRIBUTES.includes(name)) g.deleteAttribute(name);
    }
    geometries.push(g);
    if (!material) material = Array.isArray(child.material) ? child.material[0] : child.material;
  });

  if (!geometries.length) return null;

  let geo;
  if (geometries.length === 1) {
    geo = geometries[0];
  } else {
    // Merging only works when every piece carries the SAME attributes,
    // so narrow them all down to the ones they have in common first.
    const shared = USEFUL_ATTRIBUTES.filter(
      name => geometries.every(g => g.attributes[name])
    );
    geometries.forEach(g => {
      for (const name of Object.keys(g.attributes)) {
        if (!shared.includes(name)) g.deleteAttribute(name);
      }
    });

    try {
      geo = mergeGeometries(geometries, false);
    } catch (err) {
      geo = null;
    }
    if (!geo) {
      console.warn(`[stars] couldn't flatten "${label}" into one shape — using its largest piece only.`);
      geo = geometries.reduce((a, b) =>
        b.attributes.position.count > a.attributes.position.count ? b : a);
    }
  }

  // recentre on its own middle, then normalise to roughly 1 unit
  geo.computeBoundingBox();
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  geo.boundingBox.getSize(size);
  geo.boundingBox.getCenter(centre);
  geo.translate(-centre.x, -centre.y, -centre.z);

  const biggest = Math.max(size.x, size.y, size.z) || 1;
  geo.scale(1 / biggest, 1 / biggest, 1 / biggest);

  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.computeBoundingSphere();

  return {
    geometry: geo,
    material,
    hasVertexColours: !!geo.attributes.color,
    triangles: (geo.index ? geo.index.count : geo.attributes.position.count) / 3
  };
}

/* Built-in star shapes, used if your .glb files aren't there yet. */
function placeholderStarTemplates() {
  const mat = () => new THREE.MeshStandardMaterial({
    color: 0xdce8ff, emissive: 0x6f9fd8, emissiveIntensity: 0.6,
    roughness: 0.35, metalness: 0.2, flatShading: true, fog: false
  });
  return [
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.TetrahedronGeometry(0.55, 0),
    new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.DodecahedronGeometry(0.5, 0)
  ].map(geometry => ({ geometry, material: mat(), triangles: 0 }));
}

/* ============================================================
   BUILDING THE STAR FIELD

   Three depth layers, so they drift past each other at different
   rates when you move the mouse — that's what reads as depth.
   Within each layer, every star picks one of your models at
   random and gets its own size, angle and spin.
   ============================================================ */
const starField = new THREE.Group();
scene.add(starField);

const starLayers = [];   // { group, parallax }
const spinners   = [];   // instanced meshes we re-orient every frame

const LAYER_SPEC = [
  { share: 0.30, radius: 0.60, sizeMul: 0.80, parallax: 0.10 },  // near
  { share: 0.35, radius: 0.80, sizeMul: 1.15, parallax: 0.06 },  // middle
  { share: 0.35, radius: 1.00, sizeMul: 1.75, parallax: 0.03 }   // far
];

const dummy = new THREE.Object3D();
const spinQuat = new THREE.Quaternion();

function buildMeshStars(templates) {
  LAYER_SPEC.forEach(spec => {
    const group = new THREE.Group();
    starField.add(group);
    starLayers.push({ group, parallax: spec.parallax });

    const layerCount = Math.max(1, Math.round(starTotal * spec.share));

    // decide which model each star uses, then group them so all the
    // stars sharing a model can be drawn together in one pass
    const buckets = templates.map(() => 0);
    for (let i = 0; i < layerCount; i++) {
      buckets[Math.floor(Math.random() * templates.length)]++;
    }

    templates.forEach((tpl, t) => {
      const n = buckets[t];
      if (!n) return;

      let material;
      if (SETTINGS.starColor !== null) {
        material = new THREE.MeshStandardMaterial({
          color: SETTINGS.starColor,
          emissive: SETTINGS.starColor,
          emissiveIntensity: SETTINGS.starGlow,
          roughness: 0.4, metalness: 0.15, fog: false
        });
      } else {
        material = tpl.material ? tpl.material.clone()
                                : new THREE.MeshStandardMaterial({ color: 0xdce8ff });
        material.fog = false;   // keep distant stars from washing out
        // colours baked into the mesh itself have to be switched on
        if (tpl.hasVertexColours) material.vertexColors = true;

        // If your model has no glow of its own, give it one so it reads
        // as a star rather than a grey pebble.
        const noGlowYet = material.emissive && material.emissive.getHex() === 0x000000;
        if (SETTINGS.starGlow > 0 && noGlowYet && material.color) {
          if (tpl.hasVertexColours) {
            // A glow is NOT tinted by colours baked into the mesh, so this
            // one stays deliberately gentle — turn starGlow up too far on a
            // vertex-coloured model and its colours drain toward white.
            material.emissive = new THREE.Color(0xffffff);
            material.emissiveIntensity = SETTINGS.starGlow * 0.22;
          } else {
            material.emissive = material.color.clone();
            material.emissiveIntensity = SETTINGS.starGlow;
          }
        }
      }

      const mesh = new THREE.InstancedMesh(tpl.geometry, material, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;   // the field surrounds the camera

      const data = {
        pos:   new Array(n),
        base:  new Array(n),
        axis:  new Array(n),
        speed: new Float32Array(n),
        angle: new Float32Array(n),
        scale: new Float32Array(n)
      };

      for (let i = 0; i < n; i++) {
        // scatter on a sphere shell rather than in a cube — less "boxy"
        const r = SETTINGS.starSpread * spec.radius * (0.62 + Math.random() * 0.38);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const p = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );

        const base = new THREE.Quaternion().setFromEuler(new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ));

        const axis = new THREE.Vector3(
          Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
        ).normalize();

        const s = (SETTINGS.starSizeMin +
                   Math.random() * (SETTINGS.starSizeMax - SETTINGS.starSizeMin)) * spec.sizeMul;

        data.pos[i]   = p;
        data.base[i]  = base;
        data.axis[i]  = axis;
        data.speed[i] = (0.4 + Math.random() * 1.2) * (Math.random() < 0.5 ? -1 : 1);
        data.angle[i] = Math.random() * Math.PI * 2;
        data.scale[i] = s;

        dummy.position.copy(p);
        dummy.quaternion.copy(base);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);

      if (SETTINGS.starTumbleSpeed > 0 && !reduceMotion) {
        spinners.push({ mesh, data, n });
      }
    });
  });
}

/* The original plain-dot star field, kept as an option. */
function buildDotStars() {
  [[0.22, 0.45, 0.13, 0xffffff, 0.95, 0.10],
   [0.38, 0.75, 0.085, 0xcfe4ff, 0.75, 0.06],
   [0.40, 1.00, 0.055, 0x9fb8ff, 0.55, 0.03]].forEach(([share, radius, size, color, opacity, parallax]) => {
    const count = Math.round(starTotal * share);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = SETTINGS.starSpread * radius * (0.55 + Math.random() * 0.45);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const group = new THREE.Group();
    group.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, sizeAttenuation: true, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending
    })));
    starField.add(group);
    starLayers.push({ group, parallax });
  });
}

/* ============================================================
   PLACEHOLDER SHAPES
   These are used if a .glb file is missing, so the site always
   works. Once your models load, these are never built.
   ============================================================ */
function buildPlaceholderAstronaut() {
  const g = new THREE.Group();

  const suit = new THREE.MeshStandardMaterial({ color: 0xe9edf7, roughness: 0.62, metalness: 0.06 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x2c3358, roughness: 0.5, metalness: 0.25 });
  const visor = new THREE.MeshStandardMaterial({
    color: 0x0d1430, roughness: 0.06, metalness: 1.0,
    emissive: 0x2a4f8a, emissiveIntensity: 0.45
  });

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 32), suit);
  helmet.position.y = 1.02;
  g.add(helmet);

  const vis = new THREE.Mesh(new THREE.SphereGeometry(0.50, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.55), visor);
  vis.position.set(0, 1.06, 0.20);
  vis.rotation.x = Math.PI * 0.42;
  g.add(vis);

  g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.60, 12, 28), suit));

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.78, 0.36), trim);
  pack.position.set(0, 0.06, -0.52);
  g.add(pack);

  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.66, 8, 20), suit);
    arm.position.set(side * 0.60, 0.10, 0.06);
    arm.rotation.z = side * 0.72;
    arm.rotation.x = -0.25;
    g.add(arm);
  });

  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.72, 8, 20), suit);
    leg.position.set(side * 0.25, -0.92, 0.04);
    leg.rotation.z = side * 0.20;
    leg.rotation.x = 0.30;
    g.add(leg);
  });

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.22, 0.10), trim);
  panel.position.set(0, 0.14, 0.44);
  g.add(panel);

  return g;
}

function buildPlaceholderRocket() {
  const g = new THREE.Group();

  const shell = new THREE.MeshStandardMaterial({ color: 0xf2f4fb, roughness: 0.4, metalness: 0.35 });
  const red   = new THREE.MeshStandardMaterial({ color: 0xff6b5e, roughness: 0.45, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7cc4ff, roughness: 0.05, metalness: 0.9,
    emissive: 0x2f6fb5, emissiveIntensity: 0.6
  });

  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 2.3, 32), shell));

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.0, 32), red);
  nose.position.y = 1.65;
  g.add(nose);

  const port = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 20), glass);
  port.position.set(0, 0.42, 0.44);
  g.add(port);

  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.78, 0.58), red);
    const a = (i / 3) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 0.55, -0.95, Math.sin(a) * 0.55);
    fin.rotation.y = -a;
    g.add(fin);
  }

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 1.1, 24),
    new THREE.MeshBasicMaterial({
      color: 0x8fd0ff, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  flame.position.y = -1.7;
  flame.rotation.x = Math.PI;
  flame.name = 'flame';
  g.add(flame);

  return g;
}

/* A stand-in cat, so the site works before you add cat.glb. */
function buildPlaceholderCat() {
  const g = new THREE.Group();

  const fur  = new THREE.MeshStandardMaterial({ color: 0xf0a868, roughness: 0.75, metalness: 0.02 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a2a3f, roughness: 0.6,  metalness: 0.05 });

  // body, lying along x so it reads side-on as it drifts past
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.95, 10, 22), fur);
  body.rotation.z = Math.PI / 2;
  g.add(body);

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.40, 28, 22), fur);
  head.position.set(0.86, 0.22, 0);
  g.add(head);

  // muzzle
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), fur);
  muzzle.position.set(1.16, 0.10, 0);
  g.add(muzzle);

  // ears
  [-1, 1].forEach(side => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 12), fur);
    ear.position.set(0.80, 0.60, side * 0.22);
    ear.rotation.x = side * 0.28;
    g.add(ear);
  });

  // eyes
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), dark);
    eye.position.set(1.10, 0.26, side * 0.17);
    g.add(eye);
  });

  // legs, tucked like a loaf
  [[-0.38, 0.30], [0.38, 0.30], [-0.38, -0.30], [0.38, -0.30]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.28, 6, 14), fur);
    leg.position.set(x, -0.46, z);
    g.add(leg);
  });

  // tail, curling up behind
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.85, 8, 16), fur);
  tail.position.set(-0.98, 0.24, 0);
  tail.rotation.z = -0.75;
  g.add(tail);

  return g;
}

/* ============================================================
   LOADING
   ============================================================ */
function centreAndScale(object3D, targetSize) {
  // recentre the model on its own middle and normalise its size,
  // so any model you drop in shows up sensibly no matter how it
  // was exported
  const box = new THREE.Box3().setFromObject(object3D);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  object3D.position.sub(centre);

  const biggest = Math.max(size.x, size.y, size.z) || 1;
  const wrapper = new THREE.Group();
  wrapper.add(object3D);
  wrapper.scale.setScalar(targetSize / biggest);
  return wrapper;
}

function loadModel(path, targetSize, fallbackFn) {
  return new Promise(resolve => {
    if (!path) { resolve(fallbackFn()); return; }
    loader.load(
      path,
      gltf => resolve(centreAndScale(gltf.scene, targetSize)),
      undefined,
      () => {
        console.info(`[scene] "${path}" not found — using the built-in placeholder.`);
        resolve(fallbackFn());
      }
    );
  });
}

/* Loads every star model you listed. Any that are missing are
   simply skipped, so three working files out of four still looks
   right. */
function loadStarTemplates() {
  const files = SETTINGS.starMeshFiles;
  if (!files || !files.length) return Promise.resolve(null);

  return Promise.all(files.map(path => new Promise(resolve => {
    loader.load(
      path,
      gltf => resolve(toTemplate(gltf.scene, path)),
      undefined,
      () => {
        console.info(`[stars] "${path}" not found — skipping it.`);
        resolve(null);
      }
    );
  }))).then(list => {
    const ok = list.filter(Boolean);
    return ok.length ? ok : null;
  });
}

let astronaut = null, rocket = null, cat = null;
let astroInner = null, rockInner = null, catInner = null;

Promise.all([
  loadModel(SETTINGS.astronautFile, 3.2, buildPlaceholderAstronaut),
  loadModel(SETTINGS.rocketFile,    3.0, buildPlaceholderRocket),
  loadModel(SETTINGS.catFile,       2.2, buildPlaceholderCat),
  loadStarTemplates()
]).then(([astro, rock, kitty, starTemplates]) => {

  if (SETTINGS.starMeshFiles === null) {
    buildDotStars();
  } else {
    const templates = starTemplates || placeholderStarTemplates();
    if (!starTemplates) {
      console.info('[stars] no star models found — using the built-in crystal shapes.');
    } else {
      const heaviest = Math.max(...templates.map(t => t.triangles));
      if (heaviest > 8000) {
        console.warn(
          `[stars] your heaviest star model has about ${Math.round(heaviest)} triangles. ` +
          `With ${starTotal} stars this may run slowly — lower starCount, or simplify the model.`
        );
      }
    }
    buildMeshStars(templates);
  }

  astroInner = astro;
  astronaut = new THREE.Group();
  astronaut.add(astro);
  scene.add(astronaut);

  rockInner = rock;
  rock.rotation.z = 0.42;   // tilt it so it reads as flying
  rocket = new THREE.Group();
  rocket.add(rock);
  scene.add(rocket);

  catInner = kitty;
  kitty.rotation.y += THREE.MathUtils.degToRad(SETTINGS.catFacing);
  kitty.rotation.z += THREE.MathUtils.degToRad(30);
  cat = new THREE.Group();
  cat.add(kitty);
  cat.position.set(SETTINGS.catFrom, SETTINGS.catY, SETTINGS.catZ);
  scene.add(cat);

  applyLayout();

  // hide the loading spinner
  loadingEl.classList.add('done');
});

/* Puts the models at the right size and place for the current layout. */
function applyLayout() {
  if (astroInner) astroInner.scale.setScalar(SETTINGS.astronautScale * layout.sizeMul);
  if (rockInner)  rockInner.scale.setScalar(SETTINGS.rocketScale   * layout.sizeMul);
  if (catInner)   catInner.scale.setScalar(SETTINGS.catScale       * layout.sizeMul);
  if (astronaut)  astronaut.position.set(layout.astronaut.x, layout.astronaut.y, layout.astronaut.z);
  if (rocket)     rocket.position.set(layout.rocket.x, layout.rocket.y, layout.rocket.z);
  camera.position.z = layout.cameraZ;
}

// safety net: never leave the spinner up forever
setTimeout(() => loadingEl.classList.add('done'), 8000);

/* ============================================================
   MOUSE / TOUCH PARALLAX
   ============================================================ */
const pointer = { x: 0, y: 0 };   // where the cursor is, -1 .. 1
const eased   = { x: 0, y: 0 };   // smoothed version we actually use

function setPointer(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = (clientY / window.innerHeight) * 2 - 1;
}

window.addEventListener('pointermove', e => setPointer(e.clientX, e.clientY), { passive: true });

// on phones, drift gently back to centre when the finger lifts
window.addEventListener('pointerup', () => { pointer.x = 0; pointer.y = 0; }, { passive: true });

/* ============================================================
   SCROLL — fade the models out past the hero
   ============================================================ */
let scrollFade = 1;
function updateScrollFade() {
  const h = window.innerHeight;
  scrollFade = Math.max(0, 1 - window.scrollY / (h * 0.85));
}
window.addEventListener('scroll', updateScrollFade, { passive: true });
updateScrollFade();

function setOpacity(root, value) {
  root.traverse(child => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => {
      if (!m) return;
      if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
      m.transparent = true;
      m.opacity = m.userData.baseOpacity * value;
    });
  });
  root.visible = value > 0.01;
}

/* ============================================================
   THE ANIMATION LOOP
   ============================================================ */
const clock = new THREE.Clock();
let running = true;

// pause rendering when the tab is in the background — saves battery
document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  if (running) { clock.getDelta(); animate(); }
});

function animate() {
  if (!running) return;
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.elapsedTime;

  /* --- smooth the pointer --- */
  eased.x += (pointer.x - eased.x) * SETTINGS.parallaxEase;
  eased.y += (pointer.y - eased.y) * SETTINGS.parallaxEase;

  /* --- the whole sky. starSpinSpeed is 0, so it stays put --- */
  if (!reduceMotion && SETTINGS.starSpinSpeed !== 0) {
    starField.rotation.y += SETTINGS.starSpinSpeed * dt;
    starField.rotation.x += SETTINGS.starSpinSpeed * 0.35 * dt;
  }

  /* --- each layer leans toward the cursor by a different amount,
         which is what reads as depth --- */
  starLayers.forEach(({ group, parallax }) => {
    group.rotation.y = eased.x * parallax;
    group.rotation.x = eased.y * parallax;
  });

  /* --- each star turns slowly on its own axis --- */
  if (spinners.length) {
    const rate = SETTINGS.starTumbleSpeed * dt;
    for (let s = 0; s < spinners.length; s++) {
      const { mesh, data, n } = spinners[s];
      for (let i = 0; i < n; i++) {
        data.angle[i] += data.speed[i] * rate;
        spinQuat.setFromAxisAngle(data.axis[i], data.angle[i]);
        dummy.position.copy(data.pos[i]);
        dummy.quaternion.copy(data.base[i]).multiply(spinQuat);
        dummy.scale.setScalar(data.scale[i]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /* --- camera leans toward the cursor --- */
  const p = SETTINGS.parallaxStrength;
  camera.position.x = eased.x * p;
  camera.position.y = -eased.y * p * 0.7;
  camera.lookAt(0, 0, 0);

  /* --- astronaut: bob up and down, tumble slowly --- */
  if (astronaut) {
    const base = layout.astronaut;
    if (!reduceMotion) {
      astronaut.position.y = base.y + Math.sin(t * SETTINGS.floatSpeed) * SETTINGS.floatHeight;
      astronaut.position.x = base.x + Math.cos(t * SETTINGS.floatSpeed * 0.63) * 0.22;
      astronaut.rotation.y += SETTINGS.tumbleSpeed * dt;
      astronaut.rotation.z = Math.sin(t * 0.31) * 0.14;
      astronaut.rotation.x = Math.cos(t * 0.24) * 0.09;
    }
    setOpacity(astronaut, scrollFade);
  }

  /* --- rocket: slow drift and a lazy roll --- */
  if (rocket) {
    const base = layout.rocket;
    if (!reduceMotion) {
      rocket.position.y = base.y + Math.sin(t * SETTINGS.rocketDrift + 1.4) * 0.5;
      rocket.position.x = base.x + Math.sin(t * SETTINGS.rocketDrift * 0.5) * 0.35;
      rocket.rotation.y += 0.09 * dt;

      const flame = rocket.getObjectByName('flame');
      if (flame) {
        flame.scale.y = 0.8 + Math.sin(t * 9) * 0.18;
        flame.material.opacity = 0.26 + Math.sin(t * 13) * 0.09;
      }
    }
    setOpacity(rocket, scrollFade);
  }

  /* --- cat: drifts left to right, then starts over --- */
  if (cat) {
    if (!reduceMotion) {
      cat.position.x += SETTINGS.catSpeed * dt;
      if (cat.position.x > SETTINGS.catTo) cat.position.x = SETTINGS.catFrom;

      cat.position.y = SETTINGS.catY + Math.sin(t * 0.55) * SETTINGS.catBob;
      cat.rotation.y += SETTINGS.catSpin * dt;
      cat.rotation.z = Math.sin(t * 0.37) * 0.10;
    }
    setOpacity(cat, scrollFade);
  }

  renderer.render(scene, camera);
}
animate();

/* ============================================================
   KEEP IT LOOKING RIGHT WHEN THE WINDOW CHANGES SIZE
   ============================================================ */
let resizeTimer;
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // narrow screen → smaller models, moved up above the text
  layout = window.innerWidth < 760 ? SETTINGS.layout.narrow : SETTINGS.layout.wide;
  applyLayout();
}
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(onResize, 120);
});
onResize();
