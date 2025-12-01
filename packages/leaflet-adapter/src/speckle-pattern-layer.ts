import L, { Coords, DoneCallback, InternalTiles } from 'leaflet';
import { tileLoader, glTileRenderer } from '@atmospherics-viz/shared';
import { processTileCoordinate } from '@atmospherics-viz/utils';
import { LayerSourceConfig, TileCoordConfig } from '@atmospherics-viz/types';
import { DataTile } from '@atmospherics-viz/core';

function loadTileFailed(canvas: HTMLCanvasElement) {
  if (canvas.width !== 256) {
    canvas.width = 256;
    canvas.height = 256;
  }
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = ctx.strokeStyle = '#BBB';
    ctx.fillText('No data!', 14, 22);
    ctx.rect(3, 3, 250, 250);
    ctx.stroke();
  }
}

const SpecklePatternLayer = L.GridLayer.extend({
  options: {
    maxZoom: 11,
    updateWhenIdle: false,
    updateWhenZooming: false,
    keepBuffer: 4,
    disableTransformForTiles: true,
  },
  syncCounter: 0,
  inMotion: false,
  hasSea: false,
  className: 'overlay-layer z-[20]',
  onAdd: function (map: L.Map) {
    L.GridLayer.prototype.onAdd.call(this, map);
    map.on('movestart', this.onMoveStart, this);
    map.on('moveend', this.onMoveEnd, this);
    // wt.on('subscription', this.redrawLayer, this),
    this.on('load', this.checkLoaded, this);
    return this;
  },
  onRemove: function (map: L.Map) {
    map.off('movestart', this.onMoveStart, this);
    map.off('moveend', this.onMoveEnd, this);
    // wt.off('subscription', this.redrawLayer, this),
    this.off('load', this.checkLoaded, this);
    L.GridLayer.prototype.onRemove.call(this, map);
    this.hasSea = false;
    // gu(this.hasSea),
    this.landOnly = false;
    // mu(this.landOnly),
    return this;
  },
  onMoveStart() {
    this.inMotion = true;
  },
  onMoveEnd() {
    this.inMotion = false;
    if (!this._loading) {
      this.redrawFinished();
    }
  },
  checkLoaded() {
    this.inMotion || this.redrawFinished();
  },
  redrawLayer(options?: Partial<LayerSourceConfig>) {
    this.latestParams = {
      ...this.latestParams,
      ...options
    };
    const map = this._map as L.Map;
    const { min: minPixel, max: maxPixel } = map.getPixelBounds();
    const minTile = minPixel?.divideBy(256)?.floor(),
      maxTile = maxPixel?.divideBy(256)?.ceil(),
      tileBounds = L.bounds(minTile!, maxTile!),
      zoom = Math.round(map.getZoom());
    if (zoom > 11) {
      this.redrawFinished();
    } else {
      this.removeOtherTiles(zoom, tileBounds);
      const sortedTiles = this.sortTilesFromCenterOut(tileBounds);
      this._tilesToLoad = sortedTiles.length;
      for (let i = 0; i < sortedTiles.length; i++) {
        const tile = sortedTiles[i],
          tileKey = this._tileCoordsToKey(tile);
        if (tileKey in this._tiles) {
          this.redrawTile(this._tiles[tileKey]);
        } else {
          --this._tilesToLoad || this.redrawFinished();
        }
      }
    }
  },
  removeOtherTiles(zoom: number, tileBounds: L.Bounds) {
    const { min: minBound, max: maxBound } = tileBounds;
    for (let tile in this._tiles) {
      var [x, y, tileZoom] = tile.split(':');
      if (
        +tileZoom !== zoom ||
        +x < minBound!.y ||
        +x > maxBound!.x ||
        +y < minBound!.y ||
        +y > maxBound!.y
      ) {
        this._removeTile(tile);
      }
    }
  },
  redrawTile(tiles: InternalTiles[keyof InternalTiles]) {
    const wrapCoords = (this._wrapCoords as (parameter: Coords) => Coords)(tiles.coords);
    tiles.coords = wrapCoords;
    const config = processTileCoordinate(wrapCoords, this.latestParams),
      syncCounter = this.syncCounter;

    tileLoader
      .loadTile(config!)
      .then(r => {
        this.renderTile.call(this, 2, tiles.el, syncCounter, config, r);
      })
      .catch(t => {
        loadTileFailed(tiles.el as HTMLCanvasElement);
      })
      .then(() => {
        --this._tilesToLoad || this.redrawFinished();
      });
  },
  createTile(coords: Coords, callback: DoneCallback) {
    const wrapCoords = (this._wrapCoords as (parameter: Coords) => Coords)(coords);
    const config = processTileCoordinate(wrapCoords, this.latestParams),
      canvas = L.DomUtil.create('canvas'),
      syncCounter = this.syncCounter;
    canvas.width = canvas.height = 256;
    canvas.style.width = canvas.style.height = '256px';
    tileLoader
      .loadTile(config!)
      .then(e => {
        this.renderTile.call(this, 2, canvas, syncCounter, config, e);
      })
      .catch(e => {
        loadTileFailed(canvas);
      })
      .then(() => {
        callback(void 0, canvas);
      });
    return canvas;
  },
  sortTilesFromCenterOut(tileBounds: L.Bounds) {
    const center = tileBounds.getCenter(),
      sortedTiles = [],
      tileZoom = this._tileZoom;
    for (let y = tileBounds.min!.y; y <= tileBounds.max!.y; y++) {
      for (let x = tileBounds.min!.x; x <= tileBounds.max!.x; x++) {
        const result = new L.Point(x, y);
        // @ts-ignore
        result.z = tileZoom;
        sortedTiles.push(result);
      }
    }
    sortedTiles.sort((a, b) => {
      const distA = L.point(a).distanceTo(center);
      const distB = L.point(b).distanceTo(center);
      return distA - distB;
    });
    return sortedTiles;
  },
  redrawFinished() {
    if (this.latestParams.sea !== this.hasSea) {
      this.hasSea = Boolean(this.latestParams.sea);
    }
    if (this.latestParams.landOnly !== this.landOnly) {
      this.landOnly = this.latestParams.landOnly;
    }
    // (this.latestParams.sea !== this.hasSea &&
    //   ((this.hasSea = Boolean(this.latestParams.sea)), gu(this.hasSea)),
    //   this.latestParams.landOnly !== this.landOnly &&
    //     ((this.landOnly = this.latestParams.landOnly), mu(this.landOnly)),
    //   nt.emit('redrawFinished', this.latestParams));
  },
  init(config: LayerSourceConfig) {
    this.latestParams = config;
    glTileRenderer.init()
  },
  renderTile: function (
    _: number,
    canvas: HTMLCanvasElement,
    counter: number,
    config: TileCoordConfig,
    dataTile: DataTile
  ) {
    if (counter !== this.syncCounter) return;
    console.log('renderTile', canvas, counter, config, dataTile);
    glTileRenderer.processTile(this.latestParams, canvas, config, dataTile);
  },
});

type SpecklePatternLayerInstance = typeof SpecklePatternLayer;

export { SpecklePatternLayer, type SpecklePatternLayerInstance };
