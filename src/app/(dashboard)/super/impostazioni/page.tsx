import { Database, KeyRound, Mail, Server, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Impostazioni globali" };
export default async function SuperSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  await requireRole("SUPER_ADMIN");
  const checks = [
    { label: "PostgreSQL", hint: "DATABASE_URL", ready: Boolean(process.env.DATABASE_URL), icon: Database },
    { label: "Chiave sessioni", hint: "SESSION_SECRET", ready: Boolean(process.env.SESSION_SECRET), icon: ShieldCheck },
    { label: "Cifratura token", hint: "APP_ENCRYPTION_KEY", ready: Boolean(process.env.APP_ENCRYPTION_KEY), icon: KeyRound },
    { label: "Google OAuth", hint: "Client ID e secret", ready: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), icon: Server },
    { label: "Email di sistema", hint: "SMTP fallback", ready: Boolean(process.env.SMTP_HOST), icon: Mail },
  ];
  return <div className="page-container"><PageHeader eyebrow="Super admin" title="Configurazione globale" description="Stato delle integrazioni impostate su Render. I valori segreti non vengono mostrati." /><div className="dashboard-stack"><section className="panel"><header className="panel__header"><h2>Variabili del servizio</h2></header><div className="panel__body">{checks.map(({ label, hint, ready, icon: Icon }) => <div className="metric-line" key={label}><div className="metric-line__label"><Icon size={19} /><div><strong>{label}</strong><span>{hint}</span></div></div><StatusPill status={ready ? "CONNECTED" : "DISCONNECTED"} label={ready ? "Configurato" : "Da configurare"} /></div>)}</div></section><div className="notice notice--info"><ShieldCheck size={20} /><div><strong>Modifica i segreti dal pannello Render</strong><p>Per sicurezza non possono essere letti o cambiati da questa pagina.</p></div></div><ChangePasswordForm error={typeof query.password === "string" ? query.password : undefined} /></div></div>;
}
