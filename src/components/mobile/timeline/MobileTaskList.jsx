import { useState } from 'react';
import './MobileTaskList.css';

/**
 * Mobile Task List
 * 
 * Compact task list with swipe-to-delete functionality.
 * Shows homework and other tasks for a family member.
 * 
 * @param {Object} props
 * @param {Object} props.member - Family member object
 * @param {Array} props.tasks - Array of task/homework objects
 * @param {Function} props.onDeleteTask - Callback to delete task
 * @param {boolean} props.isActive - Whether this list is active
 */
const MobileTaskList = ({ member, tasks = [], onDeleteTask, isActive }) => {
  const [swipingTaskId, setSwipingTaskId] = useState(null);
  const [swipeX, setSwipeX] = useState(0);
  const [startX, setStartX] = useState(0);

  const handleSwipeStart = (e, taskId) => {
    setSwipingTaskId(taskId);
    setStartX(e.type === 'mousedown' ? e.clientX : e.touches[0].clientX);
  };

  const handleSwipeMove = (e) => {
    if (!swipingTaskId) return;
    
    const currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
    const deltaX = currentX - startX;
    
    // Only allow left swipe
    if (deltaX < 0) {
      setSwipeX(Math.max(deltaX, -80));
    }
  };

  const handleSwipeEnd = (taskId) => {
    if (swipingTaskId) {
      // If swiped more than half, trigger delete
      if (swipeX < -40) {
        handleDelete(taskId);
      } else {
        setSwipeX(0);
      }
      setSwipingTaskId(null);
    }
  };

  const handleDelete = async (taskId) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    setSwipeX(0);
    setSwipingTaskId(null);
    onDeleteTask(member.id, taskId);
  };

  if (tasks.length === 0) {
    return (
      <div className="mobile-task-list">
        <div className="mobile-task-header">
          <h3 className="mobile-task-title">Tasks</h3>
        </div>
        <div className="mobile-task-empty">
          <span className="mobile-task-empty-icon">✅</span>
          <p className="mobile-task-empty-text">All tasks completed!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-task-list">
      <div className="mobile-task-header">
        <h3 className="mobile-task-title">Tasks</h3>
        <span className="mobile-task-count">{tasks.length}</span>
      </div>

      <div className="mobile-task-items">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`mobile-task-item ${swipingTaskId === task.id ? 'mobile-task-item--swiping' : ''}`}
            style={{
              transform: swipingTaskId === task.id ? `translateX(${swipeX}px)` : 'translateX(0)',
            }}
            onTouchStart={(e) => handleSwipeStart(e, task.id)}
            onTouchMove={handleSwipeMove}
            onTouchEnd={() => handleSwipeEnd(task.id)}
            onMouseDown={(e) => handleSwipeStart(e, task.id)}
            onMouseMove={handleSwipeMove}
            onMouseUp={() => handleSwipeEnd(task.id)}
            onMouseLeave={() => {
              if (swipingTaskId === task.id) {
                setSwipeX(0);
                setSwipingTaskId(null);
              }
            }}
          >
            <div className="mobile-task-content">
              <div className="mobile-task-info">
                <span className="mobile-task-subject">{task.subject}</span>
                <span className="mobile-task-description">{task.description}</span>
              </div>
              {task.due_date && (
                <span className="mobile-task-date">
                  {new Date(task.due_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              )}
            </div>

            {/* Delete background */}
            <div className="mobile-task-delete-bg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileTaskList;


