type WorldMount = { destroy: () => void };

export function mountRunWorld(stage: HTMLElement): WorldMount {
  const route = stage.querySelector<SVGPathElement>("#heroRoutePath");
  const cursor = stage.querySelector<SVGGElement>(".route-cursor");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let pointerX = 0;
  let pointerY = 0;
  let scrollProgress = reducedMotion ? 0.58 : 0;
  let frame = 0;

  const draw = () => {
    stage.style.setProperty("--world-progress", scrollProgress.toFixed(3));
    stage.style.setProperty("--world-pointer-x", pointerX.toFixed(3));
    stage.style.setProperty("--world-pointer-y", pointerY.toFixed(3));
    if (route && cursor && typeof route.getTotalLength === "function" && typeof route.getPointAtLength === "function") {
      const length = route.getTotalLength();
      const point = route.getPointAtLength(length * scrollProgress);
      route.style.strokeDashoffset = (1 - scrollProgress).toFixed(3);
      cursor.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
    }
    frame = 0;
  };

  const requestDraw = () => {
    if (!frame) frame = window.requestAnimationFrame(draw);
  };

  const updateScroll = () => {
    if (reducedMotion) return;
    const hero = stage.closest<HTMLElement>(".hero");
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const distance = Math.max(1, rect.height - window.innerHeight * 0.35);
    scrollProgress = Math.min(1, Math.max(0, -rect.top / distance));
    requestDraw();
  };

  const updatePointer = (event: PointerEvent) => {
    if (reducedMotion) return;
    const rect = stage.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    requestDraw();
  };

  const resetPointer = () => {
    pointerX = 0;
    pointerY = 0;
    requestDraw();
  };

  stage.dataset.renderState = "ready";
  window.addEventListener("scroll", updateScroll, { passive: true });
  stage.addEventListener("pointermove", updatePointer, { passive: true });
  stage.addEventListener("pointerleave", resetPointer);
  updateScroll();
  draw();

  return {
    destroy: () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScroll);
      stage.removeEventListener("pointermove", updatePointer);
      stage.removeEventListener("pointerleave", resetPointer);
    },
  };
}
