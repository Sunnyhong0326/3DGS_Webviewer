import * as THREE from 'three';
import CameraSwitcher from '../camera/CameraSwitcher.js';
import { loadColmapCameras } from '../camera/ColmapCameraLoader.js';
import { loadTransformMatrix } from '../camera/TransformMatrixLoader.js';
import { MeasureTool } from '../measure/MeasureTool.js';
import { LassoSelection, BoxSelection } from '../selection/Selection';
import { computeSelectedTriangles } from '../selection/computeSelectedTriangles';
import { computeBoxSelectedTriangles } from '../selection/computeBoxSelectedTriangles.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { runRenderLoop } from './ViewerRenderer.js';
import { getQueryParam } from '../../utils/queryParam.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import {
    MeshBVHHelper,
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast,
} from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Reuse temps to avoid GC
const _boxToMesh = new THREE.Matrix4();
const _boxLocal  = new THREE.Box3();

function fastBoxHitsMesh(mesh, boxMesh) {
  // keep matrices fresh
  mesh.updateMatrixWorld(true);
  boxMesh.updateMatrixWorld(true);

  // 1) Actual local AABB of the selection box (works for non-unit BoxGeometry too)
  const g = boxMesh.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  _boxLocal.copy(g.boundingBox);

  // 2) Transform from box local -> mesh local  (mesh^-1 * box)
  _boxToMesh.copy(mesh.matrixWorld).invert().multiply(boxMesh.matrixWorld);

  // 3) Ask BVH for a cheap boolean
  return mesh.geometry.boundsTree.intersectsBox(_boxLocal, _boxToMesh);
}


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

        this.selectionBox = null;
        this.transformControls = null;

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
        this.measureTool = new MeasureTool(this.scene);
        await loadColmapCameras(this.colmapPath, this.scene, this.cameraSwitcher);
        this.viewer = await this.loadGaussianScene();
        await this.loadMeshModel();

        this.transformMatrix = await loadTransformMatrix(this.transformPath);

        await runRenderLoop({
            scene: this.scene,
            renderer: this.renderer,
            controls: this.controls,
            mainCamera: this.mainCamera,
            viewer: this.viewer,
            transformMatrix: this.transformMatrix,
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
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'MeshModel';
            mesh.visible = this.currentRenderMode === 'mesh';
            
            this.scene.add(mesh);
            this.meshModel = mesh;

            this.highlightMesh = new THREE.Mesh(
                this.meshModel.geometry.clone(),
                new THREE.MeshBasicMaterial({
                    color: 0xff9800,
                    opacity: 0.25,
                    transparent: true,
                    depthWrite: false,
                })
            );
            this.highlightMesh.geometry.drawRange.count = 0;
            this.highlightMesh.visible = false;
            this.scene.add(this.highlightMesh);

            const lightTop = new THREE.DirectionalLight(0xffffff, 3);
            const lightRight = new THREE.DirectionalLight(0xffffff, 1);
            const lightLeft= new THREE.DirectionalLight(0xffffff, 1);
            const lightUp= new THREE.DirectionalLight(0xffffff, 1);
            const lightDown= new THREE.DirectionalLight(0xffffff, 1);

            lightTop.position.set(0,0,3);
            lightRight.position.set(3,0,0);
            lightLeft.position.set(-3,0,0);
            lightUp.position.set(0,3,0);
            lightDown.position.set(0,-3,0);

            this.scene.add(lightTop);
            this.scene.add(lightRight);
            this.scene.add(lightLeft);
            this.scene.add(lightUp);
            this.scene.add(lightDown);

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
                const hitPoint = hit.point;

                this.measureTool.addPoint(hitPoint, this.transformMatrix);

                console.log(`[Raycast] Placed marker at`, hitPoint);

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
            this.disableSelection();
            this.canvas.removeEventListener('click', this._clickHandler);
            this._clickHandler = null;
            console.log("dispose click handler");
        }
    }

    enableSelection(selectionType) {
        console.log("selection type", selectionType);
        if (!this.meshModel || selectionType == null) return;

        console.log("Enable Selection");

        if (selectionType === 'box3d') {
            this.selectionBox = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshBasicMaterial({ color: 0xff9800, wireframe: true })
            );
            this.scene.add(this.selectionBox);

            this.transformControls = new TransformControls(this.mainCamera, this.renderer.domElement);
            this.transformControls.attach(this.selectionBox);

            // orbit vs gizmo
            this.transformControls.addEventListener('dragging-changed', (e) => {
                this.controls.enabled = !e.value;
                // while dragging, hide highlight (we’ll recompute on release)
                if (e.value && this.highlightMesh) this.highlightMesh.visible = false;
            });

            // FAST preview during drag: tint box if anything will be selected
            let rafPending = false;
            this._onTCChange = () => {
                if (rafPending) return;
                rafPending = true;
                requestAnimationFrame(() => {
                    const hit = fastBoxHitsMesh(this.meshModel, this.selectionBox);
                    // optional visual feedback
                    this.selectionBox.material.color.setHex(hit ? 0xff4081 : 0xff9800);
                    rafPending = false;
                });
            };
            this.transformControls.addEventListener('change', this._onTCChange);

            // PRECISE selection once the user finishes dragging
            this._onTCMouseUp = () => {
                this.updateBoxSelectionResult();
                // reset tint after finalize
                this.selectionBox.material.color.setHex(0xff9800);
            };
            this.transformControls.addEventListener('mouseUp', this._onTCMouseUp);

            this._onKeyDown = (event) => {
                switch ( event.key ) {
                    case 'w':
                        this.transformControls.setMode('translate');
                        break;
                    case 'e':
                        this.transformControls.setMode('rotate');
                        break;
                    case 'r':
                        this.transformControls.setMode('scale');
                        break;
                    case 'Escape':
                        this.transformControls.reset();
                        break;

                }
            }
            window.addEventListener('keydown', this._onKeyDown);
            
            // Add gizmo helper to scene (not the control itself)
            this.transformGizmo = this.transformControls.getHelper();
            this.scene.add(this.transformGizmo);

            // initial compute (optional)
            this.highlightMesh.visible = true;
            this.updateBoxSelectionResult();

            return;
        }


        this.selectionTool = selectionType === 'box' ? new BoxSelection() : new LassoSelection();
        
        this.selectionShape = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0xff9800, depthTest: false })
        );

        this.selectionShape.renderOrder = 999;
        this.selectionShape.visible = false;
        this.scene.add(this.selectionShape);

        this.highlightMesh.visible = true;

        const domElement = this.canvas;

        this._onPointerDown = (e) => {
            this.selectionTool.handlePointerDown(e);
        };

        this._onPointerMove = (e) => {
            if ((e.buttons & 1) === 0) return;
            const { changed } = this.selectionTool.handlePointerMove(e);
            if (changed) {
                this.selectionShape.visible = true;
                this.updateSelectionShape();
            }
        };

        this._onPointerUp = (e) => {
            this.selectionTool.handlePointerUp(e);
            this.selectionShape.visible = false;

            if (this.selectionTool.points.length) {
                this.updateSelectionResult();
            }
        };

        domElement.addEventListener('pointerdown', this._onPointerDown);
        domElement.addEventListener('pointermove', this._onPointerMove);
        domElement.addEventListener('pointerup', this._onPointerUp);
        this.controls.enabled = false;
    }

    disableSelection() {
        console.log("Disable Selection");
        const domElement = this.canvas;

        if (this._onPointerDown) {
            domElement.removeEventListener('pointerdown', this._onPointerDown);
            this._onPointerDown = null;
        }
        if (this._onPointerMove) {
            domElement.removeEventListener('pointermove', this._onPointerMove);
            this._onPointerMove = null;
        }
        if (this._onPointerUp) {
            domElement.removeEventListener('pointerup', this._onPointerUp);
            this._onPointerUp = null;
        }
        if (this._onTCChange) {
            domElement.removeEventListener('change', this._onTCChange);
            this._onTCChange = null;
        }
        if (this._onTCMouseUp) {
            domElement.removeEventListener('mouseUp', this._onTCMouseUp);
            this._onTCMouseUp = null;
        }
        if (this._onKeyDown) {
            window.removeEventListener( 'keydown', this._onKeyDown);;
            this._onKeyUp = null;
        }
        if (this.selectionShape) {
            this.scene.remove(this.selectionShape);
            this.selectionShape.geometry.dispose();
        }
        if (this.transformControls) {
            this.scene.remove(this.transformGizmo);
            this.transformGizmo.dispose?.();
            this.transformControls = null;
        }
        if (this.selectionBox) {
            this.scene.remove(this.selectionBox);
            this.selectionBox.geometry.dispose();
            this.selectionBox.material.dispose();
            this.selectionBox = null;
        }

        this.selectionTool = null;
        this.controls.enabled = true;
    }

    updateSelectionShape() {
        if (!this.selectionTool || !this.selectionShape) return;

        const pointsNDC = this.selectionTool.points;

        const worldPoints = [];

        for (let i = 0; i < pointsNDC.length; i += 3) {
            const ndc = new THREE.Vector3(
                pointsNDC[i],
                pointsNDC[i + 1],
                0 
            );
            ndc.unproject(this.mainCamera);
            worldPoints.push(ndc.x, ndc.y, ndc.z);
        }

        const closedLoop = [
            ...worldPoints,
            ...worldPoints.slice(0, 3)
        ];

        this.selectionShape.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(closedLoop, 3)
        );
        this.selectionShape.geometry.setDrawRange(0, closedLoop.length / 3);
        this.selectionShape.geometry.attributes.position.needsUpdate = true;
    }

    updateSelectionResult() {
        if (!this.selectionTool || !this.meshModel || !this.highlightMesh) return;

        const indices = computeSelectedTriangles(this.meshModel, this.mainCamera, this.selectionTool, {
            toolMode: 'lasso',
            selectionMode: 'intersection',
            useBoundsTree: true,
            selectWholeModel: false,
        });

        const srcIndex = this.meshModel.geometry.index;
        const destIndex = this.highlightMesh.geometry.index;

        for (let i = 0; i < indices.length; i++) {
            destIndex.setX(i, srcIndex.getX(indices[i]));
        }

        this.highlightMesh.geometry.drawRange.count = indices.length;
        destIndex.needsUpdate = true;
    }

    updateBoxSelectionResult() {
        if (!this.selectionBox || !this.meshModel || !this.highlightMesh) return;

        // Cheap cull; skip heavy work if no overlap
        if (!fastBoxHitsMesh(this.meshModel, this.selectionBox)) {
            this.highlightMesh.visible = false;
            this.highlightMesh.geometry.drawRange.count = 0;
            return;
        }

        const indices = computeBoxSelectedTriangles(this.meshModel, this.selectionBox);

        const srcIndex = this.meshModel.geometry.index;
        const destIndex = this.highlightMesh.geometry.index;

        for (let i = 0; i < indices.length; i++) {
            destIndex.setX(i, srcIndex.getX(indices[i]));
        }

        this.highlightMesh.geometry.drawRange.count = indices.length;
        destIndex.needsUpdate = true;
        this.highlightMesh.visible = indices.length > 0;
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
