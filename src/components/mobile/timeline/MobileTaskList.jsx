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
 */
const MobileTaskList = ({ tasks = [] }) => {

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
          <div key={task.id} className="mobile-task-item">
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileTaskList;


