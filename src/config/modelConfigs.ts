/**
 * Declarative per-model configuration.
 *
 * Each entry describes an OBJ asset to load, its display properties,
 * and the root-transform correction needed to bring the model from its
 * native coordinate system into the viewer's Y-up scene space.
 *
 * Both models come from Deswik.CAD which exports in a Z-up, UTM-scale
 * coordinate system.  The rotation correction (−90° around X) maps
 * Z-up → Y-up, which is the Three.js / WebGL convention.
 */

export interface ModelConfig {
  /** Unique identifier used for lookups and DOM data attributes */
  id: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** URL to the OBJ file (relative to the Vite public/ folder) */
  url: string;
  /** Whether the model is visible on first load */
  visible: boolean;
  /** Mesh colour (hex) – used when no MTL is provided */
  color: number;
  /**
   * Euler rotation correction applied to the model root group (radians).
   * Keeps the raw OBJ geometry untouched; the fix lives in one place.
   */
  rotation: { x: number; y: number; z: number };
}

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: 'rampa-este',
    label: '720 Rampa Este',
    url: '/models/720_RAMPA_ESTE.obj',
    visible: true,
    color: 0x3b82f6, // blue
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
  },
  {
    id: 'rse',
    label: 'RSE',
    url: '/models/RSE.obj',
    visible: true,
    color: 0xf59e0b, // amber
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
  },
];
