
export function lineCrossesLine(lineA, lineB) {
    const a = lineA.start;
    const b = lineA.end;
    const c = lineB.start;
    const d = lineB.end;

    const denom = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
    if (denom === 0) return false;

    const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denom;
    const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
