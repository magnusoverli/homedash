import { useEffect } from 'react';

/**
 * Custom hook to handle modal keyboard interactions
 * - Closes modal on Escape key press
 * - Prevents body scroll when modal is open
 * - Cleans up event listeners on unmount
 * 
 * @param {boolean} isOpen - Whether the modal is currently open
 * @param {Function} onClose - Callback function to close the modal
 * 
 * @example
 * const Modal = ({ isOpen, onClose }) => {
 *   useModalKeyboard(isOpen, onClose);
 *   
 *   if (!isOpen) return null;
 *   return <div>Modal content</div>;
 * };
 */
export const useModalKeyboard = (isOpen, onClose) => {
  useEffect(() => {
    const handleEscape = e => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
};
