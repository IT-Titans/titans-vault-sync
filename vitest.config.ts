import { defineConfig } from "vitest/config";

// The server routes are tested as plain h3 handlers, without building the Nuxt app.
// "#imports" is a Nitro virtual module; the stub provides the one function
// the session utilities of nuxt-auth-utils read from it.
export default defineConfig({
  resolve: {
    alias: {
      // A leading slash is resolved against the project root.
      "#imports": "/test/stubs/nitro-imports.ts",
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    server: {
      deps: {
        // Transform the package so the "#imports" alias applies inside it.
        inline: ["nuxt-auth-utils"],
      },
    },
  },
});
