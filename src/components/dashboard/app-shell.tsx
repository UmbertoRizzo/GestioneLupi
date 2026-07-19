import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Brand } from "@/components/ui/brand";
import { Navigation } from "@/components/dashboard/navigation";
import { initials } from "@/lib/utils";

type ShellUser = { firstName: string; lastName: string; email: string; role: "SUPER_ADMIN" | "BRANCH_ADMIN" | "PARENT" };
type BranchTheme = { name: string; groupName: string; primaryColor: string; secondaryColor: string } | null;

export function AppShell({ user, branch, children }: { user: ShellUser; branch: BranchTheme; children: React.ReactNode }) {
  const roleLabel = user.role === "SUPER_ADMIN" ? "Super admin" : user.role === "BRANCH_ADMIN" ? "Admin branca" : "Famiglia";
  const style = { "--branch-primary": branch?.primaryColor || "#b4232f", "--branch-secondary": branch?.secondaryColor || "#174a7e" } as React.CSSProperties;
  return <div className="app-shell" style={style}>
    <aside className="sidebar">
      <Brand href={user.role === "SUPER_ADMIN" ? "/super" : user.role === "BRANCH_ADMIN" ? "/admin" : "/famiglia"} />
      {branch && <div className="branch-switcher"><small>{branch.groupName}</small><strong>{branch.name}</strong></div>}
      {!branch && user.role === "SUPER_ADMIN" && <div className="branch-switcher"><small>Area globale</small><strong>Tutti i gruppi</strong></div>}
      <Navigation role={user.role} />
      <div className="sidebar__footer"><div className="sidebar-user"><span className="avatar">{initials(user.firstName, user.lastName)}</span><span className="sidebar-user__text"><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel}</small></span><form action={logoutAction}><button className="icon-button" type="submit" title="Esci" aria-label="Esci"><LogOut size={18} /></button></form></div></div>
    </aside>
    <header className="mobile-header"><Brand compact /><div className="mobile-header__title"><strong>{branch?.name || "GestioneLupi"}</strong><small>{branch?.groupName || roleLabel}</small></div><form className="mobile-header__account" action={logoutAction}><button className="icon-button" type="submit" aria-label="Esci"><LogOut size={18} /></button></form></header>
    <main className="app-main">{children}</main>
    <Navigation role={user.role} mobile />
  </div>;
}
