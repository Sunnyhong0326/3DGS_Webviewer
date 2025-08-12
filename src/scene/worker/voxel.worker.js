// src/workers/voxel.worker.js
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

self.onmessage = (e) => {
  const { positions, bboxMin, bboxMax, voxelSize } = e.data;

  // tiny geometry in world space
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeBoundingBox();
  geom.computeBoundingSphere();

  // BVH for the selected triangles only
  const bvh = new MeshBVH(geom, { lazyGeneration: false });

  const min = new THREE.Vector3().fromArray(bboxMin);
  const max = new THREE.Vector3().fromArray(bboxMax);
  const size = new THREE.Vector3().subVectors(max, min);

  const nx = Math.max(1, Math.ceil(size.x / voxelSize));
  const ny = Math.max(1, Math.ceil(size.y / voxelSize));
  const nz = Math.max(1, Math.ceil(size.z / voxelSize));
  const half = voxelSize * 0.5;

  const box = new THREE.Box3();
  const chunk = [];
  const CHUNK = 4096; // voxels per message

  let count = 0;
  for (let iy=0; iy<ny; iy++) {
    for (let ix=0; ix<nx; ix++) {
      for (let iz=0; iz<nz; iz++) {
        const cx = min.x + (ix + 0.5) * voxelSize;
        const cy = min.y + (iy + 0.5) * voxelSize;
        const cz = min.z + (iz + 0.5) * voxelSize;

        box.min.set(cx - half, cy - half, cz - half);
        box.max.set(cx + half, cy + half, cz + half);

        if (bvh.intersectsBox(box)) {
          chunk.push(cx, cy, cz);
          count++;
          if (chunk.length >= CHUNK * 3) {
            const arr = new Float32Array(chunk);
            self.postMessage({ type: 'chunk', centers: arr }, [arr.buffer]);
            chunk.length = 0;
          }
        }
      }
    }
  }

  if (chunk.length) {
    const arr = new Float32Array(chunk);
    self.postMessage({ type: 'chunk', centers: arr }, [arr.buffer]);
  }

  self.postMessage({ type: 'done', count });
};
