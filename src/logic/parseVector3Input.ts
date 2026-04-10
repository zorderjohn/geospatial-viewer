/**
 * Parses three string inputs into a validated { x, y, z } object.
 *
 * Returns a discriminated union so callers get either a typed Vec3
 * or a human-readable error message — no exceptions, no silent NaN.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type ParseResult =
  | { ok: true; value: Vec3 }
  | { ok: false; error: string };

export function parseVector3Input(
  xStr: string,
  yStr: string,
  zStr: string,
): ParseResult {
  const parts: { label: string; raw: string }[] = [
    { label: 'X', raw: xStr },
    { label: 'Y', raw: yStr },
    { label: 'Z', raw: zStr },
  ];

  const values: number[] = [];

  for (const { label, raw } of parts) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return { ok: false, error: `${label} is empty` };
    }
    const n = Number(trimmed);
    if (isNaN(n)) {
      return { ok: false, error: `${label} is not a valid number` };
    }
    if (!isFinite(n)) {
      return { ok: false, error: `${label} must be finite` };
    }
    values.push(n);
  }

  return { ok: true, value: { x: values[0], y: values[1], z: values[2] } };
}
