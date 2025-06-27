import * as THREE from 'three';

/**
 * Load a 4×4 transform matrix from a file (space-separated floats).
 */
export async function loadTransformMatrix(transformPath) {
    const response = await fetch(transformPath);
    const text = await response.text();
    const values = text.trim().split(/\s+/).map(Number);

    const matrix = new THREE.Matrix4();
    matrix.set(...values);
    return matrix;
}
