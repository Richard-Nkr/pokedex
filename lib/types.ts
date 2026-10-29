export type CardCondition = "NM" | "EX" | "GD" | "LP" | "PL" | "PO";

export type CatalogLanguage = "fr" | "en" | "ja";

export type OwnedCard = {
  uid: string;
  apiId?: string;
  apiLang?: CatalogLanguage;
  name: string;
  imageLow?: string;
  imageHigh?: string;
  photo?: string;
  nativeName?: string;
  setName?: string;
  code?: string;
  rarity?: string;
  types?: string[];
  condition: CardCondition;
  language: string;
  quantity: number;
  purchasePrice?: number;
  marketPrice?: number;
  priceUpdatedAt?: string;
  note?: string;
  favorite?: boolean;
  addedAt: number;
};

export type CatalogCard = {
  apiId: string;
  lang: CatalogLanguage;
  name: string;
  nativeName?: string;
  dexId?: number;
  suffix?: string;
  imageLow?: string;
  imageHigh?: string;
  setId?: string;
  setName: string;
  setCode: string;
  localId: string;
  code: string;
  rarity?: string;
  types?: string[];
  setTotal?: number;
  marketPrice: number | null;
  priceUpdatedAt?: string;
};

export type ValueSnapshot = {
  date: string;
  value: number;
  quantity: number;
};

export type SortKey = "recent" | "value-desc" | "value-asc" | "name";

export type ToastMessage = {
  id: number;
  text: string;
  tone?: "default" | "success";
};
