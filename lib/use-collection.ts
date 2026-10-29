"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { loadCollection, saveCollection } from "./storage";
import type { OwnedCard } from "./types";

const emptySubscribe = () => () => {};

export function useCollection() {
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [cards, setCards] = useState<OwnedCard[]>(() => loadCollection());
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const ok = saveCollection(cards);
      setStorageError(!ok);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [cards, hydrated]);

  const replaceAll = useCallback((next: OwnedCard[]) => {
    setCards(next);
  }, []);

  return {
    cards,
    setCards,
    loaded: hydrated,
    storageError,
    replaceAll,
  };
}
