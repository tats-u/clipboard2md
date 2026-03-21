import { useEffect } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
}

export default function Toast({ message, visible, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg
        bg-gray-900/90 border border-gray-700 text-amber-400 text-sm font-mono
        shadow-lg backdrop-blur transition-all duration-300 ease-in-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
    >
      {message}
    </div>
  );
}
