"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";
import { appendExtension } from "@/lib/utils";
import { deleteDriveFile, uploadFileToBranchFolder } from "@/lib/google";

export async function uploadTemplateAction(formData: FormData) {
  const { user, branch } = await requireAdminBranch();
  const title = String(formData.get("title") || "").trim().slice(0, 160);
  const description = String(formData.get("description") || "").trim().slice(0, 1000);
  const file = formData.get("file");
  if (title.length < 2 || !(file instanceof File) || !file.size) redirect("/admin/modelli?errore=dati");
  if (file.size > branch.maxUploadBytes) redirect("/admin/modelli?errore=dimensione");
  let templateId: string;
  try {
    const uploaded = await uploadFileToBranchFolder(branch.id, "Modelli", file, appendExtension(title, file.name));
    const template = await prisma.template.create({ data: { branchId: branch.id, title, description: description || null, driveFileId: uploaded.id, fileName: uploaded.name, mimeType: uploaded.mimeType, sizeBytes: uploaded.size } });
    templateId = template.id;
    await writeAudit({ actorId: user.id, branchId: branch.id, action: "TEMPLATE_UPLOADED", entityType: "Template", entityId: template.id, summary: `Modello ${title} caricato`, metadata: { driveFileId: uploaded.id } });
  } catch (error) {
    await writeAudit({ actorId: user.id, branchId: branch.id, action: "TEMPLATE_UPLOAD_FAILED", entityType: "Template", summary: `Caricamento modello ${title} fallito`, metadata: { error: error instanceof Error ? error.message : "Errore" } });
    redirect("/admin/modelli?errore=drive");
  }
  redirect(`/admin/modelli?caricato=${templateId}`);
}

export async function deleteTemplateAction(templateId: string) {
  const { user, branch } = await requireAdminBranch();
  const template = await prisma.template.findFirst({ where: { id: templateId, branchId: branch.id } });
  if (!template) return;
  await deleteDriveFile(branch.id, template.driveFileId).catch(() => undefined);
  await prisma.template.delete({ where: { id: template.id } });
  await writeAudit({ actorId: user.id, branchId: branch.id, action: "TEMPLATE_DELETED", entityType: "Template", entityId: template.id, summary: `Modello ${template.title} eliminato` });
  revalidatePath("/admin/modelli");
}
