import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ModelConfig } from '../config/modelConfigs';
import { ModelManager } from './ModelManager';
import { MarkerManager } from './MarkerManager';

/**
 * GIS → Three.js rotation: −90° around X maps Z-up to Y-up.
 * Applied once on the shared gis_root node.
 */
const GIS_TO_SCENE_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);

/**
 * Owns the Three.js scene, camera, renderer, controls, lighting,
 * reference helpers, and the GIS coordinate hierarchy.
 *
 * Scene-graph layout:
 *
 *   scene
 *   ├── gis_root   (rotation: Z-up → Y-up)
 *   │    └── offset   (position: −center, in GIS coords)
 *   │         ├── models   (container for loaded OBJ groups)
 *   │         └── markers  (container for user-placed markers)
 *   ├── GridHelper
 *   ├── AxesHelper
 *   └── Lights
 *
 * Models and markers share the same GIS coordinate frame.
 * The user enters marker positions in GIS coordinates (easting,
 * northing, elevation) and they land correctly relative to geometry.
 */
export class SceneController {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 50000);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;

  // GIS hierarchy nodes
  private readonly gisRoot = new THREE.Group();
  private readonly offset = new THREE.Group();
  private readonly modelsContainer = new THREE.Group();
  private readonly markersContainer = new THREE.Group();

  private readonly modelManager: ModelManager;
  private readonly markerManager: MarkerManager;

  /** GIS centre used for offset (stored so the UI can show it). */
  private readonly gisCenter = new THREE.Vector3();

  private gridHelper?: THREE.GridHelper;
  private axesHelper?: THREE.AxesHelper;
  private animationFrameId: number | null = null;

  constructor(private readonly container: HTMLElement) {
    this.scene.background = new THREE.Color(0x101418);

    this.camera.position.set(12, 10, 12);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 50000;

    // Build the GIS hierarchy
    this.gisRoot.name = 'gis_root';
    this.gisRoot.rotation.copy(GIS_TO_SCENE_ROTATION);

    this.offset.name = 'offset';
    this.modelsContainer.name = 'models';
    this.markersContainer.name = 'markers';

    this.offset.add(this.modelsContainer);
    this.offset.add(this.markersContainer);
    this.gisRoot.add(this.offset);
    this.scene.add(this.gisRoot);

    this.addLighting();
    this.addHelpers(100, 100, 4);

    this.modelManager = new ModelManager(this.modelsContainer);
    this.markerManager = new MarkerManager(this.markersContainer);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });

    this.resizeObserver.observe(this.container);
    this.resize();
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  start(): void {
    if (this.animationFrameId !== null) return;

    const tick = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = window.requestAnimationFrame(tick);
    };

    tick();
  }

  /** Load OBJ models, compute shared offset, fit helpers & camera. */
  async loadModels(configs: ModelConfig[]): Promise<void> {
    await this.modelManager.loadAll(configs);

    // Compute GIS centre from raw model bounds (before offset is set)
    const gisBounds = this.modelManager.getLocalBounds();
    if (gisBounds.isEmpty()) return;

    gisBounds.getCenter(this.gisCenter);
    this.offset.position.set(
      -this.gisCenter.x,
      -this.gisCenter.y,
      -this.gisCenter.z,
    );

    // From here, gis_root transforms everything into scene space.
    // Compute scene-space bounds for helpers / camera.
    const sceneBounds = new THREE.Box3().expandByObject(this.gisRoot);
    const size = sceneBounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    this.replaceHelpers(maxDim);
    this.markerManager.setMarkerSize(Math.max(0.5, maxDim * 0.012));
    this.fitCamera(sceneBounds);
  }

  /** Returns the GIS centre used for offset (easting, northing, elevation). */
  getGisCenter(): THREE.Vector3 {
    return this.gisCenter.clone();
  }

  setModelVisibility(id: string, visible: boolean): void {
    this.modelManager.setVisibility(id, visible);
  }

  /** Add a marker at GIS coordinates (easting, northing, elevation). */
  addMarker(easting: number, northing: number, elevation: number): void {
    this.markerManager.addMarker(easting, northing, elevation);
  }

  clearMarkers(): void {
    this.markerManager.clearMarkers();
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.modelManager.dispose();
    this.markerManager.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Internals                                                          */
  /* ------------------------------------------------------------------ */

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private fitCamera(sceneBounds: THREE.Box3): void {
    if (sceneBounds.isEmpty()) return;

    const center = sceneBounds.getCenter(new THREE.Vector3());
    const size = sceneBounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const fovRad = this.camera.fov * (Math.PI / 180);
    const dist = (maxDim / 2) / Math.tan(fovRad / 2) * 1.4;

    this.camera.position.set(
      center.x + dist * 0.4,
      center.y + dist * 0.5,
      center.z + dist * 0.7,
    );
    this.controls.target.copy(center);

    this.camera.near = Math.max(0.1, dist * 0.001);
    this.camera.far = dist * 10;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  /* ---- lighting ---------------------------------------------------- */

  private addLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(20, 30, 10);
    key.name = 'key';
    this.scene.add(key);
  }

  /* ---- helpers (grid + axes) --------------------------------------- */

  private addHelpers(gridSize: number, divisions: number, axesLen: number): void {
    this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x6b7280, 0x374151);
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(axesLen);
    this.scene.add(this.axesHelper);
  }

  private replaceHelpers(extent: number): void {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
    }
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.axesHelper.dispose();
    }

    const gridSize = Math.ceil(extent * 1.5);
    const divisions = Math.min(200, Math.max(20, Math.ceil(gridSize / 10)));
    this.addHelpers(gridSize, divisions, extent * 0.15);
  }
}