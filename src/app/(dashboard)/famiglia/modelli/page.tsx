import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatBytes } from "@/lib/utils";

export const metadata = { title: "Modelli da scaricare" };
export default async function FamilyTemplatesPage() {
  const user = await requireRole("PARENT");
  const branchIds = [...new Set(user.children.filter((link) => link.approvalStatus === "APPROVED" && link.child.approvalStatus === "APPROVED").map((link) => link.child.branchId))];
  const templates = await prisma.template.findMany({ where: { branchId: { in: branchIds } }, include: { branch: { include: { group: true } } }, orderBy: [{ branch: { name: "asc" } }, { title: "asc" }] });
  return <div className="page-container"><PageHeader eyebrow="Famiglia" title="Modelli da scaricare" description="Scarica il modulo vuoto, compilalo e ricaricalo nella richiesta corrispondente." /><section className="panel"><div className="list">{templates.map((template) => <div className="list-item" key={template.id}><span className="list-item__icon"><FileText size={18} /></span><span className="list-item__text"><strong>{template.title}</strong><small>{template.branch.group.name} · {template.branch.name} · {formatBytes(template.sizeBytes)}</small></span><a className="button button--secondary button--small" href={`/api/drive/files/${template.driveFileId}?download=1`}><Download size={16} /> Scarica</a></div>)}{!templates.length && <div className="empty-state"><FileText size={30} /><h3>Nessun modello disponibile</h3><p>Le branche non hanno ancora pubblicato moduli vuoti.</p></div>}</div></section></div>;
}
