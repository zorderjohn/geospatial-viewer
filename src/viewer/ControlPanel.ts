import type { ModelConfig } from '../config/modelConfigs';
import { parseVector3Input } from '../logic/parseVector3Input';

/**
 * Plain-DOM control panel that lives in the sidebar.
 *
 * Responsibilities:
 *  - model show/hide toggles
 *  - GIS coordinate input (easting / northing / elevation) + add-marker button
 *  - clear-markers button
 *  - navigation hints
 *
 * No framework, no state library — just vanilla DOM event wiring.
 */

export interface ControlPanelCallbacks {
  onToggleModel: (id: string, visible: boolean) => void;
  onAddMarker: (easting: number, northing: number, elevation: number) => void;
  onClearMarkers: () => void;
}

export class ControlPanel {
  private readonly el: HTMLElement;

  constructor(
    container: HTMLElement,
    models: ModelConfig[],
    callbacks: ControlPanelCallbacks,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'control-panel';

    this.el.innerHTML = `
      <h2>Models</h2>
      <div class="model-toggles">
        ${models
          .map(
            m => `
          <label class="toggle-row">
            <input type="checkbox" data-model-id="${m.id}" ${m.visible ? 'checked' : ''} />
            <span class="toggle-label" style="border-left:3px solid #${m.color.toString(16).padStart(6, '0')};padding-left:8px">
              ${m.label}
            </span>
          </label>`,
          )
          .join('')}
      </div>

      <h2>Place Marker</h2>
      <div class="marker-inputs">
        <label>Easting <input type="number" id="marker-easting" step="any" value="0" /></label>
        <label>Northing <input type="number" id="marker-northing" step="any" value="0" /></label>
        <label>Elevation <input type="number" id="marker-elevation" step="any" value="0" /></label>
      </div>
      <div class="marker-actions">
        <button id="btn-add-marker">Add Marker</button>
        <button id="btn-clear-markers" class="btn-secondary">Clear All</button>
      </div>
      <p class="hint">GIS coordinates (same frame as the OBJ models).</p>
      <div id="marker-status" class="status-text"></div>

      <h2>Navigation</h2>
      <ul class="nav-hints">
        <li>Left-drag → orbit</li>
        <li>Right-drag → pan</li>
        <li>Scroll → zoom</li>
      </ul>
    `;

    container.appendChild(this.el);

    // --- wire model toggles ---
    this.el
      .querySelectorAll<HTMLInputElement>('[data-model-id]')
      .forEach(cb => {
        cb.addEventListener('change', () => {
          callbacks.onToggleModel(cb.dataset.modelId!, cb.checked);
        });
      });

    // --- wire marker controls ---
    const eIn = this.el.querySelector<HTMLInputElement>('#marker-easting')!;
    const nIn = this.el.querySelector<HTMLInputElement>('#marker-northing')!;
    const elIn = this.el.querySelector<HTMLInputElement>('#marker-elevation')!;
    const status = this.el.querySelector<HTMLElement>('#marker-status')!;

    this.el.querySelector('#btn-add-marker')!.addEventListener('click', () => {
      const result = parseVector3Input(eIn.value, nIn.value, elIn.value);
      if (!result.ok) {
        status.textContent = result.error;
        status.className = 'status-text error';
        return;
      }
      const { x, y, z } = result.value;
      callbacks.onAddMarker(x, y, z);
      status.textContent = `Marker at E${x} N${y} El${z}`;
      status.className = 'status-text success';
    });

    this.el
      .querySelector('#btn-clear-markers')!
      .addEventListener('click', () => {
        callbacks.onClearMarkers();
        status.textContent = 'Markers cleared.';
        status.className = 'status-text';
      });
  }
}
