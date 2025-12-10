import { useState, useCallback, createContext, useContext } from 'react';
import Toast from './Toast';
import './Toast.css';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 5000) => {
    const id = toastIdCounter++;
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration = 5000) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message, duration = 5000) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message, duration = 5000) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message, duration = 5000) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if not in provider
    const [toasts, setToasts] = useState([]);
    let toastIdCounter = 0;

    const showToast = (message, type = 'success', duration = 5000) => {
      const id = toastIdCounter++;
      const newToast = { id, message, type, duration };
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
      return id;
    };

    const removeToast = (id) => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return {
      toasts,
      showToast,
      success: (msg, dur) => showToast(msg, 'success', dur),
      error: (msg, dur) => showToast(msg, 'error', dur),
      warning: (msg, dur) => showToast(msg, 'warning', dur),
      info: (msg, dur) => showToast(msg, 'info', dur),
      removeToast
    };
  }
  return context;
};

export const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastContainer;

