import { validateAllocation, type IntendedAllocation } from "./attentionLedger.ts";
export const ATTENTION_STORAGE_PREFIX = "lifeos-intended-attention-v1";
type AttentionStorage = Pick<Storage,"getItem"|"setItem">;
export function attentionStorageKey(accountId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(accountId)) throw new Error("An authenticated account is required.");
  return `${ATTENTION_STORAGE_PREFIX}:${accountId}`;
}
export function readAttentionPreferences(storage: AttentionStorage, accountId: string): IntendedAllocation | null {
  try {
    const raw = storage.getItem(attentionStorageKey(accountId));
    if (!raw || raw.length>20_000) return null;
    const value: unknown = JSON.parse(raw);
    return validateAllocation(value) ? null : value as IntendedAllocation;
  } catch { return null; } // No load-time rewrite, deletion or domain migration.
}
export function saveAttentionPreferences(storage: AttentionStorage, accountId: string, value: IntendedAllocation): void {
  const error = validateAllocation(value); if (error) throw new Error(error);
  storage.setItem(attentionStorageKey(accountId),JSON.stringify(value));
}
