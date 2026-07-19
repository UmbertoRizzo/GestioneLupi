"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";

export async function createActivityAction(formData: FormData) {
  const { user, branch } = await requireAdminBranch();
  const parsed = z.object({ title: z.string().trim().min(3).max(160), description: z.string().trim().max(2000).optional(), year: z.coerce.number().int().min(2000).max(2200).optional(), startsAt: z.string().optional(), endsAt: z.string().optional() }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/admin/attivita?errore=dati");
  const activity = await prisma.activity.create({ data: { branchId: branch.id, title: parsed.data.title, description: parsed.data.description || null, year: parsed.data.year || null, startsAt: parsed.data.startsAt ? new Date(`${parsed.data.startsAt}T12:00:00`) : null, endsAt: parsed.data.endsAt ? new Date(`${parsed.data.endsAt}T12:00:00`) : null, status: "OPEN" } });
  await writeAudit({ actorId: user.id, branchId: branch.id, action: "ACTIVITY_CREATED", entityType: "Activity", entityId: activity.id, summary: `${activity.title} creata` });
  redirect("/admin/attivita?creata=1");
}
