// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', 'nuxt-vue3-google-signin'],
  googleSignIn: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },
  runtimeConfig: {
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
    }
  },
  css: ['~/assets/css/main.css'],
})