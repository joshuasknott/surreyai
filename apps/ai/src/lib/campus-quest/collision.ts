import type { CollisionAABB, CollisionConfig } from './types';

export function buildCollisionFromModel(
  walkable: CollisionAABB,
  obstacles: CollisionAABB[],
  playerRadius: number,
): CollisionConfig {
  return { bounds: walkable, obstacles, playerRadius };
}

export function resolveCollision(
  x: number,
  z: number,
  config: CollisionConfig,
): { x: number; z: number } {
  const { bounds, obstacles, playerRadius } = config;
  let rx = x;
  let rz = z;

  rx = Math.max(bounds.minX + playerRadius, Math.min(bounds.maxX - playerRadius, rx));
  rz = Math.max(bounds.minZ + playerRadius, Math.min(bounds.maxZ - playerRadius, rz));

  for (const obs of obstacles) {
    const closestX = Math.max(obs.minX, Math.min(obs.maxX, rx));
    const closestZ = Math.max(obs.minZ, Math.min(obs.maxZ, rz));

    const dx = rx - closestX;
    const dz = rz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < playerRadius * playerRadius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const pushX = (dx / dist) * playerRadius;
      const pushZ = (dz / dist) * playerRadius;
      rx = closestX + pushX;
      rz = closestZ + pushZ;
    } else if (distSq <= 0.0001) {
      const left = rx - obs.minX;
      const right = obs.maxX - rx;
      const top = rz - obs.minZ;
      const bottom = obs.maxZ - rz;
      const minPen = Math.min(left, right, top, bottom);

      if (minPen === left) rx = obs.minX - playerRadius;
      else if (minPen === right) rx = obs.maxX + playerRadius;
      else if (minPen === top) rz = obs.minZ - playerRadius;
      else rz = obs.maxZ + playerRadius;
    }
  }

  rx = Math.max(bounds.minX + playerRadius, Math.min(bounds.maxX - playerRadius, rx));
  rz = Math.max(bounds.minZ + playerRadius, Math.min(bounds.maxZ - playerRadius, rz));

  return { x: rx, z: rz };
}
