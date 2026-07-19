"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Archive, Building2, ClipboardList, ContactRound, FileStack, FileText, Gauge, History, LayoutDashboard, ListChecks, Settings, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const menus = {
  SUPER_ADMIN: [
    { href: "/super", label: "Panoramica", icon: Gauge },
    { href: "/super/branche", label: "Gruppi e branche", icon: Building2 },
    { href: "/super/utenti", label: "Utenti", icon: UsersRound },
    { href: "/super/log", label: "Log globale", icon: History },
    { href: "/super/impostazioni", label: "Impostazioni", icon: Settings },
  ],
  BRANCH_ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/ragazzi", label: "Ragazzi", icon: UsersRound },
    { href: "/admin/richieste", label: "Richieste", icon: ClipboardList },
    { href: "/admin/attivita", label: "Attivita", icon: Activity },
    { href: "/admin/modelli", label: "Modelli", icon: FileStack },
    { href: "/admin/esportazioni", label: "Esportazioni", icon: FileText },
    { href: "/admin/gruppo", label: "Altre branche", icon: Building2 },
    { href: "/admin/log", label: "Cronologia", icon: History },
    { href: "/admin/impostazioni", label: "Impostazioni", icon: Settings },
  ],
  PARENT: [
    { href: "/famiglia", label: "Riepilogo", icon: LayoutDashboard },
    { href: "/famiglia/richieste", label: "Richieste", icon: ListChecks },
    { href: "/famiglia/documenti", label: "Documenti", icon: Archive },
    { href: "/famiglia/modelli", label: "Modelli", icon: FileStack },
    { href: "/famiglia/figli", label: "Figli", icon: ContactRound },
    { href: "/famiglia/profilo", label: "Profilo", icon: Settings },
  ],
} as const;

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  const rootRoute = href === "/admin" || href === "/super" || href === "/famiglia";
  return !rootRoute && pathname.startsWith(`${href}/`);
}

export function Navigation({ role, mobile = false }: { role: keyof typeof menus; mobile?: boolean }) {
  const pathname = usePathname();
  const items = mobile ? menus[role].slice(0, 5) : menus[role];
  return <nav className={mobile ? "mobile-nav" : "sidebar-nav"} aria-label="Navigazione principale">
    {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("nav-link", isActive(pathname, href) && "nav-link--active")}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>)}
  </nav>;
}
