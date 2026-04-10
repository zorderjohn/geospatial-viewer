/**
 * Fixes OBJ text exported with commas as decimal separators.
 *
 * European-locale CAD tools (e.g. Deswik.CAD) write vertex data like:
 *   v 690758,534  4183382,918  722,556
 * The standard OBJ format (and Three.js OBJLoader) expects periods:
 *   v 690758.534  4183382.918  722.556
 *
 * The regex replaces every comma that sits between two digits with a period.
 * This is safe because OBJ keywords, group names, material names, and face
 * indices never contain digit-comma-digit sequences.
 */
export function fixObjDecimalSeparators(text: string): string {
  return text.replace(/(\d),(\d)/g, '$1.$2');
}
