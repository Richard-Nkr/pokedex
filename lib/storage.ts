import { CONDITIONS, LANGUAGES } from "./constants";
import type { CardCondition, OwnedCard } from "./types";

const STORAGE_KEY = "pokedex.collection.v1";
const VALID_CONDITIONS = new Set(CONDITIONS.map((c) => c.value));
const VALID_LANGUAGES = new Set<string>(LANGUAGES);

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

  return {
    uid:
      cleanString(value.uid, 80) ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    apiId: cleanString(value.apiId, 80),
    name,
    imageLow: cleanImage(value.imageLow),
    imageHigh: cleanImage(value.imageHigh),
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
