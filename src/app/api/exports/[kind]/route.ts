import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

const statusLabels: Record<string, string> = { MISSING: "No", UPLOADED: "Caricato", NEEDS_CHANGES: "Da correggere", APPROVED: "Si", COMPLETED: "Si" };

function styleWorksheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, sheet.columnCount) } };
  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF174A7E" } };
    cell.alignment = { vertical: "middle" };
  });
  sheet.columns.forEach((column) => {
    let width = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => { width = Math.min(42, Math.max(width, String(cell.value || "").length + 2)); });
    column.width = width;
  });
  sheet.eachRow((row, index) => {
    if (index > 1 && index % 2 === 1) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F6F8" } }; });
  });
}

function responseFromWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  return workbook.xlsx.writeBuffer().then((buffer) => new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  }));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { branch } = await requireAdminBranch();
  const { kind } = await params;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GestioneLupi";
  workbook.created = new Date();

  if (kind === "contacts") {
    const children = await prisma.child.findMany({ where: { branchId: branch.id, approvalStatus: "APPROVED" }, include: { parents: { where: { approvalStatus: "APPROVED" }, include: { user: true } } }, orderBy: [{ schoolYear: "asc" }, { lastName: "asc" }] });
    const sheet = workbook.addWorksheet("Contatti");
    sheet.addRow(["Cognome", "Nome", "Codice persona", "Anno", "Data di nascita", "Genitori", "Email", "Telefono", "Note"]);
    for (const child of children) sheet.addRow([child.lastName, child.firstName, child.personCode, child.schoolYear, formatDate(child.birthDate), child.parents.map((p) => `${p.user.firstName} ${p.user.lastName}`).join("; "), child.parents.map((p) => p.user.email).join("; "), child.parents.map((p) => p.user.phone).filter(Boolean).join("; "), child.notes || ""]);
    styleWorksheet(sheet);
    return responseFromWorkbook(workbook, `Contatti-${branch.group.name}-${branch.name}.xlsx`);
  }

  if (kind === "activity") {
    const activityId = request.nextUrl.searchParams.get("activityId");
    const activity = activityId ? await prisma.activity.findFirst({ where: { id: activityId, branchId: branch.id }, include: { requests: { where: { status: { in: ["PUBLISHED", "ARCHIVED"] } }, orderBy: { createdAt: "asc" } } } }) : null;
    if (!activity) return NextResponse.json({ error: "Attivita non trovata" }, { status: 404 });
    const children = await prisma.child.findMany({ where: { branchId: branch.id, approvalStatus: "APPROVED" }, include: { parents: { where: { approvalStatus: "APPROVED" }, include: { user: true } }, assignments: { where: { requestId: { in: activity.requests.map((item) => item.id) } } } }, orderBy: [{ schoolYear: "asc" }, { lastName: "asc" }] });
    const summary = workbook.addWorksheet("Riepilogo");
    summary.addRow(["Cognome", "Nome", "Anno", ...activity.requests.map((item) => item.title)]);
    for (const child of children) summary.addRow([child.lastName, child.firstName, child.schoolYear, ...activity.requests.map((item) => statusLabels[child.assignments.find((assignment) => assignment.requestId === item.id)?.status || "MISSING"] || "No")]);
    styleWorksheet(summary);
    const missing = workbook.addWorksheet("Mancanti");
    missing.addRow(["Cognome", "Nome", "Anno", "Richiesta", "Stato", "Scadenza", "Email", "Telefono"]);
    for (const child of children) for (const item of activity.requests) {
      const assignment = child.assignments.find((entry) => entry.requestId === item.id);
      if (!assignment || ["MISSING", "NEEDS_CHANGES"].includes(assignment.status)) missing.addRow([child.lastName, child.firstName, child.schoolYear, item.title, statusLabels[assignment?.status || "MISSING"], item.dueDate ? formatDate(item.dueDate) : "", child.parents.map((p) => p.user.email).join("; "), child.parents.map((p) => p.user.phone).filter(Boolean).join("; ")]);
    }
    styleWorksheet(missing);
    const contacts = workbook.addWorksheet("Contatti");
    contacts.addRow(["Cognome", "Nome", "Anno", "Genitori", "Email", "Telefono"]);
    for (const child of children) contacts.addRow([child.lastName, child.firstName, child.schoolYear, child.parents.map((p) => `${p.user.firstName} ${p.user.lastName}`).join("; "), child.parents.map((p) => p.user.email).join("; "), child.parents.map((p) => p.user.phone).filter(Boolean).join("; ")]);
    styleWorksheet(contacts);
    return responseFromWorkbook(workbook, `${activity.title.replace(/[^a-zA-Z0-9 ]/g, "").replaceAll(" ", "-")}.xlsx`);
  }

  if (kind === "missing") {
    const assignments = await prisma.requestAssignment.findMany({ where: { request: { branchId: branch.id, status: "PUBLISHED" }, status: { in: ["MISSING", "NEEDS_CHANGES"] } }, include: { request: true, child: { include: { parents: { where: { approvalStatus: "APPROVED" }, include: { user: true } } } } }, orderBy: [{ request: { dueDate: "asc" } }, { child: { lastName: "asc" } }] });
    const sheet = workbook.addWorksheet("Mancanti");
    sheet.addRow(["Cognome", "Nome", "Anno", "Richiesta", "Stato", "Scadenza", "Genitori", "Email", "Telefono"]);
    for (const assignment of assignments) sheet.addRow([assignment.child.lastName, assignment.child.firstName, assignment.child.schoolYear, assignment.request.title, statusLabels[assignment.status], assignment.request.dueDate ? formatDate(assignment.request.dueDate) : "", assignment.child.parents.map((p) => `${p.user.firstName} ${p.user.lastName}`).join("; "), assignment.child.parents.map((p) => p.user.email).join("; "), assignment.child.parents.map((p) => p.user.phone).filter(Boolean).join("; ")]);
    styleWorksheet(sheet);
    return responseFromWorkbook(workbook, `Mancanti-${branch.group.name}-${branch.name}.xlsx`);
  }

  return NextResponse.json({ error: "Tipo di export non supportato" }, { status: 404 });
}
