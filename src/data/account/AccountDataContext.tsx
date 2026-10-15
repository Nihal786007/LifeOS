import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataServices } from "../DataServicesContext";
import { createUnboundBrowserDataServices } from "../DataServicesContext";
import { useAuth } from "../../auth/AuthContext";
import { supabaseClient } from "../../auth/supabaseClient";
import { createAuthenticatedPowerSyncSessionManager } from "../cloud/createAuthenticatedPowerSync";
import type { AuthenticatedPowerSyncSessionManager } from "../cloud/AuthenticatedPowerSyncSessionManager";
import { createAuthenticatedDataServices } from "./authenticatedDataServices";
import { AdoptionConflictError, adoptCanonicalLocalData, snapshotData } from "./adoptLocalData";
import { readAccountBinding, writeAccountBinding } from "./accountBinding";
import type { AccountSetupChoice } from "./accountBinding";
import { clearAdoptionJournal } from "./adoptionJournal";

export type AccountDataPhase="signed-out"|"checking"|"needs-choice"|"preparing"|"conflict"|"ready"|"error";
interface AccountDataState{phase:AccountDataPhase;ownerUserId:string|null;services:DataServices|null;error:string|null;conflictDomains:readonly string[]}
interface AccountDataValue extends AccountDataState{syncStatus:{connected:boolean;hasSynced:boolean;hasError:boolean}|null;chooseAdoption():Promise<void>;chooseCloud():Promise<void>}
const AccountDataContext=createContext<AccountDataValue|null>(null);
interface Props{children:ReactNode;client?:SupabaseClient|null;manager?:AuthenticatedPowerSyncSessionManager}

export function AccountDataProvider({children,client=supabaseClient,manager:provided}:Props){
  const [syncSnapshot,setSyncSnapshot]=useState<{services:DataServices;connected:boolean;hasSynced:boolean;hasError:boolean}|null>(null);
  const auth=useAuth();const managerRef=useRef<AuthenticatedPowerSyncSessionManager|null>(provided??(client?createAuthenticatedPowerSyncSessionManager(client):null));
  const userId=auth.phase==="signed-in"&&auth.identity?.userId.trim()?auth.identity.userId:null;
  const generation=useRef(0);const[state,setState]=useState<AccountDataState>({phase:"signed-out",ownerUserId:null,services:null,error:null,conflictDomains:[]});
  const open=useCallback(async(userId:string)=>{const manager=managerRef.current;if(!manager)throw new Error("Authenticated PowerSync is unavailable");const session=await manager.activate(userId);const services=createAuthenticatedDataServices(session.database,userId,undefined,session.registerCleanup);await snapshotData(services);return{session,services};},[]);
  useEffect(()=>{const run=++generation.current;const manager=managerRef.current;void(async()=>{await manager?.deactivate();if(run!==generation.current)return;if(auth.phase!=="signed-in"||!userId){setState({phase:"signed-out",ownerUserId:null,services:null,error:null,conflictDomains:[]});return;}if(!manager)throw new Error("Authenticated PowerSync is unavailable");setState({phase:"checking",ownerUserId:userId,services:null,error:null,conflictDomains:[]});const session=await manager.activate(userId);const binding=await readAccountBinding(session.database,userId);if(binding)await clearAdoptionJournal(session.database,userId);if(run!==generation.current)return;if(!binding){await manager.deactivate();if(run===generation.current)setState({phase:"needs-choice",ownerUserId:userId,services:null,error:null,conflictDomains:[]});return;}const services=createAuthenticatedDataServices(session.database,userId,undefined,session.registerCleanup);await snapshotData(services);if(run===generation.current)setState({phase:"ready",ownerUserId:userId,services,error:null,conflictDomains:[]});})().catch(error=>{if(run===generation.current)setState({phase:"error",ownerUserId:userId,services:null,error:error instanceof Error?error.message:String(error),conflictDomains:[]});});return()=>{generation.current+=1;void manager?.deactivate();};},[auth.phase,userId]);
  const choose=useCallback(async(choice:AccountSetupChoice)=>{if(!userId)return;const run=++generation.current;setState({phase:"preparing",ownerUserId:userId,services:null,error:null,conflictDomains:[]});try{const{session,services}=await open(userId);let readyServices=services;if(choice==="adopt-device"){await adoptCanonicalLocalData(createUnboundBrowserDataServices(),services,session.database,userId);readyServices=createAuthenticatedDataServices(session.database,userId,undefined,session.registerCleanup);await snapshotData(readyServices);}await writeAccountBinding(session.database,userId,choice);await clearAdoptionJournal(session.database,userId);if(run===generation.current)setState({phase:"ready",ownerUserId:userId,services:readyServices,error:null,conflictDomains:[]});}catch(error){await managerRef.current?.deactivate();if(run===generation.current)setState(error instanceof AdoptionConflictError?{phase:"conflict",ownerUserId:userId,services:null,error:null,conflictDomains:error.domains}:{phase:"needs-choice",ownerUserId:userId,services:null,error:error instanceof Error?error.message:String(error),conflictDomains:[]});}},[userId,open]);
  useEffect(()=>{
    const session=managerRef.current?.current();
    if(state.phase!=="ready"||state.ownerUserId!==userId||!state.services||!session||session.userId!==userId)return;
    const services=state.services;let active=true;
    const publish=()=>{if(active&&managerRef.current?.current()===session){const status=session.database.currentStatus;setSyncSnapshot({services,connected:status.connected,hasSynced:!!status.hasSynced,hasError:!!status.downloadError||!!status.uploadError});}};
    const stop=session.database.registerListener({statusChanged:publish});
    const dispose=()=>{active=false;stop();};const unregister=session.registerCleanup(dispose);
    // Publish the current external-store snapshot and subscribe without polling.
    publish();
    return()=>{dispose();unregister();};
  },[state.phase,state.ownerUserId,state.services,userId]);
  const syncStatus=useMemo(()=>state.phase==="ready"&&state.ownerUserId===userId&&userId&&syncSnapshot?.services===state.services?{connected:syncSnapshot.connected,hasSynced:syncSnapshot.hasSynced,hasError:syncSnapshot.hasError}:null,[state.phase,state.ownerUserId,state.services,userId,syncSnapshot]);
  // Mask stale services synchronously, before effects or async cleanup run.
  const value=useMemo<AccountDataValue>(()=>({
    ...(!userId?{phase:"signed-out" as const,ownerUserId:null,services:null,error:null,conflictDomains:[]}:state.ownerUserId!==userId?{phase:"checking" as const,ownerUserId:userId,services:null,error:null,conflictDomains:[]}:state),
    syncStatus,chooseAdoption:()=>choose("adopt-device"),chooseCloud:()=>choose("use-cloud")
  }),[state,userId,syncStatus,choose]);
  return <AccountDataContext.Provider value={value}>{children}</AccountDataContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAccountData(){const value=useContext(AccountDataContext);if(!value)throw new Error("useAccountData must be used inside AccountDataProvider");return value;}
