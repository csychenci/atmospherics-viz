// 辅助函数定义
const clamp = (value: number, min: number, max: number): number =>
  Math.max(Math.min(value, max), min);
const hypot = (x: number, y: number): number => Math.sqrt(x * x + y * y);

// 异步生成器包装器
function asyncWrapper(generatorFn: () => Generator<any, any, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const generator = generatorFn();

    function step(result: IteratorResult<any>): void {
      if (result.done) {
        resolve(result.value);
      } else {
        Promise.resolve(result.value)
          .then(value => step(generator.next(value)))
          .catch(error => step(generator.throw(error)));
      }
    }

    try {
      step(generator.next());
    } catch (error) {
      reject(error);
    }
  });
}

// 自定义颜色存储接口
interface CustomColorStorage {
  hasKey(key: string): Promise<boolean>;
  get(key: string): Promise<{ gradient?: Array<[number, string]> } | null>;
  put(key: string, data: { id: string; gradient: Array<[number, string]> }): Promise<void>;
  remove(key: string): Promise<void>;
}

// 全局自定义颜色存储实例
let customColorStorage: CustomColorStorage | null = null;

// 设置自定义颜色存储
export function setCustomColorStorage(storage: CustomColorStorage): void {
  customColorStorage = storage;
}

// 颜色梯度配置接口
export interface ColorGradientConfig {
  ident: string;
  qualitative?: boolean;
  steps?: number;
  default: Array<[number, string]>;
  opaque?: boolean;
  prepare?: boolean;
}

/**
 * 颜色梯度管理器 - 严格按照原始 Ea 类还原
 */
export class ColorGradientManager {
  public ident: string;
  public qualitative?: boolean;
  public steps: number;
  public initialColorGradient: Array<[number, string]>;
  public opaque: boolean;
  public prepare?: boolean;

  private colors?: Uint8Array;
  private customColorGradient?: Array<[number, string]> | null;
  private defaultColorGradient?: Array<[number, number[]]>;
  public min: number = 0;
  public max: number = 1;
  private maxIndex: number = 0;
  private step: number = 1;
  private neutralGrayIndex: number = 0;

  constructor(config: ColorGradientConfig) {
    this.ident = config.ident;
    this.qualitative = config.qualitative;
    this.steps = config.steps ?? 256;
    this.initialColorGradient = config.default;
    this.opaque = config.opaque ?? true;
    this.prepare = config.prepare;

    if (this.prepare) {
      this.getColor();
    }
    this.loadCustomColor();
  }

  getColorTable(): Uint8Array | undefined {
    return this.colors;
  }

  loadCustomColor(): Promise<void> {
    const self = this;
    return asyncWrapper(function* () {
      if (customColorStorage && (yield customColorStorage.hasKey(self.ident))) {
        const data = yield customColorStorage.get(self.ident);
        self.customColorGradient = data?.gradient ?? undefined;
      }
    });
  }

  hasCustomColor(): boolean {
    return Boolean(this.customColorGradient);
  }

  setCustomColor(gradient: Array<[number, string]>): Promise<void> {
    const args = arguments;
    const self = this;
    return asyncWrapper(function* () {
      const shouldSave = !(args.length > 1 && args[1] !== undefined) || args[1];
      if (shouldSave && customColorStorage) {
        yield customColorStorage.put(self.ident, {
          id: self.ident,
          gradient: gradient,
        });
      }
      self.customColorGradient = gradient;
      self.regenerateColorTable();
    });
  }

  removeCustomColor(): Promise<void> {
    const self = this;
    return asyncWrapper(function* () {
      if (customColorStorage) {
        yield customColorStorage.remove(self.ident);
      }
      self.customColorGradient = null;
      self.regenerateColorTable();
    });
  }

  color(value: number): string {
    const [r, g, b] = this.RGBA(value);
    return `rgb(${r},${g},${b})`;
  }

  colorDark(value: number, darkness: number): string {
    let [r, g, b] = this.RGBA(value);
    r = clamp(r - darkness, 0, 255);
    g = clamp(g - darkness, 0, 255);
    b = clamp(b - darkness, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  RGBA(value: number): [number, number, number, number] {
    const index = this.value2index(value);
    return [
      this.colors![index],
      this.colors![index + 1],
      this.colors![index + 2],
      this.colors![index + 3],
    ];
  }

  createGradientArray(opaque?: boolean, premultiplied?: boolean, factor?: number): Uint8Array {
    const opaqueValue = opaque !== undefined ? opaque : true;
    const premultipliedValue = premultiplied !== undefined ? premultiplied : false;
    const factorValue = factor !== undefined ? factor : 1;

    const arraySize = this.steps + 1;
    const colorArray = new Uint8Array(arraySize << 2);
    const valueStep = (factorValue * (this.max - this.min)) / (this.steps - 1);
    const gradient = this.getColorGradient();

    let arrayIndex = 0;
    let gradientIndex = 1;
    let currentPoint = gradient[0];
    let nextPoint = gradient[gradientIndex++] ?? gradient[0];
    let deltaValue = nextPoint[0] - currentPoint[0];
    let inverseDelta = deltaValue ? 1 / deltaValue : 1;

    for (let step = 0; step < this.steps; step++) {
      const currentValue = this.min + valueStep * step;

      // 找到当前值对应的梯度区间
      while (currentValue > nextPoint[0] && gradientIndex < gradient.length) {
        currentPoint = nextPoint;
        nextPoint = gradient[gradientIndex++];
        const newDelta = nextPoint[0] - currentPoint[0];
        inverseDelta = newDelta ? 1 / newDelta : 1;
      }

      const interpolationFactor = (currentValue - currentPoint[0]) * inverseDelta;
      const interpolatedColor = this.getGradientColorYUVA(
        currentPoint[1],
        nextPoint[1],
        interpolationFactor
      );

      if (premultipliedValue) {
        this.makePremultiplied(interpolatedColor);
      }

      colorArray[arrayIndex++] = Math.round(interpolatedColor[0]);
      colorArray[arrayIndex++] = Math.round(interpolatedColor[1]);
      colorArray[arrayIndex++] = Math.round(interpolatedColor[2]);
      colorArray[arrayIndex++] = opaqueValue ? 255 : Math.round(interpolatedColor[3]);
    }

    // 添加中性灰色
    this.neutralGrayIndex = arrayIndex;
    colorArray[arrayIndex++] = 128;
    colorArray[arrayIndex++] = 128;
    colorArray[arrayIndex++] = 128;
    colorArray[arrayIndex++] = 255;

    return colorArray;
  }

  getColor(): ColorGradientManager {
    if (this.colors) return this;

    const gradient = this.getColorGradient();
    this.min = gradient[0][0];
    this.max = gradient[gradient.length - 1][0];
    this.colors = this.createGradientArray(this.opaque);
    this.maxIndex = (this.steps - 1) << 2;
    this.step = (this.max - this.min) / this.steps;

    return this;
  }

  value2index(value: number): number {
    return isNaN(value)
      ? this.neutralGrayIndex
      : Math.max(0, Math.min(this.maxIndex, ((value - this.min) / this.step) << 2));
  }

  getColorGradient(): Array<[number, number[]]> {
    const gradient = this.customColorGradient || this.defaultColorGradient;
    if (gradient) {
      return gradient as Array<[number, number[]]>;
    }

    this.defaultColorGradient = this.parseColorGradient(this.initialColorGradient);
    return this.defaultColorGradient;
  }

  static checkValidity(gradient: any): boolean {
    if (!Array.isArray(gradient)) return false;

    for (let i = 0; i < gradient.length; i++) {
      const point = gradient[i];
      if (
        !Array.isArray(point) ||
        !point.length ||
        !Array.isArray(point[1]) ||
        typeof point[0] !== 'number' ||
        point[1].length !== 4
      ) {
        return false;
      }
    }
    return true;
  }

  parseRGBAString(colorString: string): number[] {
    const match = colorString.match(/rgba?\(([^)]+)\)/);
    if (!match) {
      throw new Error(`Invalid color format: ${colorString}`);
    }

    const values = match[1].split(',').map(Number);
    if (values.length === 3) {
      values.push(255);
    } else if (values.length === 4) {
      values[3] = Math.min(255, 255 * values[3]);
    }

    return values;
  }

  parseColorGradient(gradient: Array<[number, string]>): Array<[number, number[]]> {
    const result: Array<[number, number[]]> = [];
    for (let i = 0; i < gradient.length; i++) {
      const rgba = this.parseRGBAString(gradient[i][1]);
      result.push([gradient[i][0], rgba]);
    }
    return result;
  }

  getMulArray(array: number[], factor: number): number[] {
    const result: number[] = [];
    const length = array.length;
    for (let i = 0; i < length; i++) {
      result.push(array[i] * factor);
    }
    return result;
  }

  lerpArray(a: number[], b: number[], factor: number): number[] {
    const inverseFactor = 1 - factor;
    const length = a.length;
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      result.push(a[i] * inverseFactor + b[i] * factor);
    }
    return result;
  }

  rgba2yuva(rgba: number[]): number[] {
    const [r, g, b, a] = rgba;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    return [y, 0.565 * (b - y), 0.713 * (r - y), a];
  }

  yuva2rgba(yuva: number[]): number[] {
    const [y, u, v, a] = yuva;
    return [y + 1.403 * v, y - 0.344 * u - 0.714 * v, y + 1.77 * u, a];
  }

  gradYuva(
    startYuva: number[],
    endYuva: number[],
    factor: number,
    preserveChroma: boolean
  ): number[] {
    const interpolated = this.lerpArray(startYuva, endYuva, factor);

    if (preserveChroma) {
      const startChroma = hypot(startYuva[1], startYuva[2]);
      const endChroma = hypot(endYuva[1], endYuva[2]);

      if (startChroma > 0.05 && endChroma > 0.05) {
        const interpolatedChroma = hypot(interpolated[1], interpolated[2]);

        if (interpolatedChroma > 0.01) {
          const targetChroma =
            (startChroma * (1 - factor) + endChroma * factor) / interpolatedChroma;
          interpolated[1] *= targetChroma;
          interpolated[2] *= targetChroma;
        }
      }
    }

    return interpolated;
  }

  getGradientColorYUVA(startRgba: number[], endRgba: number[], factor: number): number[] {
    const normalizer = 1 / 255;
    const normalizedStart = this.getMulArray(startRgba, normalizer);
    const normalizedEnd = this.getMulArray(endRgba, normalizer);
    const startYuva = this.rgba2yuva(normalizedStart);
    const endYuva = this.rgba2yuva(normalizedEnd);
    const interpolatedYuva = this.gradYuva(startYuva, endYuva, factor, true);
    const interpolatedRgba = this.yuva2rgba(interpolatedYuva);

    for (let i = 0; i < interpolatedRgba.length; i++) {
      interpolatedRgba[i] = Math.max(0, Math.min(256 * interpolatedRgba[i], 255));
    }

    return interpolatedRgba;
  }

  makePremultiplied(rgba: number[]): number[] {
    const alpha = rgba[3] / 255;
    for (let i = 0; i < 3; i++) {
      rgba[i] = Math.max(0, Math.min(alpha * rgba[i], 255));
    }
    return rgba;
  }

  regenerateColorTable(): void {
    if (this.colors) {
      this.colors = undefined;
      this.getColor();
    }
  }
}

export const DEFAULT_COLORS = {
  temp: new ColorGradientManager({
    ident: 'temp',
    steps: 2048,
    prepare: true,
    default: [
      [203, 'rgb(115,70,105)'],
      [218, 'rgb(202,172,195)'],
      [233, 'rgb(162,70,145)'],
      [248, 'rgb(143,89,169)'],
      [258, 'rgb(157,219,217)'],
      [265, 'rgb(106,191,181)'],
      [269, 'rgb(100,166,189)'],
      [273.15, 'rgb(93,133,198)'],
      [274, 'rgb(68,125,99)'],
      [283, 'rgb(128,147,24)'],
      [294, 'rgb(243,183,4)'],
      [303, 'rgb(232,83,25)'],
      [320, 'rgb(71,14,0)'],
    ],
  }),
  wind: new ColorGradientManager({
    ident: 'wind',
    steps: 2048,
    prepare: !0,
    default: [
      [0, 'rgb(98,113,183)'],
      [1, 'rgb(57,97,159)'],
      [3, 'rgb(74,148,169)'],
      [5, 'rgb(77,141,123)'],
      [7, 'rgb(83,165,83)'],
      [9, 'rgb(53,159,53)'],
      [11, 'rgb(167,157,81)'],
      [13, 'rgb(159,127,58)'],
      [15, 'rgb(161,108,92)'],
      [17, 'rgb(129,58,78)'],
      [19, 'rgb(175,80,136)'],
      [21, 'rgb(117,74,147)'],
      [24, 'rgb(109,97,163)'],
      [27, 'rgb(68,105,141)'],
      [29, 'rgb(92,144,152)'],
      [36, 'rgb(125,68,165)'],
      [46, 'rgb(231,215,215)'],
      [51, 'rgb(219,212,135)'],
      [77, 'rgb(205,202,112)'],
      [104, 'rgb(128,128,128)'],
    ],
  }),
  rain: new ColorGradientManager({
    ident: 'rain',
    steps: 1024,
    prepare: !0,
    default: [
      [0, 'rgb(111,111,111)'],
      [0.6, 'rgb(60,116,160)'],
      [6, 'rgb(59,161,161)'],
      [8, 'rgb(59,161,61)'],
      [10, 'rgb(130,161,59)'],
      [15, 'rgb(161,161,59)'],
      [20, 'rgb(161,59,59)'],
      [31, 'rgb(161,59,161)'],
      [50, 'rgb(168,168,168)'],
    ],
  }),
  ptype: new ColorGradientManager({
    ident: 'ptype',
    steps: 128,
    qualitative: !0,
    default: [
      [0, 'rgb(111,111,111)'],
      [1, 'rgb(0,208,239)'],
      [2, 'rgb(0,0,255)'],
      [3, 'rgb(197,27,195)'],
      [4, 'rgb(129,63,63)'],
      [5, 'rgb(227,227,227)'],
      [6, 'rgb(129,195,129)'],
      [7, 'rgb(202,211,57)'],
      [8, 'rgb(183,119,8)'],
      [9, 'rgb(227,73,19)'],
      [10, 'rgb(195,63,63)'],
    ],
  }),
  rainClouds: new ColorGradientManager({
    ident: 'rainClouds',
    steps: 128,
    opaque: !1,
    default: [
      [0, 'rgba(67, 87, 166, 0.2)'],
      [0.8, 'rgba(70, 102, 163, 0.3)'],
      [2, 'rgba(62, 171, 171, 0.4)'],
      [6, 'rgba(62, 171, 171, 0.9)'],
      [8, 'rgb(62, 142, 62)'],
      [10, 'rgb(129, 156, 62)'],
      [15, 'rgb(171, 171, 62)'],
      [20, 'rgb(169, 62, 62)'],
      [31, 'rgb(171, 62, 171)'],
      [50, 'rgb(177, 177, 177)'],
    ],
  }),
  clouds: new ColorGradientManager({
    ident: 'clouds',
    steps: 800,
    default: [
      [0, 'rgb(146,130,70)'],
      [10, 'rgb(132,119,70)'],
      [50, 'rgb(116,116,116)'],
      [95, 'rgb(171,180,179)'],
      [98, 'rgb(198,201,201)'],
      [100, 'rgb(213,213,205)'],
    ],
  }),
  waves: new ColorGradientManager({
    ident: 'waves',
    steps: 1024,
    default: [
      [0, 'rgb(159,185,191)'],
      [0.5, 'rgb(48,157,185)'],
      [1, 'rgb(48,98,141)'],
      [1.5, 'rgb(56,104,191)'],
      [2, 'rgb(57,60,142)'],
      [2.5, 'rgb(187,90,191)'],
      [3, 'rgb(154,48,151)'],
      [4, 'rgb(133,48,48)'],
      [5, 'rgb(191,51,95)'],
      [7, 'rgb(191,103,87)'],
      [10, 'rgb(191,191,191)'],
      [12, 'rgb(154,127,155)'],
    ],
  }),
  currents: new ColorGradientManager({
    ident: 'currents',
    steps: 256,
    default: [
      [0, 'rgb(64,77,143)'],
      [0.02, 'rgb(50,86,142)'],
      [0.06, 'rgb(50,123,142)'],
      [0.1, 'rgb(64,120,103)'],
      [0.15, 'rgb(50,133,50)'],
      [0.2, 'rgb(50,141,50)'],
      [0.3, 'rgb(142,132,50)'],
      [0.4, 'rgb(142,113,50)'],
      [0.5, 'rgb(130,77,61)'],
      [0.6, 'rgb(115,50,68)'],
      [0.7, 'rgb(142,50,104)'],
      [0.8, 'rgb(105,68,131)'],
      [0.85, 'rgb(81,70,131)'],
      [0.9, 'rgb(65,98,131)'],
      [1, 'rgb(73,122,131)'],
      [1.5, 'rgb(143,143,143)'],
      [4, 'rgb(143,143,143)'],
    ],
  }),
};