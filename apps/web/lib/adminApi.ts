const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Fetch wrapper pour le back-office : toujours en ligne (pas de mode offline côté admin). */
export async function adminFetch<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
