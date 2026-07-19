"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AccountStatus, BranchStatus, UserRole } from "@/generated/prisma/client";
import { createSession, deleteSession, getCurrentUser, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { PRIVACY_POLICY_VERSION } from "@/lib/constants";
import { branchRegistrationSchema, loginSchema, parentRegistrationSchema } from "@/lib/validation";
import { normalizeEmail, roleHome, slugify } from "@/lib/utils";
import { hashToken, randomToken } from "@/lib/crypto";
import { sendEmail } from "@/lib/mail";

export type ActionState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string[]> };
function values(formData: FormData) { return Object.fromEntries(formData.entries()); }

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(values(formData));
  if (!parsed.success) return { message: "Controlla i dati inseriti", fieldErrors: parsed.error.flatten().fieldErrors };
  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordValid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !passwordValid) return { message: "Email o password non corrette" };
  if (user.status === AccountStatus.PENDING) return { message: "Il tuo account e in attesa di approvazione" };
  if (user.status === AccountStatus.SUSPENDED) return { message: "Questo account e sospeso. Contatta l'amministratore." };
  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({ actorId: user.id, action: "USER_LOGIN", entityType: "User", entityId: user.id, summary: `${user.firstName} ${user.lastName} ha effettuato l'accesso` });
  redirect(roleHome(user.role));
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await writeAudit({ actorId: user.id, action: "USER_LOGOUT", entityType: "User", entityId: user.id, summary: `${user.firstName} ${user.lastName} ha terminato la sessione` });
  await deleteSession();
  redirect("/login");
}

export async function registerParentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parentRegistrationSchema.safeParse(values(formData));
  if (!parsed.success) return { message: "Controlla i campi evidenziati", fieldErrors: parsed.error.flatten().fieldErrors };
  const email = normalizeEmail(parsed.data.email);
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return { message: "Esiste gia un account con questa email" };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, passwordHash, firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone, role: UserRole.PARENT, status: AccountStatus.ACTIVE, privacyAcceptedAt: new Date() } });
    await tx.family.create({ data: { displayName: `${parsed.data.firstName} ${parsed.data.lastName}`, kind: parsed.data.familyKind, members: { create: { userId: created.id } } } });
    await tx.consentLog.createMany({ data: [
      { userId: created.id, policyVersion: PRIVACY_POLICY_VERSION, consentType: "PRIVACY_POLICY", accepted: true },
      { userId: created.id, policyVersion: PRIVACY_POLICY_VERSION, consentType: "MINOR_DATA_PROCESSING", accepted: true },
    ] });
    return created;
  });
  await writeAudit({ actorId: user.id, action: "PARENT_REGISTERED", entityType: "User", entityId: user.id, summary: `Nuovo account genitore: ${user.firstName} ${user.lastName}` });
  await createSession(user.id);
  redirect("/famiglia/figli/nuovo?benvenuto=1");
}

export async function registerBranchAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = branchRegistrationSchema.safeParse(values(formData));
  if (!parsed.success) return { message: "Controlla i campi evidenziati", fieldErrors: parsed.error.flatten().fieldErrors };
  const email = normalizeEmail(parsed.data.email);
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return { message: "Esiste gia un account con questa email" };
  const baseSlug = slugify(`${parsed.data.groupName}-${parsed.data.branchName}`);
  const existingSlug = await prisma.branch.findUnique({ where: { slug: baseSlug }, select: { id: true } });
  const slug = existingSlug ? `${baseSlug}-${Math.random().toString(36).slice(2, 7)}` : baseSlug;
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const group = await tx.scoutGroup.upsert({ where: { name: parsed.data.groupName }, update: {}, create: { name: parsed.data.groupName } });
    const user = await tx.user.create({ data: { email, passwordHash, firstName: parsed.data.firstName, lastName: parsed.data.lastName, role: UserRole.BRANCH_ADMIN, status: AccountStatus.PENDING, privacyAcceptedAt: new Date() } });
    const branch = await tx.branch.create({ data: {
      groupId: group.id, name: parsed.data.branchName, slug, kind: parsed.data.branchKind, email, status: BranchStatus.PENDING,
      admins: { create: { userId: user.id } },
      googleConnection: { create: { scopes: [], driveRootFolderId: extractDriveFolderId(parsed.data.driveFolderUrl) } },
    } });
    await tx.consentLog.create({ data: { userId: user.id, policyVersion: PRIVACY_POLICY_VERSION, consentType: "PRIVACY_POLICY", accepted: true } });
    return { user, branch };
  });
  await writeAudit({ actorId: result.user.id, branchId: result.branch.id, action: "BRANCH_REGISTRATION_REQUESTED", entityType: "Branch", entityId: result.branch.id, summary: `Richiesta nuova branca ${parsed.data.groupName} - ${parsed.data.branchName}` });
  redirect("/registrazione/branca/completata");
}

function extractDriveFolderId(url?: string) {
  if (!url) return null;
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match?.[1]) return match[1];
  return /^[a-zA-Z0-9_-]{10,}$/.test(url) ? url : null;
}

export async function requestPasswordResetAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.pick({ email: true }).safeParse(values(formData));
  const genericMessage = "Se l'indirizzo e registrato, riceverai a breve un collegamento per cambiare password.";
  if (!parsed.success) return { message: genericMessage, ok: true };
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(parsed.data.email) }, include: { branchAdmins: true } });
  if (!user) return { message: genericMessage, ok: true };
  const rawToken = randomToken();
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/password-reset?token=${encodeURIComponent(rawToken)}`;
  await sendEmail({
    branchId: user.branchAdmins[0]?.branchId,
    to: user.email,
    subject: "Reimposta la password di GestioneLupi",
    text: `Ciao ${user.firstName},\n\nusa questo collegamento entro 30 minuti per scegliere una nuova password:\n${resetUrl}\n\nSe non hai richiesto tu il cambio, ignora questo messaggio.`,
  }).catch(() => undefined);
  await writeAudit({ actorId: user.id, branchId: user.branchAdmins[0]?.branchId, action: "PASSWORD_RESET_REQUESTED", entityType: "User", entityId: user.id, summary: "Richiesto recupero password" });
  return { message: genericMessage, ok: true };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmPassword") || "");
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return { message: "Usa almeno 10 caratteri, con lettere e numeri" };
  if (password !== confirmation) return { message: "Le password non coincidono" };
  const saved = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!saved || saved.usedAt || saved.expiresAt < new Date()) return { message: "Il collegamento non e valido o e scaduto" };
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: saved.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: saved.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: saved.userId } }),
  ]);
  await writeAudit({ actorId: saved.userId, action: "PASSWORD_RESET_COMPLETED", entityType: "User", entityId: saved.userId, summary: "Password aggiornata tramite recupero" });
  return { ok: true, message: "Password aggiornata. Ora puoi accedere." };
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const destination = user.role === "SUPER_ADMIN" ? "/super/impostazioni" : user.role === "BRANCH_ADMIN" ? "/admin/impostazioni" : "/famiglia/profilo";
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmation = String(formData.get("confirmPassword") || "");
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) redirect(`${destination}?password=attuale`);
  if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) redirect(`${destination}?password=debole`);
  if (newPassword !== confirmation) redirect(`${destination}?password=diversa`);
  if (await bcrypt.compare(newPassword, user.passwordHash)) redirect(`${destination}?password=uguale`);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await writeAudit({ actorId: user.id, branchId: user.branchAdmins[0]?.branchId, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id, summary: "Password modificata dalle impostazioni" });
  await deleteSession();
  redirect("/login?password=aggiornata");
}
