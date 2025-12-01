import { DataTile, TilesLoader, LRUCache } from '@atmospherics-viz/core';

export const lruCache = new LRUCache<DataTile>(50);
export const tileLoader = new TilesLoader(lruCache);

