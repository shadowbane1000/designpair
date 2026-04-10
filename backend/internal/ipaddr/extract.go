package ipaddr

import (
	"net"
	"net/http"
	"strings"
)

// FromRequest returns the client IP from an HTTP request.
// It checks X-Real-IP first (set correctly by the inner nginx from $remote_addr),
// then falls back to X-Forwarded-For. The double-proxy setup (outer nginx +
// inner nginx) causes XFF to contain Docker-internal IPs as the rightmost entry,
// so X-Real-IP is the reliable source in production.
func FromRequest(r *http.Request) string {
	if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
		return xri
	}

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
