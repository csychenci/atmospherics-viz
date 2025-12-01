import { extractImageData } from '@atmospherics-viz/utils';
import { TileInfo, TileLoaderInterface } from '@atmospherics-viz/types';
import { LRUCache } from './lru-cache';

/**
 * 瓦片数据类 - 对应源代码中的 sm 类
 */
export class DataTile {
  public url: string;
  public status: 'undefined' | 'loading' | 'loaded' | 'failed' = 'undefined';
  public data: Uint8ClampedArray | null = null;
  public x: number;
  public y: number;
  public z: number;
  public promise?: Promise<DataTile>;
  public headerPars?: number[];
  public decodeR?: (value: number) => number;
  public decodeG?: (value: number) => number;
  public decodeB?: (value: number) => number;

  public transformR?: (value: number) => number;
  public transformG?: (value: number) => number;
  public transformB?: (value: number) => number;

  constructor(url: string, tileInfo: TileInfo) {
    this.url = url;
    this.x = tileInfo.x;
    this.y = tileInfo.y;
    this.z = tileInfo.z;

    // 从 tileInfo 中获取 transform 函数（如果有的话）
    // 对应源代码的 this.transformR = t.transformR
    this.transformR = tileInfo.transformR;
    this.transformG = tileInfo.transformG;
    this.transformB = tileInfo.transformB;
  }

  load(): Promise<DataTile> {
    this.status = 'loading';
    this.promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          this.data = extractImageData(img);
          this.status = 'loaded';

          // 解码头部参数（完全对应源代码的解码逻辑）
          const headerData = this.extractHeaderData(this.data);
          // const headerData = [
          //   -24.00303840637207, 7.92490291595459, -16.71394157409668, 26.37898063659668, 0, 0,
          // ];

          // headerData 现在是 Float32Array，包含28个float值
          // 根据源代码逻辑，前6个值用于解码参数
          const minR = headerData[0];
          const maxR = headerData[1];
          const minG = headerData[2];
          const maxG = headerData[3];
          const minB = headerData[4];
          const maxB = headerData[5];

          const scaleR = (maxR - minR) / 255;
          const scaleG = (maxG - minG) / 255;
          const scaleB = (maxB - minB) / 255;

          // 对应源代码的 this.headerPars = [i, r, o, a, l, s]
          this.headerPars = [scaleR, minR, scaleG, minG, scaleB, minB];

          // 对应源代码的条件decode逻辑
          this.decodeR = this.transformR
            ? (value: number) => this.transformR!(value * scaleR + minR)
            : (value: number) => value * scaleR + minR;

          this.decodeG = this.transformG
            ? (value: number) => this.transformG!(value * scaleG + minG)
            : (value: number) => value * scaleG + minG;

          this.decodeB = this.transformB
            ? (value: number) => this.transformB!(value * scaleB + minB)
            : (value: number) => value * scaleB + minB;

          resolve(this);
        } catch (error) {
          this.status = 'failed';
          reject({
            message: 'Failed to process tile data',
            url: this.url,
            error,
          });
        }
      };

      img.onerror = () => {
        this.status = 'failed';
        reject({
          message: 'Failed to load tile',
          url: this.url,
        });
      };

      img.src = this.url;
      if (img.complete || img.complete === void 0) {
        img.src = this.url;
      }
    });

    return this.promise;
  }

  private extractHeaderData(data: Uint8ClampedArray): Float32Array {
    // 创建28字节的ArrayBuffer，对应源代码的 new ArrayBuffer(28)
    const buffer = new ArrayBuffer(28);
    const uint8View = new Uint8Array(buffer); // 对应源代码的 s
    const float32View = new Float32Array(buffer); // 对应源代码的 l

    // 起始偏移：4 * 257 * 4 + 8
    let offset = 4 * 257 * 4 + 8;

    // 循环28次，对应源代码的 for (a = 0; a < 28; a++)
    for (let i = 0; i < 28; i++) {
      // 读取RGB通道，对应源代码的 n = e[c], r = e[c + 1], i = e[c + 2]
      let r = data[offset];
      let g = data[offset + 1];
      let b = data[offset + 2];

      // 数据处理
      r = Math.round(r / 64); // n = Math.round(n / 64)
      g = Math.round(g / 16); // r = Math.round(r / 16)
      b = Math.round(b / 64); // i = Math.round(i / 64)

      // 打包数据
      uint8View[i] = (r << 6) + (g << 2) + b;

      // 偏移增加16，对应源代码的 c += 16
      offset += 16;
    }

    console.log('float32View', float32View);

    // 返回Float32Array视图，对应源代码的 return l
    return float32View;
  }
}

export class TilesLoader implements TileLoaderInterface<DataTile> {
  private cache: LRUCache<DataTile>;

  constructor(cache: LRUCache<DataTile>) {
    this.cache = cache;
  }
  async loadTile(tileInfo: TileInfo) {
    const url = tileInfo?.url;
    const cached = this.cache.get(url);

    if (!cached) {
      // 创建新的瓦片数据对象
      const dataTile = new DataTile(url, tileInfo);
      this.cache.put(url, dataTile);

      return dataTile.load();
    }

    // 处理缓存中的瓦片
    switch (cached.status) {
      case 'loaded':
        return Promise.resolve(cached);
      case 'loading':
        return cached.promise;
      case 'failed':
        this.cache.remove(url);
        return Promise.reject({
          message: 'Failed to load tile',
          url: url,
        });
      default:
        return Promise.reject({
          message: 'Unknown tile state',
          url: url,
        });
    }
  }
}
