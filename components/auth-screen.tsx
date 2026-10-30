"use client";

import {
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  LogIn,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from "@/lib/accounts";
import { Pokeball } from "./pokeball";
import { Field, Spinner, inputClass } from "./ui";

type Mode = "login" | "signup";

export function AuthScreen({
  hasAccounts,
  hasLegacyData,
  onSignIn,
  onSignUp,
}: {
  hasAccounts: boolean;
  hasLegacyData: boolean;
  onSignIn: (
    username: string,
    password: string,
    remember: boolean,
  ) => Promise<void>;
  onSignUp: (
    username: string,
    password: string,
    remember: boolean,
  ) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>(hasAccounts ? "login" : "signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    if (busy || next === mode) return;
    setMode(next);
    setError(null);
    setPassword("");
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await onSignUp(username, password, remember);
      } else {
        await onSignIn(username, password, remember);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Impossible de continuer. Réessayez.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <Pokeball
        className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 text-accent opacity-[0.05]"
        strokeWidth={4}
      />
      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
        <div className="anim-fade-up">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-sm">
              <Pokeball className="h-5 w-5" strokeWidth={3.4} />
            </span>
            <div>
              <p className="text-[16px] font-semibold leading-none tracking-[-0.01em]">
                Pokédex
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                Collection TCG
              </p>
            </div>
          </div>

          <h1 className="mt-8 text-[28px] font-semibold leading-[1.08] tracking-[-0.03em]">
            Votre Pokédex
            <br />
            vous attend.
          </h1>
          <p className="mt-2.5 max-w-[310px] text-[13px] leading-relaxed text-muted">
            {mode === "login"
              ? "Connectez-vous pour retrouver votre collection sur cet appareil."
              : "Créez votre compte local pour ouvrir et suivre votre collection."}
          </p>

          <section className="mt-6 rounded-[28px] border border-line bg-surface p-4 shadow-float sm:p-5">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
              <button
                type="button"
                aria-pressed={mode === "login"}
                onClick={() => switchMode("login")}
                className={`h-9 rounded-xl text-[12.5px] font-semibold transition ${
                  mode === "login"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                aria-pressed={mode === "signup"}
                onClick={() => switchMode("signup")}
                className={`h-9 rounded-xl text-[12.5px] font-semibold transition ${
                  mode === "signup"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                Créer un compte
              </button>
            </div>

            <form
              className="mt-4 space-y-3.5"
              onSubmit={handleSubmit}
              noValidate
            >
              <Field label="Pseudo">
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={USERNAME_MAX_LENGTH}
                  placeholder="Votre pseudo"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Mot de passe"
                hint={`${PASSWORD_MIN_LENGTH} caractères min.`}
              >
                <span className="relative block">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    maxLength={128}
                    placeholder={
                      mode === "login"
                        ? "Votre mot de passe"
                        : "Choisissez un mot de passe"
                    }
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    title={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </span>
              </Field>

              <label className="flex w-fit items-center gap-2.5 text-[12px] text-muted">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-line accent-[var(--accent)]"
                />
                Se souvenir de moi
              </label>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-accent/25 bg-accent-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-accent-strong"
                >
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[13.5px] font-semibold text-white shadow-[0_12px_32px_-14px_var(--accent)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
              >
                {busy ? (
                  <Spinner className="h-4 w-4" />
                ) : mode === "login" ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {busy
                  ? mode === "login"
                    ? "Connexion…"
                    : "Création…"
                  : mode === "login"
                    ? "Se connecter"
                    : "Créer mon compte"}
              </button>
            </form>
          </section>

          {mode === "signup" && hasLegacyData ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-line bg-surface-2/60 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <p>
                Votre collection actuelle sera conservée dans ce premier compte.
              </p>
            </div>
          ) : null}

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Compte local à cet appareil. Aucun e-mail, aucune synchronisation.
              Votre collection reste dans ce navigateur.
            </span>
          </p>
        </div>
      </div>

      <p className="relative mt-4 text-center text-[10.5px] text-muted/80">
        Pokédex TCG · données locales
      </p>
    </div>
  );
}
