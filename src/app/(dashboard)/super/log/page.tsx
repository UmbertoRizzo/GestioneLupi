import { History } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Log globale" };
export default async function SuperLogPage() {
  await requireRole("SUPER_ADMIN");
  const logs = await prisma.auditLog.findMany({ include: { actor: true, branch: { include: { group: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
  return <div className="page-container"><PageHeader eyebrow="Super admin" title="Log globale" description="Le ultime 500 operazioni di tutti i gruppi." /><section className="panel"><div className="panel__body"><div className="timeline">{logs.map((log) => <div className="timeline-item" key={log.id}><span className="timeline-item__mark"><History size={15} /></span><div><p><strong>{log.summary}</strong></p><small>{formatDateTime(log.createdAt)} · {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "Sistema"} · {log.branch ? `${log.branch.group.name} / ${log.branch.name}` : "Globale"} · {log.action}</small></div></div>)}</div></div></section></div>;
}
