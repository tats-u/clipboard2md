import { useEffect, useState, useRef } from 'react';
import { type Highlighter, createHighlighter } from 'shiki';

interface CodeBlockProps {
  code: string;
  lang: 'markdown' | 'html';
}

// Singleton highlighter — created once, shared across all CodeBlock instances
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['vitesse-dark'],
      langs: ['markdown', 'html'],
    });
  }
  return highlighterPromise;
}

export default function CodeBlock({ code, lang }: CodeBlockProps) {
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      const result = highlighter.codeToHtml(code, {
        lang,
        theme: 'vitesse-dark',
      });
      setHtml(result);
    });
    return () => { cancelled = true; };
  }, [code, lang]);

  if (!html) {
    // Fallback while Shiki loads
    return (
      <pre className="bg-[#121212] text-gray-100 p-4 rounded overflow-auto max-h-[50vh] text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded overflow-auto max-h-[50vh] text-sm leading-relaxed [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:!rounded [&_pre]:!bg-[#121212]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
