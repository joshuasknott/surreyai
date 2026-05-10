import * as THREE from 'three';
import type { ControlsConfig, CollisionConfig } from './types';
import { CAFE_SPAWN } from './layout';
import { resolveCollision } from './collision';

const DEFAULT_CONFIG: ControlsConfig = {
  eyeHeight: CAFE_SPAWN.y,
  walkSpeed: 3.2,
  sprintMultiplier: 1.6,
  damping: 8.0,
  sensitivity: 0.002,
  pitchMin: -Math.PI / 2 + 0.05,
  pitchMax: Math.PI / 2 - 0.05,
  headBobAmplitude: 0.035,
  headBobFrequency: 10.0,
  spawnPosition: new THREE.Vector3(CAFE_SPAWN.x, CAFE_SPAWN.y, CAFE_SPAWN.z),
  spawnYaw: CAFE_SPAWN.yaw,
};

export interface FirstPersonControlsAPI {
  update: (delta: number) => void;
  dispose: () => void;
  isLocked: () => boolean;
  requestLock: () => void;
  getYaw: () => number;
  getPosition: () => THREE.Vector3;
}

export function createFirstPersonControls(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  collisionConfig: CollisionConfig,
  config: Partial<ControlsConfig>,
  onLockChange?: (locked: boolean) => void,
): FirstPersonControlsAPI {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let disposed = false;
  let locked = false;
  let yaw = cfg.spawnYaw;
  let pitch = 0;

  const velocity = new THREE.Vector3(0, 0, 0);
  const keys: Record<string, boolean> = {};
  let bobPhase = 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  camera.position.copy(cfg.spawnPosition);
  applyRotation();

  function applyRotation() {
    const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  }

  function onKeyDown(e: KeyboardEvent) {
    keys[e.code] = true;
    if (e.code === 'Escape' && locked) {
      document.exitPointerLock();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  function onMouseMove(e: MouseEvent) {
    if (!locked) return;
    yaw -= e.movementX * cfg.sensitivity;
    pitch -= e.movementY * cfg.sensitivity;
    pitch = Math.max(cfg.pitchMin, Math.min(cfg.pitchMax, pitch));
    applyRotation();
  }

  function onPointerLockChange() {
    locked = document.pointerLockElement === canvas;
    if (!locked) {
      velocity.set(0, 0, 0);
      Object.keys(keys).forEach((k) => (keys[k] = false));
    }
    if (onLockChange) onLockChange(locked);
  }

  function requestLock() {
    if (disposed || locked) return;
    canvas.requestPointerLock();
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  function update(delta: number) {
    if (disposed) return;
    if (!locked) return;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    const inputDir = new THREE.Vector3(0, 0, 0);
    if (keys['KeyW'] || keys['ArrowUp']) inputDir.add(forward);
    if (keys['KeyS'] || keys['ArrowDown']) inputDir.sub(forward);
    if (keys['KeyD'] || keys['ArrowRight']) inputDir.add(right);
    if (keys['KeyA'] || keys['ArrowLeft']) inputDir.sub(right);

    const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = cfg.walkSpeed * (isSprinting ? cfg.sprintMultiplier : 1);

    if (inputDir.lengthSq() > 0) {
      inputDir.normalize();
      velocity.x += inputDir.x * speed * delta * cfg.damping;
      velocity.z += inputDir.z * speed * delta * cfg.damping;
    }

    const dampFactor = Math.exp(-cfg.damping * delta);
    velocity.x *= dampFactor;
    velocity.z *= dampFactor;

    const speedCap = speed * 1.1;
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    if (horizontalSpeed > speedCap) {
      const scale = speedCap / horizontalSpeed;
      velocity.x *= scale;
      velocity.z *= scale;
    }

    let newX = camera.position.x + velocity.x * delta;
    let newZ = camera.position.z + velocity.z * delta;

    const resolved = resolveCollision(newX, newZ, collisionConfig);
    if (Math.abs(resolved.x - newX) > 0.001) velocity.x = 0;
    if (Math.abs(resolved.z - newZ) > 0.001) velocity.z = 0;

    camera.position.x = resolved.x;
    camera.position.z = resolved.z;

    const isMoving = horizontalSpeed > 0.3;
    if (isMoving && !prefersReducedMotion) {
      bobPhase += delta * cfg.headBobFrequency;
      camera.position.y = cfg.eyeHeight + Math.sin(bobPhase) * cfg.headBobAmplitude;
    } else {
      camera.position.y = cfg.eyeHeight;
      if (!isMoving) bobPhase = 0;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;

    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange);

    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  }

  return {
    update,
    dispose,
    isLocked: () => locked,
    requestLock,
    getYaw: () => yaw,
    getPosition: () => camera.position.clone(),
  };
}
