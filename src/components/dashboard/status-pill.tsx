import { cn } from "@/lib/utils";

const toneByStatus: Record<string, string> = {
  ACTIVE: "success", APPROVED: "success", COMPLETED: "success", SENT: "success", CONNECTED: "success", PUBLISHED: "info", UPLOADED: "info", OPEN: "info",
  PENDING: "warning", DRAFT: "warning", MISSING: "danger", NEEDS_CHANGES: "danger", REJECTED: "danger", FAILED: "danger", ERROR: "danger", SUSPENDED: "danger",
};
const labels: Record<string, string> = {
  ACTIVE: "Attivo", APPROVED: "Approvato", COMPLETED: "Completato", SENT: "Inviata", CONNECTED: "Collegato", PUBLISHED: "Pubblicata", UPLOADED: "Caricato", OPEN: "Aperta",
  PENDING: "In attesa", DRAFT: "Bozza", MISSING: "Mancante", NEEDS_CHANGES: "Da correggere", REJECTED: "Rifiutato", FAILED: "Errore", ERROR: "Errore", SUSPENDED: "Sospeso", ARCHIVED: "Archiviata", DISCONNECTED: "Non collegato", QUEUED: "In coda",
};
export function StatusPill({ status, label }: { status: string; label?: string }) { const tone = toneByStatus[status]; return <span className={cn("status-pill", tone && `status-pill--${tone}`)}>{label || labels[status] || status}</span>; }
