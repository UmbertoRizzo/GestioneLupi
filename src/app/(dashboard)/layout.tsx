import { AppShell } from "@/components/dashboard/app-shell";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const adminBranch = user.branchAdmins[0]?.branch;
  const parentBranch = user.children.find((item) => item.child.approvalStatus === "APPROVED")?.child.branchId;
  let branch = adminBranch ? { name: adminBranch.name, groupName: adminBranch.group.name, primaryColor: adminBranch.primaryColor, secondaryColor: adminBranch.secondaryColor } : null;
  if (!branch && parentBranch) {
    const membership = user.children.find((item) => item.child.branchId === parentBranch);
    const branchRecord = membership ? await import("@/lib/db").then(({ prisma }) => prisma.branch.findUnique({ where: { id: membership.child.branchId }, include: { group: true } })) : null;
    if (branchRecord) branch = { name: branchRecord.name, groupName: branchRecord.group.name, primaryColor: branchRecord.primaryColor, secondaryColor: branchRecord.secondaryColor };
  }
  return <AppShell user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }} branch={branch}>{children}</AppShell>;
}
