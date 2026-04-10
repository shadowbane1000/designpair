package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/shadowbane1000/designpair/internal/llm"
	"github.com/shadowbane1000/designpair/internal/ratelimit"
	"github.com/shadowbane1000/designpair/internal/server"
)

func main() {
	llmClient, err := llm.NewAnthropicClient()
	if err != nil {
		log.Printf("WARNING: %v — AI features will be unavailable", err)
		llmClient = nil
	}

	var client llm.Client
	if llmClient != nil {
		client = llmClient
	} else {
		client = &noopClient{}
	}

	limiter := ratelimit.New()

	var opts []server.Option
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey != "" {
		model := os.Getenv("CLAUDE_MODEL")
		if model == "" {
			model = "claude-sonnet-4-5"
		}
		summarizer := llm.NewAnthropicSummarizer(apiKey, model)
		opts = append(opts, server.WithSummarizer(summarizer))
	}

	srv := server.New(client, limiter, opts...)

	httpServer := &http.Server{
		Addr:              ":8081",
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("Starting server on %s", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server stopped")
}

type noopClient struct{}

func (n *noopClient) StreamAnalysis(_ context.Context, _ string, _ []llm.ConversationTurn, onChunk func(string)) error {
	onChunk("AI features are unavailable — ANTHROPIC_API_KEY is not configured.")
	return nil
}

func (n *noopClient) StreamWithTools(_ context.Context, _ string, _ []anthropic.MessageParam, onChunk func(string)) (*llm.StreamResult, error) {
	onChunk("AI features are unavailable — ANTHROPIC_API_KEY is not configured.")
	return &llm.StreamResult{TextContent: "AI features are unavailable.", StopReason: "end_turn"}, nil
}
