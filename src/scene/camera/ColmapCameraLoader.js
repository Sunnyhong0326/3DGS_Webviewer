import * as THREE from 'three';
import { createThreeCameraFromColmap } from '../../utils/matrixUtils.js';

export async function loadColmapCameras(colmapPath, scene, cameraSwitcher) {
    const response = await fetch(colmapPath);
    const buffer = await response.arrayBuffer();
    const dataView = new DataView(buffer);

    let offset = 0;
    const numRegImages = Number(dataView.getBigUint64(offset, true));
    offset += 8;

    for (let i = 0; i < numRegImages; i++) {
        const imageId = dataView.getInt32(offset, true);
        offset += 4;

        const qvec = new THREE.Quaternion(
            dataView.getFloat64(offset + 8, true),
            dataView.getFloat64(offset + 16, true),
            dataView.getFloat64(offset + 24, true),
            dataView.getFloat64(offset, true)
        );
        offset += 32;

        const tvec = new THREE.Vector3(
            dataView.getFloat64(offset, true),
            dataView.getFloat64(offset + 8, true),
            dataView.getFloat64(offset + 16, true)
        );
        offset += 24;

        const cameraId = dataView.getInt32(offset, true);
        offset += 4;
        
        let imageName = '';
        while (true) {
            const charCode = dataView.getInt8(offset);
            offset ++;
            if (charCode === 0) break;
            imageName += String.fromCharCode(charCode);
        }

        const numPoints2D = Number(dataView.getBigUint64(offset, true));
        offset += 8;

        for (let j = 0; j < numPoints2D; j++) offset += 24;

        const cam = createThreeCameraFromColmap(qvec, tvec, 50, window.innerWidth / window.innerHeight);
        cameraSwitcher.addCameraHelper(cam, 'colmap');
    }

    console.log("Parsed cameras:", numRegImages);
    return true;
}
