# Contract: AI Tool Definitions

## Tools Available to the AI

### add_node

Add a new architecture component to the diagram.

```json
{
  "name": "add_node",
  "description": "Add a new architecture component to the diagram. Creates a pending suggestion that the user will approve or discard.",
  "input_schema": {
    "type": "object",
    "properties": {
      "type": { "type": "string", "description": "Component type (service, apiGateway, loadBalancer, serverlessFunction, databaseSql, databaseNosql, cache, objectStorage, messageQueue, eventBus, streamProcessor, cdn, dns, firewall, webClient, mobileClient, iotClient, externalApi)" },
      "name": { "type": "string", "description": "Display name for the component. Must be unique." }
    },
    "required": ["type", "name"]
  }
}
```

### delete_node

Remove a component from the diagram. Also removes all connected edges.

```json
{
  "name": "delete_node",
  "description": "Remove a component from the diagram. All edges connected to this node will also be marked for deletion.",
  "input_schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "description": "Name of the node to delete." }
    },
    "required": ["name"]
  }
}
```

### modify_node

Change a node's name or replica count. Cannot change the node type.

```json
{
  "name": "modify_node",
  "description": "Modify a node's name or replica count. Cannot change the node type — use delete_node + add_node for type changes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "description": "Current name of the node to modify." },
      "new_name": { "type": "string", "description": "New name (must be unique). Omit to keep current." },
      "replica_count": { "type": "integer", "description": "New replica count (≥1). Omit to keep current." }
    },
    "required": ["name"]
  }
}
```

### add_edge

Add a connection between two components.

```json
{
  "name": "add_edge",
  "description": "Add a connection between two components. Must not duplicate an existing edge with the same source, target, protocol, and direction.",
  "input_schema": {
    "type": "object",
    "properties": {
      "source": { "type": "string", "description": "Name of the source node." },
      "target": { "type": "string", "description": "Name of the target node." },
      "protocol": { "type": "string", "description": "Protocol type (http, grpc, sql, tcp, async, pubsub, websocket, mqtt, or custom text). Optional." },
      "direction": { "type": "string", "enum": ["oneWay", "bidirectional"], "description": "Edge direction. Default: oneWay." },
      "sync_async": { "type": "string", "enum": ["sync", "async"], "description": "Override sync/async classification. Default: derived from protocol." }
    },
    "required": ["source", "target"]
  }
}
```

### delete_edge

Remove a connection between two components.

```json
{
  "name": "delete_edge",
  "description": "Remove a specific connection between two components, identified by source, target, protocol, and direction.",
  "input_schema": {
    "type": "object",
    "properties": {
      "source": { "type": "string", "description": "Name of the source node." },
      "target": { "type": "string", "description": "Name of the target node." },
      "protocol": { "type": "string", "description": "Protocol of the edge to delete." },
      "direction": { "type": "string", "enum": ["oneWay", "bidirectional"], "description": "Direction of the edge to delete. Default: oneWay." }
    },
    "required": ["source", "target"]
  }
}
```

### modify_edge

Change an edge's protocol, direction, or sync/async classification. Cannot change source/target.

```json
{
  "name": "modify_edge",
  "description": "Modify an edge's protocol, direction, or sync/async. Cannot change source/target — use delete_edge + add_edge for reconnection. New values must not create a duplicate edge.",
  "input_schema": {
    "type": "object",
    "properties": {
      "source": { "type": "string", "description": "Source node name (identifies the edge)." },
      "target": { "type": "string", "description": "Target node name (identifies the edge)." },
      "protocol": { "type": "string", "description": "Current protocol (identifies the edge)." },
      "direction": { "type": "string", "description": "Current direction (identifies the edge)." },
      "new_protocol": { "type": "string", "description": "New protocol. Omit to keep current." },
      "new_direction": { "type": "string", "enum": ["oneWay", "bidirectional"], "description": "New direction. Omit to keep current." },
      "new_sync_async": { "type": "string", "enum": ["sync", "async"], "description": "New sync/async. Omit to keep current." }
    },
    "required": ["source", "target"]
  }
}
```

## Error Responses

Tools return errors (as `tool_result` with `is_error: true`) for:
- Node name already exists (add_node, modify_node)
- Node not found (delete_node, modify_node)
- Edge not found (delete_edge, modify_edge)
- Duplicate edge would be created (add_edge, modify_edge)
- Invalid node type (add_node)
- Type change attempted via modify_node
- Source/target change attempted via modify_edge
