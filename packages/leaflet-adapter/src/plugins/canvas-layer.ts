import { dispatchError } from '@atmospherics-viz/utils';
import L from 'leaflet';

const CanvasLayer = L.Layer.extend({
  initialize(option: { disableAutoReset: boolean; className: string }) {
    L.Util.setOptions(this, option || {});
    this.targetPane = 'tilePane';
    this._showCanvasOn = true;
    this.onInit();
  },
  addTo(map: L.Map | L.LayerGroup) {
    this.failed = false;
    map.addLayer(this);
    return this;
  },
  onContextLost() {
    dispatchError('CanvasLayer', 'Canvas context is lost');
  },
  onContextRestored() {
    dispatchError('CanvasLayer', 'Canvas context is restored');
  },
  onContextCreationError(error: any) {
    dispatchError('CanvasLayer', 'Canvas context creation error: '.concat('Unknown error'));
  },
  canvasHooks(canvas: HTMLCanvasElement, isListen: boolean) {
    if (canvas) {
      var eventListener: 'addEventListener' | 'removeEventListener' = isListen
        ? 'addEventListener'
        : 'removeEventListener';
      canvas[eventListener]('webglcontextlost', this.onContextLost, false),
        canvas[eventListener]('webglcontextrestored', this.onContextRestored, false),
        canvas[eventListener]('webglcontextcreationerror', this.onContextCreationError, false);
    } else
      dispatchError(
        'GlParticles',
        'No canvas '.concat(isListen ? 'start' : 'stop', ' listening context changes')
      );
  },
  onAdd(map: L.Map) {
    this._map = map;
    var t = map.getSize(),
      n = map.options.zoomAnimation && L.Browser.any3d;
    return (
      (this._canvas = L.DomUtil.create('canvas', 'leaflet-canvas')),
      this.canvasHooks(this._canvas, !0),
      this.onResizeCanvas(t.x, t.y),
      L.DomUtil.addClass(
        this._canvas,
        `leaflet-layer leaflet-zoom-` + (n ? 'animated' : 'hide') + ` ${this.options?.className ?? ''} z-17`
      ),
      map.getPanes()[this.targetPane].appendChild(this._canvas),
      this.onCreateCanvas(this._canvas)
        ? (map.on('resize', this._resize, this),
          map.on('zoomanim', this._animateZoom, this),
          map.on('zoom', this._onZoom, this),
          map.on('zoomstart', this._onZoomStart, this),
          map.on('zoomend', this._onZoomEnd, this),
          this.options.disableAutoReset || map.on('moveend', this._moveEnd, this),
          this._reset(),
          this._redraw(),
          this)
        : ((this.failed = !0), this.onCanvasFailed(), this)
    );
  },
  onRemove(map: L.Map) {
    var t;
    return (
      this.onRemoveCanvas(null !== (t = this._canvas) && void 0 !== t ? t : void 0),
      map.getPanes()[this.targetPane].removeChild(this._canvas),
      map.off('resize', this._resize, this),
      map.off('zoomanim', this._animateZoom, this),
      map.off('zoom', this._onZoom, this),
      map.off('zoomstart', this._onZoomStart, this),
      map.off('zoomend', this._onZoomEnd, this),
      this.options.disableAutoReset || map.off('moveend', this._moveEnd, this),
      this.canvasHooks(this._canvas, !1),
      (this._canvas = null),
      this
    );
  },
  getCanvas() {
    return this._canvas;
  },
  showCanvas(showCanvasOn: boolean) {
    this._showCanvasOn !== showCanvasOn &&
      ((this._showCanvasOn = showCanvasOn),
      (this._canvas.style.display = this._showCanvasOn ? 'block' : 'none'));
  },
  onResizeCanvas(width: number, height: number) {
    (this._canvas.width = width), (this._canvas.height = height);
  },
  _resize(event: L.ResizeEvent) {
    this.onResizeCanvas(event.newSize.x, event.newSize.y);
  },
  _reset() {
    if (this._map && this._canvas) {
      var e = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, e),
        (this._center = this._map.getCenter()),
        (this._zoom = this._map.getZoom()),
        this.onReset();
    }
  },
  reset() {
    this._reset();
  },
  onReset() {},
  _redraw() {
    this._frame = null;
  },
  redraw() {
    return this._frame || (this._frame = L.Util.requestAnimFrame(this._redraw, this)), this;
  },
  _moveEnd() {
    this._reset();
    this.onMoveEnd();
  },
  _onZoomStart() {
    this.wasOnZoom = false;
  },
  _onZoomEnd() {
    this.canvasDisplay(true);
  },
  canvasDisplay(display: boolean) {
    this._canvas && (this._canvas.style.display = display ? 'block' : 'none');
  },
  _animateZoom: function (event: L.ZoomAnimEvent) {
    this.wasOnZoom && this.canvasDisplay(!1);
    var t = this._map.getZoomScale(event.zoom),
      n = this._map._latLngBoundsToNewLayerBounds(
        this._map.getBounds(),
        event.zoom,
        event.center
      ).min;
    L.DomUtil.setTransform(this._canvas, n, t);
  },
  _onZoom() {
    this.wasOnZoom = true;
    this._updateTransform(this._map.getCenter(), this._map.getZoom());
  },
  _updateTransform(center: L.LatLng, zoom: number) {
    if (this._map && this._canvas && this._center) {
      var n = this._map.getZoomScale(zoom, this._zoom),
        r = this._canvas._leaflet_pos || new L.Point(0, 0),
        i = this._map.getSize().multiplyBy(0.5 + (this.options.padding || 0)),
        a = this._map.project(this._center, zoom),
        o = this._map.project(center, zoom).subtract(a),
        s = i.multiplyBy(-n).add(r).add(i).subtract(o);
      L.DomUtil.setTransform(this._canvas, s, n);
    }
  },
  onInit() {},
  onCreateCanvas: () => true,
  onCanvasFailed() {},
  onRemoveCanvas() {},
  onMoveEnd() {},
  onZoomEnd() {},
});

export default CanvasLayer;
