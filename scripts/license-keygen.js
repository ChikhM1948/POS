// Génère la paire Ed25519 des licences. À lancer UNE fois :
//  - LICENSE_PRIVATE_KEY  -> variable d'environnement du serveur API (jamais commitée) ;
//  - POS_LICENSE_PUBLIC_KEY -> variable d'environnement au moment du build du desktop (embarquée dans l'exe).
const { generateKeyPairSync } = require('node:crypto');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const oneLine = (pem) => pem.trim().replace(/\n/g, '\\n');
console.log('LICENSE_PRIVATE_KEY=' + oneLine(privateKey.export({ type: 'pkcs8', format: 'pem' })));
console.log('POS_LICENSE_PUBLIC_KEY=' + oneLine(publicKey.export({ type: 'spki', format: 'pem' })));
