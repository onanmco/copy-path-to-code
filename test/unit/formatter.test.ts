import { describe, expect, test } from 'vitest';
import { formatCopyTarget } from '../../src/formatter';
import { formatNotificationText } from '../../src/formatter';

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

describe('formatNotificationText', () => {
  test('short path returns single line', () => {
    const result = formatNotificationText('/home/user/file.ts', []);
    expect(result).toBe('Copied: @/home/user/file.ts');
  });

  test('short path with line range returns single line', () => {
    const result = formatNotificationText('/home/user/file.ts', [
      { startLine: 9, endLine: 9, endChar: 5, isEmpty: false },
    ]);
    expect(result).toBe('Copied: @/home/user/file.ts#L10');
  });

  test('path at exactly 60 chars stays single line', () => {
    // "Copied: @" (9) + path (47) + "#L10" (4) = 60 total
    const path = '/' + 'x'.repeat(46);
    const result = formatNotificationText(path, [
      { startLine: 9, endLine: 9, endChar: 5, isEmpty: false },
    ]);
    expect(result).not.toContain('\n');
  });

  test('path just over 60 chars wraps to multi-line', () => {
    const path = '/x'.repeat(60); // long enough that Copied: @/xxxx... > 60
    const result = formatNotificationText(path, []);
    expect(result).toContain('\n');
    expect(result.startsWith('Copied:\n  @/')).toBe(true);
  });

  test('long POSIX path breaks at forward slashes with indent', () => {
    // 68-char content -> wraps at last / before pos 60 (position 51, the / after "to")
    const result = formatNotificationText(
      '/very/long/nested/deep/directory/structure/path/to/file.ts',
      [{ startLine: 9, endLine: 14, endChar: 5, isEmpty: false }]
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('Copied:');
    expect(lines[1]).toMatch(/^  @\/very\/long\/nested\/deep\/directory\/structure\/path\/to\/$/);
    expect(lines[2]).toMatch(/^  file\.ts#L10-L15$/);
  });

  test('long Windows path breaks at backslashes with indent', () => {
    // 70-char content -> wraps at last \ before pos 60 (position 51, the \ after "directory")
    const result = formatNotificationText(
      'C:\\Users\\developer\\very\\long\\nested\\deep\\directory\\structure\\file.ts',
      []
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('Copied:');
    expect(lines[1]).toMatch(/^  @C:\\Users\\developer\\very\\long\\nested\\deep\\directory\\$/);
    expect(lines[2]).toMatch(/^  structure\\file\.ts$/);
  });

  test('empty selections with long path wraps path only', () => {
    // 68-char content -> wraps
    const result = formatNotificationText(
      '/very/long/nested/deep/directory/structure/path/to/file.ts',
      []
    );
    expect(result).toContain('\n');
    expect(result).toContain('file.ts');
    expect(result).not.toContain('#L');
  });

  test('multi-cursor short path stays single line', () => {
    const result = formatNotificationText('/home/user/file.ts', [
      { startLine: 0, endLine: 0, endChar: 5, isEmpty: false },
      { startLine: 5, endLine: 5, endChar: 3, isEmpty: false },
    ]);
    expect(result).toBe('Copied: @/home/user/file.ts#L1, @/home/user/file.ts#L6');
  });

  test('multi-cursor long path wraps each ref independently', () => {
    const result = formatNotificationText(
      'C:\\Users\\developer\\very\\long\\nested\\deep\\directory\\structure\\file.ts',
      [
        { startLine: 9, endLine: 14, endChar: 5, isEmpty: false },
        { startLine: 39, endLine: 39, endChar: 0, isEmpty: true },
      ]
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('Copied:');
    // first ref wraps
    expect(lines[1]).toContain('#L10-L15');
    // second ref starts on its own set of lines after ',\n  @'
    expect(lines[3]).toMatch(/^  @C:\\Users\\developer\\very\\long\\nested\\deep\\directory\\$/);
    const body = lines.slice(1).join('\n');
    expect(body).toContain(',\n  @');
    expect(body).toContain('#L40');
  });

  test('short single-segment path stays single line', () => {
    const result = formatNotificationText('/file.ts', []);
    expect(result).toBe('Copied: @/file.ts');
  });

  test('single very long path segment stays on its own line', () => {
    const longName = '/verylongfilename' + 'x'.repeat(60) + '.ts';
    const result = formatNotificationText(longName, []);
    // No separators to break on — stays as one wrapped line
    expect(result.startsWith('Copied:\n  @')).toBe(true);
    expect(result.split('\n').length).toBe(2); // header + one content line
  });
});
