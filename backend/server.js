import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['http://localhost:3000', 'http://homedash-app:3000']
        : ['http://localhost:5173', 'http://localhost:3000'],
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
    console.error('Error fetching models:', error);
    res.status(500).json({
      error: 'Failed to fetch models',
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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for: http://localhost:5173`);
});
