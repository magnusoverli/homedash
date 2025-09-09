import { useState } from 'react';
import './FamilyMemberCard.css';

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

const FamilyMemberCard = ({
  member,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onCancelEdit,
}) => {
  const [editName, setEditName] = useState(member.name);
  const [editColor, setEditColor] = useState(
    member.avatarColor || member.color
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate({
        ...member,
        name: editName.trim(),
        avatarColor: editColor,
      });
    }
  };

  const handleDelete = () => {
    onDelete(member.id);
    setShowDeleteConfirm(false);
  };

  const getInitials = name => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (isEditing) {
    return (
      <div className="member-card member-card-editing">
        <div className="member-avatar" style={{ backgroundColor: editColor }}>
          <span className="member-initials">
            {getInitials(editName || 'NN')}
          </span>
        </div>

        <div className="edit-form">
          <input
            type="text"
            className="edit-name-input"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Name"
            autoFocus
            maxLength={50}
          />

          <div className="color-picker">
            <label className="color-picker-label">Avatar Color</label>
            <div className="color-options">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color.hex}
                  className={`color-option ${
                    editColor === color.hex ? 'selected' : ''
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => setEditColor(color.hex)}
                  aria-label={`Select ${color.name}`}
                />
              ))}
            </div>
          </div>

          <div className="edit-actions">
            <button
              className="button button-primary"
              onClick={handleSave}
              disabled={!editName.trim()}
            >
              Save
            </button>
            <button className="button button-secondary" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="member-card">
      <div
        className="member-avatar"
        style={{ backgroundColor: member.avatarColor || member.color }}
      >
        <span className="member-initials">{getInitials(member.name)}</span>
      </div>

      <h3 className="member-name">{member.name}</h3>

      <div className="member-actions">
        <button
          className="button-icon button-edit"
          onClick={onEdit}
          aria-label={`Edit ${member.name}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14.166 2.5009C14.3849 2.28203 14.6447 2.10842 14.9307 1.98996C15.2167 1.87151 15.5232 1.81055 15.8327 1.81055C16.1422 1.81055 16.4487 1.87151 16.7347 1.98996C17.0206 2.10842 17.2805 2.28203 17.4993 2.5009C17.7182 2.71977 17.8918 2.97961 18.0103 3.26556C18.1287 3.55152 18.1897 3.85804 18.1897 4.16757C18.1897 4.4771 18.1287 4.78362 18.0103 5.06958C17.8918 5.35553 17.7182 5.61537 17.4993 5.83424L6.24935 17.0842L1.66602 18.3342L2.91602 13.7509L14.166 2.5009Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showDeleteConfirm ? (
          <div className="delete-confirm">
            <button
              className="button-icon button-cancel-delete"
              onClick={() => setShowDeleteConfirm(false)}
              aria-label="Cancel delete"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="button-icon button-confirm-delete"
              onClick={handleDelete}
              aria-label="Confirm delete"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 10L8 14L16 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            className="button-icon button-delete"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={`Delete ${member.name}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 5H4.16667H17.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15.8337 4.99984V16.6665C15.8337 17.1085 15.6581 17.5325 15.3455 17.845C15.033 18.1576 14.609 18.3332 14.167 18.3332H5.83366C5.39163 18.3332 4.96771 18.1576 4.65515 17.845C4.34259 17.5325 4.16699 17.1085 4.16699 16.6665V4.99984M6.66699 4.99984V3.33317C6.66699 2.89114 6.84259 2.46722 7.15515 2.15466C7.46771 1.8421 7.89163 1.6665 8.33366 1.6665H11.667C12.109 1.6665 12.533 1.8421 12.8455 2.15466C13.1581 2.46722 13.3337 2.89114 13.3337 3.33317V4.99984"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default FamilyMemberCard;
