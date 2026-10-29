"use client";

import {
  Check,
  ImagePlus,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { CATALOG_LANGUAGES, CONDITIONS, LANGUAGES } from "@/lib/constants";
import { eur, parsePriceInput } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { parseCodeQuery, searchCatalog } from "@/lib/pokemon";
import type {
  CardCondition,
  CatalogCard,
  CatalogLanguage,
  OwnedCard,
} from "@/lib/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CardImage } from "./card-image";
import { Sheet } from "./sheet";
import {
  Chip,
  Field,
  Select,
  Spinner,
  inputClass,
  textareaClass,
} from "./ui";

type AddCardSheetProps = {
  open: boolean;
  onClose: () => void;
  cards: OwnedCard[];
  onAddCatalog: (card: CatalogCard) => void;
  onAddManual: (card: Omit<OwnedCard, "uid" | "addedAt">) => void;
};

const SUGGESTIONS: Record<CatalogLanguage, string[]> = {
  fr: ["Dracaufeu", "Pikachu", "Mew", "Évoli", "Magicarpe"],
  en: ["Charizard", "Pikachu", "Mew", "Eevee", "Magikarp"],
  ja: ["リザードン", "ピカチュウ", "ミュウ", "イーブイ", "コイキング"],
};

function catalogLanguageLabel(lang: CatalogLanguage): string {
  return CATALOG_LANGUAGES.find((item) => item.value === lang)?.label ?? lang;
}

export function AddCardSheet({
  open,
  onClose,
  cards,
  onAddCatalog,
  onAddManual,
}: AddCardSheetProps) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [catalogLang, setCatalogLang] = useState<CatalogLanguage>("fr");
  const debouncedQuery = useDebouncedValue(query, 450);
  const [response, setResponse] = useState<{
    query: string;
    lang: CatalogLanguage;
    attempt: number;
    data: CatalogCard[];
  } | null>(null);
  const [searchError, setSearchError] = useState<{
    query: string;
    lang: CatalogLanguage;
    attempt: number;
    message: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const addedTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const openRef = useRef(open);

  const [mName, setMName] = useState("");
  const [mSet, setMSet] = useState("");
  const [mCode, setMCode] = useState("");
  const [mPurchase, setMPurchase] = useState("");
  const [mValue, setMValue] = useState("");
  const [mQty, setMQty] = useState(1);
  const [mCondition, setMCondition] = useState<CardCondition>("NM");
  const [mLanguage, setMLanguage] = useState("FR");
  const [mNote, setMNote] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ownedByApi = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of cards) {
      if (!card.apiId) continue;
      const key = `${card.apiLang ?? "fr"}:${card.apiId}`;
      map.set(key, (map.get(key) ?? 0) + card.quantity);
    }
    return map;
  }, [cards]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode !== "search") return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 320);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    if (resetTimer.current) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "search") return;
    const value = debouncedQuery.trim();
    const parsed = parseCodeQuery(value);
    if (!parsed && value.length < 2) return;
    const controller = new AbortController();
    searchCatalog(value, catalogLang, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setResponse({ query: value, lang: catalogLang, attempt, data: list });
        setSearchError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSearchError({
          query: value,
          lang: catalogLang,
          attempt,
          message:
            "La base de cartes est momentanément injoignable. Réessayez ou ajoutez la carte manuellement.",
        });
      });
    return () => controller.abort();
  }, [open, mode, debouncedQuery, catalogLang, attempt]);

  useEffect(() => {
    return () => {
      if (addedTimer.current) window.clearTimeout(addedTimer.current);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const normalizedQuery = query.trim();
  const parsedQuery = parseCodeQuery(normalizedQuery);
  const codeQuery = parsedQuery !== null;
  const results =
    response &&
    response.query === normalizedQuery &&
    response.attempt === attempt &&
    (codeQuery || response.lang === catalogLang)
      ? response.data
      : null;
  const error =
    searchError &&
    searchError.query === normalizedQuery &&
    searchError.attempt === attempt &&
    (codeQuery || searchError.lang === catalogLang)
      ? searchError.message
      : null;
  const loading =
    open &&
    mode === "search" &&
    (codeQuery || normalizedQuery.length >= 2) &&
    results === null &&
    error === null;

  function resetPanel() {
    setQuery("");
    setCatalogLang("fr");
    setResponse(null);
    setSearchError(null);
    setAttempt(0);
    setMode("search");
    setMName("");
    setMSet("");
    setMCode("");
    setMPurchase("");
    setMValue("");
    setMQty(1);
    setMCondition("NM");
    setMLanguage("FR");
    setMNote("");
    setPhoto(undefined);
    setPhotoError(null);
  }

  function handleClose() {
    onClose();
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      if (openRef.current) return;
      resetPanel();
    }, 350);
  }

  function handleAdd(card: CatalogCard) {
    onAddCatalog(card);
    setJustAdded(`${card.lang}:${card.apiId}`);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setJustAdded(null), 1400);
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      setPhoto(await compressImage(file));
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : "Impossible de lire cette image.",
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = mName.trim();
    if (!name) return;
    const purchase = parsePriceInput(mPurchase);
    const value = parsePriceInput(mValue);
    onAddManual({
      name,
      setName: mSet.trim() || undefined,
      code: mCode.trim() || undefined,
      photo,
      condition: mCondition,
      language: mLanguage,
      quantity: mQty,
      purchasePrice: purchase,
      marketPrice: value,
      priceUpdatedAt: value != null ? new Date().toISOString() : undefined,
      note: mNote.trim() || undefined,
    });
    handleClose();
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Ajouter une carte"
      subtitle="Catalogue FR, EN, JP ou saisie manuelle."
    >
      <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-2 p-1">
        <button
          type="button"
          aria-pressed={mode === "search"}
          onClick={() => setMode("search")}
          className={`h-9 rounded-full text-[13px] font-medium transition ${
            mode === "search"
              ? "bg-surface text-ink shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          Rechercher
        </button>
        <button
          type="button"
          aria-pressed={mode === "manual"}
          onClick={() => setMode("manual")}
          className={`h-9 rounded-full text-[13px] font-medium transition ${
            mode === "manual"
              ? "bg-surface text-ink shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          Manuelle
        </button>
      </div>

      {mode === "search" ? (
        <div className="mt-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom ou code, ex. 125/103"
              type="text"
              inputMode="search"
              autoComplete="off"
              enterKeyHint="search"
              className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-11 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {loading ? (
                <Spinner className="h-4 w-4 text-muted" />
              ) : query ? (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {codeQuery ? (
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted">
              Recherche par code dans{" "}
              <span className="font-medium text-ink">FR, EN et JP</span>.
              {parsedQuery && !parsedQuery.total
                ? " Ajoutez le total (ex. 125/103) pour cibler une édition."
                : ""}
            </p>
          ) : (
            <div className="mt-3 flex items-center gap-1.5 px-0.5">
              <span className="mr-1 text-[11px] text-muted">Recherche en</span>
              {CATALOG_LANGUAGES.map((language) => (
                <Chip
                  key={language.value}
                  active={catalogLang === language.value}
                  onClick={() => setCatalogLang(language.value)}
                  className="h-7 px-2.5 text-[11px]"
                >
                  {language.label}
                </Chip>
              ))}
              <span className="ml-auto text-[11px] text-muted">ou par code</span>
            </div>
          )}

          {!codeQuery && normalizedQuery.length < 2 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-2/40 px-4 py-6 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-accent" />
              <p className="mt-2 text-[13px] font-medium text-ink">
                Cherchez parmi des milliers de cartes
              </p>
              <p className="mx-auto mt-1 max-w-[290px] text-[12px] leading-relaxed text-muted">
                Noms en {catalogLanguageLabel(catalogLang)}, ou code comme
                125/103. Prix Cardmarket et image récupérés automatiquement.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS[catalogLang].map((suggestion) => (
                  <Chip
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="h-7 bg-surface px-3 text-[11.5px]"
                  >
                    {suggestion}
                  </Chip>
                ))}
                <Chip
                  onClick={() => setQuery("125/103")}
                  className="h-7 bg-surface px-3 text-[11.5px]"
                >
                  Code · 125/103
                </Chip>
              </div>
            </div>
          ) : loading && results === null ? (
            <div className="mt-4 space-y-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-line p-2.5"
                >
                  <div className="shimmer h-[62px] w-[45px] shrink-0 rounded-md bg-surface-2" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="shimmer h-3.5 w-2/3 rounded-full bg-surface-2" />
                    <div className="shimmer h-3 w-1/2 rounded-full bg-surface-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mt-4 rounded-2xl border border-line bg-surface-2/50 p-4 text-center">
              <p className="text-[12.5px] leading-relaxed text-muted">{error}</p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="h-8 rounded-full bg-ink px-3.5 text-[12px] font-medium text-bg"
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="h-8 rounded-full border border-line bg-surface px-3.5 text-[12px] font-medium text-ink"
                >
                  Saisie manuelle
                </button>
              </div>
            </div>
          ) : results && results.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line px-4 py-7 text-center">
              <p className="text-[13px] font-medium text-ink">
                Aucune carte trouvée
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                {codeQuery
                  ? parsedQuery?.total
                    ? "Vérifiez le numéro et le total, ou essayez le nom de la carte."
                    : "Vérifiez le numéro, ou ajoutez le total (ex. 125/103)."
                  : "Essayez un autre nom ou ajoutez la carte manuellement."}
              </p>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="mt-3 h-8 rounded-full border border-line bg-surface px-3.5 text-[12px] font-medium text-ink"
              >
                Saisie manuelle
              </button>
            </div>
          ) : results ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between px-0.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  Résultats
                </p>
                <p className="text-[11px] text-muted">
                  {codeQuery
                    ? "FR · EN · JP"
                    : catalogLanguageLabel(catalogLang)}{" "}
                  · {results.length}
                </p>
              </div>
              <div className="space-y-1.5">
                {results.map((card) => {
                  const key = `${card.lang}:${card.apiId}`;
                  const owned = ownedByApi.get(key) ?? 0;
                  const isJustAdded = justAdded === key;
                  const langLabel = catalogLanguageLabel(card.lang);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleAdd(card)}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition hover:border-line hover:bg-surface-2/60 active:scale-[0.99]"
                    >
                      <div className="relative h-[62px] w-[45px] shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
                        <CardImage src={card.imageLow} alt={card.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13.5px] font-medium text-ink">
                            {card.name}
                          </p>
                          <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-semibold text-muted">
                            {langLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11.5px] text-muted">
                          {card.setName || "Série inconnue"}
                          {card.code ? ` · ${card.code}` : ""}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[12px] font-semibold tabular text-ink">
                            {card.marketPrice != null
                              ? eur(card.marketPrice)
                              : "Prix indisponible"}
                          </span>
                          {owned > 0 ? (
                            <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">
                              ×{owned}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                          isJustAdded
                            ? "border-positive bg-positive-soft text-positive"
                            : "border-line bg-surface text-muted group-hover:border-accent group-hover:text-accent"
                        }`}
                      >
                        {isJustAdded ? (
                          <Check className="h-4 w-4" strokeWidth={3} />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 px-1 text-center text-[11px] leading-relaxed text-muted">
                Touchez une carte pour l’ajouter. Les cartes sans scan, souvent
                japonaises, acceptent une photo dans le détail.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleManualSubmit}>
          <div className="flex items-start gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
            {photo ? (
              <div className="relative h-[112px] w-[80px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
                <CardImage src={photo} alt="Photo de la carte" />
                <button
                  type="button"
                  aria-label="Retirer la photo"
                  onClick={() => setPhoto(undefined)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                className="flex h-[112px] w-[80px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-surface-2/40 text-muted transition hover:border-accent hover:text-accent"
              >
                {photoBusy ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
                <span className="text-[10px] font-medium">
                  {photoBusy ? "Traitement" : "Photo"}
                </span>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <Field label="Nom de la carte" hint="Requis">
                <input
                  value={mName}
                  onChange={(event) => setMName(event.target.value)}
                  placeholder="Ex. Dracaufeu"
                  className={inputClass}
                  required
                />
              </Field>
              {photo ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 text-[11px] font-medium text-accent"
                >
                  Changer la photo
                </button>
              ) : (
                <p className="mt-1 text-[11px] text-muted">
                  Photo optionnelle, stockée sur cet appareil.
                </p>
              )}
            </div>
          </div>
          {photoError ? (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-[11.5px] text-accent-strong">
              {photoError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Série">
              <input
                value={mSet}
                onChange={(event) => setMSet(event.target.value)}
                placeholder="Ex. 151"
                className={inputClass}
              />
            </Field>
            <Field label="Code / numéro">
              <input
                value={mCode}
                onChange={(event) => setMCode(event.target.value)}
                placeholder="Ex. MEW 151/165"
                className={inputClass}
              />
            </Field>
            <Field label="Prix d’achat" hint="€">
              <input
                value={mPurchase}
                onChange={(event) => setMPurchase(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className={inputClass}
              />
            </Field>
            <Field label="Valeur estimée" hint="€">
              <input
                value={mValue}
                onChange={(event) => setMValue(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className={inputClass}
              />
            </Field>
            <Field label="État">
              <Select
                value={mCondition}
                onChange={(event) =>
                  setMCondition(event.target.value as CardCondition)
                }
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition.value} value={condition.value}>
                    {condition.value} · {condition.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Langue">
              <Select
                value={mLanguage}
                onChange={(event) => setMLanguage(event.target.value)}
              >
                {LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
            <span className="text-[12px] font-medium text-muted">Quantité</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Diminuer la quantité"
                onClick={() => setMQty((value) => Math.max(1, value - 1))}
                disabled={mQty <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink transition active:scale-95 disabled:opacity-40"
              >
                −
              </button>
              <span className="w-9 text-center text-[14px] font-semibold tabular">
                {mQty}
              </span>
              <button
                type="button"
                aria-label="Augmenter la quantité"
                onClick={() => setMQty((value) => Math.min(999, value + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink transition active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          <Field label="Note" hint="Optionnel">
            <textarea
              value={mNote}
              onChange={(event) => setMNote(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Provenance, édition, échange…"
              className={textareaClass}
            />
          </Field>

          <button
            type="submit"
            disabled={!mName.trim() || photoBusy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[14px] font-semibold text-white transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Ajouter à ma collection
          </button>
        </form>
      )}
    </Sheet>
  );
}
