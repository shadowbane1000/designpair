package llm

import (
	"context"
	"strings"
	"testing"
)

type mockSummarizer struct {
	summary   string
	err       error
	callCount int
	lastTurns []ConversationTurn
}

func (m *mockSummarizer) Summarize(_ context.Context, turns []ConversationTurn) (string, error) {
	m.callCount++
	m.lastTurns = turns
	return m.summary, m.err
}

func TestConversationManager_EmptyHistory(t *testing.T) {
	cm := NewConversationManager(120000, 20)
	turns := cm.GetTurns()
	if len(turns) != 0 {
		t.Errorf("expected 0 turns, got %d", len(turns))
	}
}

func TestConversationManager_SingleTurn(t *testing.T) {
	cm := NewConversationManager(120000, 20)
	cm.AddUserTurn("What about caching?")
	cm.AddAssistantTurn("Good question. A cache between...")
	turns := cm.GetTurns()
	if len(turns) != 2 {
		t.Errorf("expected 2 turns, got %d", len(turns))
	}
	if turns[0].Role != "user" {
		t.Errorf("expected first turn to be user, got %s", turns[0].Role)
	}
}

func TestConversationManager_MultiTurn(t *testing.T) {
	cm := NewConversationManager(120000, 20)
	cm.AddUserTurn("Analyze my architecture")
	cm.AddAssistantTurn("I see a service connected to a database...")
	cm.AddUserTurn("What about adding a cache?")
	cm.AddAssistantTurn("A cache would help with read performance...")
	cm.AddUserTurn("Should I add a load balancer?")
	cm.AddAssistantTurn("Yes, especially since...")
	turns := cm.GetTurns()
	if len(turns) != 6 {
		t.Errorf("expected 6 turns, got %d", len(turns))
	}
}

func TestConversationManager_SlidingWindowTruncation(t *testing.T) {
	cm := NewConversationManager(50, 20)
	cm.AddUserTurn("First question about the architecture design")
	cm.AddAssistantTurn("First answer about the architecture design with lots of detail")
	cm.AddUserTurn("Second question with more details")
	cm.AddAssistantTurn("Second answer with even more details about everything")
	cm.AddUserTurn("Third question")
	cm.AddAssistantTurn("Third answer")
	turns := cm.GetTurns()
	if len(turns) >= 6 {
		t.Errorf("expected truncation, but got all %d turns", len(turns))
	}
	last := turns[len(turns)-1]
	if last.Content != "Third answer" {
		t.Errorf("expected last turn to be 'Third answer', got %q", last.Content)
	}
}

func TestConversationManager_TurnPairIntegrity(t *testing.T) {
	cm := NewConversationManager(20, 20)
	cm.AddUserTurn(strings.Repeat("x", 100))
	cm.AddAssistantTurn(strings.Repeat("y", 100))
	cm.AddUserTurn("recent question")
	cm.AddAssistantTurn("recent answer")
	turns := cm.GetTurns()
	if len(turns) > 0 && turns[0].Role != "user" {
		t.Errorf("expected first turn after truncation to be user, got %s", turns[0].Role)
	}
}

func TestConversationManager_SummarizeIfNeeded_NoSummarizer(t *testing.T) {
	cm := NewConversationManager(100, 20)
	cm.AddUserTurn(strings.Repeat("x", 500))
	cm.AddAssistantTurn(strings.Repeat("y", 500))
	result, err := cm.SummarizeIfNeeded(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Error("expected nil result when no summarizer configured")
	}
}

func TestConversationManager_SummarizeIfNeeded_BelowThreshold(t *testing.T) {
	ms := &mockSummarizer{summary: "summary"}
	cm := NewConversationManager(120000, 20)
	cm.SetSummarizer(ms)
	cm.AddUserTurn("short message")
	cm.AddAssistantTurn("short response")
	result, err := cm.SummarizeIfNeeded(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Error("expected nil result when below threshold")
	}
	if ms.callCount != 0 {
		t.Error("summarizer should not have been called")
	}
}

func TestConversationManager_SummarizeIfNeeded_TriggersAboveThreshold(t *testing.T) {
	ms := &mockSummarizer{summary: "Key decisions: added cache, discussed scaling."}
	cm := NewConversationManager(200, 20)
	cm.SetSummarizer(ms)
	cm.preservePairs = 2
	for i := 0; i < 5; i++ {
		cm.AddUserTurn(strings.Repeat("u", 100))
		cm.AddAssistantTurn(strings.Repeat("a", 100))
	}
	result, err := cm.SummarizeIfNeeded(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected summarization to occur")
	}
	if ms.callCount != 1 {
		t.Errorf("expected 1 summarizer call, got %d", ms.callCount)
	}
	if len(ms.lastTurns) != 6 {
		t.Errorf("expected 6 old turns sent to summarizer, got %d", len(ms.lastTurns))
	}
	if result.OriginalTurnCount != 10 {
		t.Errorf("expected originalTurnCount=10, got %d", result.OriginalTurnCount)
	}
	if result.RetainedTurnCount != 5 {
		t.Errorf("expected retainedTurnCount=5, got %d", result.RetainedTurnCount)
	}
	turns := cm.GetTurns()
	if len(turns) != 5 {
		t.Errorf("expected 5 turns after summarization, got %d", len(turns))
	}
	if !strings.HasPrefix(turns[0].Content, "[Conversation Summary]") {
		t.Errorf("expected first turn to be summary, got %q", turns[0].Content[:50])
	}
	if turns[0].Role != "user" {
		t.Errorf("expected summary turn role to be user, got %s", turns[0].Role)
	}
}

func TestConversationManager_SummarizeIfNeeded_SetsIsSummarized(t *testing.T) {
	ms := &mockSummarizer{summary: "Summary"}
	cm := NewConversationManager(200, 20)
	cm.SetSummarizer(ms)
	cm.preservePairs = 2
	if cm.IsSummarized() {
		t.Error("should not be summarized initially")
	}
	for i := 0; i < 5; i++ {
		cm.AddUserTurn(strings.Repeat("x", 100))
		cm.AddAssistantTurn(strings.Repeat("y", 100))
	}
	_, err := cm.SummarizeIfNeeded(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if !cm.IsSummarized() {
		t.Error("should be summarized after SummarizeIfNeeded")
	}
}

func TestConversationManager_SummarizeIfNeeded_ErrorPropagates(t *testing.T) {
	ms := &mockSummarizer{err: context.DeadlineExceeded}
	cm := NewConversationManager(200, 20)
	cm.SetSummarizer(ms)
	cm.preservePairs = 2
	for i := 0; i < 5; i++ {
		cm.AddUserTurn(strings.Repeat("x", 100))
		cm.AddAssistantTurn(strings.Repeat("y", 100))
	}
	_, err := cm.SummarizeIfNeeded(context.Background())
	if err == nil {
		t.Fatal("expected error from failed summarization")
	}
	if !strings.Contains(err.Error(), "summarization failed") {
		t.Errorf("expected wrapped error, got: %v", err)
	}
}

func TestConversationManager_ResetClearsSummarized(t *testing.T) {
	ms := &mockSummarizer{summary: "Summary"}
	cm := NewConversationManager(200, 20)
	cm.SetSummarizer(ms)
	cm.preservePairs = 2
	for i := 0; i < 5; i++ {
		cm.AddUserTurn(strings.Repeat("x", 100))
		cm.AddAssistantTurn(strings.Repeat("y", 100))
	}
	_, _ = cm.SummarizeIfNeeded(context.Background())
	cm.Reset()
	if cm.IsSummarized() {
		t.Error("summarized should be false after Reset")
	}
	if len(cm.GetTurns()) != 0 {
		t.Error("turns should be empty after Reset")
	}
}

func TestFormatTurnsForSummarization(t *testing.T) {
	turns := []ConversationTurn{
		{Role: "user", Content: "What about caching?"},
		{Role: "assistant", Content: "A cache would help."},
	}
	result := FormatTurnsForSummarization(turns)
	if !strings.Contains(result, "**User**: What about caching?") {
		t.Error("expected user turn in formatted output")
	}
	if !strings.Contains(result, "**Assistant**: A cache would help.") {
		t.Error("expected assistant turn in formatted output")
	}
}
