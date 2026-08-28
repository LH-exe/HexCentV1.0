import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "dark-900": "#020406",
        "dark-800": "#070b11",
        "dark-700": "#0a0f18",
        "border-dark": "#1e293b",
        "border-light": "#334155",
        "accent-cyan": "#00f0ff",
        "accent-green": "#00ff66",
        "accent-red": "#ff3366",
      },
      fontFamily: {
        mono: ["'Fira Code'", "'Geist Mono'", "ui-monospace", "monospace"],
        sans: ["'Fira Code'", "'Geist Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        none: "0px",
      },
      keyframes: {
        pageFadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseTelemetry: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "page-fade": "pageFadeIn 0.45s ease-out both",
        "pulse-telemetry": "pulseTelemetry 1.6s ease-in-out infinite",
        blink: "blink 1s step-start infinite",
      },
      backgroundImage: {
        "cpu-grad": "linear-gradient(135deg, #00f0ff 0%, #4338ca 100%)",
        "shield-grad": "linear-gradient(135deg, #10b981 0%, #0e7490 100%)",
        "telemetry-grad": "linear-gradient(135deg, #00f0ff 0%, #2563eb 100%)",
        "docs-grad": "linear-gradient(135deg, #a855f7 0%, #475569 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
