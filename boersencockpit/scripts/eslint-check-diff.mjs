#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';

const execa = (command) => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (error.stdout) {
      return error.stdout.toString().trim();
    }
    return '';
  }
};

const resolveBase = () => {
  if (process.env.ESLINT_DIFF_BASE) {
    return process.env.ESLINT_DIFF_BASE;
  }
  if (process.env.GITHUB_BASE_REF) {
    return `origin/${process.env.GITHUB_BASE_REF}`;
  }
  const symbolic = execa('git symbolic-ref refs/remotes/origin/HEAD');
  if (symbolic) {
    return `origin/${symbolic.split('/').pop()}`;
  }
  return 'HEAD';
};

const baseRef = resolveBase();
let diffExpression = baseRef;
if (!baseRef || baseRef === 'HEAD') {
  diffExpression = 'HEAD';
} else if (!baseRef.includes('..')) {
  diffExpression = `${baseRef}...HEAD`;
}

const baseTarget = diffExpression === 'HEAD' ? null : diffExpression.split('...')[0].split('..')[0];
if (baseTarget) {
  try {
    execSync(`git rev-parse ${baseTarget}`, { stdio: 'ignore' });
  } catch (error) {
    diffExpression = 'HEAD';
  }
}

const diffCommand =
  diffExpression === 'HEAD'
    ? 'git diff --diff-filter=ACMR --name-only HEAD'
    : `git diff --diff-filter=ACMR --name-only ${diffExpression}`;
const output = execa(diffCommand);
const repoRoot = execa('git rev-parse --show-toplevel') || process.cwd();
const files = output
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean)
  .map((file) => path.relative(process.cwd(), path.resolve(repoRoot, file)))
  .filter((file) => !file.startsWith('..'))
  .filter((file) => file.match(/\.(ts|html)$/i));

if (files.length === 0) {
  console.log('No files to lint.');
  process.exit(0);
}

const result = spawnSync('npx', ['eslint', '--max-warnings=0', ...files], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

