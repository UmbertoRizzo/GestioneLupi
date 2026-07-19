"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Attendi...", className = "button button--primary" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending}>{pending && <LoaderCircle size={18} className="spin" aria-hidden="true" />}{pending ? pendingText : children}</button>;
}
