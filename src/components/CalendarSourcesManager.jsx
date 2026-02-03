import { useState, useEffect } from 'react';
import { LoadingSpinner, TrashIcon, CheckmarkIcon, PlusIcon } from './icons';
import dataService from '../services/dataService';
import { useToast } from '../contexts/ToastContext';
import { AVATAR_COLORS } from '../constants/colors';
import './CalendarSourcesManager.css';

const CalendarSourcesManager = () => {
  const { showSuccess, showError } = useToast();
  const [calendarSources, setCalendarSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState(null);
  const [deletingSourceId, setDeletingSourceId] = useState(null);

  // New source form state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceColor, setNewSourceColor] = useState(AVATAR_COLORS[5].hex); // Default to blue

  useEffect(() => {
    loadCalendarSources();
  }, []);

  const loadCalendarSources = async () => {
    setIsLoading(true);
    try {
      const sources = await dataService.getCalendarSources();
      setCalendarSources(sources || []);
    } catch (error) {
      console.error('Error loading calendar sources:', error);
      showError('Failed to load calendar sources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSource = async e => {
    e.preventDefault();

    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      showError('Please enter both name and URL');
      return;
    }

    try {
      const newSource = await dataService.createCalendarSource({
        name: newSourceName.trim(),
        url: newSourceUrl.trim(),
        color: newSourceColor,
      });

      setCalendarSources([...calendarSources, newSource]);
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceColor(AVATAR_COLORS[5].hex);
      setIsAddingSource(false);
      showSuccess('Calendar source added successfully');

      // Auto-sync the new source
      handleSyncSource(newSource.id);
    } catch (error) {
      console.error('Error adding calendar source:', error);
      showError(error.message || 'Failed to add calendar source');
    }
  };

  const handleSyncSource = async sourceId => {
    setSyncingSourceId(sourceId);
    try {
      const result = await dataService.syncCalendarSource(sourceId);

      // Update the source in state with new sync info
      setCalendarSources(prev =>
        prev.map(source =>
          source.id === sourceId
            ? {
                ...source,
                last_synced: new Date().toISOString(),
                event_count: result.eventsImported || result.eventCount || 0,
              }
            : source
        )
      );

      showSuccess(
        result.message ||
          `Synced ${result.eventsImported || 0} events successfully`
      );
    } catch (error) {
      console.error('Error syncing calendar source:', error);
      showError(error.message || 'Failed to sync calendar');
    } finally {
      setSyncingSourceId(null);
    }
  };

  const handleDeleteSource = async sourceId => {
    if (
      !window.confirm(
        'Are you sure you want to delete this calendar source? All imported events from this source will also be deleted.'
      )
    ) {
      return;
    }

    setDeletingSourceId(sourceId);
    try {
      await dataService.deleteCalendarSource(sourceId);
      setCalendarSources(prev => prev.filter(source => source.id !== sourceId));
      showSuccess('Calendar source deleted successfully');
    } catch (error) {
      console.error('Error deleting calendar source:', error);
      showError(error.message || 'Failed to delete calendar source');
    } finally {
      setDeletingSourceId(null);
    }
  };

  const formatLastSynced = dateString => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="calendar-sources-loading">
        <LoadingSpinner size={24} />
        <span>Loading calendar sources...</span>
      </div>
    );
  }

  return (
    <div className="calendar-sources-manager">
      <div className="sources-list">
        {calendarSources.length === 0 && !isAddingSource ? (
          <div className="no-sources">
            <p>No calendar sources configured yet.</p>
            <p className="no-sources-hint">
              Add an iCal/webcal URL to import events from external calendars.
            </p>
          </div>
        ) : (
          calendarSources.map(source => (
            <div key={source.id} className="source-item">
              <div
                className="source-color-indicator"
                style={{ backgroundColor: source.color || '#BADAF8' }}
              />
              <div className="source-info">
                <div className="source-name">{source.name}</div>
                <div className="source-url" title={source.url}>
                  {source.url}
                </div>
                <div className="source-meta">
                  {source.event_count > 0 && (
                    <span className="source-event-count">
                      {source.event_count} events
                    </span>
                  )}
                  <span className="source-last-synced">
                    Last synced: {formatLastSynced(source.last_synced)}
                  </span>
                </div>
              </div>
              <div className="source-actions">
                <button
                  className="source-action-btn sync-btn"
                  onClick={() => handleSyncSource(source.id)}
                  disabled={syncingSourceId === source.id}
                  title="Sync calendar"
                >
                  {syncingSourceId === source.id ? (
                    <LoadingSpinner size={16} />
                  ) : (
                    <CheckmarkIcon size={16} />
                  )}
                </button>
                <button
                  className="source-action-btn delete-btn"
                  onClick={() => handleDeleteSource(source.id)}
                  disabled={deletingSourceId === source.id}
                  title="Delete calendar source"
                >
                  {deletingSourceId === source.id ? (
                    <LoadingSpinner size={16} />
                  ) : (
                    <TrashIcon size={16} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAddingSource ? (
        <form className="add-source-form" onSubmit={handleAddSource}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="source-name" className="form-label">
                Calendar Name
              </label>
              <input
                type="text"
                id="source-name"
                className="form-input"
                value={newSourceName}
                onChange={e => setNewSourceName(e.target.value)}
                placeholder="e.g., School Calendar"
                autoFocus
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="source-url" className="form-label">
                Calendar URL (iCal/webcal)
              </label>
              <input
                type="text"
                id="source-url"
                className="form-input"
                value={newSourceUrl}
                onChange={e => setNewSourceUrl(e.target.value)}
                placeholder="webcal://example.com/calendar.ics"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Calendar Color</label>
              <div className="color-options">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color.hex}
                    type="button"
                    className={`color-option ${newSourceColor === color.hex ? 'selected' : ''}`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => setNewSourceColor(color.hex)}
                    aria-label={`Select ${color.name}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="button button-primary"
              disabled={!newSourceName.trim() || !newSourceUrl.trim()}
            >
              Add Calendar
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setIsAddingSource(false);
                setNewSourceName('');
                setNewSourceUrl('');
                setNewSourceColor(AVATAR_COLORS[5].hex);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="add-source-button"
          onClick={() => setIsAddingSource(true)}
        >
          <PlusIcon size={20} />
          <span>Add Calendar Source</span>
        </button>
      )}
    </div>
  );
};

export default CalendarSourcesManager;
