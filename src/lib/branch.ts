import "server-only";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireAdminBranch() {
  const user = await requireRole("BRANCH_ADMIN", "SUPER_ADMIN");
  const branchId = user.branchAdmins[0]?.branchId;
  if (!branchId && user.role !== "SUPER_ADMIN") redirect("/accesso-negato");
  if (!branchId) redirect("/super/branche");
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { group: true, googleConnection: true },
  });
  if (!branch) redirect("/accesso-negato");
  return { user, branch };
}
