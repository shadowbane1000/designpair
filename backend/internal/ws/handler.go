package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/shadowbane1000/designpair/internal/graph"
	"github.com/shadowbane1000/designpair/internal/ipaddr"
	"github.com/shadowbane1000/designpair/internal/llm"
	"github.com/shadowbane1000/designpair/internal/model"
	"github.com/shadowbane1000/designpair/internal/ratelimit"
)

const maxNodes = 50

// Handler manages WebSocket connections.
type Handler struct {
	llmClient llm.Client
	limiter   *ratelimit.Limiter
}

// NewHandler creates a new WebSocket handler.
func NewHandler(llmClient llm.Client, limiter *ratelimit.Limiter) *Handler {
	return &Handler{llmClient: llmClient, limiter: limiter}
}

// ServeHTTP upgrades the connection and handles messages.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		slog.Error("WebSocket accept error", "error", err)
		return
	}
	defer func() { _ = conn.CloseNow() }()

	clientIP := ipaddr.FromRequest(r)
	ctx := r.Context()
	slog.Info("WebSocket client connected", "ip", clientIP)

	conversation := llm.NewConversationManager(120000, 20)

	for {
		var msg WSMessage
		err := wsjson.Read(ctx, conn, &msg)
		if err != nil {
			if websocket.CloseStatus(err) == websocket.StatusNormalClosure ||
				websocket.CloseStatus(err) == websocket.StatusGoingAway {
				slog.Info("WebSocket client disconnected normally", "ip", clientIP)
			} else {
				slog.Error("WebSocket read error", "error", err, "ip", clientIP)
			}
			return
		}

		switch msg.Type {
		case "chat_message":
			h.handleChatMessage(ctx, conn, msg, conversation, clientIP)
		case "analyze_request":
			h.handleAnalyzeRequestCompat(ctx, conn, msg, conversation, clientIP)
		default:
			slog.Warn("Unknown message type", "type", msg.Type, "ip", clientIP)
		}
	}
}

func (h *Handler) handleChatMessage(ctx context.Context, conn *websocket.Conn, msg WSMessage, conversation *llm.ConversationManager, clientIP string) {
	var req ChatMessagePayload
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(ctx, conn, msg.RequestID, "Invalid request format")
		return
	}

	userText := strings.TrimSpace(req.Text)
	if userText == "" {
		userText = "Analyze my architecture"
	}

	h.processAnalysis(ctx, conn, msg.RequestID, userText, req.GraphState, conversation, clientIP)
}

func (h *Handler) handleAnalyzeRequestCompat(ctx context.Context, conn *websocket.Conn, msg WSMessage, conversation *llm.ConversationManager, clientIP string) {
	var req AnalyzeRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(ctx, conn, msg.RequestID, "Invalid request format")
		return
	}

	h.processAnalysis(ctx, conn, msg.RequestID, "Analyze my architecture", req.GraphState, conversation, clientIP)
}

// validate runs all pre-AI validation gates in order.
// Returns true if the request should proceed, false if it was rejected.
func (h *Handler) validate(ctx context.Context, conn *websocket.Conn, requestID string, gs model.GraphState, conversation *llm.ConversationManager, clientIP string) bool {
	// Gate 1: Rate limit
	allowed, retryAfter := h.limiter.Allow(clientIP)
	if !allowed {
		logAbuse("rate_limited", clientIP, fmt.Sprintf("retry_after=%ds", retryAfter))
		sendValidationError(ctx, conn, requestID, "rate_limited",
			fmt.Sprintf("You're sending requests too quickly. Please wait %d seconds before trying again.", retryAfter),
			&retryAfter, nil)
		return false
	}

	// Gate 2: Diagram presence
	if len(gs.Nodes) == 0 {
		logAbuse("no_diagram", clientIP, "")
		sendValidationError(ctx, conn, requestID, "no_diagram",
			"Please add some components to your diagram before asking for feedback. The AI needs an architecture to analyze.",
			nil, nil)
		return false
	}

	// Gate 3: Node count
	if len(gs.Nodes) > maxNodes {
		logAbuse("too_many_nodes", clientIP, fmt.Sprintf("count=%d", len(gs.Nodes)))
		sendValidationError(ctx, conn, requestID, "too_many_nodes",
			fmt.Sprintf("Your diagram has %d nodes, which exceeds the maximum of %d. Please simplify your architecture to get AI feedback.", len(gs.Nodes), maxNodes),
			nil, nil)
		return false
	}

	// Gate 4: Turn limit
	if conversation.TurnLimitReached() {
		logAbuse("turn_limit", clientIP, "")
		sendValidationError(ctx, conn, requestID, "turn_limit",
			"You've reached the conversation limit for this session. Refresh the page to start a new conversation.",
			nil, nil)
		return false
	}

	return true
}

func (h *Handler) processAnalysis(ctx context.Context, conn *websocket.Conn, requestID, userText string, gs model.GraphState, conversation *llm.ConversationManager, clientIP string) {
	if !h.validate(ctx, conn, requestID, gs, conversation, clientIP) {
		return
	}

	analysis := graph.Analyze(gs)
	graphPrompt := graph.BuildPrompt(gs, analysis)

	// Build the user message: user's text + graph context
	fullUserMessage := userText + "\n\n" + graphPrompt

	// Add user turn to conversation
	conversation.AddUserTurn(fullUserMessage)

	// Get trimmed conversation history
	turns := conversation.GetTurns()

	// Stream AI response, collecting the full text
	var assistantResponse strings.Builder

	err := h.llmClient.StreamAnalysis(ctx, llm.SystemPrompt, turns, func(text string) {
		assistantResponse.WriteString(text)

		chunk := WSMessage{
			Type:      "ai_chunk",
			RequestID: requestID,
		}
		payload, _ := json.Marshal(AIChunkPayload{
			RequestID: requestID,
			Delta:     text,
		})
		chunk.Payload = payload

		if writeErr := wsjson.Write(ctx, conn, chunk); writeErr != nil {
			slog.Error("WebSocket write error", "error", writeErr, "ip", clientIP)
		}
	})

	if err != nil {
		sendError(ctx, conn, requestID, "AI analysis failed. Please try again.")
		return
	}

	// Add assistant turn to conversation history
	conversation.AddAssistantTurn(assistantResponse.String())

	// Increment turn count (one turn = user message + AI response)
	conversation.IncrementTurn()

	// Build done payload, include turnsRemaining if approaching limit
	donePayload := AIDonePayload{RequestID: requestID}
	remaining := conversation.TurnsRemaining()
	if remaining <= 5 {
		donePayload.TurnsRemaining = &remaining
	}

	done := WSMessage{
		Type:      "ai_done",
		RequestID: requestID,
	}
	payload, _ := json.Marshal(donePayload)
	done.Payload = payload

	if writeErr := wsjson.Write(ctx, conn, done); writeErr != nil {
		slog.Error("WebSocket write error", "error", writeErr, "ip", clientIP)
	}
}

func sendValidationError(ctx context.Context, conn *websocket.Conn, requestID, code, message string, retryAfter *int, turnsRemaining *int) {
	msg := WSMessage{
		Type:      "validation_error",
		RequestID: requestID,
	}
	payload, _ := json.Marshal(ValidationErrorPayload{
		RequestID:      requestID,
		Code:           code,
		Message:        message,
		RetryAfter:     retryAfter,
		TurnsRemaining: turnsRemaining,
	})
	msg.Payload = payload

	if err := wsjson.Write(ctx, conn, msg); err != nil {
		slog.Error("WebSocket validation error write failed", "error", err)
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
		slog.Error("WebSocket error write failed", "error", err)
	}
}

func logAbuse(event, ip, detail string) {
	slog.Warn("abuse event", "event", event, "ip", ip, "detail", detail)
}
