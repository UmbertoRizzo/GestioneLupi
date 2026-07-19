"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { loginAction, type ActionState } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};
export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  return <form action={action} className="form-stack">
    {state.message && <div className="form-message form-message--error" role="alert">{state.message}</div>}
    <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" placeholder="nome@esempio.it" required />{state.fieldErrors?.email?.[0] && <small className="field__error">{state.fieldErrors.email[0]}</small>}</label>
    <label className="field"><span>Password</span><span className="input-with-action"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" className="icon-button icon-button--inside" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Nascondi password" : "Mostra password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span>{state.fieldErrors?.password?.[0] && <small className="field__error">{state.fieldErrors.password[0]}</small>}</label>
    <SubmitButton pendingText="Accesso..."><LogIn size={18} aria-hidden="true" />Accedi</SubmitButton>
  </form>;
}
