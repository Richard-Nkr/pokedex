const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("fr-FR");

export function eur(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return eurFormatter.format(value);
}

export function eurCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return eurFormatter.format(value);
}

export function num(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return numberFormatter.format(value);
}

export function plural(
  count: number,
  singular: string,
  pluralForm = `${singular}s`,
): string {
  return `${num(count)} ${count > 1 ? pluralForm : singular}`;
}

export function dateShort(input: string | number | null | undefined): string {
  if (input == null) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function relativeDate(
  input: string | number | null | undefined,
): string | null {
  if (input == null) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "aujourd’hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return dateShort(date.getTime());
}

export function parsePriceInput(raw: string): number | undefined {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".").trim();
  if (!cleaned) return undefined;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value * 100) / 100;
}

export function priceInputValue(value: number | undefined): string {
  if (value == null) return "";
  return String(value).replace(".", ",");
}
