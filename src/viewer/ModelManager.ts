import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import type { ModelConfig } from '../config/modelConfigs';
import { fixObjDecimalSeparators } from '../logic/objTextFixer';

/**
 * Loads OBJ models into a shared container, assigns materials, and
 * manages per-model visibility.
 *
 * This class does NOT own coordinate-system transforms.  All spatial
 * hierarchy (gis_root, offset) is managed by SceneController.
 * ModelManager simply adds parsed OBJ groups as children of the
 * container it receives.
 */

interface LoadedModel {
  config: ModelConfig;
  group: THREE.Group;
  material: THREE.MeshStandardMaterial;
}

export class ModelManager {
  private readonly loader = new OBJLoader();
  private readonly models = new Map<string, LoadedModel>();

  constructor(private readonly container: THREE.Object3D) {}

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /** Load all configured models into the container. */
  async loadAll(configs: ModelConfig[]): Promise<void> {
    const results = await Promise.allSettled(
      configs.map(c => this.loadModel(c)),
    );

    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('Model load failed:', r.reason);
      }
    }
  }

  setVisibility(id: string, visible: boolean): void {
    const m = this.models.get(id);
    if (m) m.group.visible = visible;
  }

  /**
   * AABB of all loaded geometry in raw GIS coordinates.
   *
   * Computed directly from geometry bounding boxes so it is independent
   * of any ancestor transforms (gisRoot rotation, offset position).
   */
  getLocalBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    const relativeMatrix = new THREE.Matrix4();
    this.container.updateMatrixWorld(true);
    const containerInverse = new THREE.Matrix4().copy(this.container.matrixWorld).invert();
    for (const { group } of this.models.values()) {
      group.traverse(child => {
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.computeBoundingBox();
          if (child.geometry.boundingBox) {
            const childBox = child.geometry.boundingBox.clone();

            // Transform child bounding box to container local space
            relativeMatrix.multiplyMatrices(containerInverse, child.matrixWorld);
            childBox.applyMatrix4(relativeMatrix);
            box.union(childBox);
          }
        }
      });
    }
    return box;
  }

  dispose(): void {
    for (const { group, material } of this.models.values()) {
      this.container.remove(group);
      material.dispose();
      group.traverse(child => {
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

    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        if (child.geometry && !child.geometry.getAttribute('normal')) {
          child.geometry.computeVertexNormals();
        }
      }
    });

    obj.name = `model-${config.id}`;
    obj.visible = config.visible;

    this.container.add(obj);
    this.models.set(config.id, { config, group: obj, material });
  }
}
