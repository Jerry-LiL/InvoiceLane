import type { ReactNode } from 'react';

export function PageHeader({
  title,
  lede,
  action,
}: {
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
        {lede ? <p className="mt-1 max-w-xl text-sm text-muted">{lede}</p> : null}
      </div>
      {action}
    </div>
  );
}
