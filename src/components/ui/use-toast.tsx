import { useState, useEffect, createContext, useContext } from 'react';

type ToastVariant = "default" | "destructive";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextProps {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, title, description, variant }]);
  };

  const dismiss = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export { useToast, ToastProvider }; 