import { useState, useEffect, useCallback, useRef } from 'react';
import EmptyState from '../../EmptyState';
import HomeworkViewSkeleton from '../loading/HomeworkViewSkeleton';
import dataService from '../../../services/dataService';
import { formatLocalDate } from '../../../utils/timeUtils';
import './MobileHomeworkView.css';

/**
 * Mobile Homework View
 *
 * Displays all homework/tasks across all family members.
 * Groups homework by family member with subject and assignment details.
 */
const MobileHomeworkView = () => {
  const [homeworkByMember, setHomeworkByMember] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef(null);

  const getWeekStart = useCallback(() => {
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    return weekStart;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const members = await dataService.getFamilyMembers();
        const mappedMembers = members.map(m => ({
          ...m,
          avatarColor: m.color,
        }));

        const weekStartStr = formatLocalDate(getWeekStart());

        const homeworkData = [];
        for (const member of mappedMembers) {
          const memberHomework = await dataService.getHomework({
            member_id: member.id,
            week_start_date: weekStartStr,
          });

          if (memberHomework.length > 0) {
            homeworkData.push({
              member,
              homework: memberHomework,
            });
          }
        }

        setHomeworkByMember(homeworkData);
      } catch (error) {
        console.error('Error loading homework data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [getWeekStart]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    let startY = 0;

    const handleTouchStart = e => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = e => {
      const currentY = e.touches[0].clientY;
      const scrollTop = content.scrollTop;
      const isScrollingDown = currentY > startY;
      const hasScroll = content.scrollHeight > content.clientHeight;

      if (!hasScroll || (scrollTop <= 0 && isScrollingDown)) {
        e.preventDefault();
      }
    };

    content.addEventListener('touchstart', handleTouchStart, { passive: true });
    content.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      content.removeEventListener('touchstart', handleTouchStart);
      content.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="mobile-homework-view">
        <HomeworkViewSkeleton />
      </div>
    );
  }

  if (homeworkByMember.length === 0) {
    return (
      <div className="mobile-homework-view">
        <EmptyState
          icon="✅"
          title="All Caught Up!"
          message="No homework assignments for this week. Great job!"
        />
      </div>
    );
  }

  return (
    <div className="mobile-homework-view">
      <div ref={contentRef} className="homework-content">
        {homeworkByMember.map(({ member, homework }) => (
          <section key={member.id} className="homework-section">
            <div className="homework-member-header">
              <h2 className="homework-member-name">{member.name}</h2>
            </div>

            <div className="homework-items">
              {homework.map(task => (
                <div key={task.id} className="homework-card">
                  <div className="homework-card-content">
                    <h3 className="homework-subject">{task.subject}</h3>
                    {task.assignment && (
                      <p className="homework-assignment">{task.assignment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default MobileHomeworkView;
