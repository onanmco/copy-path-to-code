import { describe, expect, test } from 'vitest';
import { formatCopyTarget } from '../../src/formatter';

describe('formatCopyTarget', () => {
  test('returns @<path> when selections array is empty', () => {
    expect(formatCopyTarget('/a/b.ts', [])).toBe('@/a/b.ts');
  });

  test('returns @<path> for a single empty selection (cursor only)', () => {
    expect(formatCopyTarget('/a/b.ts', [
      { startLine: 4, endLine: 4, endChar: 0, isEmpty: true },
    ])).toBe('@/a/b.ts');
  });

  test('renders a single-line selection as @<path>#L<n>', () => {
    expect(formatCopyTarget('/a/b.ts', [
      { startLine: 9, endLine: 9, endChar: 8, isEmpty: false },
    ])).toBe('@/a/b.ts#L10');
  });

  test('renders a multi-line selection as @<path>#L<start>-L<end>', () => {
    expect(formatCopyTarget('/a/b.ts', [
      { startLine: 9, endLine: 14, endChar: 5, isEmpty: false },
    ])).toBe('@/a/b.ts#L10-L15');
  });

  test('trims triple-click selection ending at column 0 of the next line', () => {
    // VS Code: triple-click on line 10 → start (9, 0), end (10, 0)
    expect(formatCopyTarget('/a/b.ts', [
      { startLine: 9, endLine: 10, endChar: 0, isEmpty: false },
    ])).toBe('@/a/b.ts#L10');
  });

  test('multi-cursor: sorts by start line and joins with ", "; empty cursor renders with its line', () => {
    const result = formatCopyTarget('C:\\src\\foo.ts', [
      { startLine: 39, endLine: 39, endChar: 0, isEmpty: true },     // line 40 empty cursor
      { startLine: 9, endLine: 12, endChar: 0, isEmpty: false },     // lines 10-12 (triple-click)
    ]);
    expect(result).toBe('@C:\\src\\foo.ts#L10-L12, @C:\\src\\foo.ts#L40');
  });

  test('preserves Windows path with backslashes verbatim', () => {
    expect(formatCopyTarget('C:\\Users\\developer\\foo.ts', [
      { startLine: 0, endLine: 0, endChar: 5, isEmpty: false },
    ])).toBe('@C:\\Users\\developer\\foo.ts#L1');
  });

  test('preserves POSIX path with forward slashes verbatim', () => {
    expect(formatCopyTarget('/Users/developer/foo.ts', [
      { startLine: 0, endLine: 0, endChar: 5, isEmpty: false },
    ])).toBe('@/Users/developer/foo.ts#L1');
  });
});
