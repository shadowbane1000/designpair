package ratelimit

import (
	"sync"
	"testing"
	"time"
)

func TestLimiter(t *testing.T) {
	t.Run("first request is allowed", func(t *testing.T) {
		l := New()
		allowed, _ := l.Allow("1.2.3.4")
		if !allowed {
			t.Error("first request should be allowed")
		}
	})

	t.Run("requests up to limit are allowed", func(t *testing.T) {
		l := New()
		for i := 0; i < MaxRequests; i++ {
			allowed, _ := l.Allow("1.2.3.4")
			if !allowed {
				t.Errorf("request %d should be allowed", i+1)
			}
		}
	})

	t.Run("request at limit+1 is rejected", func(t *testing.T) {
		l := New()
		now := time.Now()
		for i := 0; i < MaxRequests; i++ {
			allowed, _ := l.allowAt("1.2.3.4", now.Add(time.Duration(i)*time.Second))
			if !allowed {
				t.Fatalf("request %d should be allowed", i+1)
			}
		}

		allowed, retryAfter := l.allowAt("1.2.3.4", now.Add(time.Duration(MaxRequests)*time.Second))
		if allowed {
			t.Error("request at limit+1 should be rejected")
		}
		if retryAfter < 1 {
			t.Errorf("retryAfter should be >= 1, got %d", retryAfter)
		}
	})

	t.Run("expired timestamps free slots", func(t *testing.T) {
		l := New()
		now := time.Now()

		// Fill up the window.
		for i := 0; i < MaxRequests; i++ {
			l.allowAt("1.2.3.4", now)
		}

		// Should be rejected right after.
		allowed, _ := l.allowAt("1.2.3.4", now.Add(time.Second))
		if allowed {
			t.Error("should be rejected when window is full")
		}

		// After the window passes, should be allowed again.
		allowed, _ = l.allowAt("1.2.3.4", now.Add(Window+time.Second))
		if !allowed {
			t.Error("should be allowed after window expires")
		}
	})

	t.Run("different IPs tracked independently", func(t *testing.T) {
		l := New()
		for i := 0; i < MaxRequests; i++ {
			l.Allow("1.2.3.4")
		}

		// IP 1 is exhausted.
		allowed, _ := l.Allow("1.2.3.4")
		if allowed {
			t.Error("IP 1.2.3.4 should be rate limited")
		}

		// IP 2 should still be allowed.
		allowed, _ = l.Allow("5.6.7.8")
		if !allowed {
			t.Error("IP 5.6.7.8 should be allowed (independent)")
		}
	})

	t.Run("concurrent access is safe", func(t *testing.T) {
		l := New()
		var wg sync.WaitGroup
		for i := 0; i < 50; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				l.Allow("1.2.3.4")
			}()
		}
		wg.Wait()
		// No panic = success. Verify state is consistent.
		l.mu.Lock()
		count := len(l.entries["1.2.3.4"].timestamps)
		l.mu.Unlock()
		if count > MaxRequests {
			t.Errorf("concurrent access should not exceed limit, got %d timestamps", count)
		}
	})

	t.Run("retryAfter is correct", func(t *testing.T) {
		l := New()
		now := time.Now()

		// Send all requests at the same time.
		for i := 0; i < MaxRequests; i++ {
			l.allowAt("1.2.3.4", now)
		}

		// Check 30 seconds later — retryAfter should be ~91 seconds (120 - 30 + 1).
		_, retryAfter := l.allowAt("1.2.3.4", now.Add(30*time.Second))
		expected := int((Window - 30*time.Second).Seconds()) + 1
		if retryAfter != expected {
			t.Errorf("retryAfter = %d, want %d", retryAfter, expected)
		}
	})
}
