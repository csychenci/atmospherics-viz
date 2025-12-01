import { isUOrSPrefix, startsWithLetterA } from '@atmospherics-viz/utils';

const WebGLRenderingContextError = new Map([
  [WebGLRenderingContext.NO_ERROR, 'NO_ERROR'],
  [WebGLRenderingContext.INVALID_ENUM, 'INVALID_ENUM'],
  [WebGLRenderingContext.INVALID_VALUE, 'INVALID_VALUE'],
  [WebGLRenderingContext.INVALID_OPERATION, 'INVALID_OPERATION'],
  [WebGLRenderingContext.INVALID_FRAMEBUFFER_OPERATION, 'INVALID_FRAMEBUFFER_OPERATION'],
  [WebGLRenderingContext.OUT_OF_MEMORY, 'OUT_OF_MEMORY'],
  [WebGLRenderingContext.CONTEXT_LOST_WEBGL, 'CONTEXT_LOST_WEBGL'],
]);

export class BaseRenderer {
  keepRefs: boolean;
  keepRefsShaders: boolean;
  glId: number = 0;
  maxTextureSize: number = 0;
  isGlError: boolean = false;
  lastGlErrorMsg: string = '';
  id: number;
  framebuffers: WebGLFramebuffer[] = [];
  buffers: WebGLBuffer[] = [];
  shaders: WebGLShader[] = [];
  programs: WebGLProgram[] = [];
  textures: WebGLTexture[] = [];
  _gl: WebGLRenderingContext | null = null;
  canvas: HTMLCanvasElement | null = null;
  _name: string = '';

  static newId: number = 0;
  static newGlId: number = 1;

  static getNextPowerOf2Size(size: number) {
    return 2 << Math.floor(Math.log2(size - 1));
  }

  static removeFromArray<T>(elementToRemove: T, targetArray: T[]): number {
    let foundIndex = -1;
    for (let i = 0; i < targetArray.length; i++) {
      if (targetArray[i] === elementToRemove) {
        foundIndex = i;
      }
    }
    if (foundIndex > -1) {
      targetArray.splice(foundIndex, 1);
    }
    return foundIndex;
  }

  constructor(keepRefs: boolean = false, keepRefsShaders: boolean = false) {
    this.keepRefs = keepRefs;
    this.keepRefsShaders = keepRefsShaders;
    this.id = BaseRenderer.newId++;
    this.reset();
  }

  reset() {
    this.framebuffers = [];
    this.buffers = [];
    this.shaders = [];
    this.programs = [];
    this.textures = [];
    this._gl = null;
    this.glId = 0;
    this.canvas = null;
  }

  isInvalid() {
    return !(this._gl && this.canvas);
  }
  gl() {
    return this._gl;
  }
  get() {
    return this.gl();
  }
  getCanvas() {
    return this.canvas;
  }

  release() {
    // const gl = this.gl();
    // if (gl) {
    //   gl.flush();
    //   gl.finish();
    //   let texture: WebGLTexture | null = null,
    //     program: WebGLProgram | null = null,
    //     textureLength = this.textures.length;

    //   for (t = 0; t < textureLength; t++)
    //     (n = this.textures[t]), e.isTexture(n) && e.deleteTexture(n);
    //   for (r = this.programs.length, t = 0; t < r; t++)
    //     (n = this.programs[t]), e.isProgram(n) && e.deleteProgram(n);
    //   for (r = this.shaders.length, t = 0; t < r; t++)
    //     (n = this.shaders[t]), e.isShader(n) && e.deleteShader(n);
    //   for (r = this.buffers.length, t = 0; t < r; t++)
    //     (n = this.buffers[t]), e.isBuffer(n) && e.deleteBuffer(n);
    //   for (r = this.framebuffers.length, t = 0; t < r; t++)
    //     (n = this.framebuffers[t]), e.isFramebuffer(n) && e.deleteFramebuffer(n);
    //   this.reset();
    // }
    var e = this._gl;
    if (e) {
      e.flush(), e.finish();
      var t,
        n,
        r = this.textures.length;
      for (t = 0; t < r; t++) (n = this.textures[t]), e.isTexture(n) && e.deleteTexture(n);
      for (r = this.programs.length, t = 0; t < r; t++)
        (n = this.programs[t]), e.isProgram(n) && e.deleteProgram(n);
      for (r = this.shaders.length, t = 0; t < r; t++)
        (n = this.shaders[t]), e.isShader(n) && e.deleteShader(n);
      for (r = this.buffers.length, t = 0; t < r; t++)
        (n = this.buffers[t]), e.isBuffer(n) && e.deleteBuffer(n);
      for (r = this.framebuffers.length, t = 0; t < r; t++)
        (n = this.framebuffers[t]), e.isFramebuffer(n) && e.deleteFramebuffer(n);
      this.reset();
    }
  }

  checkGlError() {
    var e = !0,
      t = 'GL CONTEXT STATUS: ';
    if (this._gl) {
      var isContextLost = this._gl.isContextLost(),
        error = this._gl.getError();
      if (isContextLost) t += 'GL CONTEXT LOST!';
      else if (error === WebGLRenderingContext.NO_ERROR) (t += 'no error.'), (e = !1);
      else {
        var i = WebGLRenderingContextError.get(
          error as 0 | 1280 | 1281 | 1282 | 1286 | 1285 | 37442
        );
        t += ''
          .concat(i || 'UNKNOWN_ERROR', ' (code: ')
          .concat(error.toString(), ')!; contextLost: ')
          .concat(`${isContextLost}`);
      }
    } else t += 'gl is null!';
    return (this.isGlError = e), (this.lastGlErrorMsg = t), e;
  }

  getGlStatus() {
    return this.checkGlError(), this.lastGlErrorMsg;
  }

  createShader(glsl: string, isVertexShader: boolean, meteoType: string) {
    const gl = this.gl();
    if (!gl) return null;
    const shader = gl.createShader(isVertexShader ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    if (shader) {
      if (this.keepRefsShaders) {
        this.shaders.push(shader);
      }
      gl.shaderSource(shader, glsl);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = new Error(gl.getShaderInfoLog(shader) || 'getShaderInfoLog is null');
        // @ts-ignore
        error.contextLost = gl.isContextLost();
        // @ts-ignore
        error.isVertexShader = isVertexShader;
        error.name = meteoType;
        // @ts-ignore
        error.full =
          'ERROR compileShader! name: '.concat(error.name, '; ') +
          '('.concat(isVertexShader ? 'VS' : 'FS', '); ') +
          '('.concat(this.getGlStatus(), '); msg: ').concat(error.message);
        throw error;
      }
      return shader;
    }
  }

  createProgramObj(
    vertexSource: string,
    fragmentSource: string,
    types: string[],
    meteoType: 'shMulti' | 'shClouds' | 'shRain' | 'shCloudtop' | 'shCbase' | 'shPtype' | 'shCCL'
  ) {
    const gl = this.gl();
    if (!gl) return null;
    const program = gl.createProgram(),
      cache: Record<string, number | WebGLProgram | WebGLUniformLocation> & {
        program: WebGLProgram;
      } = {
        program,
      };
    let predefined = '';
    if (!program) {
      throw new Error(
        'gl.createProgram() is null; name: '.concat(meteoType, ';').concat(this.getGlStatus())
      );
    }

    if (this.keepRefs) {
      this.programs.push(program);
    }

    if (types && types.length > 0) {
      for (let i = 0; i < types.length; i++) {
        predefined += '#define ' + types[i] + '\n';
      }
    }

    const vertexShader = this.createShader(predefined + vertexSource, true, meteoType),
      fragmentShader = this.createShader(predefined + fragmentSource, false, meteoType);
    if (!vertexShader || !fragmentShader) {
      throw new Error('vertexShader or fragmentShader is null; name: '.concat(meteoType, ';'));
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = new Error(gl.getProgramInfoLog(program) || 'getProgramInfoLog is null');
      // @ts-ignore
      error.contextLost = gl.isContextLost();
      error.name = meteoType;
      // @ts-ignore
      error.full =
        'ERROR linkProgram! name: '.concat(error.name, '; ') +
        '('.concat(this.getGlStatus(), '); msg: ').concat(error.message);
      throw error;
    }

    const activeAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < activeAttributes; i++) {
      const attribute = gl.getActiveAttrib(program, i);
      if (attribute) {
        const attr_name = attribute?.name;
        if (!startsWithLetterA(attr_name)) {
          throw 'Invalid attribute name "'.concat(attr_name, '"');
        }
        cache[attr_name] = gl.getAttribLocation(program, attribute?.name);
      }
    }

    const activeUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < activeUniforms; i++) {
      const uniform = gl.getActiveUniform(program, i);
      if (uniform) {
        let uniformName = uniform.name;
        const arrayBracketIndex = uniformName.indexOf('[');

        if (arrayBracketIndex > 0) {
          uniformName = uniformName.substring(0, arrayBracketIndex);
        }

        // 验证uniform名称有效性
        if (!isUOrSPrefix(uniformName)) {
          throw new Error(`Invalid uniform name "${uniformName}"`);
        }

        cache[uniformName] = gl.getUniformLocation(program, uniform.name) as WebGLUniformLocation;
      }
    }

    return cache;
  }

  bindAttribute(
    buffer: WebGLBuffer,
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number
  ) {
    const gl = this.gl();
    if (gl) {
      gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    }
  }

  textureFromUrlPromise(
    texType: 'texCCL' | 'texPType1' | 'texPType2',
    imageUrl: string,
    minFilter: number,
    magFilter: number,
    wrapMode: number,
    isGenerateMipmap: boolean
  ): Promise<['texCCL' | 'texPType1' | 'texPType2', WebGLTexture | null]> {
    return new Promise(resolve => {
      const image = new Image(),
        texture2D = this.createTexture2D(
          minFilter,
          magFilter,
          wrapMode,
          null,
          1,
          1,
          WebGLRenderingContext.RGBA
        );

      image.onload = () => {
        this.resizeTexture2D(
          texture2D,
          image,
          image.width,
          image.height,
          WebGLRenderingContext.RGBA,
          isGenerateMipmap
        );
        resolve([texType, texture2D]);
      };
      image.crossOrigin = '';
      image.src = imageUrl;
    });
  }

  createTexture2D(
    minFilter: number,
    magFilter: number,
    wrapModeS: number,
    unit8array: Uint8Array | null,
    width: number,
    height: number,
    colorFormat: number = WebGLRenderingContext.RGBA,
    isGenerateMipmap: boolean = false
  ) {
    const gl = this.gl();
    if (gl) {
      const texture = gl.createTexture();
      if (texture) {
        if (this.keepRefs) {
          this.textures.push(texture);
        }
        // @ts-ignore
        texture._width = width;
        // @ts-ignore
        texture._height = height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.setBindedTexture2DParams(minFilter, magFilter, wrapModeS);
      }
      return this.resizeTexture2D(
        texture,
        unit8array,
        width,
        height,
        colorFormat,
        isGenerateMipmap
      );
    }
    return null;
  }

  resizeTexture2D(
    texture: WebGLTexture | null,
    unit8array: TexImageSource | ArrayBuffer | ArrayBufferView | Uint8Array | null,
    width: number,
    height: number,
    colorFormat: number,
    isGenerateMipmap: boolean = false
  ) {
    if (!texture) return texture;
    let _isGenerateMipmap = isGenerateMipmap;
    const gl = this.gl(),
      _colorFormat = colorFormat || WebGLRenderingContext.RGBA;
    // @ts-ignore
    texture._width = width;
    // @ts-ignore
    texture._height = height;
    // @ts-ignore
    texture._format = _colorFormat;
    if (gl) {
      gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texture);
      if (Array.isArray(unit8array)) {
        let currentWidth = width,
          currentHeight = height;
        gl.pixelStorei(WebGLRenderingContext.UNPACK_ALIGNMENT, currentWidth > 4 ? 4 : 1);

        for (let mipLevel = 0; mipLevel < unit8array.length; mipLevel++) {
          if (currentWidth === 4) {
            gl.pixelStorei(WebGLRenderingContext.UNPACK_ALIGNMENT, 1);
          }
          const levelData = unit8array[mipLevel];
          if (levelData === null || ArrayBuffer.isView(levelData)) {
            gl.texImage2D(
              WebGLRenderingContext.TEXTURE_2D,
              mipLevel,
              _colorFormat,
              currentWidth,
              currentHeight,
              0,
              _colorFormat,
              WebGLRenderingContext.UNSIGNED_BYTE,
              levelData
            );
          } else {
            gl.texImage2D(
              WebGLRenderingContext.TEXTURE_2D,
              mipLevel,
              _colorFormat,
              _colorFormat,
              WebGLRenderingContext.UNSIGNED_BYTE,
              levelData
            );
          }
          currentWidth = Math.max(currentWidth >> 1, 1);
          currentHeight = Math.max(currentHeight >> 1, 1);
        }
        _isGenerateMipmap = false;
      } else {
        if (unit8array === null || ArrayBuffer.isView(unit8array)) {
          gl.texImage2D(
            WebGLRenderingContext.TEXTURE_2D,
            0,
            _colorFormat,
            width,
            height,
            0,
            _colorFormat,
            WebGLRenderingContext.UNSIGNED_BYTE,
            unit8array
          );
        } else {
          gl.texImage2D(
            WebGLRenderingContext.TEXTURE_2D,
            0,
            _colorFormat,
            _colorFormat,
            WebGLRenderingContext.UNSIGNED_BYTE,
            unit8array as TexImageSource
          );
        }
        if (_isGenerateMipmap) {
          gl.generateMipmap(WebGLRenderingContext.TEXTURE_2D);
        }
        gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, null);
      }
    }

    return texture;
  }

  bindTexture2D(texture: WebGLTexture | null, unit?: number, location?: WebGLUniformLocation) {
    const gl = this.gl();
    if (gl) {
      gl.activeTexture(WebGLRenderingContext.TEXTURE0 + (unit || 0));
      gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texture);
      if (location) {
        gl.uniform1i(location, unit!);
      }
    }
  }

  setBindedTexture2DParams(
    minFilter: number,
    magFilter: number,
    wrapModeS: number,
    wrapModeT?: number
  ) {
    const gl = this.gl();
    if (gl) {
      gl.texParameteri(
        WebGLRenderingContext.TEXTURE_2D,
        WebGLRenderingContext.TEXTURE_MIN_FILTER,
        minFilter
      );
      gl.texParameteri(
        WebGLRenderingContext.TEXTURE_2D,
        WebGLRenderingContext.TEXTURE_MAG_FILTER,
        magFilter
      );
      gl.texParameteri(
        WebGLRenderingContext.TEXTURE_2D,
        WebGLRenderingContext.TEXTURE_WRAP_S,
        wrapModeS
      );
      gl.texParameteri(
        WebGLRenderingContext.TEXTURE_2D,
        WebGLRenderingContext.TEXTURE_WRAP_T,
        wrapModeT || wrapModeS
      );
    }
  }

  createBuffer(bufferData: Float32Array) {
    const gl = this.gl();
    if (gl) {
      const buffer = gl.createBuffer();
      if (this.keepRefs) {
        this.buffers.push(buffer);
      }
      this.setBufferData(buffer, bufferData);
      return buffer;
    }
    return null;
  }

  setBufferData(buffer: WebGLBuffer, bufferData: Float32Array) {
    const gl = this.gl();
    if (gl) {
      gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, buffer);
      gl.bufferData(
        WebGLRenderingContext.ARRAY_BUFFER,
        bufferData,
        WebGLRenderingContext.STATIC_DRAW
      );
    }
  }

  createIndexBuffer(indexData: Uint16Array) {
    const gl = this.gl();
    if (gl) {
      const buffer = gl.createBuffer();
      if (this.keepRefs) {
        this.buffers.push(buffer);
      }
      gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, buffer);
      gl.bufferData(
        WebGLRenderingContext.ELEMENT_ARRAY_BUFFER,
        indexData,
        WebGLRenderingContext.STATIC_DRAW
      );
      return buffer;
    }
    return null;
  }

  createFramebuffer() {
    const gl = this.gl();
    if (gl) {
      const framebuffer = gl.createFramebuffer();
      if (this.keepRefs && framebuffer) {
        this.framebuffers.push(framebuffer);
      }
      return framebuffer;
    }
    return null;
  }

  deleteFramebuffer(framebuffer: WebGLFramebuffer) {
    const gl = this.gl();
    BaseRenderer.removeFromArray(framebuffer, this.framebuffers);
    if (gl) {
      gl.deleteFramebuffer(framebuffer);
    }
  }

  bindFramebuffer(framebuffer: WebGLFramebuffer, texture: WebGLTexture) {
    const gl = this.gl();
    if (gl) {
      gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, framebuffer);
      if (texture) {
        gl.framebufferTexture2D(
          WebGLRenderingContext.FRAMEBUFFER,
          WebGLRenderingContext.COLOR_ATTACHMENT0,
          WebGLRenderingContext.TEXTURE_2D,
          texture,
          0
        );
      }
    }
  }

  checkGl() {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      );
    } catch (error) {
      return false;
    }
  }

  create(
    canvas: HTMLCanvasElement,
    options: WebGLContextAttributes = {},
    name: string = ''
  ): WebGLRenderingContext | null | undefined {
    this._name = name;

    // 检查浏览器是否支持 WebGL
    if (!this.checkGl()) {
      return null;
    }

    // 如果已经初始化过，返回 undefined
    if (this._gl || this.canvas) {
      return undefined;
    }

    // 设置 canvas 引用
    this.canvas = canvas;

    // 尝试获取 WebGL 上下文
    this._gl =
      (canvas.getContext('webgl', options) as WebGLRenderingContext) ||
      (canvas.getContext('experimental-webgl', options) as WebGLRenderingContext);

    // 如果成功获取 WebGL 上下文，初始化相关属性
    if (this._gl) {
      this.glId = BaseRenderer.newGlId++;
      this.maxTextureSize = this._gl.getParameter(WebGLRenderingContext.MAX_TEXTURE_SIZE);
    }

    return this._gl;
  }
}
