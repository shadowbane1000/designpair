package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// ToolCall represents a completed tool invocation from the AI.
type ToolCall struct {
	ID    string
	Name  string
	Input json.RawMessage
}

// ToolResult is the response to send back for a tool call.
type ToolResult struct {
	ToolUseID string
	Content   string
	IsError   bool
}

// StreamResult holds the output of a single streaming call.
type StreamResult struct {
	TextContent string
	ToolCalls   []ToolCall
	StopReason  string
}

// Client is the interface for LLM interaction.
type Client interface {
	StreamAnalysis(ctx context.Context, systemPrompt string, turns []ConversationTurn, onChunk func(text string)) error
	StreamWithTools(ctx context.Context, systemPrompt string, messages []anthropic.MessageParam, onChunk func(text string)) (*StreamResult, error)
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

// StreamAnalysis sends conversation turns to Claude and calls onChunk for each text delta.
// This is the legacy method without tool support.
func (c *AnthropicClient) StreamAnalysis(ctx context.Context, systemPrompt string, turns []ConversationTurn, onChunk func(text string)) error {
	messages := make([]anthropic.MessageParam, 0, len(turns))
	for _, turn := range turns {
		switch turn.Role {
		case "user":
			messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock(turn.Content)))
		case "assistant":
			messages = append(messages, anthropic.NewAssistantMessage(anthropic.NewTextBlock(turn.Content)))
		}
	}

	if len(messages) == 0 {
		messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock("Analyze my architecture")))
	}

	stream := c.client.Messages.NewStreaming(ctx, anthropic.MessageNewParams{
		Model:     c.model,
		MaxTokens: 4096,
		System: []anthropic.TextBlockParam{
			{Text: systemPrompt},
		},
		Messages: messages,
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

// StreamWithTools sends messages to Claude with tool definitions and streams the response.
// It handles both text deltas and tool_use blocks, returning all collected data.
func (c *AnthropicClient) StreamWithTools(ctx context.Context, systemPrompt string, messages []anthropic.MessageParam, onChunk func(text string)) (*StreamResult, error) {
	stream := c.client.Messages.NewStreaming(ctx, anthropic.MessageNewParams{
		Model:     c.model,
		MaxTokens: 4096,
		System: []anthropic.TextBlockParam{
			{Text: systemPrompt},
		},
		Messages: messages,
		Tools:    ToolDefinitions,
	})
	defer stream.Close()

	result := &StreamResult{}

	// Track current tool_use block being accumulated
	var currentToolID string
	var currentToolName string
	var inputBuffer []byte

	for stream.Next() {
		event := stream.Current()

		switch event.Type {
		case "content_block_start":
			// Check if this is a tool_use block
			if event.ContentBlock.Type == "tool_use" {
				currentToolID = event.ContentBlock.ID
				currentToolName = event.ContentBlock.Name
				inputBuffer = nil
			}

		case "content_block_delta":
			if event.Delta.Text != "" {
				result.TextContent += event.Delta.Text
				onChunk(event.Delta.Text)
			}
			// Accumulate tool input JSON
			if event.Delta.Type == "input_json_delta" && event.Delta.PartialJSON != "" {
				inputBuffer = append(inputBuffer, []byte(event.Delta.PartialJSON)...)
			}

		case "content_block_stop":
			if currentToolID != "" {
				input := json.RawMessage(inputBuffer)
				if len(input) == 0 {
					input = json.RawMessage(`{}`)
				}
				result.ToolCalls = append(result.ToolCalls, ToolCall{
					ID:    currentToolID,
					Name:  currentToolName,
					Input: input,
				})
				currentToolID = ""
				currentToolName = ""
				inputBuffer = nil
			}

		case "message_delta":
			if event.Delta.StopReason != "" {
				result.StopReason = string(event.Delta.StopReason)
			}
		}
	}

	if err := stream.Err(); err != nil {
		log.Printf("Anthropic API error: %v", err)
		return nil, fmt.Errorf("anthropic stream error: %w", err)
	}

	return result, nil
}

// BuildAssistantMessage creates an assistant message with text and tool_use blocks
// for appending to conversation history during multi-turn tool use.
func BuildAssistantMessage(text string, toolCalls []ToolCall) anthropic.MessageParam {
	blocks := make([]anthropic.ContentBlockParamUnion, 0, len(toolCalls)+1)
	if text != "" {
		blocks = append(blocks, anthropic.NewTextBlock(text))
	}
	for _, tc := range toolCalls {
		blocks = append(blocks, anthropic.ContentBlockParamUnion{
			OfToolUse: &anthropic.ToolUseBlockParam{
				ID:    tc.ID,
				Name:  tc.Name,
				Input: tc.Input,
			},
		})
	}
	return anthropic.NewAssistantMessage(blocks...)
}

// BuildToolResultMessage creates a user message containing tool results.
func BuildToolResultMessage(results []ToolResult) anthropic.MessageParam {
	blocks := make([]anthropic.ContentBlockParamUnion, 0, len(results))
	for _, r := range results {
		blocks = append(blocks, anthropic.ContentBlockParamUnion{
			OfToolResult: &anthropic.ToolResultBlockParam{
				ToolUseID: r.ToolUseID,
				Content: []anthropic.ToolResultBlockParamContentUnion{
					{OfText: &anthropic.TextBlockParam{Text: r.Content}},
				},
				IsError: anthropic.Bool(r.IsError),
			},
		})
	}
	return anthropic.NewUserMessage(blocks...)
}
