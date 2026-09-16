import type { PowerSyncDatabase } from "@powersync/web";
import type { DataServices } from "../DataServicesContext";
import { createDefaultNotificationState } from "../notifications/localStorageNotificationStateRepository.ts";

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

export async function adoptCanonicalLocalData(local:DataServices,cloud:DataServices,database:PowerSyncDatabase):Promise<{adoptedDomains:string[]}>{
  const source=await snapshotData(local),target=await snapshotData(cloud);const conflicts:string[]=[];const domains=Object.keys(empty) as (keyof typeof empty)[];
  for(const domain of domains)if(!empty[domain](source[domain] as never)&&!empty[domain](target[domain] as never)&&!same(source[domain],target[domain]))conflicts.push(domain);
  if(conflicts.length)throw new AdoptionConflictError(conflicts);
  const adopted:string[]=[];const should=<K extends keyof typeof empty>(domain:K)=>!empty[domain](source[domain] as never)&&empty[domain](target[domain] as never);
  if(should("planning")){await cloud.planningRepository.replace(source.planning);adopted.push("planning");}
  if(should("tasks")){await cloud.taskRepository.replace(source.tasks);adopted.push("tasks");}
  if(should("habits")){await cloud.habitRepository.replace(source.habits);adopted.push("habits");}
  if(should("execution")){await cloud.executionHistoryRepository.replace(source.execution);adopted.push("execution");}
  if(should("profile")&&source.profile){await cloud.profileRepository.replace(source.profile);adopted.push("profile");}
  if(should("captures")){for(const capture of [...source.captures].reverse())await cloud.captureRepository.insert(capture);adopted.push("captures");}
  if(should("memory")){cloud.atlasMemoryRepository.save(source.memory);adopted.push("memory");}
  if(should("notifications")){cloud.notificationStateRepository.save(source.notifications);adopted.push("notifications");}
  await waitForSettled(database,source,adopted);
  return{adoptedDomains:adopted};
}
async function waitForSettled(database:PowerSyncDatabase,source:CanonicalDataSnapshot,domains:string[]):Promise<void>{const deadline=Date.now()+60000;while(Date.now()<deadline){const counts=await database.get<{mem:number;notice:number}>("SELECT (SELECT COUNT(*) FROM atlas_memory_items) AS mem, (SELECT COUNT(*) FROM notification_ui_state) AS notice");const localReady=(!domains.includes("memory")||counts.mem===source.memory.length)&&(!domains.includes("notifications")||counts.notice===1);if(localReady&&(await database.getUploadQueueStats()).count===0)return;await new Promise(resolve=>setTimeout(resolve,50));}throw new Error("Timed out waiting for adopted data to upload");}
