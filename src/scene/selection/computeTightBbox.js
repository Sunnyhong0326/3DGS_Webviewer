export function computeTightBoxFromIndexPositions(mesh, indexPositions) {
  const pos = mesh.geometry.attributes.position;
  const idx = mesh.geometry.index;
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const seen = new Set();

  mesh.updateMatrixWorld(true);

  for (let i = 0; i < indexPositions.length; i++) {
    const idxPos = indexPositions[i];      // position in index buffer
    const vertId = idx.getX(idxPos);       // actual vertex index
    if (seen.has(vertId)) continue;
    seen.add(vertId);

    v.fromBufferAttribute(pos, vertId).applyMatrix4(mesh.matrixWorld);
    box.expandByPoint(v);
  }

  return box;
}

