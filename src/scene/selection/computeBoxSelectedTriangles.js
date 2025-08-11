import * as THREE from 'three';
import { CONTAINED, INTERSECTED, NOT_INTERSECTED } from 'three-mesh-bvh';

// axis-aligned unit box in selection box local space
const selectionBox = new THREE.Box3(
    new THREE.Vector3( - 0.5, - 0.5, - 0.5 ),
    new THREE.Vector3( 0.5, 0.5, 0.5 )
);

const tempBox = new THREE.Box3();
const invMatrix = new THREE.Matrix4();
const tri = new THREE.Triangle();
const v0 = new THREE.Vector3();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();

/**
 * Compute indices of triangles inside or intersecting the given 3D selection box.
 * @param {THREE.Mesh} mesh - Mesh to query.
 * @param {THREE.Object3D} boxMesh - Mesh representing the selection box.
 * @returns {number[]} Indices of triangles intersecting the box.
 */
export function computeBoxSelectedTriangles( mesh, boxMesh ) {
    const indices = [];

    invMatrix.copy( boxMesh.matrixWorld ).invert();

    mesh.geometry.boundsTree.shapecast( {
        intersectsBounds: ( box ) => {
            tempBox.copy( box );
            tempBox.applyMatrix4( mesh.matrixWorld );
            tempBox.applyMatrix4( invMatrix );

            if ( selectionBox.containsBox( tempBox ) ) return CONTAINED;
            return tempBox.intersectsBox( selectionBox ) ? INTERSECTED : NOT_INTERSECTED;
        },

        intersectsTriangle: ( _tri, index, contained ) => {
            v0.copy( _tri.a ).applyMatrix4( mesh.matrixWorld ).applyMatrix4( invMatrix );
            v1.copy( _tri.b ).applyMatrix4( mesh.matrixWorld ).applyMatrix4( invMatrix );
            v2.copy( _tri.c ).applyMatrix4( mesh.matrixWorld ).applyMatrix4( invMatrix );

            tri.set( v0, v1, v2 );
            if ( contained || selectionBox.intersectsTriangle( tri ) ) {
                const i3 = index * 3;
                indices.push( i3 + 0, i3 + 1, i3 + 2 );
            }
            return false;
        }
    } );

    return indices;
}
