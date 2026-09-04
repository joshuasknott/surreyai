import {
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
} from "three";

type RobotHeroOptions = {
  hero: HTMLElement;
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  prefersReducedMotion: boolean;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const startRobotHero = ({ hero, canvas, stage, prefersReducedMotion }: RobotHeroOptions) => {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;

  let renderer: any;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return;
  }

  renderer.setClearColor(0xff4a00, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;

  const robotGroup = new Group();
  scene.add(robotGroup);

  let texture: any = null;
  let geometry: any = null;
  let material: any = null;
  let plane: any = null;
  let animationFrame = 0;
  let scrollFrame = 0;
  const pointer = { x: 0, y: 0, active: false };
  let scrollProgress = 0;

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const aspect = width / height;
    renderer.setSize(width, height, false);
    camera.left = -aspect;
    camera.right = aspect;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();

    if (plane) {
      const coverSize = 2 * Math.max(1, aspect);
      plane.scale.setScalar(coverSize / 2);
    }
  };

  const syncScroll = () => {
    scrollFrame = 0;
    const rect = hero.getBoundingClientRect();
    scrollProgress = clamp(-rect.top / Math.max(rect.height, 1));
  };

  const requestScrollSync = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(syncScroll);
  };

  const render = (time = 0) => {
    const seconds = time * 0.001;
    const pointerWeight = pointer.active ? 1 : 0.25;
    robotGroup.position.x += ((pointer.x * 0.035 * pointerWeight) - robotGroup.position.x) * 0.055;
    robotGroup.position.y += ((pointer.y * 0.022 * pointerWeight + scrollProgress * 0.035) - robotGroup.position.y) * 0.055;
    robotGroup.rotation.z = Math.sin(seconds * 0.48) * 0.0025 + pointer.y * 0.003 * pointerWeight;
    robotGroup.scale.setScalar(1.015 + scrollProgress * 0.025);
    renderer.render(scene, camera);
    if (!prefersReducedMotion) animationFrame = window.requestAnimationFrame(render);
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = stage.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * -2;
    pointer.active = true;
  };

  const onPointerLeave = () => { pointer.active = false; };

  const textureSource = window.matchMedia("(max-width: 880px)").matches
    ? canvas.dataset.robotHeadSrcMobile || canvas.dataset.robotHeadSrc
    : canvas.dataset.robotHeadSrc;

  new TextureLoader().load(
    textureSource || "",
    (loadedTexture: any) => {
      texture = loadedTexture;
      texture.colorSpace = SRGBColorSpace;
      geometry = new PlaneGeometry(2, 2);
      material = new MeshBasicMaterial({ map: texture });
      plane = new Mesh(geometry, material);
      robotGroup.add(plane);
      resize();
      syncScroll();
      hero.classList.add("home-hero--ready");
      render(0);
    },
    undefined,
    () => renderer.dispose()
  );

  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", requestScrollSync, { passive: true });

  document.addEventListener(
    "astro:before-swap",
    () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(scrollFrame);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", requestScrollSync);
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer.dispose();
    },
    { once: true }
  );
};
