export type PermissionUser = {
  id: string;
  role: "SUPER_ADMIN" | "BRANCH_ADMIN" | "PARENT";
  branchIds?: string[];
  childIds?: string[];
};

export function canManageBranch(user: PermissionUser, branchId: string) {
  return user.role === "SUPER_ADMIN" || (user.role === "BRANCH_ADMIN" && user.branchIds?.includes(branchId) === true);
}

export function canReadChild(user: PermissionUser, child: { id: string; branchId: string }) {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "BRANCH_ADMIN") return user.branchIds?.includes(child.branchId) === true;
  return user.childIds?.includes(child.id) === true;
}

export function canReadBranchDocuments(user: PermissionUser, branchId: string) {
  if (user.role === "SUPER_ADMIN") return true;
  return user.role === "BRANCH_ADMIN" && user.branchIds?.includes(branchId) === true;
}
