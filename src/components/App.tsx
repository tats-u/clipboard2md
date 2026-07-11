import { useState, useEffect, useCallback } from 'react';
import { htmlToMarkdown } from '../lib/html-to-markdown';
import { splitShortcutLabel } from '../lib/shortcut-label';
import { SettingsProvider, useSettings } from './SettingsContext';
import MarkdownTab from './MarkdownTab';
import HtmlTab from './HtmlTab';
import Toast from './Toast';
import SettingsPanel from './Settings';
import HtmlEditDialog from './HtmlEditDialog';
import { MarkGithubIcon } from '@primer/octicons-react';
import DOMPurify from 'dompurify';

type Tab = 'markdown' | 'html';

interface AppProps {
  base: string;
}

export default function App({ base }: AppProps) {
  return (
    <SettingsProvider>
      <AppContent base={base} />
    </SettingsProvider>
  );
}

function AppContent({ base }: { base: string }) {
  const { settings } = useSettings();
  const [originalHtml, setOriginalHtml] = useState('');
  const [html, setHtml] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('markdown');
  const [isHtmlEditDialogOpen, setIsHtmlEditDialogOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAppleDevice, setIsAppleDevice] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  useEffect(() => {
    setIsHydrated(true);

    const nav = window.navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    // Some browsers expose the platform via userAgentData, while others only expose
    // navigator.platform or the raw userAgent string.
    const platform = nav.userAgentData?.platform
      ?? window.navigator.platform
      ?? window.navigator.userAgent;
    setIsAppleDevice(/Mac|iPhone|iPad|iPod/i.test(platform));
  }, []);

  const isPasteTargetEditable = useCallback(
    (target: EventTarget | null) => target instanceof Element
      && target.closest('input, textarea, select, [contenteditable="true"]') !== null,
    [],
  );

  // Paste handler — only captures HTML from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isPasteTargetEditable(e.target)) {
        return;
      }

      const clipboardHtml = e.clipboardData?.getData('text/html');
      if (clipboardHtml) {
        const sanitizedHtml = DOMPurify.sanitize(clipboardHtml);
        setOriginalHtml(sanitizedHtml);
        setHtml(sanitizedHtml);
        setIsHtmlEditDialogOpen(false);
        return;
      }

      // Determine the best toast message when no HTML is found
      const types = e.clipboardData?.types ?? [];
      const items = e.clipboardData?.items;

      // Check for media types (image/video/audio)
      const mediaTypePattern = /^(image|video|audio)\//;
      let mediaKind: string | undefined;
      for (const t of types) {
        const m = mediaTypePattern.exec(t);
        if (m) { mediaKind = m[1]; break; }
      }
      if (!mediaKind && items) {
        for (let i = 0; i < items.length; i++) {
          const m = mediaTypePattern.exec(items[i].type);
          if (m) { mediaKind = m[1]; break; }
        }
      }

      if (mediaKind) {
        showToast(`Clipboard contains ${mediaKind} data, not text content`);
      } else if (types.includes('text/plain')) {
        showToast('No HTML found in clipboard (plain text can be pasted as-is)');
      } else {
        showToast('No HTML found in clipboard');
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isPasteTargetEditable, showToast]);

  // Conversion effect — runs when html or settings change
  useEffect(() => {
    if (!html) {
      // Keep the derived Markdown state in sync when edited HTML is cleared or discarded.
      setMarkdown('');
      return;
    }
    let cancelled = false;

    htmlToMarkdown(html, settings)
      .then(md => { if (!cancelled) setMarkdown(md); })
      .catch(() => { if (!cancelled) showToast('Failed to convert HTML to Markdown'); });

    return () => { cancelled = true; };
  }, [html, settings, showToast]);

  const hasContent = html.length > 0;
  const pasteShortcutLabel = isAppleDevice ? '⌘+V' : 'Ctrl+V';
  const pasteShortcutParts = splitShortcutLabel(pasteShortcutLabel);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'markdown', label: 'Markdown' },
    { id: 'html', label: 'HTML' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 min-h-screen flex flex-col">
      <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-lg text-gray-500 font-mono tracking-widest select-none">
          clipboard<span className="text-accent">2</span>md
        </h1>
        <div className="flex items-center gap-1">
          <a
            href="https://github.com/tats-u/clipboard2md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-accent transition-colors p-1"
            title="GitHub"
            aria-label="View source code on GitHub"
          >
            <MarkGithubIcon size={16} />
          </a>
          <SettingsPanel />
        </div>
      </header>

      {hasContent ? (
        <>
          {/* Tab bar */}
          <nav className="flex gap-1 border-b border-gray-800 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer
                  border-b-2 -mb-px
                  ${activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <main>
            {activeTab === 'markdown' ? (
              <MarkdownTab
                html={html}
                markdown={markdown}
                onOpenHtmlEditor={() => setIsHtmlEditDialogOpen(true)}
              />
            ) : (
              <HtmlTab
                html={html}
                markdown={markdown}
                onToast={showToast}
                onOpenHtmlEditor={() => setIsHtmlEditDialogOpen(true)}
              />
            )}
          </main>
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center select-none">
          {isHydrated ? (
            <>
              <p className="text-gray-500 text-lg mb-3">
                Paste HTML content here
              </p>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <div className="flex items-center gap-1">
                  {pasteShortcutParts.map((part, index) => (
                    <div key={part} className="flex items-center gap-1">
                      <kbd className="px-2.5 py-1 rounded border border-gray-700 bg-gray-900 text-gray-400 text-xs font-mono shadow-sm">
                        {part}
                      </kbd>
                      {index < pasteShortcutParts.length - 1 && (
                        <span className="text-gray-500">+</span>
                      )}
                    </div>
                  ))}
                </div>
                <span>to convert</span>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-lg mb-3">
              Preparing... please wait a moment
            </p>
          )}
          <span className="mt-6 text-accent text-2xl animate-blink">▌</span>
        </div>
      )}

      {/* Footer */}
      <HtmlEditDialog
        open={isHtmlEditDialogOpen}
        currentHtml={html}
        originalHtml={originalHtml}
        onApply={(nextHtml) => {
          setHtml(nextHtml);
          setIsHtmlEditDialogOpen(false);
        }}
        onClose={() => setIsHtmlEditDialogOpen(false)}
      />
      <footer className="mt-auto pt-6 text-center text-xs text-gray-500">
        <p className="mb-1">
          Your pasted content never leaves your device — all processing happens in your browser.
        </p>
        <a
          href={`${base}privacy/`}
          className="text-gray-400 hover:text-gray-300 transition-colors"
        >
          Privacy Policy – See details
        </a>
      </footer>
    </div>
  );
}
