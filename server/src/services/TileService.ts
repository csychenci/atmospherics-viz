/**
 * 瓦片服务
 * 处理 GRIB 文件到瓦片数据的完整转换流程
 */

import { GribParser } from '../grib/GribParser';
import { TileEncoder } from '../encoder/TileEncoder';
import { tileToBoundingBox } from '../utils/coordinateUtils';
import { WindData, EncodedTileData } from '../types';
import { TileCoord } from '../types/index';
import { createCanvas } from 'canvas';

export class TileService {
  /**
   * 生成指定坐标的瓦片数据
   */

  static async generateTile(
    gribFilePath: string,
    coord: TileCoord
  ): Promise<{ pngBuffer: Buffer; headerParams: any }> {
    try {
      // 1. 计算瓦片对应的地理边界
      const bbox = tileToBoundingBox(coord.z, coord.x, coord.y);

      // 2. 从 GRIB 文件中提取对应区域的数据
      const tileData = await GribParser.extractRegionData(gribFilePath, bbox);

      // 3. 编码为 RGBA 格式
      // @ts-ignore
      const encodedData = TileEncoder.encodeWindData(tileData);

      // 4. 添加 header 信息
      const finalBuffer = TileEncoder.addHeaderToImageData(encodedData);

      // 5. 转换为 PNG 格式（可选）
      const pngBuffer = await this.convertToPng(finalBuffer, encodedData.width, encodedData.height);

      return {
        pngBuffer,
        headerParams: encodedData.headerParams,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate tile ${coord.z}/${coord.x}/${coord.y}: ${errorMessage}`);
    }
  }

  /**
   * 将数据缓冲区转换为 PNG 图像
   */
  private static async convertToPng(data: Buffer, width: number, height: number): Promise<Buffer> {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 创建 ImageData 对象
    const imageData = ctx.createImageData(width, height);

    // 从数据缓冲区中提取 RGBA 数据（跳过 header）
    const headerSize = 8224 + 28 * 16;
    const rgbaData = new Uint8ClampedArray(data.buffer, headerSize, width * height * 4);

    imageData.data.set(rgbaData);
    ctx.putImageData(imageData, 0, 0);

    // 返回 PNG 缓冲区
    return canvas.toBuffer('image/png');
  }

  /**
   * 批量生成多个瓦片
   */
  static async generateTiles(
    gribFilePath: string,
    coords: TileCoord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, { pngBuffer: Buffer; headerParams: any }>> {
    const results = new Map<string, { pngBuffer: Buffer; headerParams: any }>();

    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i];
      const tileKey = `${coord.z}/${coord.x}/${coord.y}`;

      try {
        const result = await this.generateTile(gribFilePath, coord);
        results.set(tileKey, result);

        if (onProgress) {
          onProgress(i + 1, coords.length);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to generate tile ${tileKey}:`, errorMessage);
      }
    }

    return results;
  }

  /**
   * 获取 GRIB 文件信息
   */
  static async getGribInfo(gribFilePath: string) {
    return GribParser.getGribInfo(gribFilePath);
  }
}
