import * as THREE from 'three';

export function convertECEFtoGPS(x, y, z, a = 6378137.0, e2 = 0.00669437999014) {
    const kEps = 1e-12;
    const radiusXY = Math.sqrt(x ** 2 + y ** 2);

    let lat = Math.atan2(z, radiusXY);
    let alt = 0;

    for (let i = 0; i < 100; i++) {
        const sinLat = Math.sin(lat);
        const N = a / Math.sqrt(1 - e2 * sinLat ** 2);
        const prevLat = lat;
        const prevAlt = alt;

        alt = radiusXY / Math.cos(lat) - N;
        lat = Math.atan2(z, radiusXY * (1 - e2 * N / (N + alt)));

        if (Math.abs(alt - prevAlt) < kEps && Math.abs(lat - prevLat) < kEps)
            break;
    }

    return {
        lat: THREE.MathUtils.radToDeg(lat),
        lon: THREE.MathUtils.radToDeg(Math.atan2(y, x)),
        alt
    };
}
