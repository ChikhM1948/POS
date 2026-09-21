interface Props {
  label: string;
  value: string;
  hint?: string;
}

/** Contrat "stat tile" du skill dataviz : label (sans deux-points) + valeur (sans semibold) + hint optionnel. */
export function StatTile({ label, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card transition hover:shadow-popover">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold text-neutral-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
