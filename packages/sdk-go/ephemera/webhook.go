package ephemera

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"time"
)

// WebhookVerifyResult is the result of webhook signature verification.
type WebhookVerifyResult struct {
	Valid bool
	Error string
}

// VerifyWebhookSignature verifies a webhook signature from Ephemera.
//
// Parameters:
//   - payload: Raw request body
//   - signature: Signature from X-Ephemera-Signature header
//   - secret: Webhook secret from dashboard
//   - timestamp: Timestamp from X-Ephemera-Timestamp header
//   - toleranceSeconds: Max age of webhook in seconds (default: 300)
func VerifyWebhookSignature(payload []byte, signature, secret string, timestamp int64, toleranceSeconds int64) WebhookVerifyResult {
	if toleranceSeconds == 0 {
		toleranceSeconds = 300
	}

	// Validate timestamp
	now := time.Now().Unix()
	if math.Abs(float64(now-timestamp)) > float64(toleranceSeconds) {
		return WebhookVerifyResult{
			Valid: false,
			Error: fmt.Sprintf("timestamp too old: %ds > %ds tolerance", int64(math.Abs(float64(now-timestamp))), toleranceSeconds),
		}
	}

	// Compute expected signature
	signaturePayload := fmt.Sprintf("%d.%s", timestamp, string(payload))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signaturePayload))
	expected := hex.EncodeToString(mac.Sum(nil))

	// Extract hash (remove 'sha256=' prefix if present)
	providedHash := signature
	if len(signature) > 7 && signature[:7] == "sha256=" {
		providedHash = signature[7:]
	}

	// Constant-time comparison
	if !hmac.Equal([]byte(providedHash), []byte(expected)) {
		return WebhookVerifyResult{
			Valid: false,
			Error: "invalid signature",
		}
	}

	return WebhookVerifyResult{Valid: true}
}

// SignWebhookPayload signs a payload for testing purposes.
func SignWebhookPayload(payload []byte, secret string, timestamp int64) string {
	signaturePayload := fmt.Sprintf("%d.%s", timestamp, string(payload))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signaturePayload))
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}
