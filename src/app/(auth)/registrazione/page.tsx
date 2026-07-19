import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ParentRegistrationForm } from "@/components/auth/registration-form";

export const metadata = { title: "Registrazione famiglia" };
export default function RegistrationPage() { return <div className="auth-panel auth-panel--wide"><Link className="back-link" href="/login"><ArrowLeft size={17} /> Torna al login</Link><div className="auth-panel__heading"><p className="eyebrow">Famiglie</p><h2>Crea il tuo account</h2><p>Dopo la registrazione potrai aggiungere uno o piu figli. La branca dovra approvarli prima che compaiano le richieste.</p></div><ParentRegistrationForm /></div>; }
