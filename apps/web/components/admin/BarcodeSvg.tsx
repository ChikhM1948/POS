import { code128Bars } from '../../lib/print/code128';

/** Code 128 en SVG vectoriel (net à toute résolution d'imprimante), avec zones de silence de 10 modules. */
export function BarcodeSvg({ value, height = 40 }: { value: string; height?: number }) {
  let data: ReturnType<typeof code128Bars>;
  try {
    data = code128Bars(value);
  } catch {
    return <span className="text-xs text-red-600">{value}</span>;
  }
  const quiet = 10;
  const width = data.total + quiet * 2;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', display: 'block' }}
      shapeRendering="crispEdges"
      role="img"
      aria-label={value}
    >
      {data.bars.map((b, i) => (
        <rect key={i} x={b.x + quiet} y={0} width={b.w} height={height} fill="#000" />
      ))}
    </svg>
  );
}
