package ratelimit

import (
	"context"
	"sync"
	"time"
)

// CleanupInterval is how often the cleanup goroutine runs.
const CleanupInterval = 5 * time.Minute

const (
	// MaxRequests is the maximum number of AI requests per window per IP.
	MaxRequests = 10
	// Window is the sliding window duration.
	Window = 2 * time.Minute
)

// Limiter enforces per-IP rate limiting using a sliding window counter.
type Limiter struct {
	mu      sync.Mutex
	entries map[string]*entry
}

type entry struct {
	timestamps []time.Time
}

// New creates a new rate limiter.
func New() *Limiter {
	return &Limiter{
		entries: make(map[string]*entry),
	}
}

// StartCleanup launches a background goroutine that periodically removes
// entries whose newest timestamp is older than the rate limit window.
// It stops when ctx is cancelled.
func (l *Limiter) StartCleanup(ctx context.Context) {
	go l.cleanupLoop(ctx, CleanupInterval)
}

func (l *Limiter) cleanupLoop(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			l.removeStale(now)
		}
	}
}

func (l *Limiter) removeStale(now time.Time) {
	cutoff := now.Add(-Window)

	l.mu.Lock()
	defer l.mu.Unlock()

	for ip, e := range l.entries {
		if len(e.timestamps) == 0 || !e.timestamps[len(e.timestamps)-1].After(cutoff) {
			delete(l.entries, ip)
		}
	}
}

// Allow checks whether a request from the given IP is allowed.
// Returns true if allowed, false if rate limited.
// When rejected, retryAfter is the number of seconds until the oldest
// request in the window expires and a slot opens.
func (l *Limiter) Allow(ip string) (allowed bool, retryAfter int) {
	return l.allowAt(ip, time.Now())
}

// allowAt is the testable core — accepts a timestamp for deterministic tests.
func (l *Limiter) allowAt(ip string, now time.Time) (bool, int) {
	l.mu.Lock()
	defer l.mu.Unlock()

	e, ok := l.entries[ip]
	if !ok {
		e = &entry{}
		l.entries[ip] = e
	}

	// Prune expired timestamps.
	cutoff := now.Add(-Window)
	valid := e.timestamps[:0]
	for _, ts := range e.timestamps {
		if ts.After(cutoff) {
			valid = append(valid, ts)
		}
	}
	e.timestamps = valid

	if len(e.timestamps) >= MaxRequests {
		// Calculate when the oldest request expires.
		oldest := e.timestamps[0]
		retry := int(oldest.Add(Window).Sub(now).Seconds()) + 1
		if retry < 1 {
			retry = 1
		}
		return false, retry
	}

	e.timestamps = append(e.timestamps, now)
	return true, 0
}
