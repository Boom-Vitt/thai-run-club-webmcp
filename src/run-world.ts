import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BRAND } from "./brand";

type WorldMount = { destroy: () => void };

function supportsWebGl(canvas: HTMLCanvasElement): boolean {
  if (typeof window.WebGLRenderingContext === "undefined") return false;
  try {
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function makeRouteLine(color: string, radius: number, opacity: number, offset = 0): THREE.LineLoop {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < 128; index += 1) {
    const angle = (index / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 3 + offset) * 0.025,
      Math.sin(angle) * radius * 0.52,
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineLoop(geometry, material);
}

function fitModel(model: THREE.Object3D): void {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 3.78 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale + 0.22, -center.z * scale);
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

  stage.dataset.renderState = "loading";
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.75, 7.15);

  const world = new THREE.Group();
  world.position.y = -0.12;
  scene.add(world);

  const sculpturePivot = new THREE.Group();
  sculpturePivot.rotation.set(-0.025, -0.22, -0.035);
  world.add(sculpturePivot);

  const routeDeck = new THREE.Group();
  routeDeck.position.y = -1.42;
  routeDeck.add(
    makeRouteLine(BRAND.palette.gold, 2.24, 0.92, 0.4),
    makeRouteLine(BRAND.palette.white, 2.48, 0.2, 1.1),
    makeRouteLine(BRAND.palette.blue, 2.72, 0.3, 1.8),
  );
  world.add(routeDeck);

  const deckGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.75, 96),
    new THREE.MeshBasicMaterial({ color: BRAND.palette.blue, transparent: true, opacity: 0.075, side: THREE.DoubleSide }),
  );
  deckGlow.rotation.x = -Math.PI / 2;
  deckGlow.position.y = -1.45;
  world.add(deckGlow);

  const markerGeometry = new THREE.TetrahedronGeometry(0.085, 0);
  const markerMaterial = new THREE.MeshStandardMaterial({ color: BRAND.palette.gold, metalness: 0.62, roughness: 0.25 });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(Math.cos(angle) * 2.28, -1.35, Math.sin(angle) * 1.18);
    marker.rotation.set(angle * 0.5, angle, angle * 0.25);
    world.add(marker);
  }

  const particlePositions = new Float32Array(96 * 3);
  for (let index = 0; index < 96; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.8 + ((index * 37) % 100) / 35;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = -0.75 + ((index * 53) % 100) / 42;
    particlePositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const pointCloud = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: BRAND.palette.gold, size: 0.028, transparent: true, opacity: 0.42 }),
  );
  world.add(pointCloud);

  scene.add(new THREE.HemisphereLight(BRAND.palette.white, BRAND.palette.ink, 2.2));
  const keyLight = new THREE.DirectionalLight(BRAND.palette.white, 4.8);
  keyLight.position.set(-3, 6, 5);
  scene.add(keyLight);
  const redLight = new THREE.PointLight(BRAND.palette.red, 34, 12, 2);
  redLight.position.set(-4, 1.2, 3.2);
  scene.add(redLight);
  const blueLight = new THREE.PointLight(BRAND.palette.blue, 42, 14, 2);
  blueLight.position.set(4.6, 2.6, 2.4);
  scene.add(blueLight);
  const goldLight = new THREE.PointLight(BRAND.palette.gold, 20, 8, 2);
  goldLight.position.set(0, -0.4, 4.2);
  scene.add(goldLight);

  let pointerX = 0;
  let pointerY = 0;
  let scrollProgress = 0;
  let visible = true;
  let destroyed = false;
  let frame = 0;
  let loadedModel: THREE.Object3D | null = null;
  let drawStill: () => void = () => undefined;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const timer = new THREE.Timer();
  timer.connect(document);

  const resize = () => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    drawStill();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  const updateScroll = () => {
    const hero = stage.closest<HTMLElement>(".hero");
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    scrollProgress = THREE.MathUtils.clamp(-rect.top / Math.max(1, rect.height - window.innerHeight * 0.35), 0, 1);
    stage.style.setProperty("--world-progress", scrollProgress.toFixed(3));
    if (reducedMotion) drawStill();
  };
  const updatePointer = (event: PointerEvent) => {
    if (reducedMotion) return;
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

  const renderScene = (timestamp?: number) => {
    if (destroyed) return;
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.05);
    if (visible && document.visibilityState !== "hidden") {
      const time = timer.getElapsed();
      const targetRotation = -0.22 + scrollProgress * Math.PI * 0.86 + pointerX * 0.18;
      world.rotation.y = THREE.MathUtils.damp(world.rotation.y, targetRotation, 4.4, delta);
      world.rotation.x = THREE.MathUtils.damp(world.rotation.x, -0.025 + pointerY * 0.055, 4.4, delta);
      sculpturePivot.rotation.z = THREE.MathUtils.damp(sculpturePivot.rotation.z, -0.035 + scrollProgress * 0.16, 3.6, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 7.15 - scrollProgress * 0.72, 3.2, delta);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointerX * 0.26 + scrollProgress * 0.22, 3.2, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.75 - pointerY * 0.13, 3.2, delta);
      camera.lookAt(0, 0.16, 0);
      if (!reducedMotion) {
        sculpturePivot.position.y = Math.sin(time * 1.35) * 0.025;
        routeDeck.rotation.y -= delta * 0.04;
        pointCloud.rotation.y += delta * 0.018;
      }
      renderer.render(scene, camera);
    }
    if (!reducedMotion) frame = window.requestAnimationFrame(renderScene);
  };
  drawStill = () => renderScene();

  resize();
  updateScroll();
  renderScene();

  const loader = new GLTFLoader();
  loader.load(
    "/models/thai-pace-sculpture.glb",
    (gltf) => {
      if (destroyed) return;
      loadedModel = gltf.scene;
      loadedModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = false;
          object.receiveShadow = false;
        }
      });
      fitModel(loadedModel);
      sculpturePivot.add(loadedModel);
      stage.dataset.renderState = "ready";
      drawStill();
    },
    undefined,
    () => {
      if (destroyed) return;
      stage.dataset.renderState = "fallback";
      canvas.style.opacity = "0";
    },
  );

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
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      loadedModel = null;
      particleGeometry.dispose();
      timer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
