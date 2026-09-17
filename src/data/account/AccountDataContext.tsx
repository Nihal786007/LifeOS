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
import { AdoptionConflictError, adoptCanonicalLocalData, snapshotData } from "./adoptLocalData";
import { readAccountBinding, writeAccountBinding } from "./accountBinding";
import type { AccountSetupChoice } from "./accountBinding";
import { clearAdoptionJournal } from "./adoptionJournal";

export type AccountDataPhase="signed-out"|"checking"|"needs-choice"|"preparing"|"conflict"|"ready"|"error";
interface AccountDataValue{phase:AccountDataPhase;services:DataServices|null;error:string|null;conflictDomains:readonly string[];chooseAdoption():Promise<void>;chooseCloud():Promise<void>}
const AccountDataContext=createContext<AccountDataValue|null>(null);
interface Props{children:ReactNode;client?:SupabaseClient|null;manager?:AuthenticatedPowerSyncSessionManager}

export function AccountDataProvider({children,client=supabaseClient,manager:provided}:Props){
  const auth=useAuth();const managerRef=useRef<AuthenticatedPowerSyncSessionManager|null>(provided??(client?createAuthenticatedPowerSyncSessionManager(client):null));
  const userId=auth.identity?.userId;
  const generation=useRef(0);const[state,setState]=useState<{phase:AccountDataPhase;services:DataServices|null;error:string|null;conflictDomains:readonly string[]}>({phase:"signed-out",services:null,error:null,conflictDomains:[]});
  const open=useCallback(async(userId:string)=>{const manager=managerRef.current;if(!manager)throw new Error("Authenticated PowerSync is unavailable");const session=await manager.activate(userId);const services=createAuthenticatedDataServices(session.database,userId,undefined,session.registerCleanup);await snapshotData(services);return{session,services};},[]);
  useEffect(()=>{const run=++generation.current;const manager=managerRef.current;void(async()=>{await manager?.deactivate();if(run!==generation.current)return;if(auth.phase!=="signed-in"||!userId){setState({phase:"signed-out",services:null,error:null,conflictDomains:[]});return;}setState({phase:"checking",services:null,error:null,conflictDomains:[]});const db=await createAuthenticatedLifeOSPowerSyncDatabase(userId);let binding;try{await db.init();binding=await readAccountBinding(db,userId);if(binding)await clearAdoptionJournal(db,userId);}finally{await db.close().catch(()=>undefined);}if(run!==generation.current)return;if(!binding){setState({phase:"needs-choice",services:null,error:null,conflictDomains:[]});return;}const{services}=await open(userId);if(run===generation.current)setState({phase:"ready",services,error:null,conflictDomains:[]});})().catch(error=>{if(run===generation.current)setState({phase:"error",services:null,error:error instanceof Error?error.message:String(error),conflictDomains:[]});});return()=>{generation.current+=1;void manager?.deactivate();};},[auth.phase,userId,open]);
  const choose=useCallback(async(choice:AccountSetupChoice)=>{if(!userId)return;const run=++generation.current;setState({phase:"preparing",services:null,error:null,conflictDomains:[]});try{const{session,services}=await open(userId);let readyServices=services;if(choice==="adopt-device"){await adoptCanonicalLocalData(createUnboundBrowserDataServices(),services,session.database,userId);readyServices=createAuthenticatedDataServices(session.database,userId,undefined,session.registerCleanup);await snapshotData(readyServices);}await writeAccountBinding(session.database,userId,choice);await clearAdoptionJournal(session.database,userId);if(run===generation.current)setState({phase:"ready",services:readyServices,error:null,conflictDomains:[]});}catch(error){await managerRef.current?.deactivate();if(run===generation.current)setState(error instanceof AdoptionConflictError?{phase:"conflict",services:null,error:null,conflictDomains:error.domains}:{phase:"needs-choice",services:null,error:error instanceof Error?error.message:String(error),conflictDomains:[]});}},[userId,open]);
  const value=useMemo<AccountDataValue>(()=>({...state,chooseAdoption:()=>choose("adopt-device"),chooseCloud:()=>choose("use-cloud")}),[state,choose]);
  return <AccountDataContext.Provider value={value}>{children}</AccountDataContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAccountData(){const value=useContext(AccountDataContext);if(!value)throw new Error("useAccountData must be used inside AccountDataProvider");return value;}
