"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBranchManager, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { DEFAULT_ALLOWED_MIME_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { appendExtension } from "@/lib/utils";
import {
  deleteDriveFile,
  renameDriveFile,
  uploadFileToChild,
} from "@/lib/google";

async function requireAssignmentAccess(assignmentId: string) {
  const user = await requireUser();
  const assignment = await prisma.requestAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      child: { include: { parents: true, branch: true } },
      request: { include: { items: true } },
    },
  });
  if (!assignment) throw new Error("Richiesta non trovata");
  const parentAccess =
    assignment.child.parents.some(
      (parent) =>
        parent.userId === user.id && parent.approvalStatus === "APPROVED",
    ) && assignment.child.approvalStatus === "APPROVED";
  const adminAccess =
    user.role === "SUPER_ADMIN" ||
    user.branchAdmins.some(
      (membership) => membership.branchId === assignment.child.branchId,
    );
  if (!parentAccess && !adminAccess) throw new Error("Accesso non consentito");
  return { user, assignment };
}

export async function saveAnswerAction(
  assignmentId: string,
  itemId: string,
  formData: FormData,
) {
  const { user, assignment } = await requireAssignmentAccess(assignmentId);
  const item = assignment.request.items.find((entry) => entry.id === itemId);
  if (!item || item.type === "FILE") return;
  const textValue =
    item.type === "TEXT"
      ? String(formData.get("value") || "").slice(0, 10000)
      : null;
  const booleanValue =
    item.type === "BOOLEAN" ? formData.get("value") === "true" : null;
  const status = assignment.request.requiresApproval ? "PENDING" : "APPROVED";
  await prisma.submission.upsert({
    where: {
      assignmentId_requestItemId: { assignmentId, requestItemId: itemId },
    },
    update: {
      textValue,
      booleanValue,
      status,
      uploadedById: user.id,
      submittedAt: new Date(),
      rejectionReason: null,
    },
    create: {
      assignmentId,
      requestItemId: itemId,
      textValue,
      booleanValue,
      status,
      uploadedById: user.id,
      submittedAt: new Date(),
    },
  });
  await updateAssignmentStatus(assignmentId);
  await writeAudit({
    actorId: user.id,
    branchId: assignment.child.branchId,
    action: "ANSWER_SUBMITTED",
    entityType: "Submission",
    entityId: itemId,
    summary: `${item.title} compilata per ${assignment.child.firstName} ${assignment.child.lastName}`,
  });
  revalidatePath(`/famiglia/richieste/${assignmentId}`);
  revalidatePath(`/admin/richieste/${assignment.requestId}`);
}

export async function uploadSubmissionAction(
  assignmentId: string,
  itemId: string,
  formData: FormData,
) {
  const { user, assignment } = await requireAssignmentAccess(assignmentId);
  const item = assignment.request.items.find((entry) => entry.id === itemId);
  const file = formData.get("file");
  if (
    !item ||
    item.type !== "FILE" ||
    !(file instanceof File) ||
    file.size === 0
  )
    redirect(`/famiglia/richieste/${assignmentId}?errore=file`);
  const maxSize = item.maxFileSize || assignment.child.branch.maxUploadBytes;
  const allowedTypes = item.allowedMimeTypes.length
    ? item.allowedMimeTypes
    : DEFAULT_ALLOWED_MIME_TYPES;
  if (file.size > maxSize)
    redirect(`/famiglia/richieste/${assignmentId}?errore=dimensione`);
  if (file.type && !allowedTypes.includes(file.type))
    redirect(`/famiglia/richieste/${assignmentId}?errore=formato`);
  const baseName = item.driveFileName || item.title;
  const finalName = appendExtension(baseName, file.name);
  try {
    const uploaded = await uploadFileToChild(
      assignment.childId,
      file,
      finalName,
    );
    const current = await prisma.submission.findUnique({
      where: {
        assignmentId_requestItemId: { assignmentId, requestItemId: itemId },
      },
    });
    const replacement =
      current?.status === "APPROVED" && Boolean(current.currentDriveFileId);
    await prisma.submission.upsert({
      where: {
        assignmentId_requestItemId: { assignmentId, requestItemId: itemId },
      },
      update: replacement
        ? {
            pendingDriveFileId: uploaded.id,
            pendingDriveFileName: uploaded.name,
            pendingMimeType: uploaded.mimeType,
            pendingSizeBytes: uploaded.size,
            status: "PENDING",
            uploadedById: user.id,
            submittedAt: new Date(),
            rejectionReason: null,
          }
        : {
            currentDriveFileId: uploaded.id,
            currentDriveFileName: uploaded.name,
            currentMimeType: uploaded.mimeType,
            currentSizeBytes: uploaded.size,
            status: assignment.request.requiresApproval
              ? "PENDING"
              : "APPROVED",
            uploadedById: user.id,
            submittedAt: new Date(),
            version: { increment: 1 },
            rejectionReason: null,
          },
      create: {
        assignmentId,
        requestItemId: itemId,
        currentDriveFileId: uploaded.id,
        currentDriveFileName: uploaded.name,
        currentMimeType: uploaded.mimeType,
        currentSizeBytes: uploaded.size,
        status: assignment.request.requiresApproval ? "PENDING" : "APPROVED",
        uploadedById: user.id,
        submittedAt: new Date(),
        version: 1,
      },
    });
    if (current?.currentDriveFileId && !replacement)
      await deleteDriveFile(
        assignment.child.branchId,
        current.currentDriveFileId,
      ).catch(() => undefined);
    await updateAssignmentStatus(assignmentId);
    await writeAudit({
      actorId: user.id,
      branchId: assignment.child.branchId,
      action: replacement ? "FILE_REPLACEMENT_REQUESTED" : "FILE_UPLOADED",
      entityType: "Submission",
      entityId: itemId,
      summary: `${finalName} caricato per ${assignment.child.firstName} ${assignment.child.lastName}`,
      metadata: { driveFileId: uploaded.id, size: uploaded.size },
    });
    revalidatePath(`/famiglia/richieste/${assignmentId}`);
    revalidatePath(`/admin/richieste/${assignment.requestId}`);
  } catch (error) {
    await writeAudit({
      actorId: user.id,
      branchId: assignment.child.branchId,
      action: "DRIVE_UPLOAD_FAILED",
      entityType: "Submission",
      entityId: itemId,
      summary: `Caricamento fallito per ${assignment.child.firstName} ${assignment.child.lastName}`,
      metadata: {
        error: error instanceof Error ? error.message : "Errore sconosciuto",
      },
    });
    redirect(`/famiglia/richieste/${assignmentId}?errore=drive`);
  }
}

export async function reviewSubmissionAction(
  submissionId: string,
  decision: "APPROVED" | "NEEDS_CHANGES",
  formData: FormData,
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { child: true, request: true } },
      requestItem: true,
    },
  });
  if (!submission) return;
  const user = await requireBranchManager(submission.assignment.child.branchId);
  const reason =
    decision === "NEEDS_CHANGES"
      ? String(
          formData.get("reason") ||
            "Controlla il documento e caricalo di nuovo",
        ).slice(0, 1000)
      : null;
  if (decision === "APPROVED" && submission.pendingDriveFileId) {
    await deleteDriveFile(
      submission.assignment.child.branchId,
      submission.currentDriveFileId,
    ).catch(() => undefined);
    await renameDriveFile(
      submission.assignment.child.branchId,
      submission.pendingDriveFileId,
      submission.requestItem.driveFileName ||
        submission.pendingDriveFileName ||
        submission.requestItem.title,
    ).catch(() => undefined);
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: "APPROVED",
        currentDriveFileId: submission.pendingDriveFileId,
        currentDriveFileName: submission.pendingDriveFileName,
        currentMimeType: submission.pendingMimeType,
        currentSizeBytes: submission.pendingSizeBytes,
        pendingDriveFileId: null,
        pendingDriveFileName: null,
        pendingMimeType: null,
        pendingSizeBytes: null,
        approvedAt: new Date(),
        rejectionReason: null,
        version: { increment: 1 },
      },
    });
  } else {
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: decision,
        approvedAt: decision === "APPROVED" ? new Date() : null,
        rejectionReason: reason,
      },
    });
  }
  await updateAssignmentStatus(submission.assignmentId);
  await writeAudit({
    actorId: user.id,
    branchId: submission.assignment.child.branchId,
    action:
      decision === "APPROVED"
        ? "SUBMISSION_APPROVED"
        : "SUBMISSION_CHANGES_REQUESTED",
    entityType: "Submission",
    entityId: submission.id,
    summary: `${submission.requestItem.title}: ${decision === "APPROVED" ? "approvata" : "da correggere"} per ${submission.assignment.child.firstName} ${submission.assignment.child.lastName}`,
    metadata: reason ? { reason } : undefined,
  });
  revalidatePath(`/admin/richieste/${submission.assignment.requestId}`);
}

export async function deleteSubmissionFileAction(submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { child: true } }, requestItem: true },
  });
  if (!submission) return;
  const user = await requireBranchManager(submission.assignment.child.branchId);
  await Promise.all([
    deleteDriveFile(
      submission.assignment.child.branchId,
      submission.currentDriveFileId,
    ).catch(() => undefined),
    deleteDriveFile(
      submission.assignment.child.branchId,
      submission.pendingDriveFileId,
    ).catch(() => undefined),
  ]);
  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: "MISSING",
      currentDriveFileId: null,
      currentDriveFileName: null,
      currentMimeType: null,
      currentSizeBytes: null,
      pendingDriveFileId: null,
      pendingDriveFileName: null,
      pendingMimeType: null,
      pendingSizeBytes: null,
      submittedAt: null,
      approvedAt: null,
      rejectionReason: null,
    },
  });
  await updateAssignmentStatus(submission.assignmentId);
  await writeAudit({
    actorId: user.id,
    branchId: submission.assignment.child.branchId,
    action: "SUBMISSION_FILE_DELETED",
    entityType: "Submission",
    entityId: submission.id,
    summary: `${submission.requestItem.title} eliminato per ${submission.assignment.child.firstName} ${submission.assignment.child.lastName}`,
  });
  revalidatePath(`/admin/richieste/${submission.assignment.requestId}`);
}

export async function deleteRequestItemFilesAction(
  itemId: string,
  formData: FormData,
) {
  const item = await prisma.requestItem.findUnique({
    where: { id: itemId },
    include: {
      request: true,
      submissions: { include: { assignment: { include: { child: true } } } },
    },
  });
  if (!item || item.type !== "FILE") return;
  const user = await requireBranchManager(item.request.branchId);
  if (
    String(formData.get("confirmation") || "")
      .trim()
      .toUpperCase() !== "ELIMINA"
  )
    return;
  for (const submission of item.submissions) {
    await deleteDriveFile(
      item.request.branchId,
      submission.currentDriveFileId,
    ).catch(() => undefined);
    await deleteDriveFile(
      item.request.branchId,
      submission.pendingDriveFileId,
    ).catch(() => undefined);
  }
  await prisma.submission.updateMany({
    where: { requestItemId: item.id },
    data: {
      status: "MISSING",
      currentDriveFileId: null,
      currentDriveFileName: null,
      currentMimeType: null,
      currentSizeBytes: null,
      pendingDriveFileId: null,
      pendingDriveFileName: null,
      pendingMimeType: null,
      pendingSizeBytes: null,
      submittedAt: null,
      approvedAt: null,
      rejectionReason: null,
    },
  });
  for (const submission of item.submissions)
    await updateAssignmentStatus(submission.assignmentId);
  await writeAudit({
    actorId: user.id,
    branchId: item.request.branchId,
    action: "REQUEST_ITEM_FILES_DELETED",
    entityType: "RequestItem",
    entityId: item.id,
    summary: `Eliminati ${item.submissions.length} file per ${item.title}`,
    metadata: { count: item.submissions.length },
  });
  revalidatePath(`/admin/richieste/${item.requestId}`);
}

export async function updateAssignmentStatus(assignmentId: string) {
  const assignment = await prisma.requestAssignment.findUnique({
    where: { id: assignmentId },
    include: { request: { include: { items: true } }, submissions: true },
  });
  if (!assignment) return;
  if (
    assignment.status === "COMPLETED" &&
    assignment.adminNotes === "Completata manualmente da un capo"
  )
    return;
  const requiredIds = assignment.request.items
    .filter((item) => item.required)
    .map((item) => item.id);
  const required = requiredIds.map((id) =>
    assignment.submissions.find(
      (submission) => submission.requestItemId === id,
    ),
  );
  let status:
    "MISSING" | "UPLOADED" | "NEEDS_CHANGES" | "APPROVED" | "COMPLETED" =
    "MISSING";
  if (required.some((submission) => submission?.status === "NEEDS_CHANGES"))
    status = "NEEDS_CHANGES";
  else if (
    required.length &&
    required.every((submission) => submission?.status === "APPROVED")
  )
    status = assignment.request.requiresApproval ? "APPROVED" : "COMPLETED";
  else if (
    required.some((submission) => submission && submission.status !== "MISSING")
  )
    status = "UPLOADED";
  await prisma.requestAssignment.update({
    where: { id: assignmentId },
    data: {
      status,
      completedAt: ["APPROVED", "COMPLETED"].includes(status)
        ? new Date()
        : null,
    },
  });
}
