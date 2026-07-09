import { useMemo } from 'react';
import { markdown } from '@codemirror/lang-markdown';
import CodeEditor from './CodeEditor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const extensions = useMemo(() => [markdown()], []);

  return (
    <CodeEditor
      value={value}
      onChange={onChange}
      ariaLabel="Markdown source editor"
      extensions={extensions}
    />
  );
}
