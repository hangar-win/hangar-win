const animate = require("tailwindcss-animate")

const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  safelist: ["dark"],
  prefix: "",
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        tint: token("tint"),
        rule: token("rule"),
        ink: { DEFAULT: token("ink"), 2: token("ink-2"), 3: token("ink-3") },
        rail: { DEFAULT: token("rail"), ink: token("rail-ink"), muted: token("rail-muted") },
        signature: token("signature"),
        due: token("due"),
        danger: token("danger"),
        success: token("success"),
        focus: token("focus"),
        src: { winget: token("src-winget"), chocolatey: token("src-chocolatey"), msstore: token("src-msstore"), scoop: token("src-scoop") },
        border: token("rule"),
        input: token("rule"),
        ring: token("focus"),
        background: token("bg"),
        foreground: token("ink"),
        primary: { DEFAULT: token("accent"), foreground: token("accent-ink") },
        secondary: { DEFAULT: token("tint"), foreground: token("ink") },
        destructive: { DEFAULT: token("danger"), foreground: token("surface") },
        muted: { DEFAULT: token("tint"), foreground: token("ink-2") },
        accent: { DEFAULT: token("tint"), foreground: token("ink") },
        popover: { DEFAULT: token("surface"), foreground: token("ink") },
        card: { DEFAULT: token("surface"), foreground: token("ink") },
      },
      fontFamily: {
        sans: "var(--font-body)",
        display: "var(--font-display)",
      },
      height: { row: "var(--row)" },
      minHeight: { row: "var(--row)" },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        stamp: {
          "0%": { transform: "rotate(-3deg) scale(1.6)", opacity: "0" },
          "60%": { transform: "rotate(-3deg) scale(0.96)", opacity: "1" },
          "100%": { transform: "rotate(-3deg) scale(1)", opacity: "1" },
        },
        "station-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--signature) / 0.55)" },
          "50%": { boxShadow: "0 0 0 6px rgb(var(--signature) / 0)" },
        },
      },
      animation: {
        stamp: "stamp 420ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "station-pulse": "station-pulse 1.6s ease-out infinite",
      },
    },
  },
  plugins: [animate],
}
