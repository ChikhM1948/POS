import { Tenant } from '../../models/Tenant';
import type { TenantSettingsDTO, UpdateTenantSettingsInput } from '@pos-dz/shared';

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
  const $set: Record<string, unknown> = {};
  if (input.name !== undefined) $set.name = input.name.trim();
  if (input.phone !== undefined) $set['legal.phone'] = input.phone.trim();
  if (input.branding?.logoUrl !== undefined) $set['branding.logoUrl'] = input.branding.logoUrl;
  if (input.branding?.primaryColor !== undefined) $set['branding.primaryColor'] = input.branding.primaryColor;
  if (input.branding?.secondaryColor !== undefined) $set['branding.secondaryColor'] = input.branding.secondaryColor;

  const tenant = await Tenant.findByIdAndUpdate(tenantId, { $set }, { new: true }).lean();
  return tenant ? toDTO(tenant) : null;
}
