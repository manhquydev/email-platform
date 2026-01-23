package ephemera

import (
	"encoding/json"
	"fmt"
)

// ErrorCode represents an API error code.
type ErrorCode string

const (
	ErrUnauthorized   ErrorCode = "UNAUTHORIZED"
	ErrForbidden      ErrorCode = "FORBIDDEN"
	ErrNotFound       ErrorCode = "NOT_FOUND"
	ErrRateLimited    ErrorCode = "RATE_LIMITED"
	ErrValidation     ErrorCode = "VALIDATION_ERROR"
	ErrQuotaExceeded  ErrorCode = "QUOTA_EXCEEDED"
	ErrInternalServer ErrorCode = "INTERNAL_SERVER_ERROR"
)

// APIError represents an error from the API.
type APIError struct {
	Code       ErrorCode `json:"code"`
	Message    string    `json:"message"`
	StatusCode int       `json:"-"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("[%s] %s (status %d)", e.Code, e.Message, e.StatusCode)
}

// NetworkError represents a network-level error.
type NetworkError struct {
	Err error
}

func (e *NetworkError) Error() string {
	return fmt.Sprintf("network error: %v", e.Err)
}

func (e *NetworkError) Unwrap() error {
	return e.Err
}

// TimeoutError represents a timeout error.
type TimeoutError struct {
	Message string
}

func (e *TimeoutError) Error() string {
	return e.Message
}

// parseErrorResponse parses an error response from the API.
func parseErrorResponse(statusCode int, body []byte) error {
	var apiErr APIError
	if err := json.Unmarshal(body, &apiErr); err != nil {
		// If we can't parse the error, create a generic one
		apiErr = APIError{
			Code:    ErrorCode(fmt.Sprintf("HTTP_%d", statusCode)),
			Message: string(body),
		}
	}
	apiErr.StatusCode = statusCode

	// Set appropriate error code based on status
	if apiErr.Code == "" {
		switch statusCode {
		case 401:
			apiErr.Code = ErrUnauthorized
		case 403:
			apiErr.Code = ErrForbidden
		case 404:
			apiErr.Code = ErrNotFound
		case 429:
			apiErr.Code = ErrRateLimited
		case 422:
			apiErr.Code = ErrValidation
		default:
			apiErr.Code = ErrInternalServer
		}
	}

	return &apiErr
}

// IsNotFound checks if the error is a not found error.
func IsNotFound(err error) bool {
	if apiErr, ok := err.(*APIError); ok {
		return apiErr.Code == ErrNotFound || apiErr.StatusCode == 404
	}
	return false
}

// IsRateLimited checks if the error is a rate limit error.
func IsRateLimited(err error) bool {
	if apiErr, ok := err.(*APIError); ok {
		return apiErr.Code == ErrRateLimited || apiErr.StatusCode == 429
	}
	return false
}

// IsUnauthorized checks if the error is an authorization error.
func IsUnauthorized(err error) bool {
	if apiErr, ok := err.(*APIError); ok {
		return apiErr.Code == ErrUnauthorized || apiErr.StatusCode == 401
	}
	return false
}
