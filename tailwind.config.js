/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#EEF2F7",
        foreground: "#1E293B",
        primary: {
          DEFAULT: "#6366F1",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#06B6D4",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#EC4899",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "rgba(255, 255, 255, 0.75)",
          foreground: "#1E293B",
        },
      },
      borderRadius: {
        lg: "18px",
        md: "14px",
        sm: "10px",
      },
      fontFamily: {
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
        serif: ["Noto Serif SC", "serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
