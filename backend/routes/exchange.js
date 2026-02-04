import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { getAll, getOne, runQuery } from '../database.js';

const router = express.Router();

// Apply auth middleware to most routes, but NOT the callback (called by Microsoft OAuth redirect)
const authMiddleware = (req, res, next) => {
  // Skip auth for OAuth callback - it's called by Microsoft's redirect
  if (req.path === '/callback') {
    return next();
  }
  return requireAuth(req, res, next);
};
router.use(authMiddleware);

// Microsoft Graph API base URL
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const OAUTH_BASE = 'https://login.microsoftonline.com';

// OAuth state storage (in-memory for simplicity, consider Redis for production)
const pendingAuthStates = new Map();

// ============================================
// Azure App Configuration (Hardcoded)
// ============================================
// These credentials are from the HomeDash Azure App Registration.
// The app is registered as a single-tenant personal Microsoft account app.
//
// IMPORTANT: These are NOT secret in the traditional sense for OAuth public clients,
// but we still keep them here rather than in the frontend for cleaner architecture.
//
// Registered redirect URIs in Azure:
//   - http://localhost:3001/api/exchange/callback (local development)
//   - https://homedash.overli.dev/api/exchange/callback (production)

const AZURE_CONFIG = {
  clientId: process.env.AZURE_CLIENT_ID || null,
  clientSecret: process.env.AZURE_CLIENT_SECRET || null,
  tenantId: process.env.AZURE_TENANT_ID || 'consumers', // 'consumers' for personal Microsoft accounts only
};

// Allowed redirect URI hosts (for security - only allow known hosts)
const ALLOWED_REDIRECT_HOSTS = ['localhost:3001', 'homedash.overli.dev'];

// Helper to get Azure app configuration
const getAzureConfig = (req = null) => {
  const clientId = AZURE_CONFIG.clientId;
  const clientSecret = AZURE_CONFIG.clientSecret;
  const tenantId = AZURE_CONFIG.tenantId;

  // Dynamically determine redirect URI from request if available
  let redirectUri = null;
  if (req) {
    redirectUri = buildRedirectUri(req);
  }

  return {
    clientId: clientId || null,
    clientSecret: clientSecret || null,
    tenantId: tenantId,
    redirectUri: redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
};

// Helper to build redirect URI from request
const buildRedirectUri = req => {
  // Get the host from various headers (handles reverse proxy scenarios)
  const forwardedHost = req.get('X-Forwarded-Host');
  const forwardedProto = req.get('X-Forwarded-Proto');
  const host = forwardedHost || req.get('host');
  const protocol = forwardedProto || (req.secure ? 'https' : 'http');

  // Security check: only allow known hosts
  if (!ALLOWED_REDIRECT_HOSTS.includes(host)) {
    console.warn(`⚠️ Unknown host for redirect URI: ${host}`);
    // Fall back to first allowed host for safety
    return `http://${ALLOWED_REDIRECT_HOSTS[0]}/api/exchange/callback`;
  }

  return `${protocol}://${host}/api/exchange/callback`;
};

// Helper to refresh access token
const refreshAccessToken = async (memberId, refreshToken) => {
  const config = getAzureConfig();
  if (!config.isConfigured) {
    throw new Error('Azure app not configured');
  }

  const tokenUrl = `${OAUTH_BASE}/${config.tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'offline_access Calendars.Read User.Read',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Token refresh failed:', errorData);
    throw new Error('Failed to refresh access token');
  }

  const tokenData = await response.json();

  // Update stored tokens
  const expiresAt = new Date(
    Date.now() + tokenData.expires_in * 1000
  ).toISOString();

  await runQuery(
    `UPDATE exchange_credentials 
     SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE member_id = ?`,
    [
      tokenData.access_token,
      tokenData.refresh_token || refreshToken,
      expiresAt,
      memberId,
    ]
  );

  return tokenData.access_token;
};

// Helper to get valid access token (refreshes if needed)
const getValidAccessToken = async memberId => {
  const credentials = await getOne(
    'SELECT * FROM exchange_credentials WHERE member_id = ?',
    [memberId]
  );

  if (!credentials) {
    throw new Error('No Exchange credentials found');
  }

  const expiresAt = new Date(credentials.token_expires_at);
  const now = new Date();

  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log(`🔄 Refreshing Exchange token for member ${memberId}`);
    return await refreshAccessToken(memberId, credentials.refresh_token);
  }

  return credentials.access_token;
};

// Helper to make Graph API calls
const graphApiCall = async (accessToken, endpoint, options = {}) => {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${GRAPH_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Graph API error:', response.status, errorData);
    throw new Error(
      errorData.error?.message || `Graph API error: ${response.status}`
    );
  }

  return response.json();
};

// ============================================
// Azure App Configuration Endpoints
// ============================================

/**
 * GET /api/exchange/config
 * Get Azure app configuration status (without exposing secrets)
 */
router.get('/config', async (req, res) => {
  console.log('=== GET EXCHANGE CONFIG ===');

  try {
    const config = getAzureConfig(req);

    res.json({
      isConfigured: config.isConfigured,
      clientId: config.clientId
        ? `${config.clientId.substring(0, 8)}...`
        : null,
      tenantId: config.tenantId,
      redirectUri: config.redirectUri,
      allowedHosts: ALLOWED_REDIRECT_HOSTS,
      hasClientSecret: Boolean(config.clientSecret),
    });
  } catch (error) {
    console.error('Error getting Exchange config:', error);
    res.status(500).json({
      error: 'Failed to get Exchange configuration',
      message: error.message,
    });
  }
});

/**
 * POST /api/exchange/config
 * No longer used - config comes from environment variables
 */
router.post('/config', async (req, res) => {
  res.status(400).json({
    error: 'Configuration via API not supported',
    message:
      'Exchange configuration is done via environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_REDIRECT_URI). Please update your deployment configuration.',
  });
});

// ============================================
// OAuth Flow Endpoints
// ============================================

/**
 * GET /api/exchange/auth/:memberId
 * Initiate OAuth flow - returns the authorization URL
 */
router.get('/auth/:memberId', async (req, res) => {
  const { memberId } = req.params;
  console.log(`=== INITIATE EXCHANGE OAUTH FOR MEMBER ${memberId} ===`);

  try {
    const config = getAzureConfig(req);

    if (!config.isConfigured) {
      return res.status(400).json({
        error: 'Exchange not configured',
        message:
          'Microsoft Exchange integration is not yet configured. Azure App credentials need to be added to the application.',
      });
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with member ID (expires in 10 minutes)
    pendingAuthStates.set(state, {
      memberId: parseInt(memberId),
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Clean up expired states
    for (const [key, value] of pendingAuthStates) {
      if (value.expiresAt < Date.now()) {
        pendingAuthStates.delete(key);
      }
    }

    // Build authorization URL
    const authParams = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      response_mode: 'query',
      scope: 'offline_access Calendars.Read User.Read',
      state: state,
      prompt: 'consent', // Force consent screen to ensure refresh token
    });

    const authUrl = `${OAUTH_BASE}/${config.tenantId}/oauth2/v2.0/authorize?${authParams.toString()}`;

    console.log(`🔗 Auth URL generated for member ${memberId}`);

    res.json({
      authUrl,
      state,
    });
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({
      error: 'Failed to initiate OAuth flow',
      message: error.message,
    });
  }
});

/**
 * GET /api/exchange/callback
 * OAuth callback - exchange code for tokens
 */
router.get('/callback', async (req, res) => {
  console.log('=== EXCHANGE OAUTH CALLBACK ===');

  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'EXCHANGE_AUTH_ERROR',
              error: '${error}',
              message: '${error_description || 'Authentication failed'}'
            }, '*');
            window.close();
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
      </html>
    `);
  }

  // Validate state
  const stateData = pendingAuthStates.get(state);
  if (!stateData) {
    console.error('Invalid or expired state parameter');
    return res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'EXCHANGE_AUTH_ERROR',
              error: 'invalid_state',
              message: 'Invalid or expired authentication session. Please try again.'
            }, '*');
            window.close();
          </script>
          <p>Invalid session. This window should close automatically.</p>
        </body>
      </html>
    `);
  }

  // Remove used state
  pendingAuthStates.delete(state);

  const { memberId } = stateData;

  try {
    const config = getAzureConfig(req);

    // Exchange code for tokens
    const tokenUrl = `${OAUTH_BASE}/${config.tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      scope: 'offline_access Calendars.Read User.Read',
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Token exchange failed:', errorData);
      throw new Error(
        errorData.error_description || 'Failed to exchange code for tokens'
      );
    }

    const tokenData = await tokenResponse.json();

    console.log('✅ Token exchange successful');

    // Get user info
    const userInfo = await graphApiCall(tokenData.access_token, '/me');
    console.log(
      `👤 User: ${userInfo.displayName} (${userInfo.mail || userInfo.userPrincipalName})`
    );

    // Calculate token expiry
    const expiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000
    ).toISOString();

    // Store credentials (upsert)
    await runQuery(
      `INSERT INTO exchange_credentials (member_id, access_token, refresh_token, token_expires_at, user_email, user_display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(member_id) DO UPDATE SET 
         access_token = ?, 
         refresh_token = ?, 
         token_expires_at = ?, 
         user_email = ?,
         user_display_name = ?,
         updated_at = CURRENT_TIMESTAMP`,
      [
        memberId,
        tokenData.access_token,
        tokenData.refresh_token,
        expiresAt,
        userInfo.mail || userInfo.userPrincipalName,
        userInfo.displayName,
        // For ON CONFLICT UPDATE
        tokenData.access_token,
        tokenData.refresh_token,
        expiresAt,
        userInfo.mail || userInfo.userPrincipalName,
        userInfo.displayName,
      ]
    );

    console.log(`✅ Credentials stored for member ${memberId}`);

    // Return success page that communicates with opener
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'EXCHANGE_AUTH_SUCCESS',
              memberId: ${memberId},
              userEmail: '${userInfo.mail || userInfo.userPrincipalName}',
              displayName: '${userInfo.displayName}'
            }, '*');
            window.close();
          </script>
          <p>Authentication successful! This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'EXCHANGE_AUTH_ERROR',
              error: 'token_exchange_failed',
              message: '${error.message.replace(/'/g, "\\'")}'
            }, '*');
            window.close();
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
});

// ============================================
// Credentials Management Endpoints
// ============================================

/**
 * GET /api/exchange/credentials/:memberId
 * Get Exchange connection status for a member
 */
router.get('/credentials/:memberId', async (req, res) => {
  const { memberId } = req.params;
  console.log(`=== GET EXCHANGE CREDENTIALS FOR MEMBER ${memberId} ===`);

  try {
    const credentials = await getOne(
      'SELECT member_id, user_email, user_display_name, token_expires_at, created_at, updated_at FROM exchange_credentials WHERE member_id = ?',
      [memberId]
    );

    if (!credentials) {
      return res.json({
        connected: false,
        message: 'No Exchange account connected',
      });
    }

    // Check if token is expired
    const expiresAt = new Date(credentials.token_expires_at);
    const isExpired = expiresAt < new Date();

    res.json({
      connected: true,
      userEmail: credentials.user_email,
      displayName: credentials.user_display_name,
      tokenExpired: isExpired,
      connectedAt: credentials.created_at,
      lastUpdated: credentials.updated_at,
    });
  } catch (error) {
    console.error('Error getting Exchange credentials:', error);
    res.status(500).json({
      error: 'Failed to get Exchange credentials',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/exchange/credentials/:memberId
 * Disconnect Exchange for a member
 */
router.delete('/credentials/:memberId', async (req, res) => {
  const { memberId } = req.params;
  console.log(`=== DELETE EXCHANGE CREDENTIALS FOR MEMBER ${memberId} ===`);

  try {
    // Delete credentials
    await runQuery('DELETE FROM exchange_credentials WHERE member_id = ?', [
      memberId,
    ]);

    // Delete associated calendars and events
    await runQuery('DELETE FROM exchange_events WHERE member_id = ?', [
      memberId,
    ]);
    await runQuery('DELETE FROM exchange_calendars WHERE member_id = ?', [
      memberId,
    ]);
    await runQuery('DELETE FROM exchange_sync_log WHERE member_id = ?', [
      memberId,
    ]);

    console.log(`✅ Exchange disconnected for member ${memberId}`);

    res.json({
      success: true,
      message: 'Exchange account disconnected successfully',
    });
  } catch (error) {
    console.error('Error deleting Exchange credentials:', error);
    res.status(500).json({
      error: 'Failed to disconnect Exchange',
      message: error.message,
    });
  }
});

// ============================================
// Calendar Endpoints
// ============================================

/**
 * GET /api/exchange/calendars/:memberId
 * List available calendars for a member
 */
router.get('/calendars/:memberId', async (req, res) => {
  const { memberId } = req.params;
  console.log(`=== GET EXCHANGE CALENDARS FOR MEMBER ${memberId} ===`);

  try {
    const accessToken = await getValidAccessToken(memberId);

    // Fetch calendars from Graph API
    const calendarsResponse = await graphApiCall(accessToken, '/me/calendars');

    const calendars = calendarsResponse.value.map(cal => ({
      id: cal.id,
      name: cal.name,
      color: cal.hexColor || cal.color,
      isDefault: cal.isDefaultCalendar,
      canEdit: cal.canEdit,
    }));

    // Get stored calendar selections
    const storedCalendars = await getAll(
      'SELECT id, is_active FROM exchange_calendars WHERE member_id = ?',
      [memberId]
    );

    const storedMap = new Map(storedCalendars.map(c => [c.id, c.is_active]));

    // Merge with stored selections
    const calendarsWithSelection = calendars.map(cal => ({
      ...cal,
      isActive: storedMap.has(cal.id)
        ? Boolean(storedMap.get(cal.id))
        : cal.isDefault,
    }));

    res.json({
      calendars: calendarsWithSelection,
    });
  } catch (error) {
    console.error('Error fetching Exchange calendars:', error);

    if (error.message === 'No Exchange credentials found') {
      return res.status(401).json({
        error: 'Not connected',
        message: 'Exchange account not connected',
      });
    }

    res.status(500).json({
      error: 'Failed to fetch calendars',
      message: error.message,
    });
  }
});

/**
 * POST /api/exchange/calendars/:memberId/select
 * Save calendar selections for a member
 */
router.post('/calendars/:memberId/select', async (req, res) => {
  const { memberId } = req.params;
  const { selectedCalendarIds } = req.body;
  console.log(
    `=== SAVE EXCHANGE CALENDAR SELECTIONS FOR MEMBER ${memberId} ===`
  );
  console.log(
    `Selected calendars: ${selectedCalendarIds?.join(', ') || 'none'}`
  );

  if (!Array.isArray(selectedCalendarIds)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'selectedCalendarIds must be an array',
    });
  }

  try {
    const accessToken = await getValidAccessToken(memberId);

    // Fetch current calendars to get names
    const calendarsResponse = await graphApiCall(accessToken, '/me/calendars');

    // Update calendar selections in database
    for (const cal of calendarsResponse.value) {
      const isActive = selectedCalendarIds.includes(cal.id);

      await runQuery(
        `INSERT INTO exchange_calendars (id, member_id, name, color, is_default, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(id, member_id) DO UPDATE SET
           name = ?,
           color = ?,
           is_default = ?,
           is_active = ?,
           updated_at = CURRENT_TIMESTAMP`,
        [
          cal.id,
          memberId,
          cal.name,
          cal.hexColor || cal.color,
          cal.isDefaultCalendar ? 1 : 0,
          isActive ? 1 : 0,
          // For ON CONFLICT UPDATE
          cal.name,
          cal.hexColor || cal.color,
          cal.isDefaultCalendar ? 1 : 0,
          isActive ? 1 : 0,
        ]
      );
    }

    console.log(`✅ Calendar selections saved for member ${memberId}`);

    res.json({
      success: true,
      message: 'Calendar selections saved',
      selectedCount: selectedCalendarIds.length,
    });
  } catch (error) {
    console.error('Error saving calendar selections:', error);
    res.status(500).json({
      error: 'Failed to save calendar selections',
      message: error.message,
    });
  }
});

// ============================================
// Event Sync Endpoints
// ============================================

/**
 * GET /api/exchange/events/:memberId/sync-status
 * Check sync status for a member
 */
router.get('/events/:memberId/sync-status', async (req, res) => {
  const { memberId } = req.params;
  console.log(`=== CHECK EXCHANGE SYNC STATUS FOR MEMBER ${memberId} ===`);

  try {
    // Check if connected
    const credentials = await getOne(
      'SELECT member_id FROM exchange_credentials WHERE member_id = ?',
      [memberId]
    );

    if (!credentials) {
      return res.json({
        connected: false,
        needsSync: false,
      });
    }

    // Get active calendars
    const activeCalendars = await getAll(
      'SELECT id, last_synced_at FROM exchange_calendars WHERE member_id = ? AND is_active = 1',
      [memberId]
    );

    if (activeCalendars.length === 0) {
      return res.json({
        connected: true,
        needsSync: false,
        reason: 'No calendars selected for sync',
      });
    }

    // Check if any calendar needs sync (not synced in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const needsSync = activeCalendars.some(
      cal => !cal.last_synced_at || cal.last_synced_at < fiveMinutesAgo
    );

    // Get last sync info
    const lastSync = await getOne(
      `SELECT created_at, status, events_synced FROM exchange_sync_log 
       WHERE member_id = ? ORDER BY created_at DESC LIMIT 1`,
      [memberId]
    );

    res.json({
      connected: true,
      needsSync,
      lastSyncAt: lastSync?.created_at || null,
      lastSyncStatus: lastSync?.status || null,
      lastSyncEventsCount: lastSync?.events_synced || 0,
      activeCalendarsCount: activeCalendars.length,
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    res.status(500).json({
      error: 'Failed to check sync status',
      message: error.message,
    });
  }
});

/**
 * POST /api/exchange/events/:memberId/sync
 * Sync events from Exchange calendars
 */
router.post('/events/:memberId/sync', async (req, res) => {
  const { memberId } = req.params;
  const { startDate, endDate } = req.body;
  console.log(`=== SYNC EXCHANGE EVENTS FOR MEMBER ${memberId} ===`);

  const syncStartTime = Date.now();

  try {
    const accessToken = await getValidAccessToken(memberId);

    // Get active calendars
    const activeCalendars = await getAll(
      'SELECT id, name FROM exchange_calendars WHERE member_id = ? AND is_active = 1',
      [memberId]
    );

    if (activeCalendars.length === 0) {
      return res.json({
        success: true,
        message: 'No calendars selected for sync',
        eventsCount: 0,
      });
    }

    // Calculate date range (default: 30 days before and 90 days after)
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const startDateTime = start.toISOString();
    const endDateTime = end.toISOString();

    console.log(`📅 Sync date range: ${startDateTime} to ${endDateTime}`);

    let totalEvents = 0;

    // Sync each active calendar
    for (const calendar of activeCalendars) {
      console.log(`📆 Syncing calendar: ${calendar.name}`);

      try {
        // Fetch events using calendarView endpoint (handles recurring events)
        const eventsResponse = await graphApiCall(
          accessToken,
          `/me/calendars/${calendar.id}/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=500&$select=id,subject,bodyPreview,start,end,isAllDay,isCancelled,location,responseStatus,showAs,organizer,webLink`
        );

        const events = eventsResponse.value || [];
        console.log(`  Found ${events.length} events`);

        // Delete old events for this calendar
        await runQuery(
          'DELETE FROM exchange_events WHERE calendar_id = ? AND member_id = ?',
          [calendar.id, memberId]
        );

        // Insert new events
        for (const event of events) {
          await runQuery(
            `INSERT INTO exchange_events (
              id, calendar_id, member_id, subject, body_preview,
              start_timestamp, end_timestamp, start_timezone, end_timezone,
              is_all_day, is_cancelled, location_name, location_address,
              response_status, show_as, organizer_name, organizer_email,
              web_link, raw_data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              event.id,
              calendar.id,
              memberId,
              event.subject || 'Untitled',
              event.bodyPreview || null,
              event.start?.dateTime || null,
              event.end?.dateTime || null,
              event.start?.timeZone || null,
              event.end?.timeZone || null,
              event.isAllDay ? 1 : 0,
              event.isCancelled ? 1 : 0,
              event.location?.displayName || null,
              event.location?.address?.street || null,
              event.responseStatus?.response || null,
              event.showAs || null,
              event.organizer?.emailAddress?.name || null,
              event.organizer?.emailAddress?.address || null,
              event.webLink || null,
              JSON.stringify(event),
            ]
          );
        }

        totalEvents += events.length;

        // Update calendar's last synced timestamp
        await runQuery(
          'UPDATE exchange_calendars SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ?',
          [calendar.id, memberId]
        );
      } catch (calError) {
        console.error(`Error syncing calendar ${calendar.name}:`, calError);
        // Continue with other calendars
      }
    }

    const syncDuration = Date.now() - syncStartTime;

    // Log sync
    await runQuery(
      `INSERT INTO exchange_sync_log (member_id, sync_type, status, events_synced, sync_duration_ms, created_at)
       VALUES (?, 'full', 'success', ?, ?, CURRENT_TIMESTAMP)`,
      [memberId, totalEvents, syncDuration]
    );

    console.log(`✅ Sync complete: ${totalEvents} events in ${syncDuration}ms`);

    res.json({
      success: true,
      eventsCount: totalEvents,
      calendarsCount: activeCalendars.length,
      syncDurationMs: syncDuration,
    });
  } catch (error) {
    console.error('Error syncing Exchange events:', error);

    const syncDuration = Date.now() - syncStartTime;

    // Log failed sync
    await runQuery(
      `INSERT INTO exchange_sync_log (member_id, sync_type, status, error_message, sync_duration_ms, created_at)
       VALUES (?, 'full', 'failed', ?, ?, CURRENT_TIMESTAMP)`,
      [memberId, error.message, syncDuration]
    ).catch(() => {});

    res.status(500).json({
      error: 'Failed to sync events',
      message: error.message,
    });
  }
});

export default router;
