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

function fitShoe(model: THREE.Object3D): void {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 3.55 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale - 0.5, -center.z * scale);
}

function makeRoute(): {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  marker: THREE.Mesh;
} {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.95, -1.17, 1.24),
    new THREE.Vector3(-2.72, -1.17, 0.15),
    new THREE.Vector3(-1.65, -1.17, -1.2),
    new THREE.Vector3(-0.1, -1.17, -1.48),
    new THREE.Vector3(1.45, -1.17, -1.08),
    new THREE.Vector3(2.45, -1.17, -0.08),
    new THREE.Vector3(2.86, -1.17, 1.14),
  ], false, "catmullrom", 0.28);

  group.add(new THREE.Mesh(
    new THREE.TubeGeometry(curve, 128, 0.052, 8, false),
    new THREE.MeshStandardMaterial({ color: 0xb9c2d2, roughness: 0.72, metalness: 0.02 }),
  ));
  group.add(new THREE.Mesh(
    new THREE.TubeGeometry(curve, 128, 0.026, 8, false),
    new THREE.MeshStandardMaterial({ color: BRAND.palette.blue, roughness: 0.48, metalness: 0.08 }),
  ));

  const arrowGeometry = new THREE.ConeGeometry(0.09, 0.24, 3);
  const arrowMaterial = new THREE.MeshStandardMaterial({ color: BRAND.palette.gold, roughness: 0.35, metalness: 0.18 });
  for (const amount of [0.2, 0.38, 0.57, 0.75]) {
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    const point = curve.getPointAt(amount);
    const tangent = curve.getTangentAt(amount).normalize();
    arrow.position.copy(point).add(new THREE.Vector3(0, 0.055, 0));
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    group.add(arrow);
  }

  const startPoint = curve.getPointAt(0);
  const start = new THREE.Group();
  start.position.copy(startPoint);
  const startDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.055, 32),
    new THREE.MeshStandardMaterial({ color: BRAND.palette.red, roughness: 0.38 }),
  );
  startDisc.position.y = 0.035;
  start.add(startDisc);
  const startRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.025, 8, 40),
    new THREE.MeshStandardMaterial({ color: BRAND.palette.white, roughness: 0.5 }),
  );
  startRing.rotation.x = Math.PI / 2;
  startRing.position.y = 0.045;
  start.add(startRing);
  group.add(start);

  const finishPoint = curve.getPointAt(1);
  const finish = new THREE.Group();
  finish.position.copy(finishPoint);
  const postMaterial = new THREE.MeshStandardMaterial({ color: BRAND.palette.ink, roughness: 0.4, metalness: 0.18 });
  const barMaterial = new THREE.MeshStandardMaterial({ color: BRAND.palette.gold, roughness: 0.36, metalness: 0.25 });
  for (const offset of [-0.34, 0.34]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.92, 0.07), postMaterial);
    post.position.set(offset, 0.46, 0);
    finish.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.1), barMaterial);
  bar.position.y = 0.88;
  finish.add(bar);
  for (let index = 0; index < 5; index += 1) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.045, 0.105),
      new THREE.MeshBasicMaterial({ color: index % 2 ? BRAND.palette.white : BRAND.palette.ink }),
    );
    tile.position.set(-0.26 + index * 0.13, 0.88, 0.055);
    finish.add(tile);
  }
  group.add(finish);

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 24, 16),
    new THREE.MeshStandardMaterial({ color: BRAND.palette.gold, roughness: 0.28, metalness: 0.36 }),
  );
  marker.position.copy(startPoint).add(new THREE.Vector3(0, 0.14, 0));
  group.add(marker);

  return { group, curve, marker };
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
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 1.4, 7.45);

  const world = new THREE.Group();
  world.rotation.y = -0.12;
  scene.add(world);

  const shoePivot = new THREE.Group();
  shoePivot.rotation.set(0.02, -0.12, -0.025);
  world.add(shoePivot);

  const route = makeRoute();
  world.add(route.group);

  const grid = new THREE.GridHelper(7.2, 12, 0xc6cbd4, 0xdde0e4);
  grid.position.y = -1.23;
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.34;
  });
  world.add(grid);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.72, 64),
    new THREE.MeshBasicMaterial({ color: 0x071735, transparent: true, opacity: 0.1, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.35, 0.58, 1);
  shadow.position.set(-0.05, -1.19, -0.02);
  world.add(shadow);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa4b5, 2.9));
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
  keyLight.position.set(-3.2, 5.5, 5.2);
  scene.add(keyLight);
  const redLight = new THREE.PointLight(BRAND.palette.red, 12, 9, 2);
  redLight.position.set(-3.8, 0.5, 2.8);
  scene.add(redLight);
  const blueLight = new THREE.PointLight(BRAND.palette.blue, 18, 10, 2);
  blueLight.position.set(4.2, 2.2, 2.7);
  scene.add(blueLight);

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
      const targetRotation = -0.12 + scrollProgress * 0.4 + pointerX * 0.07;
      world.rotation.y = THREE.MathUtils.damp(world.rotation.y, targetRotation, 4.2, delta);
      world.rotation.x = THREE.MathUtils.damp(world.rotation.x, pointerY * 0.025, 4.2, delta);
      shoePivot.rotation.z = THREE.MathUtils.damp(shoePivot.rotation.z, -0.025 + scrollProgress * 0.045, 3.2, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 7.45 - scrollProgress * 0.28, 3.2, delta);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointerX * 0.12, 3.2, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.4 - pointerY * 0.08, 3.2, delta);
      camera.lookAt(0, -0.18, 0);
      const routePoint = route.curve.getPointAt(reducedMotion ? 0.58 : scrollProgress);
      route.marker.position.copy(routePoint).add(new THREE.Vector3(0, 0.14, 0));
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
    "/models/run-route-shoe.glb",
    (gltf) => {
      if (destroyed) return;
      loadedModel = gltf.scene;
      loadedModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = false;
          object.receiveShadow = false;
        }
      });
      fitShoe(loadedModel);
      shoePivot.add(loadedModel);
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
      timer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
