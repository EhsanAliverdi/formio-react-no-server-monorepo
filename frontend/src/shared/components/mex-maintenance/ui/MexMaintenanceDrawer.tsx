import { ReactNode } from "react";

interface MexMaintenanceDrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function MexMaintenanceDrawer({
  isOpen,
  title,
  onClose,
  children,
  footer,
}: MexMaintenanceDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/30 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review details and update records as needed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
          >
            Close
          </button>
        </div>
        <div className="mt-6 space-y-6">{children}</div>
        {footer && <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">{footer}</div>}
      </div>
    </div>
  );
}
