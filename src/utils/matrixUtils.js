import * as THREE from 'three';

/**
 * Converts COLMAP pose (world-to-camera) to a camera-to-world matrix in Three.js
 * @param {THREE.Quaternion} qvec - COLMAP quaternion [qw, qx, qy, qz]
 * @param {THREE.Vector3} tvec - COLMAP translation (world to cam)
 * @returns {THREE.Matrix4} - Three.js world transform matrix
 */
export function colmapPoseToMatrix(qvec, tvec) {
    const R_wc = new THREE.Matrix4().makeRotationFromQuaternion(qvec); // R
    const R_cw = R_wc.clone().transpose();                             // Rᵀ
    const t_cw = tvec.clone().applyMatrix4(R_cw).negate();            // -Rᵀ * t

    // COLMAP → Three.js conversion (Y-down, Z-forward → Y-up, Z-back)
    const cv2gl = new THREE.Matrix4().makeScale(1, -1, -1);
    R_cw.premultiply(cv2gl);

    const M_cw = new THREE.Matrix4().compose(
        t_cw,
        new THREE.Quaternion().setFromRotationMatrix(R_cw),
        new THREE.Vector3(1, 1, 1)
    );

    return M_cw;
}

/**
 * Builds a PerspectiveCamera from COLMAP pose and intrinsics.
 * @param {THREE.Quaternion} qvec
 * @param {THREE.Vector3} tvec
 * @param {number} fov
 * @param {number} aspect
 * @returns {THREE.PerspectiveCamera}
 */
export function createThreeCameraFromColmap(qvec, tvec, fov = 50, aspect = 1.0) {
    const matrix = colmapPoseToMatrix(qvec, tvec);
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 0.10001);
    camera.position.setFromMatrixPosition(matrix);
    camera.quaternion.setFromRotationMatrix(matrix);
    camera.updateMatrixWorld();
    return camera;
}
