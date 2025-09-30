import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { createBackdropClickHandler } from '../utils/modalUtils';
import CloseIcon from './icons/CloseIcon';
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
            <CloseIcon size={24} />
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
