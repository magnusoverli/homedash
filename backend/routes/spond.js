import express from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../middleware/auth.js';
import { getAll, getOne, runQuery } from '../database.js';

const router = express.Router();

router.use(requireAuth);

router.post('/test-credentials', async (req, res) => {
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
router.post('/credentials/:memberId', async (req, res) => {
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
router.get('/credentials/:memberId', async (req, res) => {
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
router.delete('/credentials/:memberId', async (req, res) => {
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
router.post('/api/validate-spond-token/:memberId', async (req, res) => {
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
router.get('/groups/:memberId', async (req, res) => {
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
router.get('/profiles/:memberId', async (req, res) => {
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
router.post('/profile-mapping/:memberId', async (req, res) => {
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
router.get('/profile-mapping/:memberId', async (req, res) => {
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
router.post('/groups/:memberId/selections', async (req, res) => {
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
         AND spond_groups.profile_id = spond_activities.profile_id
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
router.get('/activities/:memberId/sync-status', async (req, res) => {
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
router.post('/activities/:memberId/sync', async (req, res) => {
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
                id, group_id, member_id, profile_id, title, description, 
                start_timestamp, end_timestamp, location_name, location_address,
                location_latitude, location_longitude, activity_type, is_cancelled,
                max_accepted, auto_accept, response_status, response_comment, organizer_name, raw_data,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                activity.id,
                group.id,
                memberId,
                group.profile_id,
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
          'UPDATE spond_groups SET last_synced_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ? AND profile_id = ?',
          [group.id, memberId, group.profile_id]
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
router.get('/token-research', async (req, res) => {
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

export default router;
