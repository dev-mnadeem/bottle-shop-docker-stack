import React from 'react';

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,35,28,0.05)] ${className}`}
      {...props}
    />
  );
}

export function Badge({ className = '', ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-strong ${className}`}
      {...props}
    />
  );
}
