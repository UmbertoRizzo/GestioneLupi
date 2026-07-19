import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, AccountStatus, ActivityStatus, ApprovalStatus, BranchKind, BranchStatus, FamilyKind, RequestItemType, RequestMode, RequestStatus, RequestTargetType, UserRole } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL || "admin@gestionelupi.local").toLowerCase();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "GestioneLupi-ChangeMe-2026";
  const demoPassword = process.env.DEMO_PASSWORD || "Demo-GestioneLupi-2026";

  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.SUPER_ADMIN, status: AccountStatus.ACTIVE },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      status: AccountStatus.ACTIVE,
      privacyAcceptedAt: new Date(),
    },
  });

  if (process.env.SEED_DEMO !== "true") {
    console.log(`Super admin pronto: ${superAdmin.email}`);
    return;
  }

  const group = await prisma.scoutGroup.upsert({
    where: { name: "Pavia 1" },
    update: {},
    create: { name: "Pavia 1", city: "Pavia", region: "Lombardia" },
  });

  const branch = await prisma.branch.upsert({
    where: { slug: "pavia-1-lupi" },
    update: {},
    create: {
      groupId: group.id,
      name: "Lupi",
      slug: "pavia-1-lupi",
      kind: BranchKind.LUPI,
      email: "lupi.pavia1@example.it",
      status: BranchStatus.ACTIVE,
      primaryColor: "#c62828",
      secondaryColor: "#174a7e",
      accentColor: "#f2b134",
    },
  });

  const branchAdmin = await prisma.user.upsert({
    where: { email: "lupi@demo.gestionelupi.it" },
    update: {},
    create: {
      email: "lupi@demo.gestionelupi.it",
      passwordHash: await bcrypt.hash(demoPassword, 12),
      firstName: "Branco",
      lastName: "Pavia 1",
      role: UserRole.BRANCH_ADMIN,
      status: AccountStatus.ACTIVE,
      privacyAcceptedAt: new Date(),
    },
  });

  await prisma.branchAdmin.upsert({
    where: { userId_branchId: { userId: branchAdmin.id, branchId: branch.id } },
    update: {},
    create: { userId: branchAdmin.id, branchId: branch.id },
  });

  const parent = await prisma.user.upsert({
    where: { email: "genitore@demo.gestionelupi.it" },
    update: {},
    create: {
      email: "genitore@demo.gestionelupi.it",
      passwordHash: await bcrypt.hash(demoPassword, 12),
      firstName: "Giulia",
      lastName: "Rossi",
      phone: "+39 333 1234567",
      role: UserRole.PARENT,
      status: AccountStatus.ACTIVE,
      privacyAcceptedAt: new Date(),
    },
  });

  const family = await prisma.family.create({
    data: {
      displayName: "Famiglia Rossi",
      kind: FamilyKind.HOUSEHOLD,
      members: { create: { userId: parent.id } },
    },
  });

  const child = await prisma.child.upsert({
    where: { personCode: "PV1-DEMO-001" },
    update: {},
    create: {
      firstName: "Luca",
      lastName: "Rossi",
      personCode: "PV1-DEMO-001",
      birthDate: new Date("2017-04-14"),
      gender: "M",
      schoolYear: 2,
      branchId: branch.id,
      createdById: parent.id,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedAt: new Date(),
      parents: { create: { userId: parent.id, isPrimary: true, approvalStatus: ApprovalStatus.APPROVED } },
    },
  });

  const activity = await prisma.activity.create({
    data: {
      branchId: branch.id,
      title: "Vacanze di Branco 2026",
      description: "Raccolta dei documenti per le Vacanze di Branco.",
      year: 2026,
      status: ActivityStatus.OPEN,
    },
  });

  const request = await prisma.documentRequest.create({
    data: {
      branchId: branch.id,
      activityId: activity.id,
      createdById: branchAdmin.id,
      title: "Documenti Vacanze di Branco",
      description: "Carica il modulo sanitario e conferma il pagamento della prima rata.",
      dueDate: new Date("2026-08-15T21:59:00.000Z"),
      status: RequestStatus.PUBLISHED,
      mode: RequestMode.COMPLETE,
      targetType: RequestTargetType.ALL,
      targetYears: [],
      publishedAt: new Date(),
      items: {
        create: [
          {
            position: 0,
            title: "Modulo sanitario",
            type: RequestItemType.FILE,
            driveFileName: "Modulo Sanitario",
            allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
          },
          {
            position: 1,
            title: "Prima rata pagata",
            type: RequestItemType.BOOLEAN,
            allowedMimeTypes: [],
          },
        ],
      },
      assignments: { create: { childId: child.id } },
    },
    include: { items: true, assignments: true },
  });

  await prisma.submission.createMany({
    data: request.items.map((item) => ({
      assignmentId: request.assignments[0].id,
      requestItemId: item.id,
    })),
    skipDuplicates: true,
  });

  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      branchId: branch.id,
      action: "DEMO_SEEDED",
      entityType: "System",
      summary: "Dati dimostrativi inizializzati",
      metadata: { familyId: family.id },
    },
  });

  console.log("Dati demo creati");
  console.log("Admin branca: lupi@demo.gestionelupi.it");
  console.log("Genitore: genitore@demo.gestionelupi.it");
  console.log(`Password demo: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
