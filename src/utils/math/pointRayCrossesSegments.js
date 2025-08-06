export function isPointInsidePolygon(point, segments) {
    let count = 0;
    const x = point.x;
    const y = point.y;
    for (const seg of segments) {
        const x1 = seg.start.x;
        const y1 = seg.start.y;
        const x2 = seg.end.x;
        const y2 = seg.end.y;
        const intersects = (y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1;
        if (intersects) count++;
    }
    return count % 2 === 1;
}
