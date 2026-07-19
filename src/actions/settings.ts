"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBranchManager, requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";
import { verifyDriveFolder } from "@/lib/google";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export async function updateBranchDetailsAction(formData: FormData) {
  const { user, branch } = await requireAdminBranch();
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    kind: z.enum(["LUPI", "REPARTO", "NOVIZIATO", "CLAN", "COMUNITA_CAPI", "ALTRO"]),
  }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/admin/impostazioni?errore=branca");
  const duplicate = await prisma.branch.findFirst({ where: { groupId: branch.groupId, name: parsed.data.name, id: { not: branch.id } }, select: { id: true } });
  if (duplicate) redirect("/admin/impostazioni?errore=nome-duplicato");
  const updated = await prisma.branch.update({ where: { id: branch.id }, data: parsed.data });
  await writeAudit({ actorId: user.id, branchId: branch.id, action: "BRANCH_DETAILS_UPDATED", entityType: "Branch", entityId: branch.id, summary: `Branca rinominata da ${branch.name} a ${updated.name}` });
  redirect("/admin/impostazioni?salvato=1");
}

export async function updateBranchThemeAction(formData: FormData) {
  const { user, branch } = await requireAdminBranch();
  const parsed = z.object({ primaryColor: hexColor, secondaryColor: hexColor, accentColor: hexColor, logoUrl: z.string().url().or(z.literal("")).optional(), maxUploadMb: z.coerce.number().int().min(1).max(250) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/admin/impostazioni?errore=tema");
  await prisma.branch.update({ where: { id: branch.id }, data: { primaryColor: parsed.data.primaryColor, secondaryColor: parsed.data.secondaryColor, accentColor: parsed.data.accentColor, logoUrl: parsed.data.logoUrl || null, maxUploadBytes: parsed.data.maxUploadMb * 1024 * 1024 } });
  await writeAudit({ actorId: user.id, branchId: branch.id, action: "BRANCH_SETTINGS_UPDATED", entityType: "Branch", entityId: branch.id, summary: `Tema e limiti di ${branch.name} aggiornati` });
  redirect("/admin/impostazioni?salvato=1");
}

export async function copyBranchThemeAction(formData: FormData) {
  const { user, branch } = await requireAdminBranch();
  const sourceId = String(formData.get("sourceBranchId") || "");
  const source = await prisma.branch.findFirst({ where: { id: sourceId, groupId: branch.groupId } });
  if (!source) redirect("/admin/impostazioni?errore=copia");
  await prisma.branch.update({ where: { id: branch.id }, data: { primaryColor: source.primaryColor, secondaryColor: source.secondaryColor, accentColor: source.accentColor, logoUrl: source.logoUrl } });
  await writeAudit({ actorId: user.id, branchId: branch.id, action: "BRANCH_THEME_COPIED", entityType: "Branch", entityId: branch.id, summary: `Tema copiato da ${source.name}` });
  redirect("/admin/impostazioni?salvato=1");
}

export async function updateDriveFolderAction(formData: FormData) {
  const { user, branch } = await requireAdminBranch();
  const raw = String(formData.get("driveFolder") || "").trim();
  const folderId = raw.match(/folders\/([a-zA-Z0-9_-]+)/)?.[1] || (/^[a-zA-Z0-9_-]{10,}$/.test(raw) ? raw : "");
  if (!folderId) redirect("/admin/impostazioni?google=cartella-non-valida");
  try {
    const folder = await verifyDriveFolder(branch.id, folderId);
    await prisma.googleConnection.update({ where: { branchId: branch.id }, data: { driveRootFolderId: folder.id, driveRootFolderName: folder.name, driveEnabled: true, status: "CONNECTED", lastCheckedAt: new Date(), lastError: null } });
    await writeAudit({ actorId: user.id, branchId: branch.id, action: "DRIVE_FOLDER_CHANGED", entityType: "GoogleConnection", entityId: branch.googleConnection?.id, summary: `Cartella Drive impostata su ${folder.name}`, metadata: { folderId } });
  } catch (error) {
    await prisma.googleConnection.update({ where: { branchId: branch.id }, data: { status: "ERROR", lastError: error instanceof Error ? error.message : "Cartella non accessibile" } }).catch(() => undefined);
    redirect("/admin/impostazioni?google=cartella-non-accessibile");
  }
  redirect("/admin/impostazioni?google=cartella-salvata");
}

export async function disconnectGoogleAction(branchId: string) {
  const user = await requireBranchManager(branchId);
  await prisma.googleConnection.upsert({ where: { branchId }, update: { status: "DISCONNECTED", encryptedAccessToken: null, encryptedRefreshToken: null, tokenExpiry: null, driveEnabled: false, gmailEnabled: false, lastError: null }, create: { branchId, scopes: [] } });
  await writeAudit({ actorId: user.id, branchId, action: "GOOGLE_DISCONNECTED", entityType: "GoogleConnection", summary: "Account Google scollegato" });
  revalidatePath("/admin/impostazioni");
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireRole("PARENT");
  const parsed = z.object({ firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(80), phone: z.string().trim().min(6).max(40) }).safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/famiglia/profilo?errore=dati");
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  await writeAudit({ actorId: user.id, action: "PARENT_PROFILE_UPDATED", entityType: "User", entityId: user.id, summary: "Contatti del profilo aggiornati" });
  redirect("/famiglia/profilo?salvato=1");
}
