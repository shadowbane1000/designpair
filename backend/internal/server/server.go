package server

import (
	"encoding/json"
	"net/http"

	"github.com/shadowbane1000/designpair/internal/llm"
	"github.com/shadowbane1000/designpair/internal/ratelimit"
	"github.com/shadowbane1000/designpair/internal/ws"
)

type Server struct {
	mux *http.ServeMux
}

// Option configures optional server features.
type Option func(*serverConfig)

type serverConfig struct {
	summarizer llm.Summarizer
}

// WithSummarizer configures conversation summarization for long conversations.
func WithSummarizer(s llm.Summarizer) Option {
	return func(c *serverConfig) {
		c.summarizer = s
	}
}

func New(llmClient llm.Client, limiter *ratelimit.Limiter, opts ...Option) *Server {
	cfg := &serverConfig{}
	for _, opt := range opts {
		opt(cfg)
	}
	s := &Server{
		mux: http.NewServeMux(),
	}
	s.routes(llmClient, limiter, cfg)
	return s
}

func (s *Server) Handler() http.Handler {
	return s.mux
}

func (s *Server) routes(llmClient llm.Client, limiter *ratelimit.Limiter, cfg *serverConfig) {
	s.mux.HandleFunc("GET /health", s.handleHealth)
	handler := ws.NewHandler(llmClient, limiter)
	if cfg.summarizer != nil {
		handler.SetSummarizer(cfg.summarizer)
	}
	s.mux.Handle("/ws", handler)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
