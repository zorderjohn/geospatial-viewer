import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import type { ModelConfig } from '../config/modelConfigs';
import { fixObjDecimalSeparators } from '../logic/objTextFixer';

/**
 * Loads OBJ models, manages per-model root transforms, and handles
 * centering of large-coordinate geospatial geometry.
 *
 * Scene-graph hierarchy per model:
 *
 *   root  (Euler rotation correction — e.g. Z-up → Y-up)
 *     └─ offset  (translation by −worldCenter to bring geometry near origin)
 *          └─ obj  (raw parsed OBJ group — geometry stays untouched)
 */

interface LoadedModel {
  config: ModelConfig;
  root: THREE.Group;
  offset: THREE.Group;
  obj: THREE.Group;
  material: THREE.MeshStandardMaterial;
}

export class ModelManager {
  private readonly loader = new OBJLoader();
  private readonly models = new Map<string, LoadedModel>();
  private readonly worldCenter = new THREE.Vector3();

  constructor(private readonly parent: THREE.Object3D) {}

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /** Load all configured models, compute shared center, apply transforms. */
  async loadAll(configs: ModelConfig[]): Promise<void> {
    const results = await Promise.allSettled(
      configs.map(c => this.loadModel(c)),
    );

    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('Model load failed:', r.reason);
      }
    }

    this.centerAndTransform();
  }

  setVisibility(id: string, visible: boolean): void {
    const m = this.models.get(id);
    if (m) m.root.visible = visible;
  }

  getWorldCenter(): THREE.Vector3 {
    return this.worldCenter.clone();
  }

  /** Axis-aligned bounding box of all *visible* models in scene space. */
  getSceneBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    for (const { root } of this.models.values()) {
      if (root.visible) box.expandByObject(root);
    }
    return box;
  }

  /** AABB of *all* models (visible or not) in scene space. */
  getAllBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    for (const { root } of this.models.values()) {
      box.expandByObject(root);
    }
    return box;
  }

  dispose(): void {
    for (const { root, material } of this.models.values()) {
      this.parent.remove(root);
      material.dispose();
      root.traverse(child => {
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.dispose();
        }
      });
    }
    this.models.clear();
  }

  /* ------------------------------------------------------------------ */
  /*  Internal                                                           */
  /* ------------------------------------------------------------------ */

  private async loadModel(config: ModelConfig): Promise<void> {
    const response = await fetch(config.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${config.url}`);
    }

    const rawText = await response.text();
    const fixedText = fixObjDecimalSeparators(rawText);
    const obj = this.loader.parse(fixedText);

    // Apply a default material (the OBJs have no MTL)
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        // OBJ has no normals → compute for proper shading
        if (child.geometry && !child.geometry.getAttribute('normal')) {
          child.geometry.computeVertexNormals();
        }
      }
    });

    // Build the root → offset → obj hierarchy (transforms applied later)
    const offset = new THREE.Group();
    offset.name = `offset-${config.id}`;
    offset.add(obj);

    const root = new THREE.Group();
    root.name = `model-${config.id}`;
    root.add(offset);

    this.parent.add(root);
    this.models.set(config.id, { config, root, offset, obj, material });
  }

  /**
   * Compute a shared world center from raw (un-transformed) geometry,
   * then apply centering offset and rotation correction to every model.
   *
   * Must be called BEFORE any rotation is set — otherwise the bounding-
   * box calculation would include the rotation and give a wrong center.
   */
  private centerAndTransform(): void {
    // 1. Combined AABB of all raw geometry (no transforms yet)
    const combined = new THREE.Box3();
    for (const { obj } of this.models.values()) {
      combined.expandByObject(obj);
    }
    if (combined.isEmpty()) return;

    combined.getCenter(this.worldCenter);

    // 2. Centre each model and apply rotation
    for (const { config, root, offset } of this.models.values()) {
      offset.position.set(
        -this.worldCenter.x,
        -this.worldCenter.y,
        -this.worldCenter.z,
      );

      root.rotation.set(
        config.rotation.x,
        config.rotation.y,
        config.rotation.z,
      );

      root.visible = config.visible;
    }
  }
}
