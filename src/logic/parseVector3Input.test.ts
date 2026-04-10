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

  it('rejects empty X', () => {
    const r = parseVector3Input('', '2', '3');
    expect(r).toEqual({ ok: false, error: 'X is empty' });
  });

  it('rejects empty Y', () => {
    const r = parseVector3Input('1', '  ', '3');
    expect(r).toEqual({ ok: false, error: 'Y is empty' });
  });

  it('rejects empty Z', () => {
    const r = parseVector3Input('1', '2', '');
    expect(r).toEqual({ ok: false, error: 'Z is empty' });
  });

  it('rejects non-numeric X', () => {
    const r = parseVector3Input('abc', '2', '3');
    expect(r).toEqual({ ok: false, error: 'X is not a valid number' });
  });

  it('rejects non-numeric Y', () => {
    const r = parseVector3Input('1', 'hello', '3');
    expect(r).toEqual({ ok: false, error: 'Y is not a valid number' });
  });

  it('rejects non-numeric Z', () => {
    const r = parseVector3Input('1', '2', '!@#');
    expect(r).toEqual({ ok: false, error: 'Z is not a valid number' });
  });

  it('rejects Infinity', () => {
    const r = parseVector3Input('Infinity', '0', '0');
    expect(r).toEqual({ ok: false, error: 'X must be finite' });
  });

  it('rejects -Infinity', () => {
    const r = parseVector3Input('0', '-Infinity', '0');
    expect(r).toEqual({ ok: false, error: 'Y must be finite' });
  });

  it('reports the first failing field', () => {
    // Both X and Y are bad — should report X first
    const r = parseVector3Input('', 'bad', '0');
    expect(r).toEqual({ ok: false, error: 'X is empty' });
  });
});
