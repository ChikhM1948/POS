import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
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
          50: '#eef3ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a3b9fc',
          400: '#7b93f8',
          500: '#5a6ff0',
          600: '#3d4de3',
          700: '#333fc7',
          800: '#2c37a1',
          900: '#293380',
          950: '#1a1f4d',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        popover: '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 10px 24px -6px rgb(15 23 42 / 0.12)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
