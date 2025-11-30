"use client";
import * as React from "react";

// Minimal toast context. Replace with a more robust system later.

type Toast = { id: number; title?: string; description?: string };

const ToastContext = React.createContext<{
  toasts: Toast[];
  add: (t: Omit<Toast, "id">) => void;
  remove: (id: number) => void;
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const add = (t: Omit<Toast, "id">) =>
    setToasts((prev) => [...prev, { id: Date.now(), ...t }]);
  const remove = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));
  return (
    <ToastContext.Provider value={{ toasts, add, remove }}>
      {children}
      <div className="fixed right-4 bottom-4 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-background rounded-md border p-3 shadow"
          >
            {t.title && <div className="text-sm font-medium">{t.title}</div>}
            {t.description && (
              <div className="text-muted-foreground text-sm">
                {t.description}
              </div>
            )}
            <button
              className="text-primary mt-2 text-xs"
              onClick={() => remove(t.id)}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
