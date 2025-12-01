export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function tileToBoundingBox(z: number, x: number, y: number): BoundingBox {
  const n = Math.pow(2, z);
  const lon1 = (x / n) * 360 - 180;
  const lat1 = radToDeg(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))));
  const lon2 = ((x + 1) / n) * 360 - 180;
  const lat2 = radToDeg(Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))));

  return {
    minLon: Math.min(lon1, lon2),
    maxLon: Math.max(lon1, lon2),
    minLat: Math.min(lat1, lat2),
    maxLat: Math.max(lat1, lat2),
  };
}
