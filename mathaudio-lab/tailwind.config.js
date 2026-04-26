/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        daw: {
          bg: '#121212',
          surface: '#1a1a1a',
          's2': '#242424',
          border: '#2d2d2d',
          accent: '#00ff9d',
          'accent-dim': '#00cc7d',
          'accent-alt': '#7c3aed',
          text: '#e0e0e0',
          muted: '#555555',
          warn: '#f59e0b',
          error: '#ef4444',
        },
        lab: {
          bg: '#eef2ff',
          card: '#ffffff',
          border: '#c7d2fe',
          accent: '#6366f1',
          'accent-soft': '#818cf8',
          muted: '#6b7280',
          text: '#1e1b4b',
          sum: '#4ade80',
          mult: '#f472b6',
          frac: '#fb923c',
          pow: '#a78bfa',
          frac1: '#fbbf24',
          frac2: '#f87171',
          frac3: '#4ade80',
          frac4: '#60a5fa',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
