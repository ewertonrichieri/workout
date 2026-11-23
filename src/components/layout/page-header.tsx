interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="bg-accent px-4 pb-6 pt-10 text-accent-foreground">
      <h1 className="mx-auto max-w-lg text-3xl font-semibold">{title}</h1>
    </header>
  );
}
