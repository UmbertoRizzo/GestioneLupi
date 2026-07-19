import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, FileText, Plus, Upload, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Riepilogo famiglia" };
export default async function FamilyDashboardPage() {
  const user = await requireRole("PARENT");
  const links = await prisma.childParent.findMany({ where: { userId: user.id }, include: { child: { include: { branch: { include: { group: true } }, assignments: { where: { request: { status: "PUBLISHED", visibleToParents: true } }, include: { request: true, submissions: true } } } } }, orderBy: { child: { firstName: "asc" } } });
  const approvedLinks = links.filter((link) => link.approvalStatus === "APPROVED" && link.child.approvalStatus === "APPROVED");
  const assignments = approvedLinks.flatMap((link) => link.child.assignments.map((assignment) => ({ ...assignment, child: link.child })));
  const missing = assignments.filter((a) => ["MISSING", "NEEDS_CHANGES"].includes(a.status));
  const now = new Date();
  const dueSoonCutoff = new Date(now.getTime() + 30 * 86400000);
  const dueSoon = missing.filter((a) => a.request.dueDate && a.request.dueDate < dueSoonCutoff);
  return <div className="page-container"><PageHeader eyebrow="La tua famiglia" title={`Ciao, ${user.firstName}`} description="Qui trovi le prossime cose da fare per i tuoi figli." actions={<Link className="button button--secondary" href="/famiglia/figli/nuovo"><Plus size={18} /> Aggiungi figlio</Link>} />
    {links.some((link) => link.approvalStatus === "PENDING" || link.child.approvalStatus === "PENDING") && <div className="notice notice--info"><AlertCircle size={20} /><div><strong>Una richiesta di iscrizione e in attesa</strong><p>Potrai vedere e compilare i documenti quando la branca avra approvato il collegamento.</p></div></div>}
    <div className="stats-grid"><StatCard label="Figli collegati" value={approvedLinks.length} hint={`${links.length - approvedLinks.length} in attesa`} icon={UsersRound} /><StatCard label="Da completare" value={missing.length} hint="richieste aperte" icon={Upload} tone={missing.length ? "danger" : "success"} /><StatCard label="Scadenze vicine" value={dueSoon.length} hint="nei prossimi 30 giorni" icon={CalendarClock} tone={dueSoon.length ? "warning" : undefined} /><StatCard label="Completate" value={assignments.length - missing.length} hint="richieste consegnate" icon={CheckCircle2} tone="success" /></div>
    <div className="dashboard-grid"><section className="panel"><header className="panel__header"><div><h2>Da fare</h2><p>Ordinate per scadenza</p></div><Link className="text-link" href="/famiglia/richieste">Tutte le richieste</Link></header><div className="panel__body--flush">{missing.length ? missing.slice(0, 8).map((assignment) => <Link className="request-card" href={`/famiglia/richieste/${assignment.id}`} key={assignment.id}><div><div className="request-card__head"><h3>{assignment.request.title}</h3><StatusPill status={assignment.status} /></div><p>Per {assignment.child.firstName} {assignment.child.lastName}</p><div className="request-card__meta"><span><CalendarClock size={14} /> {assignment.request.dueDate ? formatDate(assignment.request.dueDate) : "Nessuna scadenza"}</span></div></div><ArrowRight size={20} /></Link>) : <EmptyState icon={CheckCircle2} title="Tutto in ordine" description="Non ci sono richieste da completare in questo momento." />}</div></section>
      <aside className="dashboard-stack"><section className="panel"><header className="panel__header"><h2>I tuoi figli</h2><Link className="text-link" href="/famiglia/figli">Gestisci</Link></header><div className="list">{links.map((link) => <Link href="/famiglia/figli" className="list-item" key={link.id}><span className="list-item__icon"><UsersRound size={18} /></span><span className="list-item__text"><strong>{link.child.firstName} {link.child.lastName}</strong><small>{link.child.branch.group.name} · {link.child.branch.name} · {link.child.schoolYear}° anno</small></span><StatusPill status={link.approvalStatus === "APPROVED" ? link.child.approvalStatus : link.approvalStatus} /></Link>)}</div></section><section className="panel"><header className="panel__header"><h2>Scorciatoie</h2></header><div className="panel__body quick-actions"><Link className="quick-action" href="/famiglia/richieste"><Upload size={21} />Carica documenti</Link><Link className="quick-action" href="/famiglia/documenti"><FileText size={21} />Documenti inviati</Link></div></section></aside>
    </div></div>;
}
