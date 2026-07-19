import { cn } from "@/lib/utils";

export function StatCard({ label, value, hint, icon: Icon, tone }: { label: string; value: string | number; hint?: string; icon: React.ComponentType<{ size?: number }>; tone?: "warning" | "danger" | "success" }) {
  return <section className={cn("stat-card", tone && `stat-card--${tone}`)}><div><span className="stat-card__label">{label}</span><strong className="stat-card__value">{value}</strong>{hint && <span className="stat-card__hint">{hint}</span>}</div><span className="stat-card__icon"><Icon size={20} /></span></section>;
}
