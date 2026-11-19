const fs = require('node:fs');
const { createPublicKey } = require('node:crypto');
const { parse } = require('dotenv');

// Ne retourne que les paramètres publics : la clé privée et le secret admin ne quittent jamais le build.
function licenseBuildConfig(file, env = process.env, production = false) {
  const saved = fs.existsSync(file) ? parse(fs.readFileSync(file)) : {};
  const config = Object.fromEntries(['POS_LICENSE_PUBLIC_KEY', 'POS_API_URL', 'POS_UPDATE_URL'].map((key) => [key, env[key] ?? saved[key] ?? '']));
  if (production) {
    try {
      if (createPublicKey(config.POS_LICENSE_PUBLIC_KEY.replace(/\\n/g, '\n')).asymmetricKeyType !== 'ed25519') throw new Error();
    } catch {
      throw new Error('POS_LICENSE_PUBLIC_KEY Ed25519 requise : configurez licensing.env ou la variable de build. Réutilisez la même clé publique à chaque mise à jour.');
    }
  }
  return Object.fromEntries(Object.entries(config)
    .filter(([, value]) => production || value)
    .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]));
}

module.exports = { licenseBuildConfig };
