import express from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/test-key', async (req, res) => {
  const { apiKey } = req.body;

  console.log('=== ANTHROPIC API KEY VALIDATION ===');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`🔑 API Key provided: ${apiKey ? 'YES' : 'NO'}`);
  console.log(`🔑 API Key length: ${apiKey?.length || 0} characters`);
  console.log(
    `🔑 API Key format: ${apiKey ? (apiKey.startsWith('sk-ant-') ? 'CORRECT (sk-ant-*)' : 'INCORRECT (should start with sk-ant-)') : 'N/A'}`
  );

  if (!apiKey) {
    console.log('❌ No API key provided');
    console.log('=== END API KEY VALIDATION ===');
    return res.status(400).json({
      valid: false,
      message: 'API key is required',
    });
  }

  try {
    console.log('🚀 Starting Anthropic API validation...');
    console.log('📡 Testing with Messages API endpoint');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log('📤 Request details:');
    console.log('  - URL: https://api.anthropic.com/v1/messages');
    console.log('  - Method: POST');
    console.log('  - Headers: x-api-key, anthropic-version, Content-Type');
    console.log('  - Body: test message with claude-3-haiku-20240307');
    console.log('  - Timeout: 10 seconds');

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
        messages: [{ role: 'user', content: 'Hi' }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📥 Messages API response status: ${response.status}`);
    console.log(`📥 Messages API response status text: ${response.statusText}`);

    if (response.status === 401) {
      console.log('❌ API key validation FAILED - 401 Unauthorized');
      console.log('=== END API KEY VALIDATION ===');
      return res.json({
        valid: false,
        message: 'Invalid API key',
      });
    } else if (response.status === 400) {
      console.log(
        '✅ API key validation SUCCESS - 400 indicates valid key with malformed request'
      );
      console.log('=== END API KEY VALIDATION ===');
      return res.json({
        valid: true,
        message: 'API key is valid!',
      });
    } else if (response.ok) {
      console.log('✅ API key validation SUCCESS - 200 OK with valid response');
      console.log('=== END API KEY VALIDATION ===');
      return res.json({
        valid: true,
        message: 'API key is valid and working!',
      });
    } else {
      console.log(
        `⚠️ Messages API returned unexpected status: ${response.status}`
      );
      console.log('🔄 Trying fallback validation with Models API...');

      const modelsResponse = await fetch(
        'https://api.anthropic.com/v1/models',
        {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      console.log(`📥 Models API response status: ${modelsResponse.status}`);
      console.log(
        `📥 Models API response status text: ${modelsResponse.statusText}`
      );

      if (modelsResponse.status === 401) {
        console.log('❌ API key validation FAILED - Models API returned 401');
        console.log('=== END API KEY VALIDATION ===');
        return res.json({
          valid: false,
          message: 'Invalid API key',
        });
      } else if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        const modelCount = modelsData.data ? modelsData.data.length : 0;
        console.log(
          `✅ API key validation SUCCESS - Models API returned ${modelCount} models`
        );
        console.log('=== END API KEY VALIDATION ===');
        return res.json({
          valid: true,
          message: `API key is valid! Found ${modelCount} available models.`,
        });
      } else {
        console.log(
          `❌ Both APIs failed - Messages: ${response.status}, Models: ${modelsResponse.status}`
        );
        console.log('=== END API KEY VALIDATION ===');
        return res.json({
          valid: false,
          message: `Could not validate API key: Messages API ${response.status}, Models API ${modelsResponse.status}`,
        });
      }
    }
  } catch (error) {
    console.log('💥 API key validation ERROR occurred');
    console.error('🔍 Error details:');
    console.error(`  - Type: ${error.constructor.name}`);
    console.error('Error testing API key:', error);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.name === 'AbortError') {
      console.log('⏰ Request timed out after 10 seconds');
      console.log('=== END API KEY VALIDATION ===');
      return res.status(500).json({
        valid: false,
        message:
          'Request timed out - please check your network connection and try again',
        error: 'TIMEOUT',
      });
    }

    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      console.log('🌐 DNS resolution failed - cannot reach api.anthropic.com');
      console.log('=== END API KEY VALIDATION ===');
      return res.status(500).json({
        valid: false,
        message:
          'Cannot reach Anthropic API - DNS resolution failed. Check your network/firewall settings.',
        error: error.code,
      });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log(
        '🔌 Connection refused or timed out - network/firewall issue'
      );
      console.log('=== END API KEY VALIDATION ===');
      return res.status(500).json({
        valid: false,
        message:
          'Cannot connect to Anthropic API - connection refused or timed out. Check firewall/proxy settings.',
        error: error.code,
      });
    }

    console.log('❓ Unknown error type - check error details above');
    console.log('=== END API KEY VALIDATION ===');

    return res.status(500).json({
      valid: false,
      message:
        'Failed to validate API key - please check your network connection',
      error: error.message,
      errorCode: error.code,
    });
  }
});

router.post('/models', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({
      error: 'API key is required',
      models: [],
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const modelsResponse = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
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

      const models = modelsData.data.map(model => ({
        id: model.id,
        display_name: model.display_name || model.id,
        created_at: model.created_at,
      }));

      console.log(
        `Successfully fetched ${models.length} models from Anthropic API`
      );
      res.json({ models });
    } else {
      console.error(
        'Anthropic API returned non-200 status:',
        modelsResponse.status
      );
      return res.status(modelsResponse.status).json({
        error: `Failed to fetch models from Anthropic API (${modelsResponse.status})`,
        models: [],
      });
    }
  } catch (error) {
    console.error('Error fetching models from API:', error);

    if (error.name === 'AbortError') {
      return res.status(500).json({
        error: 'Request timed out while fetching models',
        message:
          'The request to Anthropic API timed out. Please check your network connection.',
        models: [],
      });
    }

    if (error.message && error.message.includes('401')) {
      return res.status(401).json({
        error: 'Invalid API key',
        models: [],
      });
    }

    res.status(500).json({
      error: 'Failed to fetch models from Anthropic API',
      message: error.message,
      models: [],
    });
  }
});

router.post('/messages', async (req, res) => {
  const { apiKey, ...messageData } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
      signal: controller.signal,
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

export default router;
