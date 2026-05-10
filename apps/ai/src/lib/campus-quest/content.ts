import type { HotspotDef } from './types';
import { HOTSPOT_POSITIONS } from './layout';

const STATION_META: Record<string, { title: string; prompt: string }> = {
  'coffee-counter': { title: 'Cafe Counter', prompt: 'Get Coffee' },
};

export const HOTSPOT_DEFS: HotspotDef[] = HOTSPOT_POSITIONS.map((pos) => {
  const meta = STATION_META[pos.station];
  return {
    id: pos.station,
    station: pos.station,
    title: meta.title,
    prompt: meta.prompt,
    x: pos.x,
    z: pos.z,
    markerHeight: pos.markerHeight,
    interactRadius: pos.interactRadius,
    labelDistance: pos.labelDistance,
  };
});
