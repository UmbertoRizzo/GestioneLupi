import "server-only";

import { Readable } from "node:stream";
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { safeDriveName } from "@/lib/utils";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const EMAIL_SCOPE = "https://www.googleapis.com/auth/userinfo.email";

export function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || "http://localhost:3000"}/api/google/callback`;
  if (!clientId || !clientSecret) throw new Error("Google OAuth non e configurato sul server");
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getAuthorizedGoogleClient(branchId: string) {
  const connection = await prisma.googleConnection.findUnique({ where: { branchId } });
  if (!connection?.encryptedRefreshToken && !connection?.encryptedAccessToken) throw new Error("Collega prima l'account Google della branca");
  const client = createOAuthClient();
  client.setCredentials({
    access_token: decrypt(connection.encryptedAccessToken),
    refresh_token: decrypt(connection.encryptedRefreshToken),
    expiry_date: connection.tokenExpiry?.getTime(),
    scope: connection.scopes.join(" "),
  });
  client.on("tokens", (tokens) => {
    void prisma.googleConnection.update({
      where: { branchId },
      data: {
        ...(tokens.access_token ? { encryptedAccessToken: encrypt(tokens.access_token) } : {}),
        ...(tokens.refresh_token ? { encryptedRefreshToken: encrypt(tokens.refresh_token) } : {}),
        ...(tokens.expiry_date ? { tokenExpiry: new Date(tokens.expiry_date) } : {}),
      },
    });
  });
  return { client, connection };
}

function escapedQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function verifyDriveFolder(branchId: string, folderId: string) {
  const { client } = await getAuthorizedGoogleClient(branchId);
  const drive = google.drive({ version: "v3", auth: client });
  const response = await drive.files.get({ fileId: folderId, fields: "id,name,mimeType,trashed", supportsAllDrives: true });
  if (response.data.mimeType !== "application/vnd.google-apps.folder" || response.data.trashed) throw new Error("La risorsa scelta non e una cartella Drive disponibile");
  return { id: response.data.id!, name: response.data.name || "Cartella documenti" };
}

export async function createBranchRootFolder(branchId: string, name: string) {
  const { client } = await getAuthorizedGoogleClient(branchId);
  const drive = google.drive({ version: "v3", auth: client });
  const response = await drive.files.create({ requestBody: { name: safeDriveName(name), mimeType: "application/vnd.google-apps.folder" }, fields: "id,name" });
  if (!response.data.id) throw new Error("Google Drive non ha restituito l'ID della cartella");
  await prisma.googleConnection.update({ where: { branchId }, data: { driveRootFolderId: response.data.id, driveRootFolderName: response.data.name, driveEnabled: true, status: "CONNECTED", lastCheckedAt: new Date(), lastError: null } });
  return { id: response.data.id, name: response.data.name || name };
}

async function findOrCreateFolder(branchId: string, parentId: string, name: string) {
  const { client } = await getAuthorizedGoogleClient(branchId);
  const drive = google.drive({ version: "v3", auth: client });
  const query = `'${escapedQueryValue(parentId)}' in parents and name = '${escapedQueryValue(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const found = await drive.files.list({ q: query, fields: "files(id,name)", spaces: "drive", supportsAllDrives: true, includeItemsFromAllDrives: true, pageSize: 10 });
  if (found.data.files?.[0]?.id) return found.data.files[0].id;
  const created = await drive.files.create({ requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }, fields: "id", supportsAllDrives: true });
  if (!created.data.id) throw new Error(`Impossibile creare la cartella ${name}`);
  return created.data.id;
}

export async function ensureChildDriveFolder(childId: string) {
  const child = await prisma.child.findUnique({ where: { id: childId }, include: { branch: { include: { group: true, googleConnection: true } } } });
  if (!child) throw new Error("Ragazzo non trovato");
  if (child.driveFolderId) return { branchId: child.branchId, folderId: child.driveFolderId };
  let rootId = child.branch.googleConnection?.driveRootFolderId;
  if (!rootId) {
    const created = await createBranchRootFolder(child.branchId, `GestioneLupi - ${child.branch.group.name} - ${child.branch.name}`);
    rootId = created.id;
  }
  const childrenRootId = await findOrCreateFolder(child.branchId, rootId, "Ragazzi");
  const folderName = safeDriveName(`${child.firstName} ${child.lastName} - ${child.personCode}`);
  const folderId = await findOrCreateFolder(child.branchId, childrenRootId, folderName);
  await prisma.child.update({ where: { id: child.id }, data: { driveFolderId: folderId, driveFolderName: folderName } });
  return { branchId: child.branchId, folderId };
}

export async function uploadFileToChild(childId: string, file: File, driveFileName: string) {
  const { branchId, folderId } = await ensureChildDriveFolder(childId);
  const { client } = await getAuthorizedGoogleClient(branchId);
  const drive = google.drive({ version: "v3", auth: client });
  const buffer = Buffer.from(await file.arrayBuffer());
  const response = await drive.files.create({
    requestBody: { name: driveFileName, parents: [folderId] },
    media: { mimeType: file.type || "application/octet-stream", body: Readable.from(buffer) },
    fields: "id,name,mimeType,size,webViewLink",
    supportsAllDrives: true,
  });
  if (!response.data.id) throw new Error("Caricamento su Google Drive non riuscito");
  return { id: response.data.id, name: response.data.name || driveFileName, mimeType: response.data.mimeType || file.type, size: Number(response.data.size || file.size) };
}

export async function uploadFileToBranchFolder(branchId: string, folderName: string, file: File, driveFileName: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, include: { group: true, googleConnection: true } });
  if (!branch) throw new Error("Branca non trovata");
  let rootId = branch.googleConnection?.driveRootFolderId;
  if (!rootId) {
    const created = await createBranchRootFolder(branch.id, `GestioneLupi - ${branch.group.name} - ${branch.name}`);
    rootId = created.id;
  }
  const targetFolderId = await findOrCreateFolder(branchId, rootId, folderName);
  const { client } = await getAuthorizedGoogleClient(branchId);
  const drive = google.drive({ version: "v3", auth: client });
  const buffer = Buffer.from(await file.arrayBuffer());
  const response = await drive.files.create({
    requestBody: { name: driveFileName, parents: [targetFolderId] },
    media: { mimeType: file.type || "application/octet-stream", body: Readable.from(buffer) },
    fields: "id,name,mimeType,size",
    supportsAllDrives: true,
  });
  if (!response.data.id) throw new Error("Caricamento su Google Drive non riuscito");
  return { id: response.data.id, name: response.data.name || driveFileName, mimeType: response.data.mimeType || file.type, size: Number(response.data.size || file.size) };
}

export async function deleteDriveFile(branchId: string, fileId?: string | null) {
  if (!fileId) return;
  const { client } = await getAuthorizedGoogleClient(branchId);
  const drive = google.drive({ version: "v3", auth: client });
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

export async function renameDriveFile(branchId: string, fileId: string, name: string) {
  const { client } = await getAuthorizedGoogleClient(branchId);
  const drive = google.drive({ version: "v3", auth: client });
  await drive.files.update({ fileId, requestBody: { name }, supportsAllDrives: true });
}

export async function getDriveFile(branchId: string, fileId: string) {
  const { client } = await getAuthorizedGoogleClient(branchId);
  const drive = google.drive({ version: "v3", auth: client });
  const [metadata, content] = await Promise.all([
    drive.files.get({ fileId, fields: "id,name,mimeType,size,trashed", supportsAllDrives: true }),
    drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" }),
  ]);
  if (metadata.data.trashed) throw new Error("File eliminato da Drive");
  return { name: metadata.data.name || "documento", mimeType: metadata.data.mimeType || "application/octet-stream", buffer: Buffer.from(content.data as ArrayBuffer) };
}
