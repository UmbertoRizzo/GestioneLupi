"use client";

import Link from "next/link";
import { useActionState } from "react";
import { UserRoundPlus } from "lucide-react";
import { registerParentAction, type ActionState } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};
function ErrorText({ errors }: { errors?: string[] }) { return errors?.[0] ? <small className="field__error">{errors[0]}</small> : null; }
export function ParentRegistrationForm() {
  const [state, action] = useActionState(registerParentAction, initialState);
  return <form action={action} className="form-stack">
    {state.message && <div className="form-message form-message--error" role="alert">{state.message}</div>}
    <div className="form-grid form-grid--2"><label className="field"><span>Nome</span><input name="firstName" autoComplete="given-name" required /><ErrorText errors={state.fieldErrors?.firstName} /></label><label className="field"><span>Cognome</span><input name="lastName" autoComplete="family-name" required /><ErrorText errors={state.fieldErrors?.lastName} /></label></div>
    <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /><ErrorText errors={state.fieldErrors?.email} /></label>
    <label className="field"><span>Telefono</span><input name="phone" type="tel" autoComplete="tel" placeholder="+39 ..." required /><ErrorText errors={state.fieldErrors?.phone} /></label>
    <fieldset className="choice-field"><legend>Tipo di account</legend><label className="choice-card"><input type="radio" name="familyKind" value="HOUSEHOLD" defaultChecked /><span><strong>Nucleo familiare</strong><small>Per gestire insieme uno o piu figli</small></span></label><label className="choice-card"><input type="radio" name="familyKind" value="SINGLE_PARENT" /><span><strong>Genitore singolo</strong><small>Potrai comunque collegare un altro genitore</small></span></label></fieldset>
    <div className="form-grid form-grid--2"><label className="field"><span>Password</span><input name="password" type="password" autoComplete="new-password" required /><ErrorText errors={state.fieldErrors?.password} /></label><label className="field"><span>Ripeti password</span><input name="confirmPassword" type="password" autoComplete="new-password" required /><ErrorText errors={state.fieldErrors?.confirmPassword} /></label></div>
    <label className="check-field"><input type="checkbox" name="privacy" required /><span>Ho letto e accetto l'<Link href="/privacy" target="_blank">informativa privacy</Link>.</span></label>
    <label className="check-field"><input type="checkbox" name="dataConsent" required /><span>Acconsento al trattamento dei dati necessari alle attivita scout e so che i documenti saranno conservati nel Drive della branca.</span></label>
    <SubmitButton pendingText="Creazione account..."><UserRoundPlus size={18} aria-hidden="true" />Crea account</SubmitButton>
  </form>;
}
