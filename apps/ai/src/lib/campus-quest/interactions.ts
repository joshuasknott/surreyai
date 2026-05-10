import * as THREE from 'three';
import type { HotspotDef, HotspotWorld, InteractionCallbacks, CafeModelData } from './types';
import { HOTSPOT_DEFS } from './content';

const LABEL_CONTAINER_ID = 'cq3-labels';

export interface InteractionSystemAPI {
  update: (camera: THREE.Camera) => void;
  dispose: () => void;
  getNearest: () => HotspotDef | null;
  setEnabled: (enabled: boolean) => void;
}

export function createInteractionSystem(
  scene: THREE.Scene,
  modelData: CafeModelData,
  overlayRoot: HTMLElement,
  callbacks: InteractionCallbacks,
): InteractionSystemAPI {
  let disposed = false;
  let enabled = true;
  let nearestHotspot: HotspotDef | null = null;
  const hotspots: HotspotWorld[] = [];
  const labelEls: Map<string, HTMLElement> = new Map();

  let labelContainer = overlayRoot.querySelector(`#${LABEL_CONTAINER_ID}`) as HTMLElement | null;
  if (!labelContainer) {
    labelContainer = document.createElement('div');
    labelContainer.id = LABEL_CONTAINER_ID;
    labelContainer.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden;';
    overlayRoot.appendChild(labelContainer);
  }

  for (const def of HOTSPOT_DEFS) {
    const anchor = new THREE.Object3D();
    anchor.name = `hotspot-${def.id}`;
    anchor.position.set(def.x, def.markerHeight, def.z);
    scene.add(anchor);

    const worldPos = new THREE.Vector3(def.x, def.markerHeight, def.z);

    hotspots.push({ def, anchor, worldPos });

    const label = document.createElement('div');
    label.dataset.hotspotId = def.id;
    label.style.cssText = `
      position: absolute;
      transform: translate(-50%, -100%);
      padding: 0.25rem 0.6rem;
      font-size: 0.65rem;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
      background: rgba(15,13,10,0.65);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 0.4rem;
      white-space: nowrap;
      pointer-events: none;
      transition: opacity 0.3s ease;
      font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    `;
    label.textContent = def.title;
    labelContainer.appendChild(label);
    labelEls.set(def.id, label);
  }

  if (import.meta.env.DEV) {
    console.log('[VibeCooking] Hotspots placed:', hotspots.map(h => ({
      id: h.def.id,
      world: h.worldPos.toArray().map(v => v.toFixed(2)),
    })));
  }

  const tempVec = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  function update(camera: THREE.Camera) {
    if (disposed) return;

    camera.getWorldPosition(camPos);
    camera.getWorldDirection(camDir);

    const playerX = camPos.x;
    const playerZ = camPos.z;

    let bestDist = Infinity;
    let best: HotspotDef | null = null;

    for (const hs of hotspots) {
      const dx = playerX - hs.worldPos.x;
      const dz = playerZ - hs.worldPos.z;
      const xzDist = Math.sqrt(dx * dx + dz * dz);

      const label = labelEls.get(hs.def.id);
      if (!label) continue;

      if (xzDist > hs.def.labelDistance) {
        label.style.opacity = '0';
        continue;
      }

      tempVec.copy(hs.worldPos).sub(camPos);
      tempVec.normalize();
      const dot = camDir.dot(tempVec);

      if (dot < 0.15) {
        label.style.opacity = '0';
        continue;
      }

      hs.anchor.getWorldPosition(tempVec);
      tempVec.project(camera);

      const rect = overlayRoot.getBoundingClientRect();
      const x = (tempVec.x * 0.5 + 0.5) * rect.width;
      const y = (-tempVec.y * 0.5 + 0.5) * rect.height;

      label.style.left = `${x}px`;
      label.style.top = `${y - 12}px`;

      const distFactor = 1 - xzDist / hs.def.labelDistance;
      const dirFactor = Math.min(1, (dot - 0.15) / 0.4);
      label.style.opacity = `${Math.min(1, distFactor * dirFactor * 1.5)}`;

      if (xzDist < hs.def.interactRadius && xzDist < bestDist) {
        bestDist = xzDist;
        best = hs.def;
      }
    }

    if (best !== nearestHotspot) {
      nearestHotspot = best;
      callbacks.onNearestChange(nearestHotspot);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!enabled && e.code === 'KeyE') return;
    if (e.code === 'KeyE' && nearestHotspot) {
      e.preventDefault();
      callbacks.onInteract(nearestHotspot.id);
    }
  }

  document.addEventListener('keydown', onKeyDown);

  function dispose() {
    if (disposed) return;
    disposed = true;

    document.removeEventListener('keydown', onKeyDown);

    for (const hs of hotspots) {
      scene.remove(hs.anchor);
    }
    hotspots.length = 0;

    for (const [, label] of labelEls) {
      label.remove();
    }
    labelEls.clear();

    if (labelContainer && labelContainer.parentElement) {
      labelContainer.remove();
    }
  }

  return {
    update,
    dispose,
    getNearest: () => nearestHotspot,
    setEnabled: (v: boolean) => { enabled = v; },
  };
}
