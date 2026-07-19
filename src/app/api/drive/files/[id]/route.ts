import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDriveFile } from "@/lib/google";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id: fileId } = await params;
  const submission = await prisma.submission.findFirst({
    where: { OR: [{ currentDriveFileId: fileId }, { pendingDriveFileId: fileId }] },
    include: { assignment: { include: { child: { include: { parents: true } }, request: true } } },
  });
  const template = !submission ? await prisma.template.findFirst({ where: { driveFileId: fileId } }) : null;
  const branchId = submission?.assignment.request.branchId || template?.branchId;
  if (!branchId) return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  const parentTemplateAccess = template ? await prisma.childParent.count({ where: { userId: user.id, approvalStatus: "APPROVED", child: { branchId, approvalStatus: "APPROVED" } } }) : 0;
  const canAccess = user.role === "SUPER_ADMIN" || user.branchAdmins.some((membership) => membership.branchId === branchId) || Boolean(submission && submission.assignment.child.parents.some((link) => link.userId === user.id && link.approvalStatus === "APPROVED")) || parentTemplateAccess > 0;
  if (!canAccess) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  try {
    const file = await getDriveFile(branchId, fileId);
    const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(file.buffer, { headers: { "Content-Type": file.mimeType, "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`, "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Il file non e piu disponibile su Google Drive" }, { status: 404 });
  }
}
