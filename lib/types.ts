export type CardCondition = "NM" | "EX" | "GD" | "LP" | "PL" | "PO";

export type OwnedCard = {
  uid: string;
  apiId?: string;
  name: string;
  imageLow?: string;
  imageHigh?: string;
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
  name: string;
  imageLow?: string;
  imageHigh?: string;
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

export type SortKey = "recent" | "value-desc" | "value-asc" | "name";

export type ToastMessage = {
  id: number;
  text: string;
  tone?: "default" | "success";
};
