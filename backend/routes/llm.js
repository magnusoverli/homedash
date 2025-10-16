import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import AnthropicService from '../services/AnthropicService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.use(requireAuth);

router.post('/test-key', async (req, res) => {
  const { apiKey } = req.body;

  logger.info('API key test endpoint called');

  const result = await AnthropicService.validateApiKey(apiKey);
  return res.json(result);
});

router.post('/models', async (req, res) => {
  const { apiKey } = req.body;

  logger.info('Models endpoint called');

  const result = await AnthropicService.fetchAvailableModels(apiKey);

  if (result.error) {
    const statusCode = result.error === 'Invalid API key' ? 401 : 500;
    return res.status(statusCode).json(result);
  }

  return res.json(result);
});

router.post('/messages', async (req, res) => {
  const { apiKey, ...messageData } = req.body;

  logger.info('Messages endpoint called');

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    const result = await AnthropicService.sendMessage(apiKey, messageData);

    if (!result.success) {
      return res.status(result.status).json(result.error);
    }

    res.json(result.data);
  } catch (error) {
    logger.error('Error proxying message:', error);

    if (error.message === 'Request timed out') {
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
