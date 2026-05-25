#!/bin/bash

# Smoke test for onboarding flow on staging CloudFront URL
# Validates end-to-end persona creation and retrieval

set -e

echo "=== Personality Twin Staging Smoke Test ==="
echo ""

# Configuration
STAGING_URL="${STAGING_URL:-https://staging.twin.example.com}"
API_URL="${API_URL:-https://api-staging.twin.example.com}"
TEST_USER_ID="test-user-$(date +%s)"
TEST_EMAIL="test+${TEST_USER_ID}@example.com"

echo "Staging URL: $STAGING_URL"
echo "API URL: $API_URL"
echo ""

# Test 1: Check CloudFront is responding
echo "[1/6] Checking CloudFront availability..."
if curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL" | grep -q "200\|301\|302"; then
    echo "✓ CloudFront is responding"
else
    echo "✗ CloudFront is not responding"
    exit 1
fi
echo ""

# Test 2: Check onboarding page loads
echo "[2/6] Checking onboarding page..."
if curl -s "$STAGING_URL/onboarding" | grep -q "Start Creating Your Persona\|Onboarding"; then
    echo "✓ Onboarding page loads"
else
    echo "✗ Onboarding page failed to load"
    exit 1
fi
echo ""

# Test 3: Start onboarding session
echo "[3/6] Starting onboarding session..."
SESSION_RESPONSE=$(curl -s -X POST "$API_URL/onboarding/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d "{\"user_id\": \"$TEST_USER_ID\"}")

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"session_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
    echo "✗ Failed to start onboarding session"
    echo "Response: $SESSION_RESPONSE"
    exit 1
fi
echo "✓ Onboarding session started: $SESSION_ID"
echo ""

# Test 4: Submit onboarding step
echo "[4/6] Submitting onboarding step 1..."
STEP_RESPONSE=$(curl -s -X POST "$API_URL/onboarding/step/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d "{
    \"step\": 1,
    \"data\": {
      \"name\": \"Test Persona\",
      \"bio\": \"Test biography\",
      \"expertise\": \"Testing\"
    }
  }")

if echo "$STEP_RESPONSE" | grep -q "completed"; then
    echo "✓ Onboarding step submitted"
else
    echo "✗ Failed to submit onboarding step"
    echo "Response: $STEP_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Create persona
echo "[5/6] Creating persona..."
PERSONA_RESPONSE=$(curl -s -X POST "$API_URL/onboarding/create-persona" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d "{
    \"name\": \"Test Persona\",
    \"bio\": \"Test biography\",
    \"expertise\": \"Testing\",
    \"core_values\": [\"Quality\", \"Reliability\"],
    \"decision_style\": \"Data-driven\"
  }")

PERSONA_ID=$(echo "$PERSONA_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$PERSONA_ID" ]; then
    echo "✗ Failed to create persona"
    echo "Response: $PERSONA_RESPONSE"
    exit 1
fi
echo "✓ Persona created: $PERSONA_ID"
echo ""

# Test 6: Retrieve persona
echo "[6/6] Retrieving persona..."
RETRIEVE_RESPONSE=$(curl -s -X GET "$API_URL/onboarding/persona/$PERSONA_ID" \
  -H "Authorization: Bearer test-token")

if echo "$RETRIEVE_RESPONSE" | grep -q "Test Persona"; then
    echo "✓ Persona retrieved successfully"
else
    echo "✗ Failed to retrieve persona"
    echo "Response: $RETRIEVE_RESPONSE"
    exit 1
fi
echo ""

echo "=== All smoke tests passed! ==="
echo ""
echo "Summary:"
echo "  - CloudFront: ✓"
echo "  - Onboarding page: ✓"
echo "  - Session creation: ✓"
echo "  - Step submission: ✓"
echo "  - Persona creation: ✓"
echo "  - Persona retrieval: ✓"
echo ""
echo "Persona ID: $PERSONA_ID"
echo "Ready for chat testing at: $STAGING_URL/chat?persona_id=$PERSONA_ID"
