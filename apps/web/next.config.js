/** @type {import('next').NextConfig} */
const nextConfig = {
  // Package du monorepo consommé en TypeScript source (non pré-compilé) — Next doit le transpiler.
  transpilePackages: ['@pos-dz/shared'],
  // Export statique uniquement pour l'embarquement dans le shell Electron (apps/desktop) ;
  // le déploiement web normal (`next build && next start`) garde le mode serveur par défaut.
  ...(process.env.BUILD_TARGET === 'desktop' ? { output: 'export' } : {}),
};

module.exports = nextConfig;
