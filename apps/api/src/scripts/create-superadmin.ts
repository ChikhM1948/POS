import { connectDB } from '../db/connect';
import { upsertPlatformAdmin } from '../modules/license/platformAdmin.service';
import mongoose from 'mongoose';

/**
 * Crée (ou réinitialise le mot de passe de) un compte super admin éditeur.
 *
 *   SUPERADMIN_EMAIL=moi@exemple.com SUPERADMIN_PASSWORD='...' npm run create:superadmin -w @pos-dz/api
 *
 * Le mot de passe passe par l'environnement (pas par argv) pour ne pas finir dans l'historique du shell / `ps`.
 */
async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) throw new Error('SUPERADMIN_EMAIL et SUPERADMIN_PASSWORD sont requis.');
  if (password.length < 10) throw new Error('Le mot de passe super admin doit contenir au moins 10 caractères.');
  await connectDB();
  const { created } = await upsertPlatformAdmin(email, password, process.env.SUPERADMIN_NAME);
  console.log(created ? `Super admin créé : ${email}` : `Mot de passe mis à jour : ${email}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err.message ?? err); process.exit(1); });
