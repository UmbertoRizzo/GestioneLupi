import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/utils";

export const metadata = { title: "Accedi" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const user = await getCurrentUser(); if (user) redirect(roleHome(user.role));
  return <div className="auth-panel"><div className="auth-panel__heading"><p className="eyebrow">Bentornato</p><h2>Accedi al portale</h2><p>Usa l'account della tua famiglia o della tua branca.</p></div>{query.password === "aggiornata" && <div className="form-message form-message--success" style={{ marginBottom: 16 }}>Password aggiornata. Accedi di nuovo.</div>}<LoginForm /><Link className="text-link text-link--center" href="/password-dimenticata">Password dimenticata?</Link><div className="auth-divider"><span>oppure</span></div><Link className="button button--secondary button--full" href="/registrazione">Crea un account genitore</Link><p className="auth-panel__branch-link">Sei un capo? <Link href="/registrazione/branca">Aggiungi la tua branca</Link></p></div>;
}
