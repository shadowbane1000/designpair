package llm

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// Client is the interface for LLM interaction.
type Client interface {
	StreamAnalysis(ctx context.Context, systemPrompt, userPrompt string, onChunk func(text string)) error
}

// AnthropicClient implements Client using the Anthropic API.
type AnthropicClient struct {
	client *anthropic.Client
	model  string
}

// NewAnthropicClient creates a new Anthropic client from environment variables.
func NewAnthropicClient() (*AnthropicClient, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY environment variable is required")
	}

	model := os.Getenv("CLAUDE_MODEL")
	if model == "" {
		model = "claude-sonnet-4-5"
	}

	client := anthropic.NewClient(option.WithAPIKey(apiKey))

	return &AnthropicClient{
		client: &client,
		model:  model,
	}, nil
}

// StreamAnalysis sends a prompt to Claude and calls onChunk for each text delta.
func (c *AnthropicClient) StreamAnalysis(ctx context.Context, systemPrompt, userPrompt string, onChunk func(text string)) error {
	stream := c.client.Messages.NewStreaming(ctx, anthropic.MessageNewParams{
		Model:     c.model,
		MaxTokens: 4096,
		System: []anthropic.TextBlockParam{
			{Text: systemPrompt},
		},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(
				anthropic.NewTextBlock(userPrompt),
			),
		},
	})
	defer stream.Close()

	for stream.Next() {
		event := stream.Current()
		if event.Type == "content_block_delta" && event.Delta.Text != "" {
			onChunk(event.Delta.Text)
		}
	}

	if err := stream.Err(); err != nil {
		log.Printf("Anthropic API error: %v", err)
		return fmt.Errorf("anthropic stream error: %w", err)
	}

	return nil
}
