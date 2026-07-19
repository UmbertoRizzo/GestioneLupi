import { History } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Cronologia branca" };
export default async function AdminLogPage() {
  const { branch } = await requireAdminBranch();
  const logs = await prisma.auditLog.findMany({ where: { branchId: branch.id }, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 250 });
  return <div className="page-container"><PageHeader eyebrow={`${branch.group.name} / ${branch.name}`} title="Cronologia" description="Registro delle operazioni rilevanti della branca." /><section className="panel"><div className="panel__body"><div className="timeline">{logs.map((log) => <div className="timeline-item" key={log.id}><span className="timeline-item__mark"><History size={15} /></span><div><p><strong>{log.summary}</strong></p><small>{formatDateTime(log.createdAt)} · {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "Sistema"} · {log.action}</small></div></div>)}</div>{!logs.length && <div className="empty-state"><History size={28} /><h3>Nessuna operazione</h3><p>Le attivita della branca compariranno qui.</p></div>}</div></section></div>;
}
