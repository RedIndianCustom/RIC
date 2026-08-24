import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal
 * @param {boolean}  isOpen   - controls visibility
 * @param {function} onClose  - called when backdrop / ✕ / Escape pressed
 * @param {string}   title    - header title
 * @param {string}   size     - 'sm' | 'md' (default) | 'lg' | 'xl'
 * @param {node}     children - modal body
 * @param {node}     footer   - optional footer (appended after children)
 */
export default function Modal({ isOpen, title, onClose, children, footer, size = 'md' }) {
  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxW = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[size] ?? 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 px-4 backdrop-blur-lg"
      onClick={onClose}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div
        className={`w-full ${maxW} rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh]`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Optional footer */}
        {footer && (
          <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
