import assert from "node:assert/strict";
import test from "node:test";
import type { PowerSyncDatabase } from "@powersync/web";
import type { DataServices } from "../../src/data/DataServicesContext.ts";
import { AdoptionConflictError, adoptCanonicalLocalData } from "../../src/data/account/adoptLocalData.ts";
import { readAdoptionJournal } from "../../src/data/account/adoptionJournal.ts";
import { createDefaultNotificationState } from "../../src/data/notifications/localStorageNotificationStateRepository.ts";

const USER = "11111111-1111-4111-8111-111111111111";
type Seed = { tasks?:unknown[];execution?:unknown[];captures?:unknown[];failExecutionOnce?:boolean;failCaptureAfter?:number };

function journalDatabase(onQueueCheck:()=>void=()=>undefined){
  let journal:Record<string,unknown>|null=null;
  const database={
    init:async()=>undefined,
    getOptional:async()=>journal,
    execute:async(sql:string,args:unknown[]=[])=>{
      if(sql.startsWith("INSERT INTO adoption_journal"))journal={user_hash:args[0],adoption_version:args[1],source_hashes_json:args[2],completed_domains_json:args[3],started_at:args[4],updated_at:args[5]};
      if(sql.startsWith("UPDATE adoption_journal")&&journal)journal={...journal,completed_domains_json:args[0],updated_at:args[1]};
      if(sql.startsWith("DELETE FROM adoption_journal"))journal=null;
    },
    get:async()=>({mem:0,notice:0}),
    getUploadQueueStats:async()=>{onQueueCheck();return{count:0};},
  } as unknown as PowerSyncDatabase;
  return database;
}

function services(seed:Seed={}){
  let tasks=structuredClone(seed.tasks??[]),execution=structuredClone(seed.execution??[]),captures=structuredClone(seed.captures??[]);
  let failExecution=seed.failExecutionOnce??false,captureSuccesses=0,taskWrites=0,executionWrites=0,captureWrites=0;
  const planning={lifeGoals:[],monthlyOutcomes:[],weeklyFocuses:[]},habits={habits:[],completions:[]},notifications=createDefaultNotificationState();
  const value={
    taskRepository:{initialize:async()=>structuredClone(tasks),replace:async(next:unknown[])=>{taskWrites++;tasks=structuredClone(next);},subscribe:()=>()=>undefined},
    planningRepository:{initialize:async()=>planning,replace:async()=>undefined,subscribe:()=>()=>undefined},
    habitRepository:{initialize:async()=>habits,replace:async()=>undefined,subscribe:()=>()=>undefined},
    executionHistoryRepository:{initialize:async()=>structuredClone(execution),replace:async(next:unknown[])=>{if(failExecution){failExecution=false;throw new Error("controlled interruption");}executionWrites++;execution=structuredClone(next);return structuredClone(execution);},append:async()=>structuredClone(execution),remove:async()=>structuredClone(execution),clear:async()=>undefined,subscribe:()=>()=>undefined},
    profileRepository:{initialize:async()=>null,replace:async(value:unknown)=>value,subscribe:()=>()=>undefined},
    captureRepository:{initialize:async()=>structuredClone(captures),insert:async(capture:unknown)=>{if(seed.failCaptureAfter!==undefined&&captureSuccesses===seed.failCaptureAfter){seed.failCaptureAfter=undefined;throw new Error("controlled capture interruption");}captureSuccesses++;captureWrites++;captures=[structuredClone(capture),...captures];},delete:async()=>undefined,subscribe:()=>()=>undefined},
    atlasMemoryRepository:{initialize:async()=>[],getPersistenceState:()=>({phase:"hydrated",error:null}),load:()=>[],save:()=>undefined,clear:()=>undefined,subscribe:()=>()=>undefined},
    notificationStateRepository:{initialize:async()=>notifications,getPersistenceState:()=>({phase:"hydrated",error:null}),load:()=>notifications,save:()=>undefined,clear:()=>undefined,subscribe:()=>()=>undefined},
  } as unknown as DataServices;
  return{value,get taskWrites(){return taskWrites;},get executionWrites(){return executionWrites;},get captureWrites(){return captureWrites;}};
}

test("interrupted adoption resumes from actual domain state without replaying Execution History or XP",async()=>{
  const task={id:101,title:"temporary"};
  const event={id:102,type:"task_completed",entityId:101,title:"temporary",description:"",createdAt:"2026-09-16T00:00:00.000Z",xpAwarded:25};
  const local=services({tasks:[task],execution:[event]}),cloud=services({failExecutionOnce:true}),database=journalDatabase();
  await assert.rejects(()=>adoptCanonicalLocalData(local.value,cloud.value,database,USER),/controlled interruption/);
  assert.equal(cloud.taskWrites,1);
  assert.equal(cloud.executionWrites,0);
  const partial=await readAdoptionJournal(database,USER);
  assert.ok(partial?.completedDomains.includes("tasks"));
  assert.ok(!partial?.completedDomains.includes("execution"));
  const resumed=await adoptCanonicalLocalData(local.value,cloud.value,database,USER);
  assert.equal(resumed.resumed,true);
  assert.deepEqual(resumed.adoptedDomains,["execution"]);
  assert.equal(cloud.taskWrites,1);
  assert.equal(cloud.executionWrites,1);
  const records=await cloud.value.executionHistoryRepository.initialize();
  assert.equal(records.length,1);
  assert.equal((records[0] as {xpAwarded:number}).xpAwarded,25);
});

test("partial Capture insertion resumes only from an exact fingerprinted subset",async()=>{
  const first={id:201,text:"first",createdAt:"2026-09-16T00:00:00.000Z"};
  const second={id:202,text:"second",createdAt:"2026-09-16T00:00:01.000Z"};
  const local=services({captures:[first,second]}),cloud=services({failCaptureAfter:1}),database=journalDatabase();
  await assert.rejects(()=>adoptCanonicalLocalData(local.value,cloud.value,database,USER),/controlled capture interruption/);
  assert.equal((await cloud.value.captureRepository.initialize()).length,1);
  const resumed=await adoptCanonicalLocalData(local.value,cloud.value,database,USER);
  assert.equal(resumed.resumed,true);
  assert.equal(cloud.captureWrites,2);
  assert.deepEqual(await cloud.value.captureRepository.initialize(),[first,second]);
});

test("journal does not authorize merging unrelated cloud data or a changed device snapshot",async()=>{
  const local=services({tasks:[{id:1,title:"local"}]}),cloud=services({tasks:[{id:2,title:"cloud"}]}),database=journalDatabase();
  await assert.rejects(()=>adoptCanonicalLocalData(local.value,cloud.value,database,USER),(error:unknown)=>error instanceof AdoptionConflictError&&error.domains.includes("tasks"));
  const changed=services({tasks:[{id:3,title:"changed"}]});
  await assert.rejects(()=>adoptCanonicalLocalData(changed.value,services().value,database,USER),/Device data changed/);
  assert.equal(cloud.taskWrites,0);
});

test("an identical but unjournaled domain waits for pending uploads before completion",async()=>{
  const task={id:301,title:"already local"};let queueChecks=0;
  const result=await adoptCanonicalLocalData(services({tasks:[task]}).value,services({tasks:[task]}).value,journalDatabase(()=>{queueChecks++;}),USER);
  assert.deepEqual(result.adoptedDomains,[]);
  assert.ok(queueChecks>=1);
});
