'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Warning, Info, XCircle, X } from '@phosphor-icons/react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const VARIANT_CONFIG: Record<ToastVariant, { icon: typeof CheckCircle; className: string }> = {
  success: { icon: CheckCircle, className: 'toast-success' },
  error: { icon: XCircle, className: 'toast-error' },
  info: { icon: Info, className: 'toast-info' },
  warning: { icon: Warning, className: 'toast-warning' },
};

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  error: 6000,
  info: 4000,
  warning: 5000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mounted gate for SSR-safe portal
  useEffect(() => { setMounted(true); }, []);

  const removeToast = useCallback((id: string) => {
    const timers = timersRef.current;
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = 'info',
      options?: { duration?: number; action?: { label: string; onClick: () => void } }
    ) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const duration = options?.duration ?? DEFAULT_DURATIONS[variant];
      const toast: Toast = { id, message, variant, duration, action: options?.action };

      setToasts((prev) => [...prev.slice(-4), toast]);

      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && createPortal(
        <div className="toast-container" role="status" aria-live="polite">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => {
              const { icon: Icon, className } = VARIANT_CONFIG[toast.variant];
              return (
                <motion.div
                  key={toast.id}
                  className={`toast ${className}`}
                  layout
                  initial={{ opacity: 0, x: 60, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 60, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <Icon size={18} weight="fill" className="toast-icon" />
                  <span className="toast-message">{toast.message}</span>
                  {toast.action && (
                    <button
                      className="toast-action"
                      onClick={() => {
                        toast.action!.onClick();
                        removeToast(toast.id);
                      }}
                    >
                      {toast.action.label}
                    </button>
                  )}
                  <button
                    className="toast-close"
                    onClick={() => removeToast(toast.id)}
                    aria-label="Fechar notificacao"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
