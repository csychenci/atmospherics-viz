/**
 * 瓦片服务服务器
 * 提供 GRIB 文件到瓦片数据的转换 API
 */

import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { TileService } from './services/TileService';
import { TileCoord } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use('/tiles', express.static(path.join(__dirname, 'tiles')));

// 路由：获取瓦片数据
app.get('/tile/:z/:x/:y', async (req, res) => {
  try {
    const { z, x, y } = req.params;
    const coord: TileCoord = {
      z: parseInt(z),
      x: parseInt(x), 
      y: parseInt(y)
    };
    
    // GRIB 文件路径（这里使用示例文件）
    const gribFilePath = path.join(__dirname, '../data/global_20251121_12_f003.grib');
    
    // 生成瓦片数据
    const result = await TileService.generateTile(gribFilePath, coord);
    
    // 设置响应头
    res.set({
      'Content-Type': 'image/png',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600' // 缓存1小时
    });
    
    // 返回 PNG 图像
    res.send();
    
  } catch (error) {
    console.error('Error generating tile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to generate tile',
      message: errorMessage
    });
  }
});

// 路由：获取 GRIB 文件信息
app.get('/grib-info', async (req, res) => {
  try {
    const gribFilePath = path.join(__dirname, '../data/global_20250806_12_f012.grib');
    const info = await TileService.getGribInfo(gribFilePath);
    
    res.json({
      success: true,
      data: info
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to get GRIB info',
      message: errorMessage
    });
  }
});

// 路由：批量生成瓦片
app.post('/batch-tiles', async (req, res) => {
  try {
    const { coords } = req.body;
    
    if (!coords || !Array.isArray(coords)) {
      return res.status(400).json({
        error: 'Invalid coordinates format',
        message: 'coords must be an array of {z, x, y} objects'
      });
    }
    
    const gribFilePath = path.join(__dirname, '../data/global_20250806_12_f012.grib');
    
    // 生成进度回调
    const onProgress = (current: number, total: number) => {
      console.log(`Progress: ${current}/${total} tiles generated`);
    };
    
    const results = await TileService.generateTiles(gribFilePath, coords, onProgress);
    
    res.json({
      success: true,
      generated: results.size,
      total: coords.length,
      results: Object.fromEntries(results)
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to generate batch tiles',
      message: errorMessage
    });
  }
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'GRIB Tile Service'
  });
});

// 测试路由：将 header.json 的 RGBA 数据转换为 PNG 图片
app.get('/test-header-image', async (req, res) => {
  try {
    const headerFilePath = path.join(__dirname, '../data/header.json');
    
    // 读取 header.json 文件
    const headerData = await fs.readFile(headerFilePath, 'utf-8');
    const rgbaArray = JSON.parse(headerData);
    
    // 计算图像尺寸（header.json 包含 4112 个 RGBA 值，即 1028 个像素）
    const pixelCount = rgbaArray.length / 4;
    const width = 257; // 4 行 × 257 列 = 1028 像素
    const height = Math.ceil(pixelCount / width);
    
    // 计算需要的总字节数（补齐到完整的 257×4 整数倍）
    const totalBytesNeeded = width * height * 4;
    
    // 创建 Uint8Array 缓冲区，如果长度不足则用 0,0,0,255（黑色不透明）补齐
    const paddedArray = new Uint8Array(totalBytesNeeded);
    paddedArray.set(rgbaArray, 0); // 复制原始数据
    
    // 剩余部分用 0,0,0,255 补齐（每4个字节为一组）
    for (let i = rgbaArray.length; i < totalBytesNeeded; i += 4) {
      paddedArray[i] = 0;     // R
      paddedArray[i + 1] = 0; // G
      paddedArray[i + 2] = 0; // B
      paddedArray[i + 3] = 255; // A（不透明）
    }
    
    const buffer = Buffer.from(paddedArray);
    
    // 使用 sharp 创建 PNG 图像
    const pngBuffer = await sharp(buffer, {
      raw: {
        width: width,
        height: height,
        channels: 4
      }
    })
    .png()
    .toBuffer();
    
    // 设置响应头
    res.set({
      'Content-Type': 'image/png',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    
    // 返回 PNG 图像
    res.send(pngBuffer);
    
  } catch (error) {
    console.error('Error generating header image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to generate header image',
      message: errorMessage
    });
  }
});

// 错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 GRIB Tile Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Tile endpoint: http://localhost:${PORT}/tile/{z}/{x}/{y}`);
  console.log(`📍 GRIB info: http://localhost:${PORT}/grib-info`);
  console.log(`📍 Header test: http://localhost:${PORT}/test-header-image`);
});

export default app;