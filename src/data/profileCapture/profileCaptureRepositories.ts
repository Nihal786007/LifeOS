import type {
  Capture,
  UserProfile,
} from "../../shared/types";

export interface ProfileRepository {
  load(): UserProfile | null;
  save(profile: UserProfile): void;
  subscribe(listener: () => void): () => void;
}

export interface CaptureRepository {
  load(): Capture[];
  save(captures: Capture[]): void;
  subscribe(listener: () => void): () => void;
}
