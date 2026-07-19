import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata = { title: "Recupera password" };
export default function ForgotPasswordPage() { return <div className="auth-panel"><Link className="back-link" href="/login"><ArrowLeft size={17} /> Torna al login</Link><div className="auth-panel__heading"><p className="eyebrow">Recupero account</p><h2>Password dimenticata?</h2><p>Inserisci l'email: se esiste un account riceverai un collegamento valido per 30 minuti.</p></div><ForgotPasswordForm /></div>; }
