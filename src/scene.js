import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const CLEAR = 0x000612;

class LemniscateCurve extends THREE.Curve {
  constructor(scale = 1.62) {
    super();
    this.scale = scale;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const phi = t * Math.PI * 2;
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    const denom = 1 + s * s;
    return optionalTarget.set((this.scale * c) / denom, (this.scale * s * c) / denom, 0);
  }
}

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vX;
  varying float vY;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vX = position.x;
    vY = position.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vX;
  varying float vY;
  void main() {
    float right = smoothstep(-0.05, 0.28, vX);
    float lift = smoothstep(-0.55, 0.62, vY);
    vec3 deepBlue = vec3(0.0, 0.18, 0.78);
    vec3 cyan = vec3(0.1, 0.55, 1.0);
    vec3 leftCol = mix(deepBlue, cyan, lift);
    vec3 silverShade = vec3(0.45, 0.52, 0.62);
    vec3 silver = vec3(0.82, 0.86, 0.93);
    vec3 rightCol = mix(silverShade, silver, lift);
    vec3 col = mix(leftCol, rightCol, right);

    vec3 normalW = normalize(vNormalW);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - clamp(dot(normalW, viewDir), 0.0, 1.0), 2.4);
    vec3 fresCol = mix(vec3(0.2, 0.55, 1.0), vec3(0.85, 0.9, 1.0), right);
    col += fres * fresCol * 0.28;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function makeGrid() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vec2 grid = abs(fract(vUv * 22.0) - 0.5);
        float line = smoothstep(0.485, 0.5, max(grid.x, grid.y));
        float fade = smoothstep(0.72, 0.12, length(vUv - vec2(0.5)));
        gl_FragColor = vec4(0.35, 0.62, 1.0, line * fade * 0.42);
      }
    `,
  });
}

export function mountHero(canvas) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 860px)');
  const hero = canvas.closest('.hero');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobileQuery.matches,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    hero?.classList.add('hero-flat');
    return;
  }

  if (!renderer.getContext()) {
    hero?.classList.add('hero-flat');
    return;
  }

  renderer.setClearColor(CLEAR, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CLEAR);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 0.15, 6.15);

  const mark = new THREE.Group();
  scene.add(mark);

  const curve = new LemniscateCurve(1.62);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, mobileQuery.matches ? 140 : 220, 0.155, mobileQuery.matches ? 16 : 28, true),
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      toneMapped: false,
    }),
  );
  mark.add(tube);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x7eb6ff,
    transparent: true,
    opacity: 0.38,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.008, 12, 140), ringMat);
  ring.rotation.x = Math.PI / 2.35;
  mark.add(ring);

  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(2.9, 0.005, 10, 120),
    new THREE.MeshBasicMaterial({
      color: 0xf4f7fb,
      transparent: true,
      opacity: 0.2,
      toneMapped: false,
    }),
  );
  ringB.rotation.x = 1.15;
  ringB.rotation.y = 0.4;
  mark.add(ringB);

  const shards = [];
  const shardCount = mobileQuery.matches ? 3 : 6;
  for (let i = 0; i < shardCount; i += 1) {
    const geometry = i % 2 === 0
      ? new THREE.OctahedronGeometry(0.11 + (i % 3) * 0.02)
      : new THREE.IcosahedronGeometry(0.09, 0);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xb9dcff : 0xf5f8fc,
        emissive: i % 2 === 0 ? 0x1244cc : 0x1a2433,
        emissiveIntensity: 0.85,
        metalness: 0.82,
        roughness: 0.18,
      }),
    );
    mesh.userData.angle = (i / shardCount) * Math.PI * 2;
    mesh.userData.radius = 2.15 + (i % 3) * 0.18;
    mesh.userData.speed = 0.22 + i * 0.045;
    mesh.userData.lift = (i - shardCount / 2) * 0.16;
    mark.add(mesh);
    shards.push(mesh);
  }

  const count = mobileQuery.matches ? 160 : 420;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pointsGeo,
    new THREE.PointsMaterial({
      color: 0x9fd4ff,
      size: 0.028,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  scene.add(particles);

  const grid = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), makeGrid());
  grid.rotation.x = -Math.PI / 2.2;
  grid.position.y = -1.85;
  scene.add(grid);

  scene.add(new THREE.AmbientLight(0xc5dcff, 0.7));
  const blueLight = new THREE.PointLight(0x2a7dff, 90, 18);
  blueLight.position.set(-2.4, 1.2, 2.4);
  scene.add(blueLight);
  const whiteLight = new THREE.PointLight(0xffffff, 60, 16);
  whiteLight.position.set(2.6, 0.4, 2.8);
  scene.add(whiteLight);

  const useBloom = !mobileQuery.matches && !reduce;
  let composer = null;
  let bloom = null;
  if (useBloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.4, 0.86);
    composer.addPass(bloom);
  }

  const pointer = { x: 0, y: 0 };
  const onMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  const dpr = Math.min(window.devicePixelRatio || 1, mobileQuery.matches ? 1.25 : 1.6);

  function place() {
    const narrow = window.innerWidth < 860;
    mark.position.x = narrow ? 0.35 : 1.35;
    mark.position.y = narrow ? -1.9 : -0.05;
    mark.scale.setScalar(narrow ? 0.7 : 0.98);
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 2 || height < 2) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    if (composer) composer.setSize(width, height);
    if (bloom) bloom.setSize(width, height);
  }

  place();
  mark.rotation.set(0.38, 0.48, 0);

  const clock = new THREE.Clock();
  let visible = true;
  let observer;
  if ('IntersectionObserver' in window && hero) {
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(hero);
  }

  function frame(time) {
    const t = reduce ? 0.8 : time;
    const aimY = 0.5 + Math.sin(t * 0.32) * (reduce ? 0 : 0.16) + pointer.x * 0.38;
    const aimX = 0.36 + Math.sin(t * 0.46) * (reduce ? 0 : 0.05) - pointer.y * 0.18;
    mark.rotation.y += (aimY - mark.rotation.y) * 0.05;
    mark.rotation.x += (aimX - mark.rotation.x) * 0.05;
    const baseY = window.innerWidth < 860 ? -1.9 : -0.05;
    mark.position.y = baseY + Math.sin(t * 0.7) * (reduce ? 0 : 0.08);
    ring.rotation.z = t * 0.18;
    ringB.rotation.z = -t * 0.12;

    shards.forEach((mesh) => {
      const angle = mesh.userData.angle + t * mesh.userData.speed;
      mesh.position.set(
        Math.cos(angle) * mesh.userData.radius,
        mesh.userData.lift + Math.sin(angle * 2) * 0.12,
        Math.sin(angle) * 0.62,
      );
      mesh.rotation.x = angle;
      mesh.rotation.y = angle * 0.6;
    });

    particles.rotation.y = t * 0.03;
    grid.position.z = Math.sin(t * 0.2) * 0.05;

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function tick() {
    if (!visible || document.hidden) return;
    frame(clock.getElapsedTime());
  }

  resize();
  frame(0.8);

  const onResize = () => {
    place();
    resize();
    if (reduce) frame(0.8);
  };
  window.addEventListener('resize', onResize);

  if (!reduce) {
    renderer.setAnimationLoop(tick);
  }

  mobileQuery.addEventListener?.('change', onResize);

  return () => {
    renderer.setAnimationLoop(null);
    cancelAnimationFrame(loopId);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('resize', onResize);
    observer?.disconnect();
    renderer.dispose();
  };
}
