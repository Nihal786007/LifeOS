import type { PowerSyncDatabase } from "@powersync/web";
import { authenticatedUserHash } from "../database/authenticatedLifeOSPowerSync.ts";

export const ACCOUNT_SETUP_VERSION = 1 as const;
export type AccountSetupChoice = "adopt-device" | "use-cloud";
export interface AccountBinding { userHash:string; choice:AccountSetupChoice; version:number; completedAt:string }
interface BindingRow { user_hash:string;setup_choice:string;adoption_version:number;completed_at:string }

export async function readAccountBinding(database:PowerSyncDatabase,userId:string):Promise<AccountBinding|null>{
  await database.init();const row=await database.getOptional<BindingRow>("SELECT user_hash, setup_choice, adoption_version, completed_at FROM account_binding WHERE id = 'current'");if(!row)return null;
  const expected=await authenticatedUserHash(userId);if(row.user_hash!==expected)throw new Error("Account binding does not belong to the authenticated user");
  if(row.setup_choice!=="adopt-device"&&row.setup_choice!=="use-cloud")throw new Error("Account binding has an unsupported setup choice");
  if(row.adoption_version!==ACCOUNT_SETUP_VERSION)throw new Error("Account binding version is unsupported");
  return{userHash:row.user_hash,choice:row.setup_choice,version:row.adoption_version,completedAt:row.completed_at};
}
export async function writeAccountBinding(database:PowerSyncDatabase,userId:string,choice:AccountSetupChoice,completedAt=new Date().toISOString()):Promise<AccountBinding>{
  const userHash=await authenticatedUserHash(userId);const existing=await readAccountBinding(database,userId);if(existing){if(existing.choice!==choice)throw new Error("Account setup was already completed with a different choice");return existing;}
  await database.execute("INSERT INTO account_binding(id, user_hash, setup_choice, adoption_version, completed_at) VALUES('current', ?, ?, ?, ?)",[userHash,choice,ACCOUNT_SETUP_VERSION,completedAt]);
  return{userHash,choice,version:ACCOUNT_SETUP_VERSION,completedAt};
}
