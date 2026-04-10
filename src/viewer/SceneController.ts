import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ModelConfig } from '../config/modelConfigs';
import { ModelManager } from './ModelManager';
import { MarkerManager } from './MarkerManager';

/**
 * Owns the Three.js scene, camera, renderer, controls, lighting,
 * reference helpers, and the two domain managers (models + markers).
 */
export class SceneController {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 50000);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;

  private readonly modelManager: ModelManager;
  private readonly markerManager: MarkerManager;

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

    this.addLighting();
    this.addHelpers(100, 100, 4);

    this.modelManager = new ModelManager(this.scene);
    this.markerManager = new MarkerManager(this.scene);

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

  /** Load OBJ models, fit helpers & camera to their extent. */
  async loadModels(configs: ModelConfig[]): Promise<void> {
    await this.modelManager.loadAll(configs);

    const bounds = this.modelManager.getAllBounds();
    if (bounds.isEmpty()) return;

    const size = bounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Resize grid + axes to match model extent
    this.replaceHelpers(maxDim);

    // Scale directional lights outward so they illuminate the full scene
    this.scaleLights(maxDim);

    // Set marker size to ~1 % of max dimension (visible but not huge)
    this.markerManager.setMarkerSize(Math.max(0.5, maxDim * 0.012));

    this.fitCamera();
  }

  setModelVisibility(id: string, visible: boolean): void {
    this.modelManager.setVisibility(id, visible);
  }

  addMarker(x: number, y: number, z: number): void {
    this.markerManager.addMarker(x, y, z);
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

  /** Position the camera so it frames all loaded geometry. */
  private fitCamera(): void {
    const bounds = this.modelManager.getAllBounds();
    if (bounds.isEmpty()) return;

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
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

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 0.5);
    hemi.position.set(0, 50, 0);
    hemi.name = 'hemi';
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(20, 30, 10);
    key.name = 'key';
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-15, 10, -20);
    fill.name = 'fill';
    this.scene.add(fill);
  }

  /** Move directional / hemisphere lights outward to cover large geometry. */
  private scaleLights(extent: number): void {
    const factor = Math.max(1, extent / 30);
    for (const name of ['hemi', 'key', 'fill']) {
      const light = this.scene.getObjectByName(name);
      if (light) light.position.multiplyScalar(factor);
    }
  }

  /* ---- helpers (grid + axes) --------------------------------------- */

  private addHelpers(gridSize: number, divisions: number, axesLen: number): void {
    this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x6b7280, 0x374151);
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(axesLen);
    this.scene.add(this.axesHelper);
  }

  /** Replace helpers with ones scaled to the model extent. */
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