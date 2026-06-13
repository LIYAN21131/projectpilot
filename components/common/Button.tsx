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
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]",
    secondary:
      "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
    ghost: "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]",
  };

  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
