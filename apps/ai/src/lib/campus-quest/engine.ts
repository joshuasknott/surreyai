import * as THREE from 'three';
import type { EngineCallbacks, EngineAPI, CafeModelData, CollisionConfig } from './types';
import { loadCafeModel } from './world-loader';
import { buildCollisionFromModel } from './collision';
import { createFirstPersonControls } from './controls';
import type { FirstPersonControlsAPI } from './controls';
import { createInteractionSystem } from './interactions';
import type { InteractionSystemAPI } from './interactions';
import { createCustomerSystem } from './customers';
import type { CustomerSystemAPI } from './customers';
import { CAFE_SPAWN, CAFE_WALKABLE, CAFE_OBSTACLES } from './layout';

const DEFAULT_MAX_DPR = 2;
const MOBILE_MAX_DPR = 1.5;
const BG_COLOR = 0x1a1410;
const FOG_COLOR = 0x1a1410;
const PLAYER_RADIUS = 0.4;

export async function createCampusQuestEngine(
  container: HTMLElement,
  callbacks: EngineCallbacks,
): Promise<EngineAPI> {
  let disposed = false;
  let animFrameId = 0;
  let modelData: CafeModelData | null = null;
  let controls: FirstPersonControlsAPI | null = null;
  let collisionConfig: CollisionConfig | null = null;
  let interactionSystem: InteractionSystemAPI | null = null;
  let customerSystem: CustomerSystemAPI | null = null;

  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const maxDpr = isMobile ? MOBILE_MAX_DPR : DEFAULT_MAX_DPR;
  const dpr = Math.min(window.devicePixelRatio, maxDpr);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 5, 18);

  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(CAFE_SPAWN.x, CAFE_SPAWN.y, CAFE_SPAWN.z);

  const ambientLight = new THREE.AmbientLight(0xffe8cc, 0.5);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x0a0a18, 0.6);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffddaa, 1.4);
  dirLight.position.set(2, 8, 1);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 20;
  dirLight.shadow.camera.left = -8;
  dirLight.shadow.camera.right = 8;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -8;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xb8ccee, 0.25);
  fillLight.position.set(-3, 4, -2);
  scene.add(fillLight);

  const counterLight = new THREE.PointLight(0xffbb66, 1.35, 8, 1.5);
  counterLight.position.set(0.3, 2.4, -2.2);
  scene.add(counterLight);

  const warmFill = new THREE.PointLight(0xff9944, 0.5, 12, 2);
  warmFill.position.set(0, 2.5, 0);
  scene.add(warmFill);

  const floorGeo = new THREE.PlaneGeometry(12, 12);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x251e18,
    roughness: 0.95,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.005;
  floor.receiveShadow = true;
  scene.add(floor);

  try {
    modelData = await loadCafeModel(scene, callbacks.onLoadingProgress);

    collisionConfig = buildCollisionFromModel(
      CAFE_WALKABLE,
      CAFE_OBSTACLES,
      PLAYER_RADIUS,
    );

    if (import.meta.env.DEV) {
      console.log('[VibeCooking] Collision bounds:', collisionConfig.bounds);
      console.log('[VibeCooking] Model loaded successfully');
    }

    controls = createFirstPersonControls(
      camera,
      canvas,
      collisionConfig,
      {
        spawnPosition: new THREE.Vector3(CAFE_SPAWN.x, CAFE_SPAWN.y, CAFE_SPAWN.z),
        spawnYaw: CAFE_SPAWN.yaw,
        walkSpeed: 2.35,
        sprintMultiplier: 1,
        headBobAmplitude: 0.022,
      },
      (locked) => {
        if (callbacks.onPointerLockChange) {
          callbacks.onPointerLockChange(locked);
        }
      },
    );

    interactionSystem = createInteractionSystem(
      scene,
      modelData,
      container,
      {
        onNearestChange: (hotspot) => {
          if (callbacks.onHotspotChange) {
            callbacks.onHotspotChange(hotspot);
          }
        },
        onInteract: (hotspotId) => {
          if (callbacks.onInteract) {
            callbacks.onInteract(hotspotId);
          }
        },
      },
    );

    customerSystem = createCustomerSystem(scene);

    callbacks.onReady();
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Unknown error loading model';
    callbacks.onError(msg);
  }

  const clock = new THREE.Clock();

  function render() {
    if (disposed) return;
    animFrameId = requestAnimationFrame(render);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls) {
      controls.update(delta);
    }

    if (interactionSystem) {
      interactionSystem.update(camera);
    }

    if (customerSystem) {
      customerSystem.update(clock.elapsedTime);
    }

    renderer.render(scene, camera);
  }

  render();

  let wasHidden = false;
  function onVisibilityChange() {
    if (document.hidden) {
      wasHidden = true;
      cancelAnimationFrame(animFrameId);
    } else if (wasHidden) {
      wasHidden = false;
      clock.getDelta();
      render();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  function resize() {
    if (disposed) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  function onResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 100);
  }
  window.addEventListener('resize', onResize);

  function dispose() {
    if (disposed) return;
    disposed = true;

    if (interactionSystem) {
      interactionSystem.dispose();
      interactionSystem = null;
    }

    if (customerSystem) {
      customerSystem.dispose();
      customerSystem = null;
    }

    if (controls) {
      controls.dispose();
      controls = null;
    }

    cancelAnimationFrame(animFrameId);
    clearTimeout(resizeTimeout);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const mat of mats) {
          mat?.dispose();
          if ((mat as THREE.MeshStandardMaterial).map) {
            (mat as THREE.MeshStandardMaterial).map!.dispose();
          }
        }
      }
    });

    renderer.dispose();
    canvas.remove();
  }

  return {
    dispose,
    resize,
    requestPointerLock: () => {
      if (controls) controls.requestLock();
    },
    isPointerLocked: () => {
      return controls ? controls.isLocked() : false;
    },
    setActiveCustomer: (index: number) => {
      if (customerSystem) customerSystem.setActive(index);
    },
    markCustomerServed: (index: number) => {
      if (customerSystem) customerSystem.markServed(index);
    },
    setInteractionEnabled: (enabled: boolean) => {
      if (interactionSystem) interactionSystem.setEnabled(enabled);
    },
  };
}
