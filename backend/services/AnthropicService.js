import fetch from 'node-fetch';
import logger from '../utils/logger.js';

class AnthropicService {
  constructor() {
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.apiVersion = '2023-06-01';
  }

  _buildHeaders(apiKey) {
    return {
      'x-api-key': apiKey,
      'anthropic-version': this.apiVersion,
      'Content-Type': 'application/json',
    };
  }

  async validateApiKey(apiKey) {
    logger.info('Validating Anthropic API key');

    if (!apiKey) {
      logger.warn('API key validation failed: no key provided');
      return { valid: false, message: 'API key is required' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this._buildHeaders(apiKey),
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        logger.warn('API key validation failed: 401 Unauthorized');
        return { valid: false, message: 'Invalid API key' };
      } else if (response.status === 400 || response.ok) {
        logger.info('API key validation successful');
        return { valid: true, message: 'API key is valid!' };
      }

      logger.warn(
        `API key validation returned unexpected status: ${response.status}`
      );
      return {
        valid: false,
        message: `Unexpected response: ${response.status}`,
      };
    } catch (error) {
      logger.error('API key validation error:', error);

      if (error.name === 'AbortError') {
        return {
          valid: false,
          message: 'Request timed out - please check your network connection',
          error: 'TIMEOUT',
        };
      }

      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        return {
          valid: false,
          message: 'Cannot reach Anthropic API - DNS resolution failed',
          error: error.code,
        };
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          valid: false,
          message: 'Cannot connect to Anthropic API - connection refused',
          error: error.code,
        };
      }

      return {
        valid: false,
        message: 'Failed to validate API key - network error',
        error: error.message,
      };
    }
  }

  async fetchAvailableModels(apiKey) {
    logger.info('Fetching available Claude models');

    if (!apiKey) {
      logger.warn('Model fetch failed: no API key provided');
      return { error: 'API key is required', models: [] };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this._buildHeaders(apiKey),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        logger.warn('Model fetch failed: invalid API key');
        return { error: 'Invalid API key', models: [] };
      }

      if (response.ok) {
        const data = await response.json();
        const models = data.data.map(model => ({
          id: model.id,
          display_name: model.display_name || model.id,
          created_at: model.created_at,
        }));

        logger.info(`Successfully fetched ${models.length} models`);
        return { models };
      }

      logger.error(`Model fetch failed with status: ${response.status}`);
      return {
        error: `Failed to fetch models (${response.status})`,
        models: [],
      };
    } catch (error) {
      logger.error('Model fetch error:', error);

      if (error.name === 'AbortError') {
        return {
          error: 'Request timed out while fetching models',
          message: 'Please check your network connection',
          models: [],
        };
      }

      return {
        error: 'Failed to fetch models from Anthropic API',
        message: error.message,
        models: [],
      };
    }
  }

  async sendMessage(apiKey, messageData) {
    logger.info('Sending message to Anthropic API');

    if (!apiKey) {
      logger.warn('Message send failed: no API key');
      throw new Error('API key is required');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this._buildHeaders(apiKey),
        body: JSON.stringify(messageData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        logger.error(
          `Message send failed with status ${response.status}:`,
          data
        );
        return { success: false, status: response.status, error: data };
      }

      logger.info('Message sent successfully');
      return { success: true, data };
    } catch (error) {
      logger.error('Message send error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }

      throw error;
    }
  }
}

export default new AnthropicService();
