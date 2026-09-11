import type {
  Capture,
} from "../../shared/types";

export type CapturePersistencePhase =
  | "uninitialized"
  | "opening"
  | "migration"
  | "hydrated"
  | "error";

export type CaptureRepositoryEvent =
  | {
      type: "captures";
      captures: Capture[];
    }
  | {
      type: "error";
      error: Error;
    };

export interface AsyncCaptureRepository {
  initialize(
    onPhase?: (phase: "opening" | "migration") => void
  ): Promise<Capture[]>;

  insert(capture: Capture): Promise<void>;

  delete(id: number): Promise<void>;

  subscribe(
    listener: (event: CaptureRepositoryEvent) => void
  ): () => void;
}
