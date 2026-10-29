import { CONDITIONS, LANGUAGES } from "./constants";
import type {
  CardCondition,
  CatalogLanguage,
  OwnedCard,
  ValueSnapshot,
} from "./types";

const STORAGE_KEY = "pokedex.collection.v1";
const VALUE_HISTORY_KEY = "pokedex.value-history.v1";
const VALUE_HISTORY_LIMIT = 180;
const VALID_CONDITIONS = new Set(CONDITIONS.map((c) => c.value));
const VALID_LANGUAGES = new Set<string>(LANGUAGES);
const VALID_CATALOG_LANGUAGES = new Set<string>(["fr", "en", "ja"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function cleanImage(value: unknown): string | undefined {
  const raw = cleanString(value, 500_000);
  if (!raw) return undefined;
  if (raw.startsWith("data:image/")) return raw;
  if (raw.startsWith("https://") || raw.startsWith("http://")) return raw;
  return undefined;
}

function cleanNumber(value: unknown, max = 1_000_000): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(",", "."))
        : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.min(Math.round(parsed * 100) / 100, max);
}

export function normalizeCard(value: unknown): OwnedCard | null {
  if (!isRecord(value)) return null;
  const name = cleanString(value.name, 120);
  if (!name) return null;

  const condition = VALID_CONDITIONS.has(value.condition as CardCondition)
    ? (value.condition as CardCondition)
    : "NM";

  const language =
    typeof value.language === "string" && VALID_LANGUAGES.has(value.language)
      ? value.language
      : "FR";

  const quantityRaw = cleanNumber(value.quantity);
  const quantity =
    quantityRaw && quantityRaw >= 1 ? Math.min(Math.floor(quantityRaw), 999) : 1;

  const types = Array.isArray(value.types)
    ? value.types
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.slice(0, 40))
        .slice(0, 4)
    : undefined;

  const addedAt =
    typeof value.addedAt === "number" && Number.isFinite(value.addedAt)
      ? value.addedAt
      : typeof value.addedAt === "string" && !Number.isNaN(Date.parse(value.addedAt))
        ? Date.parse(value.addedAt)
        : Date.now();

  const apiLang =
    typeof value.apiLang === "string" &&
    VALID_CATALOG_LANGUAGES.has(value.apiLang)
      ? (value.apiLang as CatalogLanguage)
      : undefined;

  return {
    uid:
      cleanString(value.uid, 80) ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    apiId: cleanString(value.apiId, 80),
    apiLang,
    name,
    imageLow: cleanImage(value.imageLow),
    imageHigh: cleanImage(value.imageHigh),
    photo: cleanImage(value.photo),
    nativeName: cleanString(value.nativeName, 120),
    setName: cleanString(value.setName, 120),
    code: cleanString(value.code, 80),
    rarity: cleanString(value.rarity, 80),
    types: types && types.length > 0 ? types : undefined,
    condition,
    language,
    quantity,
    purchasePrice: cleanNumber(value.purchasePrice),
    marketPrice: cleanNumber(value.marketPrice),
    priceUpdatedAt: cleanString(value.priceUpdatedAt, 40),
    note: cleanString(value.note, 500),
    favorite: Boolean(value.favorite),
    addedAt,
  };
}

export function loadCollection(): OwnedCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parseCollection(raw) ?? [];
  } catch {
    return [];
  }
}

export function saveCollection(cards: OwnedCard[]): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return true;
  } catch {
    return false;
  }
}

export function loadValueHistory(): ValueSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VALUE_HISTORY_KEY);
    if (!raw) return [];
    return sanitizeValueHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveValueHistory(history: ValueSnapshot[]): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(VALUE_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}

export function mergeValueSnapshot(
  history: ValueSnapshot[],
  snapshot: ValueSnapshot,
): ValueSnapshot[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date)) return history;
  const value = cleanNumber(snapshot.value, 1_000_000_000);
  if (value == null) return history;
  const quantity = Math.max(0, Math.floor(cleanNumber(snapshot.quantity, 999_999) ?? 0));
  const clean = sanitizeValueHistory(history);
  const nextSnapshot: ValueSnapshot = {
    date: snapshot.date,
    value,
    quantity,
  };

  const last = clean[clean.length - 1];
  if (
    last &&
    last.date === nextSnapshot.date &&
    last.value === nextSnapshot.value &&
    last.quantity === nextSnapshot.quantity
  ) {
    return history;
  }

  const next = clean.filter((item) => item.date !== nextSnapshot.date);
  next.push(nextSnapshot);
  next.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed = next.slice(-VALUE_HISTORY_LIMIT);

  if (
    trimmed.length === history.length &&
    trimmed.every(
      (item, index) =>
        item.date === history[index].date &&
        item.value === history[index].value &&
        item.quantity === history[index].quantity,
    )
  ) {
    return history;
  }

  return trimmed;
}

function sanitizeValueHistory(value: unknown): ValueSnapshot[] {
  if (!Array.isArray(value)) return [];
  const byDate = new Map<string, ValueSnapshot>();
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      continue;
    }
    const parsed = cleanNumber(item.value, 1_000_000_000);
    if (parsed == null) continue;
    const quantity = Math.max(
      0,
      Math.floor(cleanNumber(item.quantity, 999_999) ?? 0),
    );
    byDate.set(item.date, { date: item.date, value: parsed, quantity });
  }
  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-VALUE_HISTORY_LIMIT);
}

export function parseCollection(raw: string): OwnedCard[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.cards)
        ? parsed.cards
        : null;
    if (!list) return null;
    return list
      .map(normalizeCard)
      .filter((card): card is OwnedCard => card !== null);
  } catch {
    return null;
  }
}

export function downloadCollection(cards: OwnedCard[]): void {
  const payload = {
    app: "pokedex",
    version: 1,
    exportedAt: new Date().toISOString(),
    cards,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `pokedex-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
