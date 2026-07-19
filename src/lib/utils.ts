import { format, formatDistanceToNowStrict, isValid } from "date-fns";
import { it } from "date-fns/locale";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

export function initials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "GL";
}

export function formatDate(value?: Date | string | null, withYear = true) {
  if (!value) return "Nessuna";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "Nessuna";
  return format(date, withYear ? "d MMM yyyy" : "d MMM", { locale: it });
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "-";
  return format(date, "d MMM yyyy, HH:mm", { locale: it });
}

export function timeAgo(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: it });
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePersonCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function safeDriveName(value: string) {
  return value.normalize("NFC").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function appendExtension(baseName: string, originalName: string) {
  const extension = originalName.includes(".") ? originalName.split(".").pop() : "";
  return safeDriveName(extension ? `${baseName}.${extension?.toLowerCase()}` : baseName);
}

export function roleHome(role: string) {
  if (role === "SUPER_ADMIN") return "/super";
  if (role === "BRANCH_ADMIN") return "/admin";
  return "/famiglia";
}

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`;
}
