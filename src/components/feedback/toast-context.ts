import { createContext } from "react";

export type ToastTone = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

export type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
