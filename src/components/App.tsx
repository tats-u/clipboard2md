import { useState, useEffect, useCallback } from 'react';
import { htmlToMarkdown } from '../lib/html-to-markdown';
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

const MEDIA_TYPE_PATTERN = /^(image|video|audio)\//;

function getNoHtmlFoundMessage(clipboardTypes: readonly string[], itemTypes: readonly string[] = []) {
  for (const type of [...clipboardTypes, ...itemTypes]) {
    const mediaTypeMatch = MEDIA_TYPE_PATTERN.exec(type);
    if (mediaTypeMatch) {
      return `Clipboard contains ${mediaTypeMatch[1]} data, not text content`;
    }
  }

  if (clipboardTypes.includes('text/plain') || itemTypes.includes('text/plain')) {
    return 'No HTML found in clipboard (plain text can be pasted as-is)';
  }

  return 'No HTML found in clipboard';
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
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);

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

  const applyClipboardHtml = useCallback((clipboardHtml: string) => {
    const sanitizedHtml = DOMPurify.sanitize(clipboardHtml);
    setOriginalHtml(sanitizedHtml);
    setHtml(sanitizedHtml);
    setIsHtmlEditDialogOpen(false);
  }, []);

  // Paste handler — only captures HTML from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isPasteTargetEditable(e.target)) {
        return;
      }

      const clipboardHtml = e.clipboardData?.getData('text/html');
      if (clipboardHtml) {
        applyClipboardHtml(clipboardHtml);
        return;
      }

      showToast(getNoHtmlFoundMessage(
        Array.from(e.clipboardData?.types ?? []),
        Array.from(e.clipboardData?.items ?? [], item => item.type),
      ));
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [applyClipboardHtml, isPasteTargetEditable, showToast]);

  const handlePasteButtonClick = useCallback(async () => {
    if (isReadingClipboard) {
      return;
    }

    if (!navigator.clipboard) {
      showToast('Clipboard access is unavailable in this browser');
      return;
    }

    setIsReadingClipboard(true);

    try {
      if (typeof navigator.clipboard.read === 'function') {
        const items = await navigator.clipboard.read();
        const clipboardTypes: string[] = [];

        for (const item of items) {
          clipboardTypes.push(...item.types);

          if (!item.types.includes('text/html')) {
            continue;
          }

          const clipboardHtml = await (await item.getType('text/html')).text();
          applyClipboardHtml(clipboardHtml);
          return;
        }

        showToast(getNoHtmlFoundMessage(clipboardTypes));
        return;
      }

      if (typeof navigator.clipboard.readText === 'function') {
        const clipboardText = await navigator.clipboard.readText();
        showToast(getNoHtmlFoundMessage(clipboardText ? ['text/plain'] : []));
        return;
      }

      showToast('Clipboard access is unavailable in this browser');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        showToast('Clipboard access was blocked — allow paste access and try again');
      } else {
        showToast('Failed to read from the clipboard');
      }
    } finally {
      setIsReadingClipboard(false);
    }
  }, [applyClipboardHtml, isReadingClipboard, showToast]);

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
  const modifierKey = isAppleDevice ? '⌘' : 'Ctrl';

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
              <div className="empty-state-shortcut flex items-center gap-2 text-gray-600 text-sm">
                <div className="flex items-center gap-1">
                  <kbd className="px-2.5 py-1 rounded border border-gray-700 bg-gray-900 text-gray-400 text-xs font-mono shadow-sm">
                    {modifierKey}
                  </kbd>
                  <span className="text-gray-500">+</span>
                  <kbd className="px-2.5 py-1 rounded border border-gray-700 bg-gray-900 text-gray-400 text-xs font-mono shadow-sm">
                    V
                  </kbd>
                </div>
                <span>to convert</span>
              </div>
              <button
                type="button"
                onClick={handlePasteButtonClick}
                disabled={isReadingClipboard}
                className="empty-state-paste-button mt-1 items-center justify-center rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors duration-200 cursor-pointer hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
              >
                {isReadingClipboard ? 'Reading clipboard…' : 'Paste and convert'}
              </button>
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
