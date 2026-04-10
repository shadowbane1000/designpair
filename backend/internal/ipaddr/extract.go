package ipaddr

import (
	"net"
	"net/http"
	"strings"
)

// FromRequest returns the client IP from an HTTP request.
// It trusts only the rightmost IP in X-Forwarded-For (set by the immediate
// reverse proxy). Falls back to the direct connection address when no
// forwarded header is present (local development).
func FromRequest(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		// Rightmost entry is the one appended by our trusted proxy.
		ip := strings.TrimSpace(parts[len(parts)-1])
		if ip != "" {
			return ip
		}
	}

	// Fallback: direct connection address (strip port).
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		// RemoteAddr might not have a port (unlikely but handle it).
		return r.RemoteAddr
	}
	return host
}
