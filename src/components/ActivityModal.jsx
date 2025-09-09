import { useState, useEffect } from 'react';
import './ActivityModal.css';

const CATEGORIES = [
  { value: 'work', label: 'Work', color: '#B2AEFF' },
  { value: 'exercise', label: 'Exercise', color: '#D2FCC3' },
  { value: 'family', label: 'Family', color: '#DEB2FA' },
  { value: 'meal', label: 'Meal', color: '#FCDD8C' },
  { value: 'personal', label: 'Personal', color: '#BADAF8' },
  { value: 'medical', label: 'Medical', color: '#F4B3BB' },
  { value: 'social', label: 'Social', color: '#FFF48D' },
  { value: 'chores', label: 'Chores', color: '#ECECEC' },
];

const ActivityModal = ({ activity, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'personal',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    ...activity,
  });

  useEffect(() => {
    if (activity) {
      setFormData({
        title: activity.title || '',
        category: activity.category || 'personal',
        date: activity.date || '',
        startTime: activity.startTime || '',
        endTime: activity.endTime || '',
        description: activity.description || '',
        memberId: activity.memberId,
        id: activity.id,
      });
    }
  }, [activity]);

  const handleSubmit = e => {
    e.preventDefault();
    if (formData.title && formData.startTime && formData.endTime) {
      onSave(formData);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  const formatTimeLabel = time => {
    const [hours, minutes] = time.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {formData.id ? 'Edit Activity' : 'New Activity'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="activity-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Activity Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter activity title"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="category" className="form-label">
              Category
            </label>
            <div className="category-grid">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`category-option ${formData.category === cat.value ? 'selected' : ''}`}
                  onClick={() =>
                    setFormData(prev => ({ ...prev, category: cat.value }))
                  }
                  style={{
                    backgroundColor:
                      formData.category === cat.value
                        ? cat.color
                        : 'transparent',
                    borderColor: cat.color,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime" className="form-label">
                Start Time
              </label>
              <select
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select time</option>
                {generateTimeOptions().map(time => (
                  <option key={time} value={time}>
                    {formatTimeLabel(time)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="endTime" className="form-label">
                End Time
              </label>
              <select
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select time</option>
                {generateTimeOptions().map(time => (
                  <option key={time} value={time}>
                    {formatTimeLabel(time)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Add notes or details..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="button button-primary"
              disabled={
                !formData.title || !formData.startTime || !formData.endTime
              }
            >
              {formData.id ? 'Update' : 'Create'} Activity
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivityModal;
