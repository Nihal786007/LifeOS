import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataServices } from "../DataServicesContext";
import { createUnboundBrowserDataServices } from "../DataServicesContext";
import { useAuth } from "../../auth/AuthContext";
import { supabaseClient } from "../../auth/supabaseClient";
import { createAuthenticatedPowerSyncSessionManager } from "../cloud/createAuthenticatedPowerSync";
import type { AuthenticatedPowerSyncSessionManager } from "../cloud/AuthenticatedPowerSyncSessionManager";
import { createAuthenticatedLifeOSPowerSyncDatabase } from "../database/authenticatedLifeOSPowerSync";
import { createAuthenticatedDataServices } from "./authenticatedDataServices";
import { adoptCanonicalLocalData, snapshotData } from "./adoptLocalData";
import { readAccountBinding, writeAccountBinding } from "./accountBinding";
import type { AccountSetupChoice } from "./accountBinding";

export type AccountDataPhase="signed-out"|"checking"|"needs-choice"|"preparing"|"ready"|"error";
interface AccountDataValue{phase:AccountDataPhase;services:DataServices|null;error:string|null;chooseAdoption():Promise<void>;chooseCloud():Promise<void>}
const AccountDataContext=createContext<AccountDataValue|null>(null);
interface Props{children:ReactNode;client?:SupabaseClient|null;manager?:AuthenticatedPowerSyncSessionManager}

export function AccountDataProvider({children,client=supabaseClient,manager:provided}:Props){
  const auth=useAuth();const managerRef=useRef<AuthenticatedPowerSyncSessionManager|null>(provided??(client?createAuthenticatedPowerSyncSessionManager(client):null));
  const userId=auth.identity?.userId;
  const generation=useRef(0);const[state,setState]=useState<{phase:AccountDataPhase;services:DataServices|null;error:string|null}>({phase:"signed-out",services:null,error:null});
  const open=useCallback(async(userId:string)=>{const manager=managerRef.current;if(!manager)throw new Error("Authenticated PowerSync is unavailable");const session=await manager.activate(userId);const services=createAuthenticatedDataServices(session.database,userId,undefined,session.registerCleanup);await snapshotData(services);return{session,services};},[]);
  useEffect(()=>{const run=++generation.current;const manager=managerRef.current;void(async()=>{await manager?.deactivate();if(run!==generation.current)return;if(auth.phase!=="signed-in"||!userId){setState({phase:"signed-out",services:null,error:null});return;}setState({phase:"checking",services:null,error:null});const db=await createAuthenticatedLifeOSPowerSyncDatabase(userId);let binding;try{await db.init();binding=await readAccountBinding(db,userId);}finally{await db.close().catch(()=>undefined);}if(run!==generation.current)return;if(!binding){setState({phase:"needs-choice",services:null,error:null});return;}const{services}=await open(userId);if(run===generation.current)setState({phase:"ready",services,error:null});})().catch(error=>{if(run===generation.current)setState({phase:"error",services:null,error:error instanceof Error?error.message:String(error)});});return()=>{generation.current+=1;void manager?.deactivate();};},[auth.phase,userId,open]);
  const choose=useCallback(async(choice:AccountSetupChoice)=>{if(!userId)return;const run=++generation.current;setState({phase:"preparing",services:null,error:null});try{const{session,services}=await open(userId);let readyServices=services;if(choice==="adopt-device"){await adoptCanonicalLocalData(createUnboundBrowserDataServices(),services,session.database);readyServices=createAuthenticatedDataServices(session.database,userId,undefined,session.registerCleanup);await snapshotData(readyServices);}await writeAccountBinding(session.database,userId,choice);if(run===generation.current)setState({phase:"ready",services:readyServices,error:null});}catch(error){await managerRef.current?.deactivate();if(run===generation.current)setState({phase:"needs-choice",services:null,error:error instanceof Error?error.message:String(error)});}},[userId,open]);
  const value=useMemo<AccountDataValue>(()=>({...state,chooseAdoption:()=>choose("adopt-device"),chooseCloud:()=>choose("use-cloud")}),[state,choose]);
  return <AccountDataContext.Provider value={value}>{children}</AccountDataContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAccountData(){const value=useContext(AccountDataContext);if(!value)throw new Error("useAccountData must be used inside AccountDataProvider");return value;}
