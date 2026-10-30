export type LocalAccount = {
  id: string;
  username: string;
  usernameKey: string;
  salt: string;
  passwordHash: string;
  iterations: number;
  createdAt: number;
  legacyStorage?: boolean;
};

const ACCOUNTS_KEY = "pokedex.accounts.v1";
const SESSION_KEY = "pokedex.session.v1";
const PBKDF2_ITERATIONS = 120_000;
const ACCOUNT_LIMIT = 20;
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Le générateur aléatoire du navigateur est indisponible.");
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

function randomId(): string {
  return Array.from(randomBytes(10))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getSubtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "Le chiffrement du mot de passe n’est pas disponible. Ouvrez l’app en HTTPS.",
    );
  }
  return crypto.subtle;
}

async function derivePassword(
  password: string,
  salt: string,
  iterations: number,
): Promise<string> {
  const key = await getSubtle().importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await getSubtle().deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(salt),
      iterations,
    },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function sameHash(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export function normalizeUsername(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function usernameKey(value: string): string {
  return normalizeUsername(value).toLocaleLowerCase("fr");
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Le pseudo doit contenir au moins ${USERNAME_MIN_LENGTH} caractères.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Le pseudo ne peut pas dépasser ${USERNAME_MAX_LENGTH} caractères.`;
  }
  if (/[\u0000-\u001f\u007f]/.test(username)) {
    return "Ce pseudo contient des caractères non autorisés.";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`;
  }
  return null;
}

export function loadAccounts(): LocalAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const accounts: LocalAccount[] = [];
    const seen = new Set<string>();
    for (const value of parsed) {
      if (!isRecord(value)) continue;
      const id = cleanString(value.id, 80);
      const username = cleanString(value.username, USERNAME_MAX_LENGTH);
      const salt = cleanString(value.salt, 120);
      const passwordHash = cleanString(value.passwordHash, 200);
      const iterations = value.iterations;
      if (
        !id ||
        !username ||
        !salt ||
        !passwordHash ||
        typeof iterations !== "number" ||
        !Number.isFinite(iterations) ||
        iterations < 10_000 ||
        iterations > 1_000_000
      ) {
        continue;
      }
      const key = usernameKey(username);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const createdAt =
        typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
          ? value.createdAt
          : 0;
      accounts.push({
        id,
        username,
        usernameKey: key,
        salt,
        passwordHash,
        iterations: Math.floor(iterations),
        createdAt,
        legacyStorage: value.legacyStorage === true,
      });
    }
    return accounts.slice(0, ACCOUNT_LIMIT);
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: LocalAccount[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify(accounts.slice(0, ACCOUNT_LIMIT)),
    );
    return true;
  } catch {
    return false;
  }
}

export function findAccount(
  accounts: LocalAccount[],
  username: string,
): LocalAccount | null {
  const key = usernameKey(username);
  if (!key) return null;
  return accounts.find((account) => account.usernameKey === key) ?? null;
}

export async function createLocalAccount({
  username,
  password,
  accounts,
}: {
  username: string;
  password: string;
  accounts: LocalAccount[];
}): Promise<LocalAccount> {
  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(usernameError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  const normalized = normalizeUsername(username);
  if (findAccount(accounts, normalized)) {
    throw new Error("Ce pseudo est déjà utilisé sur cet appareil.");
  }
  if (accounts.length >= ACCOUNT_LIMIT) {
    throw new Error("Cet appareil a atteint la limite de comptes locaux.");
  }
  const salt = bytesToBase64(randomBytes(16));
  const passwordHash = await derivePassword(
    password,
    salt,
    PBKDF2_ITERATIONS,
  );
  return {
    id: `acc_${randomId()}`,
    username: normalized,
    usernameKey: usernameKey(normalized),
    salt,
    passwordHash,
    iterations: PBKDF2_ITERATIONS,
    createdAt: Date.now(),
    legacyStorage: accounts.length === 0,
  };
}

export async function verifyLocalPassword(
  account: LocalAccount,
  password: string,
): Promise<boolean> {
  try {
    const hash = await derivePassword(
      password,
      account.salt,
      account.iterations,
    );
    return sameHash(hash, account.passwordHash);
  } catch {
    return false;
  }
}

function readSessionId(storage: Storage): string | null {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return cleanString(parsed.accountId, 80) ?? null;
  } catch {
    return null;
  }
}

export function readSessionAccount(
  accounts: LocalAccount[],
): LocalAccount | null {
  if (typeof window === "undefined") return null;
  const id =
    readSessionId(window.sessionStorage) ??
    readSessionId(window.localStorage);
  if (!id) return null;
  return accounts.find((account) => account.id === id) ?? null;
}

export function setSession(accountId: string, remember: boolean): boolean {
  if (typeof window === "undefined") return false;
  const payload = JSON.stringify({ accountId, at: Date.now() });
  try {
    if (remember) {
      window.localStorage.setItem(SESSION_KEY, payload);
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_KEY, payload);
      window.localStorage.removeItem(SESSION_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}

export function storageScopeFor(account: LocalAccount): string | undefined {
  return account.legacyStorage ? undefined : account.id;
}
