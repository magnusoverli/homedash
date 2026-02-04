import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAll, getOne, runQuery } from '../database.js';

const router = express.Router();

router.use(requireAuth);

// Get all family members
router.get('/', async (req, res) => {
  try {
    const members = await getAll(
      'SELECT * FROM family_members ORDER BY created_at'
    );
    // Parse source_colors JSON for each member
    const parsedMembers = members.map(member => ({
      ...member,
      source_colors: member.source_colors
        ? JSON.parse(member.source_colors)
        : null,
    }));
    res.json(parsedMembers);
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// Create a new family member
router.post('/', async (req, res) => {
  const { name, color, source_colors } = req.body;

  if (!name || !color) {
    return res.status(400).json({ error: 'Name and color are required' });
  }

  try {
    const sourceColorsJson = source_colors
      ? JSON.stringify(source_colors)
      : null;
    const result = await runQuery(
      'INSERT INTO family_members (name, color, source_colors) VALUES (?, ?, ?)',
      [name, color, sourceColorsJson]
    );
    const member = await getOne('SELECT * FROM family_members WHERE id = ?', [
      result.id,
    ]);
    // Parse source_colors back to object
    if (member.source_colors) {
      member.source_colors = JSON.parse(member.source_colors);
    }
    res.status(201).json(member);
  } catch (error) {
    console.error('Error creating family member:', error);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

// Update a family member
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color, source_colors } = req.body;

  if (!name || !color) {
    return res.status(400).json({ error: 'Name and color are required' });
  }

  try {
    const sourceColorsJson = source_colors
      ? JSON.stringify(source_colors)
      : null;
    await runQuery(
      'UPDATE family_members SET name = ?, color = ?, source_colors = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, color, sourceColorsJson, id]
    );
    const member = await getOne('SELECT * FROM family_members WHERE id = ?', [
      id,
    ]);
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    // Parse source_colors back to object
    if (member.source_colors) {
      member.source_colors = JSON.parse(member.source_colors);
    }
    res.json(member);
  } catch (error) {
    console.error('Error updating family member:', error);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

// Delete a family member
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

    // Clean up any orphaned data (in case foreign keys didn't cascade)
    const remainingActivities = await getOne(
      'SELECT COUNT(*) as count FROM activities WHERE member_id = ?',
      [id]
    );
    const remainingHomework = await getOne(
      'SELECT COUNT(*) as count FROM homework WHERE member_id = ?',
      [id]
    );

    if (remainingActivities.count > 0 || remainingHomework.count > 0) {
      console.log('Cleaning up orphaned data...');
      await runQuery('DELETE FROM activities WHERE member_id = ?', [id]);
      await runQuery('DELETE FROM homework WHERE member_id = ?', [id]);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

export default router;
