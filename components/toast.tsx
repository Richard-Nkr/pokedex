"use client";

import { Check } from "lucide-react";
import type { ToastMessage } from "@/lib/types";

export function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+86px)] z-[60] flex justify-center px-6"
    >
      <div className="anim-toast flex max-w-full items-center gap-2.5 rounded-full border border-line bg-ink px-4 py-2.5 text-[13px] font-medium text-bg shadow-float">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <span className="truncate">{toast.text}</span>
      </div>
    </div>
  );
}
