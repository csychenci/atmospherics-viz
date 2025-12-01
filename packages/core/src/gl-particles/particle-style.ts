/**
 * 动态粒子配置项
 */
interface ParticleSettings {
  velocity: number;
  multiplier: number;
  width: number;
  opacity: number;
  blending: number;
}

/**
 * 构造函数选项
 */
interface ControllerOptions {
  configurable?: boolean;
  animation?: string;
  lineWidth?: number[];
  multiplier: {
    constant: number;
    pow: number;
    zoom: number;
  };
  velocity: {
    max: number;
    damper: number;
  };
  styles?: any; // 原始类型未知, 暂定 any

  // WebGL 渲染参数
  glSpeedCurvePowParam?: number;
  glMinSpeedParam?: number;
  glMaxSpeedParam?: number;
  glParticleWidth?: number;
  glParticleLengthEx?: number;
  glSpeedPx?: number;
  glCountMul?: number;
  glVelocity?: number;
  glOpacity?: number;
  glBlending?: number;

  // 可覆盖的自定义函数
  getBlendingAlpha?: (context: BlendingAlphaContext) => number;
  getIntensityFun?: () => (speed: number) => number;
  getStyles?: (context: StylesContext) => string[];
}

/**
 * 方法上下文类型
 */
interface VelocityContext {
  zoom: number;
  level: string;
}

interface AmountContext {
  speed2pixel: number;
  width: number;
  height: number;
  zoom: number;
}

interface LineWidthContext {
  zoom: number;
}

interface StylesContext {
  zoom: number;
}

interface BlendingAlphaContext {
  speed2pixel: number;
}

export class ParticleStyleController {
  // --- 预定义样式和映射表 (原始命名) ---
  public readonly stylesBlue: string[] = [
    'rgba(200,0,150,1)',
    'rgba(200,0,150,1)',
    'rgba(200,0,150,1)',
    'rgba(200,0,150,1)',
  ];

  public readonly zoom2speed: number[] = [
    0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  ];

  public readonly level2reduce: Record<string, number> = {
    surface: 1,
    '100m': 1,
    '975h': 1,
    '950h': 1,
    '925h': 0.98,
    '900h': 0.9,
    '850h': 0.8,
    '800h': 0.77,
    '700h': 0.7,
    '600h': 0.65,
    '500h': 0.6,
    '400h': 0.55,
    '300h': 0.5,
    '250h': 0.45,
    '200h': 0.45,
    '150h': 0.35,
    '10h': 0.25,
  };

  public readonly colors: number[][] = [
    [200, 215, 235, 255],
    [215, 235, 255, 255],
    [235, 255, 255, 255],
    [255, 255, 255, 255],
  ];

  // --- 外部配置和状态 (原始命名) ---
  private config: ParticleSettings = {
    multiplier: 1,
    velocity: 1,
    width: 1,
    blending: 1,
    opacity: 1,
  };
  public readonly configurable: boolean;

  // --- 基础粒子属性 (原始命名) ---
  public readonly animation: string;
  public readonly lineWidth: number[];
  public readonly multiplier: { constant: number; pow: number; zoom: number };
  public readonly velocity: { max: number; damper: number };
  public readonly styles?: any;

  // --- WebGL 渲染专属参数 (原始命名) ---
  public readonly glSpeedCurvePowParam?: number;
  public readonly glMinSpeedParam?: number;
  public readonly glMaxSpeedParam?: number;
  public readonly glParticleWidth?: number;
  public readonly glParticleLengthEx?: number;
  public readonly glSpeedPx?: number;
  public readonly glCountMul?: number;
  public readonly glVelocity: number;
  public readonly glOpacity: number;
  public readonly glBlending: number;

  // --- 可覆盖的自定义逻辑 (作为属性，保留原始 API) ---
  public getBlendingAlpha: (context: BlendingAlphaContext) => number;
  public getIntensityFun: () => (speed: number) => number;
  public getStyles: (context: StylesContext) => string[];

  constructor(options: ControllerOptions) {
    // this.config = wt.get('particles');
    // wt.on('particles', newSettings => (this.config = newSettings));

    this.configurable = options.configurable ?? false;
    this.animation = options.animation ?? 'dot';
    this.lineWidth = options.lineWidth ?? [
      0.6, 0.6, 0.6, 1, 1.2, 1.6, 1.8, 2, 2.2, 2.4, 2.4, 2.4, 2.4, 2.6, 2.8, 3, 3, 3, 3, 3, 3, 3, 3,
      3,
    ];

    this.multiplier = options.multiplier;
    this.velocity = options.velocity;
    this.styles = options.styles;

    // WebGL 参数
    this.glSpeedCurvePowParam = options.glSpeedCurvePowParam;
    this.glMinSpeedParam = options.glMinSpeedParam;
    this.glMaxSpeedParam = options.glMaxSpeedParam;
    this.glParticleWidth = options.glParticleWidth;
    this.glParticleLengthEx = options.glParticleLengthEx;
    this.glSpeedPx = options.glSpeedPx;
    this.glCountMul = options.glCountMul;
    this.glVelocity = options.glVelocity ?? 1;
    this.glOpacity = options.glOpacity ?? 1;
    this.glBlending = options.glBlending ?? 1;

    // 绑定可覆盖的函数：如果 options 提供则使用，否则使用内部默认实现
    // @ts-ignore
    this.getBlendingAlpha = options.getBlendingAlpha ?? this._getBlendingAlphaDefault.bind(this);
    this.getIntensityFun = options.getIntensityFun ?? this._getIntensityFunDefault.bind(this);
    this.getStyles = options.getStyles ?? this._getStylesDefault.bind(this);
  }

  public getVelocityFun(context: VelocityContext): (baseSpeed: number) => number {
    const zoomSpeedFactor = this.zoom2speed[context.zoom];
    const userVelocityMultiplier = this.configurable ? this.config.velocity : 1;
    const levelSpeedReduction = this.level2reduce[context.level] ?? 1;

    const maxVelocity =
      zoomSpeedFactor * userVelocityMultiplier * levelSpeedReduction * this.velocity.max;
    const damper = zoomSpeedFactor * userVelocityMultiplier * this.velocity.damper;

    return (baseSpeed: number) => {
      return maxVelocity * (1 - 1 / (damper * maxVelocity * baseSpeed - 1));
    };
  }

  public getAmountMultiplier(): number {
    return this.configurable ? this.config.multiplier : 1;
  }

  public getAmount(context: AmountContext): number {
    const speedFactor = context.speed2pixel < 1 ? 1 + 1.5 * (1 - context.speed2pixel) : 1;
    const userMultiplier = this.getAmountMultiplier();

    const density =
      1 /
      (this.multiplier.constant *
        Math.pow(userMultiplier * this.multiplier.pow, context.zoom - this.multiplier.zoom));

    const count = speedFactor * context.width * context.height * density;
    return Math.floor(Math.min(15000, Math.round(count)));
  }

  public getLineWidth(context: LineWidthContext): number {
    const userWidthMultiplier = this.configurable ? this.config.width : 1;
    return userWidthMultiplier * this.lineWidth[context.zoom];
  }

  public getMaxAge(): number {
    return 100;
  }

  // --- 默认实现 ---

  private _getIntensityFunDefault(): (speed: number) => number {
    return (speed: number) => Math.min(3, Math.floor(speed / 40));
  }

  private _getStylesDefault(context: StylesContext): string[] {
    const userOpacity = this.configurable ? this.config.opacity : 1;

    if (context.zoom >= 12) {
      return this.stylesBlue;
    }

    if (userOpacity <= 1) {
      return this.colors[0].map(c => `rgba(${c},${c},${c},${userOpacity.toFixed(1)})`);
    }

    const colorIndex = Math.min(3, Math.round(1.5 * userOpacity));
    return this.colors[colorIndex].map(c => `rgba(${c},${c},${c},1)`);
  }

  private _getBlendingAlphaDefault(context: BlendingAlphaContext): string {
    const userBlendingFactor =
      this.configurable && this.config.blending !== 1 ? this.config.blending : 1;

    const speedFactor = context.speed2pixel < 0.8 ? 1 + (0.8 - context.speed2pixel) / 7 : 1;
    const alpha = 0.9 * userBlendingFactor * speedFactor;
    const roundedAlpha = (2 * Math.round((100 * alpha) / 2)) / 100;
    return Math.min(0.98, roundedAlpha).toFixed(2);
  }
}

export const particleStylePresets = {
  wind: new ParticleStyleController({
    configurable: !0,
    multiplier: {
      constant: 50,
      pow: 1.6,
      zoom: 2,
    },
    velocity: {
      max: 0.1,
      damper: 1e-5,
    },
    glSpeedCurvePowParam: 0.7,
    glMinSpeedParam: 1.5,
    glMaxSpeedParam: 30,
    glParticleWidth: 1.3,
    glParticleLengthEx: 0.1,
    glSpeedPx: 100,
    glCountMul: 1,
  }),
  currents: new ParticleStyleController({
    multiplier: {
      constant: 50,
      pow: 1.5,
      zoom: 2,
    },
    velocity: {
      max: 0.4,
      damper: 0.35,
    },
    glSpeedCurvePowParam: 0.4,
    glMinSpeedParam: 0.2,
    glMaxSpeedParam: 1.2,
    glParticleWidth: 0.6,
    glParticleLengthEx: 0.1,
    glSpeedPx: 50,
    glVelocity: 1,
    glOpacity: 1.3,
    glBlending: 1.05,
    glCountMul: 4,
    getBlendingAlpha: () => 0.96,
  }),
  waves: new ParticleStyleController({
    animation: 'wavecle',
    styles: [
      'rgba(100,100,100,0.25)',
      'rgba(150,150,150,0.3)',
      'rgba(200,200,200,0.35)',
      'rgba(255,255,255,0.4)',
    ],
    lineWidth: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    multiplier: {
      constant: 50,
      pow: 1.3,
      zoom: 2,
    },
    velocity: {
      max: 0.02,
      damper: 0.015,
    },
    glSpeedCurvePowParam: 1,
    glMinSpeedParam: 0.5,
    glMaxSpeedParam: 10,
    glParticleWidth: 5.5,
    glParticleLengthEx: 1,
    glSpeedPx: 8,
    glVelocity: 1,
    glOpacity: 1.6,
    glBlending: 0.93,
    glCountMul: 1.5,
    getIntensityFun: () => e =>
      e < 12 ? 0 : e < 25 ? 1 : e < 37 ? 2 : e < 62 ? 3 : e < 75 ? 2 : e < 85 ? 1 : 0,
    getStyles() {
      return this.styles;
    },
    getBlendingAlpha: () => 0.9,
  }),
};
