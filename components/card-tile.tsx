"use client";

import { Heart } from "lucide-react";
import { memo } from "react";
import { CONDITION_COLORS } from "@/lib/constants";
import { eur } from "@/lib/format";
import type { OwnedCard } from "@/lib/types";
import { CardImage } from "./card-image";

type CardTileProps = {
  card: OwnedCard;
  index: number;
  onOpen: (uid: string) => void;
};

export const CardTile = memo(function CardTile({
  card,
  index,
  onOpen,
}: CardTileProps) {
  const price = card.marketPrice ?? card.purchasePrice;

  return (
    <button
      type="button"
      onClick={() => onOpen(card.uid)}
      className="anim-fade-up group flex w-full flex-col text-left outline-none"
      style={{ animationDelay: `${Math.min(index, 10) * 28}ms` }}
      aria-label={`${card.name}, ${card.quantity} exemplaire${
        card.quantity > 1 ? "s" : ""
      }, ${card.language}`}
    >
      <div className="relative aspect-[245/342] w-full overflow-hidden rounded-[18px] border border-line bg-surface-2 transition duration-300 group-hover:shadow-soft group-focus-visible:ring-2 group-focus-visible:ring-accent/40 group-active:scale-[0.985]">
        <CardImage
          src={card.photo ?? card.imageLow ?? card.imageHigh}
          fallbackSrc={card.photo ? card.imageLow ?? card.imageHigh : undefined}
          alt={card.name}
          className="transition-transform duration-500 group-hover:scale-[1.035]"
        />
        <span
          title={`Langue : ${card.language}`}
          className="absolute bottom-2 left-2 rounded-full bg-ink/75 px-1.5 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur"
        >
          {card.language}
        </span>
        {card.quantity > 1 ? (
          <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10.5px] font-semibold tabular text-white backdrop-blur">
            ×{card.quantity}
          </span>
        ) : null}
        {card.favorite ? (
          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/85 text-accent shadow-sm backdrop-blur">
            <Heart className="h-3 w-3" fill="currentColor" />
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 min-w-0 px-0.5">
        <p className="truncate text-[13px] font-medium leading-tight text-ink">
          {card.name}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
            {card.condition !== "NM" ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: CONDITION_COLORS[card.condition] }}
                title={card.condition}
              />
            ) : null}
            <span className="truncate">{card.code ?? card.setName ?? "—"}</span>
          </span>
          <span className="shrink-0 text-[12px] font-semibold tabular text-ink">
            {eur(price)}
          </span>
        </div>
      </div>
    </button>
  );
});
