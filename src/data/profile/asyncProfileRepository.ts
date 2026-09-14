import type { UserProfile } from "../../shared/types";

export type ProfilePersistencePhase = "uninitialized" | "opening" | "migration" | "hydrated" | "error";
export type ProfileRepositoryEvent =
  | { type: "profile"; profile: UserProfile | null }
  | { type: "error"; error: Error };

export interface AsyncProfileRepository {
  initialize(onPhase?: (phase: "opening" | "migration") => void): Promise<UserProfile | null>;
  replace(profile: UserProfile): Promise<UserProfile>;
  subscribe(listener: (event: ProfileRepositoryEvent) => void): () => void;
}
