/**
 * Toast Utility
 * 
 * A simple event-based toast notification system that works with the Toast component.
 * Use showToast() from anywhere in your application to display toast notifications.
 */

// Event name for toast notifications
const TOAST_EVENT = 'show-toast';

/**
 * Display a toast notification
 * @param {string|Object} messageOrOptions - Toast message or options object
 * @param {string} type - Toast type: 'success' | 'error' | 'warning' | 'info' (if first param is string)
 * @param {number} duration - Auto-dismiss duration in ms (default: 5000)
 */
export function showToast(messageOrOptions, type = 'info', duration = 5000) {
  let options;
  
  // Support both calling patterns:
  // 1. showToast('Message', 'success')
  // 2. showToast({ message: 'Message', type: 'success' })
  if (typeof messageOrOptions === 'string') {
    options = {
      message: messageOrOptions,
      type: type,
      duration: typeof duration === 'number' ? duration : 5000,
      position: 'top-right'
    };
  } else if (messageOrOptions && typeof messageOrOptions === 'object') {
    // Ensure message is always a string, never an object
    const messageValue = messageOrOptions.message;
    options = {
      type: messageOrOptions.type || 'info',
      message: typeof messageValue === 'string' ? messageValue : String(messageValue || ''),
      title: messageOrOptions.title,
      duration: typeof messageOrOptions.duration === 'number' ? messageOrOptions.duration : 5000,
      position: messageOrOptions.position || 'top-right'
    };
  } else {
    // Fallback for invalid input
    options = {
      type: 'info',
      message: String(messageOrOptions || ''),
      duration: 5000,
      position: 'top-right'
    };
  }
  
  const event = new CustomEvent(TOAST_EVENT, {
    detail: options
  });
  window.dispatchEvent(event);
}

/**
 * Subscribe to toast events
 * @param {Function} callback - Function to call when toast is shown
 * @returns {Function} Unsubscribe function
 */
export function subscribeToToast(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}

// Convenience methods for common toast types
export const toast = {
  success: (message, title) => showToast({ type: 'success', message, title }),
  error: (message, title) => showToast({ type: 'error', message, title }),
  warning: (message, title) => showToast({ type: 'warning', message, title }),
  info: (message, title) => showToast({ type: 'info', message, title })
};
