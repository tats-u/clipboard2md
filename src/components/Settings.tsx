import { useState, useRef, useEffect } from 'react';
import { GearIcon } from '@primer/octicons-react';
import { useSettings } from './SettingsContext';

export default function SettingsPanel() {
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-gray-500 hover:text-accent transition-colors p-1 cursor-pointer"
        title="Settings"
      >
        <GearIcon size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl z-50 min-w-[260px]">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-semibold">
            Settings
          </h3>

          {/* List marker */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 block mb-1.5">List marker</label>
            <div className="flex gap-2">
              {(['-', '*', '+'] as const).map(marker => (
                <button
                  key={marker}
                  onClick={() => updateSettings({ listMarker: marker })}
                  className={`px-3 py-1 text-sm rounded border cursor-pointer transition-colors
                    ${settings.listMarker === marker
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                >
                  {marker}
                </button>
              ))}
            </div>
          </div>

          {/* Allow raw HTML */}
          <div>
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowRawHtml}
                onChange={e => updateSettings({ allowRawHtml: e.target.checked })}
                className="accent-[--color-accent] rounded"
              />
              Allow safe HTML tags
            </label>
            <p className="text-[10px] text-gray-600 mt-1 ml-5">
              Preserve non-GFM tags (dl, ruby, details…) in output.
              Dangerous attributes (class, style, on*) are always stripped.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
