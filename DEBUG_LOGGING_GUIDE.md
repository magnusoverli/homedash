# Debug Logging Guide for Anthropic API Key Issues

This guide explains how to use the comprehensive debug logging that has been added to troubleshoot Anthropic API key validation issues.

## Overview

Debug logging has been added to both the frontend (React) and backend (Express) to help diagnose API key validation problems. The logging provides detailed information about:

- API key format validation
- Request/response details
- Network errors
- Timeout issues
- Anthropic API responses

## How to View Debug Logs

### Backend Logs (Most Important)

The backend logs contain the most detailed information about API key validation:

```bash
# View live logs from all services
docker-compose logs -f

# View only backend logs
docker-compose logs -f homedash-backend

# View recent backend logs (last 20 lines)
docker-compose logs homedash-backend --tail=20
```

### Frontend Logs

Frontend logs appear in the browser's developer console:

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Try to validate an API key in the Settings page
4. Look for logs starting with "=== FRONTEND API KEY TEST ==="

## Understanding the Log Output

### Backend Log Format

When you test an API key, you'll see logs like this:

```
=== ANTHROPIC API KEY VALIDATION ===
⏰ Timestamp: 2025-09-30T20:06:25.995Z
🔑 API Key provided: YES
🔑 API Key length: 50 characters
🔑 API Key format: CORRECT (sk-ant-*)
🚀 Starting Anthropic API validation...
📡 Testing with Messages API endpoint
📤 Request details:
  - URL: https://api.anthropic.com/v1/messages
  - Method: POST
  - Headers: x-api-key, anthropic-version, Content-Type
  - Body: test message with claude-3-haiku-20240307
  - Timeout: 10 seconds
📥 Messages API response status: 401
📥 Messages API response status text: Unauthorized
❌ API key validation FAILED - 401 Unauthorized
=== END API KEY VALIDATION ===
```

### Key Information to Look For

#### 1. API Key Format Validation
```
🔑 API Key format: CORRECT (sk-ant-*)     # ✅ Good - proper format
🔑 API Key format: INCORRECT (should start with sk-ant-)  # ❌ Bad format
```

#### 2. Network Issues
```
🌐 DNS resolution failed - cannot reach api.anthropic.com
🔌 Connection refused or timed out - network/firewall issue
⏰ Request timed out after 10 seconds
```

#### 3. API Response Status
```
📥 Messages API response status: 401     # Invalid API key
📥 Messages API response status: 200     # Valid API key
📥 Messages API response status: 400     # Valid key, malformed request (still valid)
```

#### 4. Error Details
```
💥 API key validation ERROR occurred
🔍 Error details:
  - Type: TypeError
  - Name: TypeError
  - Code: ENOTFOUND
  - Message: fetch failed
```

## Common Issues and Solutions

### Issue 1: Invalid API Key Format
**Log shows:** `🔑 API Key format: INCORRECT (should start with sk-ant-)`

**Solution:** 
- Ensure your API key starts with `sk-ant-`
- Check for extra spaces or characters
- Get a new API key from Anthropic Console

### Issue 2: Network/DNS Issues
**Log shows:** `🌐 DNS resolution failed - cannot reach api.anthropic.com`

**Solutions:**
- Check your internet connection
- Verify DNS settings
- Check if you're behind a corporate firewall
- Try using a different network

### Issue 3: Connection Timeout
**Log shows:** `⏰ Request timed out after 10 seconds`

**Solutions:**
- Check network stability
- Try again (temporary network issue)
- Check if Anthropic API is experiencing issues

### Issue 4: Invalid API Key (401 Unauthorized)
**Log shows:** `❌ API key validation FAILED - 401 Unauthorized`

**Solutions:**
- Verify the API key is correct (no typos)
- Check if the API key has been revoked
- Generate a new API key from Anthropic Console
- Ensure you have sufficient credits/quota

### Issue 5: Firewall/Proxy Issues
**Log shows:** `🔌 Connection refused or timed out - network/firewall issue`

**Solutions:**
- Check firewall settings
- Configure proxy settings if needed
- Whitelist `api.anthropic.com` in firewall
- Contact your network administrator

## Testing the Debug Logging

### Method 1: Using the UI
1. Start the application: `docker-compose up -d`
2. Open http://localhost:3000
3. Go to Settings
4. Enable LLM Integration
5. Enter an API key and click "Test Key"
6. Check logs: `docker-compose logs homedash-backend --tail=20`

### Method 2: Using curl (Direct API Test)
```bash
# Test with invalid key format
curl -X POST http://localhost:3001/api/test-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"invalid-key"}'

# Test with properly formatted but fake key
curl -X POST http://localhost:3001/api/test-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-ant-fake-key-for-testing"}'

# Check logs after each test
docker-compose logs homedash-backend --tail=15
```

## Log Locations

### Development Mode
- **Backend logs:** `docker-compose logs homedash-backend`
- **Frontend logs:** Browser Developer Console

### Production Mode
- **Backend logs:** `docker-compose logs homedash-backend`
- **Container logs:** `docker logs homedash-backend`

## Troubleshooting Tips

1. **Always check backend logs first** - they contain the most detailed information
2. **Look for the log sections** - they start with `=== ANTHROPIC API KEY VALIDATION ===`
3. **Check the API key format** - must start with `sk-ant-`
4. **Verify network connectivity** - DNS and firewall issues are common
5. **Test with curl** - helps isolate frontend vs backend issues
6. **Check Anthropic API status** - https://status.anthropic.com/

## Getting Help

When reporting API key issues, please include:

1. The complete log output from `=== ANTHROPIC API KEY VALIDATION ===` to `=== END API KEY VALIDATION ===`
2. Your network setup (corporate firewall, proxy, etc.)
3. The first few characters of your API key (e.g., "sk-ant-api03-...")
4. Whether the issue is consistent or intermittent

This debug logging should help you quickly identify and resolve any Anthropic API key validation issues!
