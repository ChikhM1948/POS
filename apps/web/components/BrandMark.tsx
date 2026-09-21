export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
