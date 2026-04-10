import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneController {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;

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
    this.controls.maxDistance = 2000;

    this.addLighting();
    this.addReferenceHelpers();
    this.addReferenceGeometry();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });

    this.resizeObserver.observe(this.container);
    this.resize();
  }

  start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    const tick = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = window.requestAnimationFrame(tick);
    };

    tick();
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  }

  private addLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 0.5);
    hemi.position.set(0, 50, 0);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(20, 30, 10);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-15, 10, -20);
    this.scene.add(fill);
  }

  private addReferenceHelpers(): void {
    const grid = new THREE.GridHelper(100, 100, 0x6b7280, 0x374151);
    this.scene.add(grid);

    const axes = new THREE.AxesHelper(4);
    this.scene.add(axes);
  }

  private addReferenceGeometry(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.6,
      metalness: 0.05,
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0.5, 0);
    this.scene.add(cube);
  }
}