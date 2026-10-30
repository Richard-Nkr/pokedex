"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpDown,
  ChartNoAxesColumn,
  Check,
  ChevronRight,
  Ellipsis,
  Layers,
  Plus,
  Search,
  Star,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { mapWithConcurrency } from "@/lib/async";
import { CATALOG_LANGUAGES, SORT_OPTIONS } from "@/lib/constants";
import { eur, num, plural } from "@/lib/format";
import { fetchCardPrice } from "@/lib/pokemon";
import { downloadCollection } from "@/lib/storage";
import { getCollectionTotals } from "@/lib/totals";
import type {
  CatalogCard,
  CatalogLanguage,
  OwnedCard,
  SortKey,
  ToastMessage,
} from "@/lib/types";
import { useCollection } from "@/lib/use-collection";
import { useValueHistory } from "@/lib/use-value-history";
import { AddCardSheet } from "@/components/add-card-sheet";
import { useAuth } from "@/components/auth-provider";
import { CardDetailSheet } from "@/components/card-detail-sheet";
import { CardTile } from "@/components/card-tile";
import { MenuSheet } from "@/components/menu-sheet";
import { Pokeball } from "@/components/pokeball";
import { Sheet } from "@/components/sheet";
import { StatsSheet } from "@/components/stats-sheet";
import { Toast } from "@/components/toast";
import { Chip } from "@/components/ui";

function createUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cardLanguageFor(lang: CatalogLanguage): string {
  return CATALOG_LANGUAGES.find((item) => item.value === lang)?.cardLanguage ?? "FR";
}

export default function PokedexApp() {
  const { account, scope, signOut } = useAuth();
  const { cards, setCards, loaded, storageError, replaceAll } =
    useCollection(scope);
  const valueHistory = useValueHistory(cards, loaded, scope);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeSet, setActiveSet] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailUid, setDetailUid] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [refreshState, setRefreshState] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const refreshLock = useRef(false);

  const notify = useCallback((text: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const totals = useMemo(() => getCollectionTotals(cards), [cards]);

  const sets = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of cards) {
      const name = card.setName?.trim() || "Sans série";
      map.set(name, (map.get(name) ?? 0) + card.quantity);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
  }, [cards]);

  const effectiveSet =
    activeSet && sets.some((set) => set.name === activeSet)
      ? activeSet
      : null;

  const visibleCards = useMemo(() => {
    const needle = deferredSearch.trim().toLocaleLowerCase("fr");
    const filtered = cards.filter((card) => {
      if (showFavorites && !card.favorite) return false;
      if (effectiveSet && (card.setName?.trim() || "Sans série") !== effectiveSet) {
        return false;
      }
      if (needle) {
        const haystack = [
          card.name,
          card.nativeName,
          card.setName,
          card.code,
          card.note,
          card.language,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr");
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    const priceOf = (card: OwnedCard) =>
      card.marketPrice ?? card.purchasePrice ?? null;
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "fr");
      if (sort === "recent") return b.addedAt - a.addedAt;
      const priceA = priceOf(a);
      const priceB = priceOf(b);
      if (priceA == null && priceB == null) return b.addedAt - a.addedAt;
      if (priceA == null) return 1;
      if (priceB == null) return -1;
      return sort === "value-desc" ? priceB - priceA : priceA - priceB;
    });
  }, [cards, deferredSearch, showFavorites, effectiveSet, sort]);

  const visibleQuantity = useMemo(
    () => visibleCards.reduce((total, card) => total + card.quantity, 0),
    [visibleCards],
  );

  const lastPriceUpdate = useMemo(() => {
    let latest = 0;
    for (const card of cards) {
      if (!card.priceUpdatedAt) continue;
      const time = Date.parse(card.priceUpdatedAt);
      if (Number.isFinite(time) && time > latest) latest = time;
    }
    return latest || null;
  }, [cards]);

  const priceStale = useMemo(
    () => cards.some((card) => card.apiId && !card.priceUpdatedAt),
    [cards],
  );

  const detailCard = useMemo(
    () => (detailUid ? cards.find((card) => card.uid === detailUid) ?? null : null),
    [cards, detailUid],
  );

  const updateCard = useCallback(
    (uid: string, patch: Partial<OwnedCard>) => {
      setCards((current) =>
        current.map((card) => (card.uid === uid ? { ...card, ...patch } : card)),
      );
    },
    [setCards],
  );

  const removeCard = useCallback(
    (uid: string) => {
      setCards((current) => current.filter((card) => card.uid !== uid));
      setDetailUid(null);
      notify("Carte supprimée");
    },
    [notify, setCards],
  );

  const addCatalogCard = useCallback(
    (catalog: CatalogCard) => {
      const existing = cards.find(
        (card) =>
          card.apiId === catalog.apiId &&
          (card.apiLang ?? "fr") === catalog.lang,
      );
      if (existing) {
        const quantity = Math.min(999, existing.quantity + 1);
        setCards((current) =>
          current.map((card) =>
            card.uid === existing.uid ? { ...card, quantity } : card,
          ),
        );
        notify(`${catalog.name} · quantité ${quantity}`);
        return;
      }
      const card: OwnedCard = {
        uid: createUid(),
        apiId: catalog.apiId,
        apiLang: catalog.lang,
        name: catalog.name,
        nativeName: catalog.nativeName,
        imageLow: catalog.imageLow,
        imageHigh: catalog.imageHigh,
        setName: catalog.setName || undefined,
        code: catalog.code || undefined,
        rarity: catalog.rarity,
        types: catalog.types,
        condition: "NM",
        language: cardLanguageFor(catalog.lang),
        quantity: 1,
        marketPrice: catalog.marketPrice ?? undefined,
        priceUpdatedAt: catalog.priceUpdatedAt,
        addedAt: Date.now(),
      };
      setCards((current) => [card, ...current]);
      notify(`${catalog.name} ajoutée`);
    },
    [cards, notify, setCards],
  );

  const addManualCard = useCallback(
    (input: Omit<OwnedCard, "uid" | "addedAt">) => {
      const card: OwnedCard = {
        ...input,
        uid: createUid(),
        addedAt: Date.now(),
      };
      setCards((current) => [card, ...current]);
      notify("Carte ajoutée");
    },
    [notify, setCards],
  );

  const refreshAllPrices = useCallback(async () => {
    if (refreshLock.current) return;
    const tasksByKey = new Map<
      string,
      { key: string; apiId: string; lang: CatalogLanguage }
    >();
    for (const card of cards) {
      if (!card.apiId) continue;
      const lang = card.apiLang ?? "fr";
      const key = `${lang}:${card.apiId}`;
      tasksByKey.set(key, { key, apiId: card.apiId, lang });
    }
    const tasks = Array.from(tasksByKey.values());
    if (tasks.length === 0) {
      notify("Aucune carte liée à la base de prix");
      return;
    }
    refreshLock.current = true;
    setRefreshState({ done: 0, total: tasks.length });
    const results = new Map<
      string,
      { price: number | null; updatedAt: string }
    >();
    let failures = 0;
    await mapWithConcurrency(tasks, 4, async (task) => {
      try {
        results.set(task.key, await fetchCardPrice(task.apiId, task.lang));
      } catch {
        failures += 1;
      }
      setRefreshState((current) =>
        current ? { ...current, done: current.done + 1 } : current,
      );
    });
    setCards((current) =>
      current.map((card) => {
        if (!card.apiId) return card;
        const key = `${card.apiLang ?? "fr"}:${card.apiId}`;
        const result = results.get(key);
        if (!result) return card;
        return {
          ...card,
          marketPrice: result.price ?? card.marketPrice,
          priceUpdatedAt: result.updatedAt,
        };
      }),
    );
    setRefreshState(null);
    refreshLock.current = false;
    notify(
      failures > 0
        ? `Prix actualisés · ${failures} échec${failures > 1 ? "s" : ""}`
        : `Prix actualisés · ${plural(tasks.length, "prix", "prix")}`,
    );
  }, [cards, notify, setCards]);

  const refreshOnePrice = useCallback(
    async (card: OwnedCard) => {
      if (!card.apiId) {
        notify("Cette carte n’a pas de prix automatique");
        return false;
      }
      try {
        const result = await fetchCardPrice(card.apiId, card.apiLang ?? "fr");
        setCards((current) =>
          current.map((item) =>
            item.uid === card.uid
              ? {
                  ...item,
                  marketPrice: result.price ?? item.marketPrice,
                  priceUpdatedAt: result.updatedAt,
                }
              : item,
          ),
        );
        notify("Prix actualisé");
        return true;
      } catch {
        notify("Impossible d’actualiser le prix");
        return false;
      }
    },
    [notify, setCards],
  );

  const importCollection = useCallback(
    (imported: OwnedCard[]) => {
      replaceAll(imported);
      setSearch("");
      setActiveSet(null);
      setShowFavorites(false);
      notify(`${plural(imported.length, "carte")} importée${imported.length > 1 ? "s" : ""}`);
    },
    [notify, replaceAll],
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setShowFavorites(false);
    setActiveSet(null);
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Pokeball className="h-11 w-11 animate-pulse text-accent" />
          <span className="sr-only">Chargement de votre collection</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm">
              <Pokeball className="h-[19px] w-[19px]" strokeWidth={3.4} />
            </span>
            <div>
              <p className="text-[15px] font-semibold leading-none tracking-[-0.01em]">
                Pokédex
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                Collection TCG
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              aria-label="Statistiques"
              title="Statistiques"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-surface-2 active:scale-95"
            >
              <ChartNoAxesColumn className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Réglages et sauvegarde"
              title="Réglages et sauvegarde"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-surface-2 active:scale-95"
            >
              <Ellipsis className="h-[18px] w-[18px]" />
              {priceStale ? (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-surface" />
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 sm:px-6">
        {storageError ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-accent/25 bg-accent-soft px-3.5 py-3 text-[11.5px] leading-relaxed text-accent-strong">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Le stockage local est saturé. Exportez votre collection depuis le
              menu, puis retirez des photos pour libérer de l’espace.
            </p>
          </div>
        ) : null}

        {cards.length === 0 ? (
          <section className="anim-fade-up mt-8 rounded-[28px] border border-line bg-surface p-7 text-center shadow-soft sm:mt-12 sm:p-10">
            <Pokeball
              className="mx-auto h-14 w-14 text-accent"
              strokeWidth={2.6}
            />
            <h1 className="mt-5 text-[23px] font-semibold tracking-[-0.02em]">
              Votre Pokédex est prêt
            </h1>
            <p className="mx-auto mt-2 max-w-[310px] text-[13px] leading-relaxed text-muted">
              Ajoutez vos cartes pour suivre leur valeur Cardmarket, leur état,
              leurs photos et vos plus-values.
            </p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[14px] font-semibold text-white shadow-[0_12px_36px_-14px_var(--accent)] transition hover:brightness-105 active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
              Ajouter ma première carte
            </button>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Prix Cardmarket
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Photos & codes
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Sauvegarde export
              </span>
            </div>
          </section>
        ) : (
          <>
            <section className="anim-fade-up relative mt-4 overflow-hidden rounded-[26px] border border-line bg-surface px-5 py-5 shadow-soft sm:px-6">
              <Pokeball
                className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 text-accent opacity-[0.06]"
                strokeWidth={4}
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Valeur estimée
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatsOpen(true)}
                    className="-mr-1 flex items-center gap-1 rounded-full px-1 py-0.5 text-[11px] font-medium text-muted transition hover:text-ink"
                  >
                    <ChartNoAxesColumn className="h-3.5 w-3.5" />
                    Stats
                  </button>
                </div>
                <p className="mt-2.5 text-[40px] font-semibold leading-none tracking-[-0.035em] tabular sm:text-[46px]">
                  {eur(totals.value)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-[11.5px] font-medium text-ink">
                    <Layers className="h-3.5 w-3.5 text-muted" />
                    {plural(totals.totalQty, "carte")}
                  </span>
                  {totals.costedQty > 0 ? (
                    <span
                      title="Plus-value sur les cartes avec un prix d’achat"
                      className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold tabular ${
                        totals.gain >= 0
                          ? "bg-positive-soft text-positive"
                          : "bg-accent-soft text-accent-strong"
                      }`}
                    >
                      {totals.gain >= 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {eur(Math.abs(totals.gain))}
                    </span>
                  ) : (
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-[11.5px] font-medium text-ink">
                      {num(sets.length)} série{sets.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 mt-4 bg-bg/90 px-4 pb-2.5 pt-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    type="text"
                    inputMode="search"
                    placeholder="Rechercher dans ma collection"
                    aria-label="Rechercher dans ma collection"
                    className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-[13.5px] text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Effacer la recherche"
                      className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setSortOpen(true)}
                  aria-label="Trier la collection"
                  title="Trier"
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-surface-2 active:scale-95"
                >
                  <ArrowUpDown className="h-[17px] w-[17px]" />
                  {sort !== "recent" ? (
                    <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-surface" />
                  ) : null}
                </button>
              </div>
              <div className="no-scrollbar -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
                <Chip
                  active={!showFavorites && !effectiveSet}
                  onClick={resetFilters}
                >
                  Tout
                </Chip>
                <Chip
                  active={showFavorites}
                  onClick={() => setShowFavorites((value) => !value)}
                >
                  <Star
                    className="h-3.5 w-3.5"
                    fill={showFavorites ? "currentColor" : "none"}
                  />
                  Favoris
                </Chip>
                {sets.map((set) => (
                  <Chip
                    key={set.name}
                    active={effectiveSet === set.name}
                    onClick={() =>
                      setActiveSet((current) =>
                        current === set.name ? null : set.name,
                      )
                    }
                  >
                    <span className="max-w-[150px] truncate">{set.name}</span>
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between px-0.5">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em]">
                Ma collection
              </h2>
              <p className="text-[11.5px] tabular text-muted">
                {visibleQuantity === totals.totalQty
                  ? plural(totals.totalQty, "carte")
                  : `${num(visibleQuantity)} / ${num(totals.totalQty)}`}
              </p>
            </div>

            {visibleCards.length === 0 ? (
              <div className="mt-3 rounded-3xl border border-dashed border-line px-6 py-12 text-center">
                <Search className="mx-auto h-6 w-6 text-muted" />
                <p className="mt-3 text-[13px] font-medium">
                  Aucune carte ne correspond
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  Essayez un autre nom ou retirez les filtres.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 h-9 rounded-full border border-line bg-surface px-4 text-[12px] font-medium text-ink transition hover:bg-surface-2"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 min-[480px]:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5">
                {visibleCards.map((card, index) => (
                  <CardTile
                    key={card.uid}
                    card={card}
                    index={index}
                    onOpen={setDetailUid}
                  />
                ))}
              </div>
            )}

            <footer className="mt-10 flex flex-col items-center gap-1.5 pb-2 text-center">
              <p className="text-[10.5px] text-muted/80">
                Prix Cardmarket indicatifs · Données stockées sur cet appareil
              </p>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="text-[10.5px] font-medium text-muted underline-offset-2 transition hover:text-ink hover:underline"
              >
                Exporter une sauvegarde
              </button>
            </footer>
          </>
        )}
      </main>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Ajouter une carte"
        className="fixed bottom-[max(20px,env(safe-area-inset-bottom))] right-5 z-40 flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-4 text-white shadow-[0_12px_40px_-12px_var(--accent)] transition hover:brightness-105 active:scale-95 sm:right-[max(2rem,calc((100vw-64rem)/2+1.5rem))]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.6} />
        <span className="hidden text-[13.5px] font-semibold sm:inline">
          Ajouter
        </span>
      </button>

      <AddCardSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        cards={cards}
        onAddCatalog={addCatalogCard}
        onAddManual={(card) => {
          addManualCard(card);
        }}
      />

      <CardDetailSheet
        card={detailCard}
        open={detailCard !== null}
        onClose={() => setDetailUid(null)}
        onUpdate={updateCard}
        onRemove={removeCard}
        onRefreshPrice={refreshOnePrice}
      />

      <StatsSheet
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        cards={cards}
        history={valueHistory}
      />

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        accountName={account.username}
        onSignOut={signOut}
        cardCount={cards.length}
        lastPriceUpdate={lastPriceUpdate}
        refreshState={refreshState}
        onRefresh={refreshAllPrices}
        onExport={() => {
          downloadCollection(cards);
          notify("Sauvegarde exportée");
        }}
        onImport={importCollection}
        storageError={storageError}
      />

      <Sheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Trier la collection"
        subtitle="Choisissez l’ordre d’affichage"
      >
        <div className="-mx-2">
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSort(option.value);
                  setSortOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-surface-2/70"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
                      active ? "border-accent" : "border-line-strong"
                    }`}
                  >
                    {active ? (
                      <span className="h-2 w-2 rounded-full bg-accent" />
                    ) : null}
                  </span>
                  <span
                    className={`text-[13.5px] ${
                      active ? "font-semibold text-ink" : "text-ink"
                    }`}
                  >
                    {option.label}
                  </span>
                </span>
                {active ? (
                  <Check className="h-4 w-4 text-accent" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted/60" />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-2 text-[11px] leading-relaxed text-muted">
          Les cartes sans prix sont classées en dernier.
        </p>
      </Sheet>

      <Toast toast={toast} />
    </div>
  );
}
