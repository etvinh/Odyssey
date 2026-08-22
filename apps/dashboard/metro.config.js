const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// pnpm keeps every package in a content-addressed store and links transitive
// deps inside each package's own node_modules. Metro therefore needs to watch
// the workspace root, follow symlinks, and — critically — keep hierarchical
// lookup ON, so a module can resolve its own nested dependencies by walking up
// from where it lives rather than only from the app root.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
