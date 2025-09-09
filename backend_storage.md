# Comprehensive SQLite REST API Migration Plan for HomeDash

## Current State Analysis

**LocalStorage Data Identified:**

1. **Family Members** (`Settings.jsx:24,31`) - Array of member objects with id, name, color, createdAt
2. **Activities** (`MainPage.jsx:18,25`) - Complex nested structure: `{weekKey: {memberId: [activities]}}`
3. **LLM Settings** (`Settings.jsx:35-62`) - llmIntegrationEnabled, anthropicApiKey, selectedAnthropicModel

**Component Dependencies:**

- `Settings.jsx` → manages familyMembers state + LLM settings
- `MainPage.jsx` → reads familyMembers + manages activities state
- `PersonWeekCard.jsx` → receives activities as props, displays by date/time
- `ActivityModal.jsx` → creates/edits activity objects
- Data flows: Settings ↔ MainPage ↔ PersonWeekCard ↔ ActivityModal

## Database Schema Design

```sql
-- Family members table
CREATE TABLE family_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activities table (flattened from nested localStorage structure)
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,        -- ISO date string YYYY-MM-DD
    start_time TEXT NOT NULL,  -- HH:MM format
    end_time TEXT NOT NULL,    -- HH:MM format
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES family_members (id) ON DELETE CASCADE
);

-- Settings table (key-value pairs)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_activities_member_date ON activities(member_id, date);
CREATE INDEX idx_activities_date ON activities(date);
```

## API Service Layer Design

**New file: `src/services/dataService.js`**

```javascript
// Centralized API service to replace localStorage calls
class DataService {
  async getFamilyMembers()
  async createFamilyMember(memberData)
  async updateFamilyMember(id, memberData)
  async deleteFamilyMember(id)

  async getActivities(filters = {}) // {memberId?, startDate?, endDate?}
  async createActivity(activityData)
  async updateActivity(id, activityData)
  async deleteActivity(id)

  async getSettings()
  async updateSetting(key, value)
}
```

## REST API Endpoints

```javascript
// Family Members
GET    /api/family-members
POST   /api/family-members     // {name, color}
PUT    /api/family-members/:id // {name, color}
DELETE /api/family-members/:id

// Activities
GET    /api/activities                    // All activities
GET    /api/activities?member_id=123      // Member's activities
GET    /api/activities?date=2025-01-06    // Activities for specific date
GET    /api/activities?start_date=2025-01-06&end_date=2025-01-12 // Week range
POST   /api/activities         // {member_id, title, date, start_time, end_time, description?}
PUT    /api/activities/:id     // {title, date, start_time, end_time, description?}
DELETE /api/activities/:id

// Settings
GET    /api/settings           // All settings as object
PUT    /api/settings/:key      // {value}
```

## Migration Strategy & Rollback

### Phase 1: Backend Infrastructure

1. **Add SQLite dependency** to `backend/package.json`
2. **Create database initialization** script with schema
3. **Add database module** for connection/query handling
4. **Implement API endpoints** in `backend/server.js`
5. **Add Docker volume** for database persistence
6. **Test endpoints** with curl/Postman

### Phase 2: Frontend API Service

1. **Create `src/services/dataService.js`** with all API calls
2. **Update `src/config/api.js`** with new endpoints
3. **Add loading/error states** to components
4. **Test service layer** independently

### Phase 3: Component Migration (Per Component)

1. **Settings.jsx**: Replace localStorage calls with dataService
2. **MainPage.jsx**: Replace localStorage calls + restructure activities logic
3. **PersonWeekCard.jsx**: Update to work with new activity structure
4. **ActivityModal.jsx**: Update activity creation/editing

### Phase 4: Data Migration Utility

1. **One-time migration script** to export localStorage → SQLite
2. **Fallback mechanism** if API fails → temporary localStorage backup

### Rollback Plan

- **Environment variable** `VITE_USE_LOCALSTORAGE=true` to revert
- **Keep localStorage code** as fallback during transition
- **Database export** utility to extract data back to JSON

## Error Handling & Loading States

**Loading States Needed:**

- `Settings.jsx` → loading family members, saving member changes
- `MainPage.jsx` → loading family members + activities on mount
- `ActivityModal.jsx` → saving activity changes
- Global loading indicator for multi-client data refresh

**Error Scenarios:**

- **Network failures** → show retry button, fallback to cached data
- **API errors** → user-friendly messages, form validation feedback
- **Concurrent edits** → "Data changed, please refresh" warnings
- **Database locks** → retry logic with exponential backoff

**State Management:**

```javascript
// Component state pattern for API integration
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [saving, setSaving] = useState(false);
```

## Testing Strategy

**Backend API Tests:**

- Unit tests for database operations (CRUD)
- Integration tests for API endpoints
- Multi-client concurrency testing
- Database constraint validation

**Frontend Integration Tests:**

- Component rendering with API data
- Error state handling
- Loading state transitions
- Data refresh on navigation/focus

**Multi-Client Testing:**

- Open multiple browser tabs
- Verify data sync on page refresh
- Test concurrent activity creation/editing
- Validate "last write wins" behavior

## Docker & Deployment Changes

**docker-compose.yml additions:**

```yaml
services:
  homedash-backend:
    volumes:
      - homedash-data:/app/data # SQLite database persistence
volumes:
  homedash-data:
```

## Implementation Order & File Changes

### New Files to Create:

1. `backend/database.js` - SQLite connection and query helpers
2. `backend/data/schema.sql` - Database schema initialization
3. `src/services/dataService.js` - API service layer
4. `backend/migrations/migrate-from-localstorage.js` - One-time migration script

### Files to Modify:

1. `backend/package.json` - Add sqlite3 dependency
2. `backend/server.js` - Add new API endpoints
3. `src/config/api.js` - Add new endpoint constants
4. `src/components/Settings.jsx` - Replace localStorage with API calls
5. `src/components/MainPage.jsx` - Replace localStorage + restructure activities
6. `src/components/ActivityModal.jsx` - Update for new API structure
7. `docker-compose.yml` - Add database volume

### Key Data Structure Changes:

- **Activities storage**: From nested `{weekKey: {memberId: [activities]}}` → flat table with member_id, date columns
- **Component state**: Add loading, error, saving states to all data components
- **API integration**: Replace synchronous localStorage with async API calls + error handling

## Implementation Checklist

### Backend Tasks

- [ ] Install sqlite3 dependency
- [ ] Create database.js module
- [ ] Initialize database schema
- [ ] Implement family members endpoints
- [ ] Implement activities endpoints
- [ ] Implement settings endpoints
- [ ] Add error handling middleware
- [ ] Update Docker configuration
- [ ] Test all endpoints

### Frontend Tasks

- [ ] Create dataService.js
- [ ] Update API config
- [ ] Add loading states to Settings.jsx
- [ ] Migrate Settings.jsx to API
- [ ] Add loading states to MainPage.jsx
- [ ] Migrate MainPage.jsx to API
- [ ] Update ActivityModal.jsx
- [ ] Add error handling UI
- [ ] Test multi-client sync

### Testing & Validation

- [ ] Unit test database operations
- [ ] Integration test API endpoints
- [ ] Test concurrent access
- [ ] Validate data migration
- [ ] Test rollback mechanism
- [ ] Multi-browser testing
- [ ] Performance testing

This comprehensive plan ensures all localStorage usage is systematically replaced with SQLite REST API calls while maintaining application functionality and enabling multi-client data sharing.
