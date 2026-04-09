package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/shadowbane1000/designpair/internal/graph"
	"github.com/shadowbane1000/designpair/internal/llm"
)

// Handler manages WebSocket connections.
type Handler struct {
	llmClient llm.Client
}

// NewHandler creates a new WebSocket handler.
func NewHandler(llmClient llm.Client) *Handler {
	return &Handler{llmClient: llmClient}
}

// ServeHTTP upgrades the connection and handles messages.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // Accept all origins for development
	})
	if err != nil {
		log.Printf("WebSocket accept error: %v", err)
		return
	}
	defer func() { _ = conn.CloseNow() }()

	ctx := r.Context()
	log.Println("WebSocket client connected")

	for {
		var msg WSMessage
		err := wsjson.Read(ctx, conn, &msg)
		if err != nil {
			if websocket.CloseStatus(err) == websocket.StatusNormalClosure ||
				websocket.CloseStatus(err) == websocket.StatusGoingAway {
				log.Println("WebSocket client disconnected normally")
			} else {
				log.Printf("WebSocket read error: %v", err)
			}
			return
		}

		switch msg.Type {
		case "analyze_request":
			h.handleAnalyzeRequest(ctx, conn, msg)
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

func (h *Handler) handleAnalyzeRequest(ctx context.Context, conn *websocket.Conn, msg WSMessage) {
	var req AnalyzeRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(ctx, conn, msg.RequestID, "Invalid request format")
		return
	}

	// Analyze graph topology
	analysis := graph.Analyze(req.GraphState)

	// Build prompt
	userPrompt := graph.BuildPrompt(req.GraphState, analysis)

	// Stream AI response
	err := h.llmClient.StreamAnalysis(ctx, llm.SystemPrompt, userPrompt, func(text string) {
		chunk := WSMessage{
			Type:      "ai_chunk",
			RequestID: msg.RequestID,
		}
		payload, _ := json.Marshal(AIChunkPayload{
			RequestID: msg.RequestID,
			Delta:     text,
		})
		chunk.Payload = payload

		if writeErr := wsjson.Write(ctx, conn, chunk); writeErr != nil {
			log.Printf("WebSocket write error: %v", writeErr)
		}
	})

	if err != nil {
		sendError(ctx, conn, msg.RequestID, "AI analysis failed. Please try again.")
		return
	}

	// Send done signal
	done := WSMessage{
		Type:      "ai_done",
		RequestID: msg.RequestID,
	}
	donePayload, _ := json.Marshal(AIDonePayload{RequestID: msg.RequestID})
	done.Payload = donePayload

	if writeErr := wsjson.Write(ctx, conn, done); writeErr != nil {
		log.Printf("WebSocket write error: %v", writeErr)
	}
}

func sendError(ctx context.Context, conn *websocket.Conn, requestID, message string) {
	errMsg := WSMessage{
		Type:      "error",
		RequestID: requestID,
	}
	payload, _ := json.Marshal(ErrorPayload{
		RequestID: requestID,
		Message:   message,
	})
	errMsg.Payload = payload

	if err := wsjson.Write(ctx, conn, errMsg); err != nil {
		log.Printf("WebSocket error write failed: %v", err)
	}
}
