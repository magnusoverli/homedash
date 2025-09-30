/**
 * Modal utility functions for the application
 */

/**
 * Create a backdrop click handler that closes the modal
 * only when clicking directly on the backdrop (not children)
 * 
 * @param {Function} onClose - Callback to close the modal
 * @returns {Function} Event handler function
 * 
 * @example
 * const handleBackdropClick = createBackdropClickHandler(onClose);
 * 
 * return (
 *   <div className="modal-backdrop" onClick={handleBackdropClick}>
 *     <div className="modal-content">...</div>
 *   </div>
 * );
 */
export const createBackdropClickHandler = onClose => {
  return e => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
};
