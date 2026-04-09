package llm

import (
	"context"
	"strings"
	"testing"
)

// MockClient implements Client for testing.
type MockClient struct {
	chunks    []string
	err       error
	lastTurns []ConversationTurn
}

func (m *MockClient) StreamAnalysis(_ context.Context, _ string, turns []ConversationTurn, onChunk func(string)) error {
	m.lastTurns = turns
	for _, chunk := range m.chunks {
		onChunk(chunk)
	}
	return m.err
}

func TestMockClient_StreamsChunks(t *testing.T) {
	mock := &MockClient{
		chunks: []string{"Hello, ", "I see ", "your architecture."},
	}

	turns := []ConversationTurn{
		{Role: "user", Content: "Analyze my architecture"},
	}

	var result strings.Builder
	err := mock.StreamAnalysis(context.Background(), "system", turns, func(text string) {
		result.WriteString(text)
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.String() != "Hello, I see your architecture." {
		t.Errorf("unexpected result: %q", result.String())
	}
}

func TestMockClient_ReceivesConversationHistory(t *testing.T) {
	mock := &MockClient{
		chunks: []string{"response"},
	}

	turns := []ConversationTurn{
		{Role: "user", Content: "First question"},
		{Role: "assistant", Content: "First answer"},
		{Role: "user", Content: "Follow-up question"},
	}

	_ = mock.StreamAnalysis(context.Background(), "system", turns, func(_ string) {})

	if len(mock.lastTurns) != 3 {
		t.Errorf("expected 3 turns passed to client, got %d", len(mock.lastTurns))
	}
	if mock.lastTurns[2].Content != "Follow-up question" {
		t.Errorf("expected last turn to be follow-up, got %q", mock.lastTurns[2].Content)
	}
}

func TestMockClient_PropagatesError(t *testing.T) {
	mock := &MockClient{
		chunks: []string{"partial"},
		err:    context.DeadlineExceeded,
	}

	turns := []ConversationTurn{{Role: "user", Content: "test"}}
	err := mock.StreamAnalysis(context.Background(), "system", turns, func(_ string) {})

	if err != context.DeadlineExceeded {
		t.Errorf("expected DeadlineExceeded, got %v", err)
	}
}
