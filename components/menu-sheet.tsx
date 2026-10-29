"use client";

import {
  ChevronRight,
  Download,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { relativeDate } from "@/lib/format";
import { parseCollection } from "@/lib/storage";
import type { OwnedCard } from "@/lib/types";
import { Sheet } from "./sheet";
import { Spinner } from "./ui";

type RefreshState = { done: number; total: number } | null;

export function MenuSheet({
  open,
  onClose,
  cardCount,
  lastPriceUpdate,
  refreshState,
  onRefresh,
  onExport,
  onImport,
  storageError,
}: {
  open: boolean;
  onClose: () => void;
  cardCount: number;
  lastPriceUpdate: number | null;
  refreshState: RefreshState;
  onRefresh: () => void;
  onExport: () => void;
  onImport: (cards: OwnedCard[]) => void;
  storageError: boolean;
}) {
  const [pendingImport, setPendingImport] = useState<OwnedCard[] | null>(null);
  const [importName, setImportName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open || !pendingImport) return;
    const timer = window.setTimeout(() => {
      setPendingImport(null);
      setImportName("");
      setImportError(null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, pendingImport]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = parseCollection(text);
      if (!parsed) {
        setImportError("Ce fichier ne contient pas une sauvegarde Pokédex valide.");
        return;
      }
      if (parsed.length === 0) {
        setImportError("Cette sauvegarde ne contient aucune carte.");
        return;
      }
      setPendingImport(parsed);
      setImportName(file.name);
    } catch {
      setImportError("Impossible de lire ce fichier.");
    }
  }

  const refreshing = refreshState !== null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Réglages"
      subtitle="Prix, export et sauvegarde"
    >
      {storageError ? (
        <div className="mb-3 rounded-xl border border-accent/25 bg-accent-soft px-3.5 py-2.5 text-[11.5px] leading-relaxed text-accent-strong">
          Stockage local saturé : les dernières modifications peuvent ne pas être
          conservées. Pensez à exporter votre collection.
        </div>
      ) : null}

      <div className="space-y-1">
        <ActionRow
          icon={
            refreshing ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )
          }
          title="Actualiser les prix"
          subtitle={
            refreshState
              ? `${refreshState.done}/${refreshState.total} cartes…`
              : lastPriceUpdate
                ? `Cardmarket · actualisé ${relativeDate(lastPriceUpdate)}`
                : "Récupérer les prix Cardmarket"
          }
          onClick={onRefresh}
          disabled={refreshing || cardCount === 0}
        />
        <ActionRow
          icon={<Download className="h-4 w-4" />}
          title="Exporter la collection"
          subtitle="Sauvegarde .json sur votre appareil"
          onClick={onExport}
          disabled={cardCount === 0}
        />
        <ActionRow
          icon={<Upload className="h-4 w-4" />}
          title="Importer une sauvegarde"
          subtitle="Remplacer la collection actuelle"
          onClick={() => fileRef.current?.click()}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
      />

      {importError ? (
        <p className="mt-3 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-[11.5px] text-muted">
          {importError}
        </p>
      ) : null}

      {pendingImport ? (
        <div className="mt-4 rounded-2xl border border-accent/25 bg-accent-soft p-4">
          <p className="text-[13px] font-semibold text-accent-strong">
            Remplacer votre collection ?
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-accent-strong/90">
            « {importName} » contient {pendingImport.length} carte
            {pendingImport.length > 1 ? "s" : ""}. Vos {cardCount} carte
            {cardCount > 1 ? "s" : ""} actuelles seront remplacées.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onImport(pendingImport);
                setPendingImport(null);
                setImportName("");
                onClose();
              }}
              className="flex h-9 flex-1 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white transition active:scale-[0.99]"
            >
              Remplacer
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingImport(null);
                setImportName("");
              }}
              className="flex h-9 flex-1 items-center justify-center rounded-full border border-line bg-surface text-[12px] font-medium text-ink transition active:scale-[0.99]"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-dashed border-line px-4 py-3.5">
        <p className="text-[11px] leading-relaxed text-muted">
          Votre collection est stockée uniquement sur cet appareil. Exportez
          régulièrement une sauvegarde pour la retrouver ou changer d’appareil.
        </p>
      </div>

      <p className="mt-4 text-center text-[10.5px] text-muted/80">
        Pokédex TCG · prix indicatifs Cardmarket
      </p>
    </Sheet>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-surface-2/70 active:scale-[0.995] disabled:opacity-45"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{title}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted">
          {subtitle}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}
