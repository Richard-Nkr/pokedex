"use client";

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  clearSession,
  createLocalAccount,
  findAccount,
  loadAccounts,
  readSessionAccount,
  saveAccounts,
  setSession,
  storageScopeFor,
  verifyLocalPassword,
  type LocalAccount,
} from "@/lib/accounts";
import { hasLegacyData } from "@/lib/storage";
import { AuthScreen } from "./auth-screen";
import { Pokeball } from "./pokeball";

type AuthContextValue = {
  account: LocalAccount;
  scope: string | undefined;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const emptySubscribe = () => () => {};

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth doit être utilisé dans une session ouverte.");
  }
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [auth, setAuth] = useState(() => {
    const accounts = loadAccounts();
    const session = readSessionAccount(accounts);
    return {
      accounts,
      accountId: session?.id ?? null,
      legacyData: hasLegacyData(),
    };
  });

  const account = useMemo(
    () =>
      auth.accounts.find((item) => item.id === auth.accountId) ?? null,
    [auth.accountId, auth.accounts],
  );

  const signIn = useCallback(
    async (username: string, password: string, remember: boolean) => {
      const found = findAccount(auth.accounts, username);
      if (!found) {
        throw new Error("Pseudo ou mot de passe incorrect.");
      }
      const valid = await verifyLocalPassword(found, password);
      if (!valid) {
        throw new Error("Pseudo ou mot de passe incorrect.");
      }
      setSession(found.id, remember);
      setAuth((current) => ({ ...current, accountId: found.id }));
    },
    [auth.accounts],
  );

  const signUp = useCallback(
    async (username: string, password: string, remember: boolean) => {
      const created = await createLocalAccount({
        username,
        password,
        accounts: auth.accounts,
      });
      const nextAccounts = [...auth.accounts, created];
      if (!saveAccounts(nextAccounts)) {
        throw new Error(
          "Impossible d’enregistrer le compte. Le stockage local est indisponible ou saturé.",
        );
      }
      setSession(created.id, remember);
      setAuth({
        accounts: nextAccounts,
        accountId: created.id,
        legacyData: false,
      });
    },
    [auth.accounts],
  );

  const signOut = useCallback(() => {
    clearSession();
    setAuth((current) => ({ ...current, accountId: null }));
  }, []);

  const accountValue = useMemo(
    () =>
      account
        ? {
            account,
            scope: storageScopeFor(account),
            signOut,
          }
        : null,
    [account, signOut],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Pokeball className="h-11 w-11 animate-pulse text-accent" />
        <span className="sr-only">Chargement du compte</span>
      </div>
    );
  }

  if (!account || !accountValue) {
    return (
      <AuthScreen
        hasAccounts={auth.accounts.length > 0}
        hasLegacyData={auth.legacyData}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    );
  }

  return (
    <AuthContext.Provider value={accountValue}>
      <Fragment key={account.id}>{children}</Fragment>
    </AuthContext.Provider>
  );
}
