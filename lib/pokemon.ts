import type { CatalogCard, CatalogLanguage } from "./types";

const API_ROOT = "https://api.tcgdex.net/v2";
const TEN_MINUTES = 10 * 60 * 1000;
const CATALOG_LANGUAGES: CatalogLanguage[] = ["fr", "en", "ja"];
const NAME_RESULTS = 24;
const CODE_RESULTS = 48;
const UNTARGETED_PER_LANGUAGE = 12;
const LOCAL_ID_LIST_LIMIT = 60;

const LANGUAGE_ORDER: Record<CatalogLanguage, number> = {
  fr: 0,
  en: 1,
  ja: 2,
};

type TcgdexCount = { official?: number; total?: number };

type TcgdexPriceBlock = {
  updated?: string;
  avg?: number | null;
  low?: number | null;
  trend?: number | null;
  avg1?: number | null;
  avg7?: number | null;
  avg30?: number | null;
};

type TcgdexCard = {
  id: string;
  name: string;
  localId: string;
  image?: string | null;
  rarity?: string;
  types?: string[];
  dexId?: number[];
  suffix?: string;
  set: {
    id: string;
    name: string;
    cardCount?: TcgdexCount;
    symbol?: string;
  };
  thirdParty?: { tcgplayer?: number | null } | null;
  pricing?: { cardmarket?: TcgdexPriceBlock | null } | null;
  variants_detailed?: {
    thirdParty?: { tcgplayer?: number | null } | null;
    pricing?: { cardmarket?: TcgdexPriceBlock | null } | null;
  }[];
};

type TcgdexListItem = {
  id: string;
  localId: string;
  name: string;
  image?: string | null;
};

type PokeApiSpecies = {
  names?: { name?: string; language?: { name?: string } }[];
};

type TcgdexSetSummary = {
  id: string;
  name: string;
  cardCount?: TcgdexCount;
  logo?: string;
  symbol?: string;
};

type TcgdexSet = TcgdexSetSummary & {
  abbreviation?: { official?: string; localized?: string };
  cards?: TcgdexListItem[];
};

export type ParsedCodeQuery = {
  number: string;
  total?: number;
  setHint?: string;
};

type CodeEntry = {
  lang: CatalogLanguage;
  detail: TcgdexCard | null;
  item: TcgdexListItem | null;
  set: TcgdexSet | null;
};

const cardCache = new Map<string, { value: TcgdexCard; at: number }>();
const setCache = new Map<string, { value: TcgdexSet; at: number }>();
const setListCache = new Map<
  CatalogLanguage,
  { value: TcgdexSetSummary[]; at: number }
>();
const pokemonNameCache = new Map<
  number,
  { value: string | null; at: number }
>();
const ONE_DAY = 24 * 60 * 60 * 1000;

const JP_FORM_PREFIXES: Array<[string, string]> = [
  ["アローラ", "Alolan"],
  ["ガラル", "Galarian"],
  ["ヒスイ", "Hisuian"],
  ["パルデア", "Paldean"],
  ["メガ", "Mega"],
];

function cacheKey(lang: CatalogLanguage, id: string): string {
  return `${lang}:${id}`;
}

function baseUrl(lang: CatalogLanguage): string {
  return `${API_ROOT}/${lang}`;
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Pokédex API (${response.status})`);
  }
  return (await response.json()) as T;
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

function rethrowIfAborted(error: unknown, signal?: AbortSignal): void {
  if (
    signal?.aborted ||
    (error instanceof DOMException && error.name === "AbortError")
  ) {
    throw error;
  }
}

export async function getCard(
  id: string,
  lang: CatalogLanguage = "fr",
  signal?: AbortSignal,
  fresh = false,
): Promise<TcgdexCard> {
  const key = cacheKey(lang, id);
  const cached = cardCache.get(key);
  if (!fresh && cached && Date.now() - cached.at < TEN_MINUTES) {
    return cached.value;
  }
  const value = await request<TcgdexCard>(
    `${baseUrl(lang)}/cards/${encodeURIComponent(id)}`,
    signal,
  );
  cardCache.set(key, { value, at: Date.now() });
  return value;
}

async function getCardOrNull(
  id: string,
  lang: CatalogLanguage,
  signal?: AbortSignal,
): Promise<TcgdexCard | null> {
  try {
    return await getCard(id, lang, signal);
  } catch (error) {
    rethrowIfAborted(error, signal);
    return null;
  }
}

async function getSet(
  id: string,
  lang: CatalogLanguage,
  signal?: AbortSignal,
): Promise<TcgdexSet | null> {
  const key = cacheKey(lang, id);
  const cached = setCache.get(key);
  if (cached && Date.now() - cached.at < TEN_MINUTES) {
    return cached.value;
  }
  try {
    const value = await request<TcgdexSet>(
      `${baseUrl(lang)}/sets/${encodeURIComponent(id)}`,
      signal,
    );
    setCache.set(key, { value, at: Date.now() });
    return value;
  } catch (error) {
    rethrowIfAborted(error, signal);
    return null;
  }
}

async function fetchSets(
  lang: CatalogLanguage,
  signal?: AbortSignal,
): Promise<TcgdexSetSummary[]> {
  const cached = setListCache.get(lang);
  if (cached && Date.now() - cached.at < TEN_MINUTES) {
    return cached.value;
  }
  const value = await request<TcgdexSetSummary[]>(
    `${baseUrl(lang)}/sets`,
    signal,
  );
  const list = Array.isArray(value) ? value : [];
  setListCache.set(lang, { value: list, at: Date.now() });
  return list;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function firstPrice(block?: TcgdexPriceBlock | null): number | null {
  if (!block) return null;
  const candidates = [
    block.trend,
    block.avg,
    block.avg30,
    block.avg7,
    block.avg1,
    block.low,
  ];
  for (const candidate of candidates) {
    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > 0
    ) {
      return candidate;
    }
  }
  return null;
}

export function extractPrice(card: TcgdexCard): {
  price: number | null;
  updatedAt?: string;
} {
  const base = card.pricing?.cardmarket;
  const basePrice = firstPrice(base);
  if (basePrice != null) {
    return { price: basePrice, updatedAt: base?.updated };
  }
  for (const variant of card.variants_detailed ?? []) {
    const block = variant.pricing?.cardmarket;
    const price = firstPrice(block);
    if (price != null) {
      return { price, updatedAt: block?.updated ?? base?.updated };
    }
  }
  return { price: null };
}

function formatSuffix(value?: string): string {
  const suffix = value?.trim();
  if (!suffix) return "";
  return suffix.toLowerCase() === "ex" ? "ex" : suffix.toUpperCase();
}

async function englishPokemonName(
  dexId: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const cached = pokemonNameCache.get(dexId);
  if (cached && Date.now() - cached.at < ONE_DAY) {
    return cached.value;
  }
  try {
    const data = await request<PokeApiSpecies>(
      `https://pokeapi.co/api/v2/pokemon-species/${dexId}`,
      signal,
    );
    const names = new Map<string, string>();
    for (const item of data.names ?? []) {
      const language = item.language?.name;
      if (language && item.name) names.set(language, item.name);
    }
    const value = names.get("en") ?? names.get("fr") ?? null;
    pokemonNameCache.set(dexId, { value, at: Date.now() });
    return value;
  } catch (error) {
    rethrowIfAborted(error, signal);
    return null;
  }
}

async function translateJapaneseName(
  rawName: string,
  dexId?: number,
  suffix?: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!dexId) return null;
  const base = await englishPokemonName(dexId, signal);
  if (!base) return null;
  let prefix = "";
  for (const [japanese, english] of JP_FORM_PREFIXES) {
    if (rawName.startsWith(japanese)) {
      prefix = english;
      break;
    }
  }
  const rawSuffix = rawName.match(
    /(VMAX|VSTAR|V-UNION|GX|EX|ex|BREAK|V)$/,
  )?.[0];
  return [prefix, base, formatSuffix(suffix ?? rawSuffix)]
    .filter(Boolean)
    .join(" ");
}

export async function translateJapaneseCard(
  apiId: string,
  signal?: AbortSignal,
): Promise<{ name: string; nativeName: string } | null> {
  try {
    const detail = await getCard(apiId, "ja", signal);
    const name = await translateJapaneseName(
      detail.name,
      detail.dexId?.[0],
      detail.suffix,
      signal,
    );
    if (!name || name === detail.name) return null;
    return { name, nativeName: detail.name };
  } catch (error) {
    rethrowIfAborted(error, signal);
    return null;
  }
}

function imageUrl(
  base: string | null | undefined,
  size: "low" | "high",
): string | undefined {
  if (!base) return undefined;
  return `${base}/${size}.webp`;
}

function tcgplayerImageUrl(
  card: TcgdexCard,
  size: "low" | "high",
): string | undefined {
  const direct = card.thirdParty?.tcgplayer;
  const fromVariant = card.variants_detailed?.find(
    (variant) => variant.thirdParty?.tcgplayer,
  )?.thirdParty?.tcgplayer;
  const id = direct ?? fromVariant;
  if (!id) return undefined;
  const pixels = size === "low" ? 300 : 600;
  return `https://product-images.tcgplayer.com/fit-in/${pixels}x${pixels}/${id}.jpg`;
}

function getSetCode(
  set: TcgdexSet | null | undefined,
  fallbackId: string,
): string {
  return (
    set?.abbreviation?.official?.trim() ||
    set?.abbreviation?.localized?.trim() ||
    fallbackId.toUpperCase()
  );
}

function getPrintedTotal(
  set: TcgdexSet | null | undefined,
  detail?: TcgdexCard | null,
): number | undefined {
  return (
    set?.cardCount?.official ??
    set?.cardCount?.total ??
    detail?.set.cardCount?.official ??
    detail?.set.cardCount?.total
  );
}

function formatCode(
  setCode: string,
  localId: string,
  total?: number,
): string {
  const number = total ? `${localId}/${total}` : localId;
  return [setCode, number].filter(Boolean).join(" ");
}

function toCatalogCard(entry: CodeEntry): CatalogCard {
  const { detail, item, lang, set } = entry;
  const imageBase = detail?.image ?? item?.image ?? null;
  const setId = detail?.set.id ?? set?.id ?? "";
  const localId = detail?.localId ?? item?.localId ?? "";
  const setCode = getSetCode(set, setId);
  const total = getPrintedTotal(set, detail);
  const price = detail ? extractPrice(detail) : { price: null };
  return {
    apiId: detail?.id ?? item?.id ?? "",
    lang,
    name: detail?.name ?? item?.name ?? "",
    dexId: detail?.dexId?.length === 1 ? detail.dexId[0] : undefined,
    suffix: detail?.suffix,
    imageLow:
      imageUrl(imageBase, "low") ??
      (detail ? tcgplayerImageUrl(detail, "low") : undefined),
    imageHigh:
      imageUrl(imageBase, "high") ??
      (detail ? tcgplayerImageUrl(detail, "high") : undefined),
    setId: setId || undefined,
    setName: detail?.set.name ?? set?.name ?? "",
    setCode,
    localId,
    code: formatCode(setCode, localId, total),
    rarity: detail?.rarity,
    types: detail?.types,
    setTotal: total,
    marketPrice: price.price,
    priceUpdatedAt: price.updatedAt,
  };
}

function normalizeLocalId(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
  if (match) {
    return `${match[1].toUpperCase()}${Number(match[2])}${match[3].toUpperCase()}`;
  }
  return trimmed.toUpperCase();
}

function localIdVariants(value: string): string[] {
  const variants = new Set<string>([value.trim()]);
  const match = value.trim().match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
  if (match) {
    const prefix = match[1];
    const digits = match[2];
    const suffix = match[3];
    const numeric = String(Number(digits));
    variants.add(`${prefix}${numeric}${suffix}`);
    for (const width of [2, 3, 4]) {
      variants.add(`${prefix}${numeric.padStart(width, "0")}${suffix}`);
    }
  }
  return Array.from(variants).filter(Boolean);
}

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function looksLikeSetHint(value: string): boolean {
  if (/[\d.]/.test(value)) return true;
  return (
    value.length <= 8 &&
    value === value.toUpperCase() &&
    /^[A-Z][A-Z0-9]*$/.test(value)
  );
}

export function parseCodeQuery(query: string): ParsedCodeQuery | null {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (!trimmed || !/\d/.test(trimmed)) return null;

  const withTotal = trimmed.match(
    /^(?:(.*?)[\s-]+)?([A-Za-z]*\d+[A-Za-z]*)\s*\/\s*([A-Za-z]*\d+[A-Za-z]*)$/,
  );
  if (withTotal) {
    const setHint = withTotal[1]?.trim();
    if (setHint && !looksLikeSetHint(setHint)) return null;
    const total = Number(withTotal[3].replace(/\D/g, ""));
    if (!Number.isFinite(total) || total <= 0) return null;
    return {
      number: withTotal[2],
      total,
      ...(setHint ? { setHint } : {}),
    };
  }

  const withSet = trimmed.match(
    /^(.*?)[\s-]+([A-Za-z]*\d+[A-Za-z]*)$/,
  );
  if (withSet) {
    const setHint = withSet[1].trim();
    if (setHint && looksLikeSetHint(setHint)) {
      return { number: withSet[2], setHint };
    }
  }

  if (/^\d{1,4}$/.test(trimmed)) {
    return { number: trimmed };
  }
  return null;
}

export function isCodeQuery(query: string): boolean {
  return parseCodeQuery(query) !== null;
}

function setMatchesHint(set: TcgdexSet, hint: string): boolean {
  const target = normalizeToken(hint);
  return [
    set.id,
    set.name,
    set.abbreviation?.official,
    set.abbreviation?.localized,
  ].some((value) => value != null && normalizeToken(value) === target);
}

function countMatches(count: TcgdexCount | undefined, total: number): boolean {
  if (!count) return false;
  return count.official === total || count.total === total;
}

async function listByLocalId(
  number: string,
  lang: CatalogLanguage,
  signal?: AbortSignal,
): Promise<TcgdexListItem[]> {
  const variants = localIdVariants(number);
  const lists = await Promise.all(
    variants.map((variant) =>
      request<TcgdexListItem[]>(
        `${baseUrl(lang)}/cards?localId=${encodeURIComponent(variant)}&pagination:itemsPerPage=${LOCAL_ID_LIST_LIMIT}`,
        signal,
      ),
    ),
  );
  if (signal?.aborted) throw abortError();
  const map = new Map<string, TcgdexListItem>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item?.id) map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

async function loadSets(
  ids: string[],
  lang: CatalogLanguage,
  signal?: AbortSignal,
): Promise<Map<string, TcgdexSet | null>> {
  const entries = await mapLimit(ids, 6, async (id) => {
    const set = await getSet(id, lang, signal);
    return [id, set] as const;
  });
  return new Map(entries);
}

function uniqueSetIds(details: (TcgdexCard | null)[]): string[] {
  const ids = new Set<string>();
  for (const detail of details) {
    if (detail) ids.add(detail.set.id);
  }
  return Array.from(ids);
}

async function localizeJapaneseCards(
  cards: CatalogCard[],
  signal?: AbortSignal,
): Promise<void> {
  await mapLimit(cards, 6, async (card) => {
    if (card.lang !== "ja" || !card.dexId) return;
    const name = await translateJapaneseName(
      card.name,
      card.dexId,
      card.suffix,
      signal,
    );
    if (name && name !== card.name) {
      card.nativeName = card.name;
      card.name = name;
    }
  });
}

async function finishResults(
  entries: CodeEntry[],
  limit: number,
  signal?: AbortSignal,
): Promise<CatalogCard[]> {
  if (signal?.aborted) throw abortError();

  const byKey = new Map<string, CodeEntry>();
  for (const entry of entries) {
    const key = `${entry.lang}:${entry.detail?.id ?? entry.item?.id ?? ""}`;
    const current = byKey.get(key);
    if (!current || (!current.detail && entry.detail)) {
      byKey.set(key, entry);
    }
  }

  const cards = Array.from(byKey.values()).map(toCatalogCard);
  await localizeJapaneseCards(cards, signal);

  return cards
    .sort(
      (a, b) =>
        LANGUAGE_ORDER[a.lang] - LANGUAGE_ORDER[b.lang] ||
        a.setName.localeCompare(b.setName, "fr") ||
        a.localId.localeCompare(b.localId, "fr", { numeric: true }),
    )
    .slice(0, limit);
}

async function searchByName(
  query: string,
  lang: CatalogLanguage,
  signal?: AbortSignal,
): Promise<CatalogCard[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const list = await request<TcgdexListItem[]>(
    `${baseUrl(lang)}/cards?name=${encodeURIComponent(trimmed)}&pagination:itemsPerPage=${NAME_RESULTS}`,
    signal,
  );
  if (!Array.isArray(list) || list.length === 0) return [];

  const details = await mapLimit(list, 8, (item) =>
    getCardOrNull(item.id, lang, signal),
  );
  const sets = await loadSets(uniqueSetIds(details), lang, signal);

  const cards = list.map((item, index) => {
    const detail = details[index];
    return toCatalogCard({
      lang,
      detail,
      item,
      set: detail ? sets.get(detail.set.id) ?? null : null,
    });
  });
  await localizeJapaneseCards(cards.slice(0, NAME_RESULTS), signal);
  return cards;
}

async function searchByTotal(
  parsed: ParsedCodeQuery,
  signal?: AbortSignal,
): Promise<CatalogCard[]> {
  const total = parsed.total;
  if (!total) return [];
  const wanted = normalizeLocalId(parsed.number);
  const entries: CodeEntry[] = [];

  for (const lang of CATALOG_LANGUAGES) {
    const sets = await fetchSets(lang, signal);
    const candidates = sets.filter((set) => countMatches(set.cardCount, total));
    if (candidates.length === 0) continue;

    const details = await mapLimit(candidates, 6, (set) =>
      getSet(set.id, lang, signal),
    );

    for (const set of details) {
      if (!set) continue;
      if (parsed.setHint && !setMatchesHint(set, parsed.setHint)) continue;
      const item = (set.cards ?? []).find(
        (card) => normalizeLocalId(card.localId) === wanted,
      );
      if (!item) continue;
      const detail = await getCardOrNull(item.id, lang, signal);
      entries.push({ lang, detail, item, set });
    }
  }

  return finishResults(entries, CODE_RESULTS, signal);
}

async function searchBySetHint(
  parsed: ParsedCodeQuery,
  signal?: AbortSignal,
): Promise<CatalogCard[]> {
  const hint = parsed.setHint;
  if (!hint) return [];
  const wanted = normalizeLocalId(parsed.number);
  const entries: CodeEntry[] = [];
  const satisfied = new Set<CatalogLanguage>();

  await Promise.all(
    CATALOG_LANGUAGES.map(async (lang) => {
      const directSet = await getSet(hint, lang, signal);
      if (directSet && setMatchesHint(directSet, hint)) {
        const item = (directSet.cards ?? []).find(
          (card) => normalizeLocalId(card.localId) === wanted,
        );
        if (item) {
          const detail = await getCardOrNull(item.id, lang, signal);
          entries.push({ lang, detail, item, set: directSet });
          satisfied.add(lang);
          return;
        }
      }

      const direct = await getCardOrNull(
        `${hint}-${parsed.number}`,
        lang,
        signal,
      );
      if (!direct) return;
      if (normalizeLocalId(direct.localId) !== wanted) return;
      const set = await getSet(direct.set.id, lang, signal);
      if (!set || !setMatchesHint(set, hint)) return;
      entries.push({ lang, detail: direct, item: null, set });
      satisfied.add(lang);
    }),
  );

  for (const lang of CATALOG_LANGUAGES) {
    if (satisfied.has(lang)) continue;
    const items = (await listByLocalId(parsed.number, lang, signal)).slice(
      0,
      24,
    );
    if (items.length === 0) continue;
    const details = await mapLimit(items, 8, (item) =>
      getCardOrNull(item.id, lang, signal),
    );
    const sets = await loadSets(uniqueSetIds(details), lang, signal);
    for (let index = 0; index < items.length; index += 1) {
      const detail = details[index];
      const item = items[index];
      if (!detail) continue;
      if (normalizeLocalId(detail.localId) !== wanted) continue;
      const set = sets.get(detail.set.id) ?? null;
      if (!set || !setMatchesHint(set, hint)) continue;
      entries.push({ lang, detail, item, set });
    }
  }

  return finishResults(entries, 24, signal);
}

async function searchByNumber(
  parsed: ParsedCodeQuery,
  signal?: AbortSignal,
): Promise<CatalogCard[]> {
  const wanted = normalizeLocalId(parsed.number);
  const entries: CodeEntry[] = [];

  for (const lang of CATALOG_LANGUAGES) {
    const items = (await listByLocalId(parsed.number, lang, signal)).slice(
      0,
      UNTARGETED_PER_LANGUAGE,
    );
    if (items.length === 0) continue;
    const details = await mapLimit(items, 8, (item) =>
      getCardOrNull(item.id, lang, signal),
    );
    const sets = await loadSets(uniqueSetIds(details), lang, signal);
    for (let index = 0; index < items.length; index += 1) {
      const detail = details[index];
      const item = items[index];
      if (!detail) continue;
      if (normalizeLocalId(detail.localId) !== wanted) continue;
      entries.push({
        lang,
        detail,
        item,
        set: sets.get(detail.set.id) ?? null,
      });
    }
  }

  return finishResults(entries, 36, signal);
}

export async function searchCatalog(
  query: string,
  lang: CatalogLanguage,
  signal?: AbortSignal,
): Promise<CatalogCard[]> {
  const parsed = parseCodeQuery(query);
  if (parsed) {
    if (parsed.total) return searchByTotal(parsed, signal);
    if (parsed.setHint) return searchBySetHint(parsed, signal);
    return searchByNumber(parsed, signal);
  }
  return searchByName(query, lang, signal);
}

export async function fetchCardPrice(
  apiId: string,
  lang: CatalogLanguage = "fr",
): Promise<{ price: number | null; updatedAt: string }> {
  const card = await getCard(apiId, lang, undefined, true);
  const { price, updatedAt } = extractPrice(card);
  return { price, updatedAt: updatedAt ?? new Date().toISOString() };
}
