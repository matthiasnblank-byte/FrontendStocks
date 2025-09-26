#!/usr/bin/env node
import { execSync } from 'node:child_process';

const allowedLicenses = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'Unlicense'
]);

function normalizeLicense(value) {
  if (!value) {
    return [];
  }
  if (typeof value === 'string') {
    return value.split(/\s+OR\s+|\s+\|\|\s+|\/|,/i).map((item) => item.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeLicense(item));
  }
  if (typeof value === 'object') {
    if (value.type) {
      return normalizeLicense(value.type);
    }
    if (value.license) {
      return normalizeLicense(value.license);
    }
  }
  return [];
}

function gatherPackages(tree, acc = new Map()) {
  if (!tree || typeof tree !== 'object') {
    return acc;
  }
  const { name, version, license, licenses, dependencies } = tree;
  if (name && version) {
    const key = `${name}@${version}`;
    if (!acc.has(key)) {
      const licenseValues = normalizeLicense(licenses ?? license);
      acc.set(key, { name, version, licenses: licenseValues });
    }
  }
  if (dependencies && typeof dependencies === 'object') {
    for (const dep of Object.values(dependencies)) {
      gatherPackages(dep, acc);
    }
  }
  return acc;
}

let output;
try {
  output = execSync('npm ls --json --long', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
} catch (error) {
  if (error.stdout) {
    output = error.stdout.toString();
  } else {
    console.error('Failed to inspect dependencies with npm ls');
    console.error(error.message);
    process.exit(1);
  }
}

let tree;
try {
  tree = JSON.parse(output);
} catch (error) {
  console.error('Unable to parse npm ls output as JSON');
  console.error(error.message);
  process.exit(1);
}

const packages = gatherPackages(tree);
const violations = [];

for (const pkg of packages.values()) {
  if (pkg.name === tree.name) {
    continue;
  }
  const licenses = pkg.licenses.length > 0 ? pkg.licenses : ['UNKNOWN'];
  const isAllowed = licenses.every((licenseId) => allowedLicenses.has(licenseId));
  if (!isAllowed) {
    violations.push({
      identifier: `${pkg.name}@${pkg.version}`,
      licenses
    });
  }
}

if (violations.length > 0) {
  console.error('License policy violations detected:');
  for (const violation of violations) {
    console.error(` - ${violation.identifier}: ${violation.licenses.join(', ')}`);
  }
  console.error('\nAllowed licenses:', Array.from(allowedLicenses).join(', '));
  process.exit(1);
}

console.log(`License check passed for ${packages.size - 1} dependencies.`);

