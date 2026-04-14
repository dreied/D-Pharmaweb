/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        /* ============================
           MATERIAL YOU — PRIMARY
        ============================ */
        primary: "var(--primary)",
        "primary-dim": "var(--primary-dim)",
        "primary-container": "var(--primary-container)",
        "primary-fixed": "var(--primary-fixed)",
        "primary-fixed-dim": "var(--primary-fixed-dim)",
        "on-primary": "var(--on-primary)",
        "on-primary-container": "var(--on-primary-container)",
        "on-primary-fixed": "var(--on-primary-fixed)",
        "on-primary-fixed-variant": "var(--on-primary-fixed-variant)",

        /* ============================
           MATERIAL YOU — SECONDARY
        ============================ */
        secondary: "var(--secondary)",
        "secondary-dim": "var(--secondary-dim)",
        "secondary-container": "var(--secondary-container)",
        "secondary-fixed": "var(--secondary-fixed)",
        "secondary-fixed-dim": "var(--secondary-fixed-dim)",
        "on-secondary": "var(--on-secondary)",
        "on-secondary-container": "var(--on-secondary-container)",
        "on-secondary-fixed": "var(--on-secondary-fixed)",
        "on-secondary-fixed-variant": "var(--on-secondary-fixed-variant)",

        /* ============================
           MATERIAL YOU — TERTIARY
        ============================ */
        tertiary: "var(--tertiary)",
        "tertiary-dim": "var(--tertiary-dim)",
        "tertiary-container": "var(--tertiary-container)",
        "tertiary-fixed": "var(--tertiary-fixed)",
        "tertiary-fixed-dim": "var(--tertiary-fixed-dim)",
        "on-tertiary": "var(--on-tertiary)",
        "on-tertiary-container": "var(--on-tertiary-container)",
        "on-tertiary-fixed": "var(--on-tertiary-fixed)",
        "on-tertiary-fixed-variant": "var(--on-tertiary-fixed-variant)",

        /* ============================
           MATERIAL YOU — ERROR
        ============================ */
        error: "var(--error)",
        "error-dim": "var(--error-dim)",
        "error-container": "var(--error-container)",
        "on-error": "var(--on-error)",
        "on-error-container": "var(--on-error-container)",

        /* ============================
           MATERIAL YOU — SURFACES
        ============================ */
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-dim": "var(--surface-dim)",
        "surface-bright": "var(--surface-bright)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "surface-variant": "var(--surface-variant)",
        "surface-tint": "var(--surface-tint)",

        /* ============================
           MATERIAL YOU — TEXT
        ============================ */
        "on-background": "var(--on-background)",
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        "inverse-surface": "var(--inverse-surface)",
        "inverse-on-surface": "var(--inverse-on-surface)",

        /* ============================
           MATERIAL YOU — OUTLINE
        ============================ */
        outline: "var(--outline)",
        "outline-variant": "var(--outline-variant)",
      },

      fontFamily: {
        headline: ["Manrope", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        label: ["Inter", "system-ui", "sans-serif"],
      },

      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },

      animation: {
    fadeInUp: "fadeInUp 0.4s ease-out forwards"
  },

  keyframes: {
    fadeInUp: {
      "0%": { opacity: 0, transform: "translateY(12px)" },
      "100%": { opacity: 1, transform: "translateY(0)" }
    }
  }
    },
  },

  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};
