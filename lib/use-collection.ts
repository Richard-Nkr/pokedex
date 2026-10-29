"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
  const latestCards = useRef(cards);

  useEffect(() => {
    latestCards.current = cards;
  }, [cards]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const ok = saveCollection(cards);
      setStorageError(!ok);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [cards, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const flush = () => {
      saveCollection(latestCards.current);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [hydrated]);

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
