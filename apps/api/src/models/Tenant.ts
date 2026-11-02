import { Schema, model, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    receiptHeader?: string;
    receiptFooter?: string;
  };
  legal: {
    rc?: string; // Registre de commerce
    nif?: string; // Numéro d'identification fiscale
    nis?: string; // Numéro d'identification statistique
    ai?: string; // Article d'imposition
    address?: string;
    phone?: string;
    /** 'ifu' = forfaitaire (G12), 'real' = régime du réel (G50). Dans `legal` pour suivre le même JSON que le poste local. */
    taxRegime?: 'ifu' | 'real';
  };
  locale: {
    defaultLanguage: 'fr' | 'ar';
    currency: 'DZD';
  };
  plan: 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  /** true = ce commerce synchronise ses données en ligne (accessible depuis le web) ; false = local uniquement — voir sync-engine.ts, gaté côté client sur ce champ. */
  syncEnabled: boolean;
  /** Licence active (essai 14 jours ou payante) — voir modules/license. Absente = commerce antérieur au système de licence. */
  license?: { key?: string; kind: 'trial' | 'paid'; activatedAt: Date; expiresAt: Date };
  createdAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    branding: {
      logoUrl: String,
      primaryColor: { type: String, default: '#0f172a' },
      secondaryColor: { type: String, default: '#38bdf8' },
      receiptHeader: String,
      receiptFooter: String,
    },
    legal: {
      rc: String,
      nif: String,
      nis: String,
      ai: String,
      address: String,
      phone: String,
      taxRegime: { type: String, enum: ['ifu', 'real'], default: 'real' },
    },
    locale: {
      defaultLanguage: { type: String, enum: ['fr', 'ar'], default: 'fr' },
      currency: { type: String, enum: ['DZD'], default: 'DZD' },
    },
    plan: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'starter' },
    status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'trial' },
    syncEnabled: { type: Boolean, default: true },
    license: {
      key: String,
      kind: { type: String, enum: ['trial', 'paid'] },
      activatedAt: Date,
      expiresAt: Date,
    },
  },
  { timestamps: true },
);

export const Tenant = model<ITenant>('Tenant', TenantSchema);
