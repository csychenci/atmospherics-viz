import { GlParticleRenderer } from '@atmospherics-viz/core';
import { tileLoader } from '@atmospherics-viz/shared';
import { LayerSourceConfig } from '@atmospherics-viz/types';
import { Layer, Map } from 'leaflet';

export class GLWorkspace {
  private particlesLayer: Layer;
  private map: Map;
  private particlesManager: GlParticleRenderer;

  private animationFrameId: number = 0;
  private isSuspended: boolean = false; // 是否被系统暂停
  private isManuallyPaused: boolean = false; // 是否手动暂停
  protected options: LayerSourceConfig;

  constructor(layer: Layer, map: Map, options: LayerSourceConfig) {
    this.particlesLayer = layer;
    this.map = map;
    // @ts-ignore
    this.particlesManager = new GlParticleRenderer(this.map, tileLoader, this.run.bind(this));
    this.options = options;
  }

  /**
   * 启动动画循环
   */
  startAnimationLoop() {
    this.animationFrameId = requestAnimationFrame(this.startAnimationLoop.bind(this));
    // @ts-ignore
    this.particlesLayer.updateFrame();
  }

  /**
   * 停止动画循环
   */
  stopAnimationLoop() {
    cancelAnimationFrame(this.animationFrameId);
  }

  /**
   * 隐藏粒子画布并停止动画
   */
  hideParticleCanvas() {
    // @ts-ignore
    if (this.particlesLayer?._canvas) {
      // @ts-ignore
      this.particlesLayer._canvas.style.opacity = '0';
    }
    // @ts-ignore
    this.particlesLayer.animationStopped = true;
    // @ts-ignore
    this.particlesLayer.needClear = true;
    // @ts-ignore
    this.particlesLayer.updateFrame();
  }

  /**
   * 显示粒子画布
   */
  showParticleCanvas() {
    // @ts-ignore
    this.particlesLayer._canvas.style.opacity = '1';
    // @ts-ignore
    this.particlesLayer.animationStopped = false;
    // @ts-ignore
    this.particlesLayer.needClear = true;
  }

  /**
   * 重新启动动画（条件性）
   */
  restartAnimation() {
    this.stopAnimationLoop();
    this.showParticleCanvas();
    if (!this.isManuallyPaused) {
      this.startAnimationLoop();
    }
  }

  suspend() {
    this.isSuspended = true;
    this.stopAnimationLoop();
    this.hideParticleCanvas();
  }

  enable() {
    this.isSuspended = false;
    this.restartAnimation();
  }

  run() {
    this.restartAnimation();
  }

  stop() {
    this.stopAnimationLoop();
  }

  pause() {
    this.isManuallyPaused = true;
    this.stopAnimationLoop();
  }

  resume() {
    this.isManuallyPaused = false;
    this.restartAnimation();
  }

  paramsChanged(options: Partial<LayerSourceConfig>) {
    this.options = {
      ...this.options,
      ...options,
    };
    this.stop();
    if (!this.map?.hasLayer(this.particlesLayer)) {
      this.particlesLayer.addTo(this.map);
      // @ts-ignore
      this.particlesLayer?.getCanvas().classList.add('particles-layer');
      // @ts-ignore
      this.map.on('moveend', this.particlesManager.redrawVectors, this.particlesManager);
      this.map.on('movestart', this.particlesManager.cancelTasks, this.particlesManager);
      this.map.on('zoomstart', this.pause.bind(this));
      this.map.on('zoomend', this.resume.bind(this));
    }
    this.enable();
    // @ts-ignore
    this.particlesManager.init(this.particlesLayer, this.options);
  }

  start() {
    this.particlesLayer.addTo(this.map);
    // @ts-ignore
    this.particlesLayer?.getCanvas().classList.add('particles-layer');
    // @ts-ignore
    this.map.on('moveend', this.particlesManager.redrawVectors, this.particlesManager);
    this.map.on('movestart', this.particlesManager.cancelTasks, this.particlesManager);
    this.map.on('zoomstart', this.pause.bind(this));
    this.map.on('zoomend', this.resume.bind(this));
    this.enable();
    // @ts-ignore
    this.particlesManager.init(this.particlesLayer, this.options);
    // this.particlesManager.redrawVectors();
  }
}
