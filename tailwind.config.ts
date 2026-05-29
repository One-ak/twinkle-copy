import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/data/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Bodoni 72", "Times New Roman", "serif"],
        script: ["Snell Roundhand", "Brush Script MT", "cursive"],
        sans: ["Inter", "SF Pro Display", "Segoe UI", "system-ui", "sans-serif"]
      },
      colors: {
        cosmos: {
          950: "#05020b",
          900: "#090414",
          800: "#13051f",
          700: "#211035"
        },
        moon: "#f7f0ff",
        lavender: "#cdb9ff",
        blush: "#f2a8d1",
        ember: "#ffc8a3"
      },
      boxShadow: {
        moon: "0 0 48px rgba(214, 190, 255, 0.3)",
        warm: "0 0 60px rgba(255, 178, 196, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
