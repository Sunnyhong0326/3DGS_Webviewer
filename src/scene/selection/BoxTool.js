import * as THREE from 'three';
import { computeSelectedTriangles } from './computeSelectedTriangles.js';

export class BoxTool {
    constructor(scene, camera, domElement, overlayCanvas) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.overlayCanvas = overlayCanvas;
        this.ctx = overlayCanvas.getContext('2d');

        this.isDrawing = false;
        this.start = null;
        this.end = null;
        this.selectedMarkers = [];
        this.mesh = null;
        this.params = {
            selectionMode: 'intersection',
            selectWholeModel: false,
            useBoundsTree: true,
        };
    }

    setOverlayCanvas(canvas) {
        this.overlayCanvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    setMesh(mesh) {
        this.mesh = mesh;
    }

    get points() {
        if (!this.start || !this.end) return [];
        const w = this.overlayCanvas.width;
        const h = this.overlayCanvas.height;
        const x1 = (this.start.x / w) * 2 - 1;
        const y1 = -((this.start.y / h) * 2 - 1);
        const x2 = (this.end.x / w) * 2 - 1;
        const y2 = -((this.end.y / h) * 2 - 1);
        return [
            x1, y1, 0,
            x2, y1, 0,
            x2, y2, 0,
            x1, y2, 0,
        ];
    }

    activate() {
        if (!this.domElement) return;
        this._onMouseDown = this.onMouseDown.bind(this);
        this._onMouseMove = this.onMouseMove.bind(this);
        this._onMouseUp = this.onMouseUp.bind(this);
        this.domElement.addEventListener('mousedown', this._onMouseDown);
        this.domElement.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
    }

    deactivate() {
        if (!this.domElement) return;
        this.domElement.removeEventListener('mousedown', this._onMouseDown);
        this.domElement.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
        this.clearOverlay();
        this.clearSelection();
    }

    onMouseDown(event) {
        this.isDrawing = true;
        const { clientX: x, clientY: y } = event;
        this.start = { x, y };
        this.end = { x, y };
        this.clearOverlay();
    }

    onMouseMove(event) {
        if (!this.isDrawing) return;
        const { clientX: x, clientY: y } = event;
        this.end = { x, y };
        this.draw();
    }

    onMouseUp() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.draw();
        this.performSelection();
    }

    draw() {
        if (!this.ctx || !this.start || !this.end) return;
        const { x: x1, y: y1 } = this.start;
        const { x: x2, y: y2 } = this.end;
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);
    }

    clearOverlay() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
    }

    clearSelection() {
        this.selectedMarkers.forEach((m) => {
            this.scene.remove(m);
            m.geometry.dispose();
            m.material.dispose();
        });
        this.selectedMarkers = [];
    }

    performSelection() {
        if (!this.mesh || !this.camera || !this.start || !this.end) return;
        const indices = computeSelectedTriangles(this.mesh, this.camera, this, this.params);
        const positions = this.mesh.geometry.attributes.position;
        const worldPosition = new THREE.Vector3();
        const selected = [];
        const unique = new Set(indices);
        unique.forEach((i) => {
            worldPosition.fromBufferAttribute(positions, i);
            worldPosition.applyMatrix4(this.mesh.matrixWorld);
            selected.push(worldPosition.clone());
        });
        this.highlight(selected);
        console.log(`[BoxTool] Selected vertices: ${selected.length}`);
    }

    highlight(points) {
        this.clearSelection();
        const geometry = new THREE.SphereGeometry(0.01, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        points.forEach((p) => {
            const marker = new THREE.Mesh(geometry, material.clone());
            marker.position.copy(p);
            marker.frustumCulled = false;
            this.scene.add(marker);
            this.selectedMarkers.push(marker);
        });
    }
}

