import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { version } from "./package.json";

export default defineConfig({
  base: "/D-Pharmaweb/",

  plugins: [
    react(),

    VitePWA({
      registerType: "prompt",
      filename: "sw.js",

      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "apple-touch-icon.png",
        "default-logo.png"
      ],

      manifest: {
        name: "D-Pharma",
        short_name: "D-Pharma",
        description: "D-Pharma pharmacy management system",
        theme_color: "#0d47a1",
        background_color: "#ffffff",
        display: "standalone",

        start_url: "/D-Pharmaweb/",
scope: "/D-Pharmaweb/",


        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },

      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.5\.0\/css\/all\.min\.css$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "fa-css-cache",
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.5\.0\/webfonts\/.*\.(woff2|woff)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "fa-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],

  assetsInclude: ["**/*.ttf"],

  define: {
    __APP_VERSION__: JSON.stringify(version)
  }
});
