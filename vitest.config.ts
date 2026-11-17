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
      // The measured set: the server and the logic that is not a component.
      // A new TypeScript file in one of these places is measured from the
      // day it is added, tested or not.
      include: [
        // Routes, services and server utilities.
        "server/**/*.ts",
        // Types shared by server and client. The file holds an enum, which is code.
        "types/**/*.ts",
        // Client-side logic outside components: composables, route middleware, utilities.
        "app/**/*.ts",
      ],
      exclude: [
        // Declarative theme settings for the UI library. There is no logic to test.
        "app/app.config.ts",
        // Type declarations contain no executable code.
        "**/*.d.ts",
      ],
      // Not part of the set, by decision: Vue components and pages (app/**/*.vue).
      // Not part of the set, because they are tool configuration and not
      // application code: nuxt.config.ts, eslint.config.mjs and this file.
      reporter: ["text", "text-summary"],
      thresholds: {
        // Every file of the set must reach 90 % of its lines. The total then
        // reaches 90 % as well, because it is the weighted average of the files.
        lines: 90,
        perFile: true,
      },
    },
    server: {
      deps: {
        // Transform the package so the "#imports" alias applies inside it.
        inline: ["nuxt-auth-utils"],
      },
    },
  },
});
