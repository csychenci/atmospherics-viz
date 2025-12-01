declare module 'weacast-grib2json';

export interface Grib2JsonOptions {
  includeValues?: boolean;
  includeCoordinates?: boolean;
  includeStatistics?: boolean;
}

export interface GribMessage {
  header: {
    discipline: number;
    edition: number;
    length: number;
  };
  data?: {
    values?: number[];
    coordinates?: {
      lat: number[];
      lon: number[];
    };
  };
  parameter: {
    discipline: number;
    parameterCategory: number;
    parameterNumber: number;
    name: string;
    unit: string;
  };
  grid: {
    ni: number;
    nj: number;
    firstPoint: {
      lat: number;
      lon: number;
    };
    lastPoint: {
      lat: number;
      lon: number;
    };
    di: number;
    dj: number;
  };
}

export interface GribParseResult {
  messages: GribMessage[];
  info: {
    fileSize: number;
    messageCount: number;
  };
}

export interface GribInfo {
  fileSize: number;
  messageCount: number;
  parameters: Array<{
    discipline: number;
    parameterCategory: number;
    parameterNumber: number;
    name: string;
    unit: string;
  }>;
  grid: {
    ni: number;
    nj: number;
    latRange: [number, number];
    lonRange: [number, number];
    resolution: number;
  };
}

export class Grib2Json {
  constructor(options?: Grib2JsonOptions);
  parseFile(filePath: string): Promise<GribParseResult>;
  getInfo(filePath: string): Promise<GribInfo>;
}