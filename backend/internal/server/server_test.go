package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/shadowbane1000/designpair/internal/llm"
)

type noopLLMClient struct{}

func (n *noopLLMClient) StreamAnalysis(_ context.Context, _ string, _ []llm.ConversationTurn, _ func(string)) error {
	return nil
}

func TestHealthCheck(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
		wantBody   map[string]string
	}{
		{
			name:       "GET /health returns 200 with status ok",
			method:     http.MethodGet,
			path:       "/health",
			wantStatus: http.StatusOK,
			wantBody:   map[string]string{"status": "ok"},
		},
		{
			name:       "POST /health returns 405",
			method:     http.MethodPost,
			path:       "/health",
			wantStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := New(&noopLLMClient{})
			req := httptest.NewRequest(tt.method, tt.path, nil)
			rec := httptest.NewRecorder()

			srv.Handler().ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}

			if tt.wantBody != nil {
				var got map[string]string
				if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
					t.Fatalf("failed to decode response body: %v", err)
				}
				for k, v := range tt.wantBody {
					if got[k] != v {
						t.Errorf("body[%q] = %q, want %q", k, got[k], v)
					}
				}
			}
		})
	}
}
