import { defineConfig } from "vitest/config";

// The server routes are tested as plain h3 handlers, without building the Nuxt app.
export default defineConfig({
  resolve: {
    alias: [
      // "#imports" is a Nitro virtual module. The stub provides what the server
      // utilities of nuxt-auth-utils read from it.
      // A leading slash is resolved against the project root.
      { find: "#imports", replacement: "/test/stubs/nitro-imports.ts" },
      // "~~" is the Nuxt alias for the project root.
      { find: /^~~\//, replacement: "/" },
    ],
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Replaces the Azure SDK with an in-memory vault and provides the names
    // Nitro auto-imports. See test/setup.ts.
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      // TypeScript sources only. Vue components are not measured, because this
      // setup has no Vue plugin. No thresholds: the figure is reported, not enforced.
      include: ["server/**/*.ts", "app/**/*.ts", "types/**/*.ts"],
      reporter: ["text", "text-summary"],
    },
    server: {
      deps: {
        // Transform the package so the "#imports" alias applies inside it.
        inline: ["nuxt-auth-utils"],
      },
    },
  },
});
