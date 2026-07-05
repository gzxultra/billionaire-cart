import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message: string, duration = 3000) => {
    const id = `t-${++counter}`;
    // Cap at 5 visible toasts — oldest dismissed first
    const current = get().toasts;
    const trimmed = current.length >= 5 ? current.slice(1) : current;
    set({ toasts: [...trimmed, { id, message, duration }] });

    if (duration > 0) {
      setTimeout(() => {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      }, duration);
    }
  },

  removeToast: (id: string) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/**
 * Fire-and-forget toast helper — call from any component or callback.
 * No hook rules to follow; uses getState() directly.
 */
export function toast(message: string, duration?: number) {
  useToastStore.getState().addToast(message, duration);
}
