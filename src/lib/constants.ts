export const SESSION_COOKIE = "gestione_lupi_session";
export const SESSION_DURATION_DAYS = 30;
export const PRIVACY_POLICY_VERSION = "2026-07-19";
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const BRANCH_KIND_LABELS = {
  LUPI: "Lupi",
  REPARTO: "Reparto",
  NOVIZIATO: "Noviziato",
  CLAN: "Clan",
  COMUNITA_CAPI: "Comunita Capi",
  ALTRO: "Altro",
} as const;

export const REQUEST_STATUS_LABELS = {
  DRAFT: "Bozza",
  PUBLISHED: "Pubblicata",
  ARCHIVED: "Archiviata",
} as const;

export const ASSIGNMENT_STATUS_LABELS = {
  MISSING: "Mancante",
  UPLOADED: "Caricato",
  NEEDS_CHANGES: "Da correggere",
  APPROVED: "Approvato",
  COMPLETED: "Completato",
} as const;
