import Link from "next/link";
import { AlertCircle, CalendarDays, Plus, UserRound, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Figli" };

export default async function FamilyChildrenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("PARENT");
  const params = await searchParams;
  const links = await prisma.childParent.findMany({ where: { userId: user.id }, include: { child: { include: { branch: { include: { group: true } }, _count: { select: { assignments: true } } } } }, orderBy: { child: { firstName: "asc" } } });
  return <div className="page-container"><PageHeader eyebrow="Famiglia" title="Figli collegati" description="Anagrafica, branca e stato di approvazione." actions={<Link className="button button--primary" href="/famiglia/figli/nuovo"><Plus size={18} /> Aggiungi figlio</Link>} />
    {params.aggiunto && <div className="notice notice--info"><AlertCircle size={20} /><div><strong>Richiesta inviata</strong><p>La branca deve approvare tuo figlio prima che tu possa aprire le richieste.</p></div></div>}
    {params.collegamento && <div className="notice notice--info"><AlertCircle size={20} /><div><strong>Profilo gia esistente</strong><p>Abbiamo chiesto alla branca di collegarlo al tuo account, evitando un duplicato.</p></div></div>}
    <section className="panel"><div className="panel__body--flush">{links.length ? <><table className="data-table"><thead><tr><th>Ragazzo</th><th>Branca</th><th>Anno</th><th>Nascita</th><th>Richieste</th><th>Stato</th></tr></thead><tbody>{links.map((link) => <tr key={link.id}><td><div className="table-person"><span className="avatar"><UserRound size={17} /></span><span><strong>{link.child.firstName} {link.child.lastName}</strong><small>{link.child.personCode}</small></span></div></td><td>{link.child.branch.group.name} · {link.child.branch.name}</td><td>{link.child.schoolYear}°</td><td>{formatDate(link.child.birthDate)}</td><td>{link.child._count.assignments}</td><td><StatusPill status={link.approvalStatus === "APPROVED" ? link.child.approvalStatus : link.approvalStatus} /></td></tr>)}</tbody></table><div className="mobile-records">{links.map((link) => <article className="mobile-record" key={link.id}><div className="mobile-record__head"><div><strong>{link.child.firstName} {link.child.lastName}</strong><small>{link.child.personCode}</small></div><StatusPill status={link.approvalStatus === "APPROVED" ? link.child.approvalStatus : link.approvalStatus} /></div><div className="mobile-record__meta"><span>Branca<strong>{link.child.branch.group.name} · {link.child.branch.name}</strong></span><span>Anno<strong>{link.child.schoolYear}°</strong></span><span>Nascita<strong>{formatDate(link.child.birthDate)}</strong></span><span>Richieste<strong>{link.child._count.assignments}</strong></span></div></article>)}</div></> : <div className="empty-state"><UsersRound size={30} /><h3>Nessun figlio collegato</h3><p>Aggiungi il primo ragazzo e scegli la branca a cui chiedere l'accesso.</p><Link className="button button--primary button--small" href="/famiglia/figli/nuovo"><Plus size={16} /> Aggiungi figlio</Link></div>}</div></section>
    <div className="notice notice--info" style={{ marginTop: 16 }}><CalendarDays size={20} /><div><strong>Genitori separati o nuclei diversi</strong><p>Il secondo genitore puo registrarsi e usare lo stesso codice persona: la branca approvera il nuovo collegamento.</p></div></div>
  </div>;
}
