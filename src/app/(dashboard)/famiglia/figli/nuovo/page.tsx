import Link from "next/link";
import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import { createChildAction } from "@/actions/children";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Aggiungi figlio" };

export default async function NewChildPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("PARENT");
  const params = await searchParams;
  const groups = await prisma.scoutGroup.findMany({ where: { branches: { some: { status: "ACTIVE" } } }, include: { branches: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } });
  return <div className="page-container"><PageHeading /><section className="panel"><form action={createChildAction}>
    {params.errore && <div className="form-section"><div className="form-message form-message--error">Non siamo riusciti a salvare i dati. Controlla i campi e riprova.</div></div>}
    <div className="form-section"><div className="form-section__heading"><h2>Dati del ragazzo</h2><p>Servono solo le informazioni utili alla branca.</p></div><div className="form-grid form-grid--2"><label className="field"><span>Nome</span><input name="firstName" autoComplete="off" required /></label><label className="field"><span>Cognome</span><input name="lastName" autoComplete="off" required /></label><label className="field"><span>Codice persona</span><input name="personCode" autoCapitalize="characters" required /><small>Permette di evitare profili duplicati.</small></label><label className="field"><span>Data di nascita</span><input name="birthDate" type="date" required /></label><label className="field"><span>Sesso</span><select name="gender" required><option value="">Seleziona</option><option value="F">Femminile</option><option value="M">Maschile</option><option value="ALTRO">Altro / non specificato</option></select></label><label className="field"><span>Anno nella branca</span><select name="schoolYear" defaultValue="1">{[1,2,3,4,5].map((year) => <option key={year} value={year}>{year}° anno</option>)}</select></label></div></div>
    <div className="form-section"><div className="form-section__heading"><h2>Gruppo e branca</h2><p>La richiesta arrivera direttamente agli admin della branca scelta.</p></div><label className="field"><span>Branca</span><select name="branchId" required defaultValue=""><option value="" disabled>Seleziona gruppo e branca</option>{groups.map((group) => <optgroup label={group.name} key={group.id}>{group.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</optgroup>)}</select></label></div>
    <div className="form-section"><div className="notice notice--info" style={{ margin: 0 }}><ShieldCheck size={20} /><div><strong>Il profilo resta bloccato fino all'approvazione</strong><p>Non vedrai richieste o documenti prima della conferma della branca.</p></div></div></div>
    <footer className="form-footer"><Link className="button button--secondary" href="/famiglia/figli">Annulla</Link><SubmitButton pendingText="Invio..."><Save size={18} /> Invia richiesta</SubmitButton></footer>
  </form></section></div>;
}

function PageHeading() { return <header className="page-header"><div className="page-header__text"><Link className="back-link" href="/famiglia/figli"><ArrowLeft size={17} /> Torna ai figli</Link><h1 style={{ marginTop: 14 }}>Aggiungi un figlio</h1><p>La branca controllera i dati prima di attivare il profilo.</p></div></header>; }
