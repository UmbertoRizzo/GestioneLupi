"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Building2 } from "lucide-react";
import { registerBranchAction, type ActionState } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};
function ErrorText({ errors }: { errors?: string[] }) { return errors?.[0] ? <small className="field__error">{errors[0]}</small> : null; }
export function BranchRegistrationForm() {
  const [state, action] = useActionState(registerBranchAction, initialState);
  return <form action={action} className="form-stack">
    {state.message && <div className="form-message form-message--error" role="alert">{state.message}</div>}
    <div className="form-grid form-grid--2"><label className="field"><span>Nome referente</span><input name="firstName" autoComplete="given-name" required /><ErrorText errors={state.fieldErrors?.firstName} /></label><label className="field"><span>Cognome referente</span><input name="lastName" autoComplete="family-name" required /><ErrorText errors={state.fieldErrors?.lastName} /></label></div>
    <div className="form-grid form-grid--2"><label className="field"><span>Gruppo</span><input name="groupName" placeholder="es. Pavia 1" required /><ErrorText errors={state.fieldErrors?.groupName} /></label><label className="field"><span>Nome branca</span><input name="branchName" placeholder="es. Lupi" required /><ErrorText errors={state.fieldErrors?.branchName} /></label></div>
    <label className="field"><span>Tipo di branca</span><select name="branchKind" defaultValue="LUPI"><option value="LUPI">Lupi</option><option value="REPARTO">Reparto</option><option value="NOVIZIATO">Noviziato</option><option value="CLAN">Clan</option><option value="COMUNITA_CAPI">Comunita Capi</option><option value="ALTRO">Altro</option></select></label>
    <label className="field"><span>Email della branca</span><input name="email" type="email" autoComplete="email" required /><small>Questa email sara anche il nome utente condiviso della branca.</small><ErrorText errors={state.fieldErrors?.email} /></label>
    <label className="field"><span>Cartella Google Drive <em>facoltativa ora</em></span><input name="driveFolderUrl" type="url" placeholder="https://drive.google.com/drive/folders/..." /><small>Potrai selezionarla e autorizzarla dopo l'approvazione. Senza Drive non sara possibile ricevere documenti.</small></label>
    <div className="form-grid form-grid--2"><label className="field"><span>Password</span><input name="password" type="password" autoComplete="new-password" required /><ErrorText errors={state.fieldErrors?.password} /></label><label className="field"><span>Ripeti password</span><input name="confirmPassword" type="password" autoComplete="new-password" required /><ErrorText errors={state.fieldErrors?.confirmPassword} /></label></div>
    <label className="check-field"><input type="checkbox" name="privacy" required /><span>Ho letto e accetto l'<Link href="/privacy" target="_blank">informativa privacy</Link>.</span></label>
    <SubmitButton pendingText="Invio richiesta..."><Building2 size={18} aria-hidden="true" />Invia richiesta</SubmitButton>
  </form>;
}
