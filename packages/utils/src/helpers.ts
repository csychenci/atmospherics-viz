import { TileCoordinate, LayerSourceConfig } from '@atmospherics-viz/types';
import { DATA_QUALITY_LEVELS, DATA_QUALITY_ZOOM_MAP } from './constants';

/**
 * 计算变换参数
 */
export function calcScaleFactor(zoom: number, dZoom: number) {
  return Math.pow(2, zoom) / Math.pow(2, dZoom);
}

/**
 * 创建瓦片坐标
 */
export function createTileCoordinate(coord: { x: number; y: number; z: number }): TileCoordinate {
  // 实现与原始 ze 函数相同的坐标环绕逻辑
  const tileCount = 1 << coord.z; // 2^z，该缩放级别的瓦片总数
  let x = coord.x % tileCount; // 将 x 坐标限制在有效范围内
  if (x < 0) {
    x += tileCount; // 处理负数坐标，使其环绕到正数范围
  }

  return { x, y: coord.y, z: coord.z };
}

export function calcDZoom(option: LayerSourceConfig, zoom: number) {
  // 对应原始 Pp 函数：if (e.dataTilesZoom) return e.dataTilesZoom;
  if (option.dataTilesZoom) {
    return option.dataTilesZoom;
  }

  // 对应原始代码：var n = e.dataQuality
  const dataQuality = option.dataQuality;

  // 对应原始代码：r = e.upgradeDataQuality ? Ap[Math.max(Ap.indexOf(n) - 1, 0)] : n
  let effectiveQuality = dataQuality;
  if (option.upgradeDataQuality) {
    const currentQualityIndex = DATA_QUALITY_LEVELS.indexOf(dataQuality);
    const upgradedIndex = Math.max(currentQualityIndex - 1, 0);
    effectiveQuality = DATA_QUALITY_LEVELS[upgradedIndex];
  }

  const qualityZoomArray =
    DATA_QUALITY_ZOOM_MAP[effectiveQuality as keyof typeof DATA_QUALITY_ZOOM_MAP];
  const qualityZoom = qualityZoomArray[zoom]; // 直接用 zoom 作为索引，如果超出范围则返回 0

  if (option.maxTileZoom) {
    return Math.min(option.maxTileZoom.premium, qualityZoom);
  }

  return qualityZoom;
}

/**
 * 处理瓦片坐标 - 完全对应原始 Op 函数
 * Op = (e, t) => { ... }
 */
export function processTileCoordinate(tileCoord: TileCoordinate, config: LayerSourceConfig) {
  // 对应原始代码：if (!t.fullPath) return null;
  if (!config.fullPath) {
    return null;
  }

  // 对应原始代码：var n = e.z
  const zoom = tileCoord.z;

  // 对应原始代码：r = Pp(t, n)
  const dZoom = calcDZoom(config, zoom);

  // 对应原始代码：i = Tp(n, r)
  const trans = calcScaleFactor(zoom, dZoom);

  // 对应原始代码：a = Math.floor(e.x / i), o = Math.floor(e.y / i)
  const tileX = Math.floor(tileCoord.x / trans);
  const tileY = Math.floor(tileCoord.y / trans);

  // 对应原始代码：s = e.x % i, l = e.y % i
  const intX = tileCoord.x % trans;
  const intY = tileCoord.y % trans;

  // 对应原始代码：c = t.fullPath.replace('<z>', r.toString()).replace('<y>', o.toString()).replace('<x>', a.toString())
  const url = config.fullPath
    .replace('<z>', dZoom.toString())
    .replace('<y>', tileY.toString())
    .replace('<x>', tileX.toString());

  // 对应原始代码：d = Sp(r) (Sp = e => Math.pow(2, e))
  const maxTileIndex = Math.pow(2, dZoom);

  // 对应原始代码：return a < 0 || o < 0 || a >= d || o >= d ? null : { ... }
  if (tileX < 0 || tileY < 0 || tileX >= maxTileIndex || tileY >= maxTileIndex) {
    return null;
  }

  // 返回完整的 TileInfo 对象，完全对应原始 Op 函数的返回值
  return {
    url: url,
    x: tileX,
    y: tileY,
    z: dZoom,
    intX: intX,
    intY: intY,
    trans: trans,
    transformR: config.transformR,
    transformG: config.transformG,
    transformB: config.transformB,
  };
}

export function startsWithLetterA(str: string) {
  return 'a' === str.charAt(0);
}

export function isUOrSPrefix(str: string) {
  return 'u' === str.charAt(0) || 's' === str.charAt(0);
}
