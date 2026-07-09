import { useState, useCallback, useEffect, useMemo } from 'react';
import { CopyIcon, CheckIcon } from '@primer/octicons-react';
import CodeBlock from './CodeBlock';
import ReportConversionBugButton from './ReportConversionBugButton';
import { formatHtml } from '../lib/format-html';

interface HtmlTabProps {
  html: string;
  markdown: string;
  onToast: (message: string) => void;
  onOpenHtmlEditor: () => void;
}

export default function HtmlTab({ html, markdown, onToast, onOpenHtmlEditor }: HtmlTabProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'formatted'>('raw');
  const [formattedHtml, setFormattedHtml] = useState<string | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);

  useEffect(() => {
    if (viewMode !== 'formatted') return;

    let cancelled = false;
    setIsFormatting(true);
    setFormattedHtml(null);

    formatHtml(html)
      .then((result) => {
        if (!cancelled) {
          setFormattedHtml(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFormattedHtml(html);
          onToast('Failed to format HTML');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFormatting(false);
        }
      });

    return () => { cancelled = true; };
  }, [html, onToast, viewMode]);

  const displayedHtml = useMemo(
    () => (viewMode === 'formatted' && formattedHtml !== null ? formattedHtml : html),
    [formattedHtml, html, viewMode],
  );

  const handleCopyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  }, [displayedHtml]);

  return (
    <div className="space-y-4">
      {/* Source section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Source
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded border border-gray-700">
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 text-xs transition-colors cursor-pointer ${viewMode === 'raw' ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Raw HTML
              </button>
              <button
                onClick={() => setViewMode('formatted')}
                className={`border-l border-gray-700 px-3 py-1 text-xs transition-colors cursor-pointer ${viewMode === 'formatted' ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {isFormatting ? 'Formatting…' : 'Formatted'}
              </button>
            </div>
            <ReportConversionBugButton html={html} markdown={markdown} onEditHtml={onOpenHtmlEditor} />
            <button
              onClick={handleCopyHtml}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-colors duration-200 cursor-pointer
                ${copied
                  ? 'border-green-500 text-green-400 bg-green-500/10'
                  : 'border-gray-600 text-gray-300 hover:border-accent hover:text-accent copy-breathe'
                }`}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? 'Copied!' : 'Copy HTML'}
            </button>
          </div>
        </div>
        <CodeBlock code={displayedHtml} lang="html" />
      </section>

      {/* Rendered section */}
      <section>
        <div className="mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Rendered
          </h2>
        </div>
        <div
          className="html-preview bg-white text-gray-900 [&_a]:text-[revert] [&_a]:underline p-4 rounded overflow-auto max-h-[50vh] border border-gray-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    </div>
  );
}
