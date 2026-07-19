import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Richiesta inviata" };
export default function BranchRegistrationCompletePage() { return <div className="auth-panel auth-panel--centered"><span className="success-mark"><CheckCircle2 size={34} /></span><div className="auth-panel__heading"><h2>Richiesta inviata</h2><p>Il super admin deve approvare la branca. Dopo l'approvazione potrai accedere e collegare il Drive.</p></div><Link className="button button--primary button--full" href="/login">Torna al login</Link></div>; }
