"use client";

import {
  Check,
  Copy,
  Heart,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CONDITIONS,
  CONDITION_LABELS,
  LANGUAGES,
  TYPE_COLORS,
} from "@/lib/constants";
import {
  dateShort,
  eur,
  parsePriceInput,
  priceInputValue,
  relativeDate,
} from "@/lib/format";
import type { CardCondition, OwnedCard } from "@/lib/types";
import { CardImage } from "./card-image";
import { Sheet } from "./sheet";
import { Field, Select, Spinner, inputClass, textareaClass } from "./ui";

type CardDetailSheetProps = {
  card: OwnedCard | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (uid: string, patch: Partial<OwnedCard>) => void;
  onRemove: (uid: string) => void;
  onRefreshPrice: (card: OwnedCard) => Promise<boolean>;
};

export function CardDetailSheet({
  card,
  open,
  onClose,
  onUpdate,
  onRemove,
  onRefreshPrice,
}: CardDetailSheetProps) {
  return (
    <Sheet
      open={open && card !== null}
      onClose={onClose}
      title={card?.name ?? "Détail de la carte"}
      subtitle={card?.setName}
    >
      {card ? (
        <DetailContent
          key={card.uid}
          card={card}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onRefreshPrice={onRefreshPrice}
        />
      ) : null}
    </Sheet>
  );
}

function DetailContent({
  card,
  onUpdate,
  onRemove,
  onRefreshPrice,
}: {
  card: OwnedCard;
  onUpdate: (uid: string, patch: Partial<OwnedCard>) => void;
  onRemove: (uid: string) => void;
  onRefreshPrice: (card: OwnedCard) => Promise<boolean>;
}) {
  const [priceDraft, setPriceDraft] = useState(priceInputValue(card.purchasePrice));
  const [valueDraft, setValueDraft] = useState(priceInputValue(card.marketPrice));
  const [noteDraft, setNoteDraft] = useState(card.note ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const unitPrice = card.marketPrice ?? card.purchasePrice;
  const label = card.marketPrice != null
    ? card.apiId
      ? "Prix Cardmarket"
      : "Valeur estimée"
    : card.purchasePrice != null
      ? "Prix d’achat"
      : "Prix";

  const updated = card.apiId
    ? relativeDate(card.priceUpdatedAt)
    : card.marketPrice != null
      ? "Valeur manuelle"
      : null;

  async function copyCode() {
    if (!card.code) return;
    try {
      await navigator.clipboard.writeText(card.code);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be unavailable; the code is still visible.
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    await onRefreshPrice(card);
    setRefreshing(false);
  }

  return (
    <div>
      <div className="flex justify-center">
        <div className="relative w-[186px] overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-soft">
          <div className="aspect-[245/342]">
            <CardImage
              src={card.imageHigh ?? card.imageLow}
              alt={card.name}
              priority
            />
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onUpdate(card.uid, { favorite: !card.favorite })}
          className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition ${
            card.favorite
              ? "border-accent/30 bg-accent-soft text-accent-strong"
              : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          <Heart
            className="h-3.5 w-3.5"
            fill={card.favorite ? "currentColor" : "none"}
          />
          {card.favorite ? "Favorite" : "Favori"}
        </button>
        {card.code ? (
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copier le code de la carte"
            className="flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 font-mono text-[10.5px] text-muted transition hover:text-ink"
          >
            {card.code}
            {copied ? (
              <Check className="h-3 w-3 text-positive" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        ) : null}
        {card.rarity ? (
          <span className="flex h-7 items-center rounded-full border border-line bg-surface px-2.5 text-[10.5px] text-muted">
            {card.rarity}
          </span>
        ) : null}
        {card.types?.map((type) => (
          <span
            key={type}
            className="flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[10.5px] text-muted"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[type] ?? "var(--muted)" }}
            />
            {type}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface-2/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              {label}
            </p>
            {unitPrice != null ? (
              <p className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.02em] tabular text-ink">
                {eur(unitPrice)}
              </p>
            ) : (
              <p className="mt-1.5 text-[16px] font-medium text-muted">
                Prix indisponible
              </p>
            )}
            {updated ? (
              <p className="mt-1.5 text-[11px] text-muted">
                {card.apiId ? "Actualisé " : ""}
                {updated}
              </p>
            ) : null}
          </div>
          {card.apiId ? (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Actualiser le prix"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:text-ink active:scale-95 disabled:opacity-60"
            >
              {refreshing ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>
        {card.quantity > 1 && unitPrice != null ? (
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px]">
            <span className="text-muted">
              Total pour {card.quantity} exemplaires
            </span>
            <span className="font-semibold tabular text-ink">
              {eur(unitPrice * card.quantity)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-muted">
            Quantité
          </span>
          <div className="flex h-11 items-center justify-between rounded-xl border border-line bg-surface px-1.5">
            <button
              type="button"
              aria-label="Diminuer la quantité"
              onClick={() =>
                onUpdate(card.uid, {
                  quantity: Math.max(1, card.quantity - 1),
                })
              }
              disabled={card.quantity <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink active:scale-95 disabled:opacity-35"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-[14px] font-semibold tabular">
              {card.quantity}
            </span>
            <button
              type="button"
              aria-label="Augmenter la quantité"
              onClick={() =>
                onUpdate(card.uid, {
                  quantity: Math.min(999, card.quantity + 1),
                })
              }
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <Field
          label="État"
          hint={
            CONDITIONS.find((item) => item.value === card.condition)?.label
          }
        >
          <Select
            value={card.condition}
            onChange={(event) =>
              onUpdate(card.uid, {
                condition: event.target.value as CardCondition,
              })
            }
            aria-label="État de la carte"
          >
            {CONDITIONS.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.value} · {CONDITION_LABELS[condition.value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Langue">
          <Select
            value={card.language}
            onChange={(event) =>
              onUpdate(card.uid, { language: event.target.value })
            }
            aria-label="Langue de la carte"
          >
            {LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prix d’achat" hint="€">
          <input
            value={priceDraft}
            onChange={(event) => setPriceDraft(event.target.value)}
            onBlur={() =>
              onUpdate(card.uid, {
                purchasePrice: parsePriceInput(priceDraft),
              })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass}
          />
        </Field>
        {!card.apiId ? (
          <div className="col-span-2">
            <Field label="Valeur estimée" hint="€">
              <input
                value={valueDraft}
                onChange={(event) => setValueDraft(event.target.value)}
                onBlur={() =>
                  onUpdate(card.uid, {
                    marketPrice: parsePriceInput(valueDraft),
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                inputMode="decimal"
                placeholder="0,00"
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <Field label="Note" hint={`${noteDraft.length}/500`}>
          <textarea
            value={noteDraft}
            onChange={(event) => {
              setNoteDraft(event.target.value);
              onUpdate(card.uid, {
                note: event.target.value || undefined,
              });
            }}
            rows={2}
            maxLength={500}
            placeholder="Édition, provenance, échange…"
            className={textareaClass}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
        <span>Ajoutée le {dateShort(card.addedAt)}</span>
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3" /> Enregistré
        </span>
      </div>

      <div className="mt-5">
        {confirmingDelete ? (
          <div className="rounded-2xl border border-accent/30 bg-accent-soft p-3">
            <p className="px-1 text-[12px] text-accent-strong">
              Supprimer définitivement cette carte de votre collection ?
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onRemove(card.uid)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent text-[12px] font-semibold text-white transition active:scale-[0.99]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-[12px] font-medium text-ink transition active:scale-[0.99]"
              >
                <X className="h-3.5 w-3.5" />
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line text-[12.5px] font-medium text-accent transition hover:border-accent/30 hover:bg-accent-soft active:scale-[0.99]"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer de la collection
          </button>
        )}
      </div>
    </div>
  );
}
