import * as THREE from 'three';
import { CONTAINED, INTERSECTED, NOT_INTERSECTED } from 'three-mesh-bvh';
import { getConvexHull } from '../../utils/math/getConvexHull.js';
import { lineCrossesLine } from '../../utils/math/lineCrossesLine.js';
import { isPointInsidePolygon } from '../../utils/math/pointRayCrossesSegments.js';

export function computeSelectedTriangles(mesh, camera, selectionTool, params) {
    toScreenSpaceMatrix
        .copy(mesh.matrixWorld)
        .premultiply(camera.matrixWorldInverse)
        .premultiply(camera.projectionMatrix);

    invWorldMatrix.copy(mesh.matrixWorld).invert();
    camLocalPosition
        .set(0, 0, 0)
        .applyMatrix4(camera.matrixWorld)
        .applyMatrix4(invWorldMatrix);

    const lassoSegments = connectPointsWithLines(
        convertTripletsToPoints(selectionTool.points)
    );

    const perBoundsSegmentCache = [];
    const indices = [];

    mesh.geometry.boundsTree.shapecast({
        intersectsBounds: (box, isLeaf, score, depth) => {
            if (!params.useBoundsTree) {
                return INTERSECTED;
            }

            const projectedBoxPoints = extractBoxVertices(box, boxPoints).map((v) =>
                v.applyMatrix4(toScreenSpaceMatrix)
            );

            let minY = Infinity;
            let maxY = -Infinity;
            let minX = Infinity;
            for (const point of projectedBoxPoints) {
                if (point.y < minY) minY = point.y;
                if (point.y > maxY) maxY = point.y;
                if (point.x < minX) minX = point.x;
            }

            const parentSegments = perBoundsSegmentCache[depth - 1] || lassoSegments;
            const segmentsToCheck = parentSegments.filter((segment) =>
                isSegmentToTheRight(segment, minX, minY, maxY)
            );
            perBoundsSegmentCache[depth] = segmentsToCheck;

            if (segmentsToCheck.length === 0) {
                return NOT_INTERSECTED;
            }

            const hull = getConvexHull(projectedBoxPoints);
            const hullSegments = connectPointsWithLines(hull, boxLines);

            if (isPointInsidePolygon(segmentsToCheck[0].start, hullSegments)) {
                return INTERSECTED;
            }

            for (const hullSegment of hullSegments) {
                for (const selectionSegment of segmentsToCheck) {
                    if (lineCrossesLine(hullSegment, selectionSegment)) {
                        return INTERSECTED;
                    }
                }
            }

            return isPointInsidePolygon(hull[0], segmentsToCheck)
                ? CONTAINED
                : NOT_INTERSECTED;
        },

        intersectsTriangle: (tri, index, contained, depth) => {
            const i3 = index * 3;
            const a = i3 + 0;
            const b = i3 + 1;
            const c = i3 + 2;

            const segmentsToCheck = params.useBoundsTree
                ? perBoundsSegmentCache[depth]
                : lassoSegments;
            if (
                params.selectionMode === 'centroid' ||
                params.selectionMode === 'centroid-visible'
            ) {
                centroid.copy(tri.a).add(tri.b).add(tri.c).multiplyScalar(1 / 3);
                screenCentroid.copy(centroid).applyMatrix4(toScreenSpaceMatrix);

                if (
                    contained ||
                    isPointInsidePolygon(screenCentroid, segmentsToCheck)
                ) {
                    if (params.selectionMode === 'centroid-visible') {
                        tri.getNormal(faceNormal);
                        tempRay.origin.copy(centroid).addScaledVector(faceNormal, 1e-6);
                        tempRay.direction.subVectors(camLocalPosition, centroid);

                        const res = mesh.geometry.boundsTree.raycastFirst(
                            tempRay,
                            THREE.DoubleSide
                        );
                        if (res) {
                            return false;
                        }
                    }

                    indices.push(a, b, c);
                    return params.selectWholeModel;
                }
            } else if (params.selectionMode === 'intersection') {
                if (contained) {
                    indices.push(a, b, c);
                    return params.selectWholeModel;
                }

                const projectedTriangle = [tri.a, tri.b, tri.c].map((v) =>
                    v.applyMatrix4(toScreenSpaceMatrix)
                );
                for (const point of projectedTriangle) {
                    if (isPointInsidePolygon(point, segmentsToCheck)) {
                        indices.push(a, b, c);
                        return params.selectWholeModel;
                    }
                }

                const triangleSegments = connectPointsWithLines(
                    projectedTriangle,
                    boxLines
                );
                for (const segment of triangleSegments) {
                    for (const selectionSegment of segmentsToCheck) {
                        if (lineCrossesLine(segment, selectionSegment)) {
                            indices.push(a, b, c);
                            return params.selectWholeModel;
                        }
                    }
                }
            }

            return false;
        },
    });

    return indices;
}

const invWorldMatrix = new THREE.Matrix4();
const camLocalPosition = new THREE.Vector3();
const tempRay = new THREE.Ray();
const centroid = new THREE.Vector3();
const screenCentroid = new THREE.Vector3();
const faceNormal = new THREE.Vector3();
const toScreenSpaceMatrix = new THREE.Matrix4();
const boxPoints = new Array(8).fill().map(() => new THREE.Vector3());
const boxLines = new Array(12).fill().map(() => new THREE.Line3());

function extractBoxVertices(box, target) {
    const { min, max } = box;
    let index = 0;
    for (let x = 0; x <= 1; x++) {
        for (let y = 0; y <= 1; y++) {
            for (let z = 0; z <= 1; z++) {
                const v = target[index];
                v.x = x === 0 ? min.x : max.x;
                v.y = y === 0 ? min.y : max.y;
                v.z = z === 0 ? min.z : max.z;
                index++;
            }
        }
    }
    return target;
}

function isSegmentToTheRight(segment, minX, minY, maxY) {
    const sx = segment.start.x;
    const sy = segment.start.y;
    const ex = segment.end.x;
    const ey = segment.end.y;

    if (sx < minX && ex < minX) return false;
    if (sy > maxY && ey > maxY) return false;
    if (sy < minY && ey < minY) return false;

    return true;
}

function connectPointsWithLines(points, target = null) {
    if (target === null) {
        target = new Array(points.length).fill(null).map(() => new THREE.Line3());
    }

    return points.map((p, i) => {
        const nextP = points[(i + 1) % points.length];
        const line = target[i];
        line.start.copy(p);
        line.end.copy(nextP);
        return line;
    });
}

function convertTripletsToPoints(array) {
    const points = [];
    for (let i = 0; i < array.length; i += 3) {
        points.push(new THREE.Vector3(array[i], array[i + 1], array[i + 2]));
    }
    return points;
}
