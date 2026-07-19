"use server";

import { revalidatePath } from "next/cache";
import { requireBranchManager } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export async function sendRequestRemindersAction(requestId: string, formData: FormData) {
  const request = await prisma.documentRequest.findUnique({ where: { id: requestId }, include: { assignments: { where: { status: { in: ["MISSING", "NEEDS_CHANGES"] } }, include: { child: { include: { parents: { where: { approvalStatus: "APPROVED", emailNotifications: true }, include: { user: true } } } } } }, branch: true } });
  if (!request) return;
  const actor = await requireBranchManager(request.branchId);
  const subject = String(formData.get("subject") || `Promemoria: ${request.title}`).slice(0, 200);
  const message = String(formData.get("message") || "").slice(0, 10000);
  const recipients = new Map<string, string>();
  for (const assignment of request.assignments) for (const parent of assignment.child.parents) recipients.set(parent.user.email, assignment.child.firstName);
  let sent = 0; let failed = 0;
  for (const [email, childName] of recipients) {
    try { await sendEmail({ branchId: request.branchId, actorId: actor.id, to: email, subject, text: message.replaceAll("{ragazzo}", childName).replaceAll("{richiesta}", request.title), replyTo: request.branch.email }); sent += 1; } catch { failed += 1; }
  }
  await writeAudit({ actorId: actor.id, branchId: request.branchId, action: "REMINDERS_SENT", entityType: "DocumentRequest", entityId: request.id, summary: `Promemoria ${request.title}: ${sent} inviati, ${failed} falliti`, metadata: { sent, failed } });
  revalidatePath(`/admin/richieste/${requestId}`);
}
