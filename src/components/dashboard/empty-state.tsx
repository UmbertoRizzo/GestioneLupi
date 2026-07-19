import Link from "next/link";

export function EmptyState({ icon: Icon, title, description, actionLabel, href }: { icon: React.ComponentType<{ size?: number }>; title: string; description: string; actionLabel?: string; href?: string }) {
  return <div className="empty-state"><span className="empty-state__icon"><Icon size={22} /></span><h3>{title}</h3><p>{description}</p>{actionLabel && href && <Link className="button button--secondary button--small" href={href}>{actionLabel}</Link>}</div>;
}
