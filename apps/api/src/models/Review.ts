import { Schema, model, Document } from 'mongoose';

/**
 * Avis laissé par un visiteur de la page d'accueil. Public, hors de tout commerce (pas de tenantScope).
 * Modéré : invisible tant que `approved` est faux.
 */
export interface IReview extends Document {
  name: string;
  business?: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    business: { type: String, trim: true, maxlength: 80 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 600 },
    approved: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Review = model<IReview>('Review', ReviewSchema);
