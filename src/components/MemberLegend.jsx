import './MemberLegend.css';

const SHARED_FILTER_ID = '__shared__';

const MemberLegend = ({
  members,
  showShared = true,
  activeFilters = null,
  onFilterChange = null,
}) => {
  if (!members || members.length === 0) {
    return null;
  }

  const isFilterable = activeFilters !== null && onFilterChange !== null;

  const handleFilterClick = filterId => {
    if (!isFilterable) return;

    const newFilters = new Set(activeFilters);
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    onFilterChange(newFilters);
  };

  const isActive = filterId => {
    if (!isFilterable) return true;
    return activeFilters.has(filterId);
  };

  return (
    <div className="member-legend">
      <span className="legend-label">
        {isFilterable ? 'Filter:' : 'Members:'}
      </span>
      <div className="legend-items">
        {members.map(member => (
          <button
            key={member.id}
            type="button"
            className={`legend-item ${isFilterable ? 'filterable' : ''} ${isActive(member.id) ? 'active' : 'inactive'}`}
            onClick={() => handleFilterClick(member.id)}
            disabled={!isFilterable}
          >
            <span
              className="legend-color"
              style={{ backgroundColor: member.color || '#B2AEFF' }}
            />
            <span className="legend-name">{member.name}</span>
          </button>
        ))}
        {showShared && (
          <button
            type="button"
            className={`legend-item legend-item-shared ${isFilterable ? 'filterable' : ''} ${isActive(SHARED_FILTER_ID) ? 'active' : 'inactive'}`}
            onClick={() => handleFilterClick(SHARED_FILTER_ID)}
            disabled={!isFilterable}
          >
            <span
              className="legend-color"
              style={{ backgroundColor: '#B2AEFF' }}
            />
            <span className="legend-name">Shared</span>
          </button>
        )}
      </div>
    </div>
  );
};

export { SHARED_FILTER_ID };
export default MemberLegend;
