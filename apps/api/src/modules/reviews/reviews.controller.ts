import { Router, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requirePlatformAdmin } from '../license/platformAdmin.service';
import { Review } from '../../models/Review';

export const reviewsRouter = Router();

const publicView = (r: { _id: unknown; name: string; business?: string; rating: number; comment: string; createdAt: Date }) => ({
  id: String(r._id), name: r.name, business: r.business ?? '', rating: r.rating, comment: r.comment, createdAt: r.createdAt,
});

// Public : avis approuvés + moyenne.
reviewsRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const [items, agg] = await Promise.all([
    Review.find({ approved: true }).sort({ createdAt: -1 }).limit(12).lean(),
    Review.aggregate([{ $match: { approved: true } }, { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } }]),
  ]);
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ items: items.map(publicView), count: agg[0]?.count ?? 0, average: agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0 });
}));

// Public : dépôt d'un avis (mis en modération).
reviewsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const b = req.body ?? {};
  // Champ piège anti-robots : rempli = on feint le succès sans rien enregistrer.
  if (typeof b.website === 'string' && b.website.trim()) return res.status(201).json({ ok: true });
  const name = String(b.name ?? '').trim();
  const comment = String(b.comment ?? '').trim();
  const business = String(b.business ?? '').trim();
  const rating = Number(b.rating);
  if (!name || name.length > 60) return res.status(400).json({ error: 'Nom requis (60 caractères max).' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Note de 1 à 5 requise.' });
  if (comment.length < 10 || comment.length > 600) return res.status(400).json({ error: 'Commentaire de 10 à 600 caractères requis.' });
  if (business.length > 80) return res.status(400).json({ error: 'Nom du commerce trop long.' });
  await Review.create({ name, business: business || undefined, rating, comment, approved: false });
  res.status(201).json({ ok: true });
}));

// Modération (super admin).
reviewsRouter.get('/admin', requirePlatformAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const items = await Review.find().sort({ approved: 1, createdAt: -1 }).limit(200).lean();
  res.json(items.map((r) => ({ ...publicView(r), approved: r.approved })));
}));
reviewsRouter.post('/admin/:id/approve', requirePlatformAdmin, asyncHandler(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Identifiant invalide.' });
  const r = await Review.findByIdAndUpdate(req.params.id, { approved: req.body?.approved !== false }, { new: true });
  if (!r) return res.status(404).json({ error: 'Avis introuvable.' });
  res.json({ ok: true });
}));
reviewsRouter.delete('/admin/:id', requirePlatformAdmin, asyncHandler(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Identifiant invalide.' });
  await Review.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));
