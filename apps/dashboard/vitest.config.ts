import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

/**
 * Resolved from this app rather than named, because pnpm's strict layout means
 * packages/ui cannot see react-native-web from its own node_modules — and the
 * component under test is imported from there.
 */
const reactNativeWeb = require.resolve("react-native-web");

export default defineConfig({
  test: {
    // Pure-logic suites do not need a DOM, but the component-state suites do,
    // and one environment for the package keeps the config honest.
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    server: {
      deps: {
        /**
         * React Native packages and this workspace's own packages ship
         * untranspiled sources, which vitest leaves alone by default because
         * they sit in node_modules. Inlining routes them through the same
         * transform the test files use.
         */
        inline: [/react-native/, /@odyssey\//],
      },
    },
  },
  resolve: {
    /**
     * The same substitution Expo makes when it builds for web. Without it the
     * component tests would import React Native's native modules, which have no
     * implementation off-device.
     */
    alias: {
      "react-native": reactNativeWeb,
      "react-native-svg": new URL("./tests/stubs/react-native-svg.tsx", import.meta.url).pathname,
    },
    /**
     * `.web.js` first, the way Metro resolves for web. Packages like
     * react-native-svg ship a web build beside the native one and pick between
     * them by extension; without this, the native file loads and its Flow
     * syntax fails to parse.
     */
    extensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json", ".mjs"],
  },
});
