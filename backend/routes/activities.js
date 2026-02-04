import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAll, getOne, runQuery } from '../database.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { member_id, date, start_date, end_date } = req.query;

  try {
    let regularSql = 'SELECT * FROM activities WHERE 1=1';
    const regularParams = [];

    if (member_id) {
      regularSql += ' AND member_id = ?';
      regularParams.push(member_id);
    }

    if (date) {
      regularSql += ' AND date = ?';
      regularParams.push(date);
    }

    if (start_date && end_date) {
      regularSql += ' AND date >= ? AND date <= ?';
      regularParams.push(start_date, end_date);
    }

    regularSql += ' ORDER BY date, start_time';

    const regularActivities = await getAll(regularSql, regularParams);
    console.log(`📋 Found ${regularActivities.length} regular activities`);

    let spondSql = `
      SELECT sa.*, 
        DATE(sa.start_timestamp, 'localtime') as date, 
        TIME(sa.start_timestamp, 'localtime') as start_time, 
        TIME(sa.end_timestamp, 'localtime') as end_time 
      FROM spond_activities sa
      INNER JOIN spond_groups sg ON sa.group_id = sg.id AND sa.member_id = sg.member_id
      WHERE sg.is_active = TRUE`;
    const spondParams = [];

    if (member_id) {
      spondSql += ' AND sa.member_id = ?';
      spondParams.push(member_id);
    }

    if (date) {
      spondSql += " AND DATE(sa.start_timestamp, 'localtime') = ?";
      spondParams.push(date);
    }

    if (start_date && end_date) {
      spondSql +=
        " AND DATE(sa.start_timestamp, 'localtime') >= ? AND DATE(sa.start_timestamp, 'localtime') <= ?";
      spondParams.push(start_date, end_date);
    }

    spondSql += ' ORDER BY sa.start_timestamp';

    const spondActivities = await getAll(spondSql, spondParams);
    console.log(`⚽ Found ${spondActivities.length} Spond activities`);

    // Fetch Exchange events from active calendars
    let exchangeSql = `
      SELECT ee.*, 
        DATE(ee.start_timestamp, 'localtime') as date, 
        TIME(ee.start_timestamp, 'localtime') as start_time, 
        TIME(ee.end_timestamp, 'localtime') as end_time,
        ee.subject as title,
        ee.body_preview as description,
        ee.location_name as location
      FROM exchange_events ee
      INNER JOIN exchange_calendars ec ON ee.calendar_id = ec.id AND ee.member_id = ec.member_id
      WHERE ec.is_active = 1 AND ee.is_cancelled = 0`;
    const exchangeParams = [];

    if (member_id) {
      exchangeSql += ' AND ee.member_id = ?';
      exchangeParams.push(member_id);
    }

    if (date) {
      exchangeSql += " AND DATE(ee.start_timestamp, 'localtime') = ?";
      exchangeParams.push(date);
    }

    if (start_date && end_date) {
      exchangeSql +=
        " AND DATE(ee.start_timestamp, 'localtime') >= ? AND DATE(ee.start_timestamp, 'localtime') <= ?";
      exchangeParams.push(start_date, end_date);
    }

    exchangeSql += ' ORDER BY ee.start_timestamp';

    const exchangeActivities = await getAll(exchangeSql, exchangeParams);
    console.log(`📅 Found ${exchangeActivities.length} Exchange events`);

    const combinedActivities = [
      ...regularActivities.map(activity => ({
        ...activity,
        source: activity.source || 'manual',
      })),
      ...spondActivities.map(activity => ({
        ...activity,
        source: 'spond',
      })),
      ...exchangeActivities.map(activity => ({
        ...activity,
        source: 'exchange',
        // Map Exchange-specific fields to standard format
        responseStatus: activity.response_status,
        showAs: activity.show_as,
        isAllDay: Boolean(activity.is_all_day),
      })),
    ];

    combinedActivities.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.start_time || '00:00'}`);
      return dateA - dateB;
    });

    const municipalCalendarDates = new Set();
    combinedActivities.forEach(activity => {
      if (activity.source === 'municipal_calendar') {
        const key = `${activity.member_id}:${activity.date}`;
        municipalCalendarDates.add(key);
      }
    });

    const filteredActivities = combinedActivities.filter(activity => {
      const isSchoolSchedule = activity.description?.includes(
        '[TYPE:school_schedule]'
      );
      if (!isSchoolSchedule) {
        return true;
      }

      const key = `${activity.member_id}:${activity.date}`;
      const hasMunicipalEvent = municipalCalendarDates.has(key);

      if (hasMunicipalEvent) {
        console.log(
          `🗑️  Filtering out school_schedule for ${activity.date} (municipal calendar event exists)`
        );
        return false;
      }

      return true;
    });

    const filteredCount = combinedActivities.length - filteredActivities.length;
    if (filteredCount > 0) {
      console.log(
        `🔍 Filtered out ${filteredCount} school_schedule activities due to municipal calendar events`
      );
    }

    console.log(
      `✅ Combined ${combinedActivities.length} total activities (${regularActivities.length} regular + ${spondActivities.length} Spond + ${exchangeActivities.length} Exchange), ${filteredActivities.length} after filtering`
    );
    res.json(filteredActivities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

router.post('/', async (req, res) => {
  const {
    member_id,
    title,
    date,
    start_time,
    end_time,
    description,
    activity_type,
    recurrence_type,
    recurrence_end_date,
    notes,
  } = req.body;

  if (!member_id || !title || !date || !start_time || !end_time) {
    return res.status(400).json({
      error: 'member_id, title, date, start_time, and end_time are required',
    });
  }

  try {
    const result = await runQuery(
      `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        member_id,
        title,
        date,
        start_time,
        end_time,
        description || null,
        activity_type || 'manual',
        recurrence_type || 'none',
        recurrence_end_date || null,
        notes || null,
      ]
    );
    const activity = await getOne('SELECT * FROM activities WHERE id = ?', [
      result.id,
    ]);
    res.status(201).json(activity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    date,
    start_time,
    end_time,
    description,
    activity_type,
    recurrence_type,
    recurrence_end_date,
    notes,
  } = req.body;

  if (!title || !date || !start_time || !end_time) {
    return res.status(400).json({
      error: 'title, date, start_time, and end_time are required',
    });
  }

  try {
    await runQuery(
      `UPDATE activities 
       SET title = ?, date = ?, start_time = ?, end_time = ?, description = ?, 
           activity_type = ?, recurrence_type = ?, recurrence_end_date = ?, notes = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        title,
        date,
        start_time,
        end_time,
        description || null,
        activity_type || 'manual',
        recurrence_type || 'none',
        recurrence_end_date || null,
        notes || null,
        id,
      ]
    );
    const activity = await getOne('SELECT * FROM activities WHERE id = ?', [
      id,
    ]);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json(activity);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await runQuery('DELETE FROM activities WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

router.delete('/school-schedule/:memberId', async (req, res) => {
  const { memberId } = req.params;

  try {
    console.log(
      `🗑️  Starting batch delete of school schedule for member ${memberId}`
    );
    const startTime = Date.now();

    const scheduleCountResult = await getOne(
      `SELECT COUNT(*) as count FROM activities 
       WHERE member_id = ? 
       AND description LIKE '%[TYPE:school_schedule]%'`,
      [memberId]
    );

    const activityCountResult = await getOne(
      `SELECT COUNT(*) as count FROM activities 
       WHERE member_id = ? 
       AND description LIKE '%[TYPE:school_activity]%'`,
      [memberId]
    );

    const homeworkCountResult = await getOne(
      `SELECT COUNT(*) as count FROM homework 
       WHERE member_id = ?`,
      [memberId]
    );

    const totalBefore =
      scheduleCountResult.count +
      activityCountResult.count +
      homeworkCountResult.count;
    console.log(
      `📊 Found ${scheduleCountResult.count} school schedule entries, ${activityCountResult.count} school activity entries, and ${homeworkCountResult.count} homework assignments (${totalBefore} total)`
    );

    if (totalBefore === 0) {
      console.log(
        `ℹ️  No school schedule entries found for member ${memberId}`
      );
      return res.json({
        message: 'No school schedule found to delete',
        deletedCount: 0,
      });
    }

    const deleteScheduleResult = await runQuery(
      `DELETE FROM activities 
       WHERE member_id = ? 
       AND description LIKE '%[TYPE:school_schedule]%'`,
      [memberId]
    );

    const deleteActivityResult = await runQuery(
      `DELETE FROM activities 
       WHERE member_id = ? 
       AND description LIKE '%[TYPE:school_activity]%'`,
      [memberId]
    );

    const deleteHomeworkResult = await runQuery(
      `DELETE FROM homework 
       WHERE member_id = ?`,
      [memberId]
    );

    const totalDeleted =
      deleteScheduleResult.changes +
      deleteActivityResult.changes +
      deleteHomeworkResult.changes;
    const endTime = Date.now();

    console.log(`✅ Batch delete completed in ${endTime - startTime}ms`);
    console.log(
      `📈 Deleted ${deleteScheduleResult.changes} schedule entries, ${deleteActivityResult.changes} activity entries, and ${deleteHomeworkResult.changes} homework assignments (${totalDeleted} total)`
    );

    res.json({
      message: 'School schedule and homework deleted successfully',
      deletedCount: totalDeleted,
      scheduleEntries: deleteScheduleResult.changes,
      activityEntries: deleteActivityResult.changes,
      homeworkEntries: deleteHomeworkResult.changes,
      executionTime: endTime - startTime,
    });
  } catch (error) {
    console.error('Error batch deleting school schedule:', error);
    res.status(500).json({ error: 'Failed to delete school schedule' });
  }
});

export default router;
