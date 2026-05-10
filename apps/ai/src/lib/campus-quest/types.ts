import type * as THREE from 'three';

export interface EngineCallbacks {
  onLoadingProgress: (percent: number) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onPointerLockChange?: (locked: boolean) => void;
  onHotspotChange?: (hotspot: HotspotDef | null) => void;
  onInteract?: (hotspotId: string) => void;
}

export interface CafeModelData {
  scene: THREE.Group;
  boundingBox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
}

export interface EngineAPI {
  dispose: () => void;
  resize: () => void;
  requestPointerLock: () => void;
  isPointerLocked: () => boolean;
  setActiveCustomer: (index: number) => void;
  markCustomerServed: (index: number) => void;
  setInteractionEnabled: (enabled: boolean) => void;
}

export interface CollisionAABB {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface CollisionConfig {
  bounds: CollisionAABB;
  obstacles: CollisionAABB[];
  playerRadius: number;
}

export interface ControlsConfig {
  eyeHeight: number;
  walkSpeed: number;
  sprintMultiplier: number;
  damping: number;
  sensitivity: number;
  pitchMin: number;
  pitchMax: number;
  headBobAmplitude: number;
  headBobFrequency: number;
  spawnPosition: THREE.Vector3;
  spawnYaw: number;
}

export type StationType =
  | 'coffee-counter';

export interface HotspotDef {
  id: string;
  station: StationType;
  title: string;
  prompt: string;
  x: number;
  z: number;
  markerHeight: number;
  interactRadius: number;
  labelDistance: number;
}

export interface HotspotWorld {
  def: HotspotDef;
  anchor: THREE.Object3D;
  worldPos: THREE.Vector3;
}

export interface InteractionCallbacks {
  onNearestChange: (hotspot: HotspotDef | null) => void;
  onInteract: (hotspotId: string) => void;
}
