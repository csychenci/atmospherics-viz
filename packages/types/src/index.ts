// 瓦片加载器类型定义
export interface TileCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface LatLng {
  lat: number;
  lng: number;
  alt?: number;
  wrap: () => LatLng;
}

export interface TileInfo {
  url: string;
  x: number;
  y: number;
  z: number;
  data?: any;
  headerPars?: number[];
  decodeR?: (value: number) => number;
  decodeG?: (value: number) => number;
  decodeB?: (value: number) => number;
  transformR?: (value: number) => number;
  transformG?: (value: number) => number;
  transformB?: (value: number) => number;
  // 对应原始 Op 函数返回的额外属性
  intX?: number; // 瓦片内部 X 坐标偏移
  intY?: number; // 瓦片内部 Y 坐标偏移
  trans?: number; // 变换参数
}

export interface PixelBounds {
  min: { x: number; y: number };
  max: { x: number; y: number };
}

export interface MapCoords {
  zoom: number;
  dZoom: number;
  pixelOriginX: number;
  pixelOriginY: number;
  width: number;
  height: number;
  origTiles: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface TileLoaderInterface<T> {
  loadTile(tileInfo: TileInfo): Promise<T | undefined>;
}

export interface LayerSourceConfig {
  acRange: number;
  isolinesType: string;
  isolinesOn: boolean;
  level: string;
  overlay: string;
  product: string;
  layer: string;
  JPGtransparency: boolean;
  PNGtransparency: boolean;
  maxTileZoom: {
    free: number;
    premium: number;
  };
  directory: string;
  dataQuality: 'extreme' | 'ultra' | 'high' | 'normal' | 'low';
  upgradeDataQuality: boolean;
  refTime: string;
  fullPath: string;
  path: string;
  particlesIdent: string;
  dataTilesZoom?: number; // 可选属性，对应原始 Pp 函数的第一个条件
  // 对应原始 Op 函数返回对象中的 transform 函数
  transformR?: (value: number) => number;
  transformG?: (value: number) => number;
  transformB?: (value: number) => number;
}

export interface TileCoordConfig {
  url: string;
  x: number;
  y: number;
  z: number;
  intX: number;
  intY: number;
  trans: number;
  transformR?: (value: number) => number;
  transformG?: (value: number) => number;
  transformB?: (value: number) => number;
}

export interface GlParticleMapInterface {
  getZoom: () => number;
  getCenter: () => LatLng;
  getSize: () => {
    x: number;
    y: number;
  };
  getPixelBounds: () => PixelBounds;
}

export interface GlParticleLayerInterface {
  isOk: () => boolean;
  setNewWindData: (data: {
    sizeX: number;
    sizeY: number;
    textureTiles: {
      url: string;
      tileSize: number;
      data: Uint8Array;
    }[];
    textureTilesPos: { x: number; y: number }[];
    transformParams: {
      width: number;
      height: number;
      offsetX: number;
      offsetY: number;
      trans: number;
    }[];
    mapParams: MapCoords &
      LayerSourceConfig & {
        partObj: any
      };
  }) => void;
}