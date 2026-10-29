"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { SheetTitle } from "./ui";

const emptySubscribe = () => () => {};

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: SheetProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer"
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface shadow-float outline-none transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:inset-0 sm:bottom-auto sm:my-auto sm:max-h-[86dvh] sm:max-w-[520px] sm:rounded-[28px] ${
          open
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-[105%] opacity-100 sm:translate-y-16 sm:scale-[0.98] sm:opacity-0"
        }`}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line-strong/70 sm:hidden" />
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-3 sm:pt-5">
          <SheetTitle title={title} subtitle={subtitle} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-ink active:scale-95"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] sm:pb-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-line bg-surface px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
