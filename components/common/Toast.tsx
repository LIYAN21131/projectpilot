type ToastProps = {
  message: string;
};

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed right-6 top-6 z-50 rounded border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] shadow"
    >
      {message}
    </div>
  );
}
