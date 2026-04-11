import { describe, it, expect } from 'vitest';
import { parseVector3Input } from './parseVector3Input';

describe('parseVector3Input', () => {
  /* ---------- valid inputs ---------- */

  it('parses three valid integers', () => {
    const r = parseVector3Input('1', '2', '3');
    expect(r).toEqual({ ok: true, value: { x: 1, y: 2, z: 3 } });
  });

  it('parses three valid floats', () => {
    const r = parseVector3Input('1.5', '-2.75', '0.001');
    expect(r).toEqual({ ok: true, value: { x: 1.5, y: -2.75, z: 0.001 } });
  });

  it('parses negative numbers', () => {
    const r = parseVector3Input('-10', '-20', '-30');
    expect(r).toEqual({ ok: true, value: { x: -10, y: -20, z: -30 } });
  });

  it('parses zero values', () => {
    const r = parseVector3Input('0', '0', '0');
    expect(r).toEqual({ ok: true, value: { x: 0, y: 0, z: 0 } });
  });

  it('trims whitespace around valid numbers', () => {
    const r = parseVector3Input('  5 ', ' -3.2 ', '  0  ');
    expect(r).toEqual({ ok: true, value: { x: 5, y: -3.2, z: 0 } });
  });

  it('handles scientific notation', () => {
    const r = parseVector3Input('1e2', '2.5e-3', '-1E4');
    expect(r).toEqual({ ok: true, value: { x: 100, y: 0.0025, z: -10000 } });
  });

  /* ---------- invalid inputs ---------- */

  it('rejects empty Easting', () => {
    const r = parseVector3Input('', '2', '3');
    expect(r).toEqual({ ok: false, error: 'Easting is empty' });
  });

  it('rejects empty Northing', () => {
    const r = parseVector3Input('1', '  ', '3');
    expect(r).toEqual({ ok: false, error: 'Northing is empty' });
  });

  it('rejects empty Elevation', () => {
    const r = parseVector3Input('1', '2', '');
    expect(r).toEqual({ ok: false, error: 'Elevation is empty' });
  });

  it('rejects non-numeric Easting', () => {
    const r = parseVector3Input('abc', '2', '3');
    expect(r).toEqual({ ok: false, error: 'Easting is not a valid number' });
  });

  it('rejects non-numeric Northing', () => {
    const r = parseVector3Input('1', 'hello', '3');
    expect(r).toEqual({ ok: false, error: 'Northing is not a valid number' });
  });

  it('rejects non-numeric Elevation', () => {
    const r = parseVector3Input('1', '2', '!@#');
    expect(r).toEqual({ ok: false, error: 'Elevation is not a valid number' });
  });

  it('rejects Infinity', () => {
    const r = parseVector3Input('Infinity', '0', '0');
    expect(r).toEqual({ ok: false, error: 'Easting must be finite' });
  });

  it('rejects -Infinity', () => {
    const r = parseVector3Input('0', '-Infinity', '0');
    expect(r).toEqual({ ok: false, error: 'Northing must be finite' });
  });

  it('reports the first failing field', () => {
    // Both Easting and Northing are bad — should report Easting first
    const r = parseVector3Input('', 'bad', '0');
    expect(r).toEqual({ ok: false, error: 'Easting is empty' });
  });
});
