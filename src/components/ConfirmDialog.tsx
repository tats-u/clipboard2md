import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
        <h2 id="confirm-dialog-title" className="text-sm font-semibold uppercase tracking-wider text-amber-300">
          {title}
        </h2>
        <p className="mt-3 text-sm text-gray-300">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="rounded border border-gray-600 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded border border-amber-500 px-3 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/10"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
