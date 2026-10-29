import type { OwnedCard } from "./types";

export type CollectionTotals = {
  totalQty: number;
  value: number;
  invested: number;
  gain: number;
  costedQty: number;
  missingCostQty: number;
};

export function getCollectionTotals(cards: OwnedCard[]): CollectionTotals {
  let totalQty = 0;
  let value = 0;
  let invested = 0;
  let costedValue = 0;
  let costedQty = 0;

  for (const card of cards) {
    const unit = card.marketPrice ?? card.purchasePrice;
    totalQty += card.quantity;
    value += (unit ?? 0) * card.quantity;

    if (card.purchasePrice != null) {
      invested += card.purchasePrice * card.quantity;
      costedValue += (unit ?? card.purchasePrice) * card.quantity;
      costedQty += card.quantity;
    }
  }

  return {
    totalQty,
    value,
    invested,
    gain: costedValue - invested,
    costedQty,
    missingCostQty: totalQty - costedQty,
  };
}
