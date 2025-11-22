import { XIcon } from "lucide-react";
import { useEffect } from "react";
import { Toast as ToastType } from "./use-toast";

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  // 自动消失
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div 
      className={`p-4 rounded-md shadow-md flex items-start gap-3 ${
        toast.variant === "destructive" ? "bg-red-50 text-red-900" : "bg-white"
      }`}
    >
      <div className="flex-1">
        <h3 className="font-medium">{toast.title}</h3>
        {toast.description && (
          <p className="text-sm text-gray-600">{toast.description}</p>
        )}
      </div>
      <button 
        onClick={() => onDismiss(toast.id)}
        className="text-gray-500 hover:text-gray-700"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  // 这个组件将在全局_app.tsx中使用
  const { toasts, dismiss } = require("./use-toast").useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {toasts.map((toast: ToastType) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
} 