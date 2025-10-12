# Remember Me Feature - Testing Guide

## Implementation Summary

The "Remember me" feature has been successfully implemented with the following configuration:

- **Short-lived tokens**: 12 hours (without "remember me")
- **Long-lived tokens**: 7 days (with "remember me")
- **Automatic refresh**: Tokens refresh 30 minutes before expiration
- **Token cleanup**: Daily job removes expired tokens
- **Storage**: localStorage (persists across browser sessions)

## Testing Instructions

### Prerequisites

1. Enable access control by uncommenting the ACCESS_PASSWORD in docker-compose.yml:
   ```yaml
   environment:
     - ACCESS_PASSWORD=test123
   ```

2. Restart containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Test Scenarios

#### 1. Login WITHOUT "Remember me" (12-hour token)

**Steps:**
1. Open http://localhost:3000 in your browser
2. You should see the login screen
3. Enter password: `test123`
4. Leave "Remember me for 7 days" **unchecked**
5. Click "Login"

**Expected Results:**
- Successfully logged in
- Check localStorage (F12 > Application > Local Storage):
  - `access_token`: present (64-character hex string)
  - `token_expires_at`: timestamp ~12 hours from now
  - `remember_me`: "false"
- Token should expire in 12 hours

**Verify Token Details:**
```javascript
// In browser console (F12):
const expiresAt = new Date(localStorage.getItem('token_expires_at'));
const now = new Date();
const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
console.log(`Token expires in ${hoursUntilExpiry.toFixed(2)} hours`);
// Should show ~12 hours
```

#### 2. Login WITH "Remember me" (7-day token)

**Steps:**
1. Log out (or clear localStorage and refresh)
2. Open http://localhost:3000
3. Enter password: `test123`
4. Check "Remember me for 7 days" ✓
5. Click "Login"

**Expected Results:**
- Successfully logged in
- Check localStorage:
  - `access_token`: present
  - `token_expires_at`: timestamp ~7 days from now
  - `remember_me`: "true"
- Token should expire in 7 days

**Verify Token Details:**
```javascript
// In browser console (F12):
const expiresAt = new Date(localStorage.getItem('token_expires_at'));
const now = new Date();
const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);
console.log(`Token expires in ${daysUntilExpiry.toFixed(2)} days`);
// Should show ~7 days
```

#### 3. Token Persistence Across Browser Restarts

**Steps:**
1. Login with "Remember me" checked
2. Close the browser completely
3. Reopen browser and navigate to http://localhost:3000

**Expected Results:**
- Should remain logged in (no login screen)
- Token still present in localStorage
- Application loads normally

#### 4. Automatic Token Refresh

**Steps:**
1. Login with "Remember me" checked
2. Use browser console to manually set token expiration to 25 minutes from now:
   ```javascript
   const now = new Date();
   const expiresIn25Min = new Date(now.getTime() + 25 * 60 * 1000);
   localStorage.setItem('token_expires_at', expiresIn25Min.toISOString());
   console.log('Token will expire in 25 minutes');
   ```
3. Wait 5 minutes (or refresh the page to trigger check)
4. Watch browser console for refresh message

**Expected Results:**
- Within 5 minutes, you should see:
  - `🔄 Auto-refreshing token...`
  - `✅ Token refreshed successfully`
- Token expiration timestamp updated
- New token issued
- User remains logged in without interruption

#### 5. Token Expiration Handling

**Steps:**
1. Login with "Remember me" unchecked
2. Use browser console to set token as expired:
   ```javascript
   const past = new Date(Date.now() - 1000); // 1 second ago
   localStorage.setItem('token_expires_at', past.toISOString());
   console.log('Token set to expired');
   ```
3. Refresh the page

**Expected Results:**
- Automatically redirected to login screen
- localStorage cleared
- No error messages

#### 6. Server Restart - Token Persistence

**Steps:**
1. Login with "Remember me" checked
2. Restart Docker containers:
   ```bash
   docker-compose restart
   ```
3. Wait for containers to start (~10 seconds)
4. Refresh the browser

**Expected Results:**
- Should remain logged in (tokens stored in database survive restart)
- No re-authentication required
- Application loads normally

#### 7. Logout Functionality

**Steps:**
1. Login (with or without "Remember me")
2. Navigate to Settings (⚙️ icon)
3. Look for logout button (if implemented) OR:
4. Use browser console:
   ```javascript
   import('./services/authService.js').then(m => m.logout());
   ```
5. Wait for page to reload

**Expected Results:**
- Redirected to login screen
- localStorage cleared (all auth keys removed)
- Token deleted from database

#### 8. Database Token Cleanup

**Steps:**
1. Login multiple times with different tokens
2. Check database for tokens:
   ```bash
   docker exec -it homedash-backend sh
   cd data
   sqlite3 homedash.db
   SELECT token, remember_me, datetime(expires_at) as expires, datetime(created_at) as created 
   FROM auth_tokens;
   .exit
   exit
   ```
3. Wait 24 hours OR manually trigger cleanup

**Expected Results:**
- Expired tokens are removed daily
- Active tokens remain in database
- No orphaned tokens accumulate

#### 9. Multiple Device/Browser Support

**Steps:**
1. Login on Browser A with "Remember me"
2. Login on Browser B with same password (different session)
3. Both should work independently
4. Logout on Browser A
5. Browser B should remain logged in

**Expected Results:**
- Each browser has its own token
- Logout only affects the current session
- Multiple valid tokens can exist simultaneously

#### 10. Manual Token Refresh Test

**Steps:**
1. Login with any configuration
2. Use browser console to manually refresh:
   ```javascript
   import('./services/authService.js').then(async m => {
     try {
       const result = await m.refreshToken();
       console.log('Refresh result:', result);
     } catch (err) {
       console.error('Refresh failed:', err);
     }
   });
   ```

**Expected Results:**
- New token issued
- Old token deleted from database
- Expiration time extended
- `remember_me` flag preserved
- Console shows success message

## Backend API Testing (Using curl)

### Test Auth Status
```bash
curl -s http://localhost:3001/api/auth/status | jq
# Expected: {"enabled": true}
```

### Test Login Without Remember Me
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","rememberMe":false}' | jq
# Expected: {"success":true,"token":"...","expiresAt":"...","rememberMe":false}
```

### Test Login With Remember Me
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","rememberMe":true}' | jq
# Expected: {"success":true,"token":"...","expiresAt":"...","rememberMe":true}
```

### Test Token Refresh
```bash
# First login to get a token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","rememberMe":true}' | jq -r '.token')

# Then refresh the token
curl -s -X POST http://localhost:3001/api/auth/refresh \
  -H "x-access-token: $TOKEN" | jq
# Expected: {"success":true,"token":"...","expiresAt":"...","rememberMe":true}
```

### Test Protected Endpoint
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","rememberMe":false}' | jq -r '.token')

# Access protected endpoint
curl -s http://localhost:3001/api/family-members \
  -H "x-access-token: $TOKEN" | jq
# Expected: Array of family members (or empty array if none exist)
```

### Test Logout
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","rememberMe":false}' | jq -r '.token')

# Logout
curl -s -X POST http://localhost:3001/api/auth/logout \
  -H "x-access-token: $TOKEN" | jq
# Expected: {"success":true}

# Try to use the token again (should fail)
curl -s http://localhost:3001/api/family-members \
  -H "x-access-token: $TOKEN" | jq
# Expected: {"error":"Unauthorized","message":"Invalid or expired token"}
```

## Database Inspection

Check the auth_tokens table directly:

```bash
docker exec -it homedash-backend sh -c "cd data && sqlite3 homedash.db 'SELECT 
  substr(token, 1, 16) || \"...\" as token_preview,
  remember_me,
  datetime(created_at) as created,
  datetime(expires_at) as expires,
  datetime(last_used_at) as last_used,
  ROUND((julianday(expires_at) - julianday(\"now\")) * 24, 2) as hours_until_expiry
FROM auth_tokens;'"
```

## Troubleshooting

### Issue: "Access control is not enabled"
**Solution**: Set ACCESS_PASSWORD in docker-compose.yml and restart containers.

### Issue: Token not refreshing automatically
**Solution**: 
1. Check browser console for errors
2. Verify token_expires_at in localStorage is in the future
3. Ensure page has been open for at least 5 minutes (refresh interval)

### Issue: "Invalid or expired token" after server restart
**Solution**: This should NOT happen anymore. If it does:
1. Check database file exists: `docker exec homedash-backend ls -la data/`
2. Verify auth_tokens table exists
3. Check server logs for database errors

### Issue: Login screen shows even with valid token
**Solution**:
1. Check if token is expired: `new Date(localStorage.getItem('token_expires_at')) < new Date()`
2. Verify backend is running: `curl http://localhost:3001/api/health`
3. Check browser console for errors

## Success Criteria

✅ All test scenarios pass  
✅ Tokens persist across server restarts  
✅ Automatic refresh works without user interaction  
✅ Remember me checkbox controls token duration  
✅ Expired tokens are cleaned up  
✅ Logout properly clears tokens  
✅ Multiple sessions work independently  
✅ No console errors during normal operation  

## Files Modified

- ✅ `backend/database.js` - Added auth_tokens table and index
- ✅ `backend/server.js` - Database-backed token management, refresh endpoint, cleanup job
- ✅ `src/components/Login.jsx` - Remember me checkbox and state management
- ✅ `src/components/Login.css` - Checkbox styling
- ✅ `src/services/authService.js` - Token expiration checking, refresh, auto-refresh
- ✅ `src/App.jsx` - Token refresh lifecycle management

## Implementation Complete! 🎉

The remember me feature is fully implemented and ready for testing. All code changes have been applied and the application is running successfully.

