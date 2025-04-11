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

  future: {
    compatibilityVersion: 4,
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
