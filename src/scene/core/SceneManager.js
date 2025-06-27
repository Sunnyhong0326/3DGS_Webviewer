import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import CameraSwitcher from '../camera/CameraSwitcher.js';
import { loadColmapCameras } from '../camera/ColmapCameraLoader.js';
import { loadTransformMatrix } from '../camera/TransformMatrixLoader.js';
import { runRenderLoop } from './ViewerRenderer.js';
import { getQueryParam } from '../../utils/queryParam.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

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
            ? `results/${this.sceneId}/point_cloud/point_clod.ply`
            : '';
        this.meshPath = this.sceneId
            ? `results/${this.sceneId}/mesh/tsdf_fusion.ply` : '';
        
        this.colmapPath = `results/${this.sceneId}/colmap/images.bin`;
        this.transformPath = `results/${this.sceneId}/colmap/transform.txt`;
    }

    async init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupControls();

        this.cameraSwitcher = new CameraSwitcher(this.scene, this.renderer, this.mainCamera, this.controls);

        await loadColmapCameras(this.colmapPath, this.scene, this.cameraSwitcher);
        // this.viewer = await this.loadGaussianScene();
        await this.loadMeshModel();

        const transformMatrix = await loadTransformMatrix(this.transformPath);

        await runRenderLoop({
            scene: this.scene,
            renderer: this.renderer,
            controls: this.controls,
            mainCamera: this.mainCamera,
            viewer: this.viewer,
            transformMatrix,
            onCameraUpdate: this.cameraInfoCallback,
        });

        window.addEventListener('resize', () => this.onWindowResize());
    }

    async fileExists(url) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            return res.ok;
        } catch {
            return false;
        }
    }

    async loadGaussianScene() {
        const exists = await this.fileExists(this.splatPath);
        if (!exists) {
            console.warn(`[SceneManager] 3DGS file not found: ${this.splatPath}`);
            return null;
        }
        console.log("Splat exist");
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

    async loadMeshModel() {
        const exists = await this.fileExists(this.meshPath);
        if (!exists) {
            console.warn(`[SceneManager] Mesh file not found: ${this.meshPath}`);
            return;
        }

        const loader = new PLYLoader();
        loader.load(this.meshPath, (geometry) => {
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                flatShading: false,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'MeshModel';
            mesh.visible = true;

            this.scene.add(mesh);
            this.meshModel = mesh;

            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(0, 0, 3);
            this.scene.add(light);
            this.scene.add(new THREE.AmbientLight(0x404040));
        });
    }

    setRenderMode(mode) {
        if (mode === '3dgs') {
            this.viewer?.setVisibility(true); // or however you hide/show splats
            if (this.meshModel) this.meshModel.visible = false;
        } else if (mode === 'mesh') {
            this.viewer?.setVisibility(false);
            if (this.meshModel) this.meshModel.visible = true;
        }
    }

    setShowCameraHelper(show) {

        if (!this.mainCamera || !this.scene) return;

        this.cameraSwitcher.toggleColmapCameras();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
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