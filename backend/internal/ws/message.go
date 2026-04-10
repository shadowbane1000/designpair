package ws

import (
	"encoding/json"

	"github.com/shadowbane1000/designpair/internal/model"
)

// WSMessage is the envelope for all WebSocket messages.
type WSMessage struct {
	Type      string          `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	RequestID string          `json:"requestId,omitempty"`
}

// Client → Server payloads

type AnalyzeRequest struct {
	GraphState model.GraphState `json:"graphState"`
}

type ChatMessagePayload struct {
	Text               string              `json:"text"`
	GraphState         model.GraphState    `json:"graphState"`
	PendingSuggestions *PendingSuggestions  `json:"pendingSuggestions,omitempty"`
}

// PendingSuggestions represents the pending state sent from the frontend.
type PendingSuggestions struct {
	Additions     SuggestionAdditions     `json:"additions"`
	Deletions     SuggestionDeletions     `json:"deletions"`
	Modifications SuggestionModifications `json:"modifications"`
}

type SuggestionAdditions struct {
	Nodes []PendingNodeAdd `json:"nodes"`
	Edges []PendingEdgeAdd `json:"edges"`
}

type PendingNodeAdd struct {
	Type string `json:"type"`
	Name string `json:"name"`
}

type PendingEdgeAdd struct {
	Source    string `json:"source"`
	Target   string `json:"target"`
	Protocol string `json:"protocol,omitempty"`
	Direction string `json:"direction,omitempty"`
}

type SuggestionDeletions struct {
	NodeNames []string `json:"nodeNames"`
	Edges     []PendingEdgeDelete `json:"edges"`
}

type PendingEdgeDelete struct {
	Source    string `json:"source"`
	Target   string `json:"target"`
	Protocol string `json:"protocol,omitempty"`
	Direction string `json:"direction,omitempty"`
}

type SuggestionModifications struct {
	Nodes []PendingNodeModify `json:"nodes"`
	Edges []PendingEdgeModify `json:"edges"`
}

type PendingNodeModify struct {
	Name    string `json:"name"`
	NewName string `json:"newName,omitempty"`
}

type PendingEdgeModify struct {
	Source       string `json:"source"`
	Target       string `json:"target"`
	NewProtocol  string `json:"newProtocol,omitempty"`
	NewDirection string `json:"newDirection,omitempty"`
}

// Server → Client payloads

type AIChunkPayload struct {
	RequestID string `json:"requestId"`
	Delta     string `json:"delta"`
}

type AIDonePayload struct {
	RequestID      string `json:"requestId"`
	TurnsRemaining *int   `json:"turnsRemaining,omitempty"`
}

type ErrorPayload struct {
	RequestID string `json:"requestId,omitempty"`
	Message   string `json:"message"`
}

// ValidationErrorPayload is sent when a pre-AI validation check fails.
type ValidationErrorPayload struct {
	RequestID      string `json:"requestId"`
	Code           string `json:"code"`
	Message        string `json:"message"`
	RetryAfter     *int   `json:"retryAfter,omitempty"`
	TurnsRemaining *int   `json:"turnsRemaining,omitempty"`
}

type SuggestionPayload struct {
	Tool   string          `json:"tool"`
	Params json.RawMessage `json:"params"`
	Result string          `json:"result"` // "success" or "error"
	Error  string          `json:"error,omitempty"`
}
