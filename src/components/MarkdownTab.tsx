import { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { CopyIcon, CheckIcon, QuoteIcon } from '@primer/octicons-react';
import CodeBlock from './CodeBlock';
import { useSettings } from './SettingsContext';
import { sanitizeSchema } from '../lib/settings';

interface MarkdownTabProps {
  markdown: string;
}

export default function MarkdownTab({ markdown }: MarkdownTabProps) {
  const [copied, setCopied] = useState(false);
  const [quoteCopied, setQuoteCopied] = useState(false);
  const { settings } = useSettings();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  }, [markdown]);

  const handleCopyAsQuote = useCallback(async () => {
    try {
      const quoted = markdown
        .split('\n')
        .map((line) => (line === '' ? '>' : `> ${line}`))
        .join('\n');
      await navigator.clipboard.writeText(quoted);
      setQuoteCopied(true);
      setTimeout(() => setQuoteCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  }, [markdown]);

  const remarkPlugins = useMemo(
    () => settings.brStyle === 'newline'
      ? [remarkGfm, remarkBreaks]
      : [remarkGfm],
    [settings.brStyle],
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
          <div className="flex items-center gap-2">
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
        <CodeBlock code={markdown} lang="markdown" />
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
            {markdown}
          </ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
