/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50:  '#f0eef8',
          100: '#ddd9f0',
          200: '#b9b3de',
          300: '#928ac8',
          400: '#7068a8',
          500: '#534d88',
          600: '#3d3768',
          700: '#2c3649',
          800: '#1a2439',
          900: '#131c31',
          950: '#0c0c28',
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
      },
    },
  },
  plugins: [],
}
