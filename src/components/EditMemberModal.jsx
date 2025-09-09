import { useState, useEffect } from 'react';
import GenericModal from './GenericModal';
import './EditMemberModal.css';

const AVATAR_COLORS = [
  { name: 'Yellow', hex: '#FFF48D' },
  { name: 'Orange', hex: '#FCDD8C' },
  { name: 'Salmon', hex: '#F4B3BB' },
  { name: 'Pink', hex: '#DEB2FA' },
  { name: 'Purple', hex: '#B2AEFF' },
  { name: 'Blue', hex: '#BADAF8' },
  { name: 'Turquoise', hex: '#C1FDFD' },
  { name: 'Green', hex: '#D2FCC3' },
  { name: 'Gray', hex: '#ECECEC' },
];


const EditMemberModal = ({ 
  isOpen, 
  onClose, 
  member, 
  onUpdate, 
  onDelete 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    avatarColor: '#FFF48D',
    schoolPlanImage: null,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        avatarColor: member.avatarColor || member.color || '#FFF48D',
        schoolPlanImage: member.schoolPlanImage || null,
      });
    }
    setShowDeleteConfirm(false);
  }, [member]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // For now, just store the file object. Later we'll implement actual upload
      setFormData(prev => ({
        ...prev,
        schoolPlanImage: file
      }));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      schoolPlanImage: null
    }));
  };


  const handleSave = () => {
    if (formData.name.trim()) {
      const updatedMember = {
        ...member,
        name: formData.name.trim(),
        avatarColor: formData.avatarColor,
        schoolPlanImage: formData.schoolPlanImage,
      };
      onUpdate(updatedMember);
      onClose();
    }
  };

  const handleDelete = () => {
    onDelete(member.id);
    onClose();
  };

  const getInitials = (name) => {
    if (!name) return 'NN';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleModalClose = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!member) return null;

  return (
    <GenericModal 
      isOpen={isOpen} 
      onClose={handleModalClose} 
      title="Edit Family Member"
    >
      <div className="edit-member-content">
        {/* Basic Information Section */}
        <div className="modal-section">
          <div className="section-header">
            <h3 className="section-title">Basic Information</h3>
            <p className="section-description">
              Update the member's name and avatar appearance
            </p>
          </div>

          <div className="basic-info-form">
            <div className="avatar-preview-section">
              <div className="avatar-preview" style={{ backgroundColor: formData.avatarColor }}>
                <span className="avatar-initials">
                  {getInitials(formData.name)}
                </span>
              </div>
              <div className="avatar-info">
                <label htmlFor="member-name" className="form-label">
                  Full Name
                </label>
                <input
                  type="text"
                  id="member-name"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="color-picker-section">
              <label className="form-label">Avatar Color</label>
              <div className="color-options">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color.hex}
                    className={`color-option ${
                      formData.avatarColor === color.hex ? 'selected' : ''
                    }`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => handleInputChange('avatarColor', color.hex)}
                    aria-label={`Select ${color.name}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* School Plan Section */}
        <div className="modal-section">
          <div className="section-header">
            <h3 className="section-title">School Plan</h3>
            <p className="section-description">
              Upload a picture of the weekly school schedule or plan
            </p>
          </div>

          <div className="school-plan-form">
            {formData.schoolPlanImage ? (
              <div className="image-preview-container">
                <div className="image-preview">
                  {formData.schoolPlanImage instanceof File ? (
                    <img
                      src={URL.createObjectURL(formData.schoolPlanImage)}
                      alt="School plan preview"
                      className="preview-image"
                    />
                  ) : (
                    <img
                      src={formData.schoolPlanImage}
                      alt="School plan"
                      className="preview-image"
                    />
                  )}
                </div>
                <div className="image-actions">
                  <span className="image-name">
                    {formData.schoolPlanImage instanceof File 
                      ? formData.schoolPlanImage.name 
                      : 'School Plan Image'
                    }
                  </span>
                  <button
                    type="button"
                    className="button-remove-image"
                    onClick={handleRemoveImage}
                    aria-label="Remove school plan image"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-area">
                <input
                  type="file"
                  id="school-plan-upload"
                  className="file-input"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleFileUpload}
                />
                <label htmlFor="school-plan-upload" className="upload-label">
                  <div className="upload-icon">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 48 48"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M24 16V32M16 24H32"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="6"
                        y="6"
                        width="36"
                        height="36"
                        rx="5"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="upload-text">
                    <span className="upload-title">Upload School Plan</span>
                    <span className="upload-subtitle">
                      Click to select an image file (JPEG, PNG, or GIF)
                    </span>
                    <span className="upload-note">Maximum file size: 5MB</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <div className="primary-actions">
            <button
              className="button button-primary"
              onClick={handleSave}
              disabled={!formData.name.trim()}
            >
              Save Changes
            </button>
            <button 
              className="button button-secondary" 
              onClick={handleModalClose}
            >
              Cancel
            </button>
          </div>

          <div className="danger-actions">
            {showDeleteConfirm ? (
              <div className="delete-confirm-group">
                <span className="delete-confirm-text">Are you sure?</span>
                <button
                  className="button button-danger-confirm"
                  onClick={handleDelete}
                >
                  Yes, Delete
                </button>
                <button
                  className="button button-secondary-small"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="button button-danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Member
              </button>
            )}
          </div>
        </div>
      </div>
    </GenericModal>
  );
};

export default EditMemberModal;
