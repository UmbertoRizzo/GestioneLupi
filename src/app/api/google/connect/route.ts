import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, DRIVE_SCOPE, EMAIL_SCOPE, GMAIL_SCOPE } from "@/lib/google";
import { hashToken, randomToken } from "@/lib/crypto";
import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const branchId = request.nextUrl.searchParams.get("branchId");
  const includeGmail = request.nextUrl.searchParams.get("gmail") === "1";
  if (!branchId) return NextResponse.redirect(new URL("/admin/impostazioni?google=parametri", request.url));
  const user = await requireBranchManager(branchId);
  const state = randomToken(24);
  await prisma.oAuthState.create({ data: { nonceHash: hashToken(state), userId: user.id, branchId, purpose: includeGmail ? "DRIVE_GMAIL" : "DRIVE", expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  const client = createOAuthClient();
  const scopes = [DRIVE_SCOPE, EMAIL_SCOPE, ...(includeGmail ? [GMAIL_SCOPE] : [])];
  const url = client.generateAuthUrl({ access_type: "offline", prompt: "consent", include_granted_scopes: true, scope: scopes, state });
  return NextResponse.redirect(url);
}
