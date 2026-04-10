package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/shadowbane1000/designpair/internal/llm"
	"github.com/shadowbane1000/designpair/internal/model"
	"github.com/shadowbane1000/designpair/internal/ratelimit"
)

type mockLLMClient struct {
	chunks     []string
	err        error
	toolCalls  []llm.ToolCall
	stopReason string
}

func (m *mockLLMClient) StreamAnalysis(_ context.Context, _ string, _ []llm.ConversationTurn, onChunk func(string)) error {
	for _, chunk := range m.chunks {
		onChunk(chunk)
	}
	return m.err
}

func (m *mockLLMClient) StreamWithTools(_ context.Context, _ string, _ []anthropic.MessageParam, onChunk func(string)) (*llm.StreamResult, error) {
	text := ""
	for _, chunk := range m.chunks {
		text += chunk
		onChunk(chunk)
	}
	stop := m.stopReason
	if stop == "" {
		stop = "end_turn"
	}
	return &llm.StreamResult{
		TextContent: text,
		ToolCalls:   m.toolCalls,
		StopReason:  stop,
	}, m.err
}

func TestHandler_AnalyzeRequest(t *testing.T) {
	mock := &mockLLMClient{
		chunks: []string{"Looking at ", "your architecture..."},
	}
	handler := NewHandler(mock, ratelimit.New())

	server := httptest.NewServer(handler)
	defer server.Close()

	wsURL := "ws" + server.URL[len("http"):]
	ctx := context.Background()

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	// Send analyze_request with a node (diagram required)
	graphPayload, _ := json.Marshal(AnalyzeRequest{
		GraphState: model.GraphState{
			Nodes: []model.GraphNode{
				{ID: "n1", Type: "service", Name: "API"},
			},
		},
	})

	req := WSMessage{
		Type:      "analyze_request",
		Payload:   graphPayload,
		RequestID: "test-req-1",
	}
	if err := wsjson.Write(ctx, conn, req); err != nil {
		t.Fatalf("write error: %v", err)
	}

	// Read ai_chunk messages
	var chunks []string
	for {
		var msg WSMessage
		if err := wsjson.Read(ctx, conn, &msg); err != nil {
			t.Fatalf("read error: %v", err)
		}

		if msg.Type == "ai_chunk" {
			var chunk AIChunkPayload
			if err := json.Unmarshal(msg.Payload, &chunk); err != nil {
				t.Fatalf("unmarshal chunk error: %v", err)
			}
			chunks = append(chunks, chunk.Delta)
			if chunk.RequestID != "test-req-1" {
				t.Errorf("expected requestId test-req-1, got %s", chunk.RequestID)
			}
		} else if msg.Type == "ai_done" {
			break
		} else if msg.Type == "error" {
			t.Fatalf("unexpected error message: %s", string(msg.Payload))
		}
	}

	if len(chunks) != 2 {
		t.Errorf("expected 2 chunks, got %d", len(chunks))
	}

	conn.Close(websocket.StatusNormalClosure, "done")
}

func TestHandler_EmptyGraphReturnsValidationError(t *testing.T) {
	mock := &mockLLMClient{
		chunks: []string{"Should not reach here"},
	}
	handler := NewHandler(mock, ratelimit.New())

	server := httptest.NewServer(handler)
	defer server.Close()

	wsURL := "ws" + server.URL[len("http"):]
	ctx := context.Background()

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	// Send empty graph
	graphPayload, _ := json.Marshal(AnalyzeRequest{
		GraphState: model.GraphState{},
	})
	req := WSMessage{
		Type:      "analyze_request",
		Payload:   graphPayload,
		RequestID: "test-req-2",
	}
	if err := wsjson.Write(ctx, conn, req); err != nil {
		t.Fatalf("write error: %v", err)
	}

	// Should get validation_error with code "no_diagram"
	var msg WSMessage
	if err := wsjson.Read(ctx, conn, &msg); err != nil {
		t.Fatalf("read error: %v", err)
	}
	if msg.Type != "validation_error" {
		t.Fatalf("expected validation_error, got %s", msg.Type)
	}

	var payload ValidationErrorPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Code != "no_diagram" {
		t.Errorf("expected code no_diagram, got %s", payload.Code)
	}

	conn.Close(websocket.StatusNormalClosure, "done")
}

func TestHandler_TooManyNodesReturnsValidationError(t *testing.T) {
	mock := &mockLLMClient{
		chunks: []string{"Should not reach here"},
	}
	handler := NewHandler(mock, ratelimit.New())

	server := httptest.NewServer(handler)
	defer server.Close()

	wsURL := "ws" + server.URL[len("http"):]
	ctx := context.Background()

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	// Create 51 nodes
	nodes := make([]model.GraphNode, 51)
	for i := range nodes {
		nodes[i] = model.GraphNode{ID: "n" + string(rune('0'+i)), Type: "service", Name: "svc"}
	}

	graphPayload, _ := json.Marshal(AnalyzeRequest{
		GraphState: model.GraphState{Nodes: nodes},
	})
	req := WSMessage{
		Type:      "analyze_request",
		Payload:   graphPayload,
		RequestID: "test-req-3",
	}
	if err := wsjson.Write(ctx, conn, req); err != nil {
		t.Fatalf("write error: %v", err)
	}

	var msg WSMessage
	if err := wsjson.Read(ctx, conn, &msg); err != nil {
		t.Fatalf("read error: %v", err)
	}
	if msg.Type != "validation_error" {
		t.Fatalf("expected validation_error, got %s", msg.Type)
	}

	var payload ValidationErrorPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Code != "too_many_nodes" {
		t.Errorf("expected code too_many_nodes, got %s", payload.Code)
	}

	conn.Close(websocket.StatusNormalClosure, "done")
}

func TestHandler_TooManyEdgesReturnsValidationError(t *testing.T) {
	mock := &mockLLMClient{
		chunks: []string{"Should not reach here"},
	}
	handler := NewHandler(mock, ratelimit.New())

	server := httptest.NewServer(handler)
	defer server.Close()

	wsURL := "ws" + server.URL[len("http"):]
	ctx := context.Background()

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	// Create 1 node and 201 edges (exceeds maxEdges=200)
	edges := make([]model.GraphEdge, 201)
	for i := range edges {
		edges[i] = model.GraphEdge{ID: fmt.Sprintf("e%d", i), Source: "n1", Target: "n1"}
	}

	graphPayload, _ := json.Marshal(AnalyzeRequest{
		GraphState: model.GraphState{
			Nodes: []model.GraphNode{{ID: "n1", Type: "service", Name: "svc"}},
			Edges: edges,
		},
	})
	req := WSMessage{
		Type:      "analyze_request",
		Payload:   graphPayload,
		RequestID: "test-req-edges",
	}
	if err := wsjson.Write(ctx, conn, req); err != nil {
		t.Fatalf("write error: %v", err)
	}

	var msg WSMessage
	if err := wsjson.Read(ctx, conn, &msg); err != nil {
		t.Fatalf("read error: %v", err)
	}
	if msg.Type != "validation_error" {
		t.Fatalf("expected validation_error, got %s", msg.Type)
	}

	var payload ValidationErrorPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Code != "too_many_edges" {
		t.Errorf("expected code too_many_edges, got %s", payload.Code)
	}

	conn.Close(websocket.StatusNormalClosure, "done")
}

// --- Tool validation tests (T013) ---

func TestValidateToolCall(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "Database"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Protocol: "http", Direction: "oneWay"},
		},
	}

	tests := []struct {
		name    string
		tool    string
		input   string
		wantErr bool
	}{
		// add_node
		{name: "valid add_node", tool: "add_node", input: `{"type":"cache","name":"Redis"}`, wantErr: false},
		{name: "add_node duplicate name", tool: "add_node", input: `{"type":"cache","name":"API"}`, wantErr: true},
		{name: "add_node missing name", tool: "add_node", input: `{"type":"cache"}`, wantErr: true},
		// delete_node
		{name: "valid delete_node", tool: "delete_node", input: `{"name":"API"}`, wantErr: false},
		{name: "delete_node not found", tool: "delete_node", input: `{"name":"Redis"}`, wantErr: true},
		// modify_node
		{name: "valid modify_node", tool: "modify_node", input: `{"name":"API","new_name":"Gateway"}`, wantErr: false},
		{name: "modify_node name conflict", tool: "modify_node", input: `{"name":"API","new_name":"Database"}`, wantErr: true},
		{name: "modify_node not found", tool: "modify_node", input: `{"name":"Redis","new_name":"Cache"}`, wantErr: true},
		{name: "modify_node bad replica", tool: "modify_node", input: `{"name":"API","replica_count":0}`, wantErr: true},
		// add_edge
		{name: "valid add_edge", tool: "add_edge", input: `{"source":"API","target":"Database","protocol":"grpc"}`, wantErr: false},
		{name: "add_edge duplicate", tool: "add_edge", input: `{"source":"API","target":"Database","protocol":"http"}`, wantErr: true},
		{name: "add_edge source not found", tool: "add_edge", input: `{"source":"Redis","target":"Database"}`, wantErr: true},
		// delete_edge
		{name: "valid delete_edge", tool: "delete_edge", input: `{"source":"API","target":"Database","protocol":"http","direction":"oneWay"}`, wantErr: false},
		{name: "delete_edge not found", tool: "delete_edge", input: `{"source":"API","target":"Database","protocol":"grpc"}`, wantErr: true},
		{name: "delete_edge wildcard single edge", tool: "delete_edge", input: `{"source":"API","target":"Database"}`, wantErr: false},
		{name: "delete_edge wildcard no protocol", tool: "delete_edge", input: `{"source":"API","target":"Database","direction":"oneWay"}`, wantErr: false},
		{name: "delete_edge wildcard no direction", tool: "delete_edge", input: `{"source":"API","target":"Database","protocol":"http"}`, wantErr: false},
		// modify_edge
		{name: "valid modify_edge", tool: "modify_edge", input: `{"source":"API","target":"Database","protocol":"http","direction":"oneWay","new_protocol":"grpc"}`, wantErr: false},
		{name: "modify_edge not found", tool: "modify_edge", input: `{"source":"API","target":"Database","protocol":"sql","new_protocol":"grpc"}`, wantErr: true},
		{name: "modify_edge wildcard single edge", tool: "modify_edge", input: `{"source":"API","target":"Database","new_protocol":"grpc"}`, wantErr: false},
		// case-insensitive protocol matching
		{name: "add_edge duplicate case-insensitive", tool: "add_edge", input: `{"source":"API","target":"Database","protocol":"HTTP"}`, wantErr: true},
		{name: "delete_edge case-insensitive protocol", tool: "delete_edge", input: `{"source":"API","target":"Database","protocol":"HTTP","direction":"oneWay"}`, wantErr: false},
		{name: "modify_edge case-insensitive protocol", tool: "modify_edge", input: `{"source":"API","target":"Database","protocol":"HTTP","direction":"oneWay","new_protocol":"grpc"}`, wantErr: false},
		// unknown tool
		{name: "unknown tool", tool: "fly_to_moon", input: `{}`, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateToolCall(tt.tool, json.RawMessage(tt.input), gs)
			isError := result != "success"
			if isError != tt.wantErr {
				t.Errorf("validateToolCall(%s, %s) = %q, wantErr=%v", tt.tool, tt.input, result, tt.wantErr)
			}
		})
	}
}

func TestWildcardEdgeMatching_MultipleEdges(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "Database"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Protocol: "http", Direction: "oneWay"},
			{ID: "e2", Source: "n1", Target: "n2", Protocol: "grpc", Direction: "oneWay"},
		},
	}

	tests := []struct {
		name    string
		tool    string
		input   string
		wantErr bool
		wantMsg string
	}{
		{
			name:    "delete_edge wildcard ambiguous",
			tool:    "delete_edge",
			input:   `{"source":"API","target":"Database"}`,
			wantErr: true,
			wantMsg: "multiple edges",
		},
		{
			name:    "delete_edge with protocol resolves ambiguity",
			tool:    "delete_edge",
			input:   `{"source":"API","target":"Database","protocol":"http"}`,
			wantErr: false,
		},
		{
			name:    "modify_edge wildcard ambiguous",
			tool:    "modify_edge",
			input:   `{"source":"API","target":"Database","new_protocol":"ws"}`,
			wantErr: true,
			wantMsg: "multiple edges",
		},
		{
			name:    "modify_edge with protocol resolves ambiguity",
			tool:    "modify_edge",
			input:   `{"source":"API","target":"Database","protocol":"grpc","new_protocol":"ws"}`,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateToolCall(tt.tool, json.RawMessage(tt.input), gs)
			isError := result != "success"
			if isError != tt.wantErr {
				t.Errorf("validateToolCall(%s, %s) = %q, wantErr=%v", tt.tool, tt.input, result, tt.wantErr)
			}
			if tt.wantMsg != "" && !strings.Contains(result, tt.wantMsg) {
				t.Errorf("expected result to contain %q, got %q", tt.wantMsg, result)
			}
		})
	}
}

func TestWorkingGraphState_AddNodeThenAddEdge(t *testing.T) {
	// Simulates the tool loop: add_node for Redis, then add_edge from API to Redis.
	// The working graph state should have Redis after add_node so add_edge succeeds.
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "Database"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Protocol: "http"},
		},
	}

	// Step 1: add_node for Redis — should succeed
	addNodeInput := json.RawMessage(`{"type":"cache","name":"Redis"}`)
	result := validateToolCall("add_node", addNodeInput, gs)
	if result != "success" {
		t.Fatalf("add_node for Redis should succeed, got %q", result)
	}

	// Apply the add to working state (mimic handler loop)
	applyAddNodeToState(&gs, addNodeInput)

	// Step 2: add_edge from API to Redis — should now succeed with working state
	addEdgeInput := json.RawMessage(`{"source":"API","target":"Redis","protocol":"tcp"}`)
	result = validateToolCall("add_edge", addEdgeInput, gs)
	if result != "success" {
		t.Fatalf("add_edge to newly added Redis should succeed, got %q", result)
	}
}

func TestWorkingGraphState_AddNodeThenAddDuplicate(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}

	addNodeInput := json.RawMessage(`{"type":"cache","name":"Redis"}`)
	result := validateToolCall("add_node", addNodeInput, gs)
	if result != "success" {
		t.Fatalf("first add_node should succeed, got %q", result)
	}

	applyAddNodeToState(&gs, addNodeInput)

	// Adding Redis again should fail
	result = validateToolCall("add_node", json.RawMessage(`{"type":"cache","name":"Redis"}`), gs)
	if result == "success" {
		t.Error("duplicate add_node after working state update should fail")
	}
}

func TestValidateToolCall_CaseInsensitiveProtocol_AllOperations(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "Database"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Protocol: "gRPC", Direction: "oneWay"},
		},
	}

	tests := []struct {
		name    string
		tool    string
		input   string
		wantErr bool
	}{
		{
			name:    "add_edge duplicate GRPC uppercase",
			tool:    "add_edge",
			input:   `{"source":"API","target":"Database","protocol":"GRPC"}`,
			wantErr: true,
		},
		{
			name:    "add_edge duplicate grpc lowercase",
			tool:    "add_edge",
			input:   `{"source":"API","target":"Database","protocol":"grpc"}`,
			wantErr: true,
		},
		{
			name:    "add_edge different protocol ok",
			tool:    "add_edge",
			input:   `{"source":"API","target":"Database","protocol":"http"}`,
			wantErr: false,
		},
		{
			name:    "delete_edge case-insensitive match",
			tool:    "delete_edge",
			input:   `{"source":"API","target":"Database","protocol":"GRPC","direction":"oneWay"}`,
			wantErr: false,
		},
		{
			name:    "modify_edge case-insensitive match",
			tool:    "modify_edge",
			input:   `{"source":"API","target":"Database","protocol":"grpc","direction":"oneWay","new_protocol":"http"}`,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateToolCall(tt.tool, json.RawMessage(tt.input), gs)
			isError := result != "success"
			if isError != tt.wantErr {
				t.Errorf("got %q, wantErr=%v", result, tt.wantErr)
			}
		})
	}
}

func TestValidateToolCall_ModifyEdge_DuplicateDetection(t *testing.T) {
	// Two edges between same nodes with different protocols. Modify one to match the other.
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "Database"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Protocol: "http", Direction: "oneWay"},
			{ID: "e2", Source: "n1", Target: "n2", Protocol: "grpc", Direction: "oneWay"},
		},
	}

	// Modifying grpc edge to http should fail (would create duplicate)
	result := validateToolCall("modify_edge", json.RawMessage(
		`{"source":"API","target":"Database","protocol":"grpc","direction":"oneWay","new_protocol":"http"}`), gs)
	if result == "success" {
		t.Error("modify_edge should fail when it would create a duplicate edge")
	}
	if !strings.Contains(result, "duplicate") {
		t.Errorf("expected error to mention 'duplicate', got %q", result)
	}
}

func TestValidateToolCall_ModifyNode_ReplicaCountValid(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}

	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "replica count 1 is valid",
			input:   `{"name":"API","replica_count":1}`,
			wantErr: false,
		},
		{
			name:    "replica count 3 is valid",
			input:   `{"name":"API","replica_count":3}`,
			wantErr: false,
		},
		{
			name:    "replica count 0 is invalid",
			input:   `{"name":"API","replica_count":0}`,
			wantErr: true,
		},
		{
			name:    "replica count -1 is invalid",
			input:   `{"name":"API","replica_count":-1}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateToolCall("modify_node", json.RawMessage(tt.input), gs)
			isError := result != "success"
			if isError != tt.wantErr {
				t.Errorf("got %q, wantErr=%v", result, tt.wantErr)
			}
		})
	}
}

func TestValidateToolCall_AddEdge_MissingFields(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "Database"},
		},
	}

	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "missing source",
			input:   `{"target":"Database","protocol":"http"}`,
			wantErr: true,
		},
		{
			name:    "missing target",
			input:   `{"source":"API","protocol":"http"}`,
			wantErr: true,
		},
		{
			name:    "both missing",
			input:   `{"protocol":"http"}`,
			wantErr: true,
		},
		{
			name:    "no protocol is fine",
			input:   `{"source":"API","target":"Database"}`,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateToolCall("add_edge", json.RawMessage(tt.input), gs)
			isError := result != "success"
			if isError != tt.wantErr {
				t.Errorf("got %q, wantErr=%v", result, tt.wantErr)
			}
		})
	}
}

func TestValidateToolCall_AddNode_MissingType(t *testing.T) {
	gs := model.GraphState{}

	result := validateToolCall("add_node", json.RawMessage(`{"name":"Redis"}`), gs)
	if result == "success" {
		t.Error("add_node without type should fail")
	}
}

func TestValidateToolCall_AddNode_NameTooLong(t *testing.T) {
	gs := model.GraphState{}

	longName := strings.Repeat("x", maxNodeNameLen+1)
	input := fmt.Sprintf(`{"type":"service","name":"%s"}`, longName)
	result := validateToolCall("add_node", json.RawMessage(input), gs)
	if result == "success" {
		t.Errorf("add_node with name of %d chars should fail", len(longName))
	}
	if !strings.Contains(result, "maximum length") {
		t.Errorf("expected error about maximum length, got %q", result)
	}
}

func TestValidateToolCall_AddNode_NameAtLimit(t *testing.T) {
	gs := model.GraphState{}

	exactName := strings.Repeat("x", maxNodeNameLen)
	input := fmt.Sprintf(`{"type":"service","name":"%s"}`, exactName)
	result := validateToolCall("add_node", json.RawMessage(input), gs)
	if result != "success" {
		t.Errorf("add_node with name of exactly %d chars should succeed, got %q", maxNodeNameLen, result)
	}
}

func TestValidateToolCall_AddNode_InvalidType(t *testing.T) {
	gs := model.GraphState{}

	tests := []struct {
		name    string
		nType   string
		wantErr bool
	}{
		{name: "valid type service", nType: "service", wantErr: false},
		{name: "valid type databaseSql", nType: "databaseSql", wantErr: false},
		{name: "valid type cdn", nType: "cdn", wantErr: false},
		{name: "invalid type unknown", nType: "unknown", wantErr: true},
		{name: "invalid type empty-ish", nType: "banana", wantErr: true},
		{name: "case sensitive check", nType: "Service", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := fmt.Sprintf(`{"type":"%s","name":"TestNode"}`, tt.nType)
			result := validateToolCall("add_node", json.RawMessage(input), gs)
			isError := result != "success"
			if isError != tt.wantErr {
				t.Errorf("add_node type=%q: got %q, wantErr=%v", tt.nType, result, tt.wantErr)
			}
		})
	}
}

func TestValidateToolCall_AddNode_AnnotationTooLong(t *testing.T) {
	gs := model.GraphState{}

	longAnnotation := strings.Repeat("a", maxAnnotationLen+1)
	input := fmt.Sprintf(`{"type":"service","name":"API","annotation":"%s"}`, longAnnotation)
	result := validateToolCall("add_node", json.RawMessage(input), gs)
	if result == "success" {
		t.Error("add_node with annotation exceeding max length should fail")
	}
	if !strings.Contains(result, "annotation") {
		t.Errorf("expected error about annotation, got %q", result)
	}
}

func TestValidateToolCall_ModifyNode_NewNameTooLong(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}

	longName := strings.Repeat("y", maxNodeNameLen+1)
	input := fmt.Sprintf(`{"name":"API","new_name":"%s"}`, longName)
	result := validateToolCall("modify_node", json.RawMessage(input), gs)
	if result == "success" {
		t.Errorf("modify_node with new_name of %d chars should fail", len(longName))
	}
	if !strings.Contains(result, "maximum length") {
		t.Errorf("expected error about maximum length, got %q", result)
	}
}

func TestValidateToolCall_ModifyNode_AnnotationTooLong(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}

	longAnnotation := strings.Repeat("b", maxAnnotationLen+1)
	input := fmt.Sprintf(`{"name":"API","annotation":"%s"}`, longAnnotation)
	result := validateToolCall("modify_node", json.RawMessage(input), gs)
	if result == "success" {
		t.Error("modify_node with annotation exceeding max length should fail")
	}
}

func TestHandler_ChatMessageTooLong(t *testing.T) {
	mock := &mockLLMClient{
		chunks: []string{"Should not reach here"},
	}
	handler := NewHandler(mock, ratelimit.New())

	server := httptest.NewServer(handler)
	defer server.Close()

	wsURL := "ws" + server.URL[len("http"):]
	ctx := context.Background()

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	longMessage := strings.Repeat("a", maxChatMessageLen+1)
	chatPayload, _ := json.Marshal(ChatMessagePayload{
		Text: longMessage,
		GraphState: model.GraphState{
			Nodes: []model.GraphNode{
				{ID: "n1", Type: "service", Name: "API"},
			},
		},
	})

	req := WSMessage{
		Type:      "chat_message",
		Payload:   chatPayload,
		RequestID: "test-long-msg",
	}
	if err := wsjson.Write(ctx, conn, req); err != nil {
		t.Fatalf("write error: %v", err)
	}

	var msg WSMessage
	if err := wsjson.Read(ctx, conn, &msg); err != nil {
		t.Fatalf("read error: %v", err)
	}
	if msg.Type != "validation_error" {
		t.Fatalf("expected validation_error, got %s", msg.Type)
	}

	var payload ValidationErrorPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Code != "message_too_long" {
		t.Errorf("expected code message_too_long, got %s", payload.Code)
	}

	conn.Close(websocket.StatusNormalClosure, "done")
}

func TestWildcardEdgeMatching_ThreeEdges(t *testing.T) {
	gs := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "Database"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Protocol: "http", Direction: "oneWay"},
			{ID: "e2", Source: "n1", Target: "n2", Protocol: "grpc", Direction: "oneWay"},
			{ID: "e3", Source: "n1", Target: "n2", Protocol: "http", Direction: "bidirectional"},
		},
	}

	tests := []struct {
		name    string
		tool    string
		input   string
		wantErr bool
		wantMsg string
	}{
		{
			name:    "wildcard all three ambiguous",
			tool:    "delete_edge",
			input:   `{"source":"API","target":"Database"}`,
			wantErr: true,
			wantMsg: "multiple edges",
		},
		{
			name:    "protocol http still ambiguous (2 directions)",
			tool:    "delete_edge",
			input:   `{"source":"API","target":"Database","protocol":"http"}`,
			wantErr: true,
			wantMsg: "multiple edges",
		},
		{
			name:    "protocol http + direction oneWay resolves",
			tool:    "delete_edge",
			input:   `{"source":"API","target":"Database","protocol":"http","direction":"oneWay"}`,
			wantErr: false,
		},
		{
			name:    "protocol grpc unique",
			tool:    "delete_edge",
			input:   `{"source":"API","target":"Database","protocol":"grpc"}`,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateToolCall(tt.tool, json.RawMessage(tt.input), gs)
			isError := result != "success"
			if isError != tt.wantErr {
				t.Errorf("got %q, wantErr=%v", result, tt.wantErr)
			}
			if tt.wantMsg != "" && !strings.Contains(result, tt.wantMsg) {
				t.Errorf("expected %q in result, got %q", tt.wantMsg, result)
			}
		})
	}
}
