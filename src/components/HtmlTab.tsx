import CodeBlock from './CodeBlock';

interface HtmlTabProps {
  html: string;
}

export default function HtmlTab({ html }: HtmlTabProps) {
  return (
    <div className="space-y-4">
      {/* Source section */}
      <section>
        <div className="mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Source
          </h2>
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
