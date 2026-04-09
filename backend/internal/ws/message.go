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
	Text       string           `json:"text"`
	GraphState model.GraphState `json:"graphState"`
}

// Server → Client payloads

type AIChunkPayload struct {
	RequestID string `json:"requestId"`
	Delta     string `json:"delta"`
}

type AIDonePayload struct {
	RequestID string `json:"requestId"`
}

type ErrorPayload struct {
	RequestID string `json:"requestId,omitempty"`
	Message   string `json:"message"`
}
