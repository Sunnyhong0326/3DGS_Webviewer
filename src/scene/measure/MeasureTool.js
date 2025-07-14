import * as THREE from 'three';

export class MeasureTool {
    constructor(scene, markerRadius = 0.01) {
        this.scene = scene;
        this.points = [];
        this.markerRadius = markerRadius;
        this.markers = [];
        this.line = null;
        this.textSprite = null;
    }

    addPoint(position, transformMatrix) {
        // Create and add marker
        const geometry = new THREE.SphereGeometry(this.markerRadius, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        this.scene.add(marker);
        this.markers.push(marker);

        // Save point
        this.points.push(position.clone());

        if (this.points.length === 2) {
            this.drawLineAndDistance(transformMatrix);
        } else if (this.points.length > 2) {
            this.clear();
            this.addPoint(position);
        }
    }

    drawLineAndDistance(transformMatrix) {
        const [p1, p2] = this.points;

        // Create the line geometry
        const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);

        // Create the line material that always renders on top
        const lineMat = new THREE.LineDashedMaterial({
            color: 0xff0000,
            depthTest: false,
            dashSize: 0.02,
            gapSize: 0.01
        });

        // Create and add the line to the scene
        this.line = new THREE.Line(lineGeom, lineMat);
        this.line.computeLineDistances();
        this.scene.add(this.line);

        const ecef1 = p1.clone().applyMatrix4(transformMatrix);
        const ecef2 = p2.clone().applyMatrix4(transformMatrix);
        const realDistance = ecef1.distanceTo(ecef2);

        // Optional: Distance label
        const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const sprite = this.createTextSprite(`${realDistance.toFixed(3)} m`);
        sprite.position.copy(midpoint);
        sprite.frustumCulled = false;
        this.scene.add(sprite);
        this.textSprite = sprite;

        console.log(`[MeasureTool] Real-world distance: ${realDistance.toFixed(3)} meters`);
    }


    createTextSprite(message) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '24px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(message, 10, 30);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.8, 0.4, 1); // adjust size
        return sprite;
    }

    clear() {
        this.points = [];

        this.markers.forEach(m => {
            this.scene.remove(m);
            m.geometry.dispose();
            m.material.dispose();
        });
        this.markers = [];

        if (this.line) {
            this.scene.remove(this.line);
            this.line.geometry.dispose();
            this.line.material.dispose();
            this.line = null;
        }

        if (this.textSprite) {
            this.scene.remove(this.textSprite);
            this.textSprite.material.map.dispose();
            this.textSprite.material.dispose();
            this.textSprite = null;
        }
    }
}
