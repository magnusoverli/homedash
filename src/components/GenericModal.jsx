import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { createBackdropClickHandler } from '../utils/modalUtils';
import './GenericModal.css';

const GenericModal = ({ isOpen, onClose, title, children }) => {
  useModalKeyboard(isOpen, onClose);

  if (!isOpen) return null;

  const handleBackdropClick = createBackdropClickHandler(onClose);

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <button
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {title && <h2 className="modal-title">{title}</h2>}
          <div className="modal-header-spacer"></div>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export default GenericModal;
