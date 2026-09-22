import type { PowerSyncDatabase, Transaction } from "@powersync/web";
import type { Task, Capture, UserProfile } from "../../shared/types";
import type { HabitState } from "../../shared/habits";
import type { ExecutionRecord } from "../../shared/execution";
import type { AtlasMemoryItem } from "../../atlas/memory/types";
import { isAtlasMemoryCollection } from "../../atlas/memory/types";
import type { DataServices } from "../DataServicesContext";
import type { AsyncTaskRepository, TaskRepositoryEvent } from "../tasks/asyncTaskRepository";
import type { AsyncPlanningRepository, PlanningRepositoryEvent, PlanningRepositoryState } from "../planning/asyncPlanningRepository";
import type { AsyncHabitRepository, HabitRepositoryEvent } from "../habits/asyncHabitRepository";
import type { AsyncExecutionHistoryRepository, ExecutionHistoryRepositoryEvent } from "../execution/asyncExecutionHistoryRepository";
import type { AsyncProfileRepository, ProfileRepositoryEvent } from "../profile/asyncProfileRepository";
import type { AsyncCaptureRepository, CaptureRepositoryEvent } from "../captures/asyncCaptureRepository";
import type { AsyncAtlasMemoryRepository, AtlasMemoryPersistencePhase } from "../atlasMemory/asyncAtlasMemoryRepository";
import type { AsyncNotificationStateRepository, NotificationStatePersistencePhase } from "../notifications/asyncNotificationStateRepository";
import type { NotificationPersistedState } from "../notifications/notificationStateRepository";
import { createDefaultNotificationState } from "../notifications/localStorageNotificationStateRepository";
import { taskRowToTask, taskToDatabaseRow } from "../tasks/migrateLocalStorageTasks";
import { tasksEqualByValue } from "../tasks/tasksEqualByValue";
import type { TaskDatabaseRow } from "../tasks/migrateLocalStorageTasks";
import { lifeGoalRowToLifeGoal, lifeGoalToDatabaseRow, monthlyOutcomeRowToMonthlyOutcome, monthlyOutcomeToDatabaseRow, weeklyFocusRowToWeeklyFocus, weeklyFocusToDatabaseRow } from "../planning/migrateLocalStoragePlanning";
import type { LifeGoalDatabaseRow, MonthlyOutcomeDatabaseRow, WeeklyFocusDatabaseRow } from "../planning/migrateLocalStoragePlanning";
import { habitCompletionRowToCompletion, habitCompletionToDatabaseRow, habitDefinitionRowToHabit, habitDefinitionToDatabaseRow } from "../habits/migrateLocalStorageHabits";
import type { HabitCompletionDatabaseRow, HabitDefinitionDatabaseRow } from "../habits/migrateLocalStorageHabits";
import { executionIdToDatabaseId, executionRecordToDatabaseRow, executionRowToRecord } from "../execution/migrateLocalStorageExecutionHistory";
import type { ExecutionRecordDatabaseRow } from "../execution/migrateLocalStorageExecutionHistory";
import { profileRowsToProfile, profileToDatabaseRow } from "../profile/migrateLocalStorageProfile";
import type { ProfileDatabaseRow } from "../profile/migrateLocalStorageProfile";
import { memoryItemToRow, memoryRowsToItems } from "../atlasMemory/migrateLocalStorageAtlasMemory";
import type { AtlasMemoryDatabaseRow } from "../atlasMemory/migrateLocalStorageAtlasMemory";
import { notificationStateRowsToState, notificationStateToDatabaseRow } from "../notifications/migrateLocalStorageNotificationState";
import type { NotificationStateDatabaseRow } from "../notifications/migrateLocalStorageNotificationState";
import { assertAuthenticatedUserId } from "../database/authenticatedLifeOSPowerSync";

type EntityRow = { id: string };
type RowId = { row_id: string; entity_id: string };
type RowFactory = () => string;
interface EntityTable<Row extends EntityRow> { table: string; columns: readonly string[]; select: string; values(row: Row): unknown[]; }

const uuid: RowFactory = () => crypto.randomUUID();
const errorOf = (error: unknown) => error instanceof Error ? error : new Error(String(error));

async function waitForAuthenticatedUpload(db: PowerSyncDatabase): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if ((await db.getUploadQueueStats()).count === 0) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for account activity changes to sync");
}

async function replaceEntities<Row extends EntityRow>(transaction: Transaction, userId: string, config: EntityTable<Row>, rows: readonly Row[], createId: RowFactory): Promise<void> {
  const canonical = new Set(rows.map(row => row.id));
  if (canonical.size !== rows.length) throw new Error(`${config.table} contains duplicate canonical IDs`);
  const existing = await transaction.getAll<RowId>(`SELECT id AS row_id, entity_id FROM ${config.table}`);
  const byEntity = new Map(existing.map(row => [row.entity_id, row.row_id]));
  const assignments = config.columns.map(column => `${column} = ?`).join(", ");
  const columns = config.columns.join(", ");
  const placeholders = config.columns.map(() => "?").join(", ");
  for (const row of rows) {
    const rowId = byEntity.get(row.id);
    if (rowId) await transaction.execute(`UPDATE ${config.table} SET ${assignments} WHERE id = ?`, [...config.values(row), rowId]);
    else await transaction.execute(`INSERT INTO ${config.table}(id, user_id, entity_id, ${columns}) VALUES(?, ?, ?, ${placeholders})`, [createId(), userId, row.id, ...config.values(row)]);
  }
  for (const row of existing) if (!canonical.has(row.entity_id)) await transaction.execute(`DELETE FROM ${config.table} WHERE id = ?`, [row.row_id]);
}

const taskTable: EntityTable<TaskDatabaseRow> = { table:"tasks", columns:["title","description","due_date","priority","weekly_target_id","completed","completed_at","created_at","sort_order","extras_json"], select:"SELECT entity_id AS id, title, description, due_date, priority, weekly_target_id, completed, completed_at, created_at, sort_order, extras_json FROM tasks ORDER BY sort_order ASC, entity_id ASC", values:r=>[r.title,r.description,r.due_date,r.priority,r.weekly_target_id,r.completed,r.completed_at,r.created_at,r.sort_order,r.extras_json] };
const goalTable: EntityTable<LifeGoalDatabaseRow> = { table:"life_goals", columns:["title","description","progress","completed","completed_at","start_date","target_date","created_at","sort_order","extras_json"], select:"SELECT entity_id AS id, title, description, progress, completed, completed_at, start_date, target_date, created_at, sort_order, extras_json FROM life_goals ORDER BY sort_order ASC, entity_id ASC", values:r=>[r.title,r.description,r.progress,r.completed,r.completed_at,r.start_date,r.target_date,r.created_at,r.sort_order,r.extras_json] };
const monthTable: EntityTable<MonthlyOutcomeDatabaseRow> = { table:"monthly_outcomes", columns:["title","month","year","goal_id","progress","completed","completed_at","created_at","sort_order","extras_json"], select:"SELECT entity_id AS id, title, month, year, goal_id, progress, completed, completed_at, created_at, sort_order, extras_json FROM monthly_outcomes ORDER BY sort_order ASC, entity_id ASC", values:r=>[r.title,r.month,r.year,r.goal_id,r.progress,r.completed,r.completed_at,r.created_at,r.sort_order,r.extras_json] };
const weekTable: EntityTable<WeeklyFocusDatabaseRow> = { table:"weekly_focuses", columns:["title","monthly_target_id","week","week_start_date","week_end_date","progress","completed","completed_at","created_at","sort_order","extras_json"], select:"SELECT entity_id AS id, title, monthly_target_id, week, week_start_date, week_end_date, progress, completed, completed_at, created_at, sort_order, extras_json FROM weekly_focuses ORDER BY sort_order ASC, entity_id ASC", values:r=>[r.title,r.monthly_target_id,r.week,r.week_start_date,r.week_end_date,r.progress,r.completed,r.completed_at,r.created_at,r.sort_order,r.extras_json] };
const habitTable: EntityTable<HabitDefinitionDatabaseRow> = { table:"habit_definitions", columns:["name","description","active_days_json","start_date","archived","archived_at","created_at","updated_at","sort_order","extras_json"], select:"SELECT entity_id AS id, name, description, active_days_json, start_date, archived, archived_at, created_at, updated_at, sort_order, extras_json FROM habit_definitions ORDER BY sort_order ASC, entity_id ASC", values:r=>[r.name,r.description,r.active_days_json,r.start_date,r.archived,r.archived_at,r.created_at,r.updated_at,r.sort_order,r.extras_json] };
const completionTable: EntityTable<HabitCompletionDatabaseRow> = { table:"habit_completions", columns:["habit_id","date","completed_at","sort_order","extras_json"], select:"SELECT entity_id AS id, habit_id, date, completed_at, sort_order, extras_json FROM habit_completions ORDER BY sort_order ASC, entity_id ASC", values:r=>[r.habit_id,r.date,r.completed_at,r.sort_order,r.extras_json] };
const memoryTable: EntityTable<AtlasMemoryDatabaseRow> = { table:"atlas_memory_items", columns:["type","topic","content","source","created_at","updated_at","status","supersedes_memory_id","sort_order"], select:"SELECT entity_id AS id, type, topic, content, source, created_at, updated_at, status, supersedes_memory_id, sort_order FROM atlas_memory_items ORDER BY sort_order ASC, entity_id ASC", values:r=>[r.type,r.topic,r.content,r.source,r.created_at,r.updated_at,r.status,r.supersedes_memory_id,r.sort_order] };

class AuthTaskRepository implements AsyncTaskRepository {
  private initialized?:Promise<Task[]>; private queue=Promise.resolve();
  private readonly db:PowerSyncDatabase;private readonly userId:string;private readonly makeId:RowFactory;
  constructor(db:PowerSyncDatabase,userId:string,makeId:RowFactory){this.db=db;this.userId=userId;this.makeId=makeId;}
  initialize(onPhase?:(phase:"opening"|"migration")=>void){if(!this.initialized)this.initialized=(async()=>{onPhase?.("opening");await this.db.init();return this.load();})();return this.initialized;}
  private async load(){return (await this.db.getAll<TaskDatabaseRow>(taskTable.select)).map(taskRowToTask);}
  async readCurrent(){await this.initialize();await this.queue;return this.load();}
  async waitForPersistence(){await this.initialize();await this.queue;await waitForAuthenticatedUpload(this.db);}
  async replace(tasks:Task[]){await this.initialize();const rows=tasks.map(taskToDatabaseRow);const op=this.queue.then(()=>this.db.writeTransaction(async tx=>{await replaceEntities(tx,this.userId,taskTable,rows,this.makeId);const saved=(await tx.getAll<TaskDatabaseRow>(taskTable.select)).map(taskRowToTask);if(!tasksEqualByValue(saved,tasks))throw new Error("Authenticated Task replacement failed");}));this.queue=op.catch(()=>undefined);return op;}
  subscribe(listener:(event:TaskRepositoryEvent)=>void){return watch(this.db,taskTable.select,rows=>listener({type:"tasks",tasks:(rows as TaskDatabaseRow[]).map(taskRowToTask)}),listener);}
}

class AuthPlanningRepository implements AsyncPlanningRepository {
  private initialized?:Promise<PlanningRepositoryState>; private queue=Promise.resolve();
  private readonly db:PowerSyncDatabase;private readonly userId:string;private readonly makeId:RowFactory;
  constructor(db:PowerSyncDatabase,userId:string,makeId:RowFactory){this.db=db;this.userId=userId;this.makeId=makeId;}
  initialize(onPhase?:(phase:"opening"|"migration")=>void){if(!this.initialized)this.initialized=(async()=>{onPhase?.("opening");await this.db.init();return this.load();})();return this.initialized;}
  private async load():Promise<PlanningRepositoryState>{return this.db.readTransaction(async tx=>({lifeGoals:(await tx.getAll<LifeGoalDatabaseRow>(goalTable.select)).map(lifeGoalRowToLifeGoal),monthlyOutcomes:(await tx.getAll<MonthlyOutcomeDatabaseRow>(monthTable.select)).map(monthlyOutcomeRowToMonthlyOutcome),weeklyFocuses:(await tx.getAll<WeeklyFocusDatabaseRow>(weekTable.select)).map(weeklyFocusRowToWeeklyFocus)}));}
  async replace(state:PlanningRepositoryState){await this.initialize();const copy=structuredClone(state);const op=this.queue.then(()=>this.db.writeTransaction(async tx=>{await replaceEntities(tx,this.userId,goalTable,copy.lifeGoals.map(lifeGoalToDatabaseRow),this.makeId);await replaceEntities(tx,this.userId,monthTable,copy.monthlyOutcomes.map(monthlyOutcomeToDatabaseRow),this.makeId);await replaceEntities(tx,this.userId,weekTable,copy.weeklyFocuses.map(weeklyFocusToDatabaseRow),this.makeId);}));this.queue=op.catch(()=>undefined);return op;}
  subscribe(listener:(event:PlanningRepositoryEvent)=>void){return watch(this.db,"SELECT entity_id FROM life_goals UNION ALL SELECT entity_id FROM monthly_outcomes UNION ALL SELECT entity_id FROM weekly_focuses",async()=>listener({type:"planning",state:await this.load()}),listener);}
}

class AuthHabitRepository implements AsyncHabitRepository {
  private initialized?:Promise<HabitState>; private queue=Promise.resolve();
  private readonly db:PowerSyncDatabase;private readonly userId:string;private readonly makeId:RowFactory;
  constructor(db:PowerSyncDatabase,userId:string,makeId:RowFactory){this.db=db;this.userId=userId;this.makeId=makeId;}
  initialize(onPhase?:(phase:"opening"|"migration")=>void){if(!this.initialized)this.initialized=(async()=>{onPhase?.("opening");await this.db.init();return this.load();})();return this.initialized;}
  private async load():Promise<HabitState>{return this.db.readTransaction(async tx=>({habits:(await tx.getAll<HabitDefinitionDatabaseRow>(habitTable.select)).map(habitDefinitionRowToHabit),completions:(await tx.getAll<HabitCompletionDatabaseRow>(completionTable.select)).map(habitCompletionRowToCompletion)}));}
  async replace(state:HabitState){await this.initialize();const copy=structuredClone(state);const op=this.queue.then(()=>this.db.writeTransaction(async tx=>{await replaceEntities(tx,this.userId,habitTable,copy.habits.map(habitDefinitionToDatabaseRow),this.makeId);await replaceEntities(tx,this.userId,completionTable,copy.completions.map(habitCompletionToDatabaseRow),this.makeId);}));this.queue=op.catch(()=>undefined);return op;}
  subscribe(listener:(event:HabitRepositoryEvent)=>void){return watch(this.db,"SELECT entity_id FROM habit_definitions UNION ALL SELECT entity_id FROM habit_completions",async()=>listener({type:"habits",state:await this.load()}),listener);}
}

function watch(db:PowerSyncDatabase,query:string,publish:(rows:unknown[])=>void|Promise<void>,listener:(event:{type:"error";error:Error})=>void){const controller=new AbortController();void(async()=>{try{for await(const result of db.watch(query,[],{signal:controller.signal})){if(controller.signal.aborted)return;await publish((result.rows?._array??[]) as unknown[]);}}catch(error){if(!controller.signal.aborted)listener({type:"error",error:errorOf(error)});}})();return()=>controller.abort();}


const executionQuery="SELECT id, execution_id, type, entity_id, title, description, created_at, xp_awarded, icon, color, metadata_json, sort_order, extras_json FROM execution_records ORDER BY sort_order ASC, id ASC";
class AuthExecutionRepository implements AsyncExecutionHistoryRepository {
  private initialized?:Promise<ExecutionRecord[]>;private queue=Promise.resolve();
  private readonly db:PowerSyncDatabase;private readonly userId:string;private readonly makeId:RowFactory;
  constructor(db:PowerSyncDatabase,userId:string,makeId:RowFactory){this.db=db;this.userId=userId;this.makeId=makeId;}
  initialize(onPhase?:(phase:"opening"|"migration")=>void){if(!this.initialized)this.initialized=(async()=>{onPhase?.("opening");await this.db.init();return this.load();})();return this.initialized;}
  private async rows(){return this.db.getAll<ExecutionRecordDatabaseRow>(executionQuery);}private async load(){return(await this.rows()).map(executionRowToRecord);}
  async readCurrent(){await this.initialize();await this.queue;return this.load();}
  async waitForPersistence(){await this.initialize();await this.queue;await waitForAuthenticatedUpload(this.db);}
  private enqueue<T>(work:()=>Promise<T>){const result=this.queue.then(work);this.queue=result.then(()=>undefined,()=>undefined);return result;}
  async replace(records:ExecutionRecord[]){await this.initialize();const copy=structuredClone(records);return this.enqueue(()=>this.db.writeTransaction(async tx=>{await tx.execute("DELETE FROM execution_records");for(const [index,record] of copy.entries()){const row=executionRecordToDatabaseRow(record,index,this.makeId());await tx.execute("INSERT INTO execution_records(id,user_id,execution_id,entity_id,type,title,description,created_at,xp_awarded,icon,color,metadata_json,sort_order,extras_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[row.id,this.userId,row.execution_id,row.entity_id,row.type,row.title,row.description,row.created_at,row.xp_awarded,row.icon,row.color,row.metadata_json,row.sort_order,row.extras_json]);}return(await tx.getAll<ExecutionRecordDatabaseRow>(executionQuery)).map(executionRowToRecord);}));}
  async append(records:ExecutionRecord[]){await this.initialize();if(records.length===0)return this.load();const copy=structuredClone(records);return this.enqueue(()=>this.db.writeTransaction(async tx=>{const existing=await tx.getAll<ExecutionRecordDatabaseRow>(executionQuery);const first=existing.length?existing[0]!.sort_order-copy.length:0;for(const [index,record] of copy.entries()){const row=executionRecordToDatabaseRow(record,first+index,this.makeId());await tx.execute("INSERT INTO execution_records(id,user_id,execution_id,entity_id,type,title,description,created_at,xp_awarded,icon,color,metadata_json,sort_order,extras_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[row.id,this.userId,row.execution_id,row.entity_id,row.type,row.title,row.description,row.created_at,row.xp_awarded,row.icon,row.color,row.metadata_json,row.sort_order,row.extras_json]);}return(await tx.getAll<ExecutionRecordDatabaseRow>(executionQuery)).map(executionRowToRecord);}));}
  async remove(id:number){await this.initialize();return this.enqueue(()=>this.db.writeTransaction(async tx=>{await tx.execute("DELETE FROM execution_records WHERE execution_id = ?",[executionIdToDatabaseId(id)]);return(await tx.getAll<ExecutionRecordDatabaseRow>(executionQuery)).map(executionRowToRecord);}));}
  async clear(){await this.initialize();await this.enqueue(()=>this.db.execute("DELETE FROM execution_records").then(()=>undefined));}
  subscribe(listener:(event:ExecutionHistoryRepositoryEvent)=>void){return watch(this.db,executionQuery,rows=>listener({type:"history",records:(rows as ExecutionRecordDatabaseRow[]).map(executionRowToRecord)}),listener);}
}

const profileQuery="SELECT entity_id AS id, profile_json FROM profiles ORDER BY entity_id ASC";
class AuthProfileRepository implements AsyncProfileRepository {
  private initialized?:Promise<UserProfile|null>;private queue=Promise.resolve();
  private readonly db:PowerSyncDatabase;private readonly userId:string;private readonly makeId:RowFactory;
  constructor(db:PowerSyncDatabase,userId:string,makeId:RowFactory){this.db=db;this.userId=userId;this.makeId=makeId;}
  initialize(onPhase?:(phase:"opening"|"migration")=>void){if(!this.initialized)this.initialized=(async()=>{onPhase?.("opening");await this.db.init();return this.load();})();return this.initialized;}
  private async load(){return profileRowsToProfile(await this.db.getAll<ProfileDatabaseRow>(profileQuery));}
  async replace(profile:UserProfile){await this.initialize();const copy=structuredClone(profile);const result=this.queue.then(()=>this.db.writeTransaction(async tx=>{const row=profileToDatabaseRow(copy);await replaceEntities(tx,this.userId,{table:"profiles",columns:["profile_json"],select:profileQuery,values:(value:ProfileDatabaseRow)=>[value.profile_json]},[row],this.makeId);const saved=profileRowsToProfile(await tx.getAll<ProfileDatabaseRow>(profileQuery));if(!saved)throw new Error("Authenticated Profile replacement failed");return saved;}));this.queue=result.then(()=>undefined,()=>undefined);return result;}
  subscribe(listener:(event:ProfileRepositoryEvent)=>void){return watch(this.db,profileQuery,rows=>listener({type:"profile",profile:profileRowsToProfile(rows as ProfileDatabaseRow[])}),listener);}
}

interface CaptureRow{ id:string;text:string;created_at:string;sort_order:number;extras_json:string|null }
const captureQuery="SELECT entity_id AS id, text, created_at, sort_order, extras_json FROM captures ORDER BY sort_order ASC, entity_id DESC";
const captureId=(id:string)=>{if(!/^(0|[1-9]\d*)$/.test(id)||!Number.isSafeInteger(Number(id)))throw new Error(`Invalid Capture entity ID: ${id}`);return Number(id);};
const captureFrom=(row:CaptureRow):Capture=>{let extras:Record<string,unknown>={};if(row.extras_json){const parsed:unknown=JSON.parse(row.extras_json);if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Invalid Capture extras");extras=parsed as Record<string,unknown>;}return{...extras,id:captureId(row.id),text:row.text,createdAt:row.created_at} as Capture;};
const captureExtras=(capture:Capture)=>{const extras={...capture} as Record<string,unknown>;delete extras.id;delete extras.text;delete extras.createdAt;return Object.keys(extras).length?JSON.stringify(extras):null;};
class AuthCaptureRepository implements AsyncCaptureRepository {
  private initialized?:Promise<Capture[]>;
  private readonly db:PowerSyncDatabase;private readonly userId:string;private readonly makeId:RowFactory;
  constructor(db:PowerSyncDatabase,userId:string,makeId:RowFactory){this.db=db;this.userId=userId;this.makeId=makeId;}
  initialize(onPhase?:(phase:"opening"|"migration")=>void){if(!this.initialized)this.initialized=(async()=>{onPhase?.("opening");await this.db.init();return this.load();})();return this.initialized;}
  private async load(){return(await this.db.getAll<CaptureRow>(captureQuery)).map(captureFrom);}
  async insert(capture:Capture){await this.initialize();if(!Number.isSafeInteger(capture.id)||capture.id<0)throw new Error("Invalid Capture ID");await this.db.writeTransaction(async tx=>{const minimum=await tx.getOptional<{minimum:number|null}>("SELECT MIN(sort_order) AS minimum FROM captures");await tx.execute("INSERT INTO captures(id,user_id,entity_id,text,created_at,sort_order,extras_json) VALUES(?,?,?,?,?,?,?)",[this.makeId(),this.userId,String(capture.id),capture.text,capture.createdAt,minimum?.minimum==null?0:minimum.minimum-1,captureExtras(capture)]);});}
  async delete(id:number){await this.initialize();await this.db.execute("DELETE FROM captures WHERE entity_id = ?",[String(id)]);}
  subscribe(listener:(event:CaptureRepositoryEvent)=>void){return watch(this.db,captureQuery,rows=>listener({type:"captures",captures:(rows as CaptureRow[]).map(captureFrom)}),listener);}
}

class AuthMemoryRepository implements AsyncAtlasMemoryRepository {
  private initialized?:Promise<readonly AtlasMemoryItem[]>;private cache:readonly AtlasMemoryItem[]=[];private phase:AtlasMemoryPersistencePhase="uninitialized";private error:Error|null=null;private queue=Promise.resolve();private listeners=new Set<()=>void>();
  private readonly db:PowerSyncDatabase;private readonly userId:string;private readonly makeId:RowFactory;
  constructor(db:PowerSyncDatabase,userId:string,makeId:RowFactory){this.db=db;this.userId=userId;this.makeId=makeId;}
  initialize(onPhase?:(phase:"opening"|"migration")=>void){if(!this.initialized)this.initialized=(async()=>{this.phase="opening";onPhase?.("opening");await this.db.init();this.cache=memoryRowsToItems(await this.db.getAll<AtlasMemoryDatabaseRow>(memoryTable.select));this.phase="hydrated";return this.load();})().catch(error=>{this.phase="error";this.error=errorOf(error);throw error;});return this.initialized;}
  getPersistenceState(){return{phase:this.phase,error:this.error};}load(){if(this.phase!=="hydrated")throw new Error("ATLAS Memory is not hydrated");return structuredClone(this.cache);}
  save(items:readonly AtlasMemoryItem[]){if(this.phase!=="hydrated"||!isAtlasMemoryCollection(items))throw new Error("Invalid ATLAS Memory state");const copy=structuredClone(items);this.cache=copy;this.notify();const op=this.queue.then(()=>this.db.writeTransaction(tx=>replaceEntities(tx,this.userId,memoryTable,copy.map(memoryItemToRow),this.makeId)));this.queue=op.catch(error=>{this.phase="error";this.error=errorOf(error);this.notify();});}
  clear(){this.save([]);}subscribe(listener:()=>void){this.listeners.add(listener);const stop=watch(this.db,memoryTable.select,rows=>{this.cache=memoryRowsToItems(rows as AtlasMemoryDatabaseRow[]);this.notify();},()=>undefined);return()=>{this.listeners.delete(listener);stop();};}private notify(){for(const listener of this.listeners)listener();}
}

const notificationQuery="SELECT entity_id AS id, state_json FROM notification_ui_state ORDER BY entity_id ASC";
class AuthNotificationRepository implements AsyncNotificationStateRepository {
  private initialized?:Promise<NotificationPersistedState>;private cache=createDefaultNotificationState();private phase:NotificationStatePersistencePhase="uninitialized";private error:Error|null=null;private queue=Promise.resolve();private listeners=new Set<()=>void>();
  private readonly db:PowerSyncDatabase;private readonly userId:string;private readonly makeId:RowFactory;
  constructor(db:PowerSyncDatabase,userId:string,makeId:RowFactory){this.db=db;this.userId=userId;this.makeId=makeId;}
  initialize(onPhase?:(phase:"opening"|"migration")=>void){if(!this.initialized)this.initialized=(async()=>{this.phase="opening";onPhase?.("opening");await this.db.init();this.cache=notificationStateRowsToState(await this.db.getAll<NotificationStateDatabaseRow>(notificationQuery))??createDefaultNotificationState();this.phase="hydrated";return this.load();})().catch(error=>{this.phase="error";this.error=errorOf(error);throw error;});return this.initialized;}
  getPersistenceState(){return{phase:this.phase,error:this.error};}load(){if(this.phase!=="hydrated")throw new Error("Notification state is not hydrated");return structuredClone(this.cache);}
  save(state:NotificationPersistedState){if(this.phase!=="hydrated")throw new Error("Notification state is not hydrated");const copy=structuredClone(state),row=notificationStateToDatabaseRow(copy);this.cache=copy;this.notify();const op=this.queue.then(()=>this.db.writeTransaction(tx=>replaceEntities(tx,this.userId,{table:"notification_ui_state",columns:["state_json"],select:notificationQuery,values:(value:NotificationStateDatabaseRow)=>[value.state_json]},[row],this.makeId)));this.queue=op.catch(error=>{this.phase="error";this.error=errorOf(error);this.notify();});}
  clear(){this.save(createDefaultNotificationState());}subscribe(listener:()=>void){this.listeners.add(listener);const stop=watch(this.db,notificationQuery,rows=>{this.cache=notificationStateRowsToState(rows as NotificationStateDatabaseRow[])??createDefaultNotificationState();this.notify();},()=>undefined);return()=>{this.listeners.delete(listener);stop();};}private notify(){for(const listener of this.listeners)listener();}
}
type RegisterCleanup=(cleanup:()=>void|Promise<void>)=>(()=>void);
function managed<T extends object>(repository:T,register?:RegisterCleanup):T{if(!register)return repository;return new Proxy(repository,{get(target,property){if(property==="subscribe")return(listener:unknown)=>{const subscribe=Reflect.get(target,property) as (value:unknown)=>()=>void;const cleanup=subscribe.call(target,listener);const unregister=register(cleanup);return()=>{unregister();cleanup();};};const value=Reflect.get(target,property);return typeof value==="function"?value.bind(target):value;}});}

export function createAuthenticatedDataServices(database:PowerSyncDatabase,userId:string,createId:RowFactory=uuid,registerCleanup?:RegisterCleanup):DataServices {
  const owner=assertAuthenticatedUserId(userId);
  return {
    taskRepository:managed(new AuthTaskRepository(database,owner,createId),registerCleanup),
    planningRepository:managed(new AuthPlanningRepository(database,owner,createId),registerCleanup),
    habitRepository:managed(new AuthHabitRepository(database,owner,createId),registerCleanup),
    executionHistoryRepository:managed(new AuthExecutionRepository(database,owner,createId),registerCleanup),
    profileRepository:managed(new AuthProfileRepository(database,owner,createId),registerCleanup),
    captureRepository:managed(new AuthCaptureRepository(database,owner,createId),registerCleanup),
    atlasMemoryRepository:managed(new AuthMemoryRepository(database,owner,createId),registerCleanup),
    notificationStateRepository:managed(new AuthNotificationRepository(database,owner,createId),registerCleanup),
  };
}
