import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const styles = {
    primary:
      "border border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)]",
    secondary:
      "border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm hover:border-[#b7bcc6] hover:bg-[var(--surface-panel)]",
    ghost:
      "border border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
  };

  return (
    <button
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600/15 disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-subtle)] disabled:shadow-none disabled:opacity-100 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
