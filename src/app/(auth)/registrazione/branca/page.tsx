import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { BranchRegistrationForm } from "@/components/auth/branch-registration-form";

export const metadata = { title: "Registra una branca" };
export default function BranchRegistrationPage() { return <div className="auth-panel auth-panel--wide"><Link className="back-link" href="/login"><ArrowLeft size={17} /> Torna al login</Link><div className="auth-panel__heading"><p className="eyebrow">Capi</p><h2>Aggiungi una branca</h2><p>Creeremo un account condiviso per la branca. Il super admin dovra approvarlo prima dell'accesso.</p></div><div className="notice notice--warning"><Info size={20} /><div><strong>Il collegamento a Drive e indispensabile</strong><p>Puoi completarlo dopo l'approvazione, ma senza una cartella autorizzata il sito non puo ricevere documenti.</p></div></div><BranchRegistrationForm /></div>; }
