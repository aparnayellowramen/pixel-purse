"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

const ToastContext = createContext<(text: string, undo?: () => void) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((text: string, undo?: () => void) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), text, undo });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="ov-toast-wrap" role="status" aria-live="polite">
        {toast && (
          <div className="ov-toast" key={toast.id}>
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                className="btn ghost"
                onClick={() => {
                  const u = toast.undo;
                  clearTimeout(timer.current);
                  setToast(null);
                  u?.();
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
