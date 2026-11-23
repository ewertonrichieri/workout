import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted">{description}</p>
      {children}
    </section>
  );
}
