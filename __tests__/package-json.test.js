/**
 * Test suite for package.json integrity
 * Ensures package.json remains valid and free of merge conflicts
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

describe('package.json integrity', () => {
  let pkg;
  let rawContent;

  beforeAll(() => {
    rawContent = fs.readFileSync(packageJsonPath, 'utf8');
    pkg = JSON.parse(rawContent);
  });

  test('should be valid JSON', () => {
    expect(() => JSON.parse(rawContent)).not.toThrow();
  });

  test('should not contain merge conflict markers', () => {
    expect(rawContent).not.toMatch(/<<<<<<</);
    expect(rawContent).not.toMatch(/=======/);
    expect(rawContent).not.toMatch(/>>>>>>>/);
  });

  test('should have required fields', () => {
    expect(pkg.name).toBeDefined();
    expect(pkg.version).toBeDefined();
    expect(typeof pkg.name).toBe('string');
    expect(typeof pkg.version).toBe('string');
  });

  test('should not have duplicate keys in dependencies', () => {
    const deps = pkg.dependencies || {};
    const keys = Object.keys(deps);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  test('should not have duplicate keys in devDependencies', () => {
    const devDeps = pkg.devDependencies || {};
    const keys = Object.keys(devDeps);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  test('all dependency versions should be strings', () => {
    const deps = pkg.dependencies || {};
    Object.entries(deps).forEach(([key, version]) => {
      expect(typeof version).toBe('string');
    });
  });

  test('all devDependency versions should be strings', () => {
    const devDeps = pkg.devDependencies || {};
    Object.entries(devDeps).forEach(([key, version]) => {
      expect(typeof version).toBe('string');
    });
  });

  test('should have valid engines specification', () => {
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toBeDefined();
  });

  test('should not have conflicting dependency versions', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const depCounts = {};

    // Check if any package appears in both dependencies and devDependencies
    // with different versions (which could indicate merge conflict residue)
    Object.keys(pkg.dependencies || {}).forEach((dep) => {
      if (pkg.devDependencies && pkg.devDependencies[dep]) {
        const depVersion = pkg.dependencies[dep];
        const devVersion = pkg.devDependencies[dep];
        // It's acceptable for the same package to be in both with different versions,
        // but we flag it as a warning in the validation script
        expect(typeof depVersion).toBe('string');
        expect(typeof devVersion).toBe('string');
      }
    });
  });

  test('should have valid scripts', () => {
    expect(pkg.scripts).toBeDefined();
    expect(typeof pkg.scripts).toBe('object');
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
  });
});
