/**
 * 坐标转换工具
 */

import { BoundingBox } from '../types';

export function tileToBoundingBox(z: number, x: number, y: number): BoundingBox {
  const n = Math.pow(2, z);
  const lon1 = (x / n) * 360 - 180;
  const lat1 = radToDeg(Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))));
  const lon2 = ((x + 1) / n) * 360 - 180;
  const lat2 = radToDeg(Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))));

  return {
    minLon: Math.min(lon1, lon2),
    maxLon: Math.max(lon1, lon2),
    minLat: Math.min(lat1, lat2),
    maxLat: Math.max(lat1, lat2)
  };
}

export function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

export function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(degToRad(lat)) + 1 / Math.cos(degToRad(lat))) / Math.PI) / 2 * Math.pow(2, zoom));
  
  return { x, y };
}