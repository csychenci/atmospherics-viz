let webglSupported = false; // WebGL 支持标志
let canvasElement: HTMLCanvasElement; // Canvas 元素
let canvas2DContext: CanvasRenderingContext2D | null = null; // Canvas 2D 上下文
let webglContext: WebGLRenderingContext | null = null; // WebGL 上下文
let webglFramebuffer: WebGLFramebuffer | undefined = void 0; // WebGL 帧缓冲
let webglTexture: WebGLTexture | undefined = void 0; // WebGL 纹理

// 模块导入时立即初始化
(function init() {
  try {
    // 创建 Canvas 元素
    canvasElement = document.createElement('canvas');

    // 尝试初始化 WebGL
    const gl = canvasElement.getContext('webgl') || canvasElement.getContext('webgl2');
    if (gl && gl instanceof WebGLRenderingContext) {
      webglContext = gl;
      webglSupported = true;

      // 创建 WebGL 纹理
      webglTexture = gl.createTexture();
      // if (webglTexture) {

      //   gl.bindTexture(gl.TEXTURE_2D, webglTexture);
      //   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      //   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      //   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      //   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      // }

      // 创建 WebGL 帧缓冲
      webglFramebuffer = gl.createFramebuffer();
    }

    // 初始化 Canvas 2D 上下文
    canvas2DContext = canvasElement.getContext('2d', {
      desynchronized: true,
      willReadFrequently: true,
    });
  } catch (error) {
    console.warn('GraphicsRenderer initialization failed:', error);
    webglSupported = false;
  }
})();

export function extractImageData(imageElement: HTMLImageElement): Uint8ClampedArray {
  let extractedData: Uint8ClampedArray | null = null;

  // WebGL 路径 - 对应源代码第 15162-15176 行
  if (webglSupported && webglContext && webglTexture && webglFramebuffer) {
    try {
      // 激活纹理并绑定 - 完全对应源代码
      webglContext.activeTexture(webglContext.TEXTURE0);
      webglContext.bindTexture(webglContext.TEXTURE_2D, webglTexture);
      webglContext.bindFramebuffer(webglContext.FRAMEBUFFER, webglFramebuffer);
      webglContext.framebufferTexture2D(
        webglContext.FRAMEBUFFER,
        webglContext.COLOR_ATTACHMENT0,
        webglContext.TEXTURE_2D,
        webglTexture,
        0
      );
      webglContext.texImage2D(
        webglContext.TEXTURE_2D,
        0,
        webglContext.RGBA,
        webglContext.RGBA,
        webglContext.UNSIGNED_BYTE,
        imageElement
      );

      // 读取像素数据
      const pixelData = new Uint8Array(imageElement.width * imageElement.height * 4);
      webglContext.readPixels(
        0,
        0,
        imageElement.width,
        imageElement.height,
        webglContext.RGBA,
        webglContext.UNSIGNED_BYTE,
        pixelData
      );
      extractedData = new Uint8ClampedArray(pixelData);
    } catch (error) {
      console.warn('WebGL extraction failed, falling back to Canvas 2D:', error);
      extractedData = null;
    }
  }

  // Canvas 2D 回退路径 - 对应源代码的回退逻辑
  if (!extractedData && canvas2DContext) {
    try {
      canvasElement.width = imageElement.width;
      canvasElement.height = imageElement.height;
      canvas2DContext.drawImage(imageElement, 0, 0, imageElement.width, imageElement.height);
      extractedData = canvas2DContext.getImageData(
        0,
        0,
        imageElement.width,
        imageElement.height
      ).data;
    } catch (error) {
      console.error('Canvas 2D extraction also failed:', error);
      // 创建空数据作为最后的回退
      extractedData = new Uint8ClampedArray(imageElement.width * imageElement.height * 4);
    }
  }

  return extractedData || new Uint8ClampedArray(imageElement.width * imageElement.height * 4);
}