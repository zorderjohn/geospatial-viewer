/**
 * Declarative per-model configuration.
 *
 * Each entry describes an OBJ asset to load and its display properties.
 * All models are assumed to be in the same GIS coordinate system
 * (UTM-scale, Z-up).  The GIS → scene transform (Z-up → Y-up rotation
 * and origin centering) is applied once at the shared gis_root / offset
 * level in SceneController, not per-model.
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
}

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: 'rampa-este',
    label: '720 Rampa Este',
    url: '/models/720_RAMPA_ESTE.obj',
    visible: true,
    color: 0x3b82f6, // blue
  },
  {
    id: 'rse',
    label: 'RSE',
    url: '/models/RSE.obj',
    visible: true,
    color: 0xf59e0b, // amber
  },
];
