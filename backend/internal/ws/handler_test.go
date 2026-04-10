package ws

import (
	"context"
	"encoding/json"
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
