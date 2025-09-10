import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import multer from 'multer';
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
    // Use a simple message endpoint to validate the API key
    // This is more reliable than trying to use non-existent admin endpoints
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return res.json({
        valid: false,
        message: 'Invalid API key',
      });
    } else if (response.status === 400) {
      // A 400 error might indicate the API key is valid but request is malformed
      // which is actually what we want for testing purposes
      return res.json({
        valid: true,
        message: 'API key is valid!',
      });
    } else if (response.ok) {
      return res.json({
        valid: true,
        message: 'API key is valid and working!',
      });
    } else {
      // Try fallback with models endpoint
      const modelsResponse = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      if (modelsResponse.status === 401) {
        return res.json({
          valid: false,
          message: 'Invalid API key',
        });
      } else if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        const modelCount = modelsData.data ? modelsData.data.length : 0;
        return res.json({
          valid: true,
          message: `API key is valid! Found ${modelCount} available models.`,
        });
      } else {
        return res.json({
          valid: false,
          message: `Could not validate API key: ${response.status}`,
        });
      }
    }
  } catch (error) {
    console.error('Error testing API key:', error);
    
    // Check if it's a timeout error
    if (error.name === 'AbortError') {
      return res.status(500).json({
        valid: false,
        message: 'Request timed out - please check your network connection and try again',
        error: 'TIMEOUT',
      });
    }
    
    return res.status(500).json({
      valid: false,
      message: 'Failed to validate API key - please check your network connection',
      error: error.message,
    });
  }
});

// Get available models endpoint - purely dynamic from Anthropic API
app.post('/api/models', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({
      error: 'API key is required',
      models: [],
    });
  }

  try {
    // Fetch models from Anthropic's API with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const modelsResponse = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (modelsResponse.status === 401) {
      return res.status(401).json({
        error: 'Invalid API key',
        models: [],
      });
    }

    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      
      // Transform the response to match our frontend format
      const models = modelsData.data.map(model => ({
        id: model.id,
        display_name: model.display_name || model.id,
        created_at: model.created_at,
      }));

      console.log(`Successfully fetched ${models.length} models from Anthropic API`);
      res.json({ models });
    } else {
      console.error('Anthropic API returned non-200 status:', modelsResponse.status);
      return res.status(modelsResponse.status).json({
        error: `Failed to fetch models from Anthropic API (${modelsResponse.status})`,
        models: [],
      });
    }
  } catch (error) {
    console.error('Error fetching models from API:', error);
    
    // Check if it's a timeout error
    if (error.name === 'AbortError') {
      return res.status(500).json({
        error: 'Request timed out while fetching models',
        message: 'The request to Anthropic API timed out. Please check your network connection.',
        models: [],
      });
    }
    
    // Check if it's an auth error vs network error
    if (error.message && error.message.includes('401')) {
      return res.status(401).json({
        error: 'Invalid API key',
        models: [],
      });
    }
    
    // For other network errors, return error
    res.status(500).json({
      error: 'Failed to fetch models from Anthropic API',
      message: error.message,
      models: [],
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for messages

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error proxying message:', error);
    
    if (error.name === 'AbortError') {
      return res.status(500).json({
        error: 'Request timed out',
        message: 'The request to Anthropic API timed out. Please try again.',
      });
    }
    
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
    // First, check if the member exists
    const member = await getOne('SELECT * FROM family_members WHERE id = ?', [id]);
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Get counts of related data before deletion (for logging)
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

    // Delete the family member (CASCADE will handle related data)
    const result = await runQuery('DELETE FROM family_members WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Verify cleanup was successful
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

    // If foreign key constraints failed, manually clean up
    if (remainingActivities.count > 0 || remainingHomework.count > 0) {
      console.log('Foreign key constraints may not be working. Manually cleaning up...');
      
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
  const { member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date, notes } =
    req.body;

  if (!member_id || !title || !date || !start_time || !end_time) {
    return res.status(400).json({
      error: 'member_id, title, date, start_time, and end_time are required',
    });
  }

  try {
    const result = await runQuery(
      `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [member_id, title, date, start_time, end_time, description || null, activity_type || 'manual', recurrence_type || 'none', recurrence_end_date || null, notes || null]
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
  const { title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date, notes } = req.body;

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
      [title, date, start_time, end_time, description || null, activity_type || 'manual', recurrence_type || 'none', recurrence_end_date || null, notes || null, id]
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

// Batch delete school schedule for a member
app.delete('/api/school-schedule/:memberId', async (req, res) => {
  const { memberId } = req.params;

  try {
    console.log(`🗑️  Starting batch delete of school schedule for member ${memberId}`);
    const startTime = Date.now();

    // Count records before deletion for logging
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

    const totalBefore = scheduleCountResult.count + activityCountResult.count;
    console.log(`📊 Found ${scheduleCountResult.count} school schedule entries and ${activityCountResult.count} school activity entries (${totalBefore} total)`);

    if (totalBefore === 0) {
      console.log(`ℹ️  No school schedule entries found for member ${memberId}`);
      return res.json({ 
        message: 'No school schedule found to delete',
        deletedCount: 0
      });
    }

    // Batch delete all school-related activities in one operation
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

    const totalDeleted = deleteScheduleResult.changes + deleteActivityResult.changes;
    const endTime = Date.now();
    
    console.log(`✅ Batch delete completed in ${endTime - startTime}ms`);
    console.log(`📈 Deleted ${deleteScheduleResult.changes} schedule entries and ${deleteActivityResult.changes} activity entries (${totalDeleted} total)`);

    res.json({
      message: 'School schedule deleted successfully',
      deletedCount: totalDeleted,
      scheduleEntries: deleteScheduleResult.changes,
      activityEntries: deleteActivityResult.changes,
      executionTime: endTime - startTime
    });

  } catch (error) {
    console.error('Error batch deleting school schedule:', error);
    res.status(500).json({ error: 'Failed to delete school schedule' });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Homework Endpoints
app.get('/api/homework', async (req, res) => {
  const { member_id } = req.query;
  
  try {
    let homework;
    if (member_id) {
      homework = await getAll(
        'SELECT * FROM homework WHERE member_id = ? ORDER BY created_at DESC',
        [member_id]
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

app.post('/api/homework', async (req, res) => {
  const { member_id, subject, assignment, due_date, completed, extracted_from_image } = req.body;

  if (!member_id || !subject || !assignment) {
    return res.status(400).json({ 
      error: 'member_id, subject, and assignment are required' 
    });
  }

  try {
    const result = await runQuery(
      `INSERT INTO homework (member_id, subject, assignment, due_date, completed, extracted_from_image) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [member_id, subject, assignment, due_date || null, completed || false, extracted_from_image || null]
    );
    const homework = await getOne('SELECT * FROM homework WHERE id = ?', [result.id]);
    res.status(201).json(homework);
  } catch (error) {
    console.error('Error creating homework:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

app.put('/api/homework/:id', async (req, res) => {
  const { id } = req.params;
  const { subject, assignment, due_date, completed } = req.body;

  if (!subject || !assignment) {
    return res.status(400).json({ 
      error: 'subject and assignment are required' 
    });
  }

  try {
    await runQuery(
      `UPDATE homework 
       SET subject = ?, assignment = ?, due_date = ?, completed = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [subject, assignment, due_date || null, completed || false, id]
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

app.delete('/api/homework/:id', async (req, res) => {
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

// School Plan Extraction Endpoint
app.post('/api/extract-school-plan', upload.single('schoolPlanImage'), async (req, res) => {
  const { member_id, api_key, selected_model } = req.body;
  const imageFile = req.file;

  console.log('=== SCHOOL PLAN EXTRACTION STARTED ===');
  console.log(`Member ID: ${member_id}`);
  console.log(`Image file: ${imageFile ? imageFile.originalname : 'none'}`);
  console.log(`Image size: ${imageFile ? (imageFile.size / 1024).toFixed(2) : 0} KB`);
  console.log(`Image type: ${imageFile ? imageFile.mimetype : 'none'}`);
  console.log(`API key provided: ${api_key ? 'Yes (length: ' + api_key.length + ')' : 'No'}`);
  console.log(`Selected model: ${selected_model || 'Not specified (will use default)'}`);

  if (!member_id || !api_key || !imageFile) {
    console.log('❌ Validation failed - missing required fields');
    return res.status(400).json({ 
      error: 'member_id, api_key, and schoolPlanImage are required' 
    });
  }

  try {
    // Get the selected prompt version from settings
    const promptVersionSetting = await getOne('SELECT value FROM settings WHERE key = ?', ['selectedPromptVersion']);
    const selectedVersion = promptVersionSetting?.value || 'original';
    
    // Read the appropriate prompt file
    const path = await import('path');
    const fs = await import('fs');
    const promptFileName = selectedVersion === 'optimized' ? 'llm_promt_optimized.md' : 'llm_promt.md';
    const promptPath = path.join(process.cwd(), promptFileName);
    const prompt = fs.readFileSync(promptPath, 'utf8');
    console.log(`📄 Prompt loaded successfully (${prompt.length} characters, version: ${selectedVersion})`);

    // Convert image to base64
    const imageBase64 = imageFile.buffer.toString('base64');
    const imageMimeType = imageFile.mimetype;
    console.log(`🖼️  Image converted to base64 (${imageBase64.length} characters)`);
    console.log(`📡 Sending request to Anthropic API...`);

    // Prepare the message for Claude with vision
    // Determine which model to use (user selection or fallback to default)
    const modelToUse = selected_model || 'claude-3-5-sonnet-20241022';
    console.log(`🤖 Using model: ${modelToUse}`);
    
    // Note: We assume the user has selected a vision-capable model
    // Most Claude 3+ models support vision, but if there are issues,
    // the Anthropic API will return a clear error message
    
    const messageData = {
      model: modelToUse, // Use selected model or fallback to default
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMimeType,
                data: imageBase64
              }
            }
          ]
        }
      ]
    };

    // Send request to Anthropic API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for vision

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      console.log(`❌ Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      return res.status(response.status).json({
        error: 'Failed to extract school plan',
        message: errorData.error?.message || 'Unknown error from Anthropic API'
      });
    }

    const data = await response.json();
    const extractedText = data.content[0].text;
    console.log(`✅ Anthropic API response received`);
    console.log(`📝 Extracted text length: ${extractedText.length} characters`);
    console.log('--- RAW LLM RESPONSE ---');
    console.log(extractedText);
    console.log('--- END RAW RESPONSE ---');

    // Parse the extracted datasets from the response
    let extractedData;
    try {
      console.log('🔍 Parsing LLM response for datasets...');
      extractedData = parseSchoolPlanResponse(extractedText);
      console.log('✅ Parsing successful');
      console.log(`📊 Parsed datasets:`)
      console.log(`   - school_schedule: ${extractedData.school_schedule ? Object.keys(extractedData.school_schedule).length : 0} days`);
      console.log(`   - school_activities: ${extractedData.school_activities ? extractedData.school_activities.length : 0} activities`);
      console.log(`   - school_homework: ${extractedData.school_homework ? extractedData.school_homework.length : 0} assignments`);
    } catch (parseError) {
      console.error('❌ Error parsing LLM response:', parseError);
      return res.status(400).json({
        error: 'Failed to parse extracted data',
        message: 'The AI response could not be parsed into the expected format',
        rawResponse: extractedText
      });
    }

    // Transform and save the data
    console.log('💾 Saving extracted data to database...');
    const savedData = await saveExtractedSchoolPlan(member_id, extractedData, imageFile.originalname);
    console.log('✅ Data saved successfully');
    console.log(`📈 Saved records:`)
    console.log(`   - schedules: ${savedData.schedules.length}`);
    console.log(`   - activities: ${savedData.activities.length}`);
    console.log(`   - homework: ${savedData.homework.length}`);

    console.log('🎉 SCHOOL PLAN EXTRACTION COMPLETED SUCCESSFULLY');

    res.json({
      success: true,
      message: 'School plan extracted successfully',
      extractedData: extractedData,
      savedData: savedData
    });

  } catch (error) {
    console.error('❌ Error extracting school plan:', error);
    console.log('💥 SCHOOL PLAN EXTRACTION FAILED');
    
    if (error.name === 'AbortError') {
      console.log('⏰ Request timed out');
      return res.status(500).json({
        error: 'Request timed out',
        message: 'The extraction request took too long. Please try again.',
      });
    }
    
    console.log(`🚨 Error details: ${error.message}`);
    res.status(500).json({
      error: 'Failed to extract school plan',
      message: error.message,
    });
  }
});

// Helper function to parse the LLM response
function parseSchoolPlanResponse(responseText) {
  console.log('🔄 Starting LLM response parsing (school_schedule + school_activities)...');
  
  const datasets = {
    school_schedule: null,
    school_activities: null,
    school_homework: null
  };

  try {
    // Parse school_schedule (existing logic)
    console.log('📅 Parsing school_schedule...');
    const mondayIndex = responseText.indexOf('"Monday"');
    let scheduleStart = -1;
    
    if (mondayIndex !== -1) {
      // Work backwards from "Monday" to find the opening brace
      for (let i = mondayIndex - 1; i >= 0; i--) {
        const char = responseText[i];
        if (char === '{') {
          scheduleStart = i;
          break;
        } else if (char !== ' ' && char !== '\n' && char !== '\r' && char !== '\t') {
          break;
        }
      }
    }
    
    if (scheduleStart !== -1) {
      console.log('📅 Found schedule starting at position:', scheduleStart);
      
      // Find the matching closing brace
      let braceCount = 0;
      let scheduleEnd = scheduleStart;
      let inString = false;
      let escapeNext = false;
      
      for (let i = scheduleStart; i < responseText.length; i++) {
        const char = responseText[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              scheduleEnd = i;
              break;
            }
          }
        }
      }
      
      if (braceCount === 0) {
        const scheduleText = responseText.substring(scheduleStart, scheduleEnd + 1);
        console.log(`📋 Schedule JSON text: ${scheduleText}`);
        datasets.school_schedule = JSON.parse(scheduleText);
        console.log(`✅ Parsed school_schedule with ${Object.keys(datasets.school_schedule).length} days`);
      } else {
        console.log('❌ Could not find closing brace for schedule JSON');
      }
    } else {
      console.log('❌ Could not find school schedule in response');
    }

    // Parse school_activities
    console.log('🎯 Parsing school_activities...');
    
    // Look for the activities array - it should start with [ and contain "day" fields
    const activitiesPatterns = [
      /Dataset 2 - school_activities:\s*(\[[\s\S]*?\])/i,
      /school_activities[:\s]*(\[[\s\S]*?\])/i,
      /activities[:\s]*(\[[\s\S]*?\])/i
    ];
    
    let activitiesFound = false;
    
    for (const pattern of activitiesPatterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        try {
          console.log(`🎯 Found activities pattern: ${match[1].substring(0, 100)}...`);
          
          // Extract the JSON array
          let activitiesText = match[1].trim();
          
          // Find the complete array by balancing brackets
          let bracketCount = 0;
          let inString = false;
          let escapeNext = false;
          let endIndex = -1;
          
          for (let i = 0; i < activitiesText.length; i++) {
            const char = activitiesText[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"') {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '[') {
                bracketCount++;
              } else if (char === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                  endIndex = i;
                  break;
                }
              }
            }
          }
          
          if (endIndex !== -1) {
            activitiesText = activitiesText.substring(0, endIndex + 1);
            console.log(`📋 Activities JSON text: ${activitiesText}`);
            
            const parsedActivities = JSON.parse(activitiesText);
            
            // Ensure each activity has required fields with defaults
            datasets.school_activities = parsedActivities.map(activity => ({
              day: activity.day,
              name: activity.name,
              start: activity.start,
              end: activity.end,
              type: activity.type || 'recurring', // Default to recurring for backward compatibility
              specific_date: activity.specific_date || null
            }));
            
            console.log(`✅ Parsed school_activities with ${datasets.school_activities.length} activities`);
            console.log(`📊 Activity types: ${datasets.school_activities.map(a => `${a.name}:${a.type}`).join(', ')}`);
            activitiesFound = true;
            break;
          }
        } catch (parseError) {
          console.log(`⚠️  Failed to parse activities with pattern ${pattern}: ${parseError.message}`);
          continue;
        }
      }
    }
    
    if (!activitiesFound) {
      console.log('📝 No school_activities found in response');
      datasets.school_activities = [];
    }

    // Skip homework parsing for now
    console.log('⏭️  Skipping homework parsing (focusing on schedule + activities)');

    return datasets;
  } catch (error) {
    console.error(`❌ JSON parsing error: ${error.message}`);
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}

// Helper function to calculate school year dates
function getSchoolYearRange(importDate = new Date()) {
  const currentYear = importDate.getFullYear();
  const currentMonth = importDate.getMonth(); // 0-based (0 = January)
  
  let schoolYearStart, schoolYearEnd;
  
  if (currentMonth >= 7) { // August (7) or later - current school year
    schoolYearStart = new Date(currentYear, 7, 1); // August 1st
    schoolYearEnd = new Date(currentYear + 1, 6, 31); // July 31st next year
  } else { // Before August - previous school year
    schoolYearStart = new Date(currentYear - 1, 7, 1); // August 1st previous year
    schoolYearEnd = new Date(currentYear, 6, 31); // July 31st current year
  }
  
  return { schoolYearStart, schoolYearEnd };
}

// Helper function to get the start of the week (Monday) for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to save extracted data to database
async function saveExtractedSchoolPlan(memberId, extractedData, imageFileName) {
  console.log(`💾 Starting database save for member ${memberId}`);
  
  const savedData = {
    schedules: [],
    activities: [],
    homework: []
  };

  try {
    // Get school year range and import week start (used for both schedules and activities)
    const importDate = new Date();
    const { schoolYearStart, schoolYearEnd } = getSchoolYearRange(importDate);
    const importWeekStart = getWeekStart(importDate);
    
    // Day mapping used for both schedules and activities
    const dayMapping = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5
    };
    
    console.log(`📚 School year: ${schoolYearStart.toDateString()} to ${schoolYearEnd.toDateString()}`);
    console.log(`📆 Import week starts: ${importWeekStart.toDateString()}`);

    // Save school schedule as recurring activities
    if (extractedData.school_schedule) {
      console.log(`📅 Processing recurring school schedule...`);
      
      // Step 1: Clean up existing school schedules from import week onwards
      console.log(`🧹 Cleaning up existing school schedules from ${importWeekStart.toISOString().split('T')[0]} onwards...`);
      const deleteResult = await runQuery(
        `DELETE FROM activities 
         WHERE member_id = ? 
         AND description LIKE '%[TYPE:school_schedule]%' 
         AND date >= ?`,
        [memberId, importWeekStart.toISOString().split('T')[0]]
      );
      console.log(`🗑️  Deleted ${deleteResult.changes || 0} existing school schedule entries`);
      
      // Step 2: Generate recurring entries for each day of the week (BATCH OPTIMIZED)
      console.log(`📦 Preparing batch insert for school schedule entries...`);
      
      // Collect all entries first, then batch insert
      const batchEntries = [];
      const allDayEntries = {}; // Track entries for savedData response
      
      for (const [day, times] of Object.entries(extractedData.school_schedule)) {
        console.log(`📅 Processing day: ${day}, times:`, times);
        if (times && times.start && times.end) {
          const dayNum = dayMapping[day];
          console.log(`🗓️  Day ${day} mapped to number: ${dayNum}`);
          
          if (dayNum) {
            // Generate entries for this day throughout the school year
            let currentWeek = new Date(importWeekStart);
            let entriesCreated = 0;
            allDayEntries[day] = [];
            
            while (currentWeek <= schoolYearEnd) {
              // Calculate the specific date for this day of the week
              const targetDate = new Date(currentWeek);
              const dayDiff = dayNum - 1; // dayNum is 1-based, we need 0-based for date calculation
              targetDate.setDate(currentWeek.getDate() + dayDiff);
              
              // Only create if the date is within school year and not in the past
              if (targetDate >= importWeekStart && targetDate <= schoolYearEnd) {
                const dateString = targetDate.toISOString().split('T')[0];
                const notes = times.notes || null;
                
                // Add to batch entries array instead of individual insert
                batchEntries.push([
                  memberId, 
                  'School', 
                  dateString,
                  times.start,
                  times.end,
                  'Regular school schedule [TYPE:school_schedule]',
                  'school_schedule',
                  'weekly',
                  schoolYearEnd.toISOString().split('T')[0],
                  notes
                ]);
                entriesCreated++;
                
                // Store for savedData response (first few entries)
                if (entriesCreated <= 10) {
                  allDayEntries[day].push({ day, date: dateString, ...times });
                }
              }
              
              // Move to next week
              currentWeek.setDate(currentWeek.getDate() + 7);
            }
            
            console.log(`📋 Prepared ${entriesCreated} entries for ${day} (batch)`);
          } else {
            console.log(`⚠️  Day ${day} not recognized in dayMapping`);
          }
        } else {
          console.log(`⚠️  Missing start/end times for ${day}:`, times);
        }
      }
      
      // Execute batch insert for all school schedule entries
      if (batchEntries.length > 0) {
        console.log(`💾 Executing batch insert for ${batchEntries.length} school schedule entries...`);
        const startTime = Date.now();
        
        // Create placeholders for batch insert
        const placeholders = batchEntries.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatParams = batchEntries.flat();
        
        await runQuery(
          `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date, notes) 
           VALUES ${placeholders}`,
          flatParams
        );
        
        const endTime = Date.now();
        console.log(`✅ Batch insert completed in ${endTime - startTime}ms (${batchEntries.length} records)`);
        
        // Add sample entries to savedData for response (maintain original behavior)
        for (const [day, entries] of Object.entries(allDayEntries)) {
          for (const entry of entries) {
            savedData.schedules.push(entry);
          }
        }
      } else {
        console.log(`ℹ️  No school schedule entries to create`);
      }
    }

    // Save school activities as recurring activities (BATCH OPTIMIZED)
    if (extractedData.school_activities && extractedData.school_activities.length > 0) {
      console.log(`🎯 Processing school activities...`);
      
      // Clean up existing school activities from import week onwards
      console.log(`🧹 Cleaning up existing school activities from ${importWeekStart.toISOString().split('T')[0]} onwards...`);
      const deleteActivitiesResult = await runQuery(
        `DELETE FROM activities 
         WHERE member_id = ? 
         AND description LIKE '%[TYPE:school_activity]%' 
         AND date >= ?`,
        [memberId, importWeekStart.toISOString().split('T')[0]]
      );
      console.log(`🗑️  Deleted ${deleteActivitiesResult.changes || 0} existing school activity entries`);
      
      // Collect all activity entries for batch processing
      const batchActivityEntries = [];
      const activitySamples = []; // For savedData response
      
      // Process each school activity with type awareness
      for (const activity of extractedData.school_activities) {
        console.log(`🎯 Processing ${activity.type || 'recurring'} activity:`, activity);
        
        if (activity.day && activity.name && activity.start && activity.end) {
          const dayNum = dayMapping[activity.day];
          console.log(`🗓️  Activity "${activity.name}" on ${activity.day} (${dayNum}) ${activity.start}-${activity.end} - Type: ${activity.type || 'recurring'}`);
          
          if (dayNum) {
            const activityType = activity.type || 'recurring';
            const recurrenceType = activityType === 'recurring' ? 'weekly' : 'none';
            const recurrenceEndDate = activityType === 'recurring' ? schoolYearEnd.toISOString().split('T')[0] : null;
            
            if (activityType === 'one_time') {
              // Handle one-time activities
              console.log(`📅 Preparing one-time entry for ${activity.name} (${activity.day})`);
              
              // One-time activities are always placed on the corresponding day of the current import week
              const targetDate = new Date(importWeekStart);
              const dayDiff = dayNum - 1; // dayNum is 1-based, we need 0-based for date calculation
              targetDate.setDate(importWeekStart.getDate() + dayDiff);
              console.log(`📍 Placing one-time activity on ${activity.day} of current week: ${targetDate.toISOString().split('T')[0]}`);
              
              if (targetDate >= importWeekStart && targetDate <= schoolYearEnd) {
                const dateString = targetDate.toISOString().split('T')[0];
                
                // Add to batch entries
                batchActivityEntries.push([
                  memberId, 
                  activity.name, 
                  dateString,
                  activity.start,
                  activity.end,
                  `School activity: ${activity.name} [TYPE:school_activity]`,
                  'school_activity',
                  recurrenceType,
                  recurrenceEndDate
                ]);
                
                // Add to samples for response
                activitySamples.push({ 
                  day: activity.day, 
                  name: activity.name,
                  date: dateString, 
                  start: activity.start,
                  end: activity.end,
                  type: activityType
                });
                
                console.log(`📋 Prepared one-time entry for "${activity.name}" on ${dateString}`);
              } else {
                console.log(`⚠️  One-time activity date ${targetDate.toISOString().split('T')[0]} is outside school year range`);
              }
            } else {
              // Handle recurring activities
              console.log(`📅 Preparing recurring entries for ${activity.name} (${activity.day})`);
              
              // Generate recurring entries for this activity throughout the school year
              let currentWeek = new Date(importWeekStart);
              let entriesCreated = 0;
              
              while (currentWeek <= schoolYearEnd) {
                // Calculate the specific date for this day of the week
                const targetDate = new Date(currentWeek);
                const dayDiff = dayNum - 1; // dayNum is 1-based, we need 0-based for date calculation
                targetDate.setDate(currentWeek.getDate() + dayDiff);
                
                // Only create if the date is within school year and not in the past
                if (targetDate >= importWeekStart && targetDate <= schoolYearEnd) {
                  const dateString = targetDate.toISOString().split('T')[0];
                  
                  // Add to batch entries
                  batchActivityEntries.push([
                    memberId, 
                    activity.name, 
                    dateString,
                    activity.start,
                    activity.end,
                    `School activity: ${activity.name} [TYPE:school_activity]`,
                    'school_activity',
                    recurrenceType,
                    recurrenceEndDate
                  ]);
                  entriesCreated++;
                  
                  // Only add to samples for the first few entries (to avoid huge response)
                  if (entriesCreated <= 5) {
                    activitySamples.push({ 
                      day: activity.day, 
                      name: activity.name,
                      date: dateString, 
                      start: activity.start,
                      end: activity.end,
                      type: activityType
                    });
                  }
                }
                
                // Move to next week
                currentWeek.setDate(currentWeek.getDate() + 7);
              }
              
              console.log(`📋 Prepared ${entriesCreated} recurring entries for activity "${activity.name}"`);
            }
          } else {
            console.log(`⚠️  Day ${activity.day} not recognized in dayMapping`);
          }
        } else {
          console.log(`⚠️  Missing required fields for activity:`, activity);
        }
      }
      
      // Execute batch insert for all school activity entries
      if (batchActivityEntries.length > 0) {
        console.log(`💾 Executing batch insert for ${batchActivityEntries.length} school activity entries...`);
        const startTime = Date.now();
        
        // Create placeholders for batch insert
        const placeholders = batchActivityEntries.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatParams = batchActivityEntries.flat();
        
        await runQuery(
          `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date) 
           VALUES ${placeholders}`,
          flatParams
        );
        
        const endTime = Date.now();
        console.log(`✅ Batch insert completed in ${endTime - startTime}ms (${batchActivityEntries.length} records)`);
        
        // Add sample entries to savedData for response
        savedData.activities.push(...activitySamples);
      } else {
        console.log(`ℹ️  No school activity entries to create`);
      }
    } else {
      console.log('📝 No school activities to process');
    }

    // Skip homework for now  
    console.log('⏭️  Skipping homework (focusing on schedules + activities only)');

    console.log(`✅ Database save completed successfully`);
    return savedData;
  } catch (error) {
    console.error('❌ Error saving extracted school plan:', error);
    throw error;
  }
}

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

// Prompt Content Endpoint
app.get('/api/prompt-content', async (req, res) => {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    // Get the selected prompt version from settings
    const promptVersionSetting = await getOne('SELECT value FROM settings WHERE key = ?', ['selectedPromptVersion']);
    const selectedVersion = promptVersionSetting?.value || 'original';
    
    // Determine which prompt file to read
    const promptFileName = selectedVersion === 'optimized' ? 'llm_promt_optimized.md' : 'llm_promt.md';
    const promptPath = path.join(__dirname, promptFileName);
    
    // Read and return the prompt content
    const promptContent = await fs.readFile(promptPath, 'utf8');
    
    res.json({
      version: selectedVersion,
      content: promptContent
    });
  } catch (error) {
    console.error('Error reading prompt file:', error);
    
    // Fallback to original prompt if optimized file doesn't exist or there's an error
    try {
      const fallbackPath = path.join(__dirname, 'llm_promt.md');
      const fallbackContent = await fs.readFile(fallbackPath, 'utf8');
      
      res.json({
        version: 'original',
        content: fallbackContent
      });
    } catch (fallbackError) {
      console.error('Error reading fallback prompt file:', fallbackError);
      res.status(500).json({ error: 'Failed to read prompt content' });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`CORS enabled for: dynamic origins based on request`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
