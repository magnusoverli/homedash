import { useState } from 'react';
import { AVATAR_COLORS } from '../constants/colors';
import { getInitials } from '../utils/stringUtils';
import './AddMemberForm.css';

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
