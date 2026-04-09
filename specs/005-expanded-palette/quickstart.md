# Quickstart: Expanded Component Library + Scalability

## Development

```bash
export ANTHROPIC_API_KEY=sk-ant-...
make dev
```

Open http://localhost:5173.

## New Components

The palette now shows 18 component types in 5 categories:

- **Compute**: Service, API Gateway, Load Balancer, Serverless Function
- **Data**: Database (SQL), Database (NoSQL), Cache, Object Storage
- **Messaging**: Message Queue, Event Bus, Stream Processor
- **Network**: CDN, DNS, Firewall
- **Clients**: Web Client, Mobile Client, IoT Client, External API

Click a category heading to collapse/expand it.

## Scalability

1. Drag a Service (or other scalable type) onto the canvas
2. Click the replica count control on the node
3. Set to 3 — the node shows "×3"
4. Ask the AI — it references the scaling in its analysis

Types that support replica counts: Service, API Gateway, Database (SQL/NoSQL), Cache, Object Storage, Stream Processor.

Serverless Functions and CDNs are inherently scalable — no replica count needed.

## Testing

```bash
make lint && make test && make e2e
```
