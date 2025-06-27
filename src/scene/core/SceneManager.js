// src/scene/core/SceneManager.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import CameraSwitcher from '../camera/CameraSwitcher.js';
import { loadColmapCameras } from '../camera/ColmapCameraLoader.js';
import { loadTransformMatrix } from '../camera/TransformMatrixLoader.js';
import { runRenderLoop } from './ViewerRenderer.js';
import { getQueryParam } from '../../utils/queryParam.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.queryParams = new URLSearchParams(window.location.search);
        this.sceneId = getQueryParam(this.queryParams, 'scene_id', '');

        this.scene = new THREE.Scene();
        this.mainCamera = null;
        this.renderer = null;
        this.controls = null;
        this.viewer = null;
        this.cameraSwitcher = null;
        this.cameraInfoCallback = null;

        this.splatPath = this.sceneId
            ? `results/${this.sceneId}/point_cloud/splat.ply`
            : '';
        
        this.colmapPath = `results/${this.sceneId}/colmap/sparse/0/images.bin`;
        this.transformPath = `results/${this.sceneId}/colmap/transform.txt`;
    }

    async init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupControls();

        this.cameraSwitcher = new CameraSwitcher(this.scene, this.renderer, this.mainCamera, this.controls);

        await loadColmapCameras(this.colmapPath, this.scene, this.cameraSwitcher);
        this.viewer = await this.loadGaussianScene();

        const transformMatrix = await loadTransformMatrix(this.transformPath);

        await runRenderLoop({
            scene: this.scene,
            renderer: this.renderer,
            controls: this.controls,
            cameraSwitcher: this.cameraSwitcher,
            mainCamera: this.mainCamera,
            viewer: this.viewer,
            transformMatrix,
            onCameraUpdate: this.cameraInfoCallback,
        });

        window.addEventListener('resize', () => this.onWindowResize());
    }

    async loadGaussianScene() {
        const viewer = new GaussianSplats3D.Viewer({
            selfDrivenMode: false,
            threeScene: this.scene,
            useBuiltInControls: false,
            renderer: this.renderer,
            camera: this.mainCamera,
            inMemoryCompressionLevel: 1,
        });

        await viewer.addSplatScene(this.splatPath, {
            splatAlphaRemovalThreshold: 5,
            showLoadingUI: true,
        });

        return viewer;
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer();
        this.canvas.replaceWith(this.renderer.domElement);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setupCamera() {
        this.mainCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.mainCamera.position.set(0, 0, 5);
        this.mainCamera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.controls = new OrbitControls(this.mainCamera, this.renderer.domElement);
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.update();
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.mainCamera.aspect = window.innerWidth / window.innerHeight;
        this.mainCamera.updateProjectionMatrix();
    }

    setCameraInfoCallback(callback) {
        this.cameraInfoCallback = callback;
    }
}