import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { version } from "./package.json";

export default defineConfig({
  // REQUIRED for GitHub Pages
  base: "/d-pharma-web/",

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "apple-touch-icon.png"
      ],
      manifest: {
        name: "D-Pharma",
        short_name: "D-Pharma",
        description: "D-Pharma pharmacy management system",
        theme_color: "#0d47a1",
        background_color: "#ffffff",
        display: "standalone",

        // IMPORTANT: GitHub Pages start URL
        start_url: "/d-pharma-web/",

        icons: [
          {
            src: "/d-pharma-web/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/d-pharma-web/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      }
    })
  ],

  assetsInclude: ["**/*.ttf"],

  define: {
    __APP_VERSION__: JSON.stringify(version)
  }
});
