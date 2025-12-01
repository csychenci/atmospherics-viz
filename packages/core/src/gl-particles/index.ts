import { BaseRenderer } from '../base-render';
import { LRUCache } from '../lru-cache';
import {
  GlParticleLayerInterface,
  GlParticleMapInterface,
  LayerSourceConfig,
  MapCoords,
  TileCoordinate,
  TileInfo,
} from '@atmospherics-viz/types';
import {
  calcDZoom,
  calcScaleFactor,
  createTileCoordinate,
  processTileCoordinate,
} from '@atmospherics-viz/utils';
import { particleStylePresets } from './particle-style';
import { DataTile, TilesLoader } from '../loader';

export class GlParticleBaseRenderer<T extends GlParticleMapInterface> {
  protected syncCounter: number = 0;
  private map: T;

  // 处理后的瓦片数据
  protected trans: number = 0;
  private shift: number = 0;
  private lShift: number = 0;
  protected offsetX: number = 0;
  protected offsetY: number = 0;
  private offset: number = 2056;
  protected width: number = 0;
  protected height: number = 0;
  private w: Uint16Array | null = null;
  private static weightCache: { [key: number]: Uint16Array } = {};
  private tileLoader: TilesLoader;



  constructor(map: T, tileLoader: TilesLoader) {
    this.map = map;
    this.tileLoader = tileLoader;
  }

  /**
   * 瓦片准备完成回调
   */
  protected tilesReady(
    tiles: (TileInfo | undefined)[][],
    mapCoords: MapCoords,
    config: LayerSourceConfig
  ): void {}

  /**
   * 获取瓦片 - 主要入口方法
   */
  async getTiles(config: LayerSourceConfig): Promise<void> {
    const zoom = this?.map?.getZoom();

    // 只处理整数缩放级别
    if (Math.floor(zoom) !== zoom) {
      return;
    }

    this.syncCounter++;

    const pixelBounds = this.map.getPixelBounds();
    const requiredTiles: TileCoordinate[] = [];

    // 计算需要的瓦片坐标范围
    const minTileX = pixelBounds.min!.x >> 8;
    const maxTileX = pixelBounds.max!.x >> 8;
    const minTileY = pixelBounds.min!.y >> 8;
    const maxTileY = pixelBounds.max!.y >> 8;

    // 生成所有需要的瓦片坐标
    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        const tileCoord = createTileCoordinate({ x, y, z: zoom });
        requiredTiles.push(tileCoord);
      }
    }

    // 获取地图坐标信息
    const center = this.map.getCenter();
    const mapCoords = {
      lat: center.lat,
      lon: center.wrap().lng,
      zoom: Math.round(zoom),
    };
    const mapSize = this.map.getSize();
    const dZoom = calcDZoom(config, zoom);

    const fullMapCoords: MapCoords = Object.assign(mapCoords, {
      pixelOriginX: pixelBounds.min!.x,
      pixelOriginY: pixelBounds.min!.y,
      dZoom,
      width: mapSize.x,
      height: mapSize.y,
      origTiles: {
        minX: minTileX,
        minY: minTileY,
        maxX: maxTileX,
        maxY: maxTileY,
      },
    });

    // 处理瓦片并加载 - 对应原始代码的 forEach 逻辑
    const loadedTileUrls = new Set<string>();
    const loadPromises: Promise<DataTile | undefined>[] = [];

    for (const tileCoord of requiredTiles) {
      // 对应原始 Op 函数调用
      const opResult = processTileCoordinate(tileCoord, config);

      // 对应原始 processTile 调用（如果存在的话）
      const processedTile =
        opResult && this.processTile ? this.processTile(opResult, config) : opResult;

      if (processedTile && !loadedTileUrls.has(processedTile.url)) {
        loadedTileUrls.add(processedTile.url);
        const loadPromise = this.tileLoader.loadTile(processedTile);
        loadPromises.push(loadPromise);
      }
    }

    // 对应原始代码：Promise.all(w).then(this.postProcess.bind(this, this.syncCounter, v, e))
    Promise.all(loadPromises).then(loadedTiles => {
      this.postProcess(this.syncCounter, fullMapCoords, config, loadedTiles);
    });
  }

  /**
   * 处理单个瓦片 - 对应原始代码中的 processTile 方法
   * 原始代码中这个方法直接返回传入的瓦片信息
   */
  protected processTile(tileInfo: TileInfo, config: LayerSourceConfig): TileInfo {
    return tileInfo;
  }

  /**
   * 后处理瓦片数据
   */
  private async postProcess(
    syncCounter: number,
    mapCoords: MapCoords,
    config: LayerSourceConfig,
    loadedTiles: (DataTile | undefined)[]
  ): Promise<void> {
    // 检查是否是最新的请求
    if (syncCounter !== this.syncCounter) {
      return;
    }

    const sortedTiles = this.sortTiles(mapCoords, config, loadedTiles);

    // 计算变换参数
    this.trans = 0 | calcScaleFactor(mapCoords.zoom, mapCoords.dZoom);
    this.shift = 0 | Math.log2(this.trans);
    this.lShift = 0 | Math.log2(this.trans * this.trans);

    // 计算偏移量
    let offsetX = (mapCoords.pixelOriginX / this.trans) % 256;
    let offsetY = (mapCoords.pixelOriginY / this.trans) % 256;

    if (offsetX < 0) offsetX = 256 + offsetX;

    this.offsetX = 0 | (offsetX * this.trans);
    this.offsetY = 0 | (offsetY * this.trans);
    this.offset = 2056;
    this.width = mapCoords.width;
    this.height = mapCoords.height;
    this.w = this.calculateW(this.trans);

    // 调用瓦片准备完成回调
    this.tilesReady.call(this, sortedTiles, mapCoords, config);
  }

  /**
   * 排序瓦片
   */
  private sortTiles(
    mapCoords: MapCoords,
    config: LayerSourceConfig,
    loadedTiles: (DataTile | undefined)[]
  ): (TileInfo | undefined)[][] {
    let lastX: number | undefined;
    let lastY: number | undefined;

    const getTileAt = (x: number, y: number): TileCoordinate | null => {
      const tileCoord = createTileCoordinate({
        x,
        y,
        z: mapCoords.zoom,
      });
      return processTileCoordinate(tileCoord, config);
    };

    const result: (TileInfo | undefined)[][] = [];

    for (let y = mapCoords.origTiles.minY; y <= mapCoords.origTiles.maxY; y++) {
      const firstTile = getTileAt(mapCoords.origTiles.minX, y);

      if (!firstTile || firstTile.y !== lastY) {
        lastX = undefined;
        const row: (TileInfo | undefined)[] = [];

        for (let x = mapCoords.origTiles.minX; x <= mapCoords.origTiles.maxX; x++) {
          const processXCoordinate = () => {
            const tileCoord = getTileAt(x, y);
            if (!tileCoord || tileCoord.x === lastX) {
              return 1;
            }

            const matchingTile = loadedTiles.filter(
              tile => tile && tile.x === tileCoord.x && tile.y === tileCoord.y
            )[0];

            row.push(matchingTile);
            lastX = tileCoord.x;
            lastY = tileCoord.y;
          };

          processXCoordinate();
        }

        if (row.length > 0) {
          result.push(row);
        }
      }
    }

    return result;
  }

  /**
   * 计算W参数
   */
  private calculateW(trans: number): Uint16Array | null {
    // 对应原始 Lp 函数
    if (trans in GlParticleBaseRenderer.weightCache) {
      return GlParticleBaseRenderer.weightCache[trans];
    }

    if (!(trans <= 32)) {
      return null;
    }

    const weights = new Uint16Array(4 * trans * trans);
    let index = 0;

    for (let r = 0; r < trans; r++) {
      for (let n = 0; n < trans; n++) {
        // 双线性插值权重计算
        weights[index++] = (trans - r) * (trans - n); // 左上角权重
        weights[index++] = (trans - r) * n; // 右上角权重
        weights[index++] = r * (trans - n); // 左下角权重
        weights[index++] = n * r; // 右下角权重
      }
    }

    GlParticleBaseRenderer.weightCache[trans] = weights;
    return weights;
  }
}

export class GlParticleRenderer extends GlParticleBaseRenderer<GlParticleMapInterface> {
  private glCanvas: GlParticleLayerInterface | null = null;
  private latestParams: LayerSourceConfig | null = null;
  private enabled: boolean = true;
  private tileSize: number = 256;
  private tileCache: LRUCache<{
    url: string;
    tileSize: number;
    data: Uint8Array;
  }> = new LRUCache(16);
  private mapMoved: boolean = false;
  private run: () => void;
  constructor(map: GlParticleMapInterface, tileLoader: TilesLoader, run: () => void) {
    super(map, tileLoader);
    this.run = run;
  }

  cancelTasks() {
    this.syncCounter++;
  }

  protected tilesReady(
    tiles: (TileInfo | undefined)[][],
    mapCoords: MapCoords,
    layerConfig: LayerSourceConfig
  ): void {
    const config = {
        ...mapCoords,
        ...layerConfig,
        // @ts-ignore
        partObj:
          particleStylePresets[layerConfig.particlesIdent as keyof typeof particleStylePresets],
      },
      transformParams = {
        width: this.width,
        height: this.height,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
        trans: this.trans,
      };
    this.processTiles(tiles, config, transformParams);
  }

  redrawVectors() {
    this.mapMoved = true;
    if (!!this.latestParams) {
      this.getTiles(this.latestParams);
    }
  }

  init(glCanvas: GlParticleLayerInterface, config: LayerSourceConfig) {
    this.glCanvas = glCanvas;
    this.latestParams = config;
    this.redrawVectors();
  }

  paramsChanged(config: Partial<LayerSourceConfig>) {
    (this.latestParams &&
      this.latestParams.fullPath === config.fullPath &&
      this.latestParams.overlay === config.overlay) ||
      // @ts-ignore
      ((this.latestParams = {...this.latestParams, ...config}), this.getTiles(this.latestParams));
  }
  /**
   * 从瓦片数据生成风场纹理数据
   * 处理原始风场数据，转换为适合GPU渲染的纹理格式
   *
   * @param tile - 瓦片信息对象，包含原始数据和解码方法
   * @param config - 配置对象，包含粒子样式配置和层级信息
   * @returns 处理后的纹理数据对象，包含URL、瓦片尺寸和纹理数据
   */
  getTexture(
    tile: TileInfo,
    config: MapCoords &
      LayerSourceConfig & {
        partObj: any;
      }
  ) {
    const { partObj: particleConfig } = config;
    // 计算纹理数据总大小（每个像素2个字节：U和V分量）
    const textureDataSize = this.tileSize * this.tileSize * 2;
    const textureData = new Uint8ClampedArray(textureDataSize);

    const rawData = tile.data;
    const levelReduceFactor =
      particleConfig.level2reduce[config.level] / particleConfig.glMaxSpeedParam;
    const minSpeedThreshold = levelReduceFactor * particleConfig.glMinSpeedParam;
    const minSpeedSquared = minSpeedThreshold * minSpeedThreshold;

    const isJpgTransparent = config.JPGtransparency;
    let dataOffset = 8224; // 初始数据偏移量
    const epsilon = 1e-6; // 极小值阈值，避免除零错误
    const tileDimension = 256; // 瓦片尺寸
    const midValue = 128; // 中间值（用于归一化）
    let outputOffset = 0; // 输出数据偏移
    const speedCurveExponent = 0.5 * particleConfig.glSpeedCurvePowParam;

    if (isJpgTransparent) {
      for (let row = 0; row < tileDimension; row++) {
        for (let col = 0; col < tileDimension; col++) {
          // 检查蓝色通道（透明度判断
          if (rawData[dataOffset + 2] > midValue) {
            textureData[outputOffset++] = midValue;
            textureData[outputOffset++] = midValue;
          } else {
            const uComponent = tile.decodeR!(rawData[dataOffset]) * levelReduceFactor;
            const vComponent = tile.decodeG!(rawData[dataOffset + 1]) * levelReduceFactor;
            const speedSquared = uComponent * uComponent + vComponent * vComponent;
            let processedU = uComponent;
            let processedV = vComponent;
            if (speedSquared > minSpeedSquared) {
              // 高速区域：应用幂次曲线增强
              const curveFactor =
                (midValue * Math.pow(speedSquared, speedCurveExponent)) / Math.sqrt(speedSquared);
              processedU *= curveFactor;
              processedV *= curveFactor;
            } else if (speedSquared > epsilon) {
              // 中速区域：线性缩放
              const linearFactor = (midValue * minSpeedThreshold) / Math.sqrt(speedSquared);
              processedU *= linearFactor;
              processedV *= linearFactor;
            } else {
              // 低速区域：归零
              processedU = 0;
              processedV = 0;
            }
            // 归一化到0-255范围并存储
            textureData[outputOffset++] = midValue + Math.round(processedU);
            textureData[outputOffset++] = midValue + Math.round(processedV);
          }
          dataOffset += 4; // 移动到下一个像素（RGBA）
        }
        dataOffset += 4; // 跳过行尾填充
      }
    } else {
      // 处理PNG格式（使用Alpha通道判断透明度）
      for (let row = 0; row < tileDimension; row++) {
        for (let col = 0; col < tileDimension; col++) {
          // 检查Alpha通道（透明度判断）
          if (rawData[dataOffset + 3] < midValue) {
            // 透明区域：填充中间值
            textureData[outputOffset++] = midValue;
            textureData[outputOffset++] = midValue;
          } else {
            // 解码U和V分量
            const uComponent = tile.decodeR!(rawData[dataOffset]) * levelReduceFactor;
            const vComponent = tile.decodeG!(rawData[dataOffset + 1]) * levelReduceFactor;
            const speedSquared = uComponent * uComponent + vComponent * vComponent;

            let processedU = uComponent;
            let processedV = vComponent;

            // 速度处理逻辑（与JPG相同）
            if (speedSquared > minSpeedSquared) {
              const curveFactor =
                (midValue * Math.pow(speedSquared, speedCurveExponent)) / Math.sqrt(speedSquared);
              processedU *= curveFactor;
              processedV *= curveFactor;
            } else if (speedSquared > epsilon) {
              const linearFactor = (midValue * minSpeedThreshold) / Math.sqrt(speedSquared);
              processedU *= linearFactor;
              processedV *= linearFactor;
            } else {
              processedU = 0;
              processedV = 0;
            }

            textureData[outputOffset++] = midValue + Math.round(processedU);
            textureData[outputOffset++] = midValue + Math.round(processedV);
          }
          dataOffset += 4; // 移动到下一个像素
        }
        dataOffset += 4; // 跳过行尾填充
      }
    }
    return {
      url: tile.url,
      tileSize: this.tileSize,
      data: new Uint8Array(textureData),
    };
  }

  processTiles(
    tiles: (TileInfo | undefined)[][],
    config: MapCoords &
      LayerSourceConfig & {
        partObj: any;
      },
    transformParams: {
      width: number;
      height: number;
      offsetX: number;
      offsetY: number;
      trans: number;
    }
  ) {
    const tilesLength = tiles.length;
    let tilesWidth = tilesLength ? tiles[0].length : 0;

    if (tilesLength !== 0) {
      const { partObj } = config,
        windSpeedFactor = partObj.zoom2speed[config.zoom];
      const textureTiles: Array<{ url: string; tileSize: number; data: Uint8Array }> = [];
      const textureTilesPos: Array<{ x: number; y: number }> = [];

      for (let row = 0; row < tilesLength; row++) {
        for (let col = 0; col < tilesWidth; col++) {
          const tile = tiles[row][col];
          if (tile) {
            let cache = this.tileCache.get(tile.url);
            if (!cache) {
              cache = this.getTexture(tile, config);
              this.tileCache.put(tile.url, cache);
            }
            textureTiles.push(cache);
            textureTilesPos.push({
              x: col * this.tileSize,
              y: row * this.tileSize,
            });
          }
        }
      }

      // 特殊处理：如果只有一个纹理，复制一份形成2x1网格
      if (textureTiles.length === 1) {
        const firstTexture = textureTiles[0];
        const firstPos = textureTilesPos[0];
        textureTiles.push({
          url: firstTexture.url,
          tileSize: firstTexture.tileSize,
          data: firstTexture.data,
        });
        textureTilesPos.push({
          x: firstPos.x + firstTexture.tileSize,
          y: firstPos.y,
        });
        tilesWidth++;
      }

      // 计算合适的纹理尺寸（2的幂次方，OpenGL要求）
      const textureSizeX = BaseRenderer.getNextPowerOf2Size(tilesWidth * this.tileSize);
      const textureSizeY = BaseRenderer.getNextPowerOf2Size(tilesLength * this.tileSize);
      const newTransformParams = {
        ...transformParams,
        tilesDX: tilesWidth * this.tileSize,
        tilesDY: tilesLength * this.tileSize,
        relativeDX: (tilesWidth * this.tileSize) / textureSizeX,
        relativeDY: (tilesLength * this.tileSize) / textureSizeY,
        zoomWindFactor: windSpeedFactor,
      };
      if (this.glCanvas && this.glCanvas?.isOk()) {
        this.glCanvas.setNewWindData({
          sizeX: textureSizeX,
          sizeY: textureSizeY,
          textureTiles: textureTiles,
          textureTilesPos: textureTilesPos,
          // @ts-ignore
          transformParams: newTransformParams,
          mapParams: config,
        });
      }
      this.run();
    }
  }
}
