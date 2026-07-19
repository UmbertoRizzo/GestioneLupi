import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

type AuditInput = { actorId?: string | null; branchId?: string | null; action: string; entityType: string; entityId?: string | null; summary: string; metadata?: Prisma.InputJsonValue };

export async function writeAudit(input: AuditInput) {
  return prisma.auditLog.create({ data: input });
}
