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
  };
  locale: {
    defaultLanguage: 'fr' | 'ar';
    currency: 'DZD';
  };
  plan: 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  /** true = ce commerce synchronise ses données en ligne (accessible depuis le web) ; false = local uniquement — voir sync-engine.ts, gaté côté client sur ce champ. */
  syncEnabled: boolean;
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
    },
    locale: {
      defaultLanguage: { type: String, enum: ['fr', 'ar'], default: 'fr' },
      currency: { type: String, enum: ['DZD'], default: 'DZD' },
    },
    plan: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'starter' },
    status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'trial' },
    syncEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Tenant = model<ITenant>('Tenant', TenantSchema);
