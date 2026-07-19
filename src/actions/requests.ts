"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, RequestStatus } from "@/generated/prisma/client";
import { requireBranchManager } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";

const itemSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  type: z.enum(["FILE", "TEXT", "BOOLEAN"]),
  required: z.boolean().default(true),
  driveFileName: z.string().trim().max(120).optional(),
  maxFileSizeMb: z.coerce.number().min(1).max(250).optional(),
  allowedMimeTypes: z.array(z.string()).default([]),
  templateId: z.string().optional(),
});

const requestSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional(),
  dueDate: z.string().optional(),
  activityId: z.string().optional(),
  mode: z.enum(["SIMPLE", "COMPLETE"]),
  targetType: z.enum(["ALL", "YEARS", "CHILDREN"]),
  visibleToParents: z.boolean(),
  requiresApproval: z.boolean(),
  emailOnPublish: z.boolean(),
  reminderEnabled: z.boolean(),
  publishNow: z.boolean(),
  items: z.array(itemSchema).min(1),
});

function checked(formData: FormData, key: string) { return formData.get(key) === "on"; }

export async function createRequestAction(formData: FormData) {
  const { user, branch } = await requireAdminBranch();
  let rawItems: unknown;
  try { rawItems = JSON.parse(String(formData.get("itemsJson") || "[]")); } catch { redirect("/admin/richieste/nuova?errore=elementi"); }
  const parsed = requestSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    visibleToParents: checked(formData, "visibleToParents"),
    requiresApproval: checked(formData, "requiresApproval"),
    emailOnPublish: checked(formData, "emailOnPublish"),
    reminderEnabled: checked(formData, "reminderEnabled"),
    publishNow: checked(formData, "publishNow"),
    items: rawItems,
  });
  if (!parsed.success) redirect("/admin/richieste/nuova?errore=dati");
  const targetYears = formData.getAll("targetYears").map(Number).filter((year) => year >= 1 && year <= 5);
  const targetChildIds = formData.getAll("targetChildIds").map(String);
  if (parsed.data.targetType === "YEARS" && !targetYears.length) redirect("/admin/richieste/nuova?errore=destinatari");
  if (parsed.data.targetType === "CHILDREN" && !targetChildIds.length) redirect("/admin/richieste/nuova?errore=destinatari");
  const dueDate = parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T23:59:00`) : null;

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.documentRequest.create({
      data: {
        branchId: branch.id,
        activityId: parsed.data.activityId || null,
        createdById: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        dueDate,
        status: parsed.data.publishNow ? RequestStatus.PUBLISHED : RequestStatus.DRAFT,
        mode: parsed.data.mode,
        targetType: parsed.data.targetType,
        targetYears,
        visibleToParents: parsed.data.visibleToParents,
        requiresApproval: parsed.data.requiresApproval,
        emailOnPublish: parsed.data.emailOnPublish,
        reminderEnabled: parsed.data.reminderEnabled,
        publishedAt: parsed.data.publishNow ? new Date() : null,
        targetChildren: parsed.data.targetType === "CHILDREN" ? { create: targetChildIds.map((childId) => ({ childId })) } : undefined,
        items: { create: parsed.data.items.map((item, position) => ({
          position,
          title: item.title,
          description: item.description || null,
          type: item.type,
          required: item.required,
          driveFileName: item.type === "FILE" ? item.driveFileName || item.title : null,
          maxFileSize: item.maxFileSizeMb ? Math.round(item.maxFileSizeMb * 1024 * 1024) : null,
          allowedMimeTypes: item.type === "FILE" ? item.allowedMimeTypes : [],
          templateId: item.type === "FILE" && item.templateId ? item.templateId : null,
        })) },
      },
      include: { items: true },
    });
    if (parsed.data.publishNow) await createAssignments(tx, created.id, branch.id, parsed.data.targetType, targetYears, targetChildIds, created.items.map((item) => item.id));
    return created;
  });
  await writeAudit({ actorId: user.id, branchId: branch.id, action: parsed.data.publishNow ? "REQUEST_PUBLISHED" : "REQUEST_CREATED", entityType: "DocumentRequest", entityId: request.id, summary: `${request.title} ${parsed.data.publishNow ? "pubblicata" : "salvata in bozza"}` });
  redirect(`/admin/richieste/${request.id}?creata=1`);
}

type TransactionClient = Prisma.TransactionClient;

async function createAssignments(tx: TransactionClient, requestId: string, branchId: string, targetType: "ALL" | "YEARS" | "CHILDREN", targetYears: number[], targetChildIds: string[], itemIds: string[]) {
  const children = await tx.child.findMany({ where: { branchId, approvalStatus: "APPROVED", ...(targetType === "YEARS" ? { schoolYear: { in: targetYears } } : {}), ...(targetType === "CHILDREN" ? { id: { in: targetChildIds } } : {}) }, select: { id: true } });
  await tx.requestAssignment.createMany({ data: children.map((child) => ({ requestId, childId: child.id })), skipDuplicates: true });
  const assignments = await tx.requestAssignment.findMany({ where: { requestId }, select: { id: true } });
  await tx.submission.createMany({ data: assignments.flatMap((assignment) => itemIds.map((requestItemId) => ({ assignmentId: assignment.id, requestItemId }))), skipDuplicates: true });
}

export async function publishRequestAction(requestId: string) {
  const request = await prisma.documentRequest.findUnique({ where: { id: requestId }, include: { items: true, targetChildren: true } });
  if (!request) return;
  const user = await requireBranchManager(request.branchId);
  if (request.status !== "DRAFT") return;
  await prisma.$transaction(async (tx) => {
    await tx.documentRequest.update({ where: { id: request.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await createAssignments(tx, request.id, request.branchId, request.targetType, request.targetYears, request.targetChildren.map((item) => item.childId), request.items.map((item) => item.id));
  });
  await writeAudit({ actorId: user.id, branchId: request.branchId, action: "REQUEST_PUBLISHED", entityType: "DocumentRequest", entityId: request.id, summary: `${request.title} pubblicata` });
  revalidatePath(`/admin/richieste/${requestId}`);
  revalidatePath("/admin/richieste");
}

export async function archiveRequestAction(requestId: string) {
  const request = await prisma.documentRequest.findUnique({ where: { id: requestId } });
  if (!request) return;
  const user = await requireBranchManager(request.branchId);
  await prisma.documentRequest.update({ where: { id: requestId }, data: { status: "ARCHIVED", archivedAt: new Date() } });
  await writeAudit({ actorId: user.id, branchId: request.branchId, action: "REQUEST_ARCHIVED", entityType: "DocumentRequest", entityId: request.id, summary: `${request.title} archiviata` });
  revalidatePath("/admin/richieste");
  revalidatePath(`/admin/richieste/${requestId}`);
}

export async function duplicateRequestAction(requestId: string) {
  const source = await prisma.documentRequest.findUnique({ where: { id: requestId }, include: { items: true, targetChildren: true } });
  if (!source) return;
  const user = await requireBranchManager(source.branchId);
  const duplicate = await prisma.documentRequest.create({ data: {
    branchId: source.branchId, activityId: source.activityId, createdById: user.id, title: `${source.title} - copia`, description: source.description,
    dueDate: null, mode: source.mode, targetType: source.targetType, targetYears: source.targetYears, visibleToParents: source.visibleToParents,
    requiresApproval: source.requiresApproval, emailOnPublish: source.emailOnPublish, reminderEnabled: source.reminderEnabled,
    targetChildren: { create: source.targetChildren.map((target) => ({ childId: target.childId })) },
    items: { create: source.items.map((item) => ({ position: item.position, title: item.title, description: item.description, type: item.type, required: item.required, driveFileName: item.driveFileName, allowedMimeTypes: item.allowedMimeTypes, maxFileSize: item.maxFileSize, templateId: item.templateId })) },
  } });
  await writeAudit({ actorId: user.id, branchId: source.branchId, action: "REQUEST_DUPLICATED", entityType: "DocumentRequest", entityId: duplicate.id, summary: `${source.title} duplicata in bozza` });
  redirect(`/admin/richieste/${duplicate.id}?duplicata=1`);
}

export async function updateRequestAction(requestId: string, formData: FormData) {
  const request = await prisma.documentRequest.findUnique({ where: { id: requestId }, include: { items: true } });
  if (!request) redirect("/admin/richieste");
  const user = await requireBranchManager(request.branchId);
  const title = String(formData.get("title") || "").trim().slice(0, 160);
  if (title.length < 3) redirect(`/admin/richieste/${requestId}/modifica?errore=titolo`);
  const description = String(formData.get("description") || "").trim().slice(0, 4000);
  const dueDateValue = String(formData.get("dueDate") || "");
  const activityId = String(formData.get("activityId") || "");
  if (activityId && !(await prisma.activity.findFirst({ where: { id: activityId, branchId: request.branchId }, select: { id: true } }))) redirect(`/admin/richieste/${requestId}/modifica?errore=attivita`);
  await prisma.$transaction(async (tx) => {
    await tx.documentRequest.update({ where: { id: requestId }, data: {
      title,
      description: description || null,
      dueDate: dueDateValue ? new Date(`${dueDateValue}T23:59:00`) : null,
      activityId: activityId || null,
      visibleToParents: checked(formData, "visibleToParents"),
      requiresApproval: checked(formData, "requiresApproval"),
      emailOnPublish: checked(formData, "emailOnPublish"),
      reminderEnabled: checked(formData, "reminderEnabled"),
    } });
    for (const item of request.items) {
      const itemTitle = String(formData.get(`itemTitle-${item.id}`) || item.title).trim().slice(0, 160);
      const itemDescription = String(formData.get(`itemDescription-${item.id}`) || "").trim().slice(0, 1000);
      const driveFileName = String(formData.get(`driveFileName-${item.id}`) || "").trim().slice(0, 120);
      const maxMb = Number(formData.get(`maxFileSizeMb-${item.id}`) || 0);
      await tx.requestItem.update({ where: { id: item.id }, data: { title: itemTitle || item.title, description: itemDescription || null, required: checked(formData, `required-${item.id}`), driveFileName: item.type === "FILE" ? driveFileName || itemTitle || item.title : null, maxFileSize: item.type === "FILE" && maxMb > 0 ? Math.round(Math.min(maxMb, 250) * 1024 * 1024) : item.maxFileSize } });
    }
  });
  await writeAudit({ actorId: user.id, branchId: request.branchId, action: "REQUEST_UPDATED", entityType: "DocumentRequest", entityId: request.id, summary: `${title} modificata` });
  redirect(`/admin/richieste/${requestId}?modificata=1`);
}
