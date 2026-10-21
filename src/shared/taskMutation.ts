/** Canonical in-memory acceptance only. Neither case certifies persistence. */
export type TaskCreationAcceptance =
  | { status: "accepted"; taskId: number }
  | { status: "rejected" };
