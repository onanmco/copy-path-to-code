import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('package.json', () => {
  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')
  );

  test('has keywords for marketplace discoverability', () => {
    expect(pkg.keywords).toBeDefined();
    expect(pkg.keywords.length).toBeGreaterThan(0);
  });
});
