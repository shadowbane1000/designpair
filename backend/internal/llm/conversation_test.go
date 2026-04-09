package llm

import (
	"strings"
	"testing"
)

func TestConversationManager_EmptyHistory(t *testing.T) {
	cm := NewConversationManager(120000)
	turns := cm.GetTurns()
	if len(turns) != 0 {
		t.Errorf("expected 0 turns, got %d", len(turns))
	}
}

func TestConversationManager_SingleTurn(t *testing.T) {
	cm := NewConversationManager(120000)
	cm.AddUserTurn("What about caching?")
	cm.AddAssistantTurn("Good question. A cache between...")

	turns := cm.GetTurns()
	if len(turns) != 2 {
		t.Errorf("expected 2 turns, got %d", len(turns))
	}
	if turns[0].Role != "user" {
		t.Errorf("expected first turn to be user, got %s", turns[0].Role)
	}
	if turns[1].Role != "assistant" {
		t.Errorf("expected second turn to be assistant, got %s", turns[1].Role)
	}
}

func TestConversationManager_MultiTurn(t *testing.T) {
	cm := NewConversationManager(120000)
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
	// Very small budget to force truncation
	cm := NewConversationManager(50) // ~200 chars budget

	cm.AddUserTurn("First question about the architecture design")
	cm.AddAssistantTurn("First answer about the architecture design with lots of detail")
	cm.AddUserTurn("Second question with more details")
	cm.AddAssistantTurn("Second answer with even more details about everything")
	cm.AddUserTurn("Third question")
	cm.AddAssistantTurn("Third answer")

	turns := cm.GetTurns()

	// Should have dropped oldest pairs
	if len(turns) >= 6 {
		t.Errorf("expected truncation, but got all %d turns", len(turns))
	}

	// Most recent turn should still be present
	last := turns[len(turns)-1]
	if last.Content != "Third answer" {
		t.Errorf("expected last turn to be 'Third answer', got %q", last.Content)
	}
}

func TestConversationManager_TurnPairIntegrity(t *testing.T) {
	cm := NewConversationManager(20) // Very tight budget

	cm.AddUserTurn(strings.Repeat("x", 100))
	cm.AddAssistantTurn(strings.Repeat("y", 100))
	cm.AddUserTurn("recent question")
	cm.AddAssistantTurn("recent answer")

	turns := cm.GetTurns()

	// After truncation, first turn should be "user" (pairs maintained)
	if len(turns) > 0 && turns[0].Role != "user" {
		t.Errorf("expected first turn after truncation to be user, got %s", turns[0].Role)
	}
}
