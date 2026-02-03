import express from 'express';
import axios from 'axios';
import ical from 'node-ical';
import { requireAuth } from '../middleware/auth.js';
import { getAll, getOne, runQuery } from '../database.js';

const router = express.Router();

router.use(requireAuth);

// Get all calendar sources
router.get('/', async (req, res) => {
  try {
    const sources = await getAll(
      'SELECT * FROM calendar_sources ORDER BY created_at'
    );
    res.json(sources);
  } catch (error) {
    console.error('Error fetching calendar sources:', error);
    res.status(500).json({ error: 'Failed to fetch calendar sources' });
  }
});

// Get a single calendar source
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const source = await getOne('SELECT * FROM calendar_sources WHERE id = ?', [
      id,
    ]);
    if (!source) {
      return res.status(404).json({ error: 'Calendar source not found' });
    }
    res.json(source);
  } catch (error) {
    console.error('Error fetching calendar source:', error);
    res.status(500).json({ error: 'Failed to fetch calendar source' });
  }
});

// Create a new calendar source
router.post('/', async (req, res) => {
  const { name, url, color } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }

  try {
    const result = await runQuery(
      'INSERT INTO calendar_sources (name, url, color) VALUES (?, ?, ?)',
      [name, url, color || null]
    );
    const source = await getOne('SELECT * FROM calendar_sources WHERE id = ?', [
      result.id,
    ]);
    res.status(201).json(source);
  } catch (error) {
    console.error('Error creating calendar source:', error);
    res.status(500).json({ error: 'Failed to create calendar source' });
  }
});

// Update a calendar source
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, url, color } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }

  try {
    await runQuery(
      'UPDATE calendar_sources SET name = ?, url = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, url, color || null, id]
    );
    const source = await getOne('SELECT * FROM calendar_sources WHERE id = ?', [
      id,
    ]);
    if (!source) {
      return res.status(404).json({ error: 'Calendar source not found' });
    }
    res.json(source);
  } catch (error) {
    console.error('Error updating calendar source:', error);
    res.status(500).json({ error: 'Failed to update calendar source' });
  }
});

// Delete a calendar source and its associated activities
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const source = await getOne('SELECT * FROM calendar_sources WHERE id = ?', [
      id,
    ]);
    if (!source) {
      return res.status(404).json({ error: 'Calendar source not found' });
    }

    // Delete associated activities first
    const deleteResult = await runQuery(
      'DELETE FROM activities WHERE source_id = ?',
      [id]
    );
    console.log(
      `Deleted ${deleteResult.changes} activities for calendar source ${id}`
    );

    // Delete the calendar source
    await runQuery('DELETE FROM calendar_sources WHERE id = ?', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting calendar source:', error);
    res.status(500).json({ error: 'Failed to delete calendar source' });
  }
});

// Sync/import events from a calendar source
router.post('/:id/sync', async (req, res) => {
  const { id } = req.params;
  const { memberId } = req.body; // Optional: assign events to a specific family member

  try {
    // Verify the calendar source exists
    const source = await getOne('SELECT * FROM calendar_sources WHERE id = ?', [
      id,
    ]);
    if (!source) {
      return res.status(404).json({ error: 'Calendar source not found' });
    }

    // If memberId provided, verify the member exists
    if (memberId) {
      const member = await getOne('SELECT * FROM family_members WHERE id = ?', [
        memberId,
      ]);
      if (!member) {
        return res.status(404).json({ error: 'Family member not found' });
      }
    }

    let fetchUrl = source.url;
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

    // Delete existing events from this source (optionally filtered by member)
    if (memberId) {
      await runQuery(
        'DELETE FROM activities WHERE source_id = ? AND member_id = ?',
        [id, memberId]
      );
    } else {
      // Delete all events from this source (family-wide calendar)
      await runQuery('DELETE FROM activities WHERE source_id = ?', [id]);
    }

    let importedCount = 0;
    const events = [];

    for (const key in parsedData) {
      const event = parsedData[key];

      if (event.type === 'VEVENT') {
        const startDate = event.start;
        const endDate = event.end;

        if (startDate) {
          const summary = event.summary || 'Calendar Event';
          const description = event.description || '';

          // Skip certain Norwegian municipal calendar entries
          if (
            summary.includes('SFO og barnehager stengt') &&
            (summary.includes('(sfo)') || summary.includes('(barnehage)'))
          ) {
            continue;
          }

          // Determine activity type
          let activityType = 'calendar_event';
          if (summary.toLowerCase().includes('ferie')) {
            activityType = 'vacation';
          } else if (summary.toLowerCase().includes('planleggingsdag')) {
            activityType = 'planning_day';
          } else if (summary.toLowerCase().includes('fridag')) {
            activityType = 'holiday';
          } else if (
            summary.toLowerCase().includes('skole') ||
            summary.toLowerCase().includes('school')
          ) {
            activityType = 'school_event';
          }

          // Parse affected services from description
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

          // Handle date parsing
          let startDateObj, endDateObj;

          if (startDate.dateOnly) {
            // All-day event
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
            // Timed event
            startDateObj = new Date(
              startDate.toISOString ? startDate.toISOString() : startDate
            );
            endDateObj = endDate
              ? new Date(endDate.toISOString ? endDate.toISOString() : endDate)
              : new Date(startDateObj);
          }

          // For multi-day all-day events, adjust end date
          if (startDate.dateOnly) {
            endDateObj.setDate(endDateObj.getDate() - 1);
          }

          // Create an activity for each day in the range
          const currentDate = new Date(startDateObj);
          while (currentDate <= endDateObj) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            try {
              await runQuery(
                `INSERT INTO activities 
                 (member_id, source_id, title, date, start_time, end_time, description, 
                  activity_type, source, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  memberId || null, // null for family-wide calendar events
                  id,
                  summary,
                  dateStr,
                  '08:00',
                  '09:00', // Short duration marker for calendar source events
                  description,
                  activityType,
                  'calendar_import',
                  JSON.stringify({
                    affectsServices,
                    originalEvent: event.uid,
                    calendarSourceName: source.name,
                  }),
                ]
              );

              importedCount++;
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

    // Update the calendar source with sync info
    await runQuery(
      'UPDATE calendar_sources SET last_synced = CURRENT_TIMESTAMP, event_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [importedCount, id]
    );

    console.log(
      `Imported ${importedCount} calendar events from source ${id}${memberId ? ` for member ${memberId}` : ' (family-wide)'}`
    );

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} events`,
      eventsImported: importedCount,
      events: events.slice(0, 10),
    });
  } catch (error) {
    console.error('Error syncing calendar:', error);
    res.status(500).json({
      error: 'Failed to sync calendar',
      details: error.message,
    });
  }
});

export default router;
