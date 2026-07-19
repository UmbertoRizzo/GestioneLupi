import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { createChildByAdminAction } from "@/actions/children";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdminBranch } from "@/lib/branch";

export const metadata = { title: "Aggiungi ragazzo" };

export default async function NewAdminChildPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { branch } = await requireAdminBranch();
  const query = await searchParams;
  return <div className="page-container"><header className="page-header"><div className="page-header__text"><Link className="back-link" href="/admin/ragazzi"><ArrowLeft size={17} /> Torna ai ragazzi</Link><h1 style={{ marginTop: 14 }}>Aggiungi un ragazzo</h1><p>Il profilo sarà subito attivo nella branca {branch.name}.</p></div></header>
    {query.errore === "dati" && <div className="form-message form-message--error" style={{ marginBottom: 16 }}>Controlla i dati inseriti.</div>}
    {query.errore === "codice" && <div className="form-message form-message--error" style={{ marginBottom: 16 }}>Esiste già un ragazzo con questo codice persona.</div>}
    <section className="panel"><form action={createChildByAdminAction}><div className="form-section"><div className="form-section__heading"><h2>Dati anagrafici</h2><p>Il genitore potrà collegarsi in seguito usando lo stesso codice persona.</p></div><div className="form-grid form-grid--2"><label className="field"><span>Nome</span><input name="firstName" required /></label><label className="field"><span>Cognome</span><input name="lastName" required /></label><label className="field"><span>Codice persona</span><input name="personCode" required /></label><label className="field"><span>Data di nascita</span><input name="birthDate" type="date" required /></label><label className="field"><span>Sesso</span><select name="gender" defaultValue="" required><option value="" disabled>Seleziona</option><option value="F">Femminile</option><option value="M">Maschile</option><option value="ALTRO">Altro / non specificato</option></select></label><label className="field"><span>Anno nella branca</span><select name="schoolYear" defaultValue="1">{[1,2,3,4,5].map((year) => <option key={year} value={year}>{year}° anno</option>)}</select></label></div></div><div className="form-section"><label className="field"><span>Note interne <em>facoltative</em></span><textarea name="notes" placeholder="Informazioni utili visibili solo agli admin" /></label></div><footer className="form-footer"><Link className="button button--secondary" href="/admin/ragazzi">Annulla</Link><SubmitButton pendingText="Creazione..."><Save size={18} /> Crea profilo</SubmitButton></footer></form></section>
  </div>;
}
