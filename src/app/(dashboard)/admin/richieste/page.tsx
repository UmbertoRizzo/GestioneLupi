import Link from "next/link";
import { Archive, CalendarClock, ClipboardList, ClipboardPlus, Copy, Search } from "lucide-react";
import { duplicateRequestAction } from "@/actions/requests";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Richieste" };
export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { branch } = await requireAdminBranch(); const params = await searchParams;
  const status = typeof params.stato === "string" && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(params.stato) ? params.stato : undefined;
  const query = typeof params.q === "string" ? params.q : "";
  const requests = await prisma.documentRequest.findMany({ where: { branchId: branch.id, ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}), ...(query ? { title: { contains: query, mode: "insensitive" } } : {}) }, include: { activity: true, _count: { select: { assignments: true, items: true } }, assignments: { select: { status: true } } }, orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }] });
  return <div className="page-container"><PageHeader eyebrow={`${branch.group.name} / ${branch.name}`} title="Richieste" description="Bozze, raccolte aperte e archivio." actions={<Link className="button button--primary" href="/admin/richieste/nuova"><ClipboardPlus size={18} /> Nuova richiesta</Link>} />
    <form className="toolbar" method="get"><div className="toolbar__filters"><label className="search-box"><Search size={18} /><input className="search-input" name="q" defaultValue={query} placeholder="Cerca una richiesta" /></label><select className="filter-select" name="stato" defaultValue={status || ""}><option value="">Tutti gli stati</option><option value="DRAFT">Bozze</option><option value="PUBLISHED">Pubblicate</option><option value="ARCHIVED">Archiviate</option></select><button className="button button--secondary button--small" type="submit">Filtra</button></div></form>
    <section className="panel"><div className="panel__body--flush">{requests.length ? requests.map((request) => { const complete = request.assignments.filter((item) => ["APPROVED", "COMPLETED"].includes(item.status)).length; const percentage = request._count.assignments ? Math.round(complete/request._count.assignments*100) : 0; return <div className="request-card" key={request.id}><Link href={`/admin/richieste/${request.id}`} style={{ textDecoration: "none", minWidth: 0 }}><div className="request-card__head"><h3>{request.title}</h3><StatusPill status={request.status} /></div><p>{request.activity?.title || `${request._count.items} elementi richiesti`}</p><div className="request-card__meta"><span><CalendarClock size={14} /> {request.dueDate ? formatDate(request.dueDate) : "Nessuna scadenza"}</span><span>{request._count.assignments} destinatari</span></div></Link><div className="request-card__progress"><strong>{request.status === "DRAFT" ? "Non pubblicata" : `${complete}/${request._count.assignments}`}</strong>{request.status !== "DRAFT" && <div className="progress"><span style={{ width: `${percentage}%` }} /></div>}<form action={duplicateRequestAction.bind(null, request.id)} style={{ marginTop: 8 }}><button className="button button--quiet button--small" type="submit"><Copy size={15} /> Duplica</button></form></div></div>; }) : <div className="empty-state"><ClipboardList size={30} /><h3>Nessuna richiesta</h3><p>Crea una richiesta flessibile con file, conferme o risposte.</p><Link className="button button--primary button--small" href="/admin/richieste/nuova"><ClipboardPlus size={16} /> Crea richiesta</Link></div>}</div></section>
    <p style={{ marginTop: 14, color: "var(--muted)", fontSize: ".8rem" }}><Archive size={14} style={{ verticalAlign: "-2px" }} /> Le richieste archiviate mantengono stati e riferimenti ai file presenti su Drive.</p>
  </div>;
}
