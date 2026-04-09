# DesignPair Architecture

## Overview

```
┌─────────────────────────────────────────┐
│              Browser                     │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ React Flow   │  │  AI Chat Panel  │  │
│  │ Canvas       │  │  (streaming)    │  │
│  └──────┬───────┘  └────────▲────────┘  │
│         │                    │           │
│         └────── WebSocket ───┘           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           Go Backend                     │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  WebSocket   │  │  LLM Service    │  │
│  │  Handler     │──│  (Anthropic)    │  │
│  └──────────────┘  └────────┬────────┘  │
│                              │           │
│  ┌──────────────┐            │           │
│  │  Graph       │            │           │
│  │  Analyzer    │            │           │
│  └──────────────┘            │           │
└──────────────────────────────┼───────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │  Anthropic API   │
                     │  (Claude)        │
                     └──────────────────┘
```

## Data Flow

1. User drags components onto the canvas, connects them with edges
2. On meaningful changes (new connection, new component, user clicks "ask AI"), the frontend serializes the graph state (nodes + edges + metadata) as JSON
3. JSON is sent via WebSocket to the Go backend
4. The Go backend constructs a prompt: system instructions + serialized graph + conversation history + the triggering event
5. Backend streams Claude's response via the Anthropic SSE API
6. Each response chunk is forwarded via WebSocket to the frontend
7. The AI chat panel renders the streaming response

## Component Library (v1)

The canvas provides a palette of drag-and-drop architecture components:

- **Compute:** Service, API Gateway, Load Balancer, Serverless Function
- **Data:** Database (SQL), Database (NoSQL), Cache, Object Storage
- **Messaging:** Message Queue, Event Bus, Stream Processor
- **Network:** CDN, DNS, Firewall
- **Clients:** Web Client, Mobile Client, IoT Client, External API

Each component is a typed node with metadata (name, optional annotations). Edges represent connections with optional labels (HTTP, gRPC, async, etc.).
