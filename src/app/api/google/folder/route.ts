import { NextRequest, NextResponse } from "next/server";
import { requireBranchManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyDriveFolder } from "@/lib/google";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { branchId?: string; folderId?: string } | null;
  if (!body?.branchId || !body.folderId) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  const user = await requireBranchManager(body.branchId);
  try {
    const folder = await verifyDriveFolder(body.branchId, body.folderId);
    await prisma.$transaction([
      prisma.googleConnection.update({ where: { branchId: body.branchId }, data: { driveRootFolderId: folder.id, driveRootFolderName: folder.name, driveEnabled: true, status: "CONNECTED", lastCheckedAt: new Date(), lastError: null } }),
      prisma.child.updateMany({ where: { branchId: body.branchId }, data: { driveFolderId: null, driveFolderName: null } }),
    ]);
    await prisma.auditLog.create({ data: { actorId: user.id, branchId: body.branchId, action: "DRIVE_FOLDER_CHANGED", entityType: "GoogleConnection", summary: `Cartella Drive impostata su ${folder.name}`, metadata: { folderId: folder.id } } });
    return NextResponse.json(folder);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cartella non accessibile" }, { status: 400 });
  }
}
