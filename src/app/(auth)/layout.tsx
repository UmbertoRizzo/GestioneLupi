import { Brand } from "@/components/ui/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell"><section className="auth-shell__brand" aria-label="GestioneLupi"><Brand href="/login" /><div className="auth-shell__message"><p className="eyebrow">Per gruppi scout</p><h1>Documenti chiari.<br />Scadenze sotto controllo.</h1><p>Ogni branca lavora nel proprio Drive. Famiglie e capi vedono solo cio che serve, quando serve.</p></div><div className="auth-shell__status"><span aria-hidden="true" /> I file restano nel Drive della branca</div></section><section className="auth-shell__content">{children}</section></main>;
}
