import { useCallback, useEffect, useState } from 'react';
import CodeEditor from './CodeEditor';
import CodeBlock from './CodeBlock';
import SettingsPanel from './Settings';
import ConfirmDialog from './ConfirmDialog';
import { useSettings } from './SettingsContext';
import { htmlToMarkdown } from '../lib/html-to-markdown';

interface HtmlEditDialogProps {
  open: boolean;
  currentHtml: string;
  originalHtml: string;
  onApply: (html: string) => void;
  onClose: () => void;
}

export default function HtmlEditDialog({
  open,
  currentHtml,
  originalHtml,
  onApply,
  onClose,
}: HtmlEditDialogProps) {
  const { settings } = useSettings();
  const [draftHtml, setDraftHtml] = useState(currentHtml);
  const [markdown, setMarkdown] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState('');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const hasUnsavedChanges = draftHtml !== currentHtml;

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftHtml(currentHtml);
    setShowDiscardDialog(false);
  }, [currentHtml, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!draftHtml) {
      setMarkdown('');
      setConversionError('');
      setIsConverting(false);
      return;
    }

    let cancelled = false;
    setIsConverting(true);
    setConversionError('');

    htmlToMarkdown(draftHtml, settings)
      .then((nextMarkdown) => {
        if (!cancelled) {
          setMarkdown(nextMarkdown);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMarkdown('');
          setConversionError('Failed to convert edited HTML to Markdown');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsConverting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [draftHtml, open, settings]);

  const handleApply = useCallback(() => {
    onApply(draftHtml);
  }, [draftHtml, onApply]);

  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
      return;
    }

    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    onClose();
  }, [onClose]);

  const handleReset = useCallback(() => {
    setDraftHtml(originalHtml);
  }, [originalHtml]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleRequestClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="html-edit-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleRequestClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="html-edit-dialog-title" className="text-sm font-semibold uppercase tracking-wider text-amber-300">
              Edit pasted HTML
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Adjust the pasted HTML and review the converted Markdown before applying it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SettingsPanel />
            <button
              onClick={handleRequestClose}
              className="rounded border border-gray-700 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100"
            >
              Discard
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
          <section className="min-h-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                HTML
              </h3>
              <button
                onClick={handleReset}
                disabled={draftHtml === originalHtml}
                className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset to pasted HTML
              </button>
            </div>
            <CodeEditor
              value={draftHtml}
              onChange={setDraftHtml}
              ariaLabel="HTML source editor"
            />
          </section>

          <section className="min-h-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Markdown
              </h3>
              <span className="text-xs text-gray-500">
                {isConverting ? 'Converting…' : 'Live preview'}
              </span>
            </div>
            {conversionError ? (
              <div className="rounded border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {conversionError}
              </div>
            ) : (
              <CodeBlock code={markdown} lang="markdown" />
            )}
          </section>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={handleRequestClose}
            className="rounded border border-gray-600 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100"
          >
            Discard and close
          </button>
          <button
            onClick={handleApply}
            className="rounded border border-accent px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10"
          >
            Apply and close
          </button>
        </div>
        <ConfirmDialog
          open={showDiscardDialog}
          title="Discard HTML edits?"
          description="The edited HTML has not been applied yet. Discard your changes and close this dialog?"
          confirmLabel="Discard edits"
          cancelLabel="Keep editing"
          onConfirm={handleConfirmDiscard}
          onCancel={() => setShowDiscardDialog(false)}
        />
      </div>
    </div>
  );
}
