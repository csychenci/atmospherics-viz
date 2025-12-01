// 数据质量等级映射表（对应原始代码中的 Ep）
export const DATA_QUALITY_ZOOM_MAP = {
  extreme: [0, 0, 1, 2, 3, 4, 4, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  ultra: [0, 0, 0, 2, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  high: [0, 0, 0, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  normal: [0, 0, 0, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  low: [0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
} as const;

// 数据质量等级列表（对应原始代码中的 Ap）
export const DATA_QUALITY_LEVELS = Object.keys(DATA_QUALITY_ZOOM_MAP) as Array<keyof typeof DATA_QUALITY_ZOOM_MAP>;