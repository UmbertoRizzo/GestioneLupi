import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata = { title: "Cambia password" };
export default async function PasswordResetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  return <div className="auth-panel"><Link className="back-link" href="/login"><ArrowLeft size={17} /> Torna al login</Link><div className="auth-panel__heading"><p className="eyebrow">Sicurezza</p><h2>Scegli una nuova password</h2><p>Usa almeno 10 caratteri, con lettere e numeri.</p></div>{token ? <ResetPasswordForm token={token} /> : <div className="form-message form-message--error">Collegamento non valido. Richiedine uno nuovo.</div>}</div>;
}
