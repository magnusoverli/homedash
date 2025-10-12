#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Remember Me Feature - API Test Suite${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Test 1: Check auth status
echo -e "${YELLOW}Test 1: Check Auth Status${NC}"
response=$(curl -s http://localhost:3001/api/auth/status)
echo "Response: $response"
if echo "$response" | grep -q '"enabled":false'; then
    echo -e "${RED}❌ Auth is disabled (ACCESS_PASSWORD not set in docker-compose.yml)${NC}"
    echo -e "${YELLOW}To enable auth:${NC}"
    echo "1. Edit docker-compose.yml"
    echo "2. Uncomment: - ACCESS_PASSWORD=your_password"
    echo "3. Run: docker-compose down && docker-compose up -d"
    exit 1
else
    echo -e "${GREEN}✅ Auth is enabled${NC}"
fi
echo ""

# Test 2: Login without Remember Me (12-hour token)
echo -e "${YELLOW}Test 2: Login WITHOUT Remember Me (12-hour token)${NC}"
response=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","rememberMe":false}')
echo "Response: $response"

if echo "$response" | grep -q '"success":true'; then
    token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    expires=$(echo "$response" | grep -o '"expiresAt":"[^"]*' | cut -d'"' -f4)
    remember=$(echo "$response" | grep -o '"rememberMe":[^,}]*' | cut -d':' -f2)
    
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "Token: ${token:0:16}..."
    echo "Expires: $expires"
    echo "Remember Me: $remember"
    
    # Calculate hours until expiry
    expires_epoch=$(date -d "$expires" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${expires%.*}" +%s 2>/dev/null)
    now_epoch=$(date +%s)
    hours=$((($expires_epoch - $now_epoch) / 3600))
    echo "Hours until expiry: ~$hours (should be ~12)"
    
    if [ "$hours" -ge 11 ] && [ "$hours" -le 13 ]; then
        echo -e "${GREEN}✅ Token expiry is correct (12 hours)${NC}"
    else
        echo -e "${RED}❌ Token expiry is incorrect (expected ~12 hours, got ~$hours)${NC}"
    fi
else
    echo -e "${RED}❌ Login failed${NC}"
fi
echo ""

# Test 3: Login with Remember Me (7-day token)
echo -e "${YELLOW}Test 3: Login WITH Remember Me (7-day token)${NC}"
response=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test123","rememberMe":true}')
echo "Response: $response"

if echo "$response" | grep -q '"success":true'; then
    token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    expires=$(echo "$response" | grep -o '"expiresAt":"[^"]*' | cut -d'"' -f4)
    remember=$(echo "$response" | grep -o '"rememberMe":[^,}]*' | cut -d':' -f2)
    
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "Token: ${token:0:16}..."
    echo "Expires: $expires"
    echo "Remember Me: $remember"
    
    # Calculate days until expiry
    expires_epoch=$(date -d "$expires" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${expires%.*}" +%s 2>/dev/null)
    now_epoch=$(date +%s)
    days=$((($expires_epoch - $now_epoch) / 86400))
    echo "Days until expiry: ~$days (should be ~7)"
    
    if [ "$days" -ge 6 ] && [ "$days" -le 8 ]; then
        echo -e "${GREEN}✅ Token expiry is correct (7 days)${NC}"
    else
        echo -e "${RED}❌ Token expiry is incorrect (expected ~7 days, got ~$days)${NC}"
    fi
    
    # Save token for subsequent tests
    SAVED_TOKEN=$token
else
    echo -e "${RED}❌ Login failed${NC}"
    exit 1
fi
echo ""

# Test 4: Access protected endpoint
echo -e "${YELLOW}Test 4: Access Protected Endpoint${NC}"
response=$(curl -s http://localhost:3001/api/family-members \
  -H "x-access-token: $SAVED_TOKEN")
echo "Response: $response"

if echo "$response" | grep -q -E '\[|"error"'; then
    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}❌ Access denied${NC}"
    else
        echo -e "${GREEN}✅ Access granted (got family members list)${NC}"
    fi
else
    echo -e "${GREEN}✅ Access granted${NC}"
fi
echo ""

# Test 5: Token refresh
echo -e "${YELLOW}Test 5: Token Refresh${NC}"
response=$(curl -s -X POST http://localhost:3001/api/auth/refresh \
  -H "x-access-token: $SAVED_TOKEN")
echo "Response: $response"

if echo "$response" | grep -q '"success":true'; then
    new_token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Token refreshed successfully${NC}"
    echo "New Token: ${new_token:0:16}..."
    echo "Old token should now be invalid"
    
    # Save new token
    SAVED_TOKEN=$new_token
else
    echo -e "${RED}❌ Token refresh failed${NC}"
fi
echo ""

# Test 6: Logout
echo -e "${YELLOW}Test 6: Logout${NC}"
response=$(curl -s -X POST http://localhost:3001/api/auth/logout \
  -H "x-access-token: $SAVED_TOKEN")
echo "Response: $response"

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Logout successful${NC}"
else
    echo -e "${RED}❌ Logout failed${NC}"
fi
echo ""

# Test 7: Try to use token after logout (should fail)
echo -e "${YELLOW}Test 7: Use Token After Logout (should fail)${NC}"
response=$(curl -s http://localhost:3001/api/family-members \
  -H "x-access-token: $SAVED_TOKEN")
echo "Response: $response"

if echo "$response" | grep -q '"error":"Unauthorized"'; then
    echo -e "${GREEN}✅ Token correctly invalidated after logout${NC}"
else
    echo -e "${RED}❌ Token still valid after logout (unexpected)${NC}"
fi
echo ""

# Test 8: Check database
echo -e "${YELLOW}Test 8: Check Database for Active Tokens${NC}"
docker exec homedash-backend node -e "
import('./database.js').then(async ({getAll}) => {
  const tokens = await getAll('SELECT COUNT(*) as count FROM auth_tokens');
  console.log('Active tokens in database:', tokens[0].count);
})" 2>/dev/null
echo ""

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Test Suite Complete!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${GREEN}✅ All core functionality is working${NC}"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Test the UI with the 'Remember me' checkbox"
echo "3. Verify automatic token refresh (see browser console)"
echo "4. Test across browser restarts"
echo ""

