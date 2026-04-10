package llm

import (
	"context"
	"fmt"
	"strings"
)

// ConversationTurn represents a single turn in the conversation.
type ConversationTurn struct {
	Role    string // "user" or "assistant"
	Content string
}

// SummarizeResult holds the output of a summarization call.
type SummarizeResult struct {
	Summary              string
	OriginalTurnCount    int
	RetainedTurnCount    int
	SummaryTokenEstimate int
}

// Summarizer generates a compact summary of conversation turns.
type Summarizer interface {
	Summarize(ctx context.Context, turns []ConversationTurn) (string, error)
}

// ConversationManager maintains conversation history with intelligent summarization.
type ConversationManager struct {
	turns          []ConversationTurn
	maxTokenBudget int
	turnCount      int
	maxTurns       int
	summarizer     Summarizer
	summarized     bool // whether any summarization has occurred
	// preservePairs is the number of recent turn pairs to keep when summarizing.
	preservePairs int
}

// NewConversationManager creates a manager with the given token budget and turn limit.
func NewConversationManager(maxTokenBudget, maxTurns int) *ConversationManager {
	return &ConversationManager{
		turns:          nil,
		maxTokenBudget: maxTokenBudget,
		maxTurns:       maxTurns,
		preservePairs:  4,
	}
}

// SetSummarizer configures the summarizer for intelligent context compression.
// If no summarizer is set, the manager falls back to dropping oldest turns.
func (cm *ConversationManager) SetSummarizer(s Summarizer) {
	cm.summarizer = s
}

// IsSummarized returns true if the conversation has been summarized at least once.
func (cm *ConversationManager) IsSummarized() bool {
	return cm.summarized
}

// AddUserTurn appends a user message.
func (cm *ConversationManager) AddUserTurn(content string) {
	cm.turns = append(cm.turns, ConversationTurn{Role: "user", Content: content})
}

// AddAssistantTurn appends an assistant message.
func (cm *ConversationManager) AddAssistantTurn(content string) {
	cm.turns = append(cm.turns, ConversationTurn{Role: "assistant", Content: content})
}

// SummarizeIfNeeded checks if the conversation exceeds the summarization threshold
// (75% of token budget) and if so, summarizes older turns.
func (cm *ConversationManager) SummarizeIfNeeded(ctx context.Context) (*SummarizeResult, error) {
	if cm.summarizer == nil {
		return nil, nil
	}

	threshold := cm.maxTokenBudget * 3 / 4
	if estimateTokens(cm.turns) <= threshold {
		return nil, nil
	}

	preserveCount := cm.preservePairs * 2
	if len(cm.turns) <= preserveCount {
		return nil, nil
	}

	oldTurns := cm.turns[:len(cm.turns)-preserveCount]
	recentTurns := cm.turns[len(cm.turns)-preserveCount:]

	summary, err := cm.summarizer.Summarize(ctx, oldTurns)
	if err != nil {
		return nil, fmt.Errorf("summarization failed: %w", err)
	}

	summaryTurn := ConversationTurn{
		Role:    "user",
		Content: "[Conversation Summary]\n" + summary,
	}

	newTurns := make([]ConversationTurn, 0, 1+len(recentTurns))
	newTurns = append(newTurns, summaryTurn)
	newTurns = append(newTurns, recentTurns...)
	cm.turns = newTurns
	cm.summarized = true

	result := &SummarizeResult{
		Summary:              summary,
		OriginalTurnCount:    len(oldTurns) + len(recentTurns),
		RetainedTurnCount:    1 + len(recentTurns),
		SummaryTokenEstimate: estimateTokens([]ConversationTurn{summaryTurn}),
	}

	return result, nil
}

// GetTurns returns the conversation history trimmed to fit within the token budget.
func (cm *ConversationManager) GetTurns() []ConversationTurn {
	turns := cm.turns
	for estimateTokens(turns) > cm.maxTokenBudget && len(turns) > 2 {
		if len(turns) >= 2 && turns[0].Role == "user" && turns[1].Role == "assistant" {
			turns = turns[2:]
		} else {
			turns = turns[1:]
		}
	}
	return turns
}

// Reset clears all conversation history and resets the turn counter.
func (cm *ConversationManager) Reset() {
	cm.turns = nil
	cm.turnCount = 0
	cm.summarized = false
}

// IncrementTurn records a completed round-trip exchange.
func (cm *ConversationManager) IncrementTurn() {
	cm.turnCount++
}

// TurnsRemaining returns how many turns are left before the limit.
func (cm *ConversationManager) TurnsRemaining() int {
	remaining := cm.maxTurns - cm.turnCount
	if remaining < 0 {
		return 0
	}
	return remaining
}

// TurnLimitReached returns true if the conversation has used all allowed turns.
func (cm *ConversationManager) TurnLimitReached() bool {
	return cm.turnCount >= cm.maxTurns
}

// estimateTokens gives a rough token count (~4 chars per token for English).
func estimateTokens(turns []ConversationTurn) int {
	total := 0
	for _, t := range turns {
		total += len(t.Content) / 4
	}
	return total
}

// SummarizationPrompt is the system prompt used when summarizing conversation turns.
const SummarizationPrompt = `You are summarizing a conversation between a user and an AI architecture collaborator about a software architecture diagram. Produce a concise summary that preserves:

1. Key architectural decisions made or discussed
2. Issues and concerns identified (single points of failure, scaling bottlenecks, etc.)
3. Diagram changes that were suggested, approved, or discarded
4. Important context the user provided about their system
5. The overall trajectory of the discussion

Be concise but complete. Use bullet points. Do not include pleasantries or filler. The summary will be used as context for continuing the conversation.`

// FormatTurnsForSummarization formats conversation turns into a single string for the summarizer.
func FormatTurnsForSummarization(turns []ConversationTurn) string {
	var b strings.Builder
	for _, t := range turns {
		role := "User"
		if t.Role == "assistant" {
			role = "Assistant"
		}
		fmt.Fprintf(&b, "**%s**: %s\n\n", role, t.Content)
	}
	return b.String()
}
