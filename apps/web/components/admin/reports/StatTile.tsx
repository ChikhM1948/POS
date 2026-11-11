interface Props {
  label: string;
  value: string;
  hint?: string;
}

/** Contrat "stat tile" du skill dataviz : label (sans deux-points) + valeur (sans semibold) + hint optionnel. */
export function StatTile({ label, value, hint }: Props) {
  return (
    <div className="rounded-xl border-s-4 border-s-signal-500 bg-white p-5 shadow-card">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1.5 break-words font-display text-2xl font-bold tracking-tight text-brand-800">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
