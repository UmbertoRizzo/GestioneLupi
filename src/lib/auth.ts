import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashToken, randomToken } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DURATION_DAYS } from "@/lib/constants";
import { roleHome } from "@/lib/utils";

export async function createSession(userId: string) {
  const rawToken = randomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const headerStore = await headers();
  await prisma.session.create({ data: { userId, tokenHash, expiresAt, userAgent: headerStore.get("user-agent")?.slice(0, 500) } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { include: {
      branchAdmins: { include: { branch: { include: { group: true } } } },
      children: { include: { child: true } },
      familyMemberships: { include: { family: true } },
    } } },
  });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Array<"SUPER_ADMIN" | "BRANCH_ADMIN" | "PARENT">) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}

export async function requireBranchManager(branchId: string) {
  const user = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN");
  if (user.role !== "SUPER_ADMIN" && !user.branchAdmins.some((membership) => membership.branchId === branchId)) redirect("/accesso-negato");
  return user;
}
