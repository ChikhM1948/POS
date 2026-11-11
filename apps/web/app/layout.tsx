import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter, Tajawal } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '../lib/i18n/LanguageContext';
import { BrandingProvider } from '../lib/branding';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';

// Polices auto-hébergées par Next (aucun appel réseau à l'exécution) — indispensable pour un POS
// utilisé hors-ligne en boutique. Tajawal couvre l'arabe ; Inter reste la police latine par défaut.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-bricolage', display: 'swap' });
const tajawal = Tajawal({ subsets: ['arabic'], weight: ['400', '500', '700'], variable: '--font-tajawal', display: 'swap' });

export const metadata: Metadata = {
  title: 'POS Algérie',
  description: 'Point de vente et gestion de stock — marque blanche',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang/dir par défaut côté rendu serveur (français, LTR) — LanguageProvider les resynchronise
  // côté client une fois la préférence lue depuis localStorage (voir lib/i18n/LanguageContext.tsx).
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} ${bricolage.variable} ${tajawal.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-100 font-sans text-neutral-900 antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <BrandingProvider>{children}</BrandingProvider>
          <ServiceWorkerRegister />
        </LanguageProvider>
      </body>
    </html>
  );
}
