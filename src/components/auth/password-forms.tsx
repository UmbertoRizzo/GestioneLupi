"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { requestPasswordResetAction, resetPasswordAction, type ActionState } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialState);
  return <form className="form-stack" action={action}>{state.message && <div className={state.ok ? "form-message form-message--success" : "form-message form-message--error"}>{state.message}</div>}<label className="field"><span>Email</span><input type="email" name="email" autoComplete="email" required /></label><SubmitButton pendingText="Invio..."><Mail size={18} /> Invia collegamento</SubmitButton></form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialState);
  if (state.ok) return <div className="form-stack"><div className="form-message form-message--success"><CheckCircle2 size={17} /> {state.message}</div><Link className="button button--primary" href="/login">Vai al login</Link></div>;
  return <form className="form-stack" action={action}><input type="hidden" name="token" value={token} />{state.message && <div className="form-message form-message--error">{state.message}</div>}<label className="field"><span>Nuova password</span><input type="password" name="password" autoComplete="new-password" required /></label><label className="field"><span>Ripeti password</span><input type="password" name="confirmPassword" autoComplete="new-password" required /></label><SubmitButton pendingText="Aggiornamento..."><KeyRound size={18} /> Cambia password</SubmitButton></form>;
}
