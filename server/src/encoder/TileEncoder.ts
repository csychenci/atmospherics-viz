/**
 * 瓦片数据编码器
 * 将风场数据编码为与现有系统兼容的 RGBA 格式
 */

import { GribOriginItem, TileInfo } from '../types/index';
import { WindData, HeaderParams, EncodedTileData } from '../types';

export class TileEncoder {
  /**
   * 将风场数据编码为 RGBA 格式
   */
  static encodeWindData(data: WindData): EncodedTileData {
    const { speed, direction } = data;
    const height = speed.length;
    const width = speed[0].length;

    // 计算数据范围用于归一化
    const headerParams = this.calculateHeaderParams(speed, direction);

    console.log('headerParams', headerParams);

    // 创建 RGBA 数据缓冲区
    const rgbaData = new Uint8ClampedArray(width * height * 4);

    let offset = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 编码风速到 R 通道
        const speedNorm = this.normalize(speed[y][x], headerParams.minR, headerParams.maxR);
        rgbaData[offset++] = speedNorm;

        // 编码风向到 G 通道
        const dirNorm = this.normalize(direction[y][x], headerParams.minG, headerParams.maxG);
        rgbaData[offset++] = dirNorm;

        // B 通道可以用于其他数据或保留
        rgbaData[offset++] = 0;

        // Alpha 通道设置为不透明
        rgbaData[offset++] = 255;
      }
    }

    return {
      rgbaData,
      headerParams,
      width,
      height,
    };
  }

  /**
   * 从数据组件中提取数据值
   */
  private static extractDataValues(component: GribOriginItem): {
    values: number[][];
    minValue: number;
    maxValue: number;
  } {
    // weacast-grib2json 输出格式：component.data 是一维数组
    const values = component.data || [];
    let minValue = Number.MAX_VALUE,
      maxValue = Number.MIN_VALUE;

    if (!Array.isArray(values) || values.length === 0) {
      return {
        values: [],
        minValue,
        maxValue,
      };
    }

    // 从 header 中获取网格信息
    const header = component.header;
    if (header && header.nx && header.ny) {
      // 根据网格尺寸重新组织数据为二维数组
      const result: number[][] = [];
      for (let j = 0; j < header.ny; j++) {
        const row: number[] = [];
        for (let i = 0; i < header.nx; i++) {
          const index = j * header.nx + i;
          const item = values[index];
          if (item < minValue) minValue = item;
          if (item > maxValue) maxValue = item;
          row.push(values[index] || 0);
        }
        result.push(row);
      }
      return {
        values: result,
        minValue,
        maxValue,
      };
    }

    // 如果没有网格信息，返回单行数组
    return {
      values: [],
      minValue,
      maxValue,
    };
  }

  static getTileInfo(items: GribOriginItem[]): TileInfo {
    console.log(
      '------ Parsed data structure:',
      JSON.stringify(items, null, 2).substring(0, 200) + '... -----'
    );

    /**
     * 1. 获取 u-component 和 v-component 数据及 header 数据
     */
    let uData: number[][] = [],
      vData: number[][] = [],
      minU = Number.MAX_VALUE,
      maxU = Number.MIN_VALUE,
      minV = Number.MAX_VALUE,
      maxV = Number.MIN_VALUE;

    const dataSource = Array.isArray(items) ? items : [];
    // 提取 u-component (东西方向风)
    const uComponent = dataSource.find(
      item =>
        item?.header?.parameterNumber === 2 ||
        (item?.header?.parameterCategory === 2 && item?.header?.parameterNumber === 2)
    );
    // 提取 v-component (南北方向风)
    const vComponent = dataSource.find(
      item =>
        item.header?.parameterNumber === 3 ||
        (item.header?.parameterCategory === 2 && item.header?.parameterNumber === 3)
    );

    if (uComponent && uComponent?.data) {
      const uRes = this.extractDataValues(uComponent);
      uData = uRes.values;
      maxU = uRes.maxValue;
      minU = uRes.minValue;
    }

    if (vComponent && vComponent?.data) {
      const vRes = this.extractDataValues(vComponent);
      vData = vRes.values;
      maxV = vRes.maxValue;
      minV = vRes.minValue;
    }

    return {
      uComponent: uData,
      vComponent: vData,
      header: {
        maxU,
        minU,
        maxV,
        minV,
      },
    };
  }

  static encodeTileData(data: TileInfo) {}

  /**
   * 计算 header 参数
   */
  private static calculateHeaderParams(speed: number[][], direction: number[][]): HeaderParams {
    // 计算风速范围
    let minSpeed = Infinity;
    let maxSpeed = -Infinity;

    // 计算风向范围
    let minDir = Infinity;
    let maxDir = -Infinity;

    for (const row of speed) {
      for (const value of row) {
        minSpeed = Math.min(minSpeed, value);
        maxSpeed = Math.max(maxSpeed, value);
      }
    }

    for (const row of direction) {
      for (const value of row) {
        minDir = Math.min(minDir, value);
        maxDir = Math.max(maxDir, value);
      }
    }

    // 确保有合理的范围
    if (minSpeed === maxSpeed) {
      maxSpeed = minSpeed + 1;
    }
    if (minDir === maxDir) {
      maxDir = minDir + 1;
    }

    return {
      minR: minSpeed,
      maxR: maxSpeed,
      minG: minDir,
      maxG: maxDir,
      minB: 0,
      maxB: 1,
    };
  }

  /**
   * 归一化数值到 0-255 范围
   */
  private static normalize(value: number, min: number, max: number): number {
    const normalized = (value - min) / (max - min);
    return Math.max(0, Math.min(255, Math.round(normalized * 255)));
  }

  static encodeWindParamsToRGBA257x4(params: {
    minU: number;
    maxU: number;
    minV: number;
    maxV: number;
    minB?: number;
    maxB?: number;
  }): Uint8ClampedArray {
    // 创建完整的28个float值（前6个是参数，后面补0）
    const floatArray = new Float32Array(28);
    floatArray[0] = params.minU;
    floatArray[1] = params.maxU;
    floatArray[2] = params.minV;
    floatArray[3] = params.maxV;
    floatArray[4] = params.minB ?? 0;
    floatArray[5] = params.maxB ?? 0;
    // 其余22个位置保持为0

    // 创建Uint8Array视图来访问字节
    const byteView = new Uint8Array(floatArray.buffer);

    // 创建257×4×4 = 4112字节的数组
    const rgbaData = new Uint8ClampedArray(257 * 4 * 8);

    // 初始化所有像素为[0, 0, 0, 255]
    for (let i = 0; i < rgbaData.length; i += 4) {
      rgbaData[i] = 0; // R
      rgbaData[i + 1] = 0; // G
      rgbaData[i + 2] = 0; // B
      rgbaData[i + 3] = 255; // A
    }

    // 编码每个字节到RGBA格式，并填充到前28个像素中
    for (let i = 0; i < 28; i++) {
      // 获取要编码的字节
      const byteToEncode = byteView[i];

      // 解码参数（反向操作）
      const r = (byteToEncode >> 6) & 0x03; // 取高2位
      const g = (byteToEncode >> 2) & 0x0f; // 取中间4位
      const b = byteToEncode & 0x03; // 取低2位

      // 编码回RGBA值
      const encodedR = r * 64;
      const encodedG = g * 16;
      const encodedB = b * 64;

      // 计算目标位置（每4字节一组，对应一个RGBA像素）
      const baseIndex = i * 4 * 4;

      // 设置RGBA值
      rgbaData[baseIndex] = encodedR; // R
      rgbaData[baseIndex + 1] = encodedG; // G
      rgbaData[baseIndex + 2] = encodedB; // B
      rgbaData[baseIndex + 3] = 255; // A = 255
      rgbaData[baseIndex + 4] = encodedR; // R
      rgbaData[baseIndex + 5] = encodedG; // G
      rgbaData[baseIndex + 6] = encodedB; // B
      rgbaData[baseIndex + 7] = 255; // A = 255
      rgbaData[baseIndex + 8] = encodedR; // R
      rgbaData[baseIndex + 9] = encodedG; // G
      rgbaData[baseIndex + 10] = encodedB; // B
      rgbaData[baseIndex + 11] = 255; // A = 255
      rgbaData[baseIndex + 12] = encodedR; // R
      rgbaData[baseIndex + 13] = encodedG; // G
      rgbaData[baseIndex + 14] = encodedB; // B
      rgbaData[baseIndex + 15] = 255; // A = 255
    }

    return rgbaData;
  }

  /**
   * 添加 header 数据到图像数据中
   * 根据现有系统的要求，在 8224 字节处开始写入 header
   */
  static addHeaderToImageData(encodedData: EncodedTileData): Buffer {
    const { rgbaData, headerParams, width, height } = encodedData;
    const headerSize = 28 * 16; // 28个float值，每个占用16字节
    const totalSize = 8224 + headerSize + rgbaData.length;

    // 创建总缓冲区
    const buffer = Buffer.alloc(totalSize);

    // 前8224字节可以填充0或其他数据
    buffer.fill(0, 0, 8224);

    // 在8224字节处开始写入header
    let headerOffset = 8224;
    const headerValues = [
      headerParams.minR,
      headerParams.maxR,
      headerParams.minG,
      headerParams.maxG,
      headerParams.minB,
      headerParams.maxB,
    ];

    // 写入28个float值（前6个是实际参数，后面22个填充0）
    for (let i = 0; i < 28; i++) {
      const value = i < 6 ? headerValues[i] : 0;
      const floatBuffer = Buffer.alloc(4);
      floatBuffer.writeFloatLE(value, 0);

      // 将float值编码为RGBA格式（模拟现有系统的编码方式）
      const encoded = this.encodeFloatToRGBA(value);
      buffer.set(encoded, headerOffset);

      headerOffset += 16; // 每个header单元占用16字节
    }

    // 写入实际的图像数据
    const dataOffset = 8224 + headerSize;
    buffer.set(rgbaData, dataOffset);

    return buffer;
  }

  /**
   * 将float值编码为4字节RGBA格式
   * 模拟现有系统的编码逻辑
   */
  private static encodeFloatToRGBA(value: number): Uint8Array {
    // 这里应该实现与 extractHeaderData 中相反的逻辑
    // 由于现有系统的编码方式比较复杂，这里使用简化版本

    const buffer = Buffer.alloc(4);
    buffer.writeFloatLE(value, 0);

    return new Uint8Array(buffer);
  }
}
