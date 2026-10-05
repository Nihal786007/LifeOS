import { useState } from "react";
import Button from "../ui/Button";
import { useGoogleCalendar } from "../../connectors/googleCalendar/GoogleCalendarContext";
import { calendarWallTimeToRFC3339, parseCalendarEventPayload, type CalendarEventProposal } from "../../connectors/calendar/eventProposal";

export default function CreateGoogleCalendarEvent() {
  const calendar = useGoogleCalendar();
  const owned = calendar.readModel.calendars.filter(item=>item.accessRole === "owner");
  const [open, setOpen] = useState(false);
  const [proposal, setProposal] = useState<CalendarEventProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [title, setTitle] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const inputClass = "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-cyan-400/60";
  async function preview() {
    setBusy(true); setFeedback("");
    try {
      const payload = parseCalendarEventPayload({ calendarId, title, start: allDay ? start : calendarWallTimeToRFC3339(start, timezone), end: allDay ? end : calendarWallTimeToRFC3339(end, timezone), allDay, timezone, ...(location.trim()?{location}:{}), ...(description.trim()?{description}:{}) });
      setProposal(await calendar.prepareEvent(payload));
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Event details could not be verified."); }
    finally { setBusy(false); }
  }
  async function approve() {
    if (!proposal || busy) return;
    setBusy(true); setFeedback("");
    try { await calendar.approveEvent(proposal); setProposal(null); setOpen(false); setFeedback("Google Calendar event created. No LifeOS task was created; XP is unchanged."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Creation was not confirmed. Check Calendar before retrying this approval."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Google Calendar</h2><p className="text-xs text-slate-400">External events stay separate from LifeOS tasks.</p></div>
      <Button disabled={busy || calendar.connection.state === "connecting"} onClick={()=>{setOpen(!open); setProposal(null); setFeedback(""); const primary=owned.find(item=>item.primary); setCalendarId(primary?.externalId ?? ""); if(primary?.timezone)setTimezone(primary.timezone);}}>Create event</Button>
    </div>
    {calendar.recoveryProposal && !proposal && <div className="space-y-2"><p className="text-sm text-amber-200">A previous event creation needs confirmation. Check Google Calendar, then review the same approval to avoid duplicates.</p><Button disabled={busy} onClick={()=>{setOpen(true);setProposal(calendar.recoveryProposal);setFeedback("");}}>Review previous approval</Button></div>}
    {open && (calendar.connection.state !== "connected" || !calendar.connection.canCreate) && <div className="space-y-3"><p className="text-sm text-slate-300">Grant event creation on calendars you own. Google’s permission also covers editing and deletion, but LifeOS only supports creating an event after your exact approval.</p><Button onClick={()=>void calendar.connect(true)}>{calendar.connection.state === "connected" ? "Grant event creation permission" : "Connect for event creation"}</Button></div>}
    {open && calendar.connection.canCreate && !proposal && <form className="grid gap-3 sm:grid-cols-2" onSubmit={event=>{event.preventDefault(); void preview();}}>
      <label className="text-xs text-slate-400 sm:col-span-2">Title<input required maxLength={240} className={inputClass} value={title} onChange={event=>setTitle(event.target.value)}/></label>
      <label className="text-xs text-slate-400">Calendar<select required className={inputClass} value={calendarId} onChange={event=>{setCalendarId(event.target.value); const next=owned.find(item=>item.externalId===event.target.value); if(next?.timezone)setTimezone(next.timezone);}}><option value="">Choose a calendar you own</option>{owned.map(item=><option key={item.externalId} value={item.externalId}>{item.name}{item.primary?" · Primary":""}</option>)}</select></label>
      <label className="text-xs text-slate-400">Timezone<input required className={inputClass} value={timezone} onChange={event=>setTimezone(event.target.value)}/></label>
      <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2"><input type="checkbox" checked={allDay} onChange={event=>{setAllDay(event.target.checked);setStart("");setEnd("");}}/>All-day event</label>
      <label className="text-xs text-slate-400">Start<input required type={allDay?"date":"datetime-local"} className={inputClass} value={start} onChange={event=>setStart(event.target.value)}/></label>
      <label className="text-xs text-slate-400">{allDay?"End date (exclusive)":"End"}<input required type={allDay?"date":"datetime-local"} className={inputClass} value={end} onChange={event=>setEnd(event.target.value)}/></label>
      <label className="text-xs text-slate-400">Location (optional)<input maxLength={1024} className={inputClass} value={location} onChange={event=>setLocation(event.target.value)}/></label>
      <label className="text-xs text-slate-400">Description (optional)<textarea maxLength={4000} className={inputClass} value={description} onChange={event=>setDescription(event.target.value)}/></label>
      <div className="flex gap-2 sm:col-span-2"><Button disabled={busy} type="submit">{busy?"Verifying…":"Preview event"}</Button><Button disabled={busy} type="button" variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button></div>
    </form>}
    {open && proposal && <div className="space-y-3"><h3 className="font-semibold text-white">Approve this exact event</h3><dl className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries({Title:proposal.payload.title,Calendar:proposal.calendarName,Start:proposal.payload.start,End:proposal.payload.end,Timezone:proposal.payload.timezone??"Date only","All-day":proposal.payload.allDay?"Yes · end date is exclusive":"No",Location:proposal.payload.location??"None",Description:proposal.payload.description??"None"}).map(([key,value])=><div key={key} className="min-w-0"><dt className="text-slate-400">{key}</dt><dd className="whitespace-pre-wrap break-words text-white">{value}</dd></div>)}</dl><p className="text-xs text-slate-400">Nothing is created until you approve. A confirmed creation records one zero-XP audit.</p><div className="flex gap-2"><Button disabled={busy} onClick={()=>void approve()}>{busy?"Confirming creation…":"Approve & create event"}</Button><Button disabled={busy} variant="secondary" onClick={()=>{setProposal(null);setFeedback("");}}>Edit / cancel approval</Button></div></div>}
    {feedback && <p role="status" className="text-sm text-cyan-200">{feedback}</p>}
  </section>;
}
