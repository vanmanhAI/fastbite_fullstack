"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const { type, message } = toast;

  const bgColors = {
    success: "bg-green-100 border-green-500",
    error: "bg-red-100 border-red-500",
    warning: "bg-yellow-100 border-yellow-500",
    info: "bg-blue-100 border-blue-500",
  };

  const textColors = {
    success: "text-green-800",
    error: "text-red-800",
    warning: "text-yellow-800",
    info: "text-blue-800",
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  useEffect(() => {
    // Thêm hiệu ứng xuất hiện cho toast
    const toastElement = document.getElementById(`toast-${toast.id}`);
    if (toastElement) {
      toastElement.style.opacity = "0";
      toastElement.style.transform = "translateX(20px)";
      
      // Trigger reflow
      void toastElement.offsetWidth;
      
      toastElement.style.opacity = "1";
      toastElement.style.transform = "translateX(0)";
    }
  }, [toast.id]);

  return (
    <div
      id={`toast-${toast.id}`}
      className={`flex items-center justify-between rounded-md border p-4 shadow-md transition-all duration-300 ${bgColors[type]} min-w-[300px] max-w-md`}
    >
      <div className="flex items-center space-x-3">
        {icons[type]}
        <p className={`text-sm ${textColors[type]}`}>{message}</p>
      </div>
      <button
        onClick={onClose}
        className={`ml-4 rounded-full p-1 hover:bg-opacity-10 hover:bg-gray-500 ${textColors[type]}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}; 