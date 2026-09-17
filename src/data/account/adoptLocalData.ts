import type { PowerSyncDatabase } from "@powersync/web";
import type { DataServices } from "../DataServicesContext";
import { createDefaultNotificationState } from "../notifications/localStorageNotificationStateRepository.ts";
import { ADOPTION_DOMAINS, beginOrResumeAdoption, markAdoptionDomainComplete } from "./adoptionJournal.ts";
import type { AdoptionDomain } from "./adoptionJournal.ts";

export interface CanonicalDataSnapshot { tasks:Awaited<ReturnType<DataServices["taskRepository"]["initialize"]>>;planning:Awaited<ReturnType<DataServices["planningRepository"]["initialize"]>>;habits:Awaited<ReturnType<DataServices["habitRepository"]["initialize"]>>;execution:Awaited<ReturnType<DataServices["executionHistoryRepository"]["initialize"]>>;profile:Awaited<ReturnType<DataServices["profileRepository"]["initialize"]>>;captures:Awaited<ReturnType<DataServices["captureRepository"]["initialize"]>>;memory:readonly ReturnType<DataServices["atlasMemoryRepository"]["load"]>[number][];notifications:ReturnType<DataServices["notificationStateRepository"]["load"]> }
export class AdoptionConflictError extends Error { readonly domains:string[];constructor(domains:string[]){super(`Local and cloud data conflict in: ${domains.join(", ")}`);this.name="AdoptionConflictError";this.domains=domains;} }
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const emptyNotification=()=>createDefaultNotificationState();

export async function snapshotData(services:DataServices):Promise<CanonicalDataSnapshot>{
  const [tasks,planning,habits,execution,profile,captures]=await Promise.all([services.taskRepository.initialize(),services.planningRepository.initialize(),services.habitRepository.initialize(),services.executionHistoryRepository.initialize(),services.profileRepository.initialize(),services.captureRepository.initialize()]);
  await services.atlasMemoryRepository.initialize();await services.notificationStateRepository.initialize();
  return{tasks,planning,habits,execution,profile,captures,memory:services.atlasMemoryRepository.load(),notifications:services.notificationStateRepository.load()};
}
const empty={tasks:(v:CanonicalDataSnapshot["tasks"])=>v.length===0,planning:(v:CanonicalDataSnapshot["planning"])=>v.lifeGoals.length===0&&v.monthlyOutcomes.length===0&&v.weeklyFocuses.length===0,habits:(v:CanonicalDataSnapshot["habits"])=>v.habits.length===0&&v.completions.length===0,execution:(v:CanonicalDataSnapshot["execution"])=>v.length===0,profile:(v:CanonicalDataSnapshot["profile"])=>v===null,captures:(v:CanonicalDataSnapshot["captures"])=>v.length===0,memory:(v:CanonicalDataSnapshot["memory"])=>v.length===0,notifications:(v:CanonicalDataSnapshot["notifications"])=>same(v,emptyNotification())};

function recoverableCaptureSubset(source:CanonicalDataSnapshot["captures"],target:CanonicalDataSnapshot["captures"]):boolean{
  const byId=new Map(source.map(capture=>[capture.id,capture]));
  return target.every(capture=>{const expected=byId.get(capture.id);return expected!==undefined&&same(expected,capture);});
}

export async function adoptCanonicalLocalData(local:DataServices,cloud:DataServices,database:PowerSyncDatabase,userId:string):Promise<{adoptedDomains:string[];resumed:boolean}>{
  const source=await snapshotData(local),target=await snapshotData(cloud);
  const recovery=await beginOrResumeAdoption(database,userId,source);
  const conflicts:AdoptionDomain[]=[];
  for(const domain of ADOPTION_DOMAINS){
    const sourceValue=source[domain],targetValue=target[domain];
    if(empty[domain](sourceValue as never)||empty[domain](targetValue as never)||same(sourceValue,targetValue))continue;
    if(domain==="captures"&&recovery.resumed&&recoverableCaptureSubset(source.captures,target.captures))continue;
    conflicts.push(domain);
  }
  if(conflicts.length)throw new AdoptionConflictError(conflicts);

  const adopted:string[]=[];
  for(const domain of ADOPTION_DOMAINS){
    const sourceValue=source[domain],targetValue=target[domain];
    const completed=recovery.journal.completedDomains.includes(domain);
    if(empty[domain](sourceValue as never)){
      if(!completed)await markAdoptionDomainComplete(database,userId,domain);
      continue;
    }
    if(same(sourceValue,targetValue)){
      if(!completed){await waitForSettled(database,source,[domain]);await markAdoptionDomainComplete(database,userId,domain);}
      continue;
    }
    if(domain==="planning")await cloud.planningRepository.replace(source.planning);
    if(domain==="tasks")await cloud.taskRepository.replace(source.tasks);
    if(domain==="habits")await cloud.habitRepository.replace(source.habits);
    if(domain==="execution")await cloud.executionHistoryRepository.replace(source.execution);
    if(domain==="profile"&&source.profile)await cloud.profileRepository.replace(source.profile);
    if(domain==="captures"){
      const existingIds=new Set(target.captures.map(capture=>capture.id));
      for(const capture of [...source.captures].reverse())if(!existingIds.has(capture.id))await cloud.captureRepository.insert(capture);
    }
    if(domain==="memory")cloud.atlasMemoryRepository.save(source.memory);
    if(domain==="notifications")cloud.notificationStateRepository.save(source.notifications);
    adopted.push(domain);
    await waitForSettled(database,source,[domain]);
    await markAdoptionDomainComplete(database,userId,domain);
  }
  return{adoptedDomains:adopted,resumed:recovery.resumed};
}
async function waitForSettled(database:PowerSyncDatabase,source:CanonicalDataSnapshot,domains:string[]):Promise<void>{const deadline=Date.now()+60000;while(Date.now()<deadline){const counts=await database.get<{mem:number;notice:number}>("SELECT (SELECT COUNT(*) FROM atlas_memory_items) AS mem, (SELECT COUNT(*) FROM notification_ui_state) AS notice");const localReady=(!domains.includes("memory")||counts.mem===source.memory.length)&&(!domains.includes("notifications")||counts.notice===1);if(localReady&&(await database.getUploadQueueStats()).count===0)return;await new Promise(resolve=>setTimeout(resolve,50));}throw new Error("Timed out waiting for adopted data to upload");}
