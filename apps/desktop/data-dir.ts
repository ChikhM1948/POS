import fs from 'node:fs';
import path from 'node:path';

const databaseFile = (dir: string) => path.join(dir, 'db', 'pos-data.sqlite');

/** Le poste appartient au profil utilisateur, jamais à une version ou au chemin de l'exécutable. */
export function resolveDataDir(appData: string, portableDir?: string): string {
  const stableDir = path.join(appData, 'POS Algerie');
  const locator = path.join(stableDir, 'data-location.json');
  let dir = stableDir;

  // Un ancien portable conserve toute sa base et son profil Chromium, sans copie SQLite à chaud.
  const legacyDir = portableDir && path.join(portableDir, 'POS-Data');
  if (legacyDir && fs.existsSync(databaseFile(legacyDir))) {
    dir = legacyDir;
  } else if (fs.existsSync(locator)) {
    const saved: unknown = JSON.parse(fs.readFileSync(locator, 'utf8'));
    if (typeof saved !== 'string' || !path.isAbsolute(saved)) {
      throw new Error(`Emplacement des données invalide : ${locator}`);
    }
    dir = saved;
    // Une clé USB débranchée ou un dossier déplacé ne doit pas créer un nouveau poste.
    if (!fs.existsSync(databaseFile(dir))) {
      throw new Error(`Les données du poste sont introuvables dans ${dir}. Rétablissez ce dossier pour conserver l'activation.`);
    }
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
  if (fs.existsSync(databaseFile(dir))) fs.accessSync(databaseFile(dir), fs.constants.R_OK | fs.constants.W_OK);
  // Mémoriser aussi les anciens portables pour les retrouver après passage à Setup.
  // Pas de repli silencieux vers une base vide si le dossier existant est inaccessible.
  if (dir !== stableDir && (!fs.existsSync(locator) || fs.readFileSync(locator, 'utf8') !== JSON.stringify(dir))) {
    fs.mkdirSync(stableDir, { recursive: true });
    const pending = `${locator}.tmp`;
    fs.writeFileSync(pending, JSON.stringify(dir), { mode: 0o600 });
    fs.renameSync(pending, locator);
  }
  return dir;
}
