import type { PowerSyncDatabase } from "@powersync/web";
import { authenticatedUserHash } from "../database/authenticatedLifeOSPowerSync.ts";
import type { CanonicalDataSnapshot } from "./adoptLocalData.ts";

export const ADOPTION_RECOVERY_VERSION = 1 as const;
export const ADOPTION_DOMAINS = ["planning", "tasks", "habits", "execution", "profile", "captures", "memory", "notifications"] as const;
export type AdoptionDomain = typeof ADOPTION_DOMAINS[number];
export type AdoptionSourceHashes = Record<AdoptionDomain, string>;
export interface AdoptionJournal {
  userHash: string;
  version: number;
  sourceHashes: AdoptionSourceHashes;
  completedDomains: AdoptionDomain[];
  startedAt: string;
  updatedAt: string;
}
interface JournalRow { user_hash:string;adoption_version:number;source_hashes_json:string;completed_domains_json:string;started_at:string;updated_at:string }

function isDomain(value: unknown): value is AdoptionDomain {
  return typeof value === "string" && (ADOPTION_DOMAINS as readonly string[]).includes(value);
}
function parseHashes(value: string): AdoptionSourceHashes {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Adoption journal source hashes are invalid");
  const record = parsed as Record<string, unknown>;
  for (const domain of ADOPTION_DOMAINS) if (typeof record[domain] !== "string" || !/^[0-9a-f]{64}$/.test(record[domain])) throw new Error("Adoption journal source hashes are invalid");
  return Object.fromEntries(ADOPTION_DOMAINS.map(domain => [domain, record[domain]])) as AdoptionSourceHashes;
}
function parseDomains(value: string): AdoptionDomain[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every(isDomain) || new Set(parsed).size !== parsed.length) throw new Error("Adoption journal completed domains are invalid");
  return ADOPTION_DOMAINS.filter(domain => parsed.includes(domain));
}
async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const result = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function createAdoptionSourceHashes(snapshot: CanonicalDataSnapshot): Promise<AdoptionSourceHashes> {
  return Object.fromEntries(await Promise.all(ADOPTION_DOMAINS.map(async domain => [domain, await digest(snapshot[domain])]))) as AdoptionSourceHashes;
}
export async function readAdoptionJournal(database: PowerSyncDatabase, userId: string): Promise<AdoptionJournal | null> {
  await database.init();
  const row = await database.getOptional<JournalRow>("SELECT user_hash, adoption_version, source_hashes_json, completed_domains_json, started_at, updated_at FROM adoption_journal WHERE id = 'current'");
  if (!row) return null;
  const expected = await authenticatedUserHash(userId);
  if (row.user_hash !== expected) throw new Error("Adoption journal does not belong to the authenticated user");
  if (row.adoption_version !== ADOPTION_RECOVERY_VERSION) throw new Error("Adoption journal version is unsupported");
  return { userHash:row.user_hash, version:row.adoption_version, sourceHashes:parseHashes(row.source_hashes_json), completedDomains:parseDomains(row.completed_domains_json), startedAt:row.started_at, updatedAt:row.updated_at };
}
export async function beginOrResumeAdoption(database: PowerSyncDatabase, userId: string, snapshot: CanonicalDataSnapshot, now = new Date().toISOString()): Promise<{journal:AdoptionJournal;resumed:boolean}> {
  const sourceHashes = await createAdoptionSourceHashes(snapshot);
  const existing = await readAdoptionJournal(database, userId);
  if (existing) {
    if (JSON.stringify(existing.sourceHashes) !== JSON.stringify(sourceHashes)) throw new Error("Device data changed after adoption started; automatic recovery cannot continue safely");
    return { journal:existing, resumed:true };
  }
  const userHash = await authenticatedUserHash(userId);
  await database.execute("INSERT INTO adoption_journal(id, user_hash, adoption_version, source_hashes_json, completed_domains_json, started_at, updated_at) VALUES('current', ?, ?, ?, ?, ?, ?)",[userHash,ADOPTION_RECOVERY_VERSION,JSON.stringify(sourceHashes),"[]",now,now]);
  return { journal:{userHash,version:ADOPTION_RECOVERY_VERSION,sourceHashes,completedDomains:[],startedAt:now,updatedAt:now}, resumed:false };
}
export async function markAdoptionDomainComplete(database: PowerSyncDatabase, userId: string, domain: AdoptionDomain, now = new Date().toISOString()): Promise<void> {
  const journal = await readAdoptionJournal(database, userId);
  if (!journal) throw new Error("Adoption journal is unavailable");
  const completed = ADOPTION_DOMAINS.filter(value => value === domain || journal.completedDomains.includes(value));
  await database.execute("UPDATE adoption_journal SET completed_domains_json = ?, updated_at = ? WHERE id = 'current'",[JSON.stringify(completed),now]);
}
export async function clearAdoptionJournal(database: PowerSyncDatabase, userId: string): Promise<void> {
  const journal = await readAdoptionJournal(database, userId);
  if (!journal) return;
  await database.execute("DELETE FROM adoption_journal WHERE id = 'current'");
}
