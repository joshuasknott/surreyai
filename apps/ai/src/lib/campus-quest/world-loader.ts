import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CafeModelData } from './types';
import { MODEL_SCALE } from './layout';

const MODEL_PATH = '/models/small-cafe/isometric-cafe.glb';

export function loadCafeModel(
  scene: THREE.Scene,
  onProgress: (percent: number) => void,
): Promise<CafeModelData> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(
      MODEL_PATH,
      (gltf) => {
        const model = gltf.scene;

        model.scale.setScalar(MODEL_SCALE);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const materials = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
              for (const mat of materials) {
                if ('toneMapped' in mat) {
                  (mat as THREE.MeshStandardMaterial).toneMapped = true;
                }
              }
            }
          }
        });

        model.updateMatrixWorld(true);

        const rawBox = new THREE.Box3().setFromObject(model);
        const rawCenter = new THREE.Vector3();
        rawBox.getCenter(rawCenter);

        model.position.x -= rawCenter.x;
        model.position.z -= rawCenter.z;
        model.position.y -= rawBox.min.y;

        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        if (import.meta.env.DEV) {
          console.log('[VibeCooking] Model (scale=' + MODEL_SCALE + ')', {
            min: box.min.toArray(),
            max: box.max.toArray(),
            size: size.toArray(),
            center: center.toArray(),
          });
        }

        scene.add(model);

        resolve({ scene: model, boundingBox: box, size, center });
      },
      (event) => {
        if (event.total > 0) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
      (error) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load café model';
        reject(new Error(message));
      },
    );
  });
}
