import { useState, useCallback, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkCjkFriendlyGfmStrikethrough from 'remark-cjk-friendly-gfm-strikethrough';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { CopyIcon, CheckIcon, QuoteIcon } from '@primer/octicons-react';
import CodeBlock from './CodeBlock';
import ReportConversionBugButton from './ReportConversionBugButton';
import { useSettings } from './SettingsContext';
import { sanitizeSchema } from '../lib/settings';
import { quoteMarkdown } from '../lib/quote-markdown';
import ConfirmDialog from './ConfirmDialog';

interface MarkdownTabProps {
  html: string;
  markdown: string;
}

export default function MarkdownTab({ html, markdown }: MarkdownTabProps) {
  const [copied, setCopied] = useState(false);
  const [quoteCopied, setQuoteCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftMarkdown, setDraftMarkdown] = useState(markdown);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const { settings } = useSettings();
  const currentMarkdown = isEditing ? draftMarkdown : markdown;
  const hasUnsavedChanges = isEditing && draftMarkdown !== markdown;

  useEffect(() => {
    if (!isEditing) {
      setDraftMarkdown(markdown);
    }
  }, [isEditing, markdown]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  }, [currentMarkdown]);

  const handleCopyAsQuote = useCallback(async () => {
    try {
      const quoted = quoteMarkdown(currentMarkdown);
      await navigator.clipboard.writeText(quoted);
      setQuoteCopied(true);
      setTimeout(() => setQuoteCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  }, [currentMarkdown]);

  const handleReadonlyMode = useCallback(() => {
    if (!isEditing) return;

    if (draftMarkdown !== markdown) {
      setShowDiscardDialog(true);
      return;
    }

    setIsEditing(false);
  }, [draftMarkdown, isEditing, markdown]);

  const handleEditMode = useCallback(() => {
    if (isEditing) return;
    setDraftMarkdown(markdown);
    setIsEditing(true);
  }, [isEditing, markdown]);

  const handleConfirmDiscard = useCallback(() => {
    setDraftMarkdown(markdown);
    setIsEditing(false);
    setShowDiscardDialog(false);
  }, [markdown]);

  const remarkPlugins = useMemo(
    () => {
      const plugins: any[] = [remarkGfm];

      if (settings.brStyle === 'newline') {
        plugins.push(remarkBreaks);
      }

      if (!settings.strictCommonMark) {
        plugins.push(remarkCjkFriendly, remarkCjkFriendlyGfmStrikethrough);
      }

      return plugins;
    },
    [settings.brStyle, settings.strictCommonMark],
  );

  const rehypePlugins = useMemo(
    () => settings.allowRawHtml
      ? [rehypeRaw, [rehypeSanitize, sanitizeSchema] as any]
      : [],
    [settings.allowRawHtml],
  );

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
                onClick={handleReadonlyMode}
                className={`px-3 py-1 text-xs transition-colors cursor-pointer ${!isEditing ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Read-only
              </button>
              <button
                onClick={handleEditMode}
                className={`border-l border-gray-700 px-3 py-1 text-xs transition-colors cursor-pointer ${isEditing ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Edit
              </button>
            </div>
            <ReportConversionBugButton html={html} markdown={currentMarkdown} />
            <button
              onClick={handleCopyAsQuote}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-colors duration-200 cursor-pointer
                ${quoteCopied
                  ? 'border-green-500 text-green-400 bg-green-500/10'
                  : 'border-gray-600 text-gray-300 hover:border-accent hover:text-accent copy-breathe'
                }`}
            >
              {quoteCopied ? <CheckIcon size={14} /> : <QuoteIcon size={14} />}
              {quoteCopied ? 'Copied!' : 'Copy as Quote'}
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-colors duration-200 cursor-pointer
                ${copied
                  ? 'border-green-500 text-green-400 bg-green-500/10'
                  : 'border-gray-600 text-gray-300 hover:border-accent hover:text-accent copy-breathe'
                }`}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        {isEditing ? (
          <textarea
            value={draftMarkdown}
            onChange={(event) => setDraftMarkdown(event.target.value)}
            className="min-h-[18rem] max-h-[50vh] w-full resize-y overflow-auto rounded border border-gray-700 bg-[#121212] p-4 font-mono text-sm leading-relaxed text-gray-100 outline-none transition-colors focus:border-accent"
            spellCheck={false}
            aria-label="Markdown source editor"
          />
        ) : (
          <CodeBlock code={currentMarkdown} lang="markdown" />
        )}
      </section>

      {/* Preview section */}
      <section>
        <div className="mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Preview
          </h2>
        </div>
        <div className="md-preview bg-gray-800 text-gray-200 p-4 rounded overflow-auto max-h-[50vh] text-sm">
          <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
            {currentMarkdown}
          </ReactMarkdown>
        </div>
      </section>
      <ConfirmDialog
        open={showDiscardDialog}
        title="Discard Markdown edits?"
        description="The edited Markdown differs from the generated result. Discard your edits and switch back to read-only?"
        confirmLabel="Discard edits"
        cancelLabel="Keep editing"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardDialog(false)}
      />
    </div>
  );
}
