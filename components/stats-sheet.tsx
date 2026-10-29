"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { CONDITIONS, CONDITION_COLORS } from "@/lib/constants";
import { eur, num, plural } from "@/lib/format";
import { getCollectionTotals } from "@/lib/totals";
import type { OwnedCard, ValueSnapshot } from "@/lib/types";
import { Sheet } from "./sheet";
import { ValueChart } from "./value-chart";

export function StatsSheet({
  open,
  onClose,
  cards,
  history,
}: {
  open: boolean;
  onClose: () => void;
  cards: OwnedCard[];
  history: ValueSnapshot[];
}) {
  const totals = useMemo(() => getCollectionTotals(cards), [cards]);
  const stats = useMemo(() => {
    let favorites = 0;
    const setMap = new Map<string, { count: number; value: number }>();
    const conditionMap = new Map<string, number>();

    for (const card of cards) {
      const unit = card.marketPrice ?? card.purchasePrice;
      const cardValue = (unit ?? 0) * card.quantity;
      if (card.favorite) favorites += 1;
      const setName = card.setName?.trim() || "Sans série";
      const set = setMap.get(setName) ?? { count: 0, value: 0 };
      set.count += card.quantity;
      set.value += cardValue;
      setMap.set(setName, set);
      conditionMap.set(
        card.condition,
        (conditionMap.get(card.condition) ?? 0) + card.quantity,
      );
    }

    const sets = Array.from(setMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value || b.count - a.count);
    const maxSetValue = sets[0]?.value ?? 1;
    const conditions = CONDITIONS.map((condition) => ({
      ...condition,
      count: conditionMap.get(condition.value) ?? 0,
    }));

    return {
      ...totals,
      favorites,
      sets,
      maxSetValue,
      conditions,
    };
  }, [cards, totals]);

  const hasCostData = stats.costedQty > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Statistiques"
      subtitle="Vue d’ensemble de votre collection"
    >
      <div className="rounded-2xl border border-line bg-surface-2/50 p-4">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          Valeur totale
        </p>
        <p className="mt-1 text-[32px] font-semibold leading-none tracking-[-0.025em] tabular">
          {eur(stats.value)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div>
            <p className="text-[11px] text-muted">Investi</p>
            <p className="mt-0.5 text-[14px] font-semibold tabular">
              {hasCostData ? eur(stats.invested) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted">Plus-value</p>
            {hasCostData ? (
              <p
                className={`mt-0.5 flex items-center justify-end gap-1 text-[14px] font-semibold tabular ${
                  stats.gain >= 0 ? "text-positive" : "text-accent"
                }`}
              >
                {stats.gain >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {eur(Math.abs(stats.gain))}
              </p>
            ) : (
              <p className="mt-0.5 text-[12px] text-muted">À renseigner</p>
            )}
          </div>
        </div>
        {!hasCostData ? (
          <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
            Ajoutez un prix d’achat à vos cartes pour suivre votre plus-value.
          </p>
        ) : null}
        {hasCostData && stats.missingCostQty > 0 ? (
          <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
            Plus-value calculée sur {plural(stats.costedQty, "carte")} avec un
            prix d’achat.
          </p>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <StatTile label="Cartes" value={num(stats.totalQty)} />
        <StatTile label="Uniques" value={num(cards.length)} />
        <StatTile label="Séries" value={num(stats.sets.length)} />
        <StatTile label="Favoris" value={num(stats.favorites)} />
      </div>

      {history.length >= 2 ? (
        <ValueChart history={history} />
      ) : history.length === 1 ? (
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          L’historique de valeur se construit à chaque ouverture. La courbe
          apparaîtra au fil des jours.
        </p>
      ) : null}

      {stats.sets.length > 0 ? (
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[13px] font-semibold">Résumé par série</h3>
            <span className="text-[11px] text-muted">
              {stats.sets.length} série{stats.sets.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {stats.sets.slice(0, 5).map((set) => (
              <div key={set.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[12.5px] text-ink">
                    {set.name}
                  </p>
                  <p className="shrink-0 text-[12px] font-medium tabular text-ink">
                    {eur(set.value)}
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${Math.max(
                          set.value > 0
                            ? (set.value / stats.maxSetValue) * 100
                            : 4,
                          4,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-9 text-right text-[10.5px] text-muted">
                    {set.count}×
                  </span>
                </div>
              </div>
            ))}
          </div>
          {stats.sets.length > 5 ? (
            <p className="mt-2 text-right text-[10.5px] text-muted">
              + {stats.sets.length - 5} autre
              {stats.sets.length - 5 > 1 ? "s" : ""} série
              {stats.sets.length - 5 > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {stats.totalQty > 0 ? (
        <div className="mt-6">
          <h3 className="text-[13px] font-semibold">Répartition par état</h3>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
            {stats.conditions.map((condition) =>
              condition.count > 0 ? (
                <div
                  key={condition.value}
                  className="h-full"
                  style={{
                    width: `${(condition.count / stats.totalQty) * 100}%`,
                    backgroundColor: CONDITION_COLORS[condition.value],
                  }}
                  title={`${condition.label} · ${condition.count}`}
                />
              ) : null,
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {stats.conditions
              .filter((condition) => condition.count > 0)
              .map((condition) => (
                <div
                  key={condition.value}
                  className="flex items-center justify-between gap-2 text-[11.5px]"
                >
                  <span className="flex items-center gap-1.5 text-muted">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: CONDITION_COLORS[condition.value],
                      }}
                    />
                    {condition.label}
                  </span>
                  <span className="tabular text-ink">{condition.count}</span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        Les valeurs utilisent le prix Cardmarket quand il est disponible, sinon
        le prix d’achat renseigné. Les prix sont indicatifs. L’historique de
        valeur reste sur cet appareil.
      </p>
    </Sheet>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3.5 py-3">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.02em] tabular">
        {value}
      </p>
    </div>
  );
}
