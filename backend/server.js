import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { initDatabase, runQuery, getAll, getOne } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

initDatabase().catch(console.error);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      // In production, allow requests from any origin on port 3000 or common dev ports
      if (process.env.NODE_ENV === 'production') {
        // Allow any origin that's accessing the frontend
        // This is safe because we're in a local network environment
        return callback(null, true);
      }

      // In development, allow localhost with common ports
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow same hostname with different ports (for local network access)
      try {
        const validPorts = ['3000', '3001', '5173'];
        const requestPort = new URL(origin).port;

        if (validPorts.includes(requestPort)) {
          return callback(null, true);
        }
      } catch (e) {
        // Invalid URL, reject
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test API key endpoint
app.post('/api/test-key', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({
      valid: false,
      message: 'API key is required',
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.status === 401) {
      return res.json({
        valid: false,
        message: 'Invalid API key',
      });
    } else if (response.status === 400) {
      // 400 can mean the request is malformed but the key is valid
      const errorData = await response.json();
      if (
        errorData.error?.type === 'invalid_request_error' &&
        errorData.error?.message?.includes('credit')
      ) {
        return res.json({
          valid: false,
          message: 'API key is valid but has no credits',
        });
      }
      // If we get a 400 for other reasons, the key is likely valid
      return res.json({
        valid: true,
        message: 'API key is valid',
      });
    } else if (response.ok) {
      return res.json({
        valid: true,
        message: 'API key is valid',
      });
    } else {
      return res.json({
        valid: false,
        message: `Unexpected response: ${response.status}`,
      });
    }
  } catch (error) {
    console.error('Error testing API key:', error);
    return res.status(500).json({
      valid: false,
      message: 'Failed to validate API key',
      error: error.message,
    });
  }
});

// Get available models endpoint
app.post('/api/models', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({
      error: 'API key is required',
      models: [],
    });
  }

  // Since Anthropic doesn't have a models endpoint, we return the current available models
  // This endpoint validates the key and returns models if valid
  try {
    // First validate the API key with a minimal request
    const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (testResponse.status === 401) {
      return res.status(401).json({
        error: 'Invalid API key',
        models: [],
      });
    }

    // If key is valid (or we get a 400 for other reasons), return available models
    const models = [
      {
        id: 'claude-opus-4-1-20250805',
        display_name: 'Claude Opus 4.1 (Most Capable)',
        context_window: 200000,
        max_tokens: 32000,
      },
      {
        id: 'claude-opus-4-20250514',
        display_name: 'Claude Opus 4',
        context_window: 200000,
        max_tokens: 32000,
      },
      {
        id: 'claude-sonnet-4-20250514',
        display_name: 'Claude Sonnet 4 (High Performance)',
        context_window: 200000,
        max_tokens: 64000,
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        display_name: 'Claude Sonnet 3.7',
        context_window: 200000,
        max_tokens: 64000,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        display_name: 'Claude Haiku 3.5 (Fastest)',
        context_window: 200000,
        max_tokens: 8192,
      },
      {
        id: 'claude-3-haiku-20240307',
        display_name: 'Claude Haiku 3',
        context_window: 200000,
        max_tokens: 4096,
      },
    ];

    res.json({ models, valid: true });
  } catch (error) {
    console.error('Error validating API key:', error);
    // Return models anyway since the models list is static
    // The API key validation is just for user feedback
    const models = [
      {
        id: 'claude-opus-4-1-20250805',
        display_name: 'Claude Opus 4.1 (Most Capable)',
        context_window: 200000,
        max_tokens: 32000,
      },
      {
        id: 'claude-opus-4-20250514',
        display_name: 'Claude Opus 4',
        context_window: 200000,
        max_tokens: 32000,
      },
      {
        id: 'claude-sonnet-4-20250514',
        display_name: 'Claude Sonnet 4 (High Performance)',
        context_window: 200000,
        max_tokens: 64000,
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        display_name: 'Claude Sonnet 3.7',
        context_window: 200000,
        max_tokens: 64000,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        display_name: 'Claude Haiku 3.5 (Fastest)',
        context_window: 200000,
        max_tokens: 8192,
      },
      {
        id: 'claude-3-haiku-20240307',
        display_name: 'Claude Haiku 3',
        context_window: 200000,
        max_tokens: 4096,
      },
    ];
    
    res.json({ 
      models, 
      valid: false, 
      warning: 'Could not validate API key, but models are available' 
    });
  }
});

// Proxy messages to Anthropic (for future use when implementing actual LLM features)
app.post('/api/messages', async (req, res) => {
  const { apiKey, ...messageData } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error proxying message:', error);
    res.status(500).json({
      error: 'Failed to proxy message',
      message: error.message,
    });
  }
});

// Family Members Endpoints
app.get('/api/family-members', async (req, res) => {
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

app.post('/api/family-members', async (req, res) => {
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

app.put('/api/family-members/:id', async (req, res) => {
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

app.delete('/api/family-members/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await runQuery('DELETE FROM family_members WHERE id = ?', [
      id,
    ]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

// Activities Endpoints
app.get('/api/activities', async (req, res) => {
  const { member_id, date, start_date, end_date } = req.query;

  try {
    let sql = 'SELECT * FROM activities WHERE 1=1';
    const params = [];

    if (member_id) {
      sql += ' AND member_id = ?';
      params.push(member_id);
    }

    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }

    if (start_date && end_date) {
      sql += ' AND date >= ? AND date <= ?';
      params.push(start_date, end_date);
    }

    sql += ' ORDER BY date, start_time';

    const activities = await getAll(sql, params);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.post('/api/activities', async (req, res) => {
  const { member_id, title, date, start_time, end_time, description } =
    req.body;

  if (!member_id || !title || !date || !start_time || !end_time) {
    return res.status(400).json({
      error: 'member_id, title, date, start_time, and end_time are required',
    });
  }

  try {
    const result = await runQuery(
      `INSERT INTO activities (member_id, title, date, start_time, end_time, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [member_id, title, date, start_time, end_time, description || null]
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

app.put('/api/activities/:id', async (req, res) => {
  const { id } = req.params;
  const { title, date, start_time, end_time, description } = req.body;

  if (!title || !date || !start_time || !end_time) {
    return res.status(400).json({
      error: 'title, date, start_time, and end_time are required',
    });
  }

  try {
    await runQuery(
      `UPDATE activities 
       SET title = ?, date = ?, start_time = ?, end_time = ?, description = ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [title, date, start_time, end_time, description || null, id]
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

app.delete('/api/activities/:id', async (req, res) => {
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

// Settings Endpoints
app.get('/api/settings', async (req, res) => {
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

app.put('/api/settings/:key', async (req, res) => {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`CORS enabled for: dynamic origins based on request`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
