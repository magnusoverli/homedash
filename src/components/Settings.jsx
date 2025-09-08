import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FamilyMemberCard from './FamilyMemberCard';
import AddMemberForm from './AddMemberForm';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    const savedMembers = localStorage.getItem('familyMembers');
    if (savedMembers) {
      setFamilyMembers(JSON.parse(savedMembers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
  }, [familyMembers]);

  const handleAddMember = member => {
    const newMember = {
      ...member,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setFamilyMembers([...familyMembers, newMember]);
    setIsAddingMember(false);
  };

  const handleUpdateMember = updatedMember => {
    setFamilyMembers(
      familyMembers.map(member =>
        member.id === updatedMember.id ? updatedMember : member
      )
    );
    setEditingMember(null);
  };

  const handleDeleteMember = memberId => {
    setFamilyMembers(familyMembers.filter(member => member.id !== memberId));
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="settings-header-container">
          <button
            className="back-button"
            onClick={handleBack}
            aria-label="Back to main page"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="settings-title">Family Settings</h1>
          <div className="settings-header-spacer"></div>
        </div>
      </header>

      <main className="settings-main">
        <div className="settings-container">
          <section className="family-section">
            <div className="section-header">
              <h2 className="section-title">Family Members</h2>
              <p className="section-description">
                Manage your family members for weekly planning
              </p>
            </div>

            <div className="members-grid">
              {familyMembers.map(member => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  isEditing={editingMember?.id === member.id}
                  onEdit={() => setEditingMember(member)}
                  onUpdate={handleUpdateMember}
                  onDelete={handleDeleteMember}
                  onCancelEdit={() => setEditingMember(null)}
                />
              ))}

              {isAddingMember ? (
                <AddMemberForm
                  onAdd={handleAddMember}
                  onCancel={() => setIsAddingMember(false)}
                />
              ) : (
                <button
                  className="add-member-button"
                  onClick={() => setIsAddingMember(true)}
                  aria-label="Add new family member"
                >
                  <div className="add-member-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16 8V24M8 16H24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="add-member-text">Add Member</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Settings;
