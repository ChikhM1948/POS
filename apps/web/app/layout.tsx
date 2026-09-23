import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../lib/i18n/LanguageContext';

export const metadata: Metadata = {
  title: 'POS Algérie',
  description: 'Point de vente et gestion de stock — marque blanche',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang/dir par défaut côté rendu serveur (français, LTR) — LanguageProvider les resynchronise
  // côté client une fois la préférence lue depuis localStorage (voir lib/i18n/LanguageContext.tsx).
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased" suppressHydrationWarning>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
