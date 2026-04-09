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
	handler := NewHandler(mock)

	server := httptest.NewServer(handler)
	defer server.Close()

	wsURL := "ws" + server.URL[len("http"):]
	ctx := context.Background()

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	// Send analyze_request
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

func TestHandler_EmptyGraphProducesResponse(t *testing.T) {
	mock := &mockLLMClient{
		chunks: []string{"The canvas is empty."},
	}
	handler := NewHandler(mock)

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

	// Should get chunk + done (not error)
	var msg WSMessage
	if err := wsjson.Read(ctx, conn, &msg); err != nil {
		t.Fatalf("read error: %v", err)
	}
	if msg.Type != "ai_chunk" {
		t.Errorf("expected ai_chunk, got %s", msg.Type)
	}

	// Read done
	if err := wsjson.Read(ctx, conn, &msg); err != nil {
		t.Fatalf("read error: %v", err)
	}
	if msg.Type != "ai_done" {
		t.Errorf("expected ai_done, got %s", msg.Type)
	}

	conn.Close(websocket.StatusNormalClosure, "done")
}
