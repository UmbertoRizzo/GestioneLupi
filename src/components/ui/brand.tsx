import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return <Link className={cn("brand", compact && "brand--compact")} href={href} aria-label="GestioneLupi">
    <span className="brand__mark" aria-hidden="true"><span>GL</span></span>
    {!compact && <span className="brand__text"><strong>GestioneLupi</strong><small>Documenti scout, in ordine</small></span>}
  </Link>;
}
