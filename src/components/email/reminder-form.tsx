import { Mail } from "lucide-react";
import { sendRequestRemindersAction } from "@/actions/email";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/utils";

export function ReminderForm({ request }: { request: { id: string; title: string; dueDate: Date | null } }) {
  const defaultMessage = `Ciao,\n\nper {ragazzo} risulta ancora da completare la richiesta "{richiesta}"${request.dueDate ? ` entro il ${formatDate(request.dueDate)}` : ""}.\n\nAccedi a GestioneLupi per controllare cosa manca.\n\nGrazie!`;
  return <details className="panel"><summary className="panel__header" style={{ cursor: "pointer", listStyle: "none" }}><div><h2>Promemoria ai mancanti</h2><p>Controlla il testo prima di inviare</p></div><Mail size={19} /></summary><form className="panel__body form-stack" action={sendRequestRemindersAction.bind(null, request.id)}><label className="field"><span>Oggetto</span><input name="subject" defaultValue={`Promemoria: ${request.title}`} /></label><label className="field"><span>Messaggio</span><textarea name="message" defaultValue={defaultMessage} /><small>Puoi usare {'{ragazzo}'} e {'{richiesta}'} per personalizzare automaticamente.</small></label><SubmitButton pendingText="Invio..."><Mail size={17} /> Invia ai mancanti</SubmitButton></form></details>;
}
