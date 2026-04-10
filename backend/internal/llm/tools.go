package llm

import "github.com/anthropics/anthropic-sdk-go"

// ToolDefinitions defines the 6 diagram editing tools available to the AI.
var ToolDefinitions = []anthropic.ToolUnionParam{
	{OfTool: &anthropic.ToolParam{
		Name:        "add_node",
		Description: anthropic.String("Add a new architecture component to the diagram. Creates a pending suggestion that the user will approve or discard."),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties: map[string]any{
				"type": map[string]any{"type": "string", "description": "Component type (service, apiGateway, loadBalancer, serverlessFunction, databaseSql, databaseNosql, cache, objectStorage, messageQueue, eventBus, streamProcessor, cdn, dns, firewall, webClient, mobileClient, iotClient, externalApi)"},
				"name": map[string]any{"type": "string", "description": "Display name for the component. Must be unique."},
			},
			Required: []string{"type", "name"},
		},
	}},
	{OfTool: &anthropic.ToolParam{
		Name:        "delete_node",
		Description: anthropic.String("Remove a component from the diagram. All edges connected to this node will also be marked for deletion."),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties: map[string]any{
				"name": map[string]any{"type": "string", "description": "Name of the node to delete."},
			},
			Required: []string{"name"},
		},
	}},
	{OfTool: &anthropic.ToolParam{
		Name:        "modify_node",
		Description: anthropic.String("Modify a node's name or replica count. Cannot change the node type — use delete_node + add_node for type changes."),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties: map[string]any{
				"name":          map[string]any{"type": "string", "description": "Current name of the node to modify."},
				"new_name":      map[string]any{"type": "string", "description": "New name (must be unique). Omit to keep current."},
				"replica_count": map[string]any{"type": "integer", "description": "New replica count (≥1). Omit to keep current."},
			},
			Required: []string{"name"},
		},
	}},
	{OfTool: &anthropic.ToolParam{
		Name:        "add_edge",
		Description: anthropic.String("Add a connection between two components. Must not duplicate an existing edge with the same source, target, protocol, and direction."),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties: map[string]any{
				"source":     map[string]any{"type": "string", "description": "Name of the source node."},
				"target":     map[string]any{"type": "string", "description": "Name of the target node."},
				"protocol":   map[string]any{"type": "string", "description": "Protocol type (http, grpc, sql, tcp, async, pubsub, websocket, mqtt, or custom text). Optional."},
				"direction":  map[string]any{"type": "string", "enum": []string{"oneWay", "bidirectional"}, "description": "Edge direction. Default: oneWay."},
				"sync_async": map[string]any{"type": "string", "enum": []string{"sync", "async"}, "description": "Override sync/async classification. Default: derived from protocol."},
			},
			Required: []string{"source", "target"},
		},
	}},
	{OfTool: &anthropic.ToolParam{
		Name:        "delete_edge",
		Description: anthropic.String("Remove a specific connection between two components, identified by source, target, protocol, and direction."),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties: map[string]any{
				"source":    map[string]any{"type": "string", "description": "Name of the source node."},
				"target":    map[string]any{"type": "string", "description": "Name of the target node."},
				"protocol":  map[string]any{"type": "string", "description": "Protocol of the edge to delete."},
				"direction": map[string]any{"type": "string", "enum": []string{"oneWay", "bidirectional"}, "description": "Direction of the edge to delete. Default: oneWay."},
			},
			Required: []string{"source", "target"},
		},
	}},
	{OfTool: &anthropic.ToolParam{
		Name:        "modify_edge",
		Description: anthropic.String("Modify an edge's protocol, direction, or sync/async. Cannot change source/target — use delete_edge + add_edge for reconnection. New values must not create a duplicate edge. Prefer this over delete+add when changing protocol or direction."),
		InputSchema: anthropic.ToolInputSchemaParam{
			Properties: map[string]any{
				"source":        map[string]any{"type": "string", "description": "Source node name (identifies the edge)."},
				"target":        map[string]any{"type": "string", "description": "Target node name (identifies the edge)."},
				"protocol":      map[string]any{"type": "string", "description": "Current protocol (identifies the edge)."},
				"direction":     map[string]any{"type": "string", "description": "Current direction (identifies the edge)."},
				"new_protocol":  map[string]any{"type": "string", "description": "New protocol. Omit to keep current."},
				"new_direction": map[string]any{"type": "string", "enum": []string{"oneWay", "bidirectional"}, "description": "New direction. Omit to keep current."},
				"new_sync_async": map[string]any{"type": "string", "enum": []string{"sync", "async"}, "description": "New sync/async. Omit to keep current."},
			},
			Required: []string{"source", "target"},
		},
	}},
}
