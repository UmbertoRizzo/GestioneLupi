import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RequestBuilder } from "@/components/requests/request-builder";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";

export const metadata = { title: "Nuova richiesta" };
export default async function NewRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { branch } = await requireAdminBranch(); const params = await searchParams;
  const [children, activities, templates] = await Promise.all([
    prisma.child.findMany({ where: { branchId: branch.id, approvalStatus: "APPROVED" }, orderBy: [{ schoolYear: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, schoolYear: true } }),
    prisma.activity.findMany({ where: { branchId: branch.id, status: { in: ["OPEN", "DRAFT"] } }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
    prisma.template.findMany({ where: { branchId: branch.id }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  return <div className="page-container"><header className="page-header"><div className="page-header__text"><Link className="back-link" href="/admin/richieste"><ArrowLeft size={17} /> Torna alle richieste</Link><h1 style={{ marginTop: 14 }}>Nuova richiesta</h1><p>Combina file, testo e conferme in un'unica raccolta.</p></div></header>{params.errore && <div className="form-message form-message--error" style={{ marginBottom: 16 }}>Controlla i dati, gli elementi e i destinatari scelti.</div>}<RequestBuilder scouts={children.map((child) => ({ id: child.id, name: `${child.firstName} ${child.lastName}`, year: child.schoolYear }))} activities={activities} templates={templates} /></div>;
}
