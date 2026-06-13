import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`focus-ring w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-subtle)] ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`focus-ring w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--foreground)] placeholder:text-[var(--text-subtle)] ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`focus-ring w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] ${props.className ?? ""}`}
    />
  );
}
