package llm

import (
	"context"
	"strings"
	"testing"
)

// MockClient implements Client for testing.
type MockClient struct {
	chunks []string
	err    error
}

func (m *MockClient) StreamAnalysis(_ context.Context, _, _ string, onChunk func(string)) error {
	for _, chunk := range m.chunks {
		onChunk(chunk)
	}
	return m.err
}

func TestMockClient_StreamsChunks(t *testing.T) {
	mock := &MockClient{
		chunks: []string{"Hello, ", "I see ", "your architecture."},
	}

	var result strings.Builder
	err := mock.StreamAnalysis(context.Background(), "system", "user", func(text string) {
		result.WriteString(text)
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.String() != "Hello, I see your architecture." {
		t.Errorf("unexpected result: %q", result.String())
	}
}

func TestMockClient_PropagatesError(t *testing.T) {
	mock := &MockClient{
		chunks: []string{"partial"},
		err:    context.DeadlineExceeded,
	}

	err := mock.StreamAnalysis(context.Background(), "system", "user", func(_ string) {})

	if err != context.DeadlineExceeded {
		t.Errorf("expected DeadlineExceeded, got %v", err)
	}
}
