import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => set({ toasts: [] }),
}));

/**
 * Trích xuất message thân thiện với người dùng từ response lỗi của backend (NestJS/Axios)
 */
export function getBackendErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  const axiosError = err as {
    response?: {
      data?: {
        message?: string | string[];
        error?: string;
      };
    };
    message?: string;
  };

  const serverMsg = axiosError.response?.data?.message;
  if (Array.isArray(serverMsg) && serverMsg.length > 0) {
    return serverMsg.join(', ');
  }
  if (typeof serverMsg === 'string' && serverMsg.trim()) {
    return serverMsg;
  }

  if (typeof axiosError.response?.data?.error === 'string') {
    return axiosError.response.data.error;
  }

  if (typeof axiosError.message === 'string' && axiosError.message.trim()) {
    return axiosError.message;
  }

  return fallback;
}

/**
 * Helper toàn cục để gọi toast ở bất kỳ đâu (trong component hoặc ngoài hook)
 */
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'success', duration),

  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'error', duration),

  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'info', duration),

  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'warning', duration),

  /**
   * Bắt trực tiếp response lỗi từ backend và hiển thị toast error với message tương ứng
   */
  fromBackend: (err: unknown, fallback = 'Đã có lỗi xảy ra', duration?: number) => {
    const msg = getBackendErrorMessage(err, fallback);
    return useToastStore.getState().addToast(msg, 'error', duration);
  },

  /**
   * Bắt response thành công từ backend và hiển thị toast success
   */
  fromBackendSuccess: (res: unknown, fallback = 'Thao tác thành công', duration?: number) => {
    const resData = res as { data?: { message?: string } } | undefined;
    const msg = resData?.data?.message || fallback;
    return useToastStore.getState().addToast(msg, 'success', duration);
  },
};
