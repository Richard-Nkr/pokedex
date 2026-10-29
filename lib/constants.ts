import type { CardCondition, CatalogLanguage, SortKey } from "./types";

export const CATALOG_LANGUAGES: {
  value: CatalogLanguage;
  label: string;
  cardLanguage: string;
}[] = [
  { value: "fr", label: "FR", cardLanguage: "FR" },
  { value: "en", label: "EN", cardLanguage: "EN" },
  { value: "ja", label: "JP", cardLanguage: "JP" },
];

export const CONDITIONS: {
  value: CardCondition;
  label: string;
  hint: string;
}[] = [
  { value: "NM", label: "Near Mint", hint: "Comme neuve" },
  { value: "EX", label: "Excellent", hint: "Légères traces" },
  { value: "GD", label: "Bon", hint: "Traces visibles" },
  { value: "LP", label: "Jouée", hint: "Usure marquée" },
  { value: "PL", label: "Très jouée", hint: "Fortement usée" },
  { value: "PO", label: "Abîmée", hint: "Endommagée" },
];

export const CONDITION_LABELS: Record<CardCondition, string> = {
  NM: "Near Mint",
  EX: "Excellent",
  GD: "Bon",
  LP: "Jouée",
  PL: "Très jouée",
  PO: "Abîmée",
};

export const LANGUAGES = [
  "FR",
  "EN",
  "JP",
  "DE",
  "IT",
  "ES",
  "PT",
  "KR",
  "ZH",
] as const;

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Ajout récent" },
  { value: "value-desc", label: "Valeur décroissante" },
  { value: "value-asc", label: "Valeur croissante" },
  { value: "name", label: "Nom (A–Z)" },
];

export const TYPE_COLORS: Record<string, string> = {
  Feu: "#e8603c",
  Eau: "#3d8fd1",
  Plante: "#4e9a51",
  "Électrique": "#d9a521",
  Psy: "#b56bc4",
  Combat: "#c0563e",
  Obscurité: "#5b5b6b",
  "Métal": "#8c9ba5",
  Dragon: "#7766d4",
  Incolore: "#9c958b",
  Fée: "#d979a8",
};

export const CONDITION_COLORS: Record<CardCondition, string> = {
  NM: "#2f9e63",
  EX: "#7fa63a",
  GD: "#c39a2c",
  LP: "#cf7a2a",
  PL: "#c15a3c",
  PO: "#a34b4b",
};
