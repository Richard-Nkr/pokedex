import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { dateShort, eur } from "@/lib/format";
import type { ValueSnapshot } from "@/lib/types";

const WIDTH = 300;
const HEIGHT = 64;
const PADDING = 4;

export function ValueChart({ history }: { history: ValueSnapshot[] }) {
  const points = history.slice(-30);
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.value - first.value;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const x = (index: number) =>
    PADDING + (index / (points.length - 1)) * (WIDTH - PADDING * 2);
  const y = (value: number) =>
    range === 0
      ? HEIGHT / 2
      : HEIGHT - PADDING - ((value - min) / range) * (HEIGHT - PADDING * 2);

  const line = points
    .map((point, index) => `${x(index)},${y(point.value)}`)
    .join(" ");
  const area = `M ${x(0)} ${HEIGHT - PADDING} L ${points
    .map((point, index) => `${x(index)} ${y(point.value)}`)
    .join(" L ")} L ${x(points.length - 1)} ${HEIGHT - PADDING} Z`;

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold">Évolution de la valeur</h3>
        <p
          className={`flex items-center gap-0.5 text-[11px] font-semibold tabular ${
            delta > 0
              ? "text-positive"
              : delta < 0
                ? "text-accent"
                : "text-muted"
          }`}
        >
          {delta > 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : delta < 0 ? (
            <ArrowDownRight className="h-3.5 w-3.5" />
          ) : null}
          {eur(Math.abs(delta))}
        </p>
      </div>
      <div className="mt-2 rounded-2xl border border-line bg-surface px-3 pb-2 pt-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-16 w-full text-accent"
          role="img"
          aria-label={`Valeur de la collection passée de ${eur(
            first.value,
          )} à ${eur(last.value)}.`}
        >
          <path d={area} fill="currentColor" fillOpacity={0.08} />
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
          <span>{dateShort(`${first.date}T12:00:00`)}</span>
          <span>{dateShort(`${last.date}T12:00:00`)}</span>
        </div>
      </div>
    </div>
  );
}
