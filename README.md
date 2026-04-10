# Squadmakers – Geospatial 3D Viewer

A browser-based 3D viewer for geospatial OBJ models, built with **Three.js** and **TypeScript**.

Block 1 delivers loading, visualization, orientation correction, visibility control, and interactive marker placement for two mining-site OBJ files exported from Deswik.CAD.

---

## Stack

| Layer      | Tool             | Purpose                              |
|------------|------------------|--------------------------------------|
| Language   | TypeScript 5+    | Type safety, explicit interfaces     |
| Render     | Three.js 0.183   | WebGL scene graph, OBJ parsing       |
| Bundler    | Vite 8           | Fast HMR dev server + production build |
| Tests      | Vitest 4         | Unit test runner (same config as Vite) |
| UI         | Plain DOM + CSS  | No framework — minimal, reviewable   |

No React, no CSS framework, no state management library.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (opens at http://localhost:5173)
npm run dev

# 3. Run tests
npm run test

# 4. Type-check without emit
npm run typecheck

# 5. Production build (output in dist/)
npm run build
```

---

## OBJ Model Files

Place the two model files in `public/models/`:

```
public/
  models/
    720_RAMPA_ESTE.obj
    RSE.obj
```

Vite serves the `public/` directory statically, so the app fetches them at runtime via `/models/<filename>.obj`.

---

## How the Viewer Works

1. **Load** — both OBJ files are fetched as text, preprocessed (see below), and parsed by Three.js `OBJLoader`.
2. **Centre** — a shared world-centre is computed from the combined bounding box of all raw geometry. Every model is offset by `−worldCentre` so the scene sits near the origin (avoids WebGL float-precision issues with UTM-scale coordinates).
3. **Rotate** — each model root is rotated −90° around X to convert Deswik's Z-up coordinate system to Three.js's Y-up convention.
4. **Render** — the scene runs a standard requestAnimationFrame loop with OrbitControls for camera interaction.
5. **Markers** — the user enters X / Y / Z in scene-space coordinates and clicks "Add Marker" to place a red cube at that position.

### Comma-decimal fix

Deswik.CAD exports OBJ files with **commas as decimal separators** (European locale). The standard OBJ format uses periods. A preprocessing step (`fixObjDecimalSeparators`) replaces every comma between two digits with a period before handing the text to OBJLoader. This is the minimal, safe fix — it does not affect group names, material references, or face indices.

### Coordinate system & orientation correction

| Axis        | Deswik.CAD (raw OBJ)  | Three.js Scene (after fix) |
|-------------|------------------------|----------------------------|
| X           | Easting                | Right (easting)            |
| Y (raw) → Z | Northing              | Depth (−northing)          |
| Z (raw) → Y | Elevation             | Up (elevation)             |

The correction is a single Euler rotation `{ x: −π/2 }` applied to each **model root Group**. The raw geometry inside the OBJ objects is never modified — the fix lives in one transform node per model, making it trivial to review or adjust.

---

## Architecture

```
src/
  main.ts                        Entry point — mounts the App
  style.css                      All styles (no CSS framework)
  app/
    App.ts                       Application shell, DOM layout, wiring
  viewer/
    SceneController.ts           Scene, camera, renderer, controls, lights,
                                 helpers, render loop. Owns ModelManager
                                 and MarkerManager.
    ModelManager.ts              OBJ loading, material assignment, centering,
                                 rotation correction, visibility toggling.
    MarkerManager.ts             Creates / removes marker cubes in scene space.
    ControlPanel.ts              Plain-DOM controls (toggles, XYZ input, buttons).
  logic/
    objTextFixer.ts              Pure function: comma → period fix for OBJ text.
    parseVector3Input.ts         Pure function: parse & validate 3 string inputs
                                 into { x, y, z }.
    objTextFixer.test.ts         Unit tests for the OBJ fixer.
    parseVector3Input.test.ts    Unit tests for coordinate parsing.
  config/
    modelConfigs.ts              Declarative model definitions (paths, colours,
                                 rotation corrections, initial visibility).
```

### Responsibilities

| Module            | Responsibility                                      |
|-------------------|-----------------------------------------------------|
| `App`             | Bootstrap app shell and wire UI to scene systems    |
| `SceneController` | Own scene, camera, renderer, controls, and loop     |
| `ModelManager`    | Load models, apply root transforms, manage visibility |
| `MarkerManager`   | Create and clear marker entities                    |
| `ControlPanel`    | DOM controls for toggles and marker coordinate input |
| `modelConfigs`    | Declarative model metadata and transform corrections |
| `logic/*`         | Pure parsing and preprocessing utilities            |

### Scene-graph hierarchy (per model)

```
scene
 ├── model-root  (Euler rotation: Z-up → Y-up)
 │    └── offset  (position: −worldCentre)
 │         └── OBJ Group  (raw parsed geometry — untouched)
 ├── markers…     (direct scene children, scene-space coords)
 ├── GridHelper
 ├── AxesHelper
 └── Lights
```

This hierarchy keeps **model-local space** and **world placement** cleanly separated. The raw OBJ geometry is never mutated; all spatial corrections flow through the root Group transform.

---

## Technical Decisions & Trade-offs

| Decision | Rationale |
|----------|-----------|
| **Fetch + text preprocess instead of `OBJLoader.load()`** | Needed to fix comma decimals before parsing. Also avoids the callback-based API. |
| **Shared world-centre offset** | UTM coordinates (~690 000, ~4 183 000) would cause severe float jitter in WebGL. Subtracting a shared centre brings everything near the origin. |
| **One root Group per model** | Keeps orientation fix in a single transform node. Easy to extend with per-model scale or additional offset for future telemetry data. |
| **Markers in scene space** | Scene-space coordinates match what the user sees (grid, axes). Simple to verify visually. In production you'd add a GIS-coordinate input mode. |
| **Adaptive grid / axes / marker sizing** | Grid, axes helper, and marker cube size are recomputed after models load, scaled to ~1 % of the scene extent. Works regardless of model size. |
| **`DoubleSide` material** | Mining meshes often have inconsistent winding. DoubleSide avoids invisible back-faces at no meaningful cost for this model count. |
| **No MTL loading** | The OBJ files reference `.mtl` files that may or may not ship. Assigning a solid colour per model is sufficient for geometric inspection and avoids a loader dependency. |
| **No React / no state lib** | The UI is ~30 lines of DOM. A framework would add complexity with no benefit. |
| **Pure-logic tests only** | `parseVector3Input` and `objTextFixer` are pure functions, easy to test without DOM or WebGL mocking. Testing the Three.js render pipeline would require jsdom + WebGL stubs — not worth it for a coding exercise. |

---

## Controls

| Input | Action |
|-------|--------|
| Left-drag | Orbit camera |
| Right-drag | Pan camera |
| Scroll wheel | Zoom |
| Model checkboxes | Toggle visibility per model |
| X / Y / Z inputs + **Add Marker** | Place a red cube at the entered scene-space coordinates |
| **Clear All** | Remove all markers |

**Coordinate hints:** `Y` is up (elevation). `(0, 0, 0)` is the centroid of all loaded geometry. The grid lies on the XZ plane.

---

## Known Limitations / Next Steps

- **No GIS coordinate input** — markers use scene-local coords. A future version could accept raw UTM easting/northing/elevation and convert.
- **No MTL / texture support** — models render with solid colours.
- **No streaming / real-time telemetry** — the architecture (root-group transforms, world-centre offset) is designed to accommodate this in a future block.
- **Single-threaded OBJ parsing** — adequate for these file sizes (~300 KB and ~1.5 MB). For larger datasets, a Web Worker pipeline would help.
- **No LOD / instancing** — not needed at current polygon counts.
- **Marker management is basic** — no labels, no selection, no persistence. Sufficient for Block 1 verification.

---

## License

Private — Squadmakers coding challenge submission.
