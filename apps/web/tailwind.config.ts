import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'var(--font-tajawal)',
          '-apple-system',
          'BlinkMacSystemFont',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Variables définies dans globals.css (valeurs par défaut) et surchargées à l'exécution par lib/branding.tsx.
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      boxShadow: {
        // Ombres en couches (contact + ambiante), comme les surfaces Apple : plus la surface est grande, plus elle est épaisse.
        card: '0 0 0 0.5px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04), 0 2px 8px -2px rgb(0 0 0 / 0.05)',
        popover: '0 0 0 0.5px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.06), 0 24px 56px -12px rgb(0 0 0 / 0.28)',
        lift: '0 0 0 0.5px rgb(0 0 0 / 0.08), 0 4px 10px rgb(0 0 0 / 0.06), 0 14px 28px -10px rgb(0 0 0 / 0.14)',
      },
      borderRadius: {
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      transitionTimingFunction: {
        // Ressort critique amorti (damping 1.0) : aucun rebond sur l'UI courante.
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        'sheet-in': { from: { opacity: '0', transform: 'translateY(12px) scale(0.97)' }, to: { opacity: '1', transform: 'none' } },
        'scrim-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'sheet-in': 'sheet-in 360ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'scrim-in': 'scrim-in 240ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
