import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { roleHome } from "@/lib/utils";

export default async function AccessDeniedPage() { const user = await requireUser(); return <main className="state-page"><ShieldAlert size={42} /><h1>Accesso non consentito</h1><p>Il tuo account non ha i permessi per aprire questa pagina.</p><Link className="button button--primary" href={roleHome(user.role)}>Torna alla dashboard</Link></main>; }
