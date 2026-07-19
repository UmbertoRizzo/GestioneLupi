import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileWarning,
  Mail,
  RotateCcw,
  Rocket,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  addChildToRequestAction,
  archiveRequestAction,
  duplicateRequestAction,
  publishRequestAction,
  setAssignmentCompletionAction,
} from "@/actions/requests";
import { reviewSubmissionAction } from "@/actions/submissions";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { ReminderForm } from "@/components/email/reminder-form";
import { AdminFileTools } from "@/components/requests/admin-file-tools";
import { requireAdminBranch } from "@/lib/branch";
import { prisma } from "@/lib/db";
import { formatBytes, formatDate, formatDateTime } from "@/lib/utils";

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branch } = await requireAdminBranch();
  const { id } = await params;
  const query = await searchParams;
  const request = await prisma.documentRequest.findUnique({
    where: { id },
    include: {
      activity: true,
      items: { orderBy: { position: "asc" } },
      assignments: {
        include: {
          child: {
            include: {
              parents: {
                where: { approvalStatus: "APPROVED" },
                include: { user: true },
              },
            },
          },
          submissions: { include: { requestItem: true } },
        },
        orderBy: { child: { lastName: "asc" } },
      },
    },
  });
  if (!request || request.branchId !== branch.id) notFound();
  const assignedChildIds = request.assignments.map(
    (assignment) => assignment.childId,
  );
  const availableChildren = await prisma.child.findMany({
    where: {
      branchId: branch.id,
      approvalStatus: "APPROVED",
      ...(assignedChildIds.length ? { id: { notIn: assignedChildIds } } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const approved = request.assignments.filter((a) =>
    ["APPROVED", "COMPLETED"].includes(a.status),
  ).length;
  const missing = request.assignments.filter(
    (a) => a.status === "MISSING",
  ).length;
  const changes = request.assignments.filter(
    (a) => a.status === "NEEDS_CHANGES",
  ).length;
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-header__text">
          <Link className="back-link" href="/admin/richieste">
            <ArrowLeft size={17} /> Torna alle richieste
          </Link>
          <div className="request-card__head" style={{ marginTop: 14 }}>
            <h1 style={{ margin: 0 }}>{request.title}</h1>
            <StatusPill status={request.status} />
          </div>
          <p>
            {request.activity?.title || "Richiesta della branca"} ·{" "}
            {request.items.length} elementi
          </p>
        </div>
        <div className="page-header__actions">
          {request.status === "DRAFT" && (
            <form action={publishRequestAction.bind(null, request.id)}>
              <button className="button button--primary" type="submit">
                <Rocket size={18} /> Pubblica
              </button>
            </form>
          )}
          <Link
            className="button button--secondary"
            href={`/admin/richieste/${request.id}/modifica`}
          >
            <Edit3 size={18} /> Modifica
          </Link>
          <form action={duplicateRequestAction.bind(null, request.id)}>
            <button className="button button--secondary" type="submit">
              <Copy size={18} /> Duplica
            </button>
          </form>
          {request.status === "PUBLISHED" && (
            <form action={archiveRequestAction.bind(null, request.id)}>
              <button className="button button--secondary" type="submit">
                <Archive size={18} /> Archivia
              </button>
            </form>
          )}
        </div>
      </header>
      {(query.creata || query.duplicata || query.modificata) && (
        <div
          className="form-message form-message--success"
          style={{ marginBottom: 16 }}
        >
          {query.duplicata
            ? "Richiesta duplicata: modifica la bozza e pubblicala quando e pronta."
            : query.modificata
              ? "Modifiche salvate."
              : "Richiesta creata correttamente."}
        </div>
      )}
      {query.errore === "ragazzo" && (
        <div
          className="form-message form-message--error"
          style={{ marginBottom: 16 }}
        >
          Il ragazzo selezionato non appartiene alla branca o non è attivo.
        </div>
      )}
      <div className="stats-grid">
        <StatCard
          label="Destinatari"
          value={request.assignments.length}
          hint={
            request.status === "DRAFT"
              ? "creati alla pubblicazione"
              : "assegnazioni"
          }
          icon={UsersRound}
        />
        <StatCard
          label="Completate"
          value={approved}
          hint={`${request.assignments.length ? Math.round((approved / request.assignments.length) * 100) : 0}% del totale`}
          icon={FileCheck2}
          tone="success"
        />
        <StatCard
          label="Mancanti"
          value={missing}
          hint="nessuna consegna"
          icon={FileWarning}
          tone={missing ? "danger" : "success"}
        />
        <StatCard
          label="Da correggere"
          value={changes}
          hint="richiedono attenzione"
          icon={X}
          tone={changes ? "warning" : "success"}
        />
      </div>
      <AdminFileTools
        items={request.items
          .filter((item) => item.type === "FILE")
          .map((item) => ({
            id: item.id,
            title: item.title,
            assignments: request.assignments.map((assignment) => {
              const submission = assignment.submissions.find(
                (entry) => entry.requestItemId === item.id,
              );
              return {
                id: assignment.id,
                childName: `${assignment.child.firstName} ${assignment.child.lastName}`,
                status: submission?.status || "MISSING",
                hasFile: Boolean(submission?.currentDriveFileId),
              };
            }),
          }))}
      />
      <div className="detail-grid">
        <section className="panel">
          <header className="panel__header">
            <div>
              <h2>Consegne per ragazzo</h2>
              <p>Apri una riga per rivedere ogni elemento</p>
            </div>
          </header>
          <div>
            {request.assignments.length ? (
              request.assignments.map((assignment) => (
                <details className="assignment-row" key={assignment.id}>
                  <summary>
                    <span>
                      <strong>
                        {assignment.child.firstName} {assignment.child.lastName}
                      </strong>
                      <small>
                        {assignment.child.schoolYear}° anno ·{" "}
                        {assignment.child.parents
                          .map((p) => p.user.email)
                          .join(", ")}
                      </small>
                    </span>
                    <StatusPill status={assignment.status} />
                  </summary>
                  <div className="assignment-row__content">
                    <div className="review-actions">
                      {assignment.status === "COMPLETED" &&
                      assignment.adminNotes ? (
                        <form
                          action={setAssignmentCompletionAction.bind(
                            null,
                            assignment.id,
                            false,
                          )}
                        >
                          <button
                            className="button button--secondary button--small"
                            type="submit"
                          >
                            <RotateCcw size={16} /> Riapri richiesta
                          </button>
                        </form>
                      ) : (
                        <form
                          action={setAssignmentCompletionAction.bind(
                            null,
                            assignment.id,
                            true,
                          )}
                        >
                          <button
                            className="button button--primary button--small"
                            type="submit"
                          >
                            <Check size={16} /> Segna completata manualmente
                          </button>
                        </form>
                      )}
                    </div>
                    {request.items.map((item) => {
                      const submission = assignment.submissions.find(
                        (entry) => entry.requestItemId === item.id,
                      );
                      return (
                        <div className="review-item" key={item.id}>
                          <div className="review-item__head">
                            <div>
                              <strong>{item.title}</strong>
                              <small>
                                {item.type === "FILE"
                                  ? submission?.currentDriveFileName ||
                                    "Nessun file"
                                  : item.type === "TEXT"
                                    ? submission?.textValue ||
                                      "Nessuna risposta"
                                    : submission?.booleanValue === null ||
                                        submission?.booleanValue === undefined
                                      ? "Nessuna risposta"
                                      : submission.booleanValue
                                        ? "Si"
                                        : "No"}
                              </small>
                            </div>
                            <StatusPill
                              status={submission?.status || "MISSING"}
                            />
                          </div>
                          {submission?.currentDriveFileId && (
                            <div className="metric-line">
                              <span>
                                {formatBytes(submission.currentSizeBytes)} ·{" "}
                                {formatDateTime(submission.submittedAt)}
                              </span>
                              <a
                                className="button button--secondary button--small"
                                href={`/api/drive/files/${submission.currentDriveFileId}`}
                                target="_blank"
                              >
                                <ExternalLink size={15} /> Apri
                              </a>
                            </div>
                          )}
                          {submission?.pendingDriveFileId && (
                            <div className="notice notice--warning">
                              <FileWarning size={17} />
                              <div>
                                <strong>Sostituzione in attesa</strong>
                                <p>
                                  La nuova versione sostituira il file
                                  precedente solo dopo l'approvazione.
                                </p>
                              </div>
                            </div>
                          )}
                          {submission && submission.status !== "MISSING" && (
                            <div className="review-actions">
                              <form
                                action={reviewSubmissionAction.bind(
                                  null,
                                  submission.id,
                                  "APPROVED",
                                )}
                              >
                                <button
                                  className="button button--secondary button--small"
                                  type="submit"
                                >
                                  <Check size={16} /> Approva
                                </button>
                              </form>
                              <form
                                action={reviewSubmissionAction.bind(
                                  null,
                                  submission.id,
                                  "NEEDS_CHANGES",
                                )}
                                className="review-actions"
                                style={{ margin: 0, flex: 1 }}
                              >
                                <label className="field">
                                  <span className="sr-only">
                                    Motivo correzione
                                  </span>
                                  <input
                                    name="reason"
                                    placeholder="Cosa deve correggere la famiglia?"
                                  />
                                </label>
                                <button
                                  className="button button--danger button--small"
                                  type="submit"
                                >
                                  <X size={16} /> Chiedi correzione
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))
            ) : (
              <div className="empty-state">
                <UsersRound size={28} />
                <h3>Nessun destinatario</h3>
                <p>
                  Le assegnazioni verranno create quando pubblichi la bozza.
                </p>
              </div>
            )}
          </div>
        </section>
        <aside className="dashboard-stack">
          {request.status !== "DRAFT" && (
            <section className="panel">
              <header className="panel__header">
                <div>
                  <h2>Aggiungi destinatario</h2>
                  <p>Assegna questa richiesta a un altro ragazzo</p>
                </div>
                <UserPlus size={19} />
              </header>
              <form
                className="panel__body form-stack"
                action={addChildToRequestAction.bind(null, request.id)}
              >
                {availableChildren.length ? (
                  <>
                    <label className="field">
                      <span>Ragazzo</span>
                      <select name="childId" required defaultValue="">
                        <option value="" disabled>
                          Seleziona un ragazzo
                        </option>
                        {availableChildren.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.lastName} {child.firstName} ·{" "}
                            {child.schoolYear}° anno
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="button button--primary" type="submit">
                      <UserPlus size={17} /> Aggiungi alla richiesta
                    </button>
                  </>
                ) : (
                  <p className="muted">
                    Tutti i ragazzi attivi sono già destinatari.
                  </p>
                )}
              </form>
            </section>
          )}
          <section className="panel">
            <header className="panel__header">
              <h2>Dettagli</h2>
            </header>
            <div className="panel__body">
              <dl className="detail-list">
                <div>
                  <dt>Scadenza</dt>
                  <dd>
                    {request.dueDate ? formatDate(request.dueDate) : "Nessuna"}
                  </dd>
                </div>
                <div>
                  <dt>Destinatari</dt>
                  <dd>
                    {request.targetType === "ALL"
                      ? "Tutta la branca"
                      : request.targetType === "YEARS"
                        ? `Anni ${request.targetYears.join(", ")}`
                        : "Ragazzi selezionati"}
                  </dd>
                </div>
                <div>
                  <dt>Revisione</dt>
                  <dd>{request.requiresApproval ? "Manuale" : "Automatica"}</dd>
                </div>
                <div>
                  <dt>Promemoria</dt>
                  <dd>{request.reminderEnabled ? "Attivi" : "Disattivi"}</dd>
                </div>
              </dl>
            </div>
          </section>
          <section className="panel">
            <header className="panel__header">
              <h2>Elementi richiesti</h2>
            </header>
            <div className="list">
              {request.items.map((item) => (
                <div className="list-item" key={item.id}>
                  <span className="list-item__icon">
                    {item.type === "FILE" ? (
                      <Download size={18} />
                    ) : item.type === "TEXT" ? (
                      <Mail size={18} />
                    ) : (
                      <Check size={18} />
                    )}
                  </span>
                  <span className="list-item__text">
                    <strong>{item.title}</strong>
                    <small>
                      {item.type === "FILE"
                        ? item.driveFileName
                        : item.type === "TEXT"
                          ? "Risposta testuale"
                          : "Conferma si/no"}
                    </small>
                  </span>
                  {item.required && (
                    <span className="status-pill status-pill--danger">
                      Obbligatorio
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
          {request.reminderEnabled && request.status === "PUBLISHED" && (
            <ReminderForm
              request={{
                id: request.id,
                title: request.title,
                dueDate: request.dueDate,
              }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
