#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const pnpmDir = path.join(workspaceRoot, 'node_modules', '.pnpm');
const SUFFIX_PATTERN = / 2(?=\.)/;

function findPackageRoots() {
  if (!fs.existsSync(pnpmDir)) {
    return [];
  }

  const roots = [];
  for (const entry of fs.readdirSync(pnpmDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules') continue;
    const pkgNodeModules = path.join(pnpmDir, entry.name, 'node_modules');
    if (fs.existsSync(pkgNodeModules) && fs.statSync(pkgNodeModules).isDirectory()) {
      roots.push(pkgNodeModules);
    }
  }
  return roots;
}

function renameBrokenFiles(rootDir) {
  const queue = [rootDir];
  const renamed = [];
  while (queue.length > 0) {
    const dir = queue.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const currentPath = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        queue.push(currentPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.includes(' 2.')) {
        continue;
      }
      const targetName = entry.name.replace(SUFFIX_PATTERN, '');
      if (targetName === entry.name) {
        continue;
      }
      const targetPath = path.join(dir, targetName);
      if (fs.existsSync(targetPath)) {
        continue;
      }
      fs.renameSync(currentPath, targetPath);
      renamed.push(path.relative(rootDir, targetPath));
    }
  }
  return renamed;
}

function main() {
  const targets = findPackageRoots();
  if (targets.length === 0) {
    return;
  }
  let total = 0;
  for (const root of targets) {
    const renamed = renameBrokenFiles(root);
    if (renamed.length > 0) {
      total += renamed.length;
      console.log(`Fixed ${renamed.length} files under ${path.relative(workspaceRoot, root)}`);
    }
  }
  if (total > 0) {
    console.log(`Renamed ${total} artefacts with unexpected \" 2\" suffixes.`);
  }
}

main();
