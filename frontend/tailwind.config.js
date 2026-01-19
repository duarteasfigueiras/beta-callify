import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  safelist: [
    // Category badge colors - pastel backgrounds (100)
    'bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-orange-100', 'bg-pink-100',
    'bg-yellow-100', 'bg-red-100', 'bg-indigo-100', 'bg-teal-100', 'bg-cyan-100',
    'bg-lime-100', 'bg-amber-100', 'bg-violet-100', 'bg-rose-100', 'bg-gray-100',
    // Category badge text colors (800)
    'text-blue-800', 'text-green-800', 'text-purple-800', 'text-orange-800', 'text-pink-800',
    'text-yellow-800', 'text-red-800', 'text-indigo-800', 'text-teal-800', 'text-cyan-800',
    'text-lime-800', 'text-amber-800', 'text-violet-800', 'text-rose-800', 'text-gray-800',
    // Color picker preview - vibrant backgrounds (500)
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
    'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500', 'bg-cyan-500',
    'bg-lime-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-gray-500',
    // Dark mode badge backgrounds (900)
    'dark:bg-blue-900', 'dark:bg-green-900', 'dark:bg-purple-900', 'dark:bg-orange-900', 'dark:bg-pink-900',
    'dark:bg-yellow-900', 'dark:bg-red-900', 'dark:bg-indigo-900', 'dark:bg-teal-900', 'dark:bg-cyan-900',
    'dark:bg-lime-900', 'dark:bg-amber-900', 'dark:bg-violet-900', 'dark:bg-rose-900', 'dark:bg-gray-700',
    // Dark mode badge text colors (200)
    'dark:text-blue-200', 'dark:text-green-200', 'dark:text-purple-200', 'dark:text-orange-200', 'dark:text-pink-200',
    'dark:text-yellow-200', 'dark:text-red-200', 'dark:text-indigo-200', 'dark:text-teal-200', 'dark:text-cyan-200',
    'dark:text-lime-200', 'dark:text-amber-200', 'dark:text-violet-200', 'dark:text-rose-200', 'dark:text-gray-200',
  ],
  theme: {
    extend: {
      colors: {
        // Ensure all category colors are available
        teal: colors.teal,
        cyan: colors.cyan,
        lime: colors.lime,
        amber: colors.amber,
        violet: colors.violet,
        rose: colors.rose,
        orange: colors.orange,
        pink: colors.pink,
        indigo: colors.indigo,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
