/** DTO only: no runtime/provider imports and no payload-bearing fingerprint. */
interface TaskReceiptIdentity {
  version: "1.0.0";
  actionType: "task.create";
  actionId: string;
  attemptId: string;
  ownerUserId: string;
}
export type AtlasTaskCreationReceipt = TaskReceiptIdentity & (
  | { status: "accepted"; assurance: "canonical-accepted"; entityId: number }
  | { status: "rejected"; assurance: "not-applied" }
);
