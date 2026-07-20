import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hashToken, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { createBranchRootFolder, createOAuthClient, DRIVE_SCOPE, GMAIL_SCOPE, verifyDriveFolder } from "@/lib/google";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  const settingsUrl = new URL("/admin/impostazioni", appUrl);
  if (error || !code || !state) { settingsUrl.searchParams.set("google", error || "annullato"); return NextResponse.redirect(settingsUrl); }
  const [user, savedState] = await Promise.all([getCurrentUser(), prisma.oAuthState.findUnique({ where: { nonceHash: hashToken(state) } })]);
  if (!user || !savedState || savedState.userId !== user.id || savedState.expiresAt < new Date()) { settingsUrl.searchParams.set("google", "stato-non-valido"); return NextResponse.redirect(settingsUrl); }
  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    const previous = await prisma.googleConnection.findUnique({ where: { branchId: savedState.branchId } });
    const scopes = (tokens.scope || "").split(" ").filter(Boolean);
    await prisma.googleConnection.upsert({
      where: { branchId: savedState.branchId },
      update: {
        status: "CONNECTED", googleEmail: profile.data.email, encryptedAccessToken: tokens.access_token ? encrypt(tokens.access_token) : previous?.encryptedAccessToken,
        encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : previous?.encryptedRefreshToken, tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes, driveEnabled: scopes.includes(DRIVE_SCOPE), gmailEnabled: scopes.includes(GMAIL_SCOPE), lastCheckedAt: new Date(), lastError: null,
      },
      create: {
        branchId: savedState.branchId, status: "CONNECTED", googleEmail: profile.data.email, encryptedAccessToken: tokens.access_token ? encrypt(tokens.access_token) : null,
        encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null, tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes, driveEnabled: scopes.includes(DRIVE_SCOPE), gmailEnabled: scopes.includes(GMAIL_SCOPE), lastCheckedAt: new Date(),
      },
    });
    if (previous?.driveRootFolderId) {
      const folder = await verifyDriveFolder(savedState.branchId, previous.driveRootFolderId);
      await prisma.googleConnection.update({ where: { branchId: savedState.branchId }, data: { driveRootFolderName: folder.name } });
    } else {
      const branch = await prisma.branch.findUnique({ where: { id: savedState.branchId }, include: { group: true } });
      if (branch) await createBranchRootFolder(branch.id, `GestioneLupi - ${branch.group.name} - ${branch.name}`);
    }
    await prisma.auditLog.create({ data: { actorId: user.id, branchId: savedState.branchId, action: "GOOGLE_CONNECTED", entityType: "GoogleConnection", summary: `Account Google ${profile.data.email || ""} collegato` } });
    settingsUrl.searchParams.set("google", "collegato");
  } catch (connectionError) {
    const message = connectionError instanceof Error ? connectionError.message : "Errore Google";
    await prisma.googleConnection.upsert({ where: { branchId: savedState.branchId }, update: { status: "ERROR", lastError: message }, create: { branchId: savedState.branchId, status: "ERROR", scopes: [], lastError: message } });
    settingsUrl.searchParams.set("google", "errore");
  } finally {
    await prisma.oAuthState.deleteMany({ where: { id: savedState.id } });
  }
  return NextResponse.redirect(settingsUrl);
}
