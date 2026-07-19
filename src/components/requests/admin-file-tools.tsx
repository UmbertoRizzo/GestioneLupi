import { AlertTriangle, FileUp, Trash2, Upload } from "lucide-react";
import { deleteRequestItemFilesAction, uploadSubmissionAction } from "@/actions/submissions";
import { StatusPill } from "@/components/dashboard/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";

type FileToolItem = {
  id: string;
  title: string;
  assignments: Array<{ id: string; childName: string; status: string; hasFile: boolean }>;
};

export function AdminFileTools({ items }: { items: FileToolItem[] }) {
  if (!items.length) return null;
  return <details className="panel" style={{ marginBottom: 16 }}><summary className="panel__header" style={{ cursor: "pointer", listStyle: "none" }}><div><h2>Operazioni sui file</h2><p>Carica per una famiglia oppure elimina un tipo di documento da tutti</p></div><FileUp size={19} /></summary><div className="panel__body"><div className="dashboard-stack">{items.map((item) => <details key={item.id}><summary style={{ cursor: "pointer", fontWeight: 750 }}>{item.title}</summary><div style={{ marginTop: 12 }}><div className="list">{item.assignments.map((assignment) => <div className="list-item" key={assignment.id}><span className="list-item__text"><strong>{assignment.childName}</strong><small>{assignment.hasFile ? "Puoi caricare una nuova versione" : "Nessun file caricato"}</small></span><StatusPill status={assignment.status} /><form className="file-drop" action={uploadSubmissionAction.bind(null, assignment.id, item.id)}><input type="file" name="file" required /><SubmitButton className="button button--secondary button--small" pendingText="Carico..."><Upload size={15} /> Carica</SubmitButton></form></div>)}</div><div className="notice notice--danger" style={{ marginTop: 14 }}><AlertTriangle size={19} /><div style={{ flex: 1 }}><strong>Elimina questo documento per tutti</strong><p>L'operazione rimuove i file anche da Drive. Scrivi ELIMINA per confermare.</p><form className="review-actions" action={deleteRequestItemFilesAction.bind(null, item.id)}><label className="field"><span className="sr-only">Conferma eliminazione</span><input name="confirmation" placeholder="ELIMINA" required /></label><button className="button button--danger button--small" type="submit"><Trash2 size={16} /> Elimina tutti</button></form></div></div></div></details>)}</div></div></details>;
}
