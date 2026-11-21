import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  showForceOption?: boolean;
  onForceToggle?: (force: boolean) => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading,
  showForceOption = false,
  onForceToggle,
}: ConfirmDialogProps) {
  const [force, setForce] = useState(false);

  const handleConfirm = () => {
    if (showForceOption && onForceToggle) {
      onForceToggle(force);
    }
    onConfirm();
  };

  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="p-6">
            {variant === 'danger' && (
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{title}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">{message}</p>

            {showForceOption && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                    className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-amber-800">
                    Force delete (product has transaction history)
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${variantStyles[variant]}`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Need to import useState
import { useState } from 'react';