import { Building2, Mail, Phone, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";

export const metadata = { title: "Altre branche" };
export default async function GroupDirectoryPage() {
  const { branch } = await requireAdminBranch();
  const branches = await prisma.branch.findMany({ where: { groupId: branch.groupId, status: "ACTIVE" }, include: { children: { where: { approvalStatus: "APPROVED" }, include: { parents: { where: { approvalStatus: "APPROVED" }, include: { user: true } } }, orderBy: [{ schoolYear: "asc" }, { lastName: "asc" }] } }, orderBy: { name: "asc" } });
  return <div className="page-container"><PageHeader eyebrow={branch.group.name} title="Elenco del gruppo" description="Membri e contatti delle altre branche. Richieste e documenti restano privati." />
    <div className="dashboard-stack">{branches.map((item) => <section className="panel" key={item.id}><header className="panel__header"><div><h2>{item.name}</h2><p>{item.children.length} membri</p></div><StatusPill status={item.id === branch.id ? "ACTIVE" : "PUBLISHED"} label={item.id === branch.id ? "La tua branca" : "Solo contatti"} /></header><div className="panel__body--flush">{item.children.length ? <><table className="data-table"><thead><tr><th>Ragazzo</th><th>Anno</th><th>Genitori</th><th>Email</th><th>Telefono</th></tr></thead><tbody>{item.children.map((child) => <tr key={child.id}><td><strong>{child.firstName} {child.lastName}</strong></td><td>{child.schoolYear}°</td><td>{child.parents.map((p) => `${p.user.firstName} ${p.user.lastName}`).join(", ") || "-"}</td><td>{child.parents.map((p) => p.user.email).join(", ") || "-"}</td><td>{child.parents.map((p) => p.user.phone).filter(Boolean).join(", ") || "-"}</td></tr>)}</tbody></table><div className="mobile-records">{item.children.map((child) => <article className="mobile-record" key={child.id}><div className="mobile-record__head"><div><strong>{child.firstName} {child.lastName}</strong><small>{child.schoolYear}° anno</small></div></div><div className="mobile-record__meta"><span><Mail size={13} /> Email<strong>{child.parents.map((p) => p.user.email).join(", ") || "-"}</strong></span><span><Phone size={13} /> Telefono<strong>{child.parents.map((p) => p.user.phone).filter(Boolean).join(", ") || "-"}</strong></span></div></article>)}</div></> : <div className="empty-state"><UsersRound size={28} /><h3>Nessun membro</h3><p>Questa branca non ha ancora ragazzi approvati.</p></div>}</div></section>)}</div>
    {!branches.length && <div className="empty-state"><Building2 size={30} /><h3>Nessuna branca attiva</h3><p>Il gruppo non contiene ancora altre branche.</p></div>}
  </div>;
}
