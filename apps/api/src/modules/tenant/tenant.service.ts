import { Tenant } from '../../models/Tenant';
import type { TenantSettingsDTO, UpdateTenantSettingsInput } from '@pos-dz/shared';

const HEX_RE = /^#[0-9a-f]{6}$/i;
const LOGO_RE = /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i;
const MAX_LOGO_CHARS = 1_500_000;

/** Valide la charte avant écriture : couleurs #RRGGBB, logo = data URL image raster de taille bornée ('' = retrait). */
export function validateBranding(b: UpdateTenantSettingsInput['branding']): string | null {
  if (!b) return null;
  for (const k of ['primaryColor', 'secondaryColor'] as const) {
    if (b[k] !== undefined && !HEX_RE.test(b[k]!)) return 'Couleur invalide (format #RRGGBB).';
  }
  if (b.logoUrl && (b.logoUrl.length > MAX_LOGO_CHARS || !LOGO_RE.test(b.logoUrl))) return 'Logo invalide (PNG, JPEG, WebP ou GIF, 1 Mo maximum).';
  return null;
}

function toDTO(t: any): TenantSettingsDTO {
  return {
    name: t.name,
    slug: t.slug,
    branding: {
      logoUrl: t.branding?.logoUrl,
      primaryColor: t.branding?.primaryColor,
      secondaryColor: t.branding?.secondaryColor,
    },
    phone: t.legal?.phone,
    legal: { address: t.legal?.address, rc: t.legal?.rc, nif: t.legal?.nif, nis: t.legal?.nis, ai: t.legal?.ai },
    taxRegime: t.legal?.taxRegime === 'ifu' ? 'ifu' : 'real',
    syncEnabled: t.syncEnabled ?? true,
  };
}

export async function getTenantSettings(tenantId: string): Promise<TenantSettingsDTO | null> {
  const tenant = await Tenant.findById(tenantId).lean();
  return tenant ? toDTO(tenant) : null;
}

export async function updateTenantSettings(
  tenantId: string,
  input: UpdateTenantSettingsInput,
): Promise<TenantSettingsDTO | null> {
  const invalid = validateBranding(input.branding);
  if (invalid) throw Object.assign(new Error(invalid), { status: 400 });
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  if (input.name !== undefined) $set.name = input.name.trim();
  if (input.phone !== undefined) $set['legal.phone'] = input.phone.trim();
  for (const k of ['address', 'rc', 'nif', 'nis', 'ai'] as const) {
    if (input.legal?.[k] !== undefined) $set[`legal.${k}`] = input.legal[k]!.trim();
  }
  if (input.branding?.logoUrl === '') $unset['branding.logoUrl'] = '';
  else if (input.branding?.logoUrl !== undefined) $set['branding.logoUrl'] = input.branding.logoUrl;
  if (input.branding?.primaryColor !== undefined) $set['branding.primaryColor'] = input.branding.primaryColor;
  if (input.branding?.secondaryColor !== undefined) $set['branding.secondaryColor'] = input.branding.secondaryColor;
  if (input.taxRegime === 'ifu' || input.taxRegime === 'real') $set['legal.taxRegime'] = input.taxRegime;
  if (input.syncEnabled !== undefined) $set.syncEnabled = input.syncEnabled;

  const tenant = await Tenant.findByIdAndUpdate(tenantId, { $set, ...(Object.keys($unset).length ? { $unset } : {}) }, { new: true }).lean();
  return tenant ? toDTO(tenant) : null;
}
