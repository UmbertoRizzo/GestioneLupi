import Link from "next/link";
import { Activity, ContactRound, FileDown, FileWarning, Sheet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";

export const metadata = { title: "Esportazioni Excel" };
export default async function ExportsPage() {
  const { branch } = await requireAdminBranch();
  const activities = await prisma.activity.findMany({ where: { branchId: branch.id, requests: { some: {} } }, include: { _count: { select: { requests: true } } }, orderBy: { createdAt: "desc" } });
  return <div className="page-container"><PageHeader eyebrow={`${branch.group.name} / ${branch.name}`} title="Esportazioni Excel" description="Ogni file e organizzato nel formato piu utile per il suo scopo." />
    <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}><section className="panel"><div className="panel__body"><span className="stat-card__icon"><ContactRound size={20} /></span><h2 className="section-title">Elenco contatti</h2><p style={{ color: "var(--muted)" }}>Ragazzi, anno, genitori, email e telefoni in una tabella filtrabile.</p><Link className="button button--primary" href="/api/exports/contacts"><FileDown size={18} /> Scarica contatti</Link></div></section><section className="panel"><div className="panel__body"><span className="stat-card__icon"><FileWarning size={20} /></span><h2 className="section-title">Tutte le consegne mancanti</h2><p style={{ color: "var(--muted)" }}>Una riga per richiesta ancora mancante o da correggere, con i contatti.</p><Link className="button button--primary" href="/api/exports/missing"><FileDown size={18} /> Scarica mancanti</Link></div></section></div>
    <section className="panel"><header className="panel__header"><div><h2>Export per attivita</h2><p>Riepilogo a matrice, mancanti e contatti in fogli separati</p></div><Sheet size={19} /></header><div className="list">{activities.map((activity) => <div className="list-item" key={activity.id}><span className="list-item__icon"><Activity size={18} /></span><span className="list-item__text"><strong>{activity.title}</strong><small>{activity._count.requests} richieste collegate</small></span><Link className="button button--secondary button--small" href={`/api/exports/activity?activityId=${activity.id}`}><FileDown size={16} /> Excel</Link></div>)}{!activities.length && <div className="empty-state"><Sheet size={28} /><h3>Nessuna attivita esportabile</h3><p>Collega almeno una richiesta a un'attivita.</p></div>}</div></section>
  </div>;
}
