/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["var(--font-cairo)", "Cairo", "sans-serif"],
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      colors: {
        border:     "var(--color-border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
          dark:    "var(--color-primary-dark)",
          light:   "var(--color-primary-light)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          dark:    "var(--color-accent-dark)",
        },
      },
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        "2xl": "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      animation: {
        "slide-up":  "slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) both",
        "fade-in":   "fadeIn 0.3s ease-out both",
        "scale-in":  "scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      },
    },
  },
  plugins: [],
}
