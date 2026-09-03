import * as THREE from "three";
import { BRAND } from "./brand";

type WorldMount = { destroy: () => void };

function makeRibbon(color: string, radius: number, yOffset: number, phase: number): THREE.Mesh {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2;
    const wave = Math.sin(angle * 3 + phase) * 0.22;
    points.push(new THREE.Vector3(
      Math.cos(angle) * (radius + wave),
      yOffset + Math.sin(angle * 2 + phase) * 0.34,
      Math.sin(angle) * (radius + wave),
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
  const geometry = new THREE.TubeGeometry(curve, 160, 0.055, 8, true);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.13,
    metalness: 0.18,
    roughness: 0.28,
    clearcoat: 0.85,
    clearcoatRoughness: 0.22,
  });
  return new THREE.Mesh(geometry, material);
}

function makeRunner(): { group: THREE.Group; limbs: THREE.Object3D[] } {
  const runner = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: BRAND.palette.ink, roughness: 0.48 });
  const red = new THREE.MeshStandardMaterial({ color: BRAND.palette.red, roughness: 0.42 });
  const white = new THREE.MeshStandardMaterial({ color: BRAND.palette.white, roughness: 0.58 });
  const gold = new THREE.MeshStandardMaterial({ color: BRAND.palette.gold, metalness: 0.2, roughness: 0.34 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.62, 6, 12), navy);
  torso.position.y = 0.86;
  torso.rotation.z = -0.16;
  runner.add(torso);

  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.065, 8, 24, Math.PI * 1.12), white);
  sash.position.set(0.03, 1.02, 0.18);
  sash.rotation.set(Math.PI / 2, 0.15, -0.65);
  runner.add(sash);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), gold);
  head.position.set(-0.12, 1.67, 0);
  runner.add(head);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), red);
  cap.position.set(-0.12, 1.7, 0);
  cap.rotation.z = -0.22;
  runner.add(cap);

  const limbs: THREE.Object3D[] = [];
  const limbGeometry = new THREE.CapsuleGeometry(0.085, 0.72, 5, 8);
  const addLimb = (position: THREE.Vector3, rotation: THREE.Euler, material: THREE.Material) => {
    const pivot = new THREE.Group();
    pivot.position.copy(position);
    pivot.rotation.copy(rotation);
    const limb = new THREE.Mesh(limbGeometry, material);
    limb.position.y = -0.4;
    pivot.add(limb);
    runner.add(pivot);
    limbs.push(pivot);
    return pivot;
  };
  addLimb(new THREE.Vector3(-0.2, 1.3, 0.02), new THREE.Euler(0.3, 0, 0.92), red);
  addLimb(new THREE.Vector3(0.18, 1.28, -0.02), new THREE.Euler(-0.24, 0, -1.05), white);
  addLimb(new THREE.Vector3(-0.08, 0.48, 0.02), new THREE.Euler(0.18, 0, -0.78), navy);
  addLimb(new THREE.Vector3(0.14, 0.48, -0.02), new THREE.Euler(-0.2, 0, 0.72), red);

  const shoeGeometry = new THREE.BoxGeometry(0.34, 0.12, 0.18);
  const shoeA = new THREE.Mesh(shoeGeometry, white);
  shoeA.position.set(-0.68, -0.06, 0.02);
  shoeA.rotation.z = -0.12;
  runner.add(shoeA);
  const shoeB = shoeA.clone();
  shoeB.material = red;
  shoeB.position.set(0.68, 0.02, -0.02);
  shoeB.rotation.z = 0.16;
  runner.add(shoeB);

  runner.rotation.set(-0.04, -0.38, -0.08);
  runner.scale.setScalar(0.88);
  return { group: runner, limbs };
}

function supportsWebGl(canvas: HTMLCanvasElement): boolean {
  if (typeof window.WebGLRenderingContext === "undefined") return false;
  try {
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function mountRunWorld(stage: HTMLElement): WorldMount {
  const probe = document.createElement("canvas");
  if (!supportsWebGl(probe)) {
    stage.dataset.renderState = "fallback";
    return { destroy: () => undefined };
  }

  const canvas = document.createElement("canvas");
  canvas.className = "run-world-canvas";
  canvas.setAttribute("aria-hidden", "true");
  stage.prepend(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    canvas.remove();
    stage.dataset.renderState = "fallback";
    return { destroy: () => undefined };
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BRAND.palette.paper, 0.055);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 1.7, 8.4);

  const world = new THREE.Group();
  world.position.y = -0.15;
  scene.add(world);

  const ribbonGroup = new THREE.Group();
  ribbonGroup.add(
    makeRibbon(BRAND.palette.red, 2.45, 0.38, 0),
    makeRibbon(BRAND.palette.white, 2.15, 0.08, 1.2),
    makeRibbon(BRAND.palette.blue, 1.84, -0.2, 2.4),
  );
  ribbonGroup.rotation.x = 0.78;
  world.add(ribbonGroup);

  const track = new THREE.Mesh(
    new THREE.TorusGeometry(2.95, 0.095, 8, 128),
    new THREE.MeshStandardMaterial({ color: BRAND.palette.ink, roughness: 0.6, metalness: 0.15 }),
  );
  track.rotation.x = Math.PI / 2;
  track.position.y = -1.05;
  world.add(track);

  const innerTrack = new THREE.Mesh(
    new THREE.TorusGeometry(2.56, 0.025, 6, 128),
    new THREE.MeshBasicMaterial({ color: BRAND.palette.gold }),
  );
  innerTrack.rotation.x = Math.PI / 2;
  innerTrack.position.y = -1.04;
  world.add(innerTrack);

  const runner = makeRunner();
  runner.group.position.set(0.1, -0.42, 0.2);
  world.add(runner.group);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.018, 6, 96),
    new THREE.MeshBasicMaterial({ color: BRAND.palette.gold, transparent: true, opacity: 0.82 }),
  );
  halo.position.set(0, 0.62, -0.82);
  world.add(halo);

  const markerGeometry = new THREE.OctahedronGeometry(0.11, 0);
  const markerMaterial = new THREE.MeshStandardMaterial({ color: BRAND.palette.gold, roughness: 0.3 });
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(Math.cos(angle) * 3.05, -0.92 + Math.sin(index * 1.7) * 0.12, Math.sin(angle) * 3.05);
    marker.rotation.set(angle, angle * 0.5, angle * 0.8);
    world.add(marker);
  }

  const particlePositions = new Float32Array(150 * 3);
  for (let index = 0; index < 150; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.4 + ((index * 37) % 100) / 24;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = -0.6 + ((index * 53) % 100) / 28;
    particlePositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const particles = new THREE.BufferGeometry();
  particles.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const pointCloud = new THREE.Points(
    particles,
    new THREE.PointsMaterial({ color: BRAND.palette.blue, size: 0.035, transparent: true, opacity: 0.42 }),
  );
  world.add(pointCloud);

  scene.add(new THREE.HemisphereLight(BRAND.palette.white, BRAND.palette.blue, 2.5));
  const keyLight = new THREE.DirectionalLight(BRAND.palette.white, 4.2);
  keyLight.position.set(4, 7, 5);
  scene.add(keyLight);
  const redLight = new THREE.PointLight(BRAND.palette.red, 28, 11, 2);
  redLight.position.set(-4, 0.2, 3);
  scene.add(redLight);
  const blueLight = new THREE.PointLight(BRAND.palette.blue, 34, 12, 2);
  blueLight.position.set(4, 1.8, 1);
  scene.add(blueLight);

  let pointerX = 0;
  let pointerY = 0;
  let scrollProgress = 0;
  let visible = true;
  let destroyed = false;
  let frame = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const timer = new THREE.Timer();
  timer.connect(document);

  const resize = () => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();

  const updateScroll = () => {
    const hero = stage.closest<HTMLElement>(".hero");
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    scrollProgress = THREE.MathUtils.clamp(-rect.top / Math.max(1, rect.height - window.innerHeight * 0.35), 0, 1);
    stage.style.setProperty("--world-progress", scrollProgress.toFixed(3));
  };
  const updatePointer = (event: PointerEvent) => {
    const rect = stage.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
  };
  const resetPointer = () => { pointerX = 0; pointerY = 0; };
  const intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; });
  intersection.observe(stage);
  window.addEventListener("scroll", updateScroll, { passive: true });
  stage.addEventListener("pointermove", updatePointer, { passive: true });
  stage.addEventListener("pointerleave", resetPointer);
  updateScroll();

  const renderFrame = (timestamp?: number) => {
    if (destroyed) return;
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.05);
    if (visible && document.visibilityState !== "hidden") {
      const time = timer.getElapsed();
      const targetRotation = scrollProgress * Math.PI * 1.25 + pointerX * 0.12;
      world.rotation.y = THREE.MathUtils.damp(world.rotation.y, targetRotation, 4.2, delta);
      world.rotation.x = THREE.MathUtils.damp(world.rotation.x, -0.03 + pointerY * 0.06, 4.2, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 8.4 - scrollProgress * 1.15, 3.4, delta);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointerX * 0.28 + scrollProgress * 0.34, 3.4, delta);
      camera.lookAt(0, 0.35, 0);
      if (!reducedMotion) {
        ribbonGroup.rotation.z += delta * 0.055;
        halo.rotation.z -= delta * 0.34;
        pointCloud.rotation.y -= delta * 0.022;
        runner.group.position.y = -0.42 + Math.sin(time * 2.8) * 0.035;
        runner.limbs.forEach((limb, index) => {
          const direction = index % 2 === 0 ? 1 : -1;
          limb.rotation.x = Math.sin(time * 3.4 + index) * 0.13 * direction;
        });
      }
      renderer.render(scene, camera);
    }
    if (!reducedMotion) frame = window.requestAnimationFrame(renderFrame);
  };

  stage.dataset.renderState = "webgl";
  renderFrame();

  return {
    destroy: () => {
      destroyed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScroll);
      stage.removeEventListener("pointermove", updatePointer);
      stage.removeEventListener("pointerleave", resetPointer);
      resizeObserver.disconnect();
      intersection.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      particles.dispose();
      timer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
