import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#121212',
    color: '#f3f4f6',
    fontSize: '0.875rem',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    minHeight: '18rem',
    maxHeight: '50vh',
    overflow: 'auto',
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.625',
  },
  '.cm-content': {
    minHeight: '18rem',
    padding: '1rem',
  },
  '.cm-gutters': {
    minHeight: '18rem',
    border: 'none',
    backgroundColor: '#121212',
    color: '#6b7280',
  },
});

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          markdown(),
          oneDark,
          editorTheme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            'aria-label': 'Markdown source editor',
            spellcheck: 'false',
          }),
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });

    editorRef.current = view;

    return () => {
      view.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();
    if (currentValue === value) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    });
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded border border-gray-700 transition-colors focus-within:border-accent"
    />
  );
}
