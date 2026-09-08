const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch only necessary monorepo packages (packages/shared), NOT apps/web
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/shared'),
];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Block transient directories, apps/web, .next, and lock files from being watched
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : [config.resolver.blockList].filter(Boolean);

config.resolver.blockList = [
  ...existingBlockList,
  /.*[\\/]apps[\\/]web[\\/].*/,
  /.*[\\/]\.next[\\/].*/,
  /.*\.pnpm-task-run-state-v1.*/,
  /.*[\\/]\.pnpm-task-run-state-v1[\\/].*/,
  /.*\.lock$/,
];

module.exports = config;
