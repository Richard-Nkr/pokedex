"use client";

import {
  Camera,
  Check,
  Copy,
  Heart,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
import { compressImage } from "@/lib/image";
import { translateJapaneseCard } from "@/lib/pokemon";
import type { CardCondition, OwnedCard } from "@/lib/types";
import { CardImage } from "./card-image";
import { PhotoCropper } from "./photo-cropper";
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
  const [crop, setCrop] = useState<{ uid: string; src: string } | null>(null);
  const cropping = card && crop?.uid === card.uid ? crop.src : null;

  function handleClose() {
    setCrop(null);
    onClose();
  }

  return (
    <Sheet
      open={open && card !== null}
      onClose={handleClose}
      title={cropping ? "Recadrer la photo" : card?.name || "Détail de la carte"}
      subtitle={cropping ? "Cadrez les bords de la carte." : card?.setName}
    >
      {card && cropping ? (
        <PhotoCropper
          src={cropping}
          onCancel={() => setCrop(null)}
          onConfirm={(dataUrl) => {
            onUpdate(card.uid, { photo: dataUrl });
            setCrop(null);
          }}
        />
      ) : card ? (
        <DetailContent
          key={card.uid}
          card={card}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onRefreshPrice={onRefreshPrice}
          onCrop={(src) => setCrop({ uid: card.uid, src })}
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
  onCrop,
}: {
  card: OwnedCard;
  onUpdate: (uid: string, patch: Partial<OwnedCard>) => void;
  onRemove: (uid: string) => void;
  onRefreshPrice: (card: OwnedCard) => Promise<boolean>;
  onCrop: (src: string) => void;
}) {
  const [priceDraft, setPriceDraft] = useState(priceInputValue(card.purchasePrice));
  const [valueDraft, setValueDraft] = useState(priceInputValue(card.marketPrice));
  const [noteDraft, setNoteDraft] = useState(card.note ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameEdited = useRef(false);

  useEffect(() => {
    if (
      card.apiLang !== "ja" ||
      !card.apiId ||
      card.nativeName ||
      !card.types?.length ||
      !/[\u3040-\u30ff\u3400-\u9fff]/.test(card.name)
    ) {
      return;
    }
    let cancelled = false;
    translateJapaneseCard(card.apiId).then((translated) => {
      if (cancelled || !translated || nameEdited.current) return;
      onUpdate(card.uid, {
        name: translated.name,
        nativeName: translated.nativeName,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [
    card.apiId,
    card.apiLang,
    card.name,
    card.nativeName,
    card.types,
    card.uid,
    onUpdate,
  ]);

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

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      onCrop(await compressImage(file));
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : "Impossible de lire cette image.",
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  const imageSrc = card.photo ?? card.imageHigh ?? card.imageLow;
  const imageFallback = card.photo
    ? card.imageHigh ?? card.imageLow
    : card.imageHigh
      ? card.imageLow
      : undefined;

  return (
    <div>
      <div className="flex justify-center">
        <div className="relative w-[186px] overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-soft">
          <div className="aspect-[245/342]">
            <CardImage
              src={imageSrc}
              fallbackSrc={imageFallback}
              alt={card.name}
              priority
            />
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhoto}
      />
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={photoBusy}
          className="flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[11px] font-medium text-muted transition hover:text-ink disabled:opacity-60"
        >
          {photoBusy ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {photoBusy
            ? "Traitement…"
            : card.photo
              ? "Changer la photo"
              : "Ajouter une photo"}
        </button>
        {card.photo ? (
          <button
            type="button"
            onClick={() => onUpdate(card.uid, { photo: undefined })}
            className="flex h-7 items-center gap-1 rounded-full border border-line bg-surface px-2.5 text-[11px] font-medium text-muted transition hover:border-accent/30 hover:text-accent"
          >
            <Trash2 className="h-3 w-3" />
            Retirer
          </button>
        ) : null}
      </div>
      {photoError ? (
        <p className="mx-auto mt-2 max-w-[260px] text-center text-[11px] leading-relaxed text-accent-strong">
          {photoError}
        </p>
      ) : !card.photo && !card.imageLow && !card.imageHigh ? (
        <p className="mx-auto mt-2 max-w-[240px] text-center text-[11px] leading-relaxed text-muted">
          Pas de scan officiel. Ajoutez votre photo, elle reste sur cet
          appareil.
        </p>
      ) : null}

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

      <div className="mt-4">
        <Field label="Nom affiché" hint="Modifiable">
          <input
            value={card.name}
            onChange={(event) => {
              nameEdited.current = true;
              onUpdate(card.uid, { name: event.target.value });
            }}
            onBlur={() => {
              if (!card.name.trim()) {
                onUpdate(card.uid, {
                  name: card.nativeName ?? "Carte sans nom",
                });
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            autoComplete="off"
            className={inputClass}
          />
        </Field>
        {card.nativeName ? (
          <p className="mt-1.5 text-[11px] text-muted">
            Nom d’origine :{" "}
            <span lang="ja" className="text-ink">
              {card.nativeName}
            </span>
          </p>
        ) : null}
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
            onChange={(event) => {
              setPriceDraft(event.target.value);
              onUpdate(card.uid, {
                purchasePrice: parsePriceInput(event.target.value),
              });
            }}
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
                onChange={(event) => {
                  setValueDraft(event.target.value);
                  onUpdate(card.uid, {
                    marketPrice: parsePriceInput(event.target.value),
                  });
                }}
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
