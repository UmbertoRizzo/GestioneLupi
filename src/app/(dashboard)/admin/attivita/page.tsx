import Link from "next/link";
import { Activity as ActivityIcon, CalendarDays, FileDown, Plus } from "lucide-react";
import { createActivityAction } from "@/actions/activities";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Attivita" };
export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { branch } = await requireAdminBranch(); const query = await searchParams;
  const activities = await prisma.activity.findMany({ where: { branchId: branch.id }, include: { requests: { include: { _count: { select: { assignments: true } }, assignments: { select: { status: true } } } } }, orderBy: [{ status: "asc" }, { year: "desc" }, { createdAt: "desc" }] });
  return <div className="page-container"><PageHeader eyebrow={`${branch.group.name} / ${branch.name}`} title="Attivita" description="Raggruppa richieste, moduli e pagamenti per campo o evento." />
    {query.creata && <div className="form-message form-message--success" style={{ marginBottom: 16 }}>Attivita creata.</div>}
    <div className="detail-grid"><section className="panel"><header className="panel__header"><div><h2>Attivita della branca</h2><p>{activities.length} raccolte tematiche</p></div></header><div>{activities.length ? activities.map((activity) => { const assignments = activity.requests.flatMap((request) => request.assignments); const completed = assignments.filter((item) => ["APPROVED","COMPLETED"].includes(item.status)).length; const percentage = assignments.length ? Math.round(completed/assignments.length*100) : 0; return <div className="request-card" key={activity.id}><div><div className="request-card__head"><h3>{activity.title}</h3><StatusPill status={activity.status} /></div><p>{activity.description || `${activity.requests.length} richieste collegate`}</p><div className="request-card__meta"><span><CalendarDays size={14} /> {activity.startsAt ? formatDate(activity.startsAt) : activity.year || "Date non definite"}</span><span>{completed}/{assignments.length} completate</span></div></div><div className="request-card__progress"><strong>{percentage}%</strong><div className="progress"><span style={{ width: `${percentage}%` }} /></div><Link className="button button--quiet button--small" href={`/api/exports/activity?activityId=${activity.id}`}><FileDown size={15} /> Excel</Link></div></div>; }) : <div className="empty-state"><ActivityIcon size={30} /><h3>Nessuna attivita</h3><p>Crea ad esempio Campo Estivo 2027 e collega tutte le richieste relative.</p></div>}</div></section>
      <aside><section className="panel"><header className="panel__header"><h2>Nuova attivita</h2></header><form className="panel__body form-stack" action={createActivityAction}><label className="field"><span>Titolo</span><input name="title" placeholder="es. Campo Estivo 2027" required /></label><label className="field"><span>Descrizione <em>facoltativa</em></span><textarea name="description" /></label><div className="form-grid form-grid--2"><label className="field"><span>Anno</span><input name="year" type="number" min="2000" max="2200" defaultValue={new Date().getFullYear()} /></label><span /></div><div className="form-grid form-grid--2"><label className="field"><span>Inizio</span><input name="startsAt" type="date" /></label><label className="field"><span>Fine</span><input name="endsAt" type="date" /></label></div><SubmitButton pendingText="Creazione..."><Plus size={17} /> Crea attivita</SubmitButton></form></section></aside>
    </div></div>;
}
