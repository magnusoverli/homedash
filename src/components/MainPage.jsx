import { useState, useEffect } from 'react';
import PersonWeekCard from './PersonWeekCard';
import ActivityModal from './ActivityModal';
import './MainPage.css';

const MainPage = ({ currentWeek }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activities, setActivities] = useState({});
  const [editingActivity, setEditingActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    const savedMembers = localStorage.getItem('familyMembers');
    if (savedMembers) {
      setFamilyMembers(JSON.parse(savedMembers));
    }

    const savedActivities = localStorage.getItem('activities');
    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  const getWeekKey = date => {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return weekStart.toISOString().split('T')[0];
  };

  const getMemberActivities = memberId => {
    const weekKey = getWeekKey(currentWeek);
    const weekActivities = activities[weekKey] || {};
    return weekActivities[memberId] || [];
  };

  const handleAddActivity = activityData => {
    setEditingActivity(activityData);
    setShowActivityModal(true);
  };

  const handleEditActivity = activity => {
    setEditingActivity(activity);
    setShowActivityModal(true);
  };

  const handleDeleteActivity = (memberId, activityId) => {
    const weekKey = getWeekKey(currentWeek);
    setActivities(prev => {
      const updated = { ...prev };
      if (updated[weekKey] && updated[weekKey][memberId]) {
        updated[weekKey][memberId] = updated[weekKey][memberId].filter(
          a => a.id !== activityId
        );
      }
      return updated;
    });
  };

  const handleSaveActivity = activityData => {
    const weekKey = getWeekKey(currentWeek);
    const memberId = activityData.memberId;

    setActivities(prev => {
      const updated = { ...prev };
      if (!updated[weekKey]) {
        updated[weekKey] = {};
      }
      if (!updated[weekKey][memberId]) {
        updated[weekKey][memberId] = [];
      }

      if (activityData.id) {
        updated[weekKey][memberId] = updated[weekKey][memberId].map(a =>
          a.id === activityData.id ? activityData : a
        );
      } else {
        activityData.id = Date.now().toString();
        updated[weekKey][memberId].push(activityData);
      }

      return updated;
    });

    setShowActivityModal(false);
    setEditingActivity(null);
  };

  const getWeekStart = () => {
    const weekStart = new Date(currentWeek);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return weekStart;
  };

  return (
    <main className="main-page">
      <div className="container">
        {familyMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
            <h2 className="empty-state-title">No Family Members Yet</h2>
            <p className="empty-state-text">
              Go to Settings to add family members and start planning your week!
            </p>
          </div>
        ) : (
          <div className="calendar-grid">
            {familyMembers.map(member => (
              <PersonWeekCard
                key={member.id}
                member={member}
                activities={getMemberActivities(member.id)}
                weekStart={getWeekStart()}
                onAddActivity={data =>
                  handleAddActivity({ ...data, memberId: member.id })
                }
                onEditActivity={handleEditActivity}
                onDeleteActivity={activityId =>
                  handleDeleteActivity(member.id, activityId)
                }
              />
            ))}
          </div>
        )}
      </div>

      {showActivityModal && (
        <ActivityModal
          activity={editingActivity}
          onSave={handleSaveActivity}
          onClose={() => {
            setShowActivityModal(false);
            setEditingActivity(null);
          }}
        />
      )}
    </main>
  );
};

export default MainPage;
