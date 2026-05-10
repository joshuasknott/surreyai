import type { CollisionAABB, StationType } from './types';

export const MODEL_SCALE = 3;

export const CAFE_SPAWN = {
  x: 0.9,
  y: 2.45,
  z: 2.35,
  yaw: 0.16,
};

export const CAFE_WALKABLE: CollisionAABB = {
  minX: -2.55,
  minZ: -2.75,
  maxX: 2.55,
  maxZ: 2.75,
};

export const CAFE_OBSTACLES: CollisionAABB[] = [
  { minX: -2.55, minZ: -2.75, maxX: 2.55, maxZ: -1.95 },
  { minX: -2.55, minZ: -1.35, maxX: -0.95, maxZ: 2.6 },
  { minX: -0.5, minZ: 0.45, maxX: 0.45, maxZ: 1.45 },
  { minX: 1.85, minZ: 0.6, maxX: 2.55, maxZ: 2.35 },
];

export interface HotspotPosition {
  station: StationType;
  x: number;
  z: number;
  markerHeight: number;
  interactRadius: number;
  labelDistance: number;
}

export const HOTSPOT_POSITIONS: HotspotPosition[] = [
  {
    station: 'coffee-counter',
    x: 0.25,
    z: -1.62,
    markerHeight: 2.35,
    interactRadius: 1.25,
    labelDistance: 4.5,
  },
];

export interface BaristaPosition {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export const BARISTA_POSITION: BaristaPosition = {
  x: 0.28,
  y: 0.75,
  z: -2.36,
  yaw: 0,
};

export const COFFEE_CUP_POSITION = {
  x: 0.45,
  y: 2.08,
  z: -1.86,
};
