import { useState } from 'react';
import './AddMemberForm.css';

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

const AddMemberForm = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0].hex);

  const handleSubmit = e => {
    e.preventDefault();
    if (name.trim()) {
      onAdd({
        name: name.trim(),
        avatarColor,
      });
      setName('');
      setAvatarColor(AVATAR_COLORS[0].hex);
    }
  };

  const getInitials = name => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="add-member-form-card">
      <form onSubmit={handleSubmit} className="add-member-form">
        <div className="form-preview">
          <div
            className="preview-avatar"
            style={{ backgroundColor: avatarColor }}
          >
            <span className="preview-initials">{getInitials(name)}</span>
          </div>
        </div>

        <div className="form-fields">
          <div className="form-group">
            <label htmlFor="member-name" className="form-label">
              Name
            </label>
            <input
              id="member-name"
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name"
              autoFocus
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Avatar Color</label>
            <div className="color-grid">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color.hex}
                  type="button"
                  className={`color-button ${
                    avatarColor === color.hex ? 'selected' : ''
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => setAvatarColor(color.hex)}
                  aria-label={`Select ${color.name}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="button button-primary"
            disabled={!name.trim()}
          >
            Add Member
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMemberForm;
