import * as THREE from 'three';
import { computeSelectedTriangles } from './computeSelectedTriangles.js';

export class LassoTool {
    constructor(scene, camera, domElement, overlayCanvas) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.overlayCanvas = overlayCanvas;
        this.ctx = overlayCanvas.getContext('2d');

        this.isDrawing = false;
        this.path = [];
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

    get points() {
        const pts = [];
        const w = this.overlayCanvas.width;
        const h = this.overlayCanvas.height;
        for (const p of this.path) {
            const nx = (p.x / w) * 2 - 1;
            const ny = -((p.y / h) * 2 - 1);
            pts.push(nx, ny, 0);
        }
        return pts;
    }

    setMesh(mesh) {
        this.mesh = mesh;
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
        this.path = [{ x: event.clientX, y: event.clientY }];
        this.clearOverlay();
    }

    onMouseMove(event) {
        if (!this.isDrawing) return;
        const { clientX: x, clientY: y } = event;
        this.path.push({ x, y });
        this.draw();
    }

    onMouseUp() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.draw(true);
        this.performSelection();
    }

    draw(close = false) {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        if (this.path.length === 0) return;
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        if (close) this.ctx.closePath();
        this.ctx.stroke();
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
        if (!this.mesh || !this.camera) return;
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
        console.log(`[LassoTool] Selected vertices: ${selected.length}`);
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

