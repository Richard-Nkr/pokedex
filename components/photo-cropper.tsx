"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const OUT_WIDTH = 600;

type PhotoCropperProps = {
  src: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
};

export function PhotoCropper({ src, onCancel, onConfirm }: PhotoCropperProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    frameRef.current?.focus({ preventScroll: true });
  }, []);

  function limits(value: number) {
    const frame = frameRef.current;
    const image = imgRef.current;
    if (!frame || !image) return { x: 0, y: 0 };
    const rect = frame.getBoundingClientRect();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) return { x: 0, y: 0 };
    const cover = Math.max(rect.width / width, rect.height / height);
    return {
      x: Math.max(0, (width * cover * value - rect.width) / 2),
      y: Math.max(0, (height * cover * value - rect.height) / 2),
    };
  }

  function clampOffset(x: number, y: number, value: number) {
    const max = limits(value);
    return {
      x: Math.min(max.x, Math.max(-max.x, x)),
      y: Math.min(max.y, Math.max(-max.y, y)),
    };
  }

  function updateZoom(value: number) {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    setZoom(next);
    setOffset((current) => clampOffset(current.x, current.y, next));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!natural) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampOffset(
      drag.originX + event.clientX - drag.startX,
      drag.originY + event.clientY - drag.startY,
      zoom,
    );
    setOffset(next);
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!natural) return;
    const step = 12;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = step;
    else if (event.key === "ArrowRight") dx = -step;
    else if (event.key === "ArrowUp") dy = step;
    else if (event.key === "ArrowDown") dy = -step;
    if (!dx && !dy) return;
    event.preventDefault();
    setOffset((current) =>
      clampOffset(current.x + dx, current.y + dy, zoom),
    );
  }

  function reset() {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }

  function confirm() {
    const frame = frameRef.current;
    const image = imgRef.current;
    if (!frame || !image || !natural) {
      setError("La photo n’est pas encore prête.");
      return;
    }
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setError("Impossible de préparer le recadrage.");
      return;
    }
    const cover = Math.max(
      rect.width / natural.width,
      rect.height / natural.height,
    );
    const width = OUT_WIDTH;
    const height = Math.round((width * rect.height) / rect.width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Impossible de préparer le recadrage.");
      return;
    }
    const scale = width / rect.width;
    context.fillStyle = "#f1ede6";
    context.fillRect(0, 0, width, height);
    context.translate(
      width / 2 + offset.x * scale,
      height / 2 + offset.y * scale,
    );
    context.scale(cover * zoom * scale, cover * zoom * scale);
    context.drawImage(
      image,
      -natural.width / 2,
      -natural.height / 2,
      natural.width,
      natural.height,
    );

    let quality = 0.82;
    let dataUrl = canvas.toDataURL("image/webp", quality);
    if (!dataUrl.startsWith("data:image/webp")) {
      quality = 0.86;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    while (dataUrl.length > 420_000 && quality > 0.5) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL(
        dataUrl.startsWith("data:image/webp") ? "image/webp" : "image/jpeg",
        quality,
      );
    }
    onConfirm(dataUrl);
  }

  return (
    <div className="pt-1">
      <div className="mx-auto w-[min(78vw,280px)]">
        <div
          ref={frameRef}
          role="img"
          aria-label="Aperçu du recadrage de la photo"
          tabIndex={-1}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
           onPointerUp={endDrag}
           onPointerCancel={endDrag}
           onKeyDown={handleKeyDown}
           className={`relative aspect-[245/342] touch-none select-none overflow-hidden rounded-2xl border border-line bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
            natural ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              if (image.naturalWidth && image.naturalHeight) {
                setNatural({
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                });
              }
            }}
            onError={() => setError("Impossible de lire cette image.")}
            className="pointer-events-none absolute inset-0 h-full w-full origin-center object-cover"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 z-10">
            <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-white/90 shadow-[0_0_2px_rgba(0,0,0,0.45)]" />
            <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-white/90 shadow-[0_0_2px_rgba(0,0,0,0.45)]" />
            <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-white/90 shadow-[0_0_2px_rgba(0,0,0,0.45)]" />
            <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-white/90 shadow-[0_0_2px_rgba(0,0,0,0.45)]" />
          </div>
          {!natural && !error ? (
            <span className="absolute inset-0 z-20 flex items-center justify-center bg-surface-2">
              <span className="shimmer h-full w-full bg-surface-2" />
            </span>
          ) : null}
        </div>
      </div>

      <p className="mx-auto mt-3 max-w-[280px] text-center text-[11px] leading-relaxed text-muted">
        Glissez la photo pour centrer la carte, puis zoomez pour remplir le
        cadre.
      </p>

      <div className="mx-auto mt-3 flex max-w-[280px] items-center gap-2">
        <button
          type="button"
          aria-label="Dézoomer"
          onClick={() => updateZoom(zoom - 0.12)}
          disabled={zoom <= MIN_ZOOM}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition active:scale-95 disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          aria-label="Zoom du recadrage"
          onChange={(event) => updateZoom(Number(event.target.value))}
          className="h-1.5 min-w-0 flex-1 accent-accent"
        />
        <button
          type="button"
          aria-label="Zoomer"
          onClick={() => updateZoom(zoom + 0.12)}
          disabled={zoom >= MAX_ZOOM}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition active:scale-95 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Recentrer la photo"
          onClick={reset}
          disabled={
            zoom === MIN_ZOOM && offset.x === 0 && offset.y === 0
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:text-ink active:scale-95 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10.5px] tabular text-muted">
        {Math.round(zoom * 100)} %
        {natural ? " · glissez ou utilisez les flèches" : ""}
      </p>

      {error ? (
        <p className="mx-auto mt-2 max-w-[280px] rounded-lg bg-accent-soft px-3 py-2 text-center text-[11px] text-accent-strong">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-full border border-line bg-surface px-4 text-[13px] font-medium text-ink transition hover:bg-surface-2 active:scale-[0.99]"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!natural}
          className="h-11 rounded-full bg-accent px-4 text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
        >
          Utiliser cette photo
        </button>
      </div>
    </div>
  );
}
