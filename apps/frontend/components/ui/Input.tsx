import React from 'react';

const BASE =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none placeholder:text-muted/70 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 aria-[invalid=true]:border-red-400';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${BASE} ${className}`} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`${BASE} resize-y ${className}`} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = '', ...props }, ref) {
  return <select ref={ref} className={`${BASE} pr-8 ${className}`} {...props} />;
});
