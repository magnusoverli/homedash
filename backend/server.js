import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import multer from 'multer';
import ical from 'node-ical';
import axios from 'axios';
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
        messages: [{ role: 'user', content: 'Hi' }],
      }),
      signal: controller.signal,
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
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    // Check if it's a timeout error
    if (error.name === 'AbortError') {
      return res.status(500).json({
        valid: false,
        message:
          'Request timed out - please check your network connection and try again',
        error: 'TIMEOUT',
      });
    }

    // Check for DNS/network errors
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return res.status(500).json({
        valid: false,
        message:
          'Cannot reach Anthropic API - DNS resolution failed. Check your network/firewall settings.',
        error: error.code,
      });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(500).json({
        valid: false,
        message:
          'Cannot connect to Anthropic API - connection refused or timed out. Check firewall/proxy settings.',
        error: error.code,
      });
    }

    return res.status(500).json({
      valid: false,
      message:
        'Failed to validate API key - please check your network connection',
      error: error.message,
      errorCode: error.code,
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

      // Transform the response to match our frontend format
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

    // Check if it's a timeout error
    if (error.name === 'AbortError') {
      return res.status(500).json({
        error: 'Request timed out while fetching models',
        message:
          'The request to Anthropic API timed out. Please check your network connection.',
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

// Test Spond credentials endpoint
app.post('/api/test-spond-credentials', async (req, res) => {
  const { email, password } = req.body;

  console.log('=== SPOND CREDENTIALS TEST ENDPOINT ===');
  console.log(`📧 Email: ${email}`);
  console.log(`🔒 Password length: ${password?.length || 0} characters`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  if (!email || !password) {
    console.log('❌ Missing credentials');
    return res.status(400).json({
      valid: false,
      message: 'Email and password are required',
      error: 'MISSING_CREDENTIALS',
    });
  }

  try {
    console.log('🚀 Starting REAL Spond API authentication...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    console.log(
      '📡 Making actual API call to: https://api.spond.com/core/v1/login'
    );
    console.log('📤 Request headers: Content-Type: application/json');
    console.log('📤 Request body: { email: "***", password: "***" }');

    // REAL Spond API call
    const response = await fetch('https://api.spond.com/core/v1/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📥 Real Spond API response status: ${response.status}`);
    console.log(
      `📥 Real Spond API response status text: ${response.statusText}`
    );

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Spond API authentication: SUCCESS');
      console.log('📥 Real Spond API response body:');
      console.log(JSON.stringify(responseData, null, 2));

      // Extract Spond user ID from the passwordToken JWT
      let spondUserId = null;

      try {
        if (responseData.passwordToken) {
          console.log('🔍 Extracting user ID from passwordToken JWT...');
          const tokenParts = responseData.passwordToken.split('.');
          if (tokenParts.length === 3) {
            // Decode the JWT payload (base64url decode)
            const payload = Buffer.from(tokenParts[1], 'base64').toString(
              'utf-8'
            );
            const parsedPayload = JSON.parse(payload);

            if (parsedPayload.sub) {
              spondUserId = parsedPayload.sub;
              console.log(`👤 Extracted user ID from JWT: ${spondUserId}`);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error extracting user ID from JWT:', error.message);
      }

      if (!spondUserId) {
        console.log('⚠️ Could not extract Spond user ID from response');
      }

      return res.json({
        valid: true,
        message: 'Spond credentials validated successfully! ✓',
        responseData: responseData,
        spondUserId: spondUserId,
      });
    } else {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      console.log('❌ Spond API authentication: FAILED');
      console.log(`📥 Real error response status: ${response.status}`);
      console.log('📥 Real error response body:');
      console.log(JSON.stringify(errorData, null, 2));

      let errorMessage = 'Invalid Spond credentials';
      if (response.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (response.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (response.status >= 500) {
        errorMessage = 'Spond server error. Please try again later.';
      }

      return res.status(response.status).json({
        valid: false,
        message: errorMessage,
        error: errorData.error || 'AUTHENTICATION_FAILED',
        statusCode: response.status,
      });
    }
  } catch (error) {
    console.error('💥 Spond credentials test error:', error);
    console.log('🔍 Error analysis:');
    console.log(`  - Type: ${error.constructor.name}`);
    console.log(`  - Message: ${error.message}`);
    console.log(`  - Code: ${error.code || 'N/A'}`);

    if (error.name === 'AbortError') {
      console.log('⏰ Request timed out');
      return res.status(500).json({
        valid: false,
        message:
          'Request timed out while connecting to Spond. Please try again.',
        error: 'TIMEOUT',
      });
    }

    return res.status(500).json({
      valid: false,
      message: 'Failed to validate Spond credentials due to network error',
      error: 'NETWORK_ERROR',
      details: error.message,
    });
  } finally {
    console.log('🏁 Spond credentials test completed');
    console.log('=== END SPOND CREDENTIALS TEST ===');
  }
});

// Store Spond credentials for a family member
app.post('/api/spond-credentials/:memberId', async (req, res) => {
  const { memberId } = req.params;
  const { email, password, loginToken, userData, spondUserId } = req.body;

  console.log(`💾 Storing Spond credentials for member ${memberId}`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Login token: ${loginToken ? '[PRESENT]' : '[MISSING]'}`);
  console.log(`👤 Spond User ID: ${spondUserId || '[NOT PROVIDED]'}`);

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
    });
  }

  try {
    // Enhanced credential data with token lifecycle tracking
    const credentialData = {
      email,
      password, // In production, this should be encrypted
      loginToken: loginToken || null,
      spondUserId: spondUserId || null,
      userData: userData ? JSON.stringify(userData) : null,
      // Token lifecycle tracking
      tokenCreatedAt: loginToken ? new Date().toISOString() : null,
      tokenLastValidated: loginToken ? new Date().toISOString() : null,
      tokenInvalidatedAt: null,
      tokenLifespanDays: null,
      lastAuthenticated: new Date().toISOString(),
      authenticationCount: 1, // Track how many times user has authenticated
      // Token validation history
      validationHistory: JSON.stringify([
        {
          timestamp: new Date().toISOString(),
          action: 'TOKEN_CREATED',
          success: true,
          notes: 'Initial authentication and token creation',
        },
      ]),
    };

    await runQuery(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [
        `spond_credentials_${memberId}`,
        JSON.stringify(credentialData),
        JSON.stringify(credentialData),
      ]
    );

    console.log(`✅ Spond credentials stored for member ${memberId}`);

    res.json({
      success: true,
      message: 'Spond credentials stored successfully',
    });
  } catch (error) {
    console.error('❌ Error storing Spond credentials:', error);
    res.status(500).json({
      error: 'Failed to store Spond credentials',
    });
  }
});

// Get Spond credentials for a family member
app.get('/api/spond-credentials/:memberId', async (req, res) => {
  const { memberId } = req.params;

  console.log(`🔍 Retrieving Spond credentials for member ${memberId}`);

  try {
    const result = await getOne('SELECT value FROM settings WHERE key = ?', [
      `spond_credentials_${memberId}`,
    ]);

    if (!result) {
      console.log(`❌ No Spond credentials found for member ${memberId}`);
      return res.json({
        hasCredentials: false,
        authenticated: false,
      });
    }

    const credentialData = JSON.parse(result.value);
    console.log(`✅ Found Spond credentials for member ${memberId}`);
    console.log(`📧 Email: ${credentialData.email}`);
    console.log(
      `🔑 Has login token: ${credentialData.loginToken ? 'Yes' : 'No'}`
    );
    console.log(`⏰ Last authenticated: ${credentialData.lastAuthenticated}`);

    // Return credential info without exposing password
    res.json({
      hasCredentials: true,
      authenticated: !!credentialData.loginToken,
      email: credentialData.email,
      spondUserId: credentialData.spondUserId,
      lastAuthenticated: credentialData.lastAuthenticated,
      userData: credentialData.userData
        ? JSON.parse(credentialData.userData)
        : null,
    });
  } catch (error) {
    console.error('❌ Error retrieving Spond credentials:', error);
    res.status(500).json({
      error: 'Failed to retrieve Spond credentials',
      hasCredentials: false,
      authenticated: false,
    });
  }
});

// Delete Spond credentials for a family member
app.delete('/api/spond-credentials/:memberId', async (req, res) => {
  const { memberId } = req.params;

  console.log(`🗑️ Deleting Spond credentials for member ${memberId}`);

  try {
    const result = await runQuery('DELETE FROM settings WHERE key = ?', [
      `spond_credentials_${memberId}`,
    ]);

    if (result.changes === 0) {
      console.log(
        `❌ No Spond credentials found to delete for member ${memberId}`
      );
      return res.status(404).json({
        error: 'No Spond credentials found for this member',
      });
    }

    console.log(`✅ Spond credentials deleted for member ${memberId}`);

    res.json({
      success: true,
      message: 'Spond credentials deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting Spond credentials:', error);
    res.status(500).json({
      error: 'Failed to delete Spond credentials',
    });
  }
});

// Validate existing Spond token and log results for lifecycle tracking
app.post('/api/validate-spond-token/:memberId', async (req, res) => {
  const { memberId } = req.params;

  console.log(`🔍 Validating stored Spond token for member ${memberId}`);

  try {
    // Get stored credentials
    const result = await getOne('SELECT value FROM settings WHERE key = ?', [
      `spond_credentials_${memberId}`,
    ]);

    if (!result) {
      console.log(`❌ No stored credentials found for member ${memberId}`);
      return res.status(404).json({
        valid: false,
        error: 'NO_CREDENTIALS',
        message: 'No stored credentials found',
      });
    }

    const credentialData = JSON.parse(result.value);

    if (!credentialData.loginToken) {
      console.log(`❌ No stored token found for member ${memberId}`);
      return res.status(404).json({
        valid: false,
        error: 'NO_TOKEN',
        message: 'No stored token found',
      });
    }

    console.log(
      `🔑 Testing stored token created at: ${credentialData.tokenCreatedAt}`
    );
    console.log(
      `⏰ Token age: ${Math.round((new Date() - new Date(credentialData.tokenCreatedAt)) / (1000 * 60 * 60 * 24))} days`
    );

    // Test the token by making a simple API call to Spond
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log('📡 Testing token with Spond groups endpoint...');
    const response = await fetch('https://api.spond.com/core/v1/groups/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${credentialData.loginToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const now = new Date().toISOString();
    const tokenAge = Math.round(
      (new Date() - new Date(credentialData.tokenCreatedAt)) /
        (1000 * 60 * 60 * 24)
    );

    // Parse existing validation history
    let validationHistory = [];
    try {
      validationHistory = JSON.parse(credentialData.validationHistory || '[]');
    } catch (e) {
      validationHistory = [];
    }

    if (response.ok) {
      console.log(
        `✅ Token validation SUCCESS - Token is still valid after ${tokenAge} days`
      );

      // Add successful validation to history
      validationHistory.push({
        timestamp: now,
        action: 'TOKEN_VALIDATED',
        success: true,
        tokenAgeDays: tokenAge,
        responseStatus: response.status,
        notes: `Token still valid after ${tokenAge} days`,
      });

      // Update last validated timestamp
      const updatedCredentials = {
        ...credentialData,
        tokenLastValidated: now,
        validationHistory: JSON.stringify(validationHistory),
      };

      await runQuery(
        `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
        [JSON.stringify(updatedCredentials), `spond_credentials_${memberId}`]
      );

      console.log(
        `📊 Token lifecycle update: Still valid after ${tokenAge} days`
      );

      return res.json({
        valid: true,
        tokenAgeDays: tokenAge,
        tokenCreatedAt: credentialData.tokenCreatedAt,
        lastValidated: now,
        message: `Token is valid (${tokenAge} days old)`,
      });
    } else {
      console.log(
        `❌ Token validation FAILED - Token invalid after ${tokenAge} days (Status: ${response.status})`
      );

      // Calculate token lifespan
      const tokenLifespanDays = tokenAge;

      // Add failed validation to history
      validationHistory.push({
        timestamp: now,
        action: 'TOKEN_INVALIDATED',
        success: false,
        tokenAgeDays: tokenAge,
        responseStatus: response.status,
        notes: `Token became invalid after ${tokenAge} days - Status: ${response.status}`,
      });

      // Update credentials with invalidation info
      const updatedCredentials = {
        ...credentialData,
        tokenInvalidatedAt: now,
        tokenLifespanDays: tokenLifespanDays,
        validationHistory: JSON.stringify(validationHistory),
      };

      await runQuery(
        `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
        [JSON.stringify(updatedCredentials), `spond_credentials_${memberId}`]
      );

      console.log(`📊 TOKEN LIFESPAN DISCOVERED: ${tokenLifespanDays} days`);
      console.log(
        `🔬 Research data: Token created ${credentialData.tokenCreatedAt}, invalidated ${now}`
      );

      return res.status(401).json({
        valid: false,
        error: 'TOKEN_EXPIRED',
        tokenAgeDays: tokenAge,
        tokenLifespanDays: tokenLifespanDays,
        tokenCreatedAt: credentialData.tokenCreatedAt,
        tokenInvalidatedAt: now,
        message: `Token expired after ${tokenLifespanDays} days`,
        researchData: {
          tokenCreated: credentialData.tokenCreatedAt,
          tokenInvalidated: now,
          lifespanDays: tokenLifespanDays,
          validationHistory: validationHistory,
        },
      });
    }
  } catch (error) {
    console.error('💥 Error validating Spond token:', error);

    if (error.name === 'AbortError') {
      return res.status(500).json({
        valid: false,
        error: 'TIMEOUT',
        message: 'Token validation timed out',
      });
    }

    return res.status(500).json({
      valid: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate token due to network error',
    });
  }
});

// Refresh Spond user ID for existing credentials (migration helper)
app.post('/api/spond-refresh-userid/:memberId', async (req, res) => {
  const { memberId } = req.params;

  console.log(`🔄 Refreshing Spond user ID for member ${memberId}`);

  try {
    // Get stored credentials
    const result = await getOne('SELECT value FROM settings WHERE key = ?', [
      `spond_credentials_${memberId}`,
    ]);

    if (!result) {
      console.log(`❌ No stored credentials found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_CREDENTIALS',
        message: 'No stored credentials found',
      });
    }

    const credentialData = JSON.parse(result.value);

    if (credentialData.spondUserId) {
      console.log(
        `✅ Spond user ID already exists: ${credentialData.spondUserId}`
      );
      return res.json({
        success: true,
        message: 'Spond user ID already stored',
        spondUserId: credentialData.spondUserId,
      });
    }

    // Re-authenticate to get the user ID
    console.log(`🔐 Re-authenticating to fetch Spond user ID...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://api.spond.com/core/v1/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentialData.email,
        password: credentialData.password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const responseData = await response.json();

      // Extract Spond user ID
      const spondUserId =
        responseData.id || responseData.userId || responseData.user?.id;

      if (spondUserId) {
        console.log(`✅ Successfully fetched Spond user ID: ${spondUserId}`);

        // Update stored credentials with the user ID and new token
        const updatedCredentials = {
          ...credentialData,
          spondUserId: spondUserId,
          loginToken: responseData.loginToken || credentialData.loginToken,
          userData: JSON.stringify(responseData),
          lastAuthenticated: new Date().toISOString(),
          authenticationCount: (credentialData.authenticationCount || 0) + 1,
        };

        await runQuery(
          `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
          [JSON.stringify(updatedCredentials), `spond_credentials_${memberId}`]
        );

        return res.json({
          success: true,
          message: 'Spond user ID successfully updated',
          spondUserId: spondUserId,
        });
      } else {
        console.log(`⚠️ Could not extract Spond user ID from response`);
        return res.status(500).json({
          error: 'USERID_NOT_FOUND',
          message:
            'Could not extract Spond user ID from authentication response',
        });
      }
    } else {
      console.log(`❌ Re-authentication failed: ${response.status}`);
      return res.status(401).json({
        error: 'AUTH_FAILED',
        message: 'Failed to re-authenticate with Spond',
      });
    }
  } catch (error) {
    console.error('❌ Error refreshing Spond user ID:', error);

    if (error.name === 'AbortError') {
      return res.status(500).json({
        error: 'TIMEOUT',
        message: 'Request timed out',
      });
    }

    return res.status(500).json({
      error: 'REFRESH_ERROR',
      message: 'Failed to refresh Spond user ID',
    });
  }
});

// Refresh Spond user ID for existing credentials (migration helper)
app.post('/api/spond-refresh-userid/:memberId', async (req, res) => {
  const { memberId } = req.params;

  console.log(`🔄 Refreshing Spond user ID for member ${memberId}`);

  try {
    // Get stored credentials
    const result = await getOne('SELECT value FROM settings WHERE key = ?', [
      `spond_credentials_${memberId}`,
    ]);

    if (!result) {
      console.log(`❌ No stored credentials found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_CREDENTIALS',
        message: 'No stored credentials found',
      });
    }

    const credentialData = JSON.parse(result.value);

    if (credentialData.spondUserId) {
      console.log(
        `✅ Spond user ID already exists: ${credentialData.spondUserId}`
      );
      return res.json({
        success: true,
        message: 'Spond user ID already stored',
        spondUserId: credentialData.spondUserId,
      });
    }

    // Re-authenticate to get the user ID
    console.log(`🔐 Re-authenticating to fetch Spond user ID...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://api.spond.com/core/v1/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentialData.email,
        password: credentialData.password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const responseData = await response.json();

      // Extract Spond user ID
      const spondUserId =
        responseData.id || responseData.userId || responseData.user?.id;

      if (spondUserId) {
        console.log(`✅ Successfully fetched Spond user ID: ${spondUserId}`);

        // Update stored credentials with the user ID and new token
        const updatedCredentials = {
          ...credentialData,
          spondUserId: spondUserId,
          loginToken: responseData.loginToken || credentialData.loginToken,
          userData: JSON.stringify(responseData),
          lastAuthenticated: new Date().toISOString(),
          authenticationCount: (credentialData.authenticationCount || 0) + 1,
        };

        await runQuery(
          `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
          [JSON.stringify(updatedCredentials), `spond_credentials_${memberId}`]
        );

        return res.json({
          success: true,
          message: 'Spond user ID successfully updated',
          spondUserId: spondUserId,
        });
      } else {
        console.log(`⚠️ Could not extract Spond user ID from response`);
        return res.status(500).json({
          error: 'USERID_NOT_FOUND',
          message:
            'Could not extract Spond user ID from authentication response',
        });
      }
    } else {
      console.log(`❌ Re-authentication failed: ${response.status}`);
      return res.status(401).json({
        error: 'AUTH_FAILED',
        message: 'Failed to re-authenticate with Spond',
      });
    }
  } catch (error) {
    console.error('❌ Error refreshing Spond user ID:', error);

    if (error.name === 'AbortError') {
      return res.status(500).json({
        error: 'TIMEOUT',
        message: 'Request timed out',
      });
    }

    return res.status(500).json({
      error: 'REFRESH_ERROR',
      message: 'Failed to refresh Spond user ID',
    });
  }
});

// Fetch Spond profile-groups combinations for authenticated member
app.get('/api/spond-groups/:memberId', async (req, res) => {
  const { memberId } = req.params;

  console.log(`🔍 Fetching Spond groups for member ${memberId}`);

  try {
    // Get stored credentials
    const result = await getOne('SELECT value FROM settings WHERE key = ?', [
      `spond_credentials_${memberId}`,
    ]);

    if (!result) {
      console.log(`❌ No stored credentials found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_CREDENTIALS',
        message: 'No stored credentials found',
      });
    }

    const credentialData = JSON.parse(result.value);

    if (!credentialData.loginToken) {
      console.log(`❌ No stored token found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_TOKEN',
        message: 'No stored token found',
      });
    }

    console.log(`🔑 Using stored token to fetch groups`);
    console.log(`📡 Making API call to: https://api.spond.com/core/v1/groups/`);

    // Fetch groups from Spond API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://api.spond.com/core/v1/groups/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${credentialData.loginToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📊 Spond groups API response status: ${response.status}`);

    if (response.ok) {
      const groupsData = await response.json();
      console.log(`✅ Successfully fetched ${groupsData.length} groups`);

      // Log group names for debugging
      if (groupsData.length > 0) {
        console.log(
          `📋 Groups found:`,
          groupsData.map(g => `"${g.name}" (${g.id})`).join(', ')
        );
      } else {
        console.log(`⚠️ No groups found for this user`);
      }

      // Extract profile-group combinations for this parent's children
      const profileGroups = [];
      const parentUserId = credentialData.spondUserId;

      try {
        for (const group of groupsData) {
          if (group.members && Array.isArray(group.members)) {
            for (const member of group.members) {
              // Check if this member is a child of the authenticated parent
              let isMyChild = false;

              // Check by guardians
              if (member.guardians && Array.isArray(member.guardians)) {
                for (const guardian of member.guardians) {
                  if (
                    guardian.id === parentUserId ||
                    guardian.email === credentialData.email ||
                    guardian.profile?.id === parentUserId
                  ) {
                    isMyChild = true;
                    break;
                  }
                }
              }

              // Also include if it's the parent themselves (by email match)
              if (member.email === credentialData.email) {
                isMyChild = true;
              }

              if (isMyChild) {
                const profileId =
                  member.id || member.userId || member.profile?.id;
                const profileName =
                  `${member.firstName || ''} ${member.lastName || ''}`.trim();

                // Create a unique entry for this profile-group combination
                const profileGroupKey = `${profileId}_${group.id}`;
                profileGroups.push({
                  key: profileGroupKey,
                  groupId: group.id,
                  groupName: group.name,
                  profileId: profileId,
                  profileName: profileName,
                  displayName: `${profileName} - ${group.name}`,
                  isParent: member.email === credentialData.email,
                });

                // Store/update this profile-group combination in database
                const existingGroup = await getOne(
                  'SELECT is_active FROM spond_groups WHERE id = ? AND member_id = ? AND profile_id = ?',
                  [group.id, memberId, profileId]
                );

                if (existingGroup) {
                  // Update only metadata fields, preserve is_active
                  await runQuery(
                    `UPDATE spond_groups 
                   SET name = ?, description = ?, image_url = ?, profile_name = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? AND member_id = ? AND profile_id = ?`,
                    [
                      group.name,
                      group.description || null,
                      group.imageUrl || null,
                      profileName,
                      group.id,
                      memberId,
                      profileId,
                    ]
                  );
                } else {
                  // Insert new profile-group combination with default is_active = FALSE
                  await runQuery(
                    `INSERT OR REPLACE INTO spond_groups (id, member_id, name, description, image_url, profile_id, profile_name, is_active, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)`,
                    [
                      group.id,
                      memberId,
                      group.name,
                      group.description || null,
                      group.imageUrl || null,
                      profileId,
                      profileName,
                    ]
                  );
                }
              }
            }
          }
        }

        console.log(
          `✅ Found ${profileGroups.length} profile-group combinations`
        );
      } catch (dbError) {
        console.error('❌ Error storing groups in database:', dbError);
        // Continue with API response even if database storage fails
      }

      // Get profile-groups with their current selection status from database
      try {
        const storedGroups = await getAll(
          `SELECT id, name, description, image_url, profile_id, profile_name, is_active, last_synced_at 
           FROM spond_groups 
           WHERE member_id = ? 
           ORDER BY profile_name, name`,
          [memberId]
        );

        // Format the response to include both the stored groups and the profile groups
        const formattedGroups = storedGroups.map(g => ({
          key: `${g.profile_id}_${g.id}`,
          groupId: g.id,
          groupName: g.name,
          profileId: g.profile_id,
          profileName: g.profile_name,
          displayName: `${g.profile_name} - ${g.name}`,
          isActive: g.is_active,
          lastSyncedAt: g.last_synced_at,
        }));

        return res.json({
          success: true,
          groups: formattedGroups,
          message: `Found ${formattedGroups.length} profile-group combinations`,
        });
      } catch (dbError) {
        console.error('❌ Error retrieving stored groups:', dbError);
        // Fallback to API data
        return res.json({
          success: true,
          groups: groupsData.map(g => ({
            id: g.id,
            name: g.name,
            description: g.description,
            image_url: g.imageUrl,
            is_active: true,
            last_synced_at: null,
          })),
          message: `Found ${groupsData.length} groups`,
        });
      }
    } else {
      console.log(`❌ Groups fetch failed with status: ${response.status}`);

      if (response.status === 401) {
        console.log(`🔒 Token appears to be expired - authentication required`);
        return res.status(401).json({
          error: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        });
      }

      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      console.log(`💥 Error response:`, errorData);

      return res.status(response.status).json({
        error: 'GROUPS_FETCH_FAILED',
        message: `Failed to fetch groups: ${errorData.error || 'Unknown error'}`,
        statusCode: response.status,
      });
    }
  } catch (error) {
    console.error('💥 Error fetching Spond groups:', error);

    if (error.name === 'AbortError') {
      console.log(`⏱️ Groups fetch timed out after 15 seconds`);
      return res.status(500).json({
        error: 'TIMEOUT',
        message: 'Groups fetch timed out',
      });
    }

    return res.status(500).json({
      error: 'FETCH_ERROR',
      message: 'Failed to fetch groups due to network error',
    });
  }
});

// Fetch available Spond profiles (members) from all groups
app.get('/api/spond-profiles/:memberId', async (req, res) => {
  const { memberId } = req.params;

  console.log(`🔍 Fetching available Spond profiles for member ${memberId}`);

  try {
    // Get stored credentials
    const result = await getOne('SELECT value FROM settings WHERE key = ?', [
      `spond_credentials_${memberId}`,
    ]);

    if (!result) {
      console.log(`❌ No stored credentials found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_CREDENTIALS',
        message: 'No stored credentials found',
      });
    }

    const credentialData = JSON.parse(result.value);

    if (!credentialData.loginToken) {
      console.log(`❌ No stored token found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_TOKEN',
        message: 'No stored token found',
      });
    }

    const parentUserId = credentialData.spondUserId;
    console.log(`👤 Parent user ID: ${parentUserId || 'Not available'}`);

    console.log(`🔑 Using stored token to fetch groups with member details`);
    console.log(`📡 Making API call to: https://api.spond.com/core/v1/groups/`);

    // Fetch groups from Spond API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://api.spond.com/core/v1/groups/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${credentialData.loginToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📊 Spond groups API response status: ${response.status}`);

    if (response.ok) {
      const groupsData = await response.json();
      console.log(`✅ Successfully fetched ${groupsData.length} groups`);

      // Extract unique profiles from all groups
      const profilesMap = new Map();

      for (const group of groupsData) {
        // Check if group has members array
        if (group.members && Array.isArray(group.members)) {
          console.log(
            `📋 Processing group "${group.name}" with ${group.members.length} members`
          );

          for (const member of group.members) {
            const profileId = member.id || member.userId || member.profile?.id;

            // Debug: Log guardian info if present
            if (member.guardians && member.guardians.length > 0) {
              console.log(
                `   👥 Member ${member.firstName} ${member.lastName} (ID: ${profileId}) has ${member.guardians.length} guardian(s)`
              );
            }

            if (profileId && !profilesMap.has(profileId)) {
              console.log(
                `   ➕ Adding new profile: ${member.firstName} ${member.lastName} (ID: ${profileId})`
              );
            } else if (profileId && profilesMap.has(profileId)) {
              console.log(
                `   🔄 Profile already exists: ${member.firstName} ${member.lastName} (ID: ${profileId}), adding group: ${group.name}`
              );
            }

            if (profileId && !profilesMap.has(profileId)) {
              const profile = {
                id: profileId,
                name:
                  `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
                  'Unknown',
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                email: member.email || null,
                groups: [group.name],
                profileType: profileId === parentUserId ? 'self' : 'child',
                // Store additional useful data
                dateOfBirth: member.dateOfBirth || null,
                guardians: member.guardians || [],
              };

              profilesMap.set(profileId, profile);
            } else if (profileId && profilesMap.has(profileId)) {
              // Add this group to the existing profile's groups list
              profilesMap.get(profileId).groups.push(group.name);
            }
          }
        }

        // Also check subGroups if they exist
        if (group.subGroups && Array.isArray(group.subGroups)) {
          for (const subGroup of group.subGroups) {
            if (subGroup.members && Array.isArray(subGroup.members)) {
              for (const member of subGroup.members) {
                const profileId =
                  member.id || member.userId || member.profile?.id;

                if (profileId && !profilesMap.has(profileId)) {
                  // Debug: Log guardian info if present
                  if (member.guardians && member.guardians.length > 0) {
                    console.log(
                      `   👥 Member ${member.firstName} has ${member.guardians.length} guardian(s)`
                    );
                  }

                  const profile = {
                    id: profileId,
                    name:
                      `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
                      'Unknown',
                    firstName: member.firstName || '',
                    lastName: member.lastName || '',
                    email: member.email || null,
                    groups: [group.name],
                    profileType: profileId === parentUserId ? 'self' : 'child',
                    // Store additional useful data
                    dateOfBirth: member.dateOfBirth || null,
                    guardians: member.guardians || [],
                  };

                  profilesMap.set(profileId, profile);
                } else if (profileId && profilesMap.has(profileId)) {
                  profilesMap
                    .get(profileId)
                    .groups.push(`${group.name} - ${subGroup.name}`);
                }
              }
            }
          }
        }
      }

      let allProfiles = Array.from(profilesMap.values());
      console.log(
        `📊 Found ${allProfiles.length} total unique profiles across all groups`
      );

      // Filter to only show profiles that are related to this parent
      const filteredProfiles = allProfiles.filter(profile => {
        // Include if it's the parent's own profile (by email match or ID match)
        if (profile.email === credentialData.email) {
          profile.profileType = 'self';
          return true;
        }
        if (profile.id === parentUserId) {
          profile.profileType = 'self';
          return true;
        }

        // Include if the parent is listed as a guardian for this profile
        if (profile.guardians && Array.isArray(profile.guardians)) {
          for (const guardian of profile.guardians) {
            // Check if guardian ID matches parent ID or email matches
            if (
              guardian.id === parentUserId ||
              guardian.email === credentialData.email ||
              guardian.profile?.id === parentUserId
            ) {
              profile.profileType = 'child';
              console.log(`👶 Found child: ${profile.name} (guardian match)`);
              return true;
            }
          }
        }

        // For debugging: Check if this might be a child based on same last name
        // (This is a heuristic, not definitive)
        const parentName = credentialData.userData?.name || '';
        const parentLastName = parentName.split(' ').pop();
        if (
          parentLastName &&
          profile.lastName === parentLastName &&
          !profile.email
        ) {
          console.log(`🔍 Possible child (same last name): ${profile.name}`);
          // Don't auto-include, just log for debugging
        }

        return false;
      });

      console.log(
        `✅ Filtered to ${filteredProfiles.length} profiles related to parent`
      );

      // Log each filtered profile with their groups to verify deduplication
      filteredProfiles.forEach(profile => {
        console.log(
          `  - ${profile.name} (ID: ${profile.id}): ${profile.groups.length} groups: ${profile.groups.join(', ')}`
        );
      });

      // Log profile summary
      const selfProfiles = filteredProfiles.filter(
        p => p.profileType === 'self'
      );
      const childProfiles = filteredProfiles.filter(
        p => p.profileType === 'child'
      );
      console.log(
        `👤 Self profiles: ${selfProfiles.length}, Child profiles: ${childProfiles.length}`
      );

      // Check if this member already has a profile mapping
      const existingMapping = await getOne(
        'SELECT * FROM spond_profile_mappings WHERE member_id = ?',
        [memberId]
      );

      return res.json({
        success: true,
        profiles: filteredProfiles,
        parentUserId: parentUserId,
        existingMapping: existingMapping || null,
        message: `Found ${filteredProfiles.length} profiles for this parent account`,
      });
    } else {
      console.log(`❌ Groups fetch failed with status: ${response.status}`);

      if (response.status === 401) {
        console.log(`🔒 Token appears to be expired - authentication required`);
        return res.status(401).json({
          error: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        });
      }

      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      console.log(`💥 Error response:`, errorData);

      return res.status(response.status).json({
        error: 'PROFILES_FETCH_FAILED',
        message: `Failed to fetch profiles: ${errorData.error || 'Unknown error'}`,
        statusCode: response.status,
      });
    }
  } catch (error) {
    console.error('💥 Error fetching Spond profiles:', error);

    if (error.name === 'AbortError') {
      console.log(`⏱️ Profiles fetch timed out after 15 seconds`);
      return res.status(500).json({
        error: 'TIMEOUT',
        message: 'Profiles fetch timed out',
      });
    }

    return res.status(500).json({
      error: 'FETCH_ERROR',
      message: 'Failed to fetch profiles due to network error',
    });
  }
});

// Save Spond profile mapping for a member
app.post('/api/spond-profile-mapping/:memberId', async (req, res) => {
  const { memberId } = req.params;
  const { profileId, profileName, profileType } = req.body;

  console.log(`💾 Saving profile mapping for member ${memberId}`);
  console.log(
    `👤 Profile: ${profileName} (${profileId}), Type: ${profileType}`
  );

  if (!profileId || !profileName) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'profileId and profileName are required',
    });
  }

  try {
    // Get the parent user ID from credentials
    const credResult = await getOne(
      'SELECT value FROM settings WHERE key = ?',
      [`spond_credentials_${memberId}`]
    );

    if (!credResult) {
      return res.status(404).json({
        error: 'NO_CREDENTIALS',
        message: 'No stored credentials found',
      });
    }

    const credentialData = JSON.parse(credResult.value);
    const parentUserId = credentialData.spondUserId;

    // Check if mapping already exists
    const existingMapping = await getOne(
      'SELECT id FROM spond_profile_mappings WHERE member_id = ?',
      [memberId]
    );

    if (existingMapping) {
      // Update existing mapping
      await runQuery(
        `UPDATE spond_profile_mappings 
         SET spond_profile_id = ?, profile_name = ?, profile_type = ?, 
             parent_user_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE member_id = ?`,
        [profileId, profileName, profileType || 'child', parentUserId, memberId]
      );
      console.log(`✅ Updated profile mapping for member ${memberId}`);
    } else {
      // Insert new mapping
      await runQuery(
        `INSERT INTO spond_profile_mappings 
         (member_id, spond_profile_id, profile_name, profile_type, parent_user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [memberId, profileId, profileName, profileType || 'child', parentUserId]
      );
      console.log(`✅ Created new profile mapping for member ${memberId}`);
    }

    return res.json({
      success: true,
      message: 'Profile mapping saved successfully',
      mapping: {
        memberId,
        profileId,
        profileName,
        profileType: profileType || 'child',
        parentUserId,
      },
    });
  } catch (error) {
    console.error('❌ Error saving profile mapping:', error);
    return res.status(500).json({
      error: 'SAVE_ERROR',
      message: 'Failed to save profile mapping',
    });
  }
});

// Get Spond profile mapping for a member
app.get('/api/spond-profile-mapping/:memberId', async (req, res) => {
  const { memberId } = req.params;

  console.log(`🔍 Retrieving profile mapping for member ${memberId}`);

  try {
    const mapping = await getOne(
      'SELECT * FROM spond_profile_mappings WHERE member_id = ?',
      [memberId]
    );

    if (!mapping) {
      console.log(`❌ No profile mapping found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_MAPPING',
        message: 'No profile mapping found',
      });
    }

    console.log(`✅ Found profile mapping for member ${memberId}`);
    return res.json({
      success: true,
      mapping: mapping,
    });
  } catch (error) {
    console.error('❌ Error retrieving profile mapping:', error);
    return res.status(500).json({
      error: 'FETCH_ERROR',
      message: 'Failed to retrieve profile mapping',
    });
  }
});

// Save selected Spond groups for a member
app.post('/api/spond-groups/:memberId/selections', async (req, res) => {
  const { memberId } = req.params;
  const { selectedProfileGroups } = req.body;

  console.log(
    `💾 Saving profile-group selections for member ${memberId}:`,
    selectedProfileGroups
  );

  if (!Array.isArray(selectedProfileGroups)) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'selectedProfileGroups must be an array',
    });
  }

  try {
    // First, set all profile-groups for this member to inactive
    await runQuery(
      'UPDATE spond_groups SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?',
      [memberId]
    );

    // Then, set selected profile-groups to active
    // Each selection contains: {groupId, profileId}
    if (selectedProfileGroups.length > 0) {
      for (const selection of selectedProfileGroups) {
        await runQuery(
          `UPDATE spond_groups 
           SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP 
           WHERE member_id = ? AND id = ? AND profile_id = ?`,
          [memberId, selection.groupId, selection.profileId]
        );
      }
    }

    // Clean up activities from deselected groups
    // Due to the foreign key constraint, activities from inactive groups will be automatically excluded
    // from queries, but we can optionally delete them to keep the database clean
    console.log(
      `🧹 Cleaning up activities from deselected groups for member ${memberId}`
    );

    const cleanupResult = await runQuery(
      `DELETE FROM spond_activities 
       WHERE member_id = ? 
       AND NOT EXISTS (
         SELECT 1 FROM spond_groups 
         WHERE spond_groups.id = spond_activities.group_id 
         AND spond_groups.member_id = spond_activities.member_id 
         AND spond_groups.is_active = TRUE
       )`,
      [memberId]
    );

    console.log(
      `🗑️ Cleaned up ${cleanupResult.changes} activities from deselected groups`
    );

    console.log(
      `✅ Successfully updated group selections for member ${memberId}`
    );

    const inactiveCount =
      (
        await getOne(
          'SELECT COUNT(*) as count FROM spond_groups WHERE member_id = ? AND is_active = FALSE',
          [memberId]
        )
      )?.count || 0;
    console.log(
      `📊 Active profile-groups: ${selectedProfileGroups.length}, Inactive profile-groups: ${inactiveCount}`
    );

    res.json({
      success: true,
      message: `Updated selections for ${selectedProfileGroups.length} activities`,
      activeGroups: selectedProfileGroups.length,
      activitiesCleanedUp: cleanupResult.changes,
    });
  } catch (error) {
    console.error('❌ Error saving group selections:', error);
    res.status(500).json({
      error: 'SAVE_ERROR',
      message: 'Failed to save group selections',
    });
  }
});

// Check if Spond data needs syncing (based on last sync time)
app.get('/api/spond-activities/:memberId/sync-status', async (req, res) => {
  const { memberId } = req.params;
  const { maxAgeMinutes = 5 } = req.query; // Default: sync if older than 5 minutes

  try {
    // Get the oldest last_synced_at from active groups for this member
    const syncStatus = await getOne(
      `SELECT 
        MIN(last_synced_at) as oldest_sync,
        COUNT(*) as active_groups_count
      FROM spond_groups 
      WHERE member_id = ? AND is_active = TRUE`,
      [memberId]
    );

    if (!syncStatus || syncStatus.active_groups_count === 0) {
      return res.json({
        needsSync: false,
        reason: 'No active groups',
        activeGroupsCount: 0,
      });
    }

    // If never synced, needs sync
    if (!syncStatus.oldest_sync) {
      return res.json({
        needsSync: true,
        reason: 'Never synced',
        activeGroupsCount: syncStatus.active_groups_count,
      });
    }

    // Check if data is stale
    const lastSyncDate = new Date(syncStatus.oldest_sync);
    const minutesSinceSync =
      (Date.now() - lastSyncDate.getTime()) / (1000 * 60);
    const needsSync = minutesSinceSync > maxAgeMinutes;

    res.json({
      needsSync,
      reason: needsSync
        ? `Data is ${Math.round(minutesSinceSync)} minutes old`
        : 'Data is fresh',
      lastSyncedAt: syncStatus.oldest_sync,
      minutesSinceSync: Math.round(minutesSinceSync),
      activeGroupsCount: syncStatus.active_groups_count,
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    res.status(500).json({
      error: 'Failed to check sync status',
      needsSync: true, // Fail-safe: sync on error
    });
  }
});

// Fetch Spond activities for authenticated member's selected groups
app.post('/api/spond-activities/:memberId/sync', async (req, res) => {
  const { memberId } = req.params;
  const { startDate, endDate } = req.body;

  console.log(`🔍 Syncing Spond activities for member ${memberId}`);
  console.log(`📅 Date range: ${startDate} to ${endDate}`);

  try {
    // Get stored credentials
    const credentialsResult = await getOne(
      'SELECT value FROM settings WHERE key = ?',
      [`spond_credentials_${memberId}`]
    );

    if (!credentialsResult) {
      console.log(`❌ No stored credentials found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_CREDENTIALS',
        message: 'No stored credentials found',
      });
    }

    const credentialData = JSON.parse(credentialsResult.value);

    if (!credentialData.loginToken) {
      console.log(`❌ No stored token found for member ${memberId}`);
      return res.status(404).json({
        error: 'NO_TOKEN',
        message: 'No stored token found',
      });
    }

    // Extract Spond user ID for response checking
    const spondUserId = credentialData.spondUserId;
    if (!spondUserId) {
      console.log(
        `⚠️ No Spond user ID found for member ${memberId} - response status tracking may not work`
      );
    } else {
      console.log(
        `👤 Using Spond user ID: ${spondUserId} for response tracking`
      );
    }

    // Get active profile-groups for this member
    const activeGroups = await getAll(
      'SELECT id, name, profile_id, profile_name FROM spond_groups WHERE member_id = ? AND is_active = TRUE',
      [memberId]
    );

    if (activeGroups.length === 0) {
      console.log(`⚠️ No active groups found for member ${memberId}`);
      return res.json({
        success: true,
        message: 'No active groups to sync',
        activitiesSynced: 0,
        groupsSynced: 0,
      });
    }

    console.log(
      `📋 Found ${activeGroups.length} active groups: ${activeGroups.map(g => g.name).join(', ')}`
    );

    let totalActivitiesSynced = 0;
    const syncResults = [];

    // Fetch activities for each active group
    for (const group of activeGroups) {
      console.log(
        `🔍 Fetching activities for "${group.profile_name}" in group "${group.name}" (Profile ID: ${group.profile_id})`
      );

      try {
        // Build Spond API URL with date filters (correct endpoint from documentation)
        const apiUrl = new URL('https://api.spond.com/core/v1/sponds/');
        if (startDate)
          apiUrl.searchParams.append(
            'minStartTimestamp',
            `${startDate}T00:00:00.000Z`
          );
        if (endDate)
          apiUrl.searchParams.append(
            'maxEndTimestamp',
            `${endDate}T23:59:59.999Z`
          );
        apiUrl.searchParams.append('groupId', group.id);
        apiUrl.searchParams.append('max', '100');
        apiUrl.searchParams.append('scheduled', 'true');

        console.log(`📡 Making API call to: ${apiUrl.toString()}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(apiUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${credentialData.loginToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(
            `❌ Failed to fetch activities for group ${group.name}: ${response.status}`
          );
          syncResults.push({
            groupId: group.id,
            groupName: group.name,
            success: false,
            error: `HTTP ${response.status}`,
            activitiesCount: 0,
          });
          continue;
        }

        const activitiesData = await response.json();
        const activities = activitiesData || [];

        console.log(
          `📊 Found ${activities.length} activities for group "${group.name}"`
        );

        let groupActivitiesSynced = 0;

        // Store activities in database
        for (const activity of activities) {
          try {
            // Debug: Log response structure for first activity
            if (groupActivitiesSynced === 0) {
              console.log(
                `🔍 Response structure for "${activity.heading || activity.title}":`
              );
              console.log(`   Profile ID checking: ${group.profile_id}`);
              if (activity.responses) {
                console.log(
                  `   All response keys:`,
                  Object.keys(activity.responses)
                );
                console.log(
                  `   Full responses object:`,
                  JSON.stringify(activity.responses, null, 2)
                );
              } else {
                console.log(`   No responses object found`);
              }

              // Also check if there's a different structure
              if (activity.respondents) {
                console.log(
                  `   Found respondents array:`,
                  JSON.stringify(activity.respondents?.slice(0, 2), null, 2)
                );
              }
            }

            // Convert Spond activity to our database format (using correct field names from documentation)
            await runQuery(
              `INSERT OR REPLACE INTO spond_activities (
                id, group_id, member_id, title, description, 
                start_timestamp, end_timestamp, location_name, location_address,
                location_latitude, location_longitude, activity_type, is_cancelled,
                max_accepted, auto_accept, response_status, response_comment, organizer_name, raw_data,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                activity.id,
                group.id,
                memberId,
                activity.heading || activity.title || 'Untitled Activity',
                activity.description || null,
                activity.startTimestamp,
                activity.endTimestamp,
                activity.location?.feature ||
                  activity.location?.address ||
                  null,
                activity.location?.address || null,
                activity.location?.latitude || null,
                activity.location?.longitude || null,
                activity.type || 'EVENT',
                activity.cancelled || false,
                activity.maxAccepted || null,
                activity.autoAccept || false,
                // Check response status using the array format from Spond API
                (() => {
                  let status = null;
                  if (activity.responses) {
                    // Check if invitation has been sent (at least one accept/decline response)
                    const invitationSent =
                      (activity.responses.acceptedIds?.length || 0) +
                        (activity.responses.declinedIds?.length || 0) >
                      0;

                    if (!invitationSent) {
                      // No invitation sent yet - mark as tentative (null)
                      status = null;
                      if (groupActivitiesSynced === 0) {
                        console.log(
                          `📅 Activity "${activity.heading || activity.title}" - invitation not sent yet (tentative)`
                        );
                      }
                    } else if (
                      activity.responses.acceptedIds?.includes(group.profile_id)
                    ) {
                      status = 'accepted';
                    } else if (
                      activity.responses.declinedIds?.includes(group.profile_id)
                    ) {
                      status = 'declined';
                      console.log(
                        `❌ Activity "${activity.heading || activity.title}" marked as DECLINED for ${group.profile_name}`
                      );
                    } else if (
                      activity.responses.unansweredIds?.includes(
                        group.profile_id
                      )
                    ) {
                      status = null; // Not responded yet (tentative)
                    }
                  }
                  return status;
                })(),
                // Response comments not available in this API format
                null,
                activity.organizer?.firstName ||
                  activity.owners?.[0]?.profile?.firstName ||
                  null,
                JSON.stringify(activity),
              ]
            );
            groupActivitiesSynced++;
          } catch (dbError) {
            console.error(`❌ Error storing activity ${activity.id}:`, dbError);
          }
        }

        totalActivitiesSynced += groupActivitiesSynced;

        // Update last synced timestamp for this group
        await runQuery(
          'UPDATE spond_groups SET last_synced_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ?',
          [group.id, memberId]
        );

        syncResults.push({
          groupId: group.id,
          groupName: group.name,
          success: true,
          activitiesCount: groupActivitiesSynced,
        });

        console.log(
          `✅ Synced ${groupActivitiesSynced} activities for group "${group.name}"`
        );
      } catch (error) {
        console.error(`❌ Error syncing group ${group.name}:`, error);
        syncResults.push({
          groupId: group.id,
          groupName: group.name,
          success: false,
          error: error.message,
          activitiesCount: 0,
        });
      }
    }

    // Log sync to sync_log table
    try {
      await runQuery(
        `INSERT INTO spond_sync_log (
          member_id, sync_type, status, activities_synced, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          memberId,
          'activities',
          totalActivitiesSynced > 0 ? 'success' : 'partial',
          totalActivitiesSynced,
        ]
      );
    } catch (logError) {
      console.error('❌ Error logging sync operation:', logError);
    }

    console.log(
      `🎯 Sync completed: ${totalActivitiesSynced} total activities synced across ${activeGroups.length} groups`
    );

    res.json({
      success: true,
      message: `Synced ${totalActivitiesSynced} activities from ${activeGroups.length} groups`,
      activitiesSynced: totalActivitiesSynced,
      groupsSynced: activeGroups.length,
      syncResults: syncResults,
    });
  } catch (error) {
    console.error('❌ Error syncing Spond activities:', error);

    // Log failed sync
    try {
      await runQuery(
        `INSERT INTO spond_sync_log (
          member_id, sync_type, status, error_message, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [memberId, 'activities', 'error', error.message]
      );
    } catch (logError) {
      console.error('❌ Error logging failed sync:', logError);
    }

    if (error.name === 'AbortError') {
      return res.status(500).json({
        error: 'TIMEOUT',
        message: 'Request to Spond API timed out',
      });
    }

    res.status(500).json({
      error: 'SYNC_ERROR',
      message: 'Failed to sync Spond activities',
    });
  }
});

// Get token lifecycle research data for analysis
app.get('/api/spond-token-research', async (req, res) => {
  console.log('📊 Retrieving Spond token research data...');

  try {
    const allSettings = await getAll(
      'SELECT key, value FROM settings WHERE key LIKE "spond_credentials_%"'
    );

    const researchData = allSettings
      .map(setting => {
        const memberId = setting.key.replace('spond_credentials_', '');
        const data = JSON.parse(setting.value);

        return {
          memberId,
          email: data.email,
          tokenCreatedAt: data.tokenCreatedAt,
          tokenLastValidated: data.tokenLastValidated,
          tokenInvalidatedAt: data.tokenInvalidatedAt,
          tokenLifespanDays: data.tokenLifespanDays,
          authenticationCount: data.authenticationCount || 1,
          validationHistory: JSON.parse(data.validationHistory || '[]'),
        };
      })
      .filter(data => data.tokenCreatedAt); // Only include entries with tokens

    console.log(`📈 Found ${researchData.length} token datasets for analysis`);

    // Calculate statistics
    const validTokens = researchData.filter(d => !d.tokenInvalidatedAt);
    const invalidatedTokens = researchData.filter(d => d.tokenInvalidatedAt);
    const knownLifespans = invalidatedTokens
      .filter(d => d.tokenLifespanDays)
      .map(d => d.tokenLifespanDays);

    const stats = {
      totalTokens: researchData.length,
      activeTokens: validTokens.length,
      invalidatedTokens: invalidatedTokens.length,
      averageLifespan:
        knownLifespans.length > 0
          ? Math.round(
              knownLifespans.reduce((a, b) => a + b, 0) / knownLifespans.length
            )
          : null,
      minLifespan:
        knownLifespans.length > 0 ? Math.min(...knownLifespans) : null,
      maxLifespan:
        knownLifespans.length > 0 ? Math.max(...knownLifespans) : null,
      knownLifespans: knownLifespans,
    };

    res.json({
      statistics: stats,
      tokenData: researchData,
      researchNotes:
        'This data helps determine Spond API token validity periods',
    });
  } catch (error) {
    console.error('❌ Error retrieving token research data:', error);
    res.status(500).json({
      error: 'Failed to retrieve research data',
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
    const member = await getOne('SELECT * FROM family_members WHERE id = ?', [
      id,
    ]);
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
    const result = await runQuery('DELETE FROM family_members WHERE id = ?', [
      id,
    ]);

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
      console.log(
        'Foreign key constraints may not be working. Manually cleaning up...'
      );

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

// Calendar Import Endpoint
app.post('/api/family-members/:id/import-calendar', async (req, res) => {
  const { id } = req.params;
  const { calendarUrl } = req.body;

  if (!calendarUrl) {
    return res.status(400).json({ error: 'Calendar URL is required' });
  }

  try {
    // Update member with calendar URL
    await runQuery(
      'UPDATE family_members SET calendar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [calendarUrl, id]
    );

    // Convert webcal to https if needed
    let fetchUrl = calendarUrl;
    if (fetchUrl.startsWith('webcal://')) {
      fetchUrl = fetchUrl.replace('webcal://', 'https://');
    }

    console.log(`Fetching calendar from: ${fetchUrl}`);

    // Fetch the calendar data
    const response = await axios.get(fetchUrl, {
      timeout: 30000,
      responseType: 'text',
      headers: {
        'User-Agent': 'HomeDash/1.0',
      },
    });

    // Parse the iCal data
    const parsedData = ical.parseICS(response.data);

    // Delete existing municipal calendar events for this member
    await runQuery(
      'DELETE FROM activities WHERE member_id = ? AND source = ?',
      [id, 'municipal_calendar']
    );

    let importedCount = 0;
    const events = [];

    // Process each calendar event
    for (const key in parsedData) {
      const event = parsedData[key];

      // Only process VEVENT type entries
      if (event.type === 'VEVENT') {
        const startDate = event.start;
        const endDate = event.end;

        if (startDate) {
          // Extract key information from summary
          const summary = event.summary || 'School Event';
          const description = event.description || '';

          // Skip SFO and kindergarten entries for planning days that affect all services
          // We'll only keep the school entry to avoid triplicates
          if (
            summary.includes('SFO og barnehager stengt') &&
            (summary.includes('(sfo)') || summary.includes('(barnehage)'))
          ) {
            continue; // Skip this entry, we'll only process the (skole) one
          }

          // Determine activity type based on summary
          let activityType = 'school_event';
          if (summary.toLowerCase().includes('ferie')) {
            activityType = 'vacation';
          } else if (summary.toLowerCase().includes('planleggingsdag')) {
            activityType = 'planning_day';
          } else if (summary.toLowerCase().includes('fridag')) {
            activityType = 'holiday';
          }

          // Extract which services are affected
          let affectsServices = [];
          if (
            description.toLowerCase().includes('skole stengt') ||
            summary.toLowerCase().includes('(skole)')
          ) {
            affectsServices.push('school');
          }
          if (
            description.toLowerCase().includes('sfo stengt') ||
            summary.toLowerCase().includes('(sfo)')
          ) {
            affectsServices.push('sfo');
          }
          if (
            description.toLowerCase().includes('barnehage stengt') ||
            summary.toLowerCase().includes('(barnehage)')
          ) {
            affectsServices.push('kindergarten');
          }

          // Default to affecting school if no specific mention
          if (affectsServices.length === 0 && !summary.includes('SFO-')) {
            affectsServices.push('school');
          }

          // Calculate date range for multi-day events
          // Handle date-only events properly (they come with dateOnly: true flag)
          let startDateObj, endDateObj;

          if (startDate.dateOnly) {
            // For date-only events, the iCal library returns UTC time at 22:00 the day before
            // We need to add hours to get the correct date in Oslo timezone (UTC+2 in summer, UTC+1 in winter)
            // Since these are date-only events, we'll add 4 hours to be safe (gets us past midnight in any case)
            const correctedStart = new Date(
              startDate.getTime() + 4 * 60 * 60 * 1000
            );
            const startStr = correctedStart.toISOString().split('T')[0];
            const [year, month, day] = startStr.split('-').map(Number);
            startDateObj = new Date(year, month - 1, day, 12, 0, 0);

            if (endDate) {
              const correctedEnd = new Date(
                endDate.getTime() + 4 * 60 * 60 * 1000
              );
              const endStr = correctedEnd.toISOString().split('T')[0];
              const [endYear, endMonth, endDay] = endStr.split('-').map(Number);
              endDateObj = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
            } else {
              endDateObj = new Date(startDateObj);
            }
          } else {
            // For events with specific times, use them as-is
            startDateObj = new Date(
              startDate.toISOString ? startDate.toISOString() : startDate
            );
            endDateObj = endDate
              ? new Date(endDate.toISOString ? endDate.toISOString() : endDate)
              : new Date(startDateObj);
          }

          // For iCal, end date is exclusive (the day after the last day of the event)
          // So we need to subtract one day from the end date
          endDateObj.setDate(endDateObj.getDate() - 1);

          // Create an activity for each day in the range
          const currentDate = new Date(startDateObj);
          while (currentDate <= endDateObj) {
            // Format date properly for database (YYYY-MM-DD)
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // Create activity entry for this day
            // School calendar events are shown as 2-hour morning blocks (08:00-10:00)
            // to indicate that regular school is replaced by this event
            try {
              await runQuery(
                `INSERT INTO activities 
                 (member_id, title, date, start_time, end_time, description, 
                  activity_type, source, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  id,
                  summary,
                  dateStr,
                  '08:00', // Start at typical school start time
                  '10:00', // 2-hour block to indicate school replacement
                  description,
                  activityType,
                  'municipal_calendar',
                  JSON.stringify({
                    affectsServices,
                    originalEvent: event.uid,
                  }),
                ]
              );

              importedCount++;
              console.log(`Successfully inserted: ${summary} on ${dateStr}`);
            } catch (insertError) {
              console.error(
                `Failed to insert event: ${summary} on ${dateStr}`,
                insertError
              );
            }

            // Only add first day to preview events array
            if (currentDate.getTime() === startDateObj.getTime()) {
              events.push({
                title: summary,
                date: dateStr,
                type: activityType,
                affects: affectsServices,
              });
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }
    }

    // Update member with sync info
    await runQuery(
      'UPDATE family_members SET calendar_last_synced = CURRENT_TIMESTAMP, calendar_event_count = ? WHERE id = ?',
      [importedCount, id]
    );

    console.log(`Imported ${importedCount} calendar events for member ${id}`);

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} events`,
      eventsImported: importedCount,
      events: events.slice(0, 10), // Return first 10 as preview
    });
  } catch (error) {
    console.error('Error importing calendar:', error);
    res.status(500).json({
      error: 'Failed to import calendar',
      details: error.message,
    });
  }
});

// Remove calendar endpoint - deletes all municipal calendar events for a member
app.delete('/api/family-members/:id/remove-calendar', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete all municipal calendar events for this member
    const deleteResult = await runQuery(
      'DELETE FROM activities WHERE member_id = ? AND source = ?',
      [id, 'municipal_calendar']
    );

    // Clear calendar URL and metadata from family member
    await runQuery(
      `UPDATE family_members 
       SET calendar_url = NULL, 
           calendar_last_synced = NULL, 
           calendar_event_count = 0,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );

    console.log(
      `Removed ${deleteResult.changes} calendar events for member ${id}`
    );

    res.json({
      success: true,
      message: `Successfully removed school calendar`,
      eventsRemoved: deleteResult.changes,
    });
  } catch (error) {
    console.error('Error removing calendar:', error);
    res.status(500).json({
      error: 'Failed to remove calendar',
      details: error.message,
    });
  }
});

// Activities Endpoints - Fetch regular and Spond activities separately
app.get('/api/activities', async (req, res) => {
  const { member_id, date, start_date, end_date } = req.query;

  try {
    // Fetch regular activities
    let regularSql = 'SELECT * FROM activities WHERE 1=1';
    const regularParams = [];

    if (member_id) {
      regularSql += ' AND member_id = ?';
      regularParams.push(member_id);
    }

    if (date) {
      regularSql += ' AND date = ?';
      regularParams.push(date);
    }

    if (start_date && end_date) {
      regularSql += ' AND date >= ? AND date <= ?';
      regularParams.push(start_date, end_date);
    }

    regularSql += ' ORDER BY date, start_time';

    const regularActivities = await getAll(regularSql, regularParams);
    console.log(`📋 Found ${regularActivities.length} regular activities`);

    // Fetch Spond activities (only from active groups)
    // IMPORTANT: Spond stores timestamps in UTC. We convert them to the container's local timezone
    // using SQLite's 'localtime' modifier. The container timezone is set via TZ environment variable.
    let spondSql = `
      SELECT sa.*, 
        DATE(sa.start_timestamp, 'localtime') as date, 
        TIME(sa.start_timestamp, 'localtime') as start_time, 
        TIME(sa.end_timestamp, 'localtime') as end_time 
      FROM spond_activities sa
      INNER JOIN spond_groups sg ON sa.group_id = sg.id AND sa.member_id = sg.member_id
      WHERE sg.is_active = TRUE`;
    const spondParams = [];

    if (member_id) {
      spondSql += ' AND sa.member_id = ?';
      spondParams.push(member_id);
    }

    if (date) {
      spondSql += " AND DATE(sa.start_timestamp, 'localtime') = ?";
      spondParams.push(date);
    }

    if (start_date && end_date) {
      spondSql +=
        " AND DATE(sa.start_timestamp, 'localtime') >= ? AND DATE(sa.start_timestamp, 'localtime') <= ?";
      spondParams.push(start_date, end_date);
    }

    spondSql += ' ORDER BY sa.start_timestamp';

    const spondActivities = await getAll(spondSql, spondParams);
    console.log(`⚽ Found ${spondActivities.length} Spond activities`);

    // Combine and normalize the activities
    const combinedActivities = [
      ...regularActivities.map(activity => ({
        ...activity,
        // Keep the original source if it exists, otherwise default to 'manual'
        source: activity.source || 'manual',
      })),
      ...spondActivities.map(activity => ({
        ...activity,
        source: 'spond',
      })),
    ];

    // Sort by date and time
    combinedActivities.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.start_time || '00:00'}`);
      return dateA - dateB;
    });

    // Filter out school_schedule activities when municipal_calendar events exist
    // Municipal calendar events (vacations, holidays, planning days) take precedence
    // and replace regular school schedule for those specific dates
    const municipalCalendarDates = new Set();
    combinedActivities.forEach(activity => {
      if (activity.source === 'municipal_calendar') {
        // Create a key combining member_id and date to handle per-member filtering
        const key = `${activity.member_id}:${activity.date}`;
        municipalCalendarDates.add(key);
      }
    });

    // Filter out school_schedule activities for dates with municipal calendar events
    const filteredActivities = combinedActivities.filter(activity => {
      // Check if this is a school_schedule activity
      const isSchoolSchedule = activity.description?.includes(
        '[TYPE:school_schedule]'
      );
      if (!isSchoolSchedule) {
        return true; // Keep all non-school_schedule activities
      }

      // For school_schedule activities, check if there's a municipal calendar event
      const key = `${activity.member_id}:${activity.date}`;
      const hasMunicipalEvent = municipalCalendarDates.has(key);

      if (hasMunicipalEvent) {
        console.log(
          `🗑️  Filtering out school_schedule for ${activity.date} (municipal calendar event exists)`
        );
        return false; // Remove school_schedule when municipal event exists
      }

      return true; // Keep school_schedule when no municipal event
    });

    const filteredCount = combinedActivities.length - filteredActivities.length;
    if (filteredCount > 0) {
      console.log(
        `🔍 Filtered out ${filteredCount} school_schedule activities due to municipal calendar events`
      );
    }

    console.log(
      `✅ Combined ${combinedActivities.length} total activities (${regularActivities.length} regular + ${spondActivities.length} Spond), ${filteredActivities.length} after filtering`
    );
    res.json(filteredActivities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.post('/api/activities', async (req, res) => {
  const {
    member_id,
    title,
    date,
    start_time,
    end_time,
    description,
    activity_type,
    recurrence_type,
    recurrence_end_date,
    notes,
  } = req.body;

  if (!member_id || !title || !date || !start_time || !end_time) {
    return res.status(400).json({
      error: 'member_id, title, date, start_time, and end_time are required',
    });
  }

  try {
    const result = await runQuery(
      `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        member_id,
        title,
        date,
        start_time,
        end_time,
        description || null,
        activity_type || 'manual',
        recurrence_type || 'none',
        recurrence_end_date || null,
        notes || null,
      ]
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
  const {
    title,
    date,
    start_time,
    end_time,
    description,
    activity_type,
    recurrence_type,
    recurrence_end_date,
    notes,
  } = req.body;

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
      [
        title,
        date,
        start_time,
        end_time,
        description || null,
        activity_type || 'manual',
        recurrence_type || 'none',
        recurrence_end_date || null,
        notes || null,
        id,
      ]
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
    console.log(
      `🗑️  Starting batch delete of school schedule for member ${memberId}`
    );
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

    const homeworkCountResult = await getOne(
      `SELECT COUNT(*) as count FROM homework 
       WHERE member_id = ?`,
      [memberId]
    );

    const totalBefore =
      scheduleCountResult.count +
      activityCountResult.count +
      homeworkCountResult.count;
    console.log(
      `📊 Found ${scheduleCountResult.count} school schedule entries, ${activityCountResult.count} school activity entries, and ${homeworkCountResult.count} homework assignments (${totalBefore} total)`
    );

    if (totalBefore === 0) {
      console.log(
        `ℹ️  No school schedule entries found for member ${memberId}`
      );
      return res.json({
        message: 'No school schedule found to delete',
        deletedCount: 0,
      });
    }

    // Batch delete all school-related activities and homework in one operation
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

    // Also delete all homework for this member
    const deleteHomeworkResult = await runQuery(
      `DELETE FROM homework 
       WHERE member_id = ?`,
      [memberId]
    );

    const totalDeleted =
      deleteScheduleResult.changes +
      deleteActivityResult.changes +
      deleteHomeworkResult.changes;
    const endTime = Date.now();

    console.log(`✅ Batch delete completed in ${endTime - startTime}ms`);
    console.log(
      `📈 Deleted ${deleteScheduleResult.changes} schedule entries, ${deleteActivityResult.changes} activity entries, and ${deleteHomeworkResult.changes} homework assignments (${totalDeleted} total)`
    );

    res.json({
      message: 'School schedule and homework deleted successfully',
      deletedCount: totalDeleted,
      scheduleEntries: deleteScheduleResult.changes,
      activityEntries: deleteActivityResult.changes,
      homeworkEntries: deleteHomeworkResult.changes,
      executionTime: endTime - startTime,
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
    // Check file type - accept images and PDFs
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'), false);
    }
  },
});

// Homework Endpoints
app.get('/api/homework', async (req, res) => {
  const { member_id, week_start_date } = req.query;

  try {
    let homework;
    if (member_id && week_start_date) {
      // Get homework for specific member and week
      homework = await getAll(
        'SELECT * FROM homework WHERE member_id = ? AND week_start_date = ? ORDER BY created_at DESC',
        [member_id, week_start_date]
      );
    } else if (member_id) {
      // Get all homework for specific member (backward compatibility)
      homework = await getAll(
        'SELECT * FROM homework WHERE member_id = ? ORDER BY created_at DESC',
        [member_id]
      );
    } else if (week_start_date) {
      // Get all homework for specific week
      homework = await getAll(
        'SELECT h.*, fm.name as member_name FROM homework h JOIN family_members fm ON h.member_id = fm.id WHERE h.week_start_date = ? ORDER BY h.created_at DESC',
        [week_start_date]
      );
    } else {
      // Get all homework (backward compatibility)
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

app.put('/api/homework/:id', async (req, res) => {
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
app.post(
  '/api/extract-school-plan',
  upload.single('schoolPlanImage'),
  async (req, res) => {
    const { member_id, api_key, selected_model } = req.body;
    const imageFile = req.file;

    console.log('=== SCHOOL PLAN EXTRACTION STARTED ===');
    console.log(`Member ID: ${member_id}`);
    console.log(`Image file: ${imageFile ? imageFile.originalname : 'none'}`);
    console.log(
      `Image size: ${imageFile ? (imageFile.size / 1024).toFixed(2) : 0} KB`
    );
    console.log(`Image type: ${imageFile ? imageFile.mimetype : 'none'}`);
    console.log(
      `API key provided: ${api_key ? 'Yes (length: ' + api_key.length + ')' : 'No'}`
    );
    console.log(
      `Selected model: ${selected_model || 'Not specified (will use default)'}`
    );

    if (!member_id || !api_key || !imageFile) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        error: 'member_id, api_key, and schoolPlanImage are required',
      });
    }

    try {
      // Read the prompt file
      const path = await import('path');
      const fs = await import('fs');
      const promptPath = path.join(process.cwd(), 'llm_prompt.md');
      const prompt = fs.readFileSync(promptPath, 'utf8');
      console.log(
        `📄 Prompt loaded successfully (${prompt.length} characters)`
      );

      // Convert image to base64
      const imageBase64 = imageFile.buffer.toString('base64');
      const imageMimeType = imageFile.mimetype;
      console.log(
        `🖼️  Image converted to base64 (${imageBase64.length} characters)`
      );
      console.log(`📡 Sending request to Anthropic API...`);

      // Prepare the message for Claude with vision
      // Determine which model to use (user selection or fallback to default)
      const modelToUse = selected_model || 'claude-3-5-sonnet-20241022';
      console.log(`🤖 Using model: ${modelToUse}`);

      // Note: We assume the user has selected a vision-capable model
      // Most Claude 3+ models support vision, but if there are issues,
      // the Anthropic API will return a clear error message

      // Determine content type based on file mimetype
      // PDFs use 'document' type, images use 'image' type
      const contentType =
        imageMimeType === 'application/pdf' ? 'document' : 'image';

      const messageData = {
        model: modelToUse, // Use selected model or fallback to default
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: contentType,
                source: {
                  type: 'base64',
                  media_type: imageMimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        console.log(
          `❌ Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        );
        return res.status(response.status).json({
          error: 'Failed to extract school plan',
          message:
            errorData.error?.message || 'Unknown error from Anthropic API',
        });
      }

      const data = await response.json();
      const extractedText = data.content[0].text;
      console.log(`✅ Anthropic API response received`);
      console.log(
        `📝 Extracted text length: ${extractedText.length} characters`
      );
      console.log('--- RAW LLM RESPONSE ---');
      console.log(extractedText);
      console.log('--- END RAW RESPONSE ---');

      // Parse the extracted datasets from the response
      let extractedData;
      try {
        console.log('🔍 Parsing LLM response for datasets...');
        extractedData = parseSchoolPlanResponse(extractedText);
        console.log('✅ Parsing successful');
        console.log(`📊 Parsed datasets:`);
        console.log(
          `   - school_schedule: ${extractedData.school_schedule ? Object.keys(extractedData.school_schedule).length : 0} days`
        );
        console.log(
          `   - school_activities: ${extractedData.school_activities ? extractedData.school_activities.length : 0} activities`
        );
        console.log(
          `   - school_homework: ${extractedData.school_homework ? extractedData.school_homework.length : 0} assignments`
        );
      } catch (parseError) {
        console.error('❌ Error parsing LLM response:', parseError);
        return res.status(400).json({
          error: 'Failed to parse extracted data',
          message:
            'The AI response could not be parsed into the expected format',
          rawResponse: extractedText,
        });
      }

      // Transform and save the data
      console.log('💾 Saving extracted data to database...');
      const savedData = await saveExtractedSchoolPlan(
        member_id,
        extractedData,
        imageFile.originalname
      );
      console.log('✅ Data saved successfully');
      console.log(`📈 Saved records:`);
      console.log(`   - schedules: ${savedData.schedules.length}`);
      console.log(`   - activities: ${savedData.activities.length}`);
      console.log(`   - homework: ${savedData.homework.length}`);

      console.log('🎉 SCHOOL PLAN EXTRACTION COMPLETED SUCCESSFULLY');

      res.json({
        success: true,
        message: 'School plan extracted successfully',
        extractedData: extractedData,
        savedData: savedData,
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
  }
);

// Helper function to parse the LLM response
function parseSchoolPlanResponse(responseText) {
  console.log(
    '🔄 Starting LLM response parsing (school_schedule + school_activities)...'
  );

  const datasets = {
    school_schedule: null,
    school_activities: null,
    school_homework: null,
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
        } else if (
          char !== ' ' &&
          char !== '\n' &&
          char !== '\r' &&
          char !== '\t'
        ) {
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
        const scheduleText = responseText.substring(
          scheduleStart,
          scheduleEnd + 1
        );
        console.log(`📋 Schedule JSON text: ${scheduleText}`);
        datasets.school_schedule = JSON.parse(scheduleText);
        console.log(
          `✅ Parsed school_schedule with ${Object.keys(datasets.school_schedule).length} days`
        );
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
      /\*\*Dataset 2 - school_activities:\*\*\s*```json\s*(\[[\s\S]*?\])\s*```/i,
      /Dataset 2 - school_activities:\s*```json\s*(\[[\s\S]*?\])\s*```/i,
      /Dataset 2 - school_activities:\s*(\[[\s\S]*?\])/i,
      /school_activities[:\s]*(\[[\s\S]*?\])/i,
      /activities[:\s]*(\[[\s\S]*?\])/i,
    ];

    let activitiesFound = false;

    for (const pattern of activitiesPatterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        try {
          console.log(
            `🎯 Found activities pattern: ${match[1].substring(0, 100)}...`
          );

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
              specific_date: activity.specific_date || null,
            }));

            console.log(
              `✅ Parsed school_activities with ${datasets.school_activities.length} activities`
            );
            console.log(
              `📊 Activity types: ${datasets.school_activities.map(a => `${a.name}:${a.type}`).join(', ')}`
            );
            activitiesFound = true;
            break;
          }
        } catch (parseError) {
          console.log(
            `⚠️  Failed to parse activities with pattern ${pattern}: ${parseError.message}`
          );
          continue;
        }
      }
    }

    if (!activitiesFound) {
      console.log('📝 No school_activities found in response');
      datasets.school_activities = [];
    }

    // Parse homework assignments
    console.log('📚 Parsing school_homework...');
    try {
      const homeworkPattern =
        /Dataset 3[^:]*school_homework[^:]*:\s*```json\s*(\[[\s\S]*?\])\s*```/i;
      const homeworkMatch = responseText.match(homeworkPattern);

      if (homeworkMatch) {
        const homeworkJsonText = homeworkMatch[1].trim();
        console.log('📋 Homework JSON text:', homeworkJsonText);

        const parsedHomework = JSON.parse(homeworkJsonText);
        datasets.school_homework = Array.isArray(parsedHomework)
          ? parsedHomework
          : [];
        console.log(
          `✅ Parsed school_homework with ${datasets.school_homework.length} assignments`
        );

        // Log homework subjects for debugging
        if (datasets.school_homework.length > 0) {
          const subjects = datasets.school_homework
            .map(hw => hw.subject)
            .join(', ');
          console.log(`📖 Homework subjects: ${subjects}`);
        }
      } else {
        console.log('⚠️  No homework section found in LLM response');
        datasets.school_homework = [];
      }
    } catch (homeworkError) {
      console.error('❌ Error parsing homework:', homeworkError);
      datasets.school_homework = [];
    }

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

  if (currentMonth >= 7) {
    // August (7) or later - current school year
    schoolYearStart = new Date(currentYear, 7, 1); // August 1st
    schoolYearEnd = new Date(currentYear + 1, 6, 31); // July 31st next year
  } else {
    // Before August - previous school year
    schoolYearStart = new Date(currentYear - 1, 7, 1); // August 1st previous year
    schoolYearEnd = new Date(currentYear, 6, 31); // July 31st current year
  }

  return { schoolYearStart, schoolYearEnd };
}

// Helper function to format a Date as YYYY-MM-DD in local timezone (no UTC conversion)
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    homework: [],
  };

  try {
    // Get school year range and import week start (used for both schedules and activities)
    const importDate = new Date();
    const { schoolYearStart, schoolYearEnd } = getSchoolYearRange(importDate);
    const importWeekStart = getWeekStart(importDate);

    // Day mapping used for both schedules and activities
    const dayMapping = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
    };

    console.log(
      `📚 School year: ${schoolYearStart.toDateString()} to ${schoolYearEnd.toDateString()}`
    );
    console.log(`📆 Import week starts: ${importWeekStart.toDateString()}`);

    // Save school schedule as recurring activities
    if (extractedData.school_schedule) {
      console.log(`📅 Processing recurring school schedule...`);

      // Step 1: Clean up existing school schedules from import week onwards
      console.log(
        `🧹 Cleaning up existing school schedules from ${formatLocalDate(importWeekStart)} onwards...`
      );
      const deleteResult = await runQuery(
        `DELETE FROM activities 
         WHERE member_id = ? 
         AND description LIKE '%[TYPE:school_schedule]%' 
         AND date >= ?`,
        [memberId, formatLocalDate(importWeekStart)]
      );
      console.log(
        `🗑️  Deleted ${deleteResult.changes || 0} existing school schedule entries`
      );

      // Step 2: Generate recurring entries for each day of the week (BATCH OPTIMIZED)
      console.log(`📦 Preparing batch insert for school schedule entries...`);

      // Collect all entries first, then batch insert
      const batchEntries = [];
      const allDayEntries = {}; // Track entries for savedData response

      for (const [day, times] of Object.entries(
        extractedData.school_schedule
      )) {
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
              if (
                targetDate >= importWeekStart &&
                targetDate <= schoolYearEnd
              ) {
                const dateString = formatLocalDate(targetDate);
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
                  formatLocalDate(schoolYearEnd),
                  notes,
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

            console.log(
              `📋 Prepared ${entriesCreated} entries for ${day} (batch)`
            );
          } else {
            console.log(`⚠️  Day ${day} not recognized in dayMapping`);
          }
        } else {
          console.log(`⚠️  Missing start/end times for ${day}:`, times);
        }
      }

      // Execute batch insert for all school schedule entries
      if (batchEntries.length > 0) {
        console.log(
          `💾 Executing batch insert for ${batchEntries.length} school schedule entries...`
        );
        const startTime = Date.now();

        // Create placeholders for batch insert
        const placeholders = batchEntries
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const flatParams = batchEntries.flat();

        await runQuery(
          `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date, notes) 
           VALUES ${placeholders}`,
          flatParams
        );

        const endTime = Date.now();
        console.log(
          `✅ Batch insert completed in ${endTime - startTime}ms (${batchEntries.length} records)`
        );

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
    if (
      extractedData.school_activities &&
      extractedData.school_activities.length > 0
    ) {
      console.log(`🎯 Processing school activities...`);

      // Clean up existing school activities from import week onwards
      console.log(
        `🧹 Cleaning up existing school activities from ${formatLocalDate(importWeekStart)} onwards...`
      );
      const deleteActivitiesResult = await runQuery(
        `DELETE FROM activities 
         WHERE member_id = ? 
         AND description LIKE '%[TYPE:school_activity]%' 
         AND date >= ?`,
        [memberId, formatLocalDate(importWeekStart)]
      );
      console.log(
        `🗑️  Deleted ${deleteActivitiesResult.changes || 0} existing school activity entries`
      );

      // Collect all activity entries for batch processing
      const batchActivityEntries = [];
      const activitySamples = []; // For savedData response

      // Process each school activity with type awareness
      for (const activity of extractedData.school_activities) {
        console.log(
          `🎯 Processing ${activity.type || 'recurring'} activity:`,
          activity
        );

        if (activity.day && activity.name && activity.start && activity.end) {
          const dayNum = dayMapping[activity.day];
          console.log(
            `🗓️  Activity "${activity.name}" on ${activity.day} (${dayNum}) ${activity.start}-${activity.end} - Type: ${activity.type || 'recurring'}`
          );

          if (dayNum) {
            const activityType = activity.type || 'recurring';
            const recurrenceType =
              activityType === 'recurring' ? 'weekly' : 'none';
            const recurrenceEndDate =
              activityType === 'recurring'
                ? formatLocalDate(schoolYearEnd)
                : null;

            if (activityType === 'one_time') {
              // Handle one-time activities
              console.log(
                `📅 Preparing one-time entry for ${activity.name} (${activity.day})`
              );

              // One-time activities are always placed on the corresponding day of the current import week
              const targetDate = new Date(importWeekStart);
              const dayDiff = dayNum - 1; // dayNum is 1-based, we need 0-based for date calculation
              targetDate.setDate(importWeekStart.getDate() + dayDiff);
              console.log(
                `📍 Placing one-time activity on ${activity.day} of current week: ${formatLocalDate(targetDate)}`
              );

              if (
                targetDate >= importWeekStart &&
                targetDate <= schoolYearEnd
              ) {
                const dateString = formatLocalDate(targetDate);

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
                  recurrenceEndDate,
                ]);

                // Add to samples for response
                activitySamples.push({
                  day: activity.day,
                  name: activity.name,
                  date: dateString,
                  start: activity.start,
                  end: activity.end,
                  type: activityType,
                });

                console.log(
                  `📋 Prepared one-time entry for "${activity.name}" on ${dateString}`
                );
              } else {
                console.log(
                  `⚠️  One-time activity date ${formatLocalDate(targetDate)} is outside school year range`
                );
              }
            } else {
              // Handle recurring activities
              console.log(
                `📅 Preparing recurring entries for ${activity.name} (${activity.day})`
              );

              // Generate recurring entries for this activity throughout the school year
              let currentWeek = new Date(importWeekStart);
              let entriesCreated = 0;

              while (currentWeek <= schoolYearEnd) {
                // Calculate the specific date for this day of the week
                const targetDate = new Date(currentWeek);
                const dayDiff = dayNum - 1; // dayNum is 1-based, we need 0-based for date calculation
                targetDate.setDate(currentWeek.getDate() + dayDiff);

                // Only create if the date is within school year and not in the past
                if (
                  targetDate >= importWeekStart &&
                  targetDate <= schoolYearEnd
                ) {
                  const dateString = formatLocalDate(targetDate);

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
                    recurrenceEndDate,
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
                      type: activityType,
                    });
                  }
                }

                // Move to next week
                currentWeek.setDate(currentWeek.getDate() + 7);
              }

              console.log(
                `📋 Prepared ${entriesCreated} recurring entries for activity "${activity.name}"`
              );
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
        console.log(
          `💾 Executing batch insert for ${batchActivityEntries.length} school activity entries...`
        );
        const startTime = Date.now();

        // Create placeholders for batch insert
        const placeholders = batchActivityEntries
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const flatParams = batchActivityEntries.flat();

        await runQuery(
          `INSERT INTO activities (member_id, title, date, start_time, end_time, description, activity_type, recurrence_type, recurrence_end_date) 
           VALUES ${placeholders}`,
          flatParams
        );

        const endTime = Date.now();
        console.log(
          `✅ Batch insert completed in ${endTime - startTime}ms (${batchActivityEntries.length} records)`
        );

        // Add sample entries to savedData for response
        savedData.activities.push(...activitySamples);
      } else {
        console.log(`ℹ️  No school activity entries to create`);
      }
    } else {
      console.log('📝 No school activities to process');
    }

    // Save homework assignments
    if (
      extractedData.school_homework &&
      extractedData.school_homework.length > 0
    ) {
      console.log(
        `📚 Processing ${extractedData.school_homework.length} homework assignments...`
      );

      // Calculate the week start date for homework (same as import week)
      const homeworkWeekStart = formatLocalDate(importWeekStart);
      console.log(
        `📅 Assigning homework to week starting: ${homeworkWeekStart}`
      );

      // Step 1: Clean up existing extracted homework for this week
      // This prevents duplicates when re-importing a school plan for the same week
      // Only deletes homework that was extracted from images, preserving any manual entries
      console.log(
        `🧹 Cleaning up existing extracted homework for week ${homeworkWeekStart}...`
      );
      try {
        const deleteHomeworkResult = await runQuery(
          `DELETE FROM homework 
           WHERE member_id = ? 
           AND week_start_date = ?
           AND extracted_from_image IS NOT NULL`,
          [memberId, homeworkWeekStart]
        );
        console.log(
          `🗑️  Deleted ${deleteHomeworkResult.changes || 0} existing extracted homework entries`
        );
      } catch (deleteError) {
        console.error('⚠️  Error cleaning up existing homework:', deleteError);
        // Continue anyway - better to have duplicates than to fail the entire import
      }

      // Step 2: Insert new homework entries
      for (const homework of extractedData.school_homework) {
        if (homework.subject && homework.assignment) {
          try {
            const result = await runQuery(
              `INSERT INTO homework (member_id, subject, assignment, week_start_date, extracted_from_image) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                memberId,
                homework.subject,
                homework.assignment,
                homeworkWeekStart,
                imageFileName,
              ]
            );

            savedData.homework.push({
              id: result.id,
              subject: homework.subject,
              assignment: homework.assignment,
              week_start_date: homeworkWeekStart,
              extracted_from_image: imageFileName,
            });

            console.log(
              `✅ Saved homework: ${homework.subject} - ${homework.assignment.substring(0, 50)}${homework.assignment.length > 50 ? '...' : ''}`
            );
          } catch (homeworkError) {
            console.error(
              `❌ Error saving homework for ${homework.subject}:`,
              homeworkError
            );
            // Continue with other homework items even if one fails
          }
        } else {
          console.log(`⚠️  Skipping homework with missing data:`, homework);
        }
      }

      console.log(
        `📚 Homework processing completed: ${savedData.homework.length} assignments saved`
      );
    } else {
      console.log('📝 No homework assignments to process');
    }

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
    // Read the prompt file
    const promptPath = path.join(__dirname, 'llm_prompt.md');
    const promptContent = await fs.readFile(promptPath, 'utf8');

    res.json({
      content: promptContent,
    });
  } catch (error) {
    console.error('Error reading prompt file:', error);
    res.status(500).json({ error: 'Failed to read prompt content' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HomeDash Backend Server Started`);
  console.log(`📡 Server listening on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
});
