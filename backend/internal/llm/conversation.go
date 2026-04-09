package llm

// ConversationTurn represents a single turn in the conversation.
type ConversationTurn struct {
	Role    string // "user" or "assistant"
	Content string
}

// ConversationManager maintains conversation history with sliding window.
type ConversationManager struct {
	turns          []ConversationTurn
	maxTokenBudget int
}

// NewConversationManager creates a manager with the given token budget.
func NewConversationManager(maxTokenBudget int) *ConversationManager {
	return &ConversationManager{
		turns:          nil,
		maxTokenBudget: maxTokenBudget,
	}
}

// AddUserTurn appends a user message.
func (cm *ConversationManager) AddUserTurn(content string) {
	cm.turns = append(cm.turns, ConversationTurn{Role: "user", Content: content})
}

// AddAssistantTurn appends an assistant message.
func (cm *ConversationManager) AddAssistantTurn(content string) {
	cm.turns = append(cm.turns, ConversationTurn{Role: "assistant", Content: content})
}

// GetTurns returns the conversation history trimmed to fit within the token budget.
// Drops oldest turn pairs (user+assistant) when over budget.
func (cm *ConversationManager) GetTurns() []ConversationTurn {
	turns := cm.turns
	for estimateTokens(turns) > cm.maxTokenBudget && len(turns) > 2 {
		// Drop oldest pair (user + assistant)
		if len(turns) >= 2 && turns[0].Role == "user" && turns[1].Role == "assistant" {
			turns = turns[2:]
		} else {
			// If first isn't a clean pair, drop one
			turns = turns[1:]
		}
	}
	return turns
}

// estimateTokens gives a rough token count (~4 chars per token for English).
func estimateTokens(turns []ConversationTurn) int {
	total := 0
	for _, t := range turns {
		total += len(t.Content) / 4
	}
	return total
}
