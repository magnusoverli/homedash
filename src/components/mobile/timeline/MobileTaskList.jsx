import { useEffect, useRef } from 'react';
import './MobileTaskList.css';

/**
 * Mobile Task List
 *
 * Display-only task list for homework and tasks.
 * Shows tasks for a family member without interaction.
 *
 * @param {Object} props
 * @param {Object} props.member - Family member object (unused)
 * @param {Array} props.tasks - Array of task/homework objects
 * @param {Function} props.onDeleteTask - Callback to delete task (unused)
 * @param {boolean} props.isActive - Whether this list is active (unused)
 * @param {Object} props.dragHandleProps - Props to spread on header for drag functionality
 */
const MobileTaskList = ({ tasks = [], dragHandleProps = {} }) => {
  const headerRef = useRef(null);

  // Add passive:false event listeners to prevent pull-to-refresh on header
  useEffect(() => {
    const header = headerRef.current;
    if (!header || !dragHandleProps.onTouchMove) return;

    const handleTouchMove = e => {
      e.preventDefault();
      dragHandleProps.onTouchMove(e);
    };

    header.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      header.removeEventListener('touchmove', handleTouchMove);
    };
  }, [dragHandleProps, dragHandleProps.onTouchMove]);

  // Extract className from dragHandleProps to merge with base class
  const { className: dragClassName, ...restDragProps } = dragHandleProps;
  const headerClassName = `mobile-task-header ${dragClassName || ''}`.trim();

  if (tasks.length === 0) {
    return (
      <div className="mobile-task-list">
        <div
          ref={headerRef}
          className={headerClassName}
          {...restDragProps}
          onTouchMove={undefined}
        >
          <div className="mobile-task-header-content">
            <h3 className="mobile-task-title">Homework</h3>
            <div className="mobile-task-drag-indicator">
              <div className="mobile-task-drag-bar" />
            </div>
          </div>
        </div>
        <div className="mobile-task-empty">
          <span className="mobile-task-empty-icon">✅</span>
          <p className="mobile-task-empty-text">All homework completed!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-task-list">
      <div
        ref={headerRef}
        className={headerClassName}
        {...restDragProps}
        onTouchMove={undefined}
      >
        <div className="mobile-task-header-content">
          <h3 className="mobile-task-title">Homework</h3>
          <div className="mobile-task-drag-indicator">
            <div className="mobile-task-drag-bar" />
          </div>
        </div>
      </div>

      <div className="mobile-task-items">
        {tasks.map(task => (
          <div key={task.id} className="mobile-task-item">
            <div className="mobile-task-content">
              <span className="mobile-task-subject">{task.subject}</span>
              {task.assignment && (
                <span className="mobile-task-description">
                  {task.assignment}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileTaskList;
