import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS Algérie — Caisse & gestion de stock | نقطة بيع وإدارة مخزون | POS & stock management',
  description:
    'Logiciel de point de vente et de gestion de stock, hors-ligne, FR / AR / EN. برنامج نقطة بيع وإدارة مخزون. Offline-first POS and stock manager.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
