import { useState, useCallback } from 'react';
import { CopyIcon, CheckIcon } from '@primer/octicons-react';
import CodeBlock from './CodeBlock';

interface HtmlTabProps {
  html: string;
}

export default function HtmlTab({ html }: HtmlTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  }, [html]);

  return (
    <div className="space-y-4">
      {/* Source section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Source
          </h2>
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
        <CodeBlock code={html} lang="html" />
      </section>

      {/* Rendered section */}
      <section>
        <div className="mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Rendered
          </h2>
        </div>
        <div
          className="html-preview bg-white text-gray-900 p-4 rounded overflow-auto max-h-[50vh] border border-gray-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    </div>
  );
}
