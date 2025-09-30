import { useState } from 'react';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { createBackdropClickHandler } from '../utils/modalUtils';
import './ScheduleModal.css';

const ScheduleModal = ({ isOpen, onClose, title, children }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  
  useModalKeyboard(isOpen, onClose);

  const handleFileSelect = e => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
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
    if (file && file.type.startsWith('image/')) {
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
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
