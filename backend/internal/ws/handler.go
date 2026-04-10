package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
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
		case "auto_analyze_request":
			h.handleAutoAnalyze(ctx, conn, msg, conversation, clientIP)
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

	h.processAnalysisWithPending(ctx, conn, msg.RequestID, userText, req.GraphState, req.PendingSuggestions, conversation, clientIP)
}

func (h *Handler) handleAnalyzeRequestCompat(ctx context.Context, conn *websocket.Conn, msg WSMessage, conversation *llm.ConversationManager, clientIP string) {
	var req AnalyzeRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(ctx, conn, msg.RequestID, "Invalid request format")
		return
	}

	h.processAnalysisWithPending(ctx, conn, msg.RequestID, "Analyze my architecture", req.GraphState, nil, conversation, clientIP)
}

func (h *Handler) handleAutoAnalyze(ctx context.Context, conn *websocket.Conn, msg WSMessage, conversation *llm.ConversationManager, clientIP string) {
	var req AutoAnalyzePayload
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		sendError(ctx, conn, msg.RequestID, "Invalid request format")
		return
	}

	if !h.validate(ctx, conn, msg.RequestID, req.GraphState, conversation, clientIP) {
		return
	}

	analysis := graph.Analyze(req.GraphState)

	// Convert WS delta to graph package delta
	var graphDelta *graph.AutoAnalyzeDelta
	if req.Delta != nil {
		graphDelta = &graph.AutoAnalyzeDelta{}
		for _, n := range req.Delta.AddedNodes {
			graphDelta.AddedNodes = append(graphDelta.AddedNodes, graph.DeltaNode{Type: n.Type, Name: n.Name})
		}
		for _, n := range req.Delta.RemovedNodes {
			graphDelta.RemovedNodes = append(graphDelta.RemovedNodes, graph.DeltaNode{Type: n.Type, Name: n.Name})
		}
		for _, e := range req.Delta.AddedEdges {
			graphDelta.AddedEdges = append(graphDelta.AddedEdges, graph.DeltaEdge{Source: e.Source, Target: e.Target, Protocol: e.Protocol})
		}
		for _, e := range req.Delta.RemovedEdges {
			graphDelta.RemovedEdges = append(graphDelta.RemovedEdges, graph.DeltaEdge{Source: e.Source, Target: e.Target, Protocol: e.Protocol})
		}
		for _, m := range req.Delta.ModifiedNodes {
			graphDelta.ModifiedNodes = append(graphDelta.ModifiedNodes, graph.DeltaModify{Name: m.Name, Field: m.Field, OldValue: m.OldValue, NewValue: m.NewValue})
		}
		for _, m := range req.Delta.ModifiedEdges {
			graphDelta.ModifiedEdges = append(graphDelta.ModifiedEdges, graph.DeltaModify{Name: m.Name, Field: m.Field, OldValue: m.OldValue, NewValue: m.NewValue})
		}
	}

	userMessage := graph.BuildAutoAnalyzeUserMessage(req.GraphState, analysis, graphDelta)
	conversation.AddUserTurn(userMessage)
	turns := conversation.GetTurns()

	slog.Info("Starting auto-analysis", "requestId", msg.RequestID, "ip", clientIP)

	var allText strings.Builder

	// Auto-analyze uses StreamAnalysis (no tools) with the auto-analyze system prompt
	err := h.llmClient.StreamAnalysis(ctx, llm.AutoAnalyzeSystemPrompt, turns, func(text string) {
		allText.WriteString(text)
		sendChunk(ctx, conn, msg.RequestID, text)
	})

	if err != nil {
		slog.Error("Auto-analysis failed", "requestId", msg.RequestID, "error", err, "ip", clientIP)
		sendError(ctx, conn, msg.RequestID, "Auto-analysis failed. Please try again.")
		return
	}

	conversation.AddAssistantTurn(allText.String())
	conversation.IncrementTurn()

	slog.Info("Auto-analysis complete", "requestId", msg.RequestID, "textLen", allText.Len(), "ip", clientIP)

	donePayload := AIDonePayload{RequestID: msg.RequestID, IsAutoAnalysis: true}
	remaining := conversation.TurnsRemaining()
	if remaining <= 5 {
		donePayload.TurnsRemaining = &remaining
	}

	done := WSMessage{
		Type:      "ai_done",
		RequestID: msg.RequestID,
	}
	payload, _ := json.Marshal(donePayload)
	done.Payload = payload

	if writeErr := wsjson.Write(ctx, conn, done); writeErr != nil {
		slog.Error("WebSocket write error", "error", writeErr, "ip", clientIP)
	}
}

// validate runs all pre-AI validation gates in order.
func (h *Handler) validate(ctx context.Context, conn *websocket.Conn, requestID string, gs model.GraphState, conversation *llm.ConversationManager, clientIP string) bool {
	allowed, retryAfter := h.limiter.Allow(clientIP)
	if !allowed {
		logAbuse("rate_limited", clientIP, fmt.Sprintf("retry_after=%ds", retryAfter))
		sendValidationError(ctx, conn, requestID, "rate_limited",
			fmt.Sprintf("You're sending requests too quickly. Please wait %d seconds before trying again.", retryAfter),
			&retryAfter, nil)
		return false
	}

	if len(gs.Nodes) == 0 {
		logAbuse("no_diagram", clientIP, "")
		sendValidationError(ctx, conn, requestID, "no_diagram",
			"Please add some components to your diagram before asking for feedback. The AI needs an architecture to analyze.",
			nil, nil)
		return false
	}

	if len(gs.Nodes) > maxNodes {
		logAbuse("too_many_nodes", clientIP, fmt.Sprintf("count=%d", len(gs.Nodes)))
		sendValidationError(ctx, conn, requestID, "too_many_nodes",
			fmt.Sprintf("Your diagram has %d nodes, which exceeds the maximum of %d. Please simplify your architecture to get AI feedback.", len(gs.Nodes), maxNodes),
			nil, nil)
		return false
	}

	if conversation.TurnLimitReached() {
		logAbuse("turn_limit", clientIP, "")
		sendValidationError(ctx, conn, requestID, "turn_limit",
			"You've reached the conversation limit for this session. Refresh the page to start a new conversation.",
			nil, nil)
		return false
	}

	return true
}

func (h *Handler) processAnalysisWithPending(ctx context.Context, conn *websocket.Conn, requestID, userText string, gs model.GraphState, pending *PendingSuggestions, conversation *llm.ConversationManager, clientIP string) {
	if !h.validate(ctx, conn, requestID, gs, conversation, clientIP) {
		return
	}

	analysis := graph.Analyze(gs)

	// Convert WS pending suggestions to graph package format
	var graphPending *graph.PendingSuggestions
	if pending != nil {
		graphPending = &graph.PendingSuggestions{}
		for _, n := range pending.Additions.Nodes {
			graphPending.AddNodes = append(graphPending.AddNodes, graph.PendingNodeAdd{Type: n.Type, Name: n.Name})
		}
		for _, e := range pending.Additions.Edges {
			graphPending.AddEdges = append(graphPending.AddEdges, graph.PendingEdgeAdd{
				Source: e.Source, Target: e.Target, Protocol: e.Protocol, Direction: e.Direction,
			})
		}
		graphPending.DeleteNodes = pending.Deletions.NodeNames
		for _, e := range pending.Deletions.Edges {
			graphPending.DeleteEdges = append(graphPending.DeleteEdges, graph.PendingEdgeDelete{
				Source: e.Source, Target: e.Target, Protocol: e.Protocol, Direction: e.Direction,
			})
		}
		for _, m := range pending.Modifications.Nodes {
			graphPending.ModifyNodes = append(graphPending.ModifyNodes, graph.PendingNodeModify{
				Name: m.Name, NewName: m.NewName,
			})
		}
		for _, m := range pending.Modifications.Edges {
			graphPending.ModifyEdges = append(graphPending.ModifyEdges, graph.PendingEdgeModify{
				Source: m.Source, Target: m.Target, NewProtocol: m.NewProtocol, NewDirection: m.NewDirection,
			})
		}
	}

	graphPrompt := graph.BuildPromptWithPending(gs, analysis, graphPending)

	fullUserMessage := userText + "\n\n" + graphPrompt
	conversation.AddUserTurn(fullUserMessage)
	turns := conversation.GetTurns()

	// Build initial messages from conversation history
	messages := make([]anthropic.MessageParam, 0, len(turns))
	for _, turn := range turns {
		switch turn.Role {
		case "user":
			messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock(turn.Content)))
		case "assistant":
			messages = append(messages, anthropic.NewAssistantMessage(anthropic.NewTextBlock(turn.Content)))
		}
	}

	slog.Info("Starting AI request", "requestId", requestID, "userText", userText, "turns", len(messages), "ip", clientIP)

	// Multi-turn tool use loop
	var allText strings.Builder
	const maxToolTurns = 10

	for turn := 0; turn < maxToolTurns; turn++ {
		slog.Debug("Tool loop turn", "requestId", requestID, "turn", turn, "messages", len(messages))

		result, err := h.llmClient.StreamWithTools(ctx, llm.SystemPrompt, messages, func(text string) {
			allText.WriteString(text)
			sendChunk(ctx, conn, requestID, text)
		})

		if err != nil {
			slog.Error("StreamWithTools failed", "requestId", requestID, "error", err, "ip", clientIP)
			sendError(ctx, conn, requestID, "AI analysis failed. Please try again.")
			return
		}

		slog.Debug("AI response", "requestId", requestID, "stopReason", result.StopReason,
			"textLen", len(result.TextContent), "toolCalls", len(result.ToolCalls))

		for _, tc := range result.ToolCalls {
			slog.Info("Tool call", "requestId", requestID, "tool", tc.Name, "input", string(tc.Input))
		}

		if len(result.ToolCalls) == 0 || result.StopReason != "tool_use" {
			break
		}

		// Process tool calls: validate and send suggestions
		workingGS := cloneGraphState(gs)
		toolResults := make([]llm.ToolResult, 0, len(result.ToolCalls))
		for _, tc := range result.ToolCalls {
			if tc.Name == "list_node_types" {
				toolResults = append(toolResults, llm.ToolResult{
					ToolUseID: tc.ID,
					Content:   nodeTypesResponse(),
					IsError:   false,
				})
				continue
			}

			validationResult := validateToolCall(tc.Name, tc.Input, workingGS)
			slog.Info("Tool validation", "requestId", requestID, "tool", tc.Name, "result", validationResult)
			sendSuggestion(ctx, conn, requestID, tc.Name, tc.Input, validationResult)

			if tc.Name == "add_node" && validationResult == "success" {
				applyAddNodeToState(&workingGS, tc.Input)
			}

			toolResults = append(toolResults, llm.ToolResult{
				ToolUseID: tc.ID,
				Content:   validationResult,
				IsError:   strings.HasPrefix(validationResult, "Error:"),
			})
		}

		messages = append(messages, llm.BuildAssistantMessage(result.TextContent, result.ToolCalls))
		messages = append(messages, llm.BuildToolResultMessage(toolResults))
	}

	conversation.AddAssistantTurn(allText.String())
	conversation.IncrementTurn()

	slog.Info("Request complete", "requestId", requestID, "textLen", allText.Len(), "ip", clientIP)

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

func sendChunk(ctx context.Context, conn *websocket.Conn, requestID, text string) {
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
		slog.Error("WebSocket write error", "error", writeErr)
	}
}

func sendSuggestion(ctx context.Context, conn *websocket.Conn, requestID, tool string, params json.RawMessage, validationResult string) {
	result := "success"
	errMsg := ""
	if strings.HasPrefix(validationResult, "Error:") {
		result = "error"
		errMsg = validationResult
	}

	suggMsg := WSMessage{
		Type:      "suggestion",
		RequestID: requestID,
	}

	payload, _ := json.Marshal(SuggestionPayload{
		Tool:   tool,
		Params: params,
		Result: result,
		Error:  errMsg,
	})
	suggMsg.Payload = payload

	if writeErr := wsjson.Write(ctx, conn, suggMsg); writeErr != nil {
		slog.Error("WebSocket write error", "error", writeErr)
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

// --- Query Tools ---

func nodeTypesResponse() string {
	return `Available node types:

Compute:
- service: General-purpose service (supports replicas)
- apiGateway: API Gateway (supports replicas)
- loadBalancer: Load Balancer
- serverlessFunction: Serverless Function (auto-scaling)

Data:
- databaseSql: SQL Database (supports replicas)
- databaseNosql: NoSQL Database (supports replicas)
- cache: Cache (supports replicas)
- objectStorage: Object Storage (supports replicas)

Messaging:
- messageQueue: Message Queue (supports replicas)
- eventBus: Event Bus
- streamProcessor: Stream Processor (supports replicas)

Network:
- cdn: CDN
- dns: DNS
- firewall: Firewall

Clients:
- webClient: Web Client
- mobileClient: Mobile Client
- iotClient: IoT Client
- externalApi: External API`
}

// --- Tool Validation ---

func validateToolCall(tool string, input json.RawMessage, gs model.GraphState) string {
	switch tool {
	case "add_node":
		return validateAddNode(input, gs)
	case "delete_node":
		return validateDeleteNode(input, gs)
	case "modify_node":
		return validateModifyNode(input, gs)
	case "add_edge":
		return validateAddEdge(input, gs)
	case "delete_edge":
		return validateDeleteEdge(input, gs)
	case "modify_edge":
		return validateModifyEdge(input, gs)
	default:
		return fmt.Sprintf("Error: unknown tool %q", tool)
	}
}

func validateAddNode(input json.RawMessage, gs model.GraphState) string {
	var params struct {
		Type string `json:"type"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "Error: invalid parameters"
	}
	if params.Name == "" {
		return "Error: name is required"
	}
	if params.Type == "" {
		return "Error: type is required"
	}
	for _, n := range gs.Nodes {
		if n.Name == params.Name {
			return fmt.Sprintf("Error: node %q already exists", params.Name)
		}
	}
	return "success"
}

func validateDeleteNode(input json.RawMessage, gs model.GraphState) string {
	var params struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "Error: invalid parameters"
	}
	if params.Name == "" {
		return "Error: name is required"
	}
	found := false
	for _, n := range gs.Nodes {
		if n.Name == params.Name {
			found = true
			break
		}
	}
	if !found {
		return fmt.Sprintf("Error: node %q not found", params.Name)
	}
	return "success"
}

func validateModifyNode(input json.RawMessage, gs model.GraphState) string {
	var params struct {
		Name         string `json:"name"`
		NewName      string `json:"new_name"`
		ReplicaCount *int   `json:"replica_count"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "Error: invalid parameters"
	}
	if params.Name == "" {
		return "Error: name is required"
	}
	found := false
	for _, n := range gs.Nodes {
		if n.Name == params.Name {
			found = true
			break
		}
	}
	if !found {
		return fmt.Sprintf("Error: node %q not found", params.Name)
	}
	if params.NewName != "" {
		for _, n := range gs.Nodes {
			if n.Name == params.NewName && n.Name != params.Name {
				return fmt.Sprintf("Error: node name %q already exists", params.NewName)
			}
		}
	}
	if params.ReplicaCount != nil && *params.ReplicaCount < 1 {
		return "Error: replica_count must be >= 1"
	}
	return "success"
}

func validateAddEdge(input json.RawMessage, gs model.GraphState) string {
	var params struct {
		Source    string `json:"source"`
		Target   string `json:"target"`
		Protocol string `json:"protocol"`
		Direction string `json:"direction"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "Error: invalid parameters"
	}
	if params.Source == "" || params.Target == "" {
		return "Error: source and target are required"
	}
	sourceID := nodeIDByName(gs, params.Source)
	targetID := nodeIDByName(gs, params.Target)
	if sourceID == "" {
		return fmt.Sprintf("Error: source node %q not found", params.Source)
	}
	if targetID == "" {
		return fmt.Sprintf("Error: target node %q not found", params.Target)
	}
	direction := params.Direction
	if direction == "" {
		direction = "oneWay"
	}
	for _, e := range gs.Edges {
		if e.Source == sourceID && e.Target == targetID &&
			stringOrEmpty(e.Protocol) == params.Protocol &&
			directionOrDefault(e.Direction) == direction {
			return "Error: duplicate edge already exists"
		}
	}
	return "success"
}

func validateDeleteEdge(input json.RawMessage, gs model.GraphState) string {
	var params struct {
		Source    string `json:"source"`
		Target   string `json:"target"`
		Protocol string `json:"protocol"`
		Direction string `json:"direction"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "Error: invalid parameters"
	}
	if params.Source == "" || params.Target == "" {
		return "Error: source and target are required"
	}
	sourceID := nodeIDByName(gs, params.Source)
	targetID := nodeIDByName(gs, params.Target)
	if sourceID == "" || targetID == "" {
		return "Error: edge not found"
	}
	direction := params.Direction
	if direction == "" {
		direction = "oneWay"
	}
	found := false
	for _, e := range gs.Edges {
		if e.Source == sourceID && e.Target == targetID &&
			stringOrEmpty(e.Protocol) == params.Protocol &&
			directionOrDefault(e.Direction) == direction {
			found = true
			break
		}
	}
	if !found {
		return "Error: edge not found"
	}
	return "success"
}

func validateModifyEdge(input json.RawMessage, gs model.GraphState) string {
	var params struct {
		Source       string `json:"source"`
		Target       string `json:"target"`
		Protocol     string `json:"protocol"`
		Direction    string `json:"direction"`
		NewProtocol  string `json:"new_protocol"`
		NewDirection string `json:"new_direction"`
		NewSyncAsync string `json:"new_sync_async"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "Error: invalid parameters"
	}
	if params.Source == "" || params.Target == "" {
		return "Error: source and target are required"
	}
	sourceID := nodeIDByName(gs, params.Source)
	targetID := nodeIDByName(gs, params.Target)
	if sourceID == "" || targetID == "" {
		return "Error: edge not found"
	}
	direction := params.Direction
	if direction == "" {
		direction = "oneWay"
	}
	found := false
	for _, e := range gs.Edges {
		if e.Source == sourceID && e.Target == targetID &&
			stringOrEmpty(e.Protocol) == params.Protocol &&
			directionOrDefault(e.Direction) == direction {
			found = true
			break
		}
	}
	if !found {
		return "Error: edge not found"
	}
	newProtocol := params.Protocol
	if params.NewProtocol != "" {
		newProtocol = params.NewProtocol
	}
	newDirection := direction
	if params.NewDirection != "" {
		newDirection = params.NewDirection
	}
	for _, e := range gs.Edges {
		if e.Source == sourceID && e.Target == targetID &&
			stringOrEmpty(e.Protocol) == newProtocol &&
			directionOrDefault(e.Direction) == newDirection {
			if stringOrEmpty(e.Protocol) == params.Protocol && directionOrDefault(e.Direction) == direction {
				continue
			}
			return "Error: modification would create duplicate edge"
		}
	}
	return "success"
}

func nodeIDByName(gs model.GraphState, name string) string {
	for _, n := range gs.Nodes {
		if n.Name == name {
			return n.ID
		}
	}
	return ""
}

func stringOrEmpty(s string) string {
	return s
}

func directionOrDefault(d string) string {
	if d == "" {
		return "oneWay"
	}
	return d
}

func cloneGraphState(gs model.GraphState) model.GraphState {
	nodes := make([]model.GraphNode, len(gs.Nodes))
	copy(nodes, gs.Nodes)
	edges := make([]model.GraphEdge, len(gs.Edges))
	copy(edges, gs.Edges)
	return model.GraphState{Nodes: nodes, Edges: edges}
}

func applyAddNodeToState(gs *model.GraphState, input json.RawMessage) {
	var params struct {
		Type string `json:"type"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return
	}
	gs.Nodes = append(gs.Nodes, model.GraphNode{
		ID:   "pending-" + params.Name,
		Type: params.Type,
		Name: params.Name,
	})
}
