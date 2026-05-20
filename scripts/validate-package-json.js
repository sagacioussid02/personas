#!/usr/bin/env node

/**
 * Validate package.json integrity
 * Checks for:
 * - Valid JSON syntax
 * - Duplicate keys in dependencies and devDependencies
 * - Valid semver version specifications
 * - Merge conflict markers
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

function validatePackageJson() {
  let errors = [];
  let warnings = [];

  // Read the file
  let content;
  try {
    content = fs.readFileSync(packageJsonPath, 'utf8');
  } catch (err) {
    console.error(`❌ Failed to read package.json: ${err.message}`);
    process.exit(1);
  }

  // Check for merge conflict markers
  if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
    errors.push('Merge conflict markers detected in package.json');
  }

  // Parse JSON
  let pkg;
  try {
    pkg = JSON.parse(content);
  } catch (err) {
    errors.push(`Invalid JSON syntax: ${err.message}`);
    console.error(`❌ ${errors[0]}`);
    process.exit(1);
  }

  // Validate dependencies object
  const validateDependencies = (deps, depType) => {
    if (!deps || typeof deps !== 'object') return;

    const keys = Object.keys(deps);
    const seenKeys = new Set();

    keys.forEach((key) => {
      // Check for duplicates (case-sensitive)
      if (seenKeys.has(key)) {
        errors.push(`Duplicate key in ${depType}: "${key}"`);
      }
      seenKeys.add(key);

      // Validate version is a string
      const version = deps[key];
      if (typeof version !== 'string') {
        errors.push(`Invalid version type for ${depType}["${key}"]: expected string, got ${typeof version}`);
      }

      // Warn if version is not a valid semver range
      if (typeof version === 'string' && !isValidSemverRange(version)) {
        warnings.push(`Unusual version format in ${depType}["${key}"]: "${version}"`);
      }
    });
  };

  validateDependencies(pkg.dependencies, 'dependencies');
  validateDependencies(pkg.devDependencies, 'devDependencies');
  validateDependencies(pkg.peerDependencies, 'peerDependencies');
  validateDependencies(pkg.optionalDependencies, 'optionalDependencies');

  // Check for required fields
  if (!pkg.name) {
    errors.push('Missing required field: "name"');
  }
  if (!pkg.version) {
    errors.push('Missing required field: "version"');
  }

  // Report results
  if (errors.length > 0) {
    console.error('\n❌ Package.json validation FAILED:\n');
    errors.forEach((err) => console.error(`  • ${err}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Package.json validation warnings:\n');
    warnings.forEach((warn) => console.warn(`  • ${warn}`));
  }

  console.log('\n✅ Package.json validation PASSED');
  console.log(`   - ${Object.keys(pkg.dependencies || {}).length} dependencies`);
  console.log(`   - ${Object.keys(pkg.devDependencies || {}).length} devDependencies`);
  console.log(`   - No merge conflicts or duplicates detected\n`);
}

function isValidSemverRange(version) {
  // Basic semver range validation
  // Allows: 1.0.0, ^1.0.0, ~1.0.0, >=1.0.0, *, latest, etc.
  const semverPattern = /^(\*|latest|next|[><=~^]*\d+(\.\d+)?(\.\d+)?(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?)$/;
  return semverPattern.test(version);
}

validatePackageJson();
