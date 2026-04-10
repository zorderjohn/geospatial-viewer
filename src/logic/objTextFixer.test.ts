import { describe, it, expect } from 'vitest';
import { fixObjDecimalSeparators } from './objTextFixer';

describe('fixObjDecimalSeparators', () => {
  it('replaces comma between digits with period', () => {
    const input = 'v 690758,534 4183382,918 722,556';
    expect(fixObjDecimalSeparators(input)).toBe(
      'v 690758.534 4183382.918 722.556',
    );
  });

  it('handles multiple commas in a single number', () => {
    // Edge case: "1,234,567" should become "1.234.567"
    // (only the digit-comma-digit pattern triggers)
    expect(fixObjDecimalSeparators('1,234,567')).toBe('1.234.567');
  });

  it('leaves non-numeric commas untouched', () => {
    // Group names, material names — commas not between digits
    expect(fixObjDecimalSeparators('usemtl mat_A, mat_B')).toBe(
      'usemtl mat_A, mat_B',
    );
  });

  it('leaves already-correct OBJ text unchanged', () => {
    const input = 'v 1.0 2.0 3.0\nf 1 2 3';
    expect(fixObjDecimalSeparators(input)).toBe(input);
  });

  it('handles empty string', () => {
    expect(fixObjDecimalSeparators('')).toBe('');
  });

  it('handles a realistic multi-line OBJ snippet', () => {
    const input = [
      '# Exported from Deswik.CAD',
      'mtllib model.mtl',
      'g GroupA',
      'usemtl material_1',
      'v 690758,53439713339 4183382,91830762708 722,55617042672',
      'v 690760,68368799996 4183384,52562800003 722,52911597849',
      'f 1 2 3',
    ].join('\n');

    const fixed = fixObjDecimalSeparators(input);

    expect(fixed).toContain('v 690758.53439713339 4183382.91830762708 722.55617042672');
    expect(fixed).toContain('v 690760.68368799996 4183384.52562800003 722.52911597849');
    // Non-vertex lines unchanged
    expect(fixed).toContain('# Exported from Deswik.CAD');
    expect(fixed).toContain('mtllib model.mtl');
    expect(fixed).toContain('f 1 2 3');
  });
});
