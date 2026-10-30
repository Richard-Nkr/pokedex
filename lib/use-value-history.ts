"use client";

import { useEffect, useState } from "react";
import {
  loadValueHistory,
  mergeValueSnapshot,
  saveValueHistory,
} from "./storage";
import { getCollectionTotals } from "./totals";
import type { OwnedCard, ValueSnapshot } from "./types";

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useValueHistory(
  cards: OwnedCard[],
  ready: boolean,
  scope?: string,
): ValueSnapshot[] {
  const [history, setHistory] = useState<ValueSnapshot[]>(() =>
    loadValueHistory(scope),
  );

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const totals = getCollectionTotals(cards);
      if (totals.totalQty === 0) return;

      const snapshot: ValueSnapshot = {
        date: localDateKey(),
        value: Math.round(totals.value * 100) / 100,
        quantity: totals.totalQty,
      };
      const stored = loadValueHistory(scope);
      const next = mergeValueSnapshot(stored, snapshot);
      if (next === stored) {
        setHistory((current) => (current === stored ? current : next));
        return;
      }
      saveValueHistory(next, scope);
      setHistory(next);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [cards, ready, scope]);

  return history;
}
