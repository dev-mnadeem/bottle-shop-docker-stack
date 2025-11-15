import React from 'react';

type CardProps = React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'article' };

export function Card({ as: Tag = 'div', className = '', ...props }: CardProps) {
  return (
    <Tag
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(20,37,30,0.05)] ${className}`}
      {...props}
    />
  );
}

export function Badge({ className = '', ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-clay-tint px-2.5 py-1 text-xs font-semibold text-clay ${className}`}
      {...props}
    />
  );
}
