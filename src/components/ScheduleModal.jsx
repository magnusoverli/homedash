import { useState } from 'react';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { createBackdropClickHandler } from '../utils/modalUtils';
import { validateImageFile } from '../utils/fileValidation';
import CloseIcon from './icons/CloseIcon';
import UploadIcon from './icons/UploadIcon';
import './ScheduleModal.css';

const ScheduleModal = ({ isOpen, onClose, title, children }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  
  useModalKeyboard(isOpen, onClose);

  const handleFileSelect = e => {
    const file = e.target.files[0];
    const validation = validateImageFile(file, 10);
    if (validation.valid) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = e => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    const validation = validateImageFile(file, 10);
    if (validation.valid) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = e => {
    e.stopPropagation();
    setSelectedFile(null);
  };

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

        <div className="modal-body">
          <div className="modal-section">
            <div className="section-header">
              <h3 className="section-title">Import Week Plan</h3>
              <p className="section-description">
                Upload an image of your week plan (JPG, PNG, or similar)
              </p>
            </div>

            <div
              className={`file-upload-area ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <div className="upload-icon">
                <UploadIcon size={48} />
              </div>

              <div className="upload-text">
                {selectedFile ? (
                  <div>
                    <p className="file-name">{selectedFile.name}</p>
                    <p className="file-size">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="upload-primary">
                      Click to upload or drag and drop
                    </p>
                    <p className="upload-secondary">PNG, JPG, GIF up to 10MB</p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <button
                  className="remove-file-button"
                  onClick={handleRemoveFile}
                  aria-label="Remove file"
                >
                  <CloseIcon size={20} />
                </button>
              )}
            </div>

            {selectedFile && (
              <div className="upload-actions">
                <button className="import-button">Import Week Plan</button>
              </div>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
