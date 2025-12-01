/**
 * 气象数据类型定义
 */
export interface WindData {
  speed: number[][];
  direction: number[][];
  uComponent: number[][];
  vComponent: number[][];
}

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface BoundingBox {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

export interface HeaderParams {
  minR: number;
  maxR: number;
  minG: number;
  maxG: number;
  minB: number;
  maxB: number;
}

export interface EncodedTileData {
  rgbaData: Uint8ClampedArray;
  headerParams: HeaderParams;
  width: number;
  height: number;
}