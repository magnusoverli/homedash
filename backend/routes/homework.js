import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAll, getOne, runQuery } from '../database.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { member_id, week_start_date } = req.query;

  console.log(
    `📚 GET /api/homework - member_id: ${member_id}, week_start_date: ${week_start_date}`
  );

  try {
    let homework;
    if (member_id && week_start_date) {
      homework = await getAll(
        'SELECT * FROM homework WHERE member_id = ? AND week_start_date = ? ORDER BY created_at DESC',
        [member_id, week_start_date]
      );
      console.log(
        `📊 Found ${homework.length} homework items for member ${member_id}, week ${week_start_date}`
      );
    } else if (member_id) {
      homework = await getAll(
        'SELECT * FROM homework WHERE member_id = ? ORDER BY created_at DESC',
        [member_id]
      );
    } else if (week_start_date) {
      homework = await getAll(
        'SELECT h.*, fm.name as member_name FROM homework h JOIN family_members fm ON h.member_id = fm.id WHERE h.week_start_date = ? ORDER BY h.created_at DESC',
        [week_start_date]
      );
    } else {
      homework = await getAll(
        'SELECT h.*, fm.name as member_name FROM homework h JOIN family_members fm ON h.member_id = fm.id ORDER BY h.created_at DESC'
      );
    }
    res.json(homework);
  } catch (error) {
    console.error('Error fetching homework:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

router.post('/', async (req, res) => {
  const {
    member_id,
    subject,
    assignment,
    week_start_date,
    completed,
    extracted_from_image,
  } = req.body;

  if (!member_id || !subject || !assignment || !week_start_date) {
    return res.status(400).json({
      error: 'member_id, subject, assignment, and week_start_date are required',
    });
  }

  try {
    const result = await runQuery(
      `INSERT INTO homework (member_id, subject, assignment, week_start_date, completed, extracted_from_image) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        member_id,
        subject,
        assignment,
        week_start_date,
        completed || false,
        extracted_from_image || null,
      ]
    );
    const homework = await getOne('SELECT * FROM homework WHERE id = ?', [
      result.id,
    ]);
    res.status(201).json(homework);
  } catch (error) {
    console.error('Error creating homework:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { subject, assignment, completed } = req.body;

  if (!subject || !assignment) {
    return res.status(400).json({
      error: 'subject and assignment are required',
    });
  }

  try {
    await runQuery(
      `UPDATE homework 
       SET subject = ?, assignment = ?, completed = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [subject, assignment, completed || false, id]
    );
    const homework = await getOne('SELECT * FROM homework WHERE id = ?', [id]);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    res.json(homework);
  } catch (error) {
    console.error('Error updating homework:', error);
    res.status(500).json({ error: 'Failed to update homework' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await runQuery('DELETE FROM homework WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting homework:', error);
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

export default router;
