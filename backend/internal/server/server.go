package server

import (
	"encoding/json"
	"net/http"

	"github.com/shadowbane1000/designpair/internal/llm"
	"github.com/shadowbane1000/designpair/internal/ws"
)

type Server struct {
	mux *http.ServeMux
}

func New(llmClient llm.Client) *Server {
	s := &Server{
		mux: http.NewServeMux(),
	}
	s.routes(llmClient)
	return s
}

func (s *Server) Handler() http.Handler {
	return s.mux
}

func (s *Server) routes(llmClient llm.Client) {
	s.mux.HandleFunc("GET /health", s.handleHealth)
	s.mux.Handle("/ws", ws.NewHandler(llmClient))
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
