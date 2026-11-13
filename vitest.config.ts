import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The server routes are tested as plain h3 handlers, without building the Nuxt app.
// "#imports" is a Nitro virtual module; the stub provides the one function
// the session utilities of nuxt-auth-utils read from it.
export default defineConfig({
  resolve: {
    alias: {
      "#imports": fileURLToPath(new URL("./test/stubs/nitro-imports.ts", import.meta.url)),
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
