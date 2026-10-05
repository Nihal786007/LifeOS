import { calendarEventFingerprint, parseCalendarEventPayload, type CalendarEventProposal } from "./eventProposal.ts";

/** One tab-scoped, account-scoped untrusted receipt; never stores OAuth/session credentials. */
export function calendarApprovalRecovery(storage: Pick<Storage,"getItem"|"setItem"|"removeItem">, accountId: string) {
  const key = `lifeos-calendar-pending-approval-v1:${accountId}`;
  return {
    save(proposal: CalendarEventProposal): void { storage.setItem(key,JSON.stringify(proposal)); },
    clear(): void { storage.removeItem(key); },
    async load(): Promise<CalendarEventProposal | null> {
      try {
        const raw=storage.getItem(key);
        if(!raw || raw.length>10_000)return null;
        const value=JSON.parse(raw);
        if(!value || typeof value!=="object" || Array.isArray(value) || Object.keys(value).sort().join(",")!=="approvalId,calendarName,fingerprint,payload,permission,version" || value.version!=="1.0.0" || value.permission!=="CONFIRM_REQUIRED" || typeof value.approvalId!=="string" || !/^[0-9a-f-]{36}$/.test(value.approvalId) || typeof value.calendarName!=="string" || value.calendarName.length>512)return null;
        const payload=parseCalendarEventPayload(value.payload);
        if(await calendarEventFingerprint(payload)!==value.fingerprint)return null;
        return {...value,payload};
      } catch { return null; }
    },
  };
}

export function browserCalendarApprovalRecovery(accountId: string) {
  return calendarApprovalRecovery(sessionStorage,accountId);
}
