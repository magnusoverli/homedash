/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback(
    toast => {
      const id = Date.now() + Math.random();
      const newToast = {
        id,
        type: 'info',
        duration: 4000,
        ...toast,
      };

      setToasts(prev => [...prev, newToast]);

      if (newToast.type !== 'error' && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [removeToast]
  );

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showSuccess = useCallback(
    (message, options = {}) => {
      return addToast({
        type: 'success',
        message,
        ...options,
      });
    },
    [addToast]
  );

  const showError = useCallback(
    (message, options = {}) => {
      return addToast({
        type: 'error',
        message,
        duration: 0,
        ...options,
      });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (message, options = {}) => {
      return addToast({
        type: 'warning',
        message,
        ...options,
      });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message, options = {}) => {
      return addToast({
        type: 'info',
        message,
        ...options,
      });
    },
    [addToast]
  );

  const showConfirmation = useCallback(
    (message, onConfirm, onCancel, options = {}) => {
      return addToast({
        type: 'warning',
        message,
        duration: 0,
        actions: [
          {
            label: 'Confirm',
            onClick: onConfirm,
            variant: 'danger',
          },
          {
            label: 'Cancel',
            onClick: onCancel,
            variant: 'secondary',
          },
        ],
        ...options,
      });
    },
    [addToast]
  );

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirmation,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
