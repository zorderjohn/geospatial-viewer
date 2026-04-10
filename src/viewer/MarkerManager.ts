import * as THREE from 'three';

/**
 * Creates and manages marker entities (small cubes) in scene space.
 *
 * Markers are direct children of the scene, so their position matches
 * the coordinate system the user sees (grid, axes, camera).
 */
export class MarkerManager {
  private readonly markers: THREE.Mesh[] = [];
  private markerSize = 3;

  constructor(private readonly parent: THREE.Object3D) {}

  /** Update default size for future markers (e.g. after model extent is known). */
  setMarkerSize(size: number): void {
    this.markerSize = size;
  }

  addMarker(x: number, y: number, z: number): void {
    const s = this.markerSize;
    const geometry = new THREE.BoxGeometry(s, s, s);

    const material = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      emissive: 0xef4444,
      emissiveIntensity: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);

    // White wireframe overlay so the marker is visible from any angle / distance
    const edges = new THREE.EdgesGeometry(geometry);
    const wire = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xffffff }),
    );
    mesh.add(wire);

    this.parent.add(mesh);
    this.markers.push(mesh);
  }

  clearMarkers(): void {
    for (const m of this.markers) {
      this.parent.remove(m);
      m.geometry.dispose();
      if (m.material instanceof THREE.Material) m.material.dispose();
    }
    this.markers.length = 0;
  }

  get count(): number {
    return this.markers.length;
  }

  dispose(): void {
    this.clearMarkers();
  }
}
