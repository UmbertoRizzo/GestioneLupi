import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Richieste famiglia" };
export default async function FamilyRequestsPage() {
  const user = await requireRole("PARENT");
  const assignments = await prisma.requestAssignment.findMany({ where: { child: { parents: { some: { userId: user.id, approvalStatus: "APPROVED" } }, approvalStatus: "APPROVED" }, request: { status: "PUBLISHED", visibleToParents: true } }, include: { child: true, request: { include: { activity: true, _count: { select: { items: true } } } } }, orderBy: [{ status: "asc" }, { request: { dueDate: "asc" } }] });
  return <div className="page-container"><PageHeader eyebrow="Famiglia" title="Richieste" description="Tutto cio che le branche hanno richiesto per i tuoi figli." />
    <section className="panel"><div className="panel__body--flush">{assignments.length ? assignments.map((assignment) => <Link className="request-card" href={`/famiglia/richieste/${assignment.id}`} key={assignment.id}><div><div className="request-card__head"><h3>{assignment.request.title}</h3><StatusPill status={assignment.status} /></div><p>Per {assignment.child.firstName} {assignment.child.lastName} · {assignment.request._count.items} elementi</p><div className="request-card__meta"><span><CalendarClock size={14} /> {assignment.request.dueDate ? formatDate(assignment.request.dueDate) : "Nessuna scadenza"}</span>{assignment.request.activity && <span>{assignment.request.activity.title}</span>}</div></div>{["APPROVED","COMPLETED"].includes(assignment.status) ? <CheckCircle2 size={21} color="var(--success)" /> : <StatusPill status={assignment.status} />}</Link>) : <div className="empty-state"><ClipboardList size={30} /><h3>Nessuna richiesta</h3><p>Quando la branca pubblichera qualcosa, comparira qui.</p></div>}</div></section>
  </div>;
}
