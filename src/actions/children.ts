"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApprovalStatus } from "@/generated/prisma/client";
import { requireBranchManager, requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { normalizePersonCode } from "@/lib/utils";

const childSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  personCode: z.string().trim().min(3).max(60),
  birthDate: z.coerce.date(),
  gender: z.string().trim().min(1).max(40),
  schoolYear: z.coerce.number().int().min(1).max(5),
  branchId: z.string().min(1),
});

export async function createChildAction(formData: FormData) {
  const user = await requireRole("PARENT");
  const parsed = childSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/famiglia/figli/nuovo?errore=dati");
  const personCode = normalizePersonCode(parsed.data.personCode);
  const branch = await prisma.branch.findFirst({ where: { id: parsed.data.branchId, status: "ACTIVE" } });
  if (!branch) redirect("/famiglia/figli/nuovo?errore=branca");

  const existing = await prisma.child.findUnique({ where: { personCode }, include: { parents: true } });
  if (existing) {
    if (existing.parents.some((parent) => parent.userId === user.id)) redirect("/famiglia/figli?giaPresente=1");
    await prisma.childParent.create({ data: { childId: existing.id, userId: user.id } });
    await writeAudit({ actorId: user.id, branchId: existing.branchId, action: "PARENT_LINK_REQUESTED", entityType: "Child", entityId: existing.id, summary: `Richiesto collegamento al profilo di ${existing.firstName} ${existing.lastName}` });
    redirect("/famiglia/figli?collegamento=attesa");
  }

  const child = await prisma.child.create({
    data: {
      ...parsed.data,
      personCode,
      createdById: user.id,
      parents: { create: { userId: user.id, isPrimary: true } },
    },
  });
  await writeAudit({ actorId: user.id, branchId: child.branchId, action: "CHILD_REGISTRATION_REQUESTED", entityType: "Child", entityId: child.id, summary: `Richiesta iscrizione di ${child.firstName} ${child.lastName}` });
  redirect("/famiglia/figli?aggiunto=1");
}

export async function approveChildAction(childId: string) {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return;
  const user = await requireBranchManager(child.branchId);
  await prisma.$transaction([
    prisma.child.update({ where: { id: childId }, data: { approvalStatus: ApprovalStatus.APPROVED, approvedAt: new Date(), rejectionReason: null } }),
    prisma.childParent.updateMany({ where: { childId }, data: { approvalStatus: ApprovalStatus.APPROVED } }),
  ]);
  await writeAudit({ actorId: user.id, branchId: child.branchId, action: "CHILD_APPROVED", entityType: "Child", entityId: child.id, summary: `${child.firstName} ${child.lastName} approvato nella branca` });
  revalidatePath("/admin");
  revalidatePath("/admin/ragazzi");
}

export async function rejectChildAction(childId: string, formData: FormData) {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return;
  const user = await requireBranchManager(child.branchId);
  const reason = String(formData.get("reason") || "Dati da verificare").slice(0, 500);
  await prisma.child.update({ where: { id: childId }, data: { approvalStatus: ApprovalStatus.REJECTED, rejectionReason: reason } });
  await writeAudit({ actorId: user.id, branchId: child.branchId, action: "CHILD_REJECTED", entityType: "Child", entityId: child.id, summary: `${child.firstName} ${child.lastName} non approvato`, metadata: { reason } });
  revalidatePath("/admin/ragazzi");
}

export async function updateChildAction(childId: string, formData: FormData) {
  const current = await prisma.child.findUnique({ where: { id: childId } });
  if (!current) redirect("/admin/ragazzi");
  const user = await requireBranchManager(current.branchId);
  const parsed = childSchema.extend({ notes: z.string().max(4000).optional() }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect(`/admin/ragazzi/${childId}?errore=dati`);
  if (parsed.data.branchId !== current.branchId && user.role !== "SUPER_ADMIN") {
    const [source, target] = await Promise.all([
      prisma.branch.findUnique({ where: { id: current.branchId }, select: { groupId: true } }),
      prisma.branch.findUnique({ where: { id: parsed.data.branchId }, select: { groupId: true, status: true } }),
    ]);
    if (!source || !target || source.groupId !== target.groupId || target.status !== "ACTIVE") redirect(`/admin/ragazzi/${childId}?errore=spostamento`);
  }
  const updated = await prisma.child.update({ where: { id: childId }, data: { ...parsed.data, personCode: normalizePersonCode(parsed.data.personCode), notes: parsed.data.notes || null } });
  await writeAudit({ actorId: user.id, branchId: updated.branchId, action: current.branchId === updated.branchId ? "CHILD_UPDATED" : "CHILD_MOVED", entityType: "Child", entityId: updated.id, summary: `Aggiornati i dati di ${updated.firstName} ${updated.lastName}`, metadata: { previousBranchId: current.branchId, previousYear: current.schoolYear } });
  redirect(`/admin/ragazzi/${childId}?salvato=1`);
}

export async function approveParentLinkAction(linkId: string) {
  const link = await prisma.childParent.findUnique({ where: { id: linkId }, include: { child: true, user: true } });
  if (!link) return;
  const actor = await requireBranchManager(link.child.branchId);
  await prisma.childParent.update({ where: { id: linkId }, data: { approvalStatus: ApprovalStatus.APPROVED } });
  await writeAudit({ actorId: actor.id, branchId: link.child.branchId, action: "PARENT_LINK_APPROVED", entityType: "ChildParent", entityId: link.id, summary: `${link.user.firstName} ${link.user.lastName} collegato a ${link.child.firstName} ${link.child.lastName}` });
  revalidatePath(`/admin/ragazzi/${link.childId}`);
}

export async function promoteBranchYearsAction(branchId: string) {
  const user = await requireBranchManager(branchId);
  const result = await prisma.child.updateMany({ where: { branchId, approvalStatus: ApprovalStatus.APPROVED, schoolYear: { lt: 5 } }, data: { schoolYear: { increment: 1 } } });
  await writeAudit({ actorId: user.id, branchId, action: "BRANCH_YEARS_PROMOTED", entityType: "Branch", entityId: branchId, summary: `Avanzato l'anno di ${result.count} ragazzi` });
  revalidatePath("/admin/ragazzi");
}
