type ToastProps = {
  message: string;
};

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 top-4 z-50 mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] shadow-lg shadow-black/8 sm:inset-x-auto sm:right-6 sm:top-6"
    >
      {message}
    </div>
  );
}
