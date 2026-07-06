import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";

type RobotHeroOptions = {
  hero: HTMLElement;
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  prefersReducedMotion: boolean;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

export const startRobotHero = ({ hero, canvas, stage, prefersReducedMotion }: RobotHeroOptions) => {
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, -0.08, 8.8);

  let renderer: any = null;

  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch {
    renderer = null;
  }

  if (!renderer) return;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  hero.classList.add("home-hero--ready");

  const robotGroup = new Group();
  const imageHeadGroup = new Group();
  const orbitGroup = new Group();
  const ambientGroup = new Group();
  robotGroup.add(imageHeadGroup, orbitGroup);
  scene.add(robotGroup, ambientGroup);

  const nodeGeometry = new SphereGeometry(0.055, 14, 10);

  const coralMaterial = new MeshBasicMaterial({ color: 0xff7d68 });
  const orbitMaterial = new MeshBasicMaterial({ color: 0x75f0c1 });

  const robotTexture = new TextureLoader().load(canvas.dataset.robotHeadSrc || "");
  robotTexture.colorSpace = SRGBColorSpace;
  const imageHeadGeometry = new PlaneGeometry(4.5, 4.5);
  const imageHeadMaterial = new MeshBasicMaterial({
    map: robotTexture,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const imageHead = new Mesh(imageHeadGeometry, imageHeadMaterial);
  imageHeadGroup.add(imageHead);

  const orbitPositions = [
    [-1.52, 1.08, -0.82],
    [-0.6, 1.46, -0.9],
    [0.78, 1.38, -0.88],
    [1.58, 0.86, -0.82],
    [1.54, -0.82, -0.84],
    [0.42, -1.34, -0.92],
    [-0.98, -1.22, -0.88],
    [-1.58, -0.32, -0.82],
  ].map(([x, y, z]) => new Vector3(x, y, z));

  orbitPositions.forEach((position, index) => {
    const node = new Mesh(nodeGeometry, index % 3 === 0 ? coralMaterial : orbitMaterial);
    node.position.copy(position);
    orbitGroup.add(node);
  });

  const ambientCount = 150;
  const ambientPositions = new Float32Array(ambientCount * 3);
  const ambientColors = new Float32Array(ambientCount * 3);
  const colorChoices = [new Color(0x4aa8ff), new Color(0xff7d68), new Color(0x5de2a1)];

  for (let i = 0; i < ambientCount; i += 1) {
    const radius = 2.5 + Math.random() * 2.9;
    const angle = Math.random() * Math.PI * 2;
    ambientPositions[i * 3] = Math.cos(angle) * radius;
    ambientPositions[i * 3 + 1] = -1.75 + Math.random() * 4;
    ambientPositions[i * 3 + 2] = -1.35 + Math.random() * 1.6;
    const color = colorChoices[i % colorChoices.length];
    ambientColors[i * 3] = color.r;
    ambientColors[i * 3 + 1] = color.g;
    ambientColors[i * 3 + 2] = color.b;
  }

  const ambientGeometry = new BufferGeometry();
  ambientGeometry.setAttribute("position", new BufferAttribute(ambientPositions, 3));
  ambientGeometry.setAttribute("color", new BufferAttribute(ambientColors, 3));
  const ambientPoints = new Points(
    ambientGeometry,
    new PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
    })
  );
  ambientGroup.add(ambientPoints);

  scene.add(new AmbientLight(0xffffff, 1.18));

  const keyLight = new DirectionalLight(0xffffff, 2.15);
  keyLight.position.set(2.4, 3.6, 5.5);
  scene.add(keyLight);

  const coralLight = new PointLight(0xff7866, 6.4, 8);
  coralLight.position.set(-2.8, -0.4, 2.4);
  scene.add(coralLight);

  const azureLight = new PointLight(0x4aa8ff, 5.2, 8);
  azureLight.position.set(2.7, 1.1, 2.6);
  scene.add(azureLight);

  const pointer = { x: 0, active: false };
  const scrollState = { progress: 0, lift: 0, scale: 1 };
  let scrollTweenFrame = 0;
  let scrollFrame = 0;
  let animationFrame = 0;

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const isDesktop = window.innerWidth >= 761;
    robotGroup.scale.setScalar(isDesktop ? 1.22 : 0.86);
    robotGroup.position.x = isDesktop ? 0 : -0.12;
    robotGroup.position.y = isDesktop ? 0.12 : 0.08;
  };

  const syncScroll = () => {
    scrollFrame = 0;
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(rect.height - window.innerHeight * 0.25, 1);
    const nextProgress = clamp(-rect.top / travel);
    hero.style.setProperty("--hero-scroll-progress", nextProgress.toFixed(3));

    if (prefersReducedMotion) {
      scrollState.progress = 0;
      scrollState.lift = 0;
      scrollState.scale = 1;
      return;
    }

    window.cancelAnimationFrame(scrollTweenFrame);
    const startTime = performance.now();
    const startState = { ...scrollState };
    const targetState = {
      progress: nextProgress,
      lift: nextProgress * 0.18,
      scale: 1 + nextProgress * 0.045,
    };

    const tweenScrollState = (time: number) => {
      const progress = easeOutCubic(clamp((time - startTime) / 360));
      scrollState.progress = startState.progress + (targetState.progress - startState.progress) * progress;
      scrollState.lift = startState.lift + (targetState.lift - startState.lift) * progress;
      scrollState.scale = startState.scale + (targetState.scale - startState.scale) * progress;
      if (progress < 1) {
        scrollTweenFrame = window.requestAnimationFrame(tweenScrollState);
      }
    };

    scrollTweenFrame = window.requestAnimationFrame(tweenScrollState);
  };

  const requestScrollSync = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(syncScroll);
  };

  const render = (time = 0) => {
    const seconds = time * 0.001;
    const progress = scrollState.progress;
    const pointerWeight = pointer.active ? 1 : 0.35;

    imageHeadGroup.rotation.z = Math.sin(seconds * 0.65) * 0.006;
    imageHeadGroup.position.x = pointer.x * 0.025 * pointerWeight;
    imageHeadGroup.position.y = scrollState.lift + Math.sin(seconds * 0.8) * 0.025;
    imageHeadGroup.scale.setScalar(scrollState.scale);

    orbitGroup.rotation.z = seconds * 0.08 + progress * 0.7;
    orbitGroup.rotation.y = pointer.x * 0.025 * pointerWeight;
    ambientGroup.rotation.y = -seconds * 0.035 - progress * 0.2;
    ambientGroup.position.y = progress * -0.16;

    renderer.render(scene, camera);

    if (!prefersReducedMotion) {
      animationFrame = window.requestAnimationFrame(render);
    }
  };

  resize();
  syncScroll();
  render(0);

  if (!prefersReducedMotion) {
    animationFrame = window.requestAnimationFrame(render);
  }

  const onPointerMove = (event: PointerEvent) => {
    const rect = hero.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.active = true;
  };
  const onPointerLeave = () => {
    pointer.active = false;
  };

  hero.addEventListener("pointermove", onPointerMove);
  hero.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", requestScrollSync, { passive: true });

  document.addEventListener(
    "astro:before-swap",
    () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(scrollFrame);
      window.cancelAnimationFrame(scrollTweenFrame);
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", requestScrollSync);
      renderer.dispose();
      nodeGeometry.dispose();
      ambientGeometry.dispose();
      imageHeadGeometry.dispose();
      imageHeadMaterial.dispose();
      robotTexture.dispose();
    },
    { once: true }
  );
};
