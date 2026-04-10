package ws

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/shadowbane1000/designpair/internal/llm"
	"github.com/shadowbane1000/designpair/internal/model"
	"github.com/shadowbane1000/designpair/internal/ratelimit"
)

type mockLLMClient struct {
	chunks []string
	err    error
}

func (m *mockLLMClient) StreamAnalysis(_ context.Context, _ string, _ []llm.ConversationTurn, onChunk func(string)) error {
	for _, chunk := range m.chunks {
		onChunk(chunk)
	}
	return m.err
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
