# School Calendar Import Options - Visual Examples

## Option 1: Individual Daily Events (Current)

```
Monday     Tuesday    Wednesday   Thursday    Friday
-------------------------------------------------------
[ALL DAY]  [ALL DAY]  [ALL DAY]  [ALL DAY]  [ALL DAY]
Høstferie  Høstferie  Høstferie  Høstferie  Høstferie
-------------------------------------------------------
08:00
09:00
10:00      [Math]
11:00
```

**Issue:** Takes up entire vertical space when using 00:00-23:59

## Option 2: Date Range Events

```
Monday     Tuesday    Wednesday   Thursday    Friday
-------------------------------------------------------
[=========== Høstferie (School Closed) ==============]
-------------------------------------------------------
08:00
09:00
10:00      [Math]
11:00
```

**Benefit:** Single continuous bar across vacation days

## Option 3: Hybrid with All-Day Section

```
Monday     Tuesday    Wednesday   Thursday    Friday
-------------------------------------------------------
All-Day: 🏖️ Høstferie  🏖️ Høstferie  🏖️ Høstferie  🏖️ Høstferie  🏖️ Høstferie
-------------------------------------------------------
08:00
09:00
10:00      [Math]     [Soccer]
11:00                 Practice
```

**Benefit:** Dedicated space for all-day events, time grid remains clean

## Implementation Approaches

### For Option 1 (Quick Fix):

- Change display of 00:00-23:59 events to show as badges/chips
- Add CSS class for municipal calendar events
- Show at top of day column instead of spanning full height

### For Option 2 (Schema Change):

```sql
ALTER TABLE activities ADD COLUMN end_date TEXT;
ALTER TABLE activities ADD COLUMN is_multi_day BOOLEAN DEFAULT FALSE;
```

- Modify import to detect multi-day events
- Store single record with date range
- Update queries to handle date ranges

### For Option 3 (Recommended):

```javascript
// Frontend: PersonWeekCard.jsx
const allDayEvents = activities.filter(
  a =>
    a.start_time === 'all_day' ||
    (a.start_time === '00:00' &&
      a.end_time === '23:59' &&
      a.source === 'municipal_calendar')
);

const timedEvents = activities.filter(
  a =>
    a.start_time !== 'all_day' &&
    !(
      a.start_time === '00:00' &&
      a.end_time === '23:59' &&
      a.source === 'municipal_calendar'
    )
);

// Render all-day events in separate section above time grid
// Render timed events in the normal time grid
```

### CSS for Option 3:

```css
.all-day-section {
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  padding: 8px;
  min-height: 40px;
}

.all-day-event {
  display: inline-block;
  padding: 4px 8px;
  margin: 2px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.all-day-vacation {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
}

.all-day-planning {
  background: #cfe2ff;
  color: #084298;
  border: 1px solid #b6d4fe;
}

.all-day-holiday {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
```
