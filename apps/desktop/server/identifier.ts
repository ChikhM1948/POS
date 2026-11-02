/**
 * Valeurs runtime dupliquées de @pos-dz/shared (le serveur local n'importe que les types de ce
 * paquet) : identifiant de connexion = email OU téléphone, stocké normalisé dans `users.email`.
 */
export type IdentifierKind = 'email' | 'phone';

export function normalizePhone(raw: string): string {
  const compact = String(raw ?? '').trim().replace(/[\s.\-()]/g, '');
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
}

export function parseIdentifier(raw: string): { kind: IdentifierKind; value: string } | null {
  const trimmed = String(raw ?? '').trim();
  if (trimmed.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? { kind: 'email', value: trimmed.toLowerCase() } : null;
  }
  return /^\+?\d{8,15}$/.test(normalizePhone(trimmed)) ? { kind: 'phone', value: normalizePhone(trimmed) } : null;
}

export function normalizeIdentifier(raw: string): string {
  return parseIdentifier(raw)?.value ?? String(raw ?? '').trim().toLowerCase();
}
