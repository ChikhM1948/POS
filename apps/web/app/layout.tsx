import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS Algérie',
  description: 'Point de vente et gestion de stock — marque blanche',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
