package graph

import (
	"testing"

	"github.com/shadowbane1000/designpair/internal/model"
)

func hasPattern(patterns []DetectedPattern, name string) bool {
	for _, p := range patterns {
		if p.Name == name {
			return true
		}
	}
	return false
}

func getPattern(patterns []DetectedPattern, name string) *DetectedPattern {
	for i := range patterns {
		if patterns[i].Name == name {
			return &patterns[i]
		}
	}
	return nil
}

func TestDetectPatterns_EmptyGraph(t *testing.T) {
	g := model.GraphState{}
	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if len(patterns) != 0 {
		t.Errorf("expected no patterns for empty graph, got %v", patterns)
	}
}

func TestDetectPatterns_CQRS(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "ws", Type: "service", Name: "Write Service"},
			{ID: "rs", Type: "service", Name: "Read Service"},
			{ID: "db", Type: "databaseSql", Name: "Primary DB"},
			{ID: "cache", Type: "cache", Name: "Read Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "ws", Target: "db", Label: "SQL", Protocol: "sql"},
			{ID: "e2", Source: "rs", Target: "cache", Label: "TCP", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "CQRS") {
		t.Errorf("expected CQRS pattern, got %v", patterns)
	}

	p := getPattern(patterns, "CQRS")
	if len(p.Evidence) < 2 {
		t.Errorf("expected at least 2 evidence items, got %d", len(p.Evidence))
	}
}

func TestDetectPatterns_CQRS_NegativeSameService(t *testing.T) {
	// Same service writes to DB and reads from cache — not CQRS
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s", Type: "service", Name: "API"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
			{ID: "cache", Type: "cache", Name: "Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s", Target: "db", Protocol: "sql"},
			{ID: "e2", Source: "s", Target: "cache", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "CQRS") {
		t.Error("should not detect CQRS when same service handles both read and write")
	}
}

func TestDetectPatterns_CQRS_NegativeNoReadStore(t *testing.T) {
	// Two services both writing to databases — no read store
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "db1", Type: "databaseSql", Name: "DB1"},
			{ID: "db2", Type: "databaseSql", Name: "DB2"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db1"},
			{ID: "e2", Source: "s2", Target: "db2"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "CQRS") {
		t.Error("should not detect CQRS without a read store (cache)")
	}
}

func TestDetectPatterns_EventSourcing(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "svc", Type: "service", Name: "Order Service"},
			{ID: "bus", Type: "eventBus", Name: "Event Bus"},
			{ID: "proj1", Type: "service", Name: "Projection A"},
			{ID: "proj2", Type: "service", Name: "Projection B"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "svc", Target: "bus", Protocol: "pubsub", SyncAsync: "async"},
			{ID: "e2", Source: "bus", Target: "proj1", Protocol: "pubsub", SyncAsync: "async"},
			{ID: "e3", Source: "bus", Target: "proj2", Protocol: "pubsub", SyncAsync: "async"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Event Sourcing") {
		t.Errorf("expected Event Sourcing pattern, got %v", patterns)
	}
}

func TestDetectPatterns_EventSourcing_NegativeSingleConsumer(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "svc", Type: "service", Name: "Producer"},
			{ID: "bus", Type: "eventBus", Name: "Bus"},
			{ID: "c1", Type: "service", Name: "Consumer"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "svc", Target: "bus"},
			{ID: "e2", Source: "bus", Target: "c1"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Event Sourcing") {
		t.Error("should not detect Event Sourcing with only 1 consumer")
	}
}

func TestDetectPatterns_Saga(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Order Service"},
			{ID: "q1", Type: "messageQueue", Name: "Order Queue"},
			{ID: "s2", Type: "service", Name: "Payment Service"},
			{ID: "q2", Type: "messageQueue", Name: "Payment Queue"},
			{ID: "s3", Type: "service", Name: "Inventory Service"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "q1", Protocol: "async", SyncAsync: "async"},
			{ID: "e2", Source: "q1", Target: "s2"},
			{ID: "e3", Source: "s2", Target: "q2", Protocol: "async", SyncAsync: "async"},
			{ID: "e4", Source: "q2", Target: "s3"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Saga") {
		t.Errorf("expected Saga pattern, got %v", patterns)
	}
}

func TestDetectPatterns_Saga_NegativeTooFewServices(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "q", Type: "messageQueue", Name: "Queue"},
			{ID: "s2", Type: "service", Name: "Service B"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "q", Protocol: "async", SyncAsync: "async"},
			{ID: "e2", Source: "q", Target: "s2"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Saga") {
		t.Error("should not detect Saga with fewer than 3 services")
	}
}

func TestDetectPatterns_FanOut(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "lb", Type: "loadBalancer", Name: "LB"},
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "s3", Type: "service", Name: "Service C"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "lb", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "lb", Target: "s2", Protocol: "http"},
			{ID: "e3", Source: "lb", Target: "s3", Protocol: "http"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Fan-out") {
		t.Errorf("expected Fan-out pattern, got %v", patterns)
	}
}

func TestDetectPatterns_FanOut_NegativeMixedTypes(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s", Type: "service", Name: "API"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
			{ID: "cache", Type: "cache", Name: "Cache"},
			{ID: "q", Type: "messageQueue", Name: "Queue"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s", Target: "db"},
			{ID: "e2", Source: "s", Target: "cache"},
			{ID: "e3", Source: "s", Target: "q"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Fan-out") {
		t.Error("should not detect Fan-out when targets are different types")
	}
}

func TestDetectPatterns_APIGateway(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Web App"},
			{ID: "gw", Type: "apiGateway", Name: "API Gateway"},
			{ID: "s1", Type: "service", Name: "User Service"},
			{ID: "s2", Type: "service", Name: "Order Service"},
		},
		Edges: []model.GraphEdge{
			{ID: "e0", Source: "client", Target: "gw", Protocol: "http"},
			{ID: "e1", Source: "gw", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "gw", Target: "s2", Protocol: "http"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "API Gateway") {
		t.Errorf("expected API Gateway pattern, got %v", patterns)
	}

	p := getPattern(patterns, "API Gateway")
	if len(p.Evidence) < 2 {
		t.Errorf("expected at least 2 evidence items (routes + client), got %d", len(p.Evidence))
	}
}

func TestDetectPatterns_APIGateway_NegativeOneService(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "gw", Type: "apiGateway", Name: "Gateway"},
			{ID: "s1", Type: "service", Name: "Service"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "gw", Target: "s1"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "API Gateway") {
		t.Error("should not detect API Gateway with only 1 downstream service")
	}
}

func TestDetectPatterns_Microservices(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "User Service"},
			{ID: "db1", Type: "databaseSql", Name: "User DB"},
			{ID: "s2", Type: "service", Name: "Order Service"},
			{ID: "db2", Type: "databaseSql", Name: "Order DB"},
			{ID: "s3", Type: "service", Name: "Product Service"},
			{ID: "db3", Type: "databaseNosql", Name: "Product DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db1", Protocol: "sql"},
			{ID: "e2", Source: "s2", Target: "db2", Protocol: "sql"},
			{ID: "e3", Source: "s3", Target: "db3", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Microservices") {
		t.Errorf("expected Microservices pattern, got %v", patterns)
	}

	p := getPattern(patterns, "Microservices")
	if len(p.Evidence) != 3 {
		t.Errorf("expected 3 evidence items, got %d", len(p.Evidence))
	}
}

func TestDetectPatterns_Microservices_NegativeSharedDB(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "s3", Type: "service", Name: "Service C"},
			{ID: "db", Type: "databaseSql", Name: "Shared DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db"},
			{ID: "e2", Source: "s2", Target: "db"},
			{ID: "e3", Source: "s3", Target: "db"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Microservices") {
		t.Error("should not detect Microservices when all services share one database")
	}
}

func TestDetectPatterns_Monolith(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Browser"},
			{ID: "app", Type: "service", Name: "Monolith App"},
			{ID: "db", Type: "databaseSql", Name: "Database"},
			{ID: "cache", Type: "cache", Name: "Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "client", Target: "app", Protocol: "http"},
			{ID: "e2", Source: "app", Target: "db", Protocol: "sql"},
			{ID: "e3", Source: "app", Target: "cache", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Monolith") {
		t.Errorf("expected Monolith pattern, got %v", patterns)
	}
}

func TestDetectPatterns_Monolith_NegativeMultipleServices(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db"},
			{ID: "e2", Source: "s2", Target: "db"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Monolith") {
		t.Error("should not detect Monolith when multiple services exist")
	}
}

func TestDetectPatterns_MultiplePatterns(t *testing.T) {
	// API Gateway + Microservices
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Web App"},
			{ID: "gw", Type: "apiGateway", Name: "API Gateway"},
			{ID: "s1", Type: "service", Name: "User Service"},
			{ID: "db1", Type: "databaseSql", Name: "User DB"},
			{ID: "s2", Type: "service", Name: "Order Service"},
			{ID: "db2", Type: "databaseSql", Name: "Order DB"},
			{ID: "s3", Type: "service", Name: "Product Service"},
			{ID: "db3", Type: "databaseNosql", Name: "Product DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e0", Source: "client", Target: "gw", Protocol: "http"},
			{ID: "e1", Source: "gw", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "gw", Target: "s2", Protocol: "http"},
			{ID: "e3", Source: "gw", Target: "s3", Protocol: "http"},
			{ID: "e4", Source: "s1", Target: "db1", Protocol: "sql"},
			{ID: "e5", Source: "s2", Target: "db2", Protocol: "sql"},
			{ID: "e6", Source: "s3", Target: "db3", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "API Gateway") {
		t.Error("expected API Gateway pattern in multi-pattern graph")
	}
	if !hasPattern(patterns, "Microservices") {
		t.Error("expected Microservices pattern in multi-pattern graph")
	}
	if !hasPattern(patterns, "Fan-out") {
		t.Error("expected Fan-out pattern in multi-pattern graph (gateway fans out to 3 services)")
	}
}

func TestDetectPatterns_NoFalsePositivesLinearChain(t *testing.T) {
	// Simple linear: LB -> API -> DB should not trigger complex patterns
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "lb", Type: "loadBalancer", Name: "LB"},
			{ID: "api", Type: "service", Name: "API"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "lb", Target: "api", Protocol: "http"},
			{ID: "e2", Source: "api", Target: "db", Protocol: "sql"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	for _, p := range patterns {
		switch p.Name {
		case "CQRS", "Event Sourcing", "Saga", "Fan-out", "Microservices":
			t.Errorf("unexpected pattern %q for simple linear chain", p.Name)
		}
	}
}

func TestDetectPatterns_IntegratedViaAnalyze(t *testing.T) {
	// Verify patterns are accessible via Analyze()
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Browser"},
			{ID: "app", Type: "service", Name: "App"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "client", Target: "app"},
			{ID: "e2", Source: "app", Target: "db"},
		},
	}

	analysis := Analyze(g)

	if analysis.DetectedPatterns == nil {
		t.Error("expected DetectedPatterns to be populated by Analyze()")
	}
	if !hasPattern(analysis.DetectedPatterns, "Monolith") {
		t.Errorf("expected Monolith from Analyze(), got %v", analysis.DetectedPatterns)
	}
}

func TestDetectPatterns_ServerlessCounts(t *testing.T) {
	// Serverless functions should count as services for pattern detection
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "f1", Type: "serverlessFunction", Name: "Auth Lambda"},
			{ID: "f2", Type: "serverlessFunction", Name: "Order Lambda"},
			{ID: "f3", Type: "serverlessFunction", Name: "Payment Lambda"},
			{ID: "db1", Type: "databaseNosql", Name: "Auth Store"},
			{ID: "db2", Type: "databaseNosql", Name: "Order Store"},
			{ID: "db3", Type: "databaseNosql", Name: "Payment Store"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "f1", Target: "db1"},
			{ID: "e2", Source: "f2", Target: "db2"},
			{ID: "e3", Source: "f3", Target: "db3"},
		},
	}

	analysis := Analyze(g)

	if !hasPattern(analysis.DetectedPatterns, "Microservices") {
		t.Error("expected Microservices pattern with serverless functions having dedicated stores")
	}
}

func TestDetectPatterns_SingleNode(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}
	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	// Single service with no data store should not trigger Monolith (needs a data store)
	if hasPattern(patterns, "Monolith") {
		t.Error("single service with no data store should not be Monolith")
	}
	// Nothing else should trigger either
	for _, p := range patterns {
		t.Errorf("unexpected pattern %q for single node graph", p.Name)
	}
}

func TestDetectPatterns_DisconnectedSubgraphs(t *testing.T) {
	// Two independent subgraphs: each has a service + DB
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "db1", Type: "databaseSql", Name: "DB A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "db2", Type: "databaseSql", Name: "DB B"},
			// Third subgraph needed for microservices threshold
			{ID: "s3", Type: "service", Name: "Service C"},
			{ID: "db3", Type: "databaseNosql", Name: "DB C"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db1", Protocol: "sql"},
			{ID: "e2", Source: "s2", Target: "db2", Protocol: "sql"},
			{ID: "e3", Source: "s3", Target: "db3", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	// Should detect microservices even with disconnected subgraphs
	if !hasPattern(patterns, "Microservices") {
		t.Error("expected Microservices even with disconnected subgraphs")
	}
	// Should NOT detect Monolith (multiple services)
	if hasPattern(patterns, "Monolith") {
		t.Error("should not detect Monolith with multiple services in disconnected subgraphs")
	}
}

func TestDetectPatterns_CQRS_NegativeSingleServiceWithCache(t *testing.T) {
	// Single service with both a DB and a cache — NOT CQRS (same service)
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s", Type: "service", Name: "API"},
			{ID: "db", Type: "databaseSql", Name: "Primary DB"},
			{ID: "c", Type: "cache", Name: "Redis Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s", Target: "db", Protocol: "sql"},
			{ID: "e2", Source: "s", Target: "c", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "CQRS") {
		t.Error("single service with cache should NOT trigger CQRS — requires different services for read/write")
	}
}

func TestDetectPatterns_EventSourcing_StreamProcessor(t *testing.T) {
	// streamProcessor should also trigger Event Sourcing, not just eventBus
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "svc", Type: "service", Name: "Order Service"},
			{ID: "sp", Type: "streamProcessor", Name: "Kafka"},
			{ID: "proj1", Type: "service", Name: "Analytics"},
			{ID: "proj2", Type: "service", Name: "Search Indexer"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "svc", Target: "sp", Protocol: "pubsub", SyncAsync: "async"},
			{ID: "e2", Source: "sp", Target: "proj1", Protocol: "pubsub"},
			{ID: "e3", Source: "sp", Target: "proj2", Protocol: "pubsub"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Event Sourcing") {
		t.Error("expected Event Sourcing with streamProcessor")
	}
}

func TestDetectPatterns_EventSourcing_NegativeNoProducer(t *testing.T) {
	// Event bus with consumers but no producer service
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "bus", Type: "eventBus", Name: "Event Bus"},
			{ID: "c1", Type: "service", Name: "Consumer A"},
			{ID: "c2", Type: "service", Name: "Consumer B"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "bus", Target: "c1"},
			{ID: "e2", Source: "bus", Target: "c2"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Event Sourcing") {
		t.Error("should not detect Event Sourcing when no producer writes to the bus")
	}
}

func TestDetectPatterns_Saga_InferredAsync(t *testing.T) {
	// Saga with async inferred from protocol rather than explicit SyncAsync
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Order"},
			{ID: "q1", Type: "messageQueue", Name: "Q1"},
			{ID: "s2", Type: "service", Name: "Payment"},
			{ID: "q2", Type: "messageQueue", Name: "Q2"},
			{ID: "s3", Type: "service", Name: "Shipping"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "q1", Protocol: "async"}, // inferred async from protocol
			{ID: "e2", Source: "q1", Target: "s2"},
			{ID: "e3", Source: "s2", Target: "q2", Protocol: "pubsub"}, // inferred async from protocol
			{ID: "e4", Source: "q2", Target: "s3"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Saga") {
		t.Error("expected Saga when async is inferred from protocol field")
	}
}

func TestDetectPatterns_FanOut_NegativeTwoTargets(t *testing.T) {
	// Only 2 same-type targets: below threshold
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "lb", Type: "loadBalancer", Name: "LB"},
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "lb", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "lb", Target: "s2", Protocol: "http"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Fan-out") {
		t.Error("should not detect Fan-out with only 2 same-type targets (threshold is 3)")
	}
}

func TestDetectPatterns_APIGateway_LoadBalancer(t *testing.T) {
	// loadBalancer type should also detect API Gateway pattern (isGateway includes LB)
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Browser"},
			{ID: "lb", Type: "loadBalancer", Name: "Load Balancer"},
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
		},
		Edges: []model.GraphEdge{
			{ID: "e0", Source: "client", Target: "lb", Protocol: "http"},
			{ID: "e1", Source: "lb", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "lb", Target: "s2", Protocol: "http"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "API Gateway") {
		t.Error("expected API Gateway with loadBalancer type routing to 2+ services")
	}
}

func TestDetectPatterns_APIGateway_NoClient(t *testing.T) {
	// API Gateway without a client node — should still detect but with fewer evidence items
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "gw", Type: "apiGateway", Name: "Gateway"},
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "gw", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "gw", Target: "s2", Protocol: "grpc"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "API Gateway") {
		t.Error("expected API Gateway even without a client node")
	}

	p := getPattern(patterns, "API Gateway")
	// Without a client, evidence should only have the routes line
	if len(p.Evidence) != 1 {
		t.Errorf("expected 1 evidence item (no client), got %d", len(p.Evidence))
	}
}

func TestDetectPatterns_Microservices_MixedDedicatedAndShared(t *testing.T) {
	// 3 services: 2 with dedicated stores, 1 sharing — should not detect (only 2 dedicated)
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "User Service"},
			{ID: "db1", Type: "databaseSql", Name: "User DB"},
			{ID: "s2", Type: "service", Name: "Order Service"},
			{ID: "db2", Type: "databaseSql", Name: "Order DB"},
			{ID: "s3", Type: "service", Name: "Analytics"},
			// s3 shares db2 with s2
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db1"},
			{ID: "e2", Source: "s2", Target: "db2"},
			{ID: "e3", Source: "s3", Target: "db2"}, // shared
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	// db2 is shared by s2 and s3 — so only s1 has a truly dedicated store
	// That's only 1 dedicated service, below the 3 threshold
	if hasPattern(patterns, "Microservices") {
		t.Error("should not detect Microservices when most services share databases")
	}
}

func TestDetectPatterns_Monolith_NegativeServiceNoDataStore(t *testing.T) {
	// Single service but connects only to another service, no data store
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "API"},
			{ID: "s2", Type: "service", Name: "Worker"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "s2", Protocol: "http"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Monolith") {
		t.Error("should not detect Monolith: multiple services exist")
	}
}

func TestDetectPatterns_AllSevenDetectable(t *testing.T) {
	// Verify that all 7 pattern detectors can trigger by listing them
	patternNames := []string{
		"CQRS", "Event Sourcing", "Saga", "Fan-out",
		"API Gateway", "Microservices", "Monolith",
	}

	tests := []struct {
		name     string
		graph    model.GraphState
		expected string
	}{
		{
			name: "CQRS",
			graph: model.GraphState{
				Nodes: []model.GraphNode{
					{ID: "w", Type: "service", Name: "Writer"},
					{ID: "r", Type: "service", Name: "Reader"},
					{ID: "db", Type: "databaseSql", Name: "DB"},
					{ID: "c", Type: "cache", Name: "Cache"},
				},
				Edges: []model.GraphEdge{
					{ID: "e1", Source: "w", Target: "db"},
					{ID: "e2", Source: "r", Target: "c"},
				},
			},
			expected: "CQRS",
		},
		{
			name: "Event Sourcing",
			graph: model.GraphState{
				Nodes: []model.GraphNode{
					{ID: "p", Type: "service", Name: "Producer"},
					{ID: "b", Type: "eventBus", Name: "Bus"},
					{ID: "c1", Type: "service", Name: "Consumer1"},
					{ID: "c2", Type: "service", Name: "Consumer2"},
				},
				Edges: []model.GraphEdge{
					{ID: "e1", Source: "p", Target: "b"},
					{ID: "e2", Source: "b", Target: "c1"},
					{ID: "e3", Source: "b", Target: "c2"},
				},
			},
			expected: "Event Sourcing",
		},
		{
			name: "Saga",
			graph: model.GraphState{
				Nodes: []model.GraphNode{
					{ID: "s1", Type: "service", Name: "A"},
					{ID: "q1", Type: "messageQueue", Name: "Q1"},
					{ID: "s2", Type: "service", Name: "B"},
					{ID: "q2", Type: "messageQueue", Name: "Q2"},
					{ID: "s3", Type: "service", Name: "C"},
				},
				Edges: []model.GraphEdge{
					{ID: "e1", Source: "s1", Target: "q1", SyncAsync: "async"},
					{ID: "e2", Source: "q1", Target: "s2"},
					{ID: "e3", Source: "s2", Target: "q2", SyncAsync: "async"},
					{ID: "e4", Source: "q2", Target: "s3"},
				},
			},
			expected: "Saga",
		},
		{
			name: "Fan-out",
			graph: model.GraphState{
				Nodes: []model.GraphNode{
					{ID: "gw", Type: "apiGateway", Name: "GW"},
					{ID: "s1", Type: "service", Name: "S1"},
					{ID: "s2", Type: "service", Name: "S2"},
					{ID: "s3", Type: "service", Name: "S3"},
				},
				Edges: []model.GraphEdge{
					{ID: "e1", Source: "gw", Target: "s1"},
					{ID: "e2", Source: "gw", Target: "s2"},
					{ID: "e3", Source: "gw", Target: "s3"},
				},
			},
			expected: "Fan-out",
		},
		{
			name: "API Gateway",
			graph: model.GraphState{
				Nodes: []model.GraphNode{
					{ID: "c", Type: "webClient", Name: "Client"},
					{ID: "gw", Type: "apiGateway", Name: "GW"},
					{ID: "s1", Type: "service", Name: "S1"},
					{ID: "s2", Type: "service", Name: "S2"},
				},
				Edges: []model.GraphEdge{
					{ID: "e0", Source: "c", Target: "gw"},
					{ID: "e1", Source: "gw", Target: "s1"},
					{ID: "e2", Source: "gw", Target: "s2"},
				},
			},
			expected: "API Gateway",
		},
		{
			name: "Microservices",
			graph: model.GraphState{
				Nodes: []model.GraphNode{
					{ID: "s1", Type: "service", Name: "S1"},
					{ID: "d1", Type: "databaseSql", Name: "D1"},
					{ID: "s2", Type: "service", Name: "S2"},
					{ID: "d2", Type: "databaseNosql", Name: "D2"},
					{ID: "s3", Type: "service", Name: "S3"},
					{ID: "d3", Type: "cache", Name: "D3"},
				},
				Edges: []model.GraphEdge{
					{ID: "e1", Source: "s1", Target: "d1"},
					{ID: "e2", Source: "s2", Target: "d2"},
					{ID: "e3", Source: "s3", Target: "d3"},
				},
			},
			expected: "Microservices",
		},
		{
			name: "Monolith",
			graph: model.GraphState{
				Nodes: []model.GraphNode{
					{ID: "app", Type: "service", Name: "App"},
					{ID: "db", Type: "databaseSql", Name: "DB"},
				},
				Edges: []model.GraphEdge{
					{ID: "e1", Source: "app", Target: "db"},
				},
			},
			expected: "Monolith",
		},
	}

	covered := make(map[string]bool)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analysis := Analyze(tt.graph)
			patterns := DetectPatterns(tt.graph, analysis)
			if !hasPattern(patterns, tt.expected) {
				t.Errorf("expected pattern %q, got %v", tt.expected, patterns)
			}
			covered[tt.expected] = true
		})
	}

	for _, name := range patternNames {
		if !covered[name] {
			t.Errorf("pattern %q not covered by AllSevenDetectable test", name)
		}
	}
}

func TestDetectPatterns_Saga_NegativeSyncEdges(t *testing.T) {
	// 3 services connected through queues but all sync — not Saga
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Order"},
			{ID: "q1", Type: "messageQueue", Name: "Q1"},
			{ID: "s2", Type: "service", Name: "Payment"},
			{ID: "q2", Type: "messageQueue", Name: "Q2"},
			{ID: "s3", Type: "service", Name: "Shipping"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "q1", SyncAsync: "sync"},
			{ID: "e2", Source: "q1", Target: "s2"},
			{ID: "e3", Source: "s2", Target: "q2", SyncAsync: "sync"},
			{ID: "e4", Source: "q2", Target: "s3"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Saga") {
		t.Error("should not detect Saga when service-to-queue edges are explicitly sync")
	}
}

func TestDetectPatterns_EventSourcing_DataStoreConsumer(t *testing.T) {
	// Event bus with service producer and data store consumers
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "svc", Type: "service", Name: "Producer"},
			{ID: "bus", Type: "eventBus", Name: "Bus"},
			{ID: "db1", Type: "databaseSql", Name: "Projection DB"},
			{ID: "c1", Type: "cache", Name: "Read Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "svc", Target: "bus"},
			{ID: "e2", Source: "bus", Target: "db1"},
			{ID: "e3", Source: "bus", Target: "c1"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Event Sourcing") {
		t.Error("expected Event Sourcing with data store consumers from event bus")
	}
}
