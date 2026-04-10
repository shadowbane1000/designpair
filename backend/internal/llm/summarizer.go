package llm

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// AnthropicSummarizer implements Summarizer using the Anthropic API.
type AnthropicSummarizer struct {
	client *anthropic.Client
	model  string
}

// NewAnthropicSummarizer creates a summarizer using the given API key and model.
func NewAnthropicSummarizer(apiKey, model string) *AnthropicSummarizer {
	client := anthropic.NewClient(option.WithAPIKey(apiKey))
	return &AnthropicSummarizer{
		client: &client,
		model:  model,
	}
}

// Summarize sends conversation turns to Claude and returns a compact summary.
func (s *AnthropicSummarizer) Summarize(ctx context.Context, turns []ConversationTurn) (string, error) {
	formatted := FormatTurnsForSummarization(turns)

	msg, err := s.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     s.model,
		MaxTokens: 1024,
		System: []anthropic.TextBlockParam{
			{Text: SummarizationPrompt},
		},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(
				fmt.Sprintf("Summarize this architecture discussion:\n\n%s", formatted),
			)),
		},
	})
	if err != nil {
		slog.Error("Summarization API call failed", "error", err)
		return "", fmt.Errorf("summarization API error: %w", err)
	}

	for _, block := range msg.Content {
		if block.Type == "text" {
			return block.Text, nil
		}
	}

	return "", fmt.Errorf("no text content in summarization response")
}
