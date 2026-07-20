"use server";

import { revalidatePath } from "next/cache";
import { AccountStatus, BranchStatus } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function approveBranchAction(branchId: string) {
  const actor = await requireRole("SUPER_ADMIN");
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, include: { admins: true, group: true } });
  if (!branch) return;
  await prisma.$transaction([
    prisma.branch.update({ where: { id: branchId }, data: { status: BranchStatus.ACTIVE } }),
    prisma.user.updateMany({ where: { id: { in: branch.admins.map((item) => item.userId) } }, data: { status: AccountStatus.ACTIVE } }),
  ]);
  await writeAudit({ actorId: actor.id, branchId, action: "BRANCH_APPROVED", entityType: "Branch", entityId: branchId, summary: `${branch.group.name} - ${branch.name} approvata` });
  revalidatePath("/super");
  revalidatePath("/super/branche");
}

export async function suspendBranchAction(branchId: string) {
  const actor = await requireRole("SUPER_ADMIN");
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, include: { admins: true, group: true } });
  if (!branch) return;
  await prisma.$transaction([
    prisma.branch.update({ where: { id: branchId }, data: { status: BranchStatus.SUSPENDED } }),
    prisma.user.updateMany({ where: { id: { in: branch.admins.map((item) => item.userId) } }, data: { status: AccountStatus.SUSPENDED } }),
  ]);
  await writeAudit({ actorId: actor.id, branchId, action: "BRANCH_SUSPENDED", entityType: "Branch", entityId: branchId, summary: `${branch.group.name} - ${branch.name} sospesa` });
  revalidatePath("/super");
  revalidatePath("/super/branche");
  revalidatePath("/super/utenti");
}

export async function reactivateBranchAction(branchId: string) {
  const actor = await requireRole("SUPER_ADMIN");
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, include: { admins: true, group: true } });
  if (!branch) return;
  await prisma.$transaction([
    prisma.branch.update({ where: { id: branchId }, data: { status: BranchStatus.ACTIVE } }),
    prisma.user.updateMany({ where: { id: { in: branch.admins.map((item) => item.userId) } }, data: { status: AccountStatus.ACTIVE } }),
  ]);
  await writeAudit({ actorId: actor.id, branchId, action: "BRANCH_REACTIVATED", entityType: "Branch", entityId: branchId, summary: `${branch.group.name} - ${branch.name} riattivata` });
  revalidatePath("/super");
  revalidatePath("/super/branche");
  revalidatePath("/super/utenti");
}

export async function suspendUserAction(userId: string) {
  const actor = await requireRole("SUPER_ADMIN");
  if (actor.id === userId) return;
  const user = await prisma.user.update({ where: { id: userId }, data: { status: AccountStatus.SUSPENDED } });
  await writeAudit({ actorId: actor.id, action: "USER_SUSPENDED", entityType: "User", entityId: userId, summary: `Account ${user.email} sospeso` });
  revalidatePath("/super/utenti");
}

export async function reactivateUserAction(userId: string) {
  const actor = await requireRole("SUPER_ADMIN");
  const user = await prisma.user.update({ where: { id: userId }, data: { status: AccountStatus.ACTIVE } });
  await writeAudit({ actorId: actor.id, action: "USER_REACTIVATED", entityType: "User", entityId: userId, summary: `Account ${user.email} riattivato` });
  revalidatePath("/super/utenti");
}
