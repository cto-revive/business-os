import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const packagesRoot = join(root, 'packages');
const packageDirs = (await readdir(packagesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const manifests = new Map();
const failures = [];

for (const dir of packageDirs) {
  const packageDir = join(packagesRoot, dir);
  const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'));
  const packageName = manifest.name;
  if (!packageName?.startsWith('@business-os/'))
    failures.push(`${dir}: package name must use @business-os scope`);
  if (!manifest.exports?.['.']) failures.push(`${packageName}: missing root package export`);
  if (!manifest.businessOs?.layer)
    failures.push(`${packageName}: missing businessOs.layer metadata`);
  if (!manifest.businessOs?.owner)
    failures.push(`${packageName}: missing businessOs.owner metadata`);
  const dependencies = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
  };
  for (const [name, version] of Object.entries(dependencies)) {
    if (name.startsWith('@business-os/') && !String(version).startsWith('workspace:')) {
      failures.push(`${packageName}: workspace dependency ${name} must use workspace: protocol`);
    }
  }
  manifests.set(packageName, { dir, packageDir, manifest, dependencies });
}

const knownPackages = new Set(manifests.keys());
const graph = new Map([...knownPackages].map((name) => [name, new Set()]));
const sourcePattern =
  /\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]|\bimport\s*\(['"]([^'"]+)['"]\)/g;
const forbiddenFrameworks = [
  '@nestjs/',
  'express',
  'fastify',
  'typeorm',
  'prisma',
  'drizzle-orm',
  'pg',
  'mysql2',
  'mongodb',
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'dist') files.push(...(await sourceFiles(full)));
    else if (entry.isFile() && /\.(ts|mts|js|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const [packageName, info] of manifests) {
  const layer = info.manifest.businessOs.layer;
  for (const file of await sourceFiles(join(info.packageDir, 'src'))) {
    const source = await readFile(file, 'utf8');
    let match;
    while ((match = sourcePattern.exec(source)) !== null) {
      const specifier = match[1] ?? match[2];
      if (!specifier) continue;
      if (specifier.startsWith('@business-os/')) {
        const target = [...knownPackages].find(
          (name) => specifier === name || specifier.startsWith(`${name}/`),
        );
        if (!target) {
          failures.push(`${relative(root, file)}: unknown workspace import ${specifier}`);
          continue;
        }
        if (specifier !== target)
          failures.push(`${relative(root, file)}: deep/private import ${specifier}; use ${target}`);
        if (target !== packageName && !Object.hasOwn(info.dependencies, target)) {
          failures.push(`${packageName}: undeclared workspace dependency ${target}`);
        }
        if (target !== packageName) graph.get(packageName).add(target);
      }
      if (specifier.startsWith('../') && specifier.includes('/packages/')) {
        failures.push(`${relative(root, file)}: cross-package relative import ${specifier}`);
      }
      if (
        layer !== 'delivery' &&
        !(layer === 'infrastructure' && specifier === 'pg') &&
        forbiddenFrameworks.some(
          (prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`),
        )
      ) {
        failures.push(
          `${relative(root, file)}: forbidden framework/provider import ${specifier} in ${layer} package`,
        );
      }
    }
    sourcePattern.lastIndex = 0;
  }
}

const visiting = new Set();
const visited = new Set();
function visit(name, path = []) {
  if (visiting.has(name)) {
    failures.push(`circular workspace dependency: ${[...path, name].join(' -> ')}`);
    return;
  }
  if (visited.has(name)) return;
  visiting.add(name);
  for (const target of graph.get(name) ?? []) visit(target, [...path, name]);
  visiting.delete(name);
  visited.add(name);
}
for (const name of knownPackages) visit(name);

if (failures.length) {
  console.error('Architecture validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Architecture validation passed for ${knownPackages.size} packages.`);
