import * as THREE from 'three';
import { BARISTA_POSITION, COFFEE_CUP_POSITION } from './layout';

export interface CustomerSystemAPI {
  setActive: (index: number) => void;
  markServed: (index: number) => void;
  update: (time: number) => void;
  dispose: () => void;
}

export function createCustomerSystem(
  scene: THREE.Scene,
): CustomerSystemAPI {
  let disposed = false;
  let coffeeServed = false;

  const group = new THREE.Group();
  group.name = 'cafe-walkthrough-scene';
  scene.add(group);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  function track<T extends THREE.Object3D>(obj: T): T {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat) materials.add(mat);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return obj;
  }

  function makeMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    return track(mesh);
  }

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd8a06f,
    roughness: 0.62,
    metalness: 0.02,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0x38445f,
    roughness: 0.8,
    metalness: 0.03,
  });
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0xefe1c6,
    roughness: 0.72,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x2b1c16,
    roughness: 0.9,
  });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x15120f });
  const cupMat = new THREE.MeshStandardMaterial({
    color: 0xfff4dc,
    roughness: 0.45,
    metalness: 0.02,
  });
  const coffeeMat = new THREE.MeshStandardMaterial({
    color: 0x4a2a16,
    roughness: 0.55,
  });
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  for (const mat of [skinMat, shirtMat, apronMat, hairMat, darkMat, cupMat, coffeeMat, steamMat]) {
    materials.add(mat);
  }

  const barista = new THREE.Group();
  barista.name = 'barista';
  barista.position.set(BARISTA_POSITION.x, BARISTA_POSITION.y, BARISTA_POSITION.z);
  barista.rotation.y = BARISTA_POSITION.yaw;
  group.add(barista);

  barista.add(makeMesh(new THREE.CapsuleGeometry(0.26, 0.82, 8, 24), shirtMat, [0, 0.78, 0]));
  barista.add(makeMesh(new THREE.BoxGeometry(0.42, 0.62, 0.035), apronMat, [0, 0.76, 0.245]));
  barista.add(makeMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.58, 18), shirtMat, [-0.12, 0.28, 0], [0, 0, 0.05]));
  barista.add(makeMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.58, 18), shirtMat, [0.12, 0.28, 0], [0, 0, -0.05]));
  barista.add(makeMesh(new THREE.CapsuleGeometry(0.055, 0.44, 6, 16), skinMat, [-0.32, 1.14, 0.1], [0.75, 0, -0.72]));
  barista.add(makeMesh(new THREE.CapsuleGeometry(0.055, 0.44, 6, 16), skinMat, [0.32, 1.14, 0.1], [0.75, 0, 0.72]));
  barista.add(makeMesh(new THREE.SphereGeometry(0.065, 18, 12), skinMat, [-0.42, 1.18, 0.28]));
  barista.add(makeMesh(new THREE.SphereGeometry(0.065, 18, 12), skinMat, [0.42, 1.18, 0.28]));
  barista.add(makeMesh(new THREE.SphereGeometry(0.24, 32, 18), skinMat, [0, 1.48, 0.02]));
  barista.add(makeMesh(new THREE.SphereGeometry(0.248, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat, [0, 1.56, 0.01], [0.15, 0, 0]));
  barista.add(makeMesh(new THREE.SphereGeometry(0.026, 12, 8), darkMat, [-0.075, 1.5, 0.225]));
  barista.add(makeMesh(new THREE.SphereGeometry(0.026, 12, 8), darkMat, [0.075, 1.5, 0.225]));
  barista.add(makeMesh(new THREE.BoxGeometry(0.12, 0.018, 0.012), darkMat, [0, 1.42, 0.242]));

  const cup = new THREE.Group();
  cup.name = 'coffee-cup';
  cup.position.set(COFFEE_CUP_POSITION.x, COFFEE_CUP_POSITION.y, COFFEE_CUP_POSITION.z);
  group.add(cup);

  const cupBody = makeMesh(new THREE.CylinderGeometry(0.1, 0.075, 0.2, 32, 1, true), cupMat, [0, 0.1, 0]);
  const cupTop = makeMesh(new THREE.CylinderGeometry(0.091, 0.091, 0.012, 32), coffeeMat, [0, 0.205, 0]);
  const cupBase = makeMesh(new THREE.CylinderGeometry(0.078, 0.078, 0.018, 32), cupMat, [0, 0.006, 0]);
  const handle = makeMesh(new THREE.TorusGeometry(0.062, 0.012, 10, 24, Math.PI * 1.35), cupMat, [0.095, 0.115, 0], [Math.PI / 2, 0, Math.PI / 2]);
  cup.add(cupBody, cupTop, cupBase, handle);

  const steamWisps: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.045;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.23, 0),
      new THREE.Vector3(x + 0.025, 0.34, 0.015),
      new THREE.Vector3(x - 0.018, 0.45, -0.005),
      new THREE.Vector3(x + 0.018, 0.56, 0.008),
    ]);
    const steam = makeMesh(new THREE.TubeGeometry(curve, 18, 0.006, 8, false), steamMat, [0, 0, 0]);
    steamWisps.push(steam);
    cup.add(steam);
  }

  const servedTarget = new THREE.Vector3(COFFEE_CUP_POSITION.x, COFFEE_CUP_POSITION.y, -1.48);
  const waitingTarget = new THREE.Vector3(COFFEE_CUP_POSITION.x, COFFEE_CUP_POSITION.y, COFFEE_CUP_POSITION.z);

  function update(time: number) {
    if (disposed) return;

    barista.position.y = BARISTA_POSITION.y + Math.sin(time * 1.8) * 0.015;
    barista.rotation.y = BARISTA_POSITION.yaw + Math.sin(time * 1.2) * 0.035;

    cup.position.lerp(coffeeServed ? servedTarget : waitingTarget, 0.08);
    cup.rotation.y = Math.sin(time * 1.5) * 0.04;

    for (let i = 0; i < steamWisps.length; i++) {
      const steam = steamWisps[i];
      const phase = time * 1.3 + i * 1.7;
      steam.position.y = Math.sin(phase) * 0.025;
      steam.position.x = Math.sin(phase * 0.9) * 0.012;
      steam.scale.setScalar(0.85 + Math.sin(phase) * 0.1);
    }
  }

  function markServed(_index: number) {
    coffeeServed = true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(group);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }

  return {
    setActive: () => {},
    markServed,
    update,
    dispose,
  };
}
