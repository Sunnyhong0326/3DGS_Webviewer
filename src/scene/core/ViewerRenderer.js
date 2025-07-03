import * as THREE from 'three';
import { convertECEFtoGPS } from '../../utils/geoUtils.js';

export async function runRenderLoop({
    scene,
    renderer,
    controls,
    mainCamera,
    viewer,
    transformMatrix,
    onCameraUpdate = null,
}) {
    const movementThreshold = 0.001;     // ~1mm movement threshold
    const waitTimeMs = 500;             // 1s wait to confirm stillness

    let lastMovingTime = 0;
    let lastPosition = new THREE.Vector3();
    let lastGPS = { lat: 0, lon: 0, alt: 0 };
    let gpsUpdatedForCurrentPos = false;

    async function loop() {
        requestAnimationFrame(loop);

        controls.update();
        renderer.render(scene, mainCamera);
        viewer?.update();
        if (viewer?.splatMesh?.visible && viewer?.splatRenderReady) {
            viewer?.render();
        }

        if (!mainCamera || !transformMatrix) return;

        const currentPosition = mainCamera.position.clone();
        const distance = currentPosition.distanceTo(lastPosition);
        const now = performance.now();

        let shouldUpdateGPS = false;

        if (distance > movementThreshold) {
            lastMovingTime = now;
            lastPosition.copy(currentPosition);
            gpsUpdatedForCurrentPos = false;
        } else {
            if (!gpsUpdatedForCurrentPos && now - lastMovingTime >= waitTimeMs) {
                shouldUpdateGPS = true;
            }
        }

        const ecef = currentPosition.clone().applyMatrix4(transformMatrix);

        if (shouldUpdateGPS) {
            try {
                lastGPS = await convertECEFtoGPS(ecef.x, ecef.y, ecef.z);
                gpsUpdatedForCurrentPos = true;
            } catch (err) {
                console.warn("GPS conversion failed", err);
            }
        }
        
        if (distance > movementThreshold || shouldUpdateGPS) {
            onCameraUpdate?.({
                colmap: { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
                ecef: { x: ecef.x, y: ecef.y, z: ecef.z },
                gps: { lat: lastGPS.lat, lon: lastGPS.lon, alt: lastGPS.alt },
            });
        }
    }

    loop();
}
