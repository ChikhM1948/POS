'use client';

import { useBranding } from '../lib/branding';

export function BrandMark({ size = 36 }: { size?: number }) {
  const { branding } = useBranding();
  if (branding.logoUrl) {
    return (
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-card"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" />
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[22%] bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-card"
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 7a2 2 0 0 1 2-2h6l8 8-8 8-8-8V7Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="8.5" r="1.25" fill="currentColor" />
      </svg>
    </div>
  );
}
