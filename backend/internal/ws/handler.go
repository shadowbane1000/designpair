package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/shadowbane1000/designpair/internal/graph"
	"github.com/shadowbane1000/designpair/internal/llm"
	"github.com/shadowbane1000/designpair/internal/model"
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
		InsecureSkipVerify: true,
	})
	if err != nil {
		log.Printf("WebSocket accept error: %v", err)
		return
	}
	defer func() { _ = conn.CloseNow() }()

	ctx := r.Context()
	log.Println("WebSocket client connected")

	conversation := llm.NewConversationManager(120000)

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
		case "chat_message":
			h.handleChatMessage(ctx, conn, msg, conversation)
		case "analyze_request":
			h.handleAnalyzeRequestCompat(ctx, conn, msg, conversation)
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

func (h *Handler) handleChatMessage(ctx context.Context, conn *websocket.Conn, msg WSMessage, conversation *llm.ConversationManager) {
	var req ChatMessagePayload
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(ctx, conn, msg.RequestID, "Invalid request format")
		return
	}

	userText := strings.TrimSpace(req.Text)
	if userText == "" {
		userText = "Analyze my architecture"
	}

	h.processAnalysis(ctx, conn, msg.RequestID, userText, req.GraphState, conversation)
}

func (h *Handler) handleAnalyzeRequestCompat(ctx context.Context, conn *websocket.Conn, msg WSMessage, conversation *llm.ConversationManager) {
	var req AnalyzeRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(ctx, conn, msg.RequestID, "Invalid request format")
		return
	}

	h.processAnalysis(ctx, conn, msg.RequestID, "Analyze my architecture", req.GraphState, conversation)
}

func (h *Handler) processAnalysis(ctx context.Context, conn *websocket.Conn, requestID, userText string, gs model.GraphState, conversation *llm.ConversationManager) {
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
			log.Printf("WebSocket write error: %v", writeErr)
		}
	})

	if err != nil {
		sendError(ctx, conn, requestID, "AI analysis failed. Please try again.")
		return
	}

	// Add assistant turn to conversation history
	conversation.AddAssistantTurn(assistantResponse.String())

	// Send done signal
	done := WSMessage{
		Type:      "ai_done",
		RequestID: requestID,
	}
	donePayload, _ := json.Marshal(AIDonePayload{RequestID: requestID})
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
