import { BaseRenderer } from '@atmospherics-viz/core';
import { CanvasLayer } from './plugins';
import { commonVertexShader, particlesVertexShader, particlesFragmentShader } from './shaders';
import { dispatchError } from '@atmospherics-viz/utils';

export const GLParticlesLayer = CanvasLayer.extend({
  _canvas: null,
  glo: new BaseRenderer(),
  failed: false,
  ratioScale: 1,
  needUpdateParams: false,
  alpha: 0,
  needClear: true,
  bcastRedrawLayersId: -1,
  isOk() {
    return 0 === this.errorCount && null !== this.glo.gl();
  },
  reinitParticleType(layerType: string) {
    switch (layerType) {
      case 'wind':
        this.prepareAlphaLUT(0.2, 0.9, 0.3, 0.8);
        break;
      case 'waves':
        this.prepareAlphaLUT(0.7, 1.2, 0.3, 1.4);
        break;
      case 'currents':
        this.prepareAlphaLUT(0.2, 1.2, 0.3, 1.4);
        break;
    }
    this.particlesIdentLast = layerType;
  },
  createGlStuff(canvas: HTMLCanvasElement) {
    this.resetGlStuff();
    this.errorCount = 0;
    this.glo.create(
      canvas,
      {
        antialias: !1,
        stencil: !1,
        alpha: !0,
        premultipliedAlpha: !0,
        preserveDrawingBuffer: !1,
      },
      'GlParticlesContext'
    )
      ? this.initParamsAndShaders()
      : ++this.errorCount;
  },
  resetGlStuff() {
    (this.vertexBuffer = null),
      (this.indexBuffer = null),
      (this.lastClientWidth = 0),
      (this.lastClientHeight = 0),
      (this.backTexture = null),
      (this.backTextureWidth = 0),
      (this.backTextureHeight = 0),
      (this.textureState0 = null),
      (this.textureState1 = null),
      (this.stateRandBlocks = null);
  },
  initParamsAndShaders() {
    var t = this.glo;
    (this.stateBlocksCount = 16),
      (this.blockTimeSegmentSize = 8),
      (this.totalTimeFrames = this.stateBlocksCount * this.blockTimeSegmentSize),
      (this.stateResX = 256),
      (this.stateResY = 256),
      (this.lastTimeS = 0),
      (this.frames60timer = 0),
      (this.frames60 = 0),
      (this.frameCounter = 0),
      (this.frameCounter60 = 0),
      (this.blockTimeSegment = 0),
      (this.framebuffer = t.createFramebuffer()),
      (this.shWindParticleDraw = this.compileShader(
        particlesVertexShader,
        particlesFragmentShader,
        [],
        'WindParticleDraw'
      )),
      (this.shWaveParticleDraw = this.compileShader(
        particlesVertexShader,
        particlesFragmentShader,
        ['WAVES'],
        'WaveParticleDraw'
      )),
      (this.shScreen = this.compileShader(
        commonVertexShader,
        'precision mediump float;\n#define GLSLIFY 1\nuniform vec4 uPars0;varying vec4 vTc0;void main(void){gl_FragColor=uPars0;}',
        [],
        'Screen'
      )),
      (this.shCopy = this.compileShader(
        commonVertexShader,
        'precision mediump float;\n#define GLSLIFY 1\nuniform vec4 uPars0;uniform vec4 uPars1;uniform sampler2D sTex0;varying vec4 vTc0;void main(void){gl_FragColor=texture2D(sTex0,vTc0.xy)*uPars0+uPars1;}',
        [],
        'Copy'
      )),
      (this.shParticleUpdate = this.compileShader(
        commonVertexShader,
        'precision highp float;precision highp sampler2D;\n#define GLSLIFY 1\nuniform vec4 uPars0;uniform vec4 uPars1;uniform sampler2D sState;uniform sampler2D sWind;varying vec4 vTc0;const float treshold=0.025;const float prec=1000.0;bool particleValid(vec2 deltaPos){float rCheck=step(treshold,abs(deltaPos.r*prec));float gCheck=step(treshold,abs(deltaPos.g*prec));return(rCheck+gCheck)>0.0;}void main(void){vec4 tex0=texture2D(sState,vTc0.xy);vec2 pos=tex0.ba+tex0.rg/255.5;vec2 tc=fract(pos)*uPars0.xy+uPars0.zw;vec2 dpos=texture2D(sWind,tc).ra*uPars1.xy+uPars1.zw;if(!particleValid(dpos)){gl_FragColor=vec4(0.0);return;}pos=fract(pos+dpos);gl_FragColor.rg=fract(pos*255.0+0.25/255.0);gl_FragColor.ba=pos-gl_FragColor.rg/255.0;}',
        [],
        'ParticleUpdate'
      )),
      (this.vertexBufferRect = t.createBuffer(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]))),
      this.initParticleDataStructures(this.stateResX, this.stateResY),
      (this.windTexture = null);
  },
  // @ts-ignore
  compileShader(t, e, a, i) {
    var r;
    try {
      r = this.glo.createProgramObj(t, e, a, i);
    } catch (t) {
      dispatchError('GlParticles', 'Unable to create programObj', t), ++this.errorCount, (r = null);
    }
    return r;
  },
  checkSizesAndReinit() {
    var t = this.glo;
    if (t && !t.isInvalid()) {
      var e = t.gl(),
        a = t.getCanvas();
      if (this.lastClientWidth !== a.width || this.lastClientHeight !== a.height) {
        (this.lastClientWidth = a.width), (this.lastClientHeight = a.height);
        var i = Math.min(e.getParameter(WebGLRenderingContext.MAX_TEXTURE_SIZE), 2048),
          s = this.ratioScale > 1.5 ? 0.8 : 1,
          h = Math.min(BaseRenderer.getNextPowerOf2Size(s * this.lastClientWidth), i),
          n = Math.min(BaseRenderer.getNextPowerOf2Size(s * this.lastClientHeight), i);
        if (this.backTextureWidth !== h || this.backTextureHeight !== n) {
          (this.backTextureWidth = h), (this.backTextureHeight = n);
          var l = new Uint8Array(this.backTextureWidth * this.backTextureHeight * 4);
          this.backTexture = t.createTexture2D(
            WebGLRenderingContext.LINEAR,
            WebGLRenderingContext.LINEAR,
            WebGLRenderingContext.REPEAT,
            l,
            this.backTextureWidth,
            this.backTextureHeight
          );
        }
      }
    }
  },
  // @ts-ignore
  prepareAlphaLUT(t, e, a, i) {
    this.alphaLut = new Float32Array(this.totalTimeFrames);
    var s,
      r,
      h = Math.round(t * this.totalTimeFrames),
      n = Math.round(a * this.totalTimeFrames);
    for (s = 0; s < this.totalTimeFrames; s++)
      (r = 1),
        s < h
          ? (r = Math.pow((1 * s) / h, e))
          : s >= this.totalTimeFrames - n &&
            (r = Math.pow((1 * (this.totalTimeFrames - s)) / n, i)),
        (this.alphaLut[s] = r);
  },
  // @ts-ignore
  initParticleDataStructures(t, e) {
    var a,
      i,
      s,
      r,
      h,
      n = this.glo;
    (this.particlesCount = t * e),
      (this.vertsPerParticle = 4),
      (this.vertexStride = 4),
      (this.stateBlock = 0),
      (this.stateBlockDY = e / this.stateBlocksCount);
    var l = new Uint8Array(4 * this.particlesCount);
    for (a = 0; a < l.length; a++) l[a] = Math.floor(256 * Math.random());
    (this.textureState0 = n.createTexture2D(
      WebGLRenderingContext.NEAREST,
      WebGLRenderingContext.NEAREST,
      WebGLRenderingContext.REPEAT,
      l,
      t,
      e
    )),
      (this.textureState1 = n.createTexture2D(
        WebGLRenderingContext.NEAREST,
        WebGLRenderingContext.NEAREST,
        WebGLRenderingContext.REPEAT,
        l,
        t,
        e
      ));
    var o = t * this.stateBlockDY * this.vertsPerParticle * this.vertexStride,
      u = new Uint8Array(o),
      c = [0, 0, 255, 0, 255, 255, 0, 255];
    for (h = 0, a = 0; a < t; a++)
      for (i = 0; i < this.stateBlockDY; i++)
        for (s = 0; s < this.vertsPerParticle; s++)
          (u[h++] = a), (u[h++] = i), (u[h++] = c[2 * s]), (u[h++] = c[2 * s + 1]);
    this.vertexBuffer = n.createBuffer(u);
    var m = [0, 1, 2, 0, 2, 3];
    (this.indsPerParticle = m.length),
      (this.particlesPerBlock = t * this.stateBlockDY),
      (this.indexCount = this.particlesPerBlock * this.indsPerParticle);
    var d = new Uint16Array(this.indexCount);
    for (i = 0, r = 0, a = 0; a < this.indexCount; a++)
      (d[a] = r + m[i]), ++i >= m.length && ((i = 0), (r += this.vertsPerParticle));
    this.indexBuffer = n.createIndexBuffer(d);
  },
  // @ts-ignore
  reinitStateBlock(t) {
    for (
      var e = this.glo,
        a = e.gl(),
        i = this.stateBlockDY * t,
        s = this.stateResX * this.stateBlockDY * 4,
        r = new Uint8Array(s),
        h = 0;
      h < s;
      h++
    )
      r[h] = Math.floor(256 * Math.random());
    e.bindTexture2D(this.textureState0),
      a.texSubImage2D(
        WebGLRenderingContext.TEXTURE_2D,
        0,
        0,
        i,
        this.stateResX,
        this.stateBlockDY,
        WebGLRenderingContext.RGBA,
        WebGLRenderingContext.UNSIGNED_BYTE,
        r
      ),
      e.bindTexture2D(this.textureState1),
      a.texSubImage2D(
        WebGLRenderingContext.TEXTURE_2D,
        0,
        0,
        i,
        this.stateResX,
        this.stateBlockDY,
        WebGLRenderingContext.RGBA,
        WebGLRenderingContext.UNSIGNED_BYTE,
        r
      );
  },
  // @ts-ignore
  setGlobalAlpha(t) {
    this.alpha = t;
  },
  fadeOut() {
    var t = this.glo,
      e = t.get(),
      a = this.shScreen;
    e.useProgram(a.program),
      t.bindAttribute(this.vertexBufferRect, a.aPos, 2, WebGLRenderingContext.FLOAT, !1, 8, 0),
      e.uniform4f(a.uVPars0, 1, 1, 0, 0),
      e.enable(WebGLRenderingContext.BLEND);
    var i = this.fadeScale;
    e.blendColor(i, i, i, i),
      e.blendEquation(WebGLRenderingContext.FUNC_ADD),
      e.blendFunc(WebGLRenderingContext.ZERO, WebGLRenderingContext.CONSTANT_ALPHA),
      e.drawArrays(WebGLRenderingContext.TRIANGLE_FAN, 0, 4),
      e.disable(WebGLRenderingContext.BLEND);
  },
  drawParticles() {
    var t = this.glo,
      e = t.get(),
      a = this.mapParams.partObj,
      i =
        'waves' === this.mapParams.particlesIdent
          ? this.shWaveParticleDraw
          : this.shWindParticleDraw;
    e.useProgram(i.program),
      t.bindAttribute(
        this.vertexBuffer,
        i.aVecA,
        4,
        WebGLRenderingContext.UNSIGNED_BYTE,
        !1,
        this.vertexStride,
        0
      ),
      t.bindTexture2D(this.textureState0, 0, i.sState0),
      t.bindTexture2D(this.textureState1, 1, i.sState1);
    var s = this.transformParams.widthFactor + 1,
      r = s / this.lastClientWidth,
      h = s / this.lastClientHeight,
      n = a.glParticleLengthEx / this.lastClientWidth,
      l = a.glParticleLengthEx / this.lastClientHeight;
    e.uniform4f(i.uVPars1, (2 * r) / 255, (2 * h) / 255, -r, -h),
      e.uniform4f(i.uVPars2, (2 * n) / 255, (2 * l) / 255, -n, -l);
    var o = Math.max(1, 0.8 * this.transformParams.widthFactor);
    e.uniform4f(i.uVPars3, 0, 0, (2 * o) / 255, -o),
      e.uniform4f(i.uPars1, o, 0, 0, 0),
      e.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, this.indexBuffer),
      e.enable(WebGLRenderingContext.BLEND),
      e.blendEquation(WebGLRenderingContext.FUNC_ADD),
      e.blendFunc(WebGLRenderingContext.ONE_MINUS_DST_ALPHA, WebGLRenderingContext.ONE);
    for (
      var u =
          Math.max(
            1,
            Math.min(
              Math.round(this.transformParams.relativeAmount * this.particlesPerBlock),
              this.particlesPerBlock
            )
          ) * this.indsPerParticle,
        c = 1 / this.stateBlocksCount,
        m = this.timeFrame0,
        d = 0;
      d < this.stateBlocksCount;
      d++
    ) {
      e.uniform4f(i.uVPars0, 1 / this.stateResX, 1 / this.stateResY, 0, d * c);
      var f = this.alphaLut[m];
      e.uniform4f(i.uPars0, f, f, f, f),
        e.drawElements(WebGLRenderingContext.TRIANGLES, u, WebGLRenderingContext.UNSIGNED_SHORT, 0),
        (m -= this.blockTimeSegmentSize) < 0 && (m += this.totalTimeFrames);
    }
    e.disable(WebGLRenderingContext.BLEND);
  },
  copyToCanvas() {
    var t = this.glo,
      e = t.get();
    t.bindFramebuffer(null),
      e.viewport(0, 0, t.getCanvas().width, t.getCanvas().height),
      e.enable(WebGLRenderingContext.BLEND),
      e.blendEquation(WebGLRenderingContext.FUNC_ADD),
      e.blendFunc(WebGLRenderingContext.ONE, WebGLRenderingContext.ONE);
    var a,
      i = this.shCopy;
    if (
      (e.useProgram(i.program),
      t.bindAttribute(this.vertexBufferRect, i.aPos, 2, WebGLRenderingContext.FLOAT, !1, 8, 0),
      t.bindTexture2D(this.backTexture, 0, i.sTex0),
      e.uniform4f(i.uVPars0, 1, 1, 0, 0),
      e.uniform4f(i.uVPars1, 1, 1, 0, 0),
      this.mapParams.zoom >= 12)
    )
      a = [0.5, 0, 0.4, this.transformParams.mulAZoomed];
    else {
      var s = 0.4 * this.transformParams.mulRGB;
      a = [s, s, s, 0.4 * this.transformParams.mulA];
    }
    for (var r = 0; r < 4; r++) a[r] *= this.alpha;
    e.uniform4fv(i.uPars0, a);
    var h = -0.1;
    e.uniform4fv(i.uPars1, [h, h, h, h]),
      e.drawArrays(WebGLRenderingContext.TRIANGLE_FAN, 0, 4),
      e.disable(WebGLRenderingContext.BLEND);
  },
  // @ts-ignore
  updateParticles(t) {
    var e = this.glo,
      a = e.get();
    e.bindFramebuffer(this.framebuffer, this.textureState1),
      a.viewport(0, 0, this.stateResX, this.stateResY);
    var i = this.shParticleUpdate;
    a.useProgram(i.program),
      e.bindAttribute(this.vertexBufferRect, i.aPos, 2, WebGLRenderingContext.FLOAT, !1, 8, 0),
      e.bindTexture2D(this.textureState0, 0, i.sState),
      e.bindTexture2D(this.windTexture, 3, i.sWind);
    var s = Math.min(Math.floor(256 * this.transformParams.relativeAmount + 1), 256) / 256;
    a.uniform4f(i.uVPars0, s, 1, s - 1, 0),
      a.uniform4f(i.uVPars1, s, 1, 0, 0),
      a.uniform4f(
        i.uPars0,
        this.windTextureMulX,
        -this.windTextureMulY,
        this.windTextureAddX,
        this.windTextureMulY + this.windTextureAddY
      );
    var r = this.frameTime * this.transformParams.timeScale,
      h = r / this.lastClientWidth,
      n = r / this.lastClientHeight;
    a.uniform4f(i.uPars1, 2 * h, 2 * n, -h, -n),
      a.drawArrays(WebGLRenderingContext.TRIANGLE_FAN, 0, 4),
      e.bindFramebuffer(null),
      t >= 0 && this.reinitStateBlock(t);
    var l = this.textureState0;
    (this.textureState0 = this.textureState1), (this.textureState1 = l);
  },
  updateFrame() {
    if ((this.frameCounter60++, this.frameCounter60 % 2 == 0)) {
      var t = this.glo,
        e = t.get(),
        a = 0.001 * Date.now();
      if (
        ((this.frameTime = Math.min(a - this.lastTimeS, 0.1)),
        (this.lastTimeS = a),
        (this.frames60timer += this.frameTime),
        (this.frames60 = Math.max(1, Math.round(60 * this.frames60timer))),
        (this.frames60timer -= 0.0166667 * this.frames60),
        this.windTexture && this.transformParams)
      ) {
        var i = -1;
        (this.timeFrame0 = this.stateBlock * this.blockTimeSegmentSize),
          (this.blockTimeSegment += this.frames60),
          this.blockTimeSegment >= this.blockTimeSegmentSize &&
            ((this.blockTimeSegment -= this.blockTimeSegmentSize),
            (i = this.stateBlock),
            ++this.stateBlock >= this.stateBlocksCount && (this.stateBlock = 0)),
          (this.timeFrame0 = (this.stateBlock - 1) * this.blockTimeSegmentSize),
          (this.timeFrame0 += this.blockTimeSegment),
          this.timeFrame0 < 0 && (this.timeFrame0 += this.totalTimeFrames),
          this.needUpdateParams && (this.updateParamsFromConfig(), (this.needUpdateParams = !1)),
          (this.relParticleShiftX = this.shiftX / this.lastClientWidth),
          (this.relParticleShiftY = this.shiftY / this.lastClientHeight),
          t.bindFramebuffer(this.framebuffer, this.backTexture),
          e.viewport(0, 0, this.backTextureWidth, this.backTextureHeight),
          this.needClear &&
            (e.clearColor(0, 0, 0, 0),
            e.clear(WebGLRenderingContext.COLOR_BUFFER_BIT),
            (this.needClear = !1),
            this.animationStopped && this.copyToCanvas()),
          this.animationStopped ||
            (this.drawParticles(),
            this.fadeOut(),
            this.copyToCanvas(),
            this.updateParticles(i),
            this.alpha < 1 &&
              ((this.alpha += 1.8 * this.frameTime), this.alpha > 1 && (this.alpha = 1)),
            this.frameCounter++,
            this.showCanvas(!0));
      }
    }
  },
  // @ts-ignore
  setNewWindData(t) {
    this.reset(), (this.transformParams = t.transformParams), (this.mapParams = t.mapParams);
    var e = this.glo,
      a = e.get(),
      i = WebGLRenderingContext.LUMINANCE_ALPHA;
    if (
      ((this.windTextureResX = t.sizeX),
      (this.windTextureResY = t.sizeY),
      this.windTexture
        ? (e.bindTexture2D(this.windTexture),
          a.texImage2D(
            WebGLRenderingContext.TEXTURE_2D,
            0,
            i,
            this.windTextureResX,
            this.windTextureResY,
            0,
            i,
            WebGLRenderingContext.UNSIGNED_BYTE,
            null
          ))
        : (this.windTexture = e.createTexture2D(
            WebGLRenderingContext.LINEAR,
            WebGLRenderingContext.LINEAR,
            WebGLRenderingContext.CLAMP_TO_EDGE,
            null,
            this.windTextureResX,
            this.windTextureResY,
            i
          )),
      t.textureTiles)
    ) {
      var s = t.textureTiles,
        r = t.textureTilesPos,
        h = s.length;
      e.bindTexture2D(this.windTexture);
      for (var n = 0; n < h; n++) {
        var l = s[n],
          o = r[n];
        a.texSubImage2D(
          WebGLRenderingContext.TEXTURE_2D,
          0,
          o.x,
          o.y,
          l.tileSize,
          l.tileSize,
          i,
          WebGLRenderingContext.UNSIGNED_BYTE,
          l.data
        );
      }
    }
    this.newWindData = null;
    var u = this.transformParams;
    (this.windTextureMulX = (1 * u.relativeDX * u.width) / (u.tilesDX * u.trans)),
      (this.windTextureMulY = (1 * u.relativeDY * u.height) / (u.tilesDY * u.trans)),
      (this.windTextureAddX =
        u.offsetX / (this.windTextureResX * u.trans) + 0.48 / this.windTextureResX),
      (this.windTextureAddY =
        u.offsetY / (this.windTextureResY * u.trans) + 0.48 / this.windTextureResY),
      (this.needUpdateParams = !0);
  },
  updateParamsFromConfig() {
    var t = this.transformParams,
      a = this.mapParams,
      i = {
        multiplier: 1,
        velocity: 1,
        width: 1,
        blending: 1,
        opacity: 1,
      };
    if (t && a) {
      var s,
        r,
        h,
        n = a.partObj;
      a.particlesIdent !== this.particlesIdentLast && this.reinitParticleType(a.particlesIdent),
        n.configurable
          ? ((s = i.velocity || 1), (r = i.opacity || 1), (h = i.blending || 1))
          : ((s = n.glVelocity), (r = n.glOpacity), (h = n.glBlending));
      var l = n.getAmount.call(n, a),
        o = n.getAmountMultiplier.call(n);
      (t.relativeAmount = l / 65536),
        o < 1 && (t.relativeAmount *= 1 + 7 * (1 - o)),
        (t.relativeAmount *= n.glCountMul),
        (t.widthFactor = Math.max(
          1,
          n.getLineWidth.call(n, a) * n.glParticleWidth * this.ratioScale
        )),
        (t.timeScale = s * n.glSpeedPx * t.zoomWindFactor * this.ratioScale),
        (t.mulRGB = 0.7 * r + 0.4),
        (t.mulA = r),
        (t.mulAZoomed = 0.44 * r + 0.3),
        t.mulA > 1 && (t.mulA = 2 - t.mulA),
        (t.mulA += 0.1);
      var u = h - 0.92;
      this.fadeScale = Math.min(0.9 + 0.5 * u, 0.98);
    }
  },
  onInit() {
    this.errorCount = 0;
  },
  // @ts-ignore
  onCreateCanvas(t) {
    // this.bcastRedrawLayersId = o.on(
    //   'redrawLayers',
    //   function () {
    //     this.needUpdateParams = !0;
    //   }.bind(this)
    // );
    try {
      this.createGlStuff(this.getCanvas()), this.checkSizesAndReinit();
    } catch (t) {
      dispatchError('GlParticles', 'unspecified error in createGlStuff', t), ++this.errorCount;
    }
    return this.isOk();
  },
  onCanvasFailed() {
    this.glo.release();
  },
  onRemoveCanvas() {
    this.glo.release(), this.resetGlStuff();
    if (this.bcastRedrawLayersId !== -1) {
      // o.off(this.bcastRedrawLayersId);
      this.bcastRedrawLayersId = -1;
    }
  },
  // @ts-ignore
  onResizeCanvas(t, e) {
    var a = Math.min(window.devicePixelRatio || 1, 2),
      s = this.getCanvas();
    (t > 1200 || e > 1200) && (a = Math.min(a, 1.5)),
      (this.ratioScale = a),
      (s.width = t * a),
      (s.height = e * a),
      (s.style.width = t + 'px'),
      (s.style.height = e + 'px'),
      this.checkSizesAndReinit();
  },
  onReset() {
    (this.alpha = 0), (this.needClear = !0), this.showCanvas(!1);
  },
});
