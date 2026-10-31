import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'var(--font-tajawal)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d9dde4',
          300: '#b4bbc8',
          400: '#8b95a7',
          500: '#4b566a',
          600: '#1f2937',
          700: '#111827',
          800: '#0b1220',
          900: '#070c18',
          950: '#04070f',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        popover: '0 8px 24px -8px rgb(15 23 42 / 0.16)',
      },
      borderRadius: {
        lg: '0.375rem',
        xl: '0.5rem',
        '2xl': '0.625rem',
      },
    },
  },
  plugins: [],
};

export default config;
