import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckIcon, CopyIcon, IssueOpenedIcon } from '@primer/octicons-react';
import { useSettings } from './SettingsContext';
import { createConversionBugReportUrls } from '../lib/conversion-bug-report';

interface ReportConversionBugButtonProps {
  html: string;
  markdown: string;
}

export default function ReportConversionBugButton({ html, markdown }: ReportConversionBugButtonProps) {
  const { settings } = useSettings();
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);

  const { directUrl, fallbackUrl, shouldUseFallback } = useMemo(
    () => createConversionBugReportUrls({ html, markdown, settings }),
    [html, markdown, settings],
  );

  const openInNewTab = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleReport = useCallback(() => {
    if (shouldUseFallback) {
      setShowManualDialog(true);
      return;
    }

    openInNewTab(directUrl);
  }, [directUrl, openInNewTab, shouldUseFallback]);

  const copyText = useCallback(async (text: string, onCopied: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onCopied();
    } catch {
      // clipboard write failed silently
    }
  }, []);

  const handleCopyMarkdown = useCallback(() => {
    void copyText(markdown, () => {
      setMarkdownCopied(true);
      setTimeout(() => setMarkdownCopied(false), 2000);
    });
  }, [copyText, markdown]);

  const handleCopyHtml = useCallback(() => {
    void copyText(html, () => {
      setHtmlCopied(true);
      setTimeout(() => setHtmlCopied(false), 2000);
    });
  }, [copyText, html]);

  useEffect(() => {
    if (!showManualDialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowManualDialog(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showManualDialog]);

  return (
    <>
      <button
        onClick={handleReport}
        className="flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-colors duration-200 cursor-pointer border-gray-600 text-gray-300 hover:border-accent hover:text-accent copy-breathe"
      >
        <IssueOpenedIcon size={14} />
        Report Bug
      </button>

      {showManualDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-report-dialog-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowManualDialog(false);
            }
          }}
        >
          <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="manual-report-dialog-title" className="text-sm font-semibold uppercase tracking-wider text-amber-300">
                  URL too long for autofill
                </h2>
                <p className="mt-2 text-sm text-gray-300">
                  Open the report form in a new tab, then copy Markdown and HTML from this tab into the matching fields.
                </p>
              </div>
              <button
                onClick={() => setShowManualDialog(false)}
                className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
                aria-label="Close manual report dialog"
              >
                Close
              </button>
            </div>

            <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm text-gray-300">
              <li>Open the blank conversion bug form in a new tab.</li>
              <li>Come back here, copy the generated Markdown, and paste it into <span className="text-gray-100">Actual Markdown</span>.</li>
              <li>Copy the original HTML here and paste it into <span className="text-gray-100">Problematic HTML</span>.</li>
              <li>In the new tab, fill in <span className="text-gray-100">Expected Markdown</span> and <span className="text-gray-100">Reason</span>.</li>
            </ol>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded border border-accent px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10"
              >
                <IssueOpenedIcon size={14} />
                Open Blank Report Form
              </a>
              <button
                onClick={handleCopyMarkdown}
                className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-sm transition-colors cursor-pointer ${markdownCopied ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-600 text-gray-300 hover:border-accent hover:text-accent'}`}
              >
                {markdownCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                {markdownCopied ? 'Markdown Copied!' : 'Copy Markdown'}
              </button>
              <button
                onClick={handleCopyHtml}
                className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-sm transition-colors cursor-pointer ${htmlCopied ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-600 text-gray-300 hover:border-accent hover:text-accent'}`}
              >
                {htmlCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                {htmlCopied ? 'HTML Copied!' : 'Copy HTML'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
