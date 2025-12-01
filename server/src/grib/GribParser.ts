/**
 * GRIB 文件解析器
 * 使用 weacast-grib2json 库进行真实的 GRIB 文件解析
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// @ts-ignore
import grib2json from 'weacast-grib2json';
import { WindData, BoundingBox } from '../types';
import { GribOriginItem } from '../types/index';

export class GribParser {
  private static gribParser: any;

  /**
   * 初始化 GRIB 解析器
   */
  private static async initParser(): Promise<any> {
    if (!this.gribParser) {
      this.gribParser = grib2json;
    }
    return this.gribParser;
  }

  /**
   * 解析 GRIB 文件并返回风场数据
   */
  static async parseGribFile(filePath: string): Promise<WindData> {
    const outputFile = path.join(os.tmpdir(), `grib_output_${Date.now()}.json`);

    try {
      const parser = await this.initParser();

      console.log(`Parsing GRIB file: ${filePath}`);

      // 解析 GRIB 数据 - 使用输出文件避免 stdout 缓冲区溢出
      await parser(filePath, {
        data: true,
        output: outputFile,
        bufferSize: 64 * 1024 * 1024, // 64MB 缓冲区
      });

      // 读取输出文件内容
      const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

      console.log('result', result);

      // 提取风场数据
      // const windData = GribParser.extractWindData(result);

      // 清理临时文件
      fs.unlinkSync(outputFile);
      // @ts-ignore
      return null;
    } catch (error) {
      // 确保清理临时文件
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
      console.error('Error parsing GRIB file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse GRIB file: ${errorMessage}`);
    }
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
    const rgbaData = new Uint8ClampedArray(257 * 4 * 1);

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

  static calculateWindComponentRanges(
    uComponent: number[][],
    vComponent: number[][]
  ): {
    minU: number;
    maxU: number;
    minV: number;
    maxV: number;
    minB?: number; // 可选，B通道的最小值
    maxB?: number; // 可选，B通道的最大值
  } {
    // 初始化最小最大值
    let minU = Number.MAX_VALUE;
    let maxU = Number.MIN_VALUE;
    let minV = Number.MAX_VALUE;
    let maxV = Number.MIN_VALUE;

    // 验证数据维度是否一致
    if (uComponent.length !== vComponent.length) {
      throw new Error('U和V分量数据的行数不一致');
    }

    // 遍历所有数据点计算最小最大值
    for (let i = 0; i < uComponent.length; i++) {
      const uRow = uComponent[i];
      const vRow = vComponent[i];

      if (uRow.length !== vRow.length) {
        throw new Error(`第${i}行的U和V分量数据列数不一致`);
      }

      for (let j = 0; j < uRow.length; j++) {
        const u = uRow[j];
        const v = vRow[j];

        // 更新U分量范围
        if (u < minU) minU = u;
        if (u > maxU) maxU = u;

        // 更新V分量范围
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
    }

    // 处理特殊情况：如果所有值都相同
    if (minU === maxU) {
      minU -= 0.1; // 添加小的偏移量避免除零
      maxU += 0.1;
    }

    if (minV === maxV) {
      minV -= 0.1;
      maxV += 0.1;
    }

    // B通道通常用于透明度或其他用途，这里返回默认值0
    return {
      minU,
      maxU,
      minV,
      maxV,
      minB: 0,
      maxB: 0,
    };
  }

  static async getRegionDataFromBbox() {
    
  }

  /**
   * 提取指定区域的风场数据
   * 注意：weacast-grib2json 不支持 bbox 选项，这里会解析整个文件
   * 然后在应用层实现区域过滤
   */
  static async extractRegionData(filePath: string, bbox: BoundingBox): Promise<GribOriginItem[]> {
    const outputFile = path.join(os.tmpdir(), `grib_output_${Date.now()}.json`);

    try {
      const parser = await this.initParser();

      console.log(`Extracting region data from ${filePath} for bbox:`, bbox);

      // 解析 GRIB 数据 - 使用输出文件避免 stdout 缓冲区溢出
      await parser(filePath, {
        data: true,
        output: outputFile,
        bufferSize: 64 * 1024 * 1024, // 64MB 缓冲区
      });

      // 读取输出文件内容
      const result = JSON.parse(fs.readFileSync(outputFile, 'utf8')) as GribOriginItem[];
console.log('result', result);
      // 提取风场数据
      const parseData = GribParser.extractDataFromGribJson(result);
      // const windData = GribParser.extractWindData(result);

      // 在应用层实现区域过滤，基于 bbox 裁剪数据
      // const filteredWindData = GribParser.filterDataByBoundingBox(windData, bbox);

      // 清理临时文件
      fs.unlinkSync(outputFile);

      return result;
    } catch (error) {
      // 确保清理临时文件
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
      console.error('Error extracting region data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract region data: ${errorMessage}`);
    }
  }

  /**
   * 获取 GRIB 文件信息
   */
  static async getGribInfo(filePath: string): Promise<any> {
    try {
      const parser = await this.initParser();

      // 获取 GRIB 文件信息 - weacast-grib2json 需要文件路径而不是 Buffer
      const result = await parser(filePath, {
        names: true,
      });

      return {
        filePath,
        fileSize: fs.statSync(filePath).size,
        ...result,
        variables: GribParser.extractVariableNames(result),
      };
    } catch (error) {
      console.error('Error getting GRIB info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get GRIB info: ${errorMessage}`);
    }
  }

  // /**
  //  * 从解析结果中提取风场数据
  //  */
  // private static extractWindData(parsedData: any): WindData {
  //   console.log(
  //     'Parsed data structure:',
  //     JSON.stringify(parsedData, null, 2).substring(0, 200) + '...'
  //   );

  //   // 查找 u-component 和 v-component 数据
  //   let uData: number[][] = [];
  //   let vData: number[][] = [];

  //   // 检查不同的可能数据结构
  //   // weacast-grib2json 输出的是消息数组，每个消息包含 header 和 data
  //   const dataArray = Array.isArray(parsedData)
  //     ? parsedData
  //     : parsedData?.data || parsedData?.messages || [];

  //   if (dataArray && Array.isArray(dataArray)) {
  //     // 提取 u-component (东西方向风)
  //     // weacast-grib2json 使用 parameterNumber 来标识变量
  //     const uComponent = dataArray.find(
  //       (item: any) =>
  //         item.header?.parameterNumber === 2 || // U-component 通常为参数编号 2
  //         (item.header?.parameterCategory === 2 && item.header?.parameterNumber === 2) // 风场 U 分量
  //     );

  //     // 提取 v-component (南北方向风)
  //     const vComponent = dataArray.find(
  //       (item: any) =>
  //         item.header?.parameterNumber === 3 || // V-component 通常为参数编号 3
  //         (item.header?.parameterCategory === 2 && item.header?.parameterNumber === 3) // 风场 V 分量
  //     );

  //     // 提取数据值
  //     if (uComponent && uComponent.data) {
  //       uData = this.extractDataValues(uComponent);
  //     }

  //     if (vComponent && vComponent.data) {
  //       vData = this.extractDataValues(vComponent);
  //     }
  //   }

  //   const res = GribParser.calculateWindComponentRanges(uData, vData);

  //   console.log('nv info', res, GribParser.encodeWindParamsToRGBA257x4(res));

  //   // 将结果写入header.json文件
  //   const rgbaData = GribParser.encodeWindParamsToRGBA257x4(res);
  //   const headerJsonPath = path.join(__dirname, '../../data/header.json');
  //   fs.writeFileSync(headerJsonPath, JSON.stringify(Array.from(rgbaData), null, 2));
  //   console.log('Header data has been written to', headerJsonPath);

  //   console.log(`Extracted U data: ${uData.length}x${uData[0]?.length || 0}`);
  //   console.log(`Extracted V data: ${vData.length}x${vData[0]?.length || 0}`);

  //   // 计算风速和风向
  //   const { speed, direction } = GribParser.calculateWindSpeedDirection(uData, vData);
  //   return {
  //     speed,
  //     direction,
  //     uComponent: uData,
  //     vComponent: vData,
  //   };
  // }

  private static extractDataFromGribJson(gribJson: GribOriginItem[]) {
    console.log(
      '------ Parsed data structure:',
      JSON.stringify(gribJson, null, 2).substring(0, 200) + '... -----'
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

    const dataSource = Array.isArray(grib2json) ? gribJson : [];
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

  /**
   * 根据 u、v 分量计算风速和风向
   */
  private static calculateWindSpeedDirection(
    uData: number[][],
    vData: number[][]
  ): { speed: number[][]; direction: number[][] } {
    const speed: number[][] = [];
    const direction: number[][] = [];

    const height = uData.length;
    const width = uData[0]?.length || 0;

    for (let y = 0; y < height; y++) {
      const speedRow: number[] = [];
      const dirRow: number[] = [];

      for (let x = 0; x < width; x++) {
        const u = uData[y]?.[x] || 0;
        const v = vData[y]?.[x] || 0;

        // 计算风速 (m/s)
        const windSpeed = Math.sqrt(u * u + v * v);
        speedRow.push(windSpeed);

        // 计算风向 (度)
        const windDirection = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
        dirRow.push(windDirection);
      }

      speed.push(speedRow);
      direction.push(dirRow);
    }

    return { speed, direction };
  }

  private static normalizeComponents() {

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

  /**
   * 根据边界框过滤风场数据
   */
  private static filterDataByBoundingBox(windData: WindData, bbox: BoundingBox): WindData {
    // 假设数据是全球 0.25° 分辨率网格 (1440x721)
    // 左上角: 0°E, 90°N, 右下角: 359.75°E, -90°S
    const globalWidth = 1440;
    const globalHeight = 721;
    const lonPerPixel = 360 / globalWidth; // 0.25°
    const latPerPixel = 180 / (globalHeight - 1); // 0.25°

    // 计算边界框对应的像素范围
    const startX = Math.floor((bbox.minLon + 180) / lonPerPixel);
    const endX = Math.ceil((bbox.maxLon + 180) / lonPerPixel);
    const startY = Math.floor((90 - bbox.maxLat) / latPerPixel);
    const endY = Math.ceil((90 - bbox.minLat) / latPerPixel);

    // 确保在有效范围内
    const clampedStartX = Math.max(0, startX);
    const clampedEndX = Math.min(globalWidth, endX);
    const clampedStartY = Math.max(0, startY);
    const clampedEndY = Math.min(globalHeight, endY);

    const tileWidth = clampedEndX - clampedStartX;
    const tileHeight = clampedEndY - clampedStartY;

    console.log(`Filtering data for bbox: ${JSON.stringify(bbox)}`);
    console.log(
      `Pixel range: x[${clampedStartX}-${clampedEndX}], y[${clampedStartY}-${clampedEndY}]`
    );
    console.log(`Tile size: ${tileWidth}x${tileHeight}`);

    // 提取对应区域的数据
    const extractRegion = (data: number[][]) => {
      const regionData: number[][] = [];

      for (let y = clampedStartY; y < clampedEndY; y++) {
        const row: number[] = [];
        for (let x = clampedStartX; x < clampedEndX; x++) {
          row.push(data[y]?.[x] || 0);
        }
        regionData.push(row);
      }

      return regionData;
    };

    return {
      speed: extractRegion(windData.speed),
      direction: extractRegion(windData.direction),
      uComponent: extractRegion(windData.uComponent),
      vComponent: extractRegion(windData.vComponent),
    };
  }

  /**
   * 提取变量名称
   */
  private static extractVariableNames(info: any): string[] {
    const variables: string[] = [];

    const messages = info.messages || info.data || [];

    if (Array.isArray(messages)) {
      for (const message of messages) {
        const name = message.parameter?.name || message.parameterName;
        if (name) {
          variables.push(name);
        }
      }
    }

    return Array.from(new Set(variables));
  }
}
