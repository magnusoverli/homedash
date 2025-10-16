import express from 'express';
import axios from 'axios';
import ical from 'node-ical';
import { requireAuth } from '../middleware/auth.js';
import { getAll, getOne, runQuery } from '../database.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const members = await getAll(
      'SELECT * FROM family_members ORDER BY created_at'
    );
    res.json(members);
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

router.post('/', async (req, res) => {
  const { name, color } = req.body;

  if (!name || !color) {
    return res.status(400).json({ error: 'Name and color are required' });
  }

  try {
    const result = await runQuery(
      'INSERT INTO family_members (name, color) VALUES (?, ?)',
      [name, color]
    );
    const member = await getOne('SELECT * FROM family_members WHERE id = ?', [
      result.id,
    ]);
    res.status(201).json(member);
  } catch (error) {
    console.error('Error creating family member:', error);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;

  if (!name || !color) {
    return res.status(400).json({ error: 'Name and color are required' });
  }

  try {
    await runQuery(
      'UPDATE family_members SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, color, id]
    );
    const member = await getOne('SELECT * FROM family_members WHERE id = ?', [
      id,
    ]);
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    res.json(member);
  } catch (error) {
    console.error('Error updating family member:', error);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const member = await getOne('SELECT * FROM family_members WHERE id = ?', [
      id,
    ]);
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    const activitiesCount = await getOne(
      'SELECT COUNT(*) as count FROM activities WHERE member_id = ?',
      [id]
    );
    const homeworkCount = await getOne(
      'SELECT COUNT(*) as count FROM homework WHERE member_id = ?',
      [id]
    );

    console.log(`Deleting member ${member.name} (ID: ${id})`);
    console.log(`- Will delete ${activitiesCount.count} activities`);
    console.log(`- Will delete ${homeworkCount.count} homework entries`);

    const result = await runQuery('DELETE FROM family_members WHERE id = ?', [
      id,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    const remainingActivities = await getOne(
      'SELECT COUNT(*) as count FROM activities WHERE member_id = ?',
      [id]
    );
    const remainingHomework = await getOne(
      'SELECT COUNT(*) as count FROM homework WHERE member_id = ?',
      [id]
    );

    console.log(`Deletion complete. Remaining orphaned data:`);
    console.log(`- Activities: ${remainingActivities.count}`);
    console.log(`- Homework: ${remainingHomework.count}`);

    if (remainingActivities.count > 0 || remainingHomework.count > 0) {
      console.log(
        'Foreign key constraints may not be working. Manually cleaning up...'
      );

      await runQuery('DELETE FROM activities WHERE member_id = ?', [id]);
      await runQuery('DELETE FROM homework WHERE member_id = ?', [id]);

      console.log('Manual cleanup completed');
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

router.post('/:id/import-calendar', async (req, res) => {
  const { id } = req.params;
  const { calendarUrl } = req.body;

  if (!calendarUrl) {
    return res.status(400).json({ error: 'Calendar URL is required' });
  }

  try {
    await runQuery(
      'UPDATE family_members SET calendar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [calendarUrl, id]
    );

    let fetchUrl = calendarUrl;
    if (fetchUrl.startsWith('webcal://')) {
      fetchUrl = fetchUrl.replace('webcal://', 'https://');
    }

    console.log(`Fetching calendar from: ${fetchUrl}`);

    const response = await axios.get(fetchUrl, {
      timeout: 30000,
      responseType: 'text',
      headers: {
        'User-Agent': 'HomeDash/1.0',
      },
    });

    const parsedData = ical.parseICS(response.data);

    await runQuery(
      'DELETE FROM activities WHERE member_id = ? AND source = ?',
      [id, 'municipal_calendar']
    );

    let importedCount = 0;
    const events = [];

    for (const key in parsedData) {
      const event = parsedData[key];

      if (event.type === 'VEVENT') {
        const startDate = event.start;
        const endDate = event.end;

        if (startDate) {
          const summary = event.summary || 'School Event';
          const description = event.description || '';

          if (
            summary.includes('SFO og barnehager stengt') &&
            (summary.includes('(sfo)') || summary.includes('(barnehage)'))
          ) {
            continue;
          }

          let activityType = 'school_event';
          if (summary.toLowerCase().includes('ferie')) {
            activityType = 'vacation';
          } else if (summary.toLowerCase().includes('planleggingsdag')) {
            activityType = 'planning_day';
          } else if (summary.toLowerCase().includes('fridag')) {
            activityType = 'holiday';
          }

          let affectsServices = [];
          if (
            description.toLowerCase().includes('skole stengt') ||
            summary.toLowerCase().includes('(skole)')
          ) {
            affectsServices.push('school');
          }
          if (
            description.toLowerCase().includes('sfo stengt') ||
            summary.toLowerCase().includes('(sfo)')
          ) {
            affectsServices.push('sfo');
          }
          if (
            description.toLowerCase().includes('barnehage stengt') ||
            summary.toLowerCase().includes('(barnehage)')
          ) {
            affectsServices.push('kindergarten');
          }

          if (affectsServices.length === 0 && !summary.includes('SFO-')) {
            affectsServices.push('school');
          }

          let startDateObj, endDateObj;

          if (startDate.dateOnly) {
            const correctedStart = new Date(
              startDate.getTime() + 4 * 60 * 60 * 1000
            );
            const startStr = correctedStart.toISOString().split('T')[0];
            const [year, month, day] = startStr.split('-').map(Number);
            startDateObj = new Date(year, month - 1, day, 12, 0, 0);

            if (endDate) {
              const correctedEnd = new Date(
                endDate.getTime() + 4 * 60 * 60 * 1000
              );
              const endStr = correctedEnd.toISOString().split('T')[0];
              const [endYear, endMonth, endDay] = endStr.split('-').map(Number);
              endDateObj = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
            } else {
              endDateObj = new Date(startDateObj);
            }
          } else {
            startDateObj = new Date(
              startDate.toISOString ? startDate.toISOString() : startDate
            );
            endDateObj = endDate
              ? new Date(endDate.toISOString ? endDate.toISOString() : endDate)
              : new Date(startDateObj);
          }

          endDateObj.setDate(endDateObj.getDate() - 1);

          const currentDate = new Date(startDateObj);
          while (currentDate <= endDateObj) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            try {
              await runQuery(
                `INSERT INTO activities 
                 (member_id, title, date, start_time, end_time, description, 
                  activity_type, source, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  id,
                  summary,
                  dateStr,
                  '08:00',
                  '10:00',
                  description,
                  activityType,
                  'municipal_calendar',
                  JSON.stringify({
                    affectsServices,
                    originalEvent: event.uid,
                  }),
                ]
              );

              importedCount++;
              console.log(`Successfully inserted: ${summary} on ${dateStr}`);
            } catch (insertError) {
              console.error(
                `Failed to insert event: ${summary} on ${dateStr}`,
                insertError
              );
            }

            if (currentDate.getTime() === startDateObj.getTime()) {
              events.push({
                title: summary,
                date: dateStr,
                type: activityType,
                affects: affectsServices,
              });
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }
    }

    await runQuery(
      'UPDATE family_members SET calendar_last_synced = CURRENT_TIMESTAMP, calendar_event_count = ? WHERE id = ?',
      [importedCount, id]
    );

    console.log(`Imported ${importedCount} calendar events for member ${id}`);

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} events`,
      eventsImported: importedCount,
      events: events.slice(0, 10),
    });
  } catch (error) {
    console.error('Error importing calendar:', error);
    res.status(500).json({
      error: 'Failed to import calendar',
      details: error.message,
    });
  }
});

router.delete('/:id/remove-calendar', async (req, res) => {
  const { id } = req.params;

  try {
    const deleteResult = await runQuery(
      'DELETE FROM activities WHERE member_id = ? AND source = ?',
      [id, 'municipal_calendar']
    );

    await runQuery(
      `UPDATE family_members 
       SET calendar_url = NULL, 
           calendar_last_synced = NULL, 
           calendar_event_count = 0,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );

    console.log(
      `Removed ${deleteResult.changes} calendar events for member ${id}`
    );

    res.json({
      success: true,
      message: `Successfully removed school calendar`,
      eventsRemoved: deleteResult.changes,
    });
  } catch (error) {
    console.error('Error removing calendar:', error);
    res.status(500).json({
      error: 'Failed to remove calendar',
      details: error.message,
    });
  }
});

export default router;
