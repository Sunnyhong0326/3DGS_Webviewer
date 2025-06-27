// src/scene/CameraSwitcher.js
import * as THREE from 'three';

export default class CameraSwitcher {
    constructor(scene, renderer, mainCamera, controls) {
        this.scene = scene;
        this.renderer = renderer;
        this.controls = controls;

        this.mainCamera = mainCamera;
        this.activeCamera = mainCamera;

        this.colmapCameras = [];
        this.colmapHelpers = [];
        this.showColmapHelpers = true;
    }

    /**
     * Adds a COLMAP camera and optionally a helper frustum
     */
    addCameraHelper(colmapCamera, label = 'colmap') {
        this.colmapCameras.push(colmapCamera);

        const helper = new THREE.CameraHelper(colmapCamera);
        helper.visible = this.showColmapHelpers;

        const color = new THREE.Color(label === 'colmap' ? 0xff0000 : 0x00ff00);
        helper.setColors?.(color, color, color, color, color);

        this.colmapHelpers.push(helper);
        this.scene.add(helper);
    }

    /**
     * Toggle visibility of all COLMAP camera helpers
     */
    toggleColmapCameras(forceState = null) {
        this.showColmapHelpers = forceState !== null ? forceState : !this.showColmapHelpers;

        this.colmapHelpers.forEach(helper => {
            helper.visible = this.showColmapHelpers;
        });
    }

    /**
     * Get the currently active camera (for rendering, stats, etc.)
     */
    getActiveCamera() {
        return this.activeCamera;
    }

    /**
     * Optional: Switch to a different camera (future feature)
     */
    switchToCamera(camera) {
        this.activeCamera = camera;
        this.controls.object = camera;
        this.controls.update();
    }

    resetToMainCamera() {
        this.switchToCamera(this.mainCamera);
    }
}
