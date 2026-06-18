import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    "brand-orange": "#FF8C1A", "brand-dark": "#0A0A0C", "brand-dark-2": "#131318",
    "brand-dark-3": "#1C1C24", "brand-border": "#2E2E38", "brand-text-muted": "#8A8A95",
    "brand-green-neon": "#4ADE80", "brand-blue-neon": "#4EA8FF", "brand-gold": "#FFD24A", "brand-red-bright": "#F87171",
  }, fontFamily: { heading: ["Rajdhani", "sans-serif"] } } },
  plugins: [],
} satisfies Config;
