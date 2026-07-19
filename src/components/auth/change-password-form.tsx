import { KeyRound } from "lucide-react";
import { changePasswordAction } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

const errorMessages: Record<string, string> = {
  attuale: "La password attuale non e corretta.",
  debole: "La nuova password deve avere almeno 10 caratteri, con lettere e numeri.",
  diversa: "Le due nuove password non coincidono.",
  uguale: "Scegli una password diversa da quella attuale.",
};

export function ChangePasswordForm({ error }: { error?: string }) {
  return <section className="panel">
    <header className="panel__header"><div><h2>Password</h2><p>Il cambio disconnette tutte le sessioni aperte</p></div><KeyRound size={19} /></header>
    <form className="panel__body form-stack" action={changePasswordAction}>
      {error && <div className="form-message form-message--error">{errorMessages[error] || "Non e stato possibile cambiare la password."}</div>}
      <label className="field"><span>Password attuale</span><input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <div className="form-grid form-grid--2">
        <label className="field"><span>Nuova password</span><input name="newPassword" type="password" minLength={10} autoComplete="new-password" required /></label>
        <label className="field"><span>Ripeti nuova password</span><input name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></label>
      </div>
      <SubmitButton pendingText="Aggiornamento..."><KeyRound size={18} /> Cambia password</SubmitButton>
    </form>
  </section>;
}
