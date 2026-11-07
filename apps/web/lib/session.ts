import type { Session } from '../components/pos/LoginForm';

const KEY = 'pos-session';
/** Durée de vie du cache de session : au-delà, le caissier doit se reconnecter (en ligne). */
const TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Session caissier conservée dans le navigateur pour qu'un rechargement hors-ligne (ou la
 * réouverture de l'onglet) ne renvoie pas vers un écran de connexion impossible sans réseau.
 * Effacée à la déconnexion explicite.
 */
export function saveSession(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ session, savedAt: Date.now() }));
  } catch {
    /* stockage indisponible — la session reste simplement en mémoire */
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { session, savedAt } = JSON.parse(raw) as { session: Session; savedAt: number };
    if (!session?.token || Date.now() - savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* voir ci-dessus */
  }
}
