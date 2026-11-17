// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },

  app: {
    head: {
      title: 'Titans Vault Sync'
    }
  },
  css: ["~/assets/css/main.css"],

  typescript: {
    tsConfig: {
      // Nuxt 4 type-checks only test/nuxt by default. The tests of this
      // project live in test/, and vitest.config.ts belongs to them.
      include: ["../test/**/*", "../vitest.config.ts"],
    },
  },
  runtimeConfig: {
    oauth: {
      microsoft: {
      },
    },
    azure: {
      backend: {
        clientSecret: "",
        clientId: "",
      }
    },
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/scripts",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/ui",
    "nuxt-auth-utils",
  ],
});
