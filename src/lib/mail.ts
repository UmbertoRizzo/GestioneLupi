import "server-only";

import nodemailer from "nodemailer";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { getAuthorizedGoogleClient } from "@/lib/google";

type MailInput = {
  branchId?: string | null;
  actorId?: string | null;
  to: string;
  subject: string;
  text: string;
  replyTo?: string | null;
};

function gmailRawMessage(input: { from: string; to: string; subject: string; text: string; replyTo?: string | null }) {
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(input.subject).toString("base64")}?=`,
    ...(input.replyTo ? [`Reply-To: ${input.replyTo}`] : []),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(input.text).toString("base64"),
  ].join("\r\n");
  return Buffer.from(headers).toString("base64url");
}

export async function sendEmail(input: MailInput) {
  let provider = "none";
  let status: "SENT" | "FAILED" = "FAILED";
  let errorMessage: string | null = null;
  try {
    const branch = input.branchId ? await prisma.branch.findUnique({ where: { id: input.branchId }, include: { googleConnection: true } }) : null;
    if (branch?.googleConnection?.gmailEnabled) {
      const { client } = await getAuthorizedGoogleClient(branch.id);
      const gmail = google.gmail({ version: "v1", auth: client });
      await gmail.users.messages.send({ userId: "me", requestBody: { raw: gmailRawMessage({ from: branch.googleConnection.googleEmail || branch.email, to: input.to, subject: input.subject, text: input.text, replyTo: input.replyTo || branch.email }) } });
      provider = "gmail";
    } else if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
      await transporter.sendMail({ from: process.env.SMTP_FROM || "GestioneLupi <noreply@gestionelupi.local>", to: input.to, subject: input.subject, text: input.text, replyTo: input.replyTo || branch?.email || undefined });
      provider = "smtp";
    } else {
      throw new Error("Nessun canale email configurato");
    }
    status = "SENT";
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Invio non riuscito";
  }
  await prisma.emailLog.create({ data: { actorId: input.actorId, branchId: input.branchId, recipients: [input.to], subject: input.subject, body: input.text, status, provider, error: errorMessage, sentAt: status === "SENT" ? new Date() : null } });
  if (status === "FAILED") throw new Error(errorMessage || "Invio non riuscito");
}
