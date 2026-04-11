import { SceneController } from '../viewer/SceneController';
import { ControlPanel } from '../viewer/ControlPanel';
import { MODEL_CONFIGS } from '../config/modelConfigs';

/**
 * Application root — creates the DOM shell, instantiates the 3D scene
 * and the control panel, and wires them together.
 */
export class App {
  private readonly sceneController: SceneController;

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <div class="title-block">
            <h1>Squadmakers – Geospatial Viewer</h1>
            <p>Block 1 · OBJ Loading &amp; Marker Placement</p>
          </div>
        </header>

        <main class="main-content">
          <section id="viewport" class="viewport"></section>
          <aside id="sidebar" class="sidebar"></aside>
        </main>
      </div>
    `;

    const viewport = this.root.querySelector<HTMLElement>('#viewport');
    const sidebar = this.root.querySelector<HTMLElement>('#sidebar');

    if (!viewport) throw new Error('#viewport not found');
    if (!sidebar) throw new Error('#sidebar not found');

    this.sceneController = new SceneController(viewport);

    // Build the control panel (static config — works before models finish loading)
    new ControlPanel(sidebar, MODEL_CONFIGS, {
      onToggleModel: (id, visible) =>
        this.sceneController.setModelVisibility(id, visible),
      onAddMarker: (e, n, el) => this.sceneController.addMarker(e, n, el),
      onClearMarkers: () => this.sceneController.clearMarkers(),
    });

    // Kick off async model loading (render loop already shows grid + axes)
    this.sceneController.loadModels(MODEL_CONFIGS).catch(err => {
      console.error('Model loading failed:', err);
    });
  }

  start(): void {
    this.sceneController.start();
  }

  dispose(): void {
    this.sceneController.dispose();
  }
}