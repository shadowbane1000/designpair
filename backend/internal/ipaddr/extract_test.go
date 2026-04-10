package ipaddr

import (
	"net/http"
	"testing"
)

func TestFromRequest(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		xRealIP    string
		xff        string
		want       string
	}{
		{
			name:       "no header uses RemoteAddr with port",
			remoteAddr: "192.168.1.100:54321",
			want:       "192.168.1.100",
		},
		{
			name:       "no header uses RemoteAddr without port",
			remoteAddr: "192.168.1.100",
			want:       "192.168.1.100",
		},
		{
			name:       "single XFF entry",
			remoteAddr: "127.0.0.1:8080",
			xff:        "203.0.113.50",
			want:       "203.0.113.50",
		},
		{
			name:       "multiple XFF entries uses rightmost",
			remoteAddr: "127.0.0.1:8080",
			xff:        "10.0.0.1, 172.16.0.1, 203.0.113.50",
			want:       "203.0.113.50",
		},
		{
			name:       "XFF with extra whitespace",
			remoteAddr: "127.0.0.1:8080",
			xff:        "10.0.0.1 ,  203.0.113.50  ",
			want:       "203.0.113.50",
		},
		{
			name:       "IPv6 RemoteAddr with port",
			remoteAddr: "[::1]:8080",
			want:       "::1",
		},
		{
			name:       "IPv6 in XFF",
			remoteAddr: "127.0.0.1:8080",
			xff:        "2001:db8::1",
			want:       "2001:db8::1",
		},
		{
			name:       "X-Real-IP takes priority over XFF",
			remoteAddr: "127.0.0.1:8080",
			xRealIP:    "203.0.113.99",
			xff:        "10.0.0.1, 172.16.0.1",
			want:       "203.0.113.99",
		},
		{
			name:       "X-Real-IP alone",
			remoteAddr: "127.0.0.1:8080",
			xRealIP:    "203.0.113.99",
			want:       "203.0.113.99",
		},
		{
			name:       "empty X-Real-IP falls back to XFF",
			remoteAddr: "127.0.0.1:8080",
			xRealIP:    "",
			xff:        "203.0.113.50",
			want:       "203.0.113.50",
		},
		{
			name:       "whitespace-only X-Real-IP falls back to XFF",
			remoteAddr: "127.0.0.1:8080",
			xRealIP:    "  ",
			xff:        "203.0.113.50",
			want:       "203.0.113.50",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &http.Request{
				RemoteAddr: tt.remoteAddr,
				Header:     http.Header{},
			}
			if tt.xRealIP != "" {
				r.Header.Set("X-Real-IP", tt.xRealIP)
			}
			if tt.xff != "" {
				r.Header.Set("X-Forwarded-For", tt.xff)
			}

			got := FromRequest(r)
			if got != tt.want {
				t.Errorf("FromRequest() = %q, want %q", got, tt.want)
			}
		})
	}
}
