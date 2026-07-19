import { z } from "zod";

const password = z.string().min(10, "Usa almeno 10 caratteri").max(128, "La password e troppo lunga").regex(/[A-Za-z]/, "Aggiungi almeno una lettera").regex(/[0-9]/, "Aggiungi almeno un numero");

export const loginSchema = z.object({ email: z.email("Inserisci un indirizzo email valido"), password: z.string().min(1, "Inserisci la password") });

export const parentRegistrationSchema = z.object({
  firstName: z.string().trim().min(2, "Inserisci il nome").max(80),
  lastName: z.string().trim().min(2, "Inserisci il cognome").max(80),
  email: z.email("Inserisci un indirizzo email valido"),
  phone: z.string().trim().min(6, "Inserisci un numero di telefono").max(40),
  password,
  confirmPassword: z.string(),
  familyKind: z.enum(["SINGLE_PARENT", "HOUSEHOLD"]),
  privacy: z.literal("on", { error: "Devi leggere e accettare l'informativa" }),
  dataConsent: z.literal("on", { error: "Il consenso al trattamento e necessario" }),
}).refine((data) => data.password === data.confirmPassword, { message: "Le password non coincidono", path: ["confirmPassword"] });

export const branchRegistrationSchema = z.object({
  groupName: z.string().trim().min(2, "Inserisci il gruppo").max(100),
  branchName: z.string().trim().min(2, "Inserisci il nome della branca").max(100),
  branchKind: z.enum(["LUPI", "REPARTO", "NOVIZIATO", "CLAN", "COMUNITA_CAPI", "ALTRO"]),
  email: z.email("Inserisci la mail della branca"),
  password,
  confirmPassword: z.string(),
  driveFolderUrl: z.string().trim().max(500).optional(),
  privacy: z.literal("on", { error: "Devi leggere e accettare l'informativa" }),
}).refine((data) => data.password === data.confirmPassword, { message: "Le password non coincidono", path: ["confirmPassword"] });
