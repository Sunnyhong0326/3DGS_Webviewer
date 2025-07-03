import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import CameraSwitcher from '../camera/CameraSwitcher.js';
import { loadColmapCameras } from '../camera/ColmapCameraLoader.js';
import { loadTransformMatrix } from '../camera/TransformMatrixLoader.js';
import { runRenderLoop } from './ViewerRenderer.js';
import { getQueryParam } from '../../utils/queryParam.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import {
    MeshBVHHelper,
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast,
} from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export class SceneManager {
    static _instance = null;

    static getInstance(canvas) {
        if (!SceneManager._instance) {
            SceneManager._instance = new SceneManager(canvas);
        } else if (canvas && SceneManager._instance.canvas !== canvas) {
            SceneManager._instance.canvas = canvas;
        }
        return SceneManager._instance;
    }

    constructor(canvas) {
        this.canvas = canvas;
        this.sceneId = getQueryParam(new URLSearchParams(window.location.search), 'scene_id', '');

        this.scene = new THREE.Scene();
        this.mainCamera = null;
        this.renderer = null;
        this.controls = null;
        this.viewer = null;
        this.cameraSwitcher = null;
        this.cameraInfoCallback = null;

        this.splatPath = this.sceneId ? `results/${this.sceneId}/point_cloud/point_cloud.ply` : '';
        this.meshPath = this.sceneId ? `results/${this.sceneId}/mesh/tsdf_fusion.ply` : '';
        this.colmapPath = `results/${this.sceneId}/colmap/images.bin`;
        this.transformPath = `results/${this.sceneId}/colmap/transform.txt`;

        this.raycaster = new THREE.Raycaster();
        this.raycaster.firstHitOnly = true;
        this.mouse = new THREE.Vector2();

        this.meshModel = null;
        this.bvhHelper = null;

        this.currentRenderMode = '3dgs';
        this._initialized = false;
        this.isDragging = false;
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;

        this.setupRenderer();
        this.setupCamera();
        this.setupControls();

        this.cameraSwitcher = new CameraSwitcher(this.scene, this.renderer, this.mainCamera, this.controls);
        await loadColmapCameras(this.colmapPath, this.scene, this.cameraSwitcher);
        this.viewer = await this.loadGaussianScene();
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
        if (!(await this.fileExists(this.splatPath))) {
            console.warn(`[SceneManager] 3DGS file not found: ${this.splatPath}`);
            return null;
        }

        const viewer = new GaussianSplats3D.Viewer({
            selfDrivenMode: false,
            threeScene: this.scene,
            useBuiltInControls: false,
            renderer: this.renderer,
            camera: this.mainCamera,
            inMemoryCompressionLevel: 2,
        });

        await viewer.addSplatScene(this.splatPath, {
            splatAlphaRemovalThreshold: 5,
            showLoadingUI: true,
        });
        
        return viewer;
    }

    async loadMeshModel() {
        if (!(await this.fileExists(this.meshPath))) {
            console.warn(`[SceneManager] Mesh file not found: ${this.meshPath}`);
            return;
        }

        const loader = new PLYLoader();
        loader.load(this.meshPath, (geometry) => {

            const position = geometry.attributes.position;

            if (!position || position.count === 0 || !Number.isFinite(position.count)) {
                console.error('[MeshModel] Invalid position attribute. Cannot render in wireframe mode.');
                return;
            }

            if (!geometry.index) {
                console.warn('[MeshModel] Geometry is not indexed — generating dummy index for wireframe support.');
                const indices = Array.from({ length: position.count }, (_, i) => i);
                geometry.setIndex(indices);
            }

            geometry.computeVertexNormals();
            geometry.computeBoundsTree();

            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                flatShading: false,
                wireframe: false, // initially off
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'MeshModel';
            mesh.visible = this.currentRenderMode === 'mesh';

            this.scene.add(mesh);
            this.meshModel = mesh;

            const light = new THREE.DirectionalLight(0xffffff, 3);
            light.position.set(0,0,3);
            this.scene.add(light);
            this.scene.add(new THREE.AmbientLight(0x404040));
            
            console.log('[MeshModel] Geometry loaded:', geometry);
            console.log('[MeshModel] Has color:', !!geometry.attributes.color);
            console.log('[MeshModel] Has index:', !!geometry.index);
            console.log('[MeshModel] Vertex count:', geometry.attributes.position.count);


        });
    }

    registerClickHandler(onHitCallback = null) {
        const domElement = this.canvas;
        if (this._clickHandler) {
            console.warn('[SceneManager] Click handler already registered. Skipping.');
            return;
        }
        console.log("Register Click");
        const handleClick = (event) => {
            if (!this.meshModel) {
                console.warn('[Raycast] Mesh model not loaded yet. Click ignored.');
                return;
            }
            if (this.isDragging) {
                console.log('[Raycast] Skipping click during OrbitControls drag');
                return;
            }
            const rect = domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.mainCamera);
            const intersects = this.raycaster.intersectObject(this.meshModel, false);

            if (intersects.length > 0) {
                const hit = intersects[0];
                const geom = hit.object.geometry;

                if (!geom.index || !geom.attributes.color) return;

                const colorAttr = geom.attributes.color;
                const faceIdx = hit.faceIndex;
                const idxAttr = geom.index;

                const i0 = idxAttr.getX(faceIdx * 3);
                const i1 = idxAttr.getX(faceIdx * 3 + 1);
                const i2 = idxAttr.getX(faceIdx * 3 + 2);

                [i0, i1, i2].forEach((i) => {
                    colorAttr.setX(i, 1);
                    colorAttr.setY(i, 0);
                    colorAttr.setZ(i, 0);
                });

                colorAttr.needsUpdate = true;
                console.log(`[Raycast] Marked triangle ${faceIdx} red.`);
                if (onHitCallback) onHitCallback(hit);
            }
        };
        this._clickHandler = handleClick;
        domElement.addEventListener('click', this._clickHandler);
    }

    unregisterClickHandler() {
        const domElement = this.canvas;
        if (this._clickHandler) {
            domElement.removeEventListener('click', this._clickHandler);
            this._clickHandler = null;
            console.log('[SceneManager] Raycast click handler removed');
        }
    }

    dispose() {
        console.log("called dispose");
        if (this.canvas && this._clickHandler) {
            this.canvas.removeEventListener('click', this._clickHandler);
            this._clickHandler = null;
            console.log("dispose click handler");
        }
    }

    setShowWireframe(show) {
        if (this.meshModel && this.meshModel.material) {
            if (!this.meshModel) return;

            const materials = Array.isArray(this.meshModel.material)
                ? this.meshModel.material
                : [this.meshModel.material];

            materials.forEach((mat) => {
                if ('wireframe' in mat) {
                    mat.wireframe = !!show;
                    mat.needsUpdate = true;
                }
            });
            console.log(`[SceneManager] Wireframe ${show ? 'enabled' : 'disabled'}`);
        }
    }

    toggleBVHHelper(show) {
        if (!this.meshModel) return;

        if (show) {
            if (!this.bvhHelper) {
                this.bvhHelper = new MeshBVHHelper(this.meshModel, 10); // depth 10
                this.scene.add(this.bvhHelper);
            }
            this.bvhHelper.visible = true;
        } else if (this.bvhHelper) {
            this.bvhHelper.visible = false;
        }
    }

    setRenderMode(mode) {
        this.currentRenderMode = mode;
        if (mode === '3dgs') {
            if (this.viewer?.splatMesh) this.viewer.splatMesh.visible = true;
            if (this.meshModel) this.meshModel.visible = false;
        } else if (mode === 'mesh') {
            if (this.viewer?.splatMesh) this.viewer.splatMesh.visible = false;
            if (this.meshModel) this.meshModel.visible = true;
        } else if (mode === 'none') {
            if (this.viewer?.splatMesh) this.viewer.splatMesh.visible = false;
            if (this.meshModel) this.meshModel.visible = false;
        }
    }

    setShowCameraHelper(show) {
        if (this.cameraSwitcher) {
            this.cameraSwitcher.toggleColmapCameras(show);
        }
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

        this.isDragging = false;
        this.controls.addEventListener('start', () => {
            this.isDragging = true;
        });
        this.controls.addEventListener('end', () => {
            setTimeout(() => {
                this.isDragging = false;
            }, 100);
        });
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
