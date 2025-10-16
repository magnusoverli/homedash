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

export default router;
