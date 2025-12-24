import { dispatchError } from '@atmospherics-viz/utils';
import { BaseRenderer } from '../base-render';
import { FEATURE_FLAGS } from './constants';
import { tileFragmentShaderSource, tileVertexShaderSource } from './shaders';
import { LayerSourceConfig, TileCoordConfig } from '@atmospherics-viz/types';
import { DataTile } from '../loader';
import { ColorGradientManager, DEFAULT_COLORS } from '../color';
import { DEFAULT_WEATHER_LAYERS, WeatherLayer } from '../base-layer';

export class GLTileRenderer {
  // WebGL 相关属性
  private glo: BaseRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private edgeSize: number = 256;
  private errorCount: number = 0;

  // 状态属性
  private initialized: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private isReady: boolean = false;
  private testPerformed: boolean = false;
  private testOk: boolean = false;
  private lastIdent: string | null = null;

  // WebGL 资源
  private vertexBufferRect: any = null;
  private srcTexture: WebGLTexture | null = null;
  private shMulti: any[] = [];
  private specShader: any = {};

  // 纹理资源
  private texCCL: any = null;
  private texPType1: any = null;
  private texPType2: any = null;
  private texCRain: WebGLTexture | null | undefined = null;

  // 渐变相关
  private gradient: any = null;
  private gradient2: any = null;
  private ptypeColors: number[][] = [];

  // 着色器参数
  private uVPars0: number[] = [];
  private uVPars1: number[] = [];
  private uVPars2: number[] = [];

  constructor() {}

  visibilityChanged(visible: boolean) {
    if (!visible) {
      this.reset();
    }
  }

  reset() {
    this.initialized = false;
    this.testPerformed = false;
    this.initPromise = null;
    this.isReady = false;
    this.edgeSize = 256;
    this.lastIdent = null;
    this.testOk = false;
  }

  onRedrawLayers() {
    this.lastIdent = null;
  }

  compileShader(
    vertexSource: string,
    fragmentSource: string,
    types: string[],
    meteoType: 'shMulti' | 'shClouds' | 'shRain' | 'shCloudtop' | 'shCbase' | 'shPtype' | 'shCCL'
  ) {
    const isCritical = !(arguments.length > 4 && void 0 !== arguments[4]) || arguments[4];
    let shaderProgram = null;
    console.log('meteoType', meteoType);
    try {
      shaderProgram = this.glo?.createProgramObj(vertexSource, fragmentSource, types, meteoType);
    } catch (error) {
      console.error('compileShader', error);
      if (isCritical) {
        dispatchError(
          'TileRenderer',
          "Compile shader '".concat(meteoType, "' (is critical: ").concat(isCritical, ') error:'),
          error
        );
      }
      ++this.errorCount;
    }
    return shaderProgram;
  }

  prepareRainPattern() {
    // 生成一个 16x16 的图案，每个图案元素重复4次
    const patternSize = 16;
    const buffer = new Uint8Array(1024); // 16x16x4 = 1024
    const colorValues = [128, 192, 58, 0];
    let bufferIndex = 0;

    for (let y = 0; y < patternSize; y++) {
      for (let x = 0; x < patternSize; x++) {
        // 根据坐标的最低有效位选择颜色索引
        const colorIndex = (x & 1) + ((y & 1) << 1);
        const colorValue = colorValues[colorIndex];

        // 每个图案元素重复4次（可能是RGBA通道）
        for (let repeat = 0; repeat < 4; repeat++) {
          buffer[bufferIndex++] = colorValue;
        }
      }
    }

    return this.glo?.createTexture2D(
      WebGLRenderingContext.NEAREST,
      WebGLRenderingContext.NEAREST,
      WebGLRenderingContext.REPEAT,
      buffer,
      patternSize,
      patternSize
    );
  }

  init() {
    try {
      if (this.initialized) return Promise.resolve(this.isReady);
      if (this.initPromise) return this.initPromise;
      this.errorCount = 0;
      const baseRenderer = new BaseRenderer();
      this.glo = baseRenderer;
      this.edgeSize = window.devicePixelRatio >= 2 ? 512 : 256;
      this.canvas = document.createElement('canvas');
      this.canvas.addEventListener('webglcontextlost', e => {
        dispatchError('glTileRenderer', 'Canvas context is lost', e);
      });
      this.canvas.addEventListener('webglcontextrestored', () => {
        dispatchError('glTileRenderer', 'Canvas context is restored');
      });
      this.canvas.addEventListener('webglcontextcreationerror', e => {
        dispatchError('glTileRenderer', 'Canvas context creation error: ');
      });
      this.canvas.width = this.edgeSize;
      this.canvas.height = this.edgeSize;
      try {
        const gl = baseRenderer.create(
          this.canvas,
          {
            antialias: false,
            depth: false,
            stencil: false,
            alpha: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
            desynchronized: true,
          },
          'TileRendererCtx'
        );
        if (!gl) {
          ++this.errorCount;
        }
      } catch (error) {
        ++this.errorCount;
      }
      if (this.errorCount) {
        this.initialized = true;
        return Promise.resolve(this.isReady);
      } else {
        this.initPromise = this.onWebGlInit(baseRenderer);
        return this.initPromise;
      }
    } catch (error) {
      this.initialized = true;
      return Promise.resolve(false);
    }
  }

  onWebGlInit(renderer: BaseRenderer): Promise<boolean> {
    this.vertexBufferRect = renderer.createBuffer(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]));
    this.srcTexture = renderer.createTexture2D(
      WebGLRenderingContext.NEAREST,
      WebGLRenderingContext.NEAREST,
      WebGLRenderingContext.CLAMP_TO_EDGE,
      null,
      512,
      512,
      WebGLRenderingContext.RGBA
    );
    this.shMulti = [];
    for (let i = 0; i < 16; i++) {
      const defines = ['BICUBIC'];
      if (i & FEATURE_FLAGS.VSIZE) defines.push('VSIZE');
      if (i & FEATURE_FLAGS.PNG) defines.push('PNG');
      if (i & FEATURE_FLAGS.BCH) defines.push('BCH');
      if (i & FEATURE_FLAGS.LOG) defines.push('LOG');
      const shader = this.compileShader(
        tileVertexShaderSource,
        tileFragmentShaderSource,
        defines,
        'shMulti'
      );
      this.shMulti.push(shader);
    }
    this.specShader = {
      ccl: this.compileShader(
        tileVertexShaderSource,
        tileFragmentShaderSource,
        ['BICUBIC', 'CCL', 'PATT', 'PNG'],
        'shCCL'
      ),
      clouds: this.compileShader(
        tileVertexShaderSource,
        tileFragmentShaderSource,
        ['BICUBIC', 'CLOUDS', 'PATT'],
        'shClouds'
      ),
      rain: this.compileShader(
        tileVertexShaderSource,
        tileFragmentShaderSource,
        ['BICUBIC', 'RAIN', 'LOG', 'PATT', 'PATT2', 'PNG'],
        'shRain'
      ),
      cloudtop: this.compileShader(
        tileVertexShaderSource,
        tileFragmentShaderSource,
        ['BILIN_A'],
        'shCloudtop'
      ),
      cbase: this.compileShader(
        tileVertexShaderSource,
        tileFragmentShaderSource,
        ['PNG'],
        'shCbase'
      ),
      ptype: this.compileShader(
        tileVertexShaderSource,
        'precision highp float;\n#define GLSLIFY 1\nuniform vec4 uPars0;uniform vec3 uCol0;uniform vec3 uCol1;uniform vec3 uCol2;uniform vec3 uCol3;uniform vec3 uCol4;uniform vec3 uCol5;uniform vec3 uCol6;uniform vec3 uCol7;uniform vec3 uCol8;uniform vec3 uCol9;uniform vec3 uCol10;uniform sampler2D sTex0;varying vec4 vTc0;varying vec4 vTc1;void main(void){float u1=vTc0.x;float u2=vTc0.x+vTc1.z;float v1=vTc0.y;float v2=vTc0.y+vTc1.w;vec4 s11=texture2D(sTex0,vec2(u1,v1));vec4 s12=texture2D(sTex0,vec2(u2,v1));vec4 s21=texture2D(sTex0,vec2(u1,v2));vec4 s22=texture2D(sTex0,vec2(u2,v2));vec2 f1=fract(vTc1.xy);vec2 f0=vec2(1.)-f1;vec4 w4=vec4(f0.y*f0.x,f0.y*f1.x,f1.y*f0.x,f1.y*f1.x);float r=dot(vec4(s11.r,s12.r,s21.r,s22.r),w4)*uPars0.x+uPars0.y;r=max(0.,pow(2.,r)-.001);vec4 g4=vec4(s11.g,s12.g,s21.g,s22.g)*uPars0.zzzz+uPars0.wwww;vec4 c0=vec4(0.);vec4 c1=vec4(1.);vec4 m01=clamp(sign(g4-1.)-sign(g4-2.),c0,c1);vec4 m02=clamp(sign(g4-2.)-sign(g4-3.),c0,c1);vec4 m03=clamp(sign(g4-3.)-sign(g4-4.),c0,c1);vec4 m04=clamp(sign(g4-4.)-sign(g4-5.),c0,c1);vec4 m05=clamp(sign(g4-5.)-sign(g4-6.),c0,c1);vec4 m06=clamp(sign(g4-6.)-sign(g4-7.),c0,c1);vec4 m07=clamp(sign(g4-7.)-sign(g4-8.),c0,c1);vec4 m08=clamp(sign(g4-8.)-sign(g4-9.),c0,c1);vec4 m09=clamp(sign(g4-9.)-sign(g4-10.),c0,c1);vec4 m10=clamp(sign(g4-10.)-sign(g4-11.),c0,c1);const float d=-.45;vec3 rgb=uCol0;rgb=mix(rgb,uCol1,vec3(max(sign(dot(m01,w4)+d),0.)));rgb=mix(rgb,uCol2,vec3(max(sign(dot(m02,w4)+d),0.)));rgb=mix(rgb,uCol3,vec3(max(sign(dot(m03,w4)+d),0.)));rgb=mix(rgb,uCol4,vec3(max(sign(dot(m04,w4)+d),0.)));rgb=mix(rgb,uCol5,vec3(max(sign(dot(m05,w4)+d),0.)));rgb=mix(rgb,uCol6,vec3(max(sign(dot(m06,w4)+d),0.)));rgb=mix(rgb,uCol7,vec3(max(sign(dot(m07,w4)+d),0.)));rgb=mix(rgb,uCol8,vec3(max(sign(dot(m08,w4)+d),0.)));rgb=mix(rgb,uCol9,vec3(max(sign(dot(m09,w4)+d),0.)));rgb=mix(rgb,uCol10,vec3(max(sign(dot(m10,w4)+d),0.)));rgb=mix(rgb,uCol0,vec3(max(sign(0.1-r),0.)));gl_FragColor=vec4(rgb,1.);}',
        [],
        'shPtype'
      ),
    };
    this.texCCL = null;
    this.texPType1 = null;
    this.texPType2 = null;
    this.texCRain = this.prepareRainPattern();
    const results: Promise<['texCCL' | 'texPType1' | 'texPType2', WebGLTexture | null]>[] = [],
      that = this;
    results.push(
      Promise.resolve(['texCCL', null]),
      Promise.resolve(['texPType1', null]),
      Promise.resolve(['texPType2', null])
      // renderer.textureFromUrlPromise(
      //   'texCCL',
      //   '/assets/textures/ccl32_v4.png',
      //   WebGLRenderingContext.NEAREST_MIPMAP_NEAREST,
      //   WebGLRenderingContext.LINEAR,
      //   WebGLRenderingContext.REPEAT,
      //   true
      // ),
      // renderer.textureFromUrlPromise(
      //   'texPType1',
      //   '/assets/textures/ptype1_v4.png',
      //   WebGLRenderingContext.NEAREST_MIPMAP_NEAREST,
      //   WebGLRenderingContext.LINEAR,
      //   WebGLRenderingContext.REPEAT,
      //   true
      // ),
      // renderer.textureFromUrlPromise(
      //   'texPType2',
      //   '/assets/textures/ptype2_v4.png',
      //   WebGLRenderingContext.NEAREST_MIPMAP_NEAREST,
      //   WebGLRenderingContext.LINEAR,
      //   WebGLRenderingContext.REPEAT,
      //   true
      // )
    );

    return new Promise(resolve => {
      Promise.all(results)
        .then(values => {
          values.forEach(([key, texture]) => {
            that[key] = texture;
          });
          that.initPromise = null;
          that.initialized = true;
          that.isReady = true;
          resolve(that.isReady);
        })
        .catch(() => {
          that.initPromise = null;
          that.initialized = false;
          that.isReady = false;
          resolve(that.isReady);
        });
    });
  }

  /**
   * 从颜色梯度源生成用于着色器的梯度纹理对象。
   *
   * 语义说明：
   * - 当梯度步数过大（> 2048）时，按比例下采样，保证纹理宽度受控；
   * - 纹理宽度取不小于有效步数的 2 的幂，以兼容 GPU 纹理约束；
   * - 返回的 mul/add 用于在着色器中把数据值映射到梯度索引：index = value * mul + add；
   * - 当生成的梯度数组长度不足纹理所需长度时，用“倒数第二个颜色”补齐尾部，避免采样越界。
   *
   * 与上下文的契合：
   * - 在 prepareGradients(...) 中，先调用 source.getColor() 保证梯度就绪，
   *   随后 this.gradient = this.createGradientObject(source)；
   * - 在 renderGlTile(...) 中，会绑定 this.gradient.texture 到 sGrad，
   *   并把 [mul, add] 作为 uPars1 的一部分传入着色器。
   */
  createGradientObject(colorGradientManager: ColorGradientManager) {
    try {
      // (1) 限制步数与计算下采样因子
      const steps = colorGradientManager.steps;
      let effectiveSteps = steps;
      let downscale = 1;
      if (effectiveSteps > 2048) {
        downscale = steps / (effectiveSteps = 2048);
      }
      // 2) 纹理宽度取不小于有效步数的 2 的幂
      let texWidth = 1 << Math.round(Math.log2(effectiveSteps));
      if (texWidth < effectiveSteps) {
        texWidth += texWidth;
      }
      const range = colorGradientManager.max - colorGradientManager.min;
      const indexMul = effectiveSteps / (range * texWidth);
      const indexAdd = -indexMul * colorGradientManager.min;
      const requiredByteLen = texWidth << 2;
      let gradientBytes = colorGradientManager.createGradientArray(false, false, downscale);
      if (gradientBytes.byteLength < requiredByteLen) {
        const padded = new Uint8Array(requiredByteLen);
        padded.set(gradientBytes);
        if (gradientBytes.byteLength > 7) {
          const tailRGBA = new Uint8Array(4);
          for (let k = 0; k < 4; k++) {
            tailRGBA[k] = gradientBytes[gradientBytes.byteLength - 8 + k];
          }
          for (let offset = gradientBytes.byteLength - 4; offset < requiredByteLen; offset += 4) {
            padded.set(tailRGBA, offset);
          }
        }
        gradientBytes = padded;
      } else if (gradientBytes.byteLength > requiredByteLen) {
        gradientBytes = new Uint8Array(gradientBytes.buffer, 0, requiredByteLen);
        const texture = this.glo?.createTexture2D(
          WebGLRenderingContext.LINEAR, // minFilter
          WebGLRenderingContext.LINEAR, // maxFilter
          WebGLRenderingContext.CLAMP_TO_EDGE, // wrap
          gradientBytes, // 像素数据
          texWidth, // 宽度（像素）
          1 // 高度（像素）
        );
        return {
          texture,
          mul: indexMul,
          add: indexAdd,
        };
      }
    } catch (error) {
      0;
    }
    return null;
  }

  prepareGradients(layerConfig: WeatherLayer) {
    if (this.lastIdent !== layerConfig.ident) {
      this.gradient = null;
      this.gradient2 = null;
      const colorManager = layerConfig.colors;
      if (colorManager) {
        colorManager.getColor();
        this.gradient = this.createGradientObject(colorManager);
        switch (layerConfig.ident) {
          case 'clouds':
            const color = DEFAULT_COLORS.rainClouds.getColor();
            this.gradient2 = this.createGradientObject(color);
            break;
          case 'ptype':
            const ptypeColor = DEFAULT_COLORS.ptype.getColor();
            if (ptypeColor) {
              const i = 1 / 255;
              this.ptypeColors = [];
              for (let a = 0; a < 11; a++) {
                const o = ptypeColor.RGBA(a);
                this.ptypeColors[a] = [i * o[0], i * o[1], i * o[2]];
              }
            }
            break;
        }
      }
      this.lastIdent = layerConfig.ident;
    }
  }

  setBaseShStuff(
    renderer: BaseRenderer | null,
    gl: WebGLRenderingContext,
    currentShader: {
      program: WebGLProgram;
      aPos: number;
      uVPars0: number;
      uVPars1: number;
      uVPars2: number;
      sTex0: number;
    }
  ) {
    gl.viewport(0, 0, this.edgeSize, this.edgeSize);
    gl.useProgram(currentShader.program);
    renderer?.bindAttribute(
      this.vertexBufferRect,
      currentShader.aPos,
      2,
      WebGLRenderingContext.FLOAT,
      false,
      8,
      0
    );
    gl.uniform4fv(currentShader.uVPars0, this.uVPars0);
    gl.uniform4fv(currentShader.uVPars1, this.uVPars1);
    gl.uniform4fv(currentShader.uVPars2, this.uVPars2);
    renderer?.bindTexture2D(this.srcTexture, 0, currentShader.sTex0);
  }

  renderGlTile(
    renderer: BaseRenderer | null,
    gl: WebGLRenderingContext,
    renderParams: any,
    layerType: string,
    layerConfig: WeatherLayer,
    dataTile: DataTile
  ) {
    let shaderFlags = 0,
      isWaveType = false,
      offset = 0;
    switch (layerType) {
      case 'wind':
      case 'currents':
      case 'currentsTide':
        shaderFlags += 1;
        break;
      case 'waves':
      case 'wwaves':
      case 'swell1':
      case 'swell2':
      case 'swell3':
        isWaveType = true;
        shaderFlags += 4;
        break;
      default:
        break;
    }

    if (renderParams.PNGtransparency || renderParams.fileSuffix === 'png') {
      shaderFlags += 2;
    }

    // 变换参数设置
    const transformParams = [-0.001, 0, 128 / 255, 0];
    if (layerConfig.wTransformR === 'rainLog') {
      shaderFlags += 8;
    } else if (layerConfig.wTransformR && layerConfig.wTransformR > 0) {
      shaderFlags += 8;
      transformParams[0] = layerConfig.wTransformR;
    }

    const currentShader = this.specShader[layerType] || this.shMulti[shaderFlags];
    const headerParams = dataTile.headerPars;
    if (!currentShader || !headerParams) return false;
    this.setBaseShStuff(renderer, gl, currentShader);
    switch (layerType) {
      case 'rain':
        offset = 0.5;
        renderer?.bindTexture2D(this.texPType1, 3, currentShader.sPatt);
        renderer?.bindTexture2D(this.texPType2, 4, currentShader.sPatt2);
        break;
      case 'clouds':
        renderer?.bindTexture2D(this.texCRain!, 3, currentShader.sPatt);
        break;
      case 'ptype':
        offset = 0.5;
        if (this.ptypeColors) {
          const ptypeColors = this.ptypeColors;
          gl.uniform3fv(currentShader.uCol0, ptypeColors[0]);
          gl.uniform3fv(currentShader.uCol1, ptypeColors[1]);
          gl.uniform3fv(currentShader.uCol2, ptypeColors[2]);
          gl.uniform3fv(currentShader.uCol3, ptypeColors[3]);
          gl.uniform3fv(currentShader.uCol4, ptypeColors[4]);
          gl.uniform3fv(currentShader.uCol5, ptypeColors[5]);
          gl.uniform3fv(currentShader.uCol6, ptypeColors[6]);
          gl.uniform3fv(currentShader.uCol7, ptypeColors[7]);
          gl.uniform3fv(currentShader.uCol8, ptypeColors[8]);
          gl.uniform3fv(currentShader.uCol9, ptypeColors[9]);
          gl.uniform3fv(currentShader.uCol10, ptypeColors[10]);
        } else {
          // 默认降水类型颜色
          const colorScale = 1 / 255;
          gl.uniform3fv(currentShader.uCol0, [
            111 * colorScale,
            111 * colorScale,
            111 * colorScale,
          ]);
          gl.uniform3fv(currentShader.uCol1, [0, 208 * colorScale, 239 * colorScale]);
          gl.uniform3fv(currentShader.uCol2, [0, 0, 1]);
          gl.uniform3fv(currentShader.uCol3, [197 * colorScale, 27 * colorScale, 195 * colorScale]);
          gl.uniform3fv(currentShader.uCol4, [129 * colorScale, 63 * colorScale, 63 * colorScale]);
          gl.uniform3fv(currentShader.uCol5, [
            227 * colorScale,
            227 * colorScale,
            227 * colorScale,
          ]);
          gl.uniform3fv(currentShader.uCol6, [
            129 * colorScale,
            195 * colorScale,
            129 * colorScale,
          ]);
          gl.uniform3fv(currentShader.uCol7, [202 * colorScale, 211 * colorScale, 57 * colorScale]);
          gl.uniform3fv(currentShader.uCol8, [183 * colorScale, 119 * colorScale, 8 * colorScale]);
          gl.uniform3fv(currentShader.uCol9, [227 * colorScale, 73 * colorScale, 19 * colorScale]);
          gl.uniform3fv(currentShader.uCol10, [195 * colorScale, 63 * colorScale, 63 * colorScale]);
        }
        break;
      case 'ccl':
        offset = 0.5;
        renderer?.bindTexture2D(this.texCCL, 3, currentShader.sPatt);
        break;
      case 'cloudtop':
        transformParams[2] = 111 / 255;
        break;
      default:
        break;
    }
    // 梯度纹理处理
    const gradient1 = this.gradient,
      gradient2 = this.gradient2,
      gradientParams = [0, 0, 0, 0];

    if (gradient1) {
      gradientParams[0] = gradient1.mul;
      gradientParams[1] = gradient1.add;
      renderer?.bindTexture2D(gradient1.texture, 1, currentShader.sGrad);
    }
    if (gradient2) {
      gradientParams[2] = gradient2.mul;
      gradientParams[3] = gradient2.add;
      renderer?.bindTexture2D(gradient2.texture, 2, currentShader.sGrad2);
    }

    // 计算最终参数
    const finalParams = isWaveType
      ? [255 * headerParams[4], headerParams[5], 0, 0]
      : [255 * headerParams[0], headerParams[1], 255 * headerParams[2], headerParams[3] + offset];

    gl.uniform4fv(currentShader.uPars0, finalParams);
    gl.uniform4fv(currentShader.uPars1, gradientParams);
    gl.uniform4fv(currentShader.uPars2, transformParams);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    return true;
  }

  renderTile(
    layerParams: LayerSourceConfig,
    canvas: HTMLCanvasElement,
    tileConfig: TileCoordConfig,
    dataTile: DataTile
  ) {
    const renderer = this.glo,
      gl = renderer?.gl(),
      edgeSize = this.edgeSize;

    if (!dataTile.data) return false;
    const textureSize = 512,
      texelSize = 1 / textureSize,
      sourceData = new Uint8Array(dataTile.data.buffer),
      chunkSize = 1028,
      textureData = new Uint8Array(1048576);

    let sourceOffset = 8224,
      destOffset = 0;

    for (let row = 0; row < 259; row++) {
      textureData.set(sourceData.subarray(sourceOffset, sourceOffset + chunkSize), destOffset);
      const paddingData = sourceData.subarray(
        sourceOffset + chunkSize - 4,
        sourceOffset + chunkSize
      );
      textureData.set(paddingData, destOffset + chunkSize);
      textureData.set(paddingData, destOffset + chunkSize + 4);
      if (row < 256) {
        sourceOffset += chunkSize;
      }
      destOffset += 2048;
    }
    console.log('textureData', textureData);
    renderer?.resizeTexture2D(
      this.srcTexture,
      textureData,
      textureSize,
      textureSize,
      WebGLRenderingContext.RGBA
    );
    canvas.width = edgeSize;
    canvas.height = edgeSize;
    const ctx = canvas.getContext('2d'),
      imageData = ctx?.createImageData(edgeSize, edgeSize);
    if (!ctx || !imageData || !gl) return false;

    const textureScale = 0.998 * texelSize,
      pixelRatio = 256 / tileConfig?.trans!;
    let offsetX = 0,
      offsetY = 0;
    if (pixelRatio < 1) {
      offsetX = tileConfig?.intX! * pixelRatio;
      offsetX -= Math.floor(offsetX);
      offsetY = tileConfig?.intY! * pixelRatio;
      offsetY -= Math.floor(offsetY);
    }
    const scaledTextureSize = pixelRatio * texelSize;
    this.uVPars0 = [
      scaledTextureSize,
      scaledTextureSize,
      scaledTextureSize * tileConfig?.intX!,
      scaledTextureSize * tileConfig?.intY!,
    ];
    this.uVPars1 = [16, 16, textureScale, textureScale];
    this.uVPars2 = [pixelRatio, pixelRatio, offsetX, offsetY];
    const layerType = layerParams.layer, // T -> layerType (图层类型)
      layerConfig = DEFAULT_WEATHER_LAYERS[layerType as keyof typeof DEFAULT_WEATHER_LAYERS];
    this.prepareGradients(layerConfig);
    const renderGlResult = this.renderGlTile(
      renderer,
      gl,
      layerParams,
      layerType,
      layerConfig,
      dataTile
    );
    if (!renderGlResult) {
      return false;
    }
    const bufferData = new Uint8Array(imageData.data.buffer);
    gl.readPixels(
      0,
      0,
      edgeSize,
      edgeSize,
      WebGLRenderingContext.RGBA,
      WebGLRenderingContext.UNSIGNED_BYTE,
      bufferData
    );
    ctx.putImageData(imageData, 0, 0);
    return true;
  }

  processTile(
    layerParams: LayerSourceConfig,
    canvas: HTMLCanvasElement,
    config: TileCoordConfig,
    dataTile: DataTile
  ) {
    return new Promise(resolve => {
      this.init()
        .then(result => {
          if (!this.testPerformed) {
            this.testOk = this.usabilityTest();
            this.testPerformed = true;
          }
          if (result && this.testOk) {
            canvas.classList.add('leaflet-tile-loaded');
            resolve(this.renderTile(layerParams, canvas, config, dataTile));
          }
        })
        .catch(() => {
          this.isReady = false;
          resolve(false);
        });
    });
  }

  usabilityTest() {
    const gl = this.glo?.gl(),
      edgeSize = this.edgeSize;
    if (gl) {
      gl.clearColor(1, 0.5, 0.25, 0);
      gl.clear(WebGLRenderingContext.COLOR_BUFFER_BIT);
      const canvas = document.createElement('canvas');
      canvas.width = edgeSize;
      canvas.height = edgeSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(edgeSize, edgeSize);
        const bufferData = new Uint8Array(imageData.data.buffer);
        gl.readPixels(
          0,
          0,
          edgeSize,
          edgeSize,
          WebGLRenderingContext.RGBA,
          WebGLRenderingContext.UNSIGNED_BYTE,
          bufferData
        );
        let data = [255, 128, 64, 0];
        for (let i = 0; i < 4; i++) {
          const checked = data[i] - imageData.data[16416 + i];
          if (Math.abs(checked) > 3) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  }
}
