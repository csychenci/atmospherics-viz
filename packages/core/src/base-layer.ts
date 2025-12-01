import { ColorGradientManager, DEFAULT_COLORS } from './color';

export class WeatherLayer {
  colors: ColorGradientManager | null = null;
  m: ColorGradientManager | null = null;
  filename: string = '';
  fileSuffix: string = '';
  product: 'ecmwf' | 'cmems' | null = null;
  wTransformR: 'rainLog' | null = null;
  PNGtransparency: boolean = false;
  levels: string[] = [];
  ident: string = '';
  renderer:
    | 'capAlerts'
    | 'isolines'
    | 'particles'
    | 'accumulations'
    | 'noUserControl'
    | 'radarPlus'
    | 'radar'
    | 'daySwitcher'
    | 'topoMap'
    | 'tileLayer' = 'tileLayer';
  sea: boolean = false;
  JPGtransparency: boolean = false;
  renderParams: {
    sea?: boolean;
    interpolate?: 'interpolateOverlay' | 'interpolateWaves';
    interpolateNearestG?: boolean;
    isMultiColor?: boolean;
    pattern?: 'cclPattern' | 'rainPattern' | 'ptypePattern';
    landOnly?: boolean;
    particlesIdent?: 'wind' | 'waves' | 'currents' | 'rain';
    renderFrom?: 'R' | 'RG' | 'B'; // 渲染数据来源标识
  } = {
    renderFrom: 'R',
  };

  constructor(options: Partial<WeatherLayer>) {
    this.initProperties();
    Object.assign(this, options);
  }

  public transformR?: (value: number) => number;
  public transformG?: (value: number) => number;
  public transformB?: (value: number) => number;

  getColor() {
    return this.colors?.getColor();
  }
  initProperties() {
    // 默认渲染器类型为瓦片图层
    this.renderer = 'tileLayer';

    // 是否为海洋图层
    this.sea = false;

    // 是否支持 JPG 透明度
    this.JPGtransparency = false;

    // 渲染参数配置
    this.renderParams = {
      renderFrom: 'R', // 渲染数据来源标识
    };
  }
}

export const DEFAULT_WEATHER_LAYERS = {
  wind: new WeatherLayer({
    ident: 'wind',
    renderParams: {
      renderFrom: 'RG',
    },
    colors: DEFAULT_COLORS.wind,
    m: DEFAULT_COLORS.wind,
  }),
  windParticles: new WeatherLayer({
    ident: 'windParticles',
    renderer: 'particles',
    filename: 'wind',
    fileSuffix: 'jpg',
    renderParams: {
      particlesIdent: 'wind',
    },
  }),
  clouds: new WeatherLayer({
    ident: 'clouds',
    filename: 'cloudsrain',
    renderParams: {
      renderFrom: 'RG',
      isMultiColor: !0,
    },
    colors: DEFAULT_COLORS.clouds,
    m: DEFAULT_COLORS.rain,
    // @ts-ignore
    cm: DEFAULT_COLORS.clouds,
    transformG: e => (e < 10 ? e : 10 * (e - 10) + 10),
    getColor2: () => DEFAULT_COLORS.rainClouds.getColor(),
    // @ts-ignore
    getAmountByColor: (e, t) => (t < 0.3 ? 0 : t < 3 ? 1 : t < 6 ? 2 : 3),
  }),
  waves: new (class extends WeatherLayer {
    initProperties() {
      super.initProperties(),
        (this.PNGtransparency = !0),
        (this.renderParams = {
          interpolate: 'interpolateWaves',
          renderFrom: 'B',
          sea: !0,
        }),
        (this.colors = DEFAULT_COLORS.waves),
        (this.m = DEFAULT_COLORS.waves);
    }
  })({
    ident: 'waves',
  }),
} as const;
