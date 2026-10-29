import type { CatalogCard } from "./types";

const BASE = "https://api.tcgdex.net/v2/fr";
const TEN_MINUTES = 10 * 60 * 1000;

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
  image?: string;
  rarity?: string;
  types?: string[];
  set: {
    id: string;
    name: string;
    cardCount?: { official?: number; total?: number };
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
  image?: string;
};

type TcgdexSet = {
  id: string;
  name: string;
  abbreviation?: { official?: string; localized?: string };
};

const cardCache = new Map<string, { value: TcgdexCard; at: number }>();
const setCache = new Map<string, { value: TcgdexSet; at: number }>();

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

export async function getCard(
  id: string,
  signal?: AbortSignal,
  fresh = false,
): Promise<TcgdexCard> {
  const cached = cardCache.get(id);
  if (!fresh && cached && Date.now() - cached.at < TEN_MINUTES) {
    return cached.value;
  }
  const value = await request<TcgdexCard>(
    `${BASE}/cards/${encodeURIComponent(id)}`,
    signal,
  );
  cardCache.set(id, { value, at: Date.now() });
  return value;
}

async function getSet(
  id: string,
  signal?: AbortSignal,
): Promise<TcgdexSet | null> {
  const cached = setCache.get(id);
  if (cached && Date.now() - cached.at < TEN_MINUTES) {
    return cached.value;
  }
  try {
    const value = await request<TcgdexSet>(
      `${BASE}/sets/${encodeURIComponent(id)}`,
      signal,
    );
    setCache.set(id, { value, at: Date.now() });
    return value;
  } catch {
    return null;
  }
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
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
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

function imageUrl(base: string | undefined, size: "low" | "high"): string | undefined {
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

export async function searchCatalog(
  query: string,
  signal?: AbortSignal,
): Promise<CatalogCard[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const list = await request<TcgdexListItem[]>(
    `${BASE}/cards?name=${encodeURIComponent(trimmed)}&pagination:itemsPerPage=14`,
    signal,
  );
  if (!Array.isArray(list) || list.length === 0) return [];

  const details = await Promise.all(
    list.map((item) =>
      getCard(item.id, signal).catch(() => null),
    ),
  );
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const setIds = Array.from(
    new Set(
      details
        .filter((detail): detail is TcgdexCard => detail !== null)
        .map((detail) => detail.set.id),
    ),
  );
  const sets = new Map<string, TcgdexSet | null>();
  await Promise.all(
    setIds.map(async (id) => {
      sets.set(id, await getSet(id, signal));
    }),
  );

  return list.map((item, index) => {
    const detail = details[index];
    const imageBase = detail?.image ?? item.image;
    if (!detail) {
      return {
        apiId: item.id,
        name: item.name,
        imageLow: imageUrl(imageBase, "low"),
        imageHigh: imageUrl(imageBase, "high"),
        setName: "",
        setCode: "",
        localId: item.localId,
        code: item.localId,
        marketPrice: null,
      };
    }
    const setInfo = sets.get(detail.set.id) ?? null;
    const setCode =
      setInfo?.abbreviation?.official ??
      setInfo?.abbreviation?.localized ??
      detail.set.id.toUpperCase();
    const { price, updatedAt } = extractPrice(detail);
    return {
      apiId: detail.id,
      name: detail.name,
      imageLow:
        imageUrl(imageBase, "low") ?? tcgplayerImageUrl(detail, "low"),
      imageHigh:
        imageUrl(imageBase, "high") ?? tcgplayerImageUrl(detail, "high"),
      setName: detail.set.name,
      setCode,
      localId: detail.localId,
      code: `${setCode} ${detail.localId}`.trim(),
      rarity: detail.rarity,
      types: detail.types,
      setTotal: detail.set.cardCount?.official ?? detail.set.cardCount?.total,
      marketPrice: price,
      priceUpdatedAt: updatedAt,
    };
  });
}

export async function fetchCardPrice(apiId: string): Promise<{
  price: number | null;
  updatedAt: string;
}> {
  const card = await getCard(apiId, undefined, true);
  const { price, updatedAt } = extractPrice(card);
  return { price, updatedAt: updatedAt ?? new Date().toISOString() };
}
