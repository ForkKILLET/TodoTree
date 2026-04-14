/// <reference types="@rsbuild/core/types" />

import { defineConfig } from '@rsbuild/core'
import { pluginVue } from '@rsbuild/plugin-vue'
import { pluginPWA } from 'rsbuild-plugin-pwa'

export default defineConfig({
  plugins: [
    pluginVue(),
    pluginPWA({
      webAppManifest: {
        content: {
          name: 'TodoTree',
          short_name: 'TodoTree',
          description: 'Manage your todos as trees.',
          id: './',
          start_url: './',
          scope: './',
          orientation: 'landscape-primary',
          display: 'standalone',
          background_color: '#f4f7fb',
          theme_color: '#2f6fed',
          icons: [
            {
              src: './app-icon.svg',
              type: 'image/svg+xml',
              sizes: 'any',
              purpose: 'any maskable',
            },
            {
              src: './favicon.ico',
              type: 'image/x-icon',
              sizes: '32x32 48x48 64x64 128x128 256x256',
              purpose: 'any',
            },
          ],
        },
      },
    }),
  ],
  html: {
    title: 'TodoTree',
  },
  output: {
    assetPrefix: './',
  },
  server: {
    base: import.meta.env.DEV ? '/' : import.meta.env.BASE_URL,
  }
})
