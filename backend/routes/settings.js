import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { getAll, runQuery } from '../database.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const settings = await getAll('SELECT key, value FROM settings');
    const settingsObject = settings.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});
    res.json(settingsObject);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({ error: 'Value is required' });
  }

  try {
    await runQuery(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [key, value, value]
    );
    res.json({ key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

router.get('/prompt-content', async (req, res) => {
  try {
    const promptPath = path.join(process.cwd(), 'llm_prompt.md');
    const promptContent = await fs.readFile(promptPath, 'utf8');

    res.json({
      content: promptContent,
    });
  } catch (error) {
    console.error('Error reading prompt file:', error);
    res.status(500).json({ error: 'Failed to read prompt content' });
  }
});

export default router;
