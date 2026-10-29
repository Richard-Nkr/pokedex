"use client";

import { ChevronDown } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-surface-2 active:scale-95 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Chip({
  active,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-medium transition active:scale-[0.97] ${
        active
          ? "border-ink bg-ink text-bg"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        {hint ? <span className="text-[11px] text-muted/80">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[14px] text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15";

export const textareaClass =
  "w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15";

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        className={`h-11 w-full appearance-none rounded-xl border border-line bg-surface pl-3.5 pr-10 text-[14px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function SheetTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-w-0">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
