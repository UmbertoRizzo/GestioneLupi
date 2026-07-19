import { Download, FilePlus2, FileText, Trash2 } from "lucide-react";
import { deleteTemplateAction, uploadTemplateAction } from "@/actions/templates";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";
import { formatBytes } from "@/lib/utils";

export const metadata = { title: "Modelli" };
export default async function AdminTemplatesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { branch } = await requireAdminBranch(); const query = await searchParams;
  const templates = await prisma.template.findMany({ where: { branchId: branch.id }, include: { _count: { select: { requestItems: true } } }, orderBy: { title: "asc" } });
  return <div className="page-container"><PageHeader eyebrow={`${branch.group.name} / ${branch.name}`} title="Modelli da compilare" description="Privacy, moduli sanitari e autorizzazioni conservati nel Drive della branca." />
    {query.caricato && <div className="form-message form-message--success" style={{ marginBottom: 16 }}>Modello caricato su Drive.</div>}{query.errore && <div className="form-message form-message--error" style={{ marginBottom: 16 }}>{query.errore === "drive" ? "Drive non disponibile: controlla il collegamento nelle impostazioni." : "Controlla titolo, file e dimensione."}</div>}
    <div className="detail-grid"><section className="panel"><header className="panel__header"><div><h2>Modelli disponibili</h2><p>{templates.length} file</p></div></header><div className="list">{templates.map((template) => <div className="list-item" key={template.id}><span className="list-item__icon"><FileText size={18} /></span><span className="list-item__text"><strong>{template.title}</strong><small>{template.fileName} · {formatBytes(template.sizeBytes)} · usato in {template._count.requestItems} richieste</small></span><div className="table-actions"><a className="icon-button" href={`/api/drive/files/${template.driveFileId}?download=1`} title="Scarica"><Download size={17} /></a><form action={deleteTemplateAction.bind(null, template.id)}><button className="icon-button" type="submit" title="Elimina"><Trash2 size={17} /></button></form></div></div>)}{!templates.length && <div className="empty-state"><FileText size={30} /><h3>Nessun modello</h3><p>Carica un modulo vuoto da mettere a disposizione delle famiglie.</p></div>}</div></section>
      <aside><section className="panel"><header className="panel__header"><h2>Carica nuovo modello</h2></header><form className="panel__body form-stack" action={uploadTemplateAction}><label className="field"><span>Titolo</span><input name="title" placeholder="es. Modulo sanitario vuoto" required /></label><label className="field"><span>Descrizione <em>facoltativa</em></span><textarea name="description" /></label><label className="field"><span>File</span><input name="file" type="file" accept=".pdf,.doc,.docx,.xlsx" required /><small>Limite della branca: {formatBytes(branch.maxUploadBytes)}</small></label><SubmitButton pendingText="Caricamento..."><FilePlus2 size={18} /> Carica su Drive</SubmitButton></form></section></aside>
    </div></div>;
}
