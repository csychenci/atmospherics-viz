export interface GribOriginItem {
  header: {
    parameterNumber: number; // 2 | 3
    parameterCategory: number; // 2 | 3
    nx: number; // 1440
    ny: number; // 721
  } & Record<string, any>;
  data: number[];
}

export interface TileInfo {
  uComponent: number[][];
  vComponent: number[][];
  header: {
    maxU: number;
    minU: number;
    maxV: number;
    minV: number;
  };
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