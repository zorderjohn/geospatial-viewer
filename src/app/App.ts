import { SceneController } from '../viewer/SceneController';

export class App {
  private readonly sceneController: SceneController;

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <div class="title-block">
            <h1>Squadmakers – Block 1 Viewer</h1>
            <p>Baseline Three.js scene bootstrap</p>
          </div>
        </header>

        <main class="main-content">
          <section id="viewport" class="viewport"></section>

          <aside class="sidebar">
            <h2>Current status</h2>
            <ul>
              <li>Renderer initialized</li>
              <li>Camera + orbit controls initialized</li>
              <li>Grid + axes helpers visible</li>
              <li>Lighting suitable for geometric inspection</li>
            </ul>

            <h2>Navigation</h2>
            <ul>
              <li>Left mouse: orbit</li>
              <li>Right mouse: pan</li>
              <li>Wheel: zoom</li>
            </ul>

            <h2>Next step</h2>
            <p>
              Add ModelManager + OBJ loading + per-model root transforms.
            </p>
          </aside>
        </main>
      </div>
    `;

    const viewport = this.root.querySelector<HTMLElement>('#viewport');

    if (!viewport) {
      throw new Error('Viewport element #viewport was not found.');
    }

    this.sceneController = new SceneController(viewport);
  }

  start(): void {
    this.sceneController.start();
  }

  dispose(): void {
    this.sceneController.dispose();
  }
}